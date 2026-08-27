'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BufferTarget, CanvasSource, Mp4OutputFormat, Output } from 'mediabunny';
import {
  UNIFIED_AGENT_EXPORT_SIZE,
  type UnifiedAgentDetail,
  type UnifiedAgentEngine,
} from './unified-agent-engine';

export type AgentCaptureScale = 1 | 2 | 3;
export type AgentCaptureFormat = 'mp4' | 'png' | 'svg';

type CapturePhase = 'idle' | 'starting' | 'recording' | 'finalizing';
type CaptureResult = {
  bytes: number;
  format: AgentCaptureFormat;
  size: number;
};

type EncodedSession = {
  canvas: HTMLCanvasElement;
  engine: UnifiedAgentEngine;
  frameIndex: number;
  kind: 'encoded';
  output: Output<Mp4OutputFormat, BufferTarget>;
  pending: Promise<void>;
  source: CanvasSource;
  startedAt: number;
  stopping: boolean;
};

type RecorderSession = {
  canvas: HTMLCanvasElement;
  chunks: Blob[];
  engine: UnifiedAgentEngine;
  frameIndex: number;
  kind: 'recorder';
  recorder: MediaRecorder;
  requestFrame: (() => void) | null;
  startedAt: number;
  stopping: boolean;
  stream: MediaStream;
};

type CaptureSession = EncodedSession | RecorderSession;

const RECORDING_FPS = 30;
const RECORDING_FRAME_MS = 1000 / RECORDING_FPS;

function captureFilename(format: AgentCaptureFormat, size: number) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `kinter-agent-${size}px-${timestamp}.${format}`;
}

function triggerDownload(blob: Blob, format: AgentCaptureFormat, size: number) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = captureFilename(format, size);
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob?.size) resolve(blob);
      else reject(new Error('The browser returned an empty PNG.'));
    }, 'image/png');
  });
}

function mp4RecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return (
    ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1.4D401E', 'video/mp4'].find(
      (candidate) => MediaRecorder.isTypeSupported(candidate),
    ) ?? ''
  );
}

export function useAgentCapture(
  getEngine: () => UnifiedAgentEngine | null,
  scale: AgentCaptureScale,
  detail: UnifiedAgentDetail,
) {
  const [error, setError] = useState('');
  const [lastExport, setLastExport] = useState<CaptureResult | null>(null);
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const disposed = useRef(false);
  const frameTimer = useRef<number | null>(null);
  const sessionRef = useRef<CaptureSession | null>(null);
  const stopRecordingRef = useRef<() => void>(() => undefined);
  const size = UNIFIED_AGENT_EXPORT_SIZE * scale;
  const contentScale = detail * 0.4;

  const publish = useCallback((blob: Blob, format: AgentCaptureFormat, outputSize: number) => {
    triggerDownload(blob, format, outputSize);
    setLastExport({ bytes: blob.size, format, size: outputSize });
  }, []);

  const savePng = useCallback(async () => {
    const engine = getEngine();
    if (!engine || phase !== 'idle') return;
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      engine.renderExportFrame(canvas, { contentScale, transparent: true });
      const blob = await canvasToPng(canvas);
      if (!disposed.current) publish(blob, 'png', size);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'PNG export failed.');
    }
  }, [contentScale, getEngine, phase, publish, size]);

  const saveSvg = useCallback(() => {
    const engine = getEngine();
    if (!engine || phase !== 'idle') return;
    setError('');
    try {
      const blob = new Blob([engine.createSvg(size, contentScale)], {
        type: 'image/svg+xml;charset=utf-8',
      });
      publish(blob, 'svg', size);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'SVG export failed.');
    }
  }, [contentScale, getEngine, phase, publish, size]);

  const stopRecording = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.stopping) return;
    session.stopping = true;
    sessionRef.current = null;
    if (frameTimer.current !== null) {
      window.clearTimeout(frameTimer.current);
      frameTimer.current = null;
    }
    setPhase('finalizing');

    if (session.kind === 'encoded') {
      const finalize = async () => {
        try {
          await session.pending;
          if (session.frameIndex < 1) throw new Error('No video frames were captured.');
          await session.output.finalize();
          const buffer = session.output.target.buffer;
          if (!buffer?.byteLength) throw new Error('The MP4 encoder returned an empty file.');
          if (!disposed.current) {
            publish(new Blob([buffer], { type: 'video/mp4' }), 'mp4', session.canvas.width);
          }
        } catch (captureError) {
          try {
            await session.output.cancel();
          } catch {
            // The encoder may already have released itself after a failed finalize.
          }
          if (!disposed.current) {
            setError(
              captureError instanceof Error
                ? captureError.message
                : 'The 30 FPS MP4 could not be finalized.',
            );
          }
        } finally {
          if (!disposed.current) {
            setRecordingSeconds(0);
            setPhase('idle');
          }
        }
      };
      void finalize();
      return;
    }

    try {
      session.recorder.requestData();
    } catch {
      // Some MediaRecorder implementations flush only when stop() is called.
    }
    session.recorder.stop();
  }, [publish]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const scheduleEncodedFrame = useCallback((session: EncodedSession) => {
    const capture = async () => {
      if (session.stopping || sessionRef.current !== session) return;
      session.engine.renderExportFrame(session.canvas, { contentScale, transparent: false });
      const timestamp = session.frameIndex / RECORDING_FPS;
      await session.source.add(timestamp, 1 / RECORDING_FPS);
      if (session.stopping || sessionRef.current !== session) return;
      session.frameIndex += 1;
      setRecordingSeconds(Math.floor(session.frameIndex / RECORDING_FPS));
      const nextFrameAt = session.startedAt + session.frameIndex * RECORDING_FRAME_MS;
      frameTimer.current = window.setTimeout(
        () => {
          session.pending = capture().catch((captureError) => {
            if (!disposed.current) {
              setError(
                captureError instanceof Error
                  ? captureError.message
                  : 'The 30 FPS encoder stopped unexpectedly.',
              );
            }
            stopRecordingRef.current();
          });
        },
        Math.max(0, nextFrameAt - performance.now()),
      );
    };

    session.pending = capture().catch((captureError) => {
      if (!disposed.current) {
        setError(
          captureError instanceof Error
            ? captureError.message
            : 'The 30 FPS encoder stopped unexpectedly.',
        );
      }
      stopRecordingRef.current();
    });
  }, [contentScale]);

  const scheduleRecorderFrame = useCallback((session: RecorderSession) => {
    const capture = () => {
      if (session.stopping || sessionRef.current !== session) return;
      session.engine.renderExportFrame(session.canvas, { contentScale, transparent: false });
      session.requestFrame?.();
      session.frameIndex += 1;
      setRecordingSeconds(Math.floor(session.frameIndex / RECORDING_FPS));
      const nextFrameAt = session.startedAt + session.frameIndex * RECORDING_FRAME_MS;
      frameTimer.current = window.setTimeout(capture, Math.max(0, nextFrameAt - performance.now()));
    };
    capture();
  }, [contentScale]);

  const startRecording = useCallback(async () => {
    const engine = getEngine();
    if (!engine || phase !== 'idle') return;
    setError('');
    setRecordingSeconds(0);
    setPhase('starting');

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    engine.renderExportFrame(canvas, { contentScale, transparent: false });

    if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
      let output: Output<Mp4OutputFormat, BufferTarget> | null = null;
      try {
        const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality } = await import(
          'mediabunny'
        );
        output = new Output({
          format: new Mp4OutputFormat(),
          target: new BufferTarget(),
        });
        const source = new CanvasSource(canvas, {
          codec: 'avc',
          keyFrameInterval: 2,
          latencyMode: 'realtime',
          quality: new Quality({
            bitrate: scale === 1 ? 4_000_000 : scale === 2 ? 8_000_000 : 12_000_000,
            bitrateMode: 'variable',
          }),
        });
        output.addVideoTrack(source, { frameRate: RECORDING_FPS });
        await output.start();
        if (disposed.current) {
          await output.cancel();
          return;
        }
        const session: EncodedSession = {
          canvas,
          engine,
          frameIndex: 0,
          kind: 'encoded',
          output,
          pending: Promise.resolve(),
          source,
          startedAt: performance.now(),
          stopping: false,
        };
        sessionRef.current = session;
        setPhase('recording');
        scheduleEncodedFrame(session);
        return;
      } catch {
        if (output) {
          try {
            await output.cancel();
          } catch {
            // Continue to the native MP4 recorder fallback.
          }
        }
      }
    }

    const mimeType = mp4RecorderMimeType();
    const canCaptureCanvas = typeof HTMLCanvasElement.prototype.captureStream === 'function';
    if (!mimeType || !canCaptureCanvas) {
      setError('MP4 recording is unavailable in this browser.');
      setPhase('idle');
      return;
    }

    try {
      let stream = canvas.captureStream(0);
      const canvasTrack = stream.getVideoTracks()[0] as
        | CanvasCaptureMediaStreamTrack
        | undefined;
      const manualFrameTrack =
        canvasTrack && typeof canvasTrack.requestFrame === 'function' ? canvasTrack : null;
      let requestFrame =
        manualFrameTrack ? () => manualFrameTrack.requestFrame() : null;
      if (!requestFrame) {
        stream.getTracks().forEach((track) => track.stop());
        stream = canvas.captureStream(RECORDING_FPS);
        requestFrame = null;
      }
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: scale === 1 ? 4_000_000 : scale === 2 ? 8_000_000 : 12_000_000,
      });
      const session: RecorderSession = {
        canvas,
        chunks: [],
        engine,
        frameIndex: 0,
        kind: 'recorder',
        recorder,
        requestFrame,
        startedAt: performance.now(),
        stopping: false,
        stream,
      };
      recorder.ondataavailable = (event) => {
        if (event.data.size) session.chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(session.chunks, { type: mimeType });
        session.stream.getTracks().forEach((track) => track.stop());
        if (!disposed.current) {
          if (blob.size) publish(blob, 'mp4', canvas.width);
          else setError('The browser returned an empty MP4.');
          setRecordingSeconds(0);
          setPhase('idle');
        }
      };
      recorder.onerror = () => {
        if (!disposed.current) setError('The MP4 recorder stopped unexpectedly.');
        stopRecordingRef.current();
      };
      sessionRef.current = session;
      recorder.start(1000);
      setPhase('recording');
      scheduleRecorderFrame(session);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'MP4 recording could not start.');
      setPhase('idle');
    }
  }, [contentScale, getEngine, phase, publish, scale, scheduleEncodedFrame, scheduleRecorderFrame, size]);

  const toggleRecording = useCallback(() => {
    if (phase === 'recording') stopRecording();
    else if (phase === 'idle') void startRecording();
  }, [phase, startRecording, stopRecording]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden || !sessionRef.current) return;
      setError('Recording stopped because the capture tab was hidden.');
      stopRecordingRef.current();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      if (frameTimer.current !== null) window.clearTimeout(frameTimer.current);
      const session = sessionRef.current;
      sessionRef.current = null;
      if (!session) return;
      session.stopping = true;
      if (session.kind === 'encoded') {
        void session.output.cancel();
      } else {
        session.recorder.ondataavailable = null;
        session.recorder.onstop = null;
        if (session.recorder.state !== 'inactive') session.recorder.stop();
        session.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    busy: phase !== 'idle' && phase !== 'recording',
    error,
    lastExport,
    recording: phase === 'recording',
    recordingSeconds,
    savePng,
    saveSvg,
    toggleRecording,
  };
}
