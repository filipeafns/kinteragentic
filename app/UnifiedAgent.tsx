'use client';

import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import {
  type AgentSoundState,
  configureSoundSystem,
  playControlSound,
  playFocusSignature,
  playHoverSignature,
  stopSoundSequences,
} from './magnetic-sound-engine';
import {
  type UnifiedAgentDetail,
  UnifiedAgentEngine,
  UNIFIED_AGENT_EXPORT_SIZE,
  type UnifiedAgentSequenceStep,
  type UnifiedAgentTheme,
  type UnifiedAgentVariant,
} from './unified-agent-engine';
import { type AgentCaptureScale, useAgentCapture } from './use-agent-capture';

type ViewMode = 'list' | 'grid';
type CarouselStyle = CSSProperties & {
  '--carousel-blur': string;
  '--carousel-opacity': string;
  '--carousel-scale': string;
  '--carousel-x': string;
  '--carousel-y': string;
};

const CAROUSEL_STATES: AgentSoundState[] = ['agent', 'fast', 'collapse'];
const SEQUENCE_STEPS: ReadonlyArray<{
  carouselIndex: number;
  label: string;
  scene: AgentSoundState;
}> = [
  { carouselIndex: 0, label: 'Idle', scene: 'agent' },
  { carouselIndex: 1, label: 'Thinking', scene: 'fast' },
  { carouselIndex: 0, label: 'Idle', scene: 'agent' },
  { carouselIndex: 2, label: 'Contract', scene: 'collapse' },
];
const AUTOPLAY_MS = 3_000;
const DEFAULT_ACCENT = '#67A2E7';
const COLOR_PRESETS = [
  { label: 'Amber 300', value: '#F6C875' },
  { label: 'Red 300', value: '#E76769' },
  { label: 'Pink 300', value: '#FF47CE' },
  { label: 'Purple 300', value: '#AF2FFF' },
  { label: 'Blue 300', value: '#67A2E7' },
  { label: 'Green 300', value: '#67E789' },
] as const;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

function shortestDelta(index: number, selectedIndex: number) {
  let delta = (index - selectedIndex + CAROUSEL_STATES.length) % CAROUSEL_STATES.length;
  if (delta > CAROUSEL_STATES.length / 2) delta -= CAROUSEL_STATES.length;
  return delta;
}

function carouselStyle(
  index: number,
  selectedIndex: number,
  detail: UnifiedAgentDetail,
): CarouselStyle {
  const delta = shortestDelta(index, selectedIndex);
  const distance = Math.abs(delta);
  const stageSize = detail * 80;
  const selectedScale = detail === 1 ? 1.56 : detail === 2 ? 1.24 : 1;
  const neighborScale = detail === 1 ? 1 : detail === 2 ? 0.8 : 0.54;
  const outerScale = detail === 1 ? 0.7 : detail === 2 ? 0.56 : 0.4;
  const oppositeScale = detail === 1 ? 0.48 : detail === 2 ? 0.4 : 0.28;
  const horizontalDistance =
    distance === 1
      ? 154 + (stageSize - 80) * 0.72
      : distance === 2
        ? 252 + (stageSize - 80) * 0.85
        : 335 + (stageSize - 80) * 0.96;
  const verticalDistance =
    distance === 1
      ? 116 + (stageSize - 80) * 0.28
      : distance === 2
        ? 238 + (stageSize - 80) * 0.35
        : 304 + (stageSize - 80) * 0.12;

  return {
    '--carousel-blur': `${distance <= 1 ? 0 : (distance - 1) * 3.2}px`,
    '--carousel-opacity': `${[1, 0.72, 0.3, 0.1][distance]}`,
    '--carousel-scale': `${[
      selectedScale,
      neighborScale,
      outerScale,
      oppositeScale,
    ][distance]}`,
    '--carousel-x': `${Math.sign(delta) * horizontalDistance}px`,
    '--carousel-y': `${distance === 0 ? 0 : verticalDistance}px`,
    zIndex: 100 - distance,
  };
}

function SoundGlyph({ enabled }: { enabled: boolean }) {
  return (
    <span className="sound-glyph" data-enabled={enabled} aria-hidden="true">
      <span className="sound-glyph__speaker" />
      <span className="sound-glyph__wave" />
    </span>
  );
}

function ListGlyph() {
  return (
    <span className="view-glyph view-glyph--list" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function GridGlyph() {
  return (
    <span className="view-glyph view-glyph--grid" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function RecordGlyph({ recording }: { recording: boolean }) {
  return <span className="capture-glyph capture-glyph--record" data-recording={recording} aria-hidden="true" />;
}

function SnapshotGlyph() {
  return (
    <svg className="capture-glyph" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2.25" y="3.25" width="13.5" height="11.5" rx="2" />
      <circle cx="11.8" cy="6.8" r="1.15" />
      <path d="M3.7 12.9 7.2 9.5l2.1 2 1.4-1.25 3.6 2.65" />
    </svg>
  );
}

function VectorGlyph() {
  return (
    <svg className="capture-glyph" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 13.5C4.6 7.2 8.1 4.5 14 4.5M4 13.5c4.2.4 7.4-1 10-4.1" />
      <circle cx="4" cy="13.5" r="1.45" />
      <circle cx="14" cy="4.5" r="1.45" />
      <circle cx="14" cy="9.4" r="1.45" />
    </svg>
  );
}

function AgentCanvas({
  accentColor,
  decorative = false,
  detail,
  label,
  onSequenceStepChange,
  onPointerEnter,
  onEngineReady,
  requestedStep,
  theme,
  variant,
}: {
  accentColor: string;
  decorative?: boolean;
  detail: UnifiedAgentDetail;
  label: string;
  onSequenceStepChange?: (step: UnifiedAgentSequenceStep) => void;
  onPointerEnter: () => void;
  onEngineReady?: (engine: UnifiedAgentEngine | null) => void;
  requestedStep?: { id: number; step: UnifiedAgentSequenceStep } | null;
  theme: UnifiedAgentTheme;
  variant: UnifiedAgentVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UnifiedAgentEngine | null>(null);
  const initialAccentColor = useRef(accentColor);
  const initialDecorative = useRef(decorative);
  const initialDetail = useRef(detail);
  const initialStepChange = useRef(onSequenceStepChange);
  const initialTheme = useRef(theme);
  const initialEngineReady = useRef(onEngineReady);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const notifyEngineReady = initialEngineReady.current;
    const engine = new UnifiedAgentEngine(canvas, {
      accentColor: initialAccentColor.current,
      detail: initialDetail.current,
      interactive: !initialDecorative.current,
      onSequenceStepChange: initialStepChange.current,
      theme: initialTheme.current,
    });
    engineRef.current = engine;
    notifyEngineReady?.(engine);
    return () => {
      engine.destroy();
      engineRef.current = null;
      notifyEngineReady?.(null);
    };
  }, []);

  useEffect(() => engineRef.current?.setDetail(detail), [detail]);
  useEffect(() => engineRef.current?.setAccentColor(accentColor), [accentColor]);
  useEffect(() => engineRef.current?.setTheme(theme), [theme]);
  useEffect(() => engineRef.current?.setVariant(variant), [variant]);
  useEffect(() => {
    if (requestedStep) engineRef.current?.playSequenceStep(requestedStep.step);
  }, [requestedStep]);

  return (
    <canvas
      ref={canvasRef}
      className="unified-agent-canvas"
      onPointerEnter={onPointerEnter}
      {...(decorative ? { 'aria-hidden': true } : { 'aria-label': label, role: 'img' })}
    />
  );
}

export function UnifiedAgent() {
  const shouldReduceMotion = useReducedMotion();
  const [activeSequenceStep, setActiveSequenceStep] = useState<UnifiedAgentSequenceStep>(0);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [carouselStep, setCarouselStep] = useState<UnifiedAgentSequenceStep>(0);
  const [detail, setDetail] = useState<UnifiedAgentDetail>(1);
  const [exportScale, setExportScale] = useState<AgentCaptureScale>(1);
  const [requestedStep, setRequestedStep] = useState<{
    id: number;
    step: UnifiedAgentSequenceStep;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<UnifiedAgentTheme>('light');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const requestId = useRef(0);
  const mainEngineRef = useRef<UnifiedAgentEngine | null>(null);
  const carouselEngineRefs = useRef<Array<UnifiedAgentEngine | null>>([]);
  const soundMounted = useRef(false);
  const stageSize = detail * 80;
  const selectedIndex = SEQUENCE_STEPS[carouselStep].carouselIndex;
  const captureSize = UNIFIED_AGENT_EXPORT_SIZE * exportScale;
  const getCaptureEngine = useCallback(
    () =>
      viewMode === 'list'
        ? mainEngineRef.current
        : (carouselEngineRefs.current[selectedIndex] ?? null),
    [selectedIndex, viewMode],
  );
  const {
    busy: captureBusy,
    error: captureError,
    lastExport,
    recording,
    recordingSeconds,
    savePng,
    saveSvg,
    toggleRecording,
  } = useAgentCapture(getCaptureEngine, exportScale, detail);

  const selectRelative = useCallback((step: number) => {
    setCarouselStep(
      (current) =>
        ((current + step + SEQUENCE_STEPS.length) %
          SEQUENCE_STEPS.length) as UnifiedAgentSequenceStep,
    );
  }, []);

  useEffect(() => {
    configureSoundSystem(soundEnabled);
    return stopSoundSequences;
  }, [soundEnabled]);

  useEffect(() => {
    if (viewMode !== 'grid' || shouldReduceMotion) return;
    const autoplay = window.setTimeout(() => selectRelative(1), AUTOPLAY_MS);
    return () => window.clearTimeout(autoplay);
  }, [carouselStep, selectRelative, shouldReduceMotion, viewMode]);

  useEffect(() => {
    if (!soundMounted.current) {
      soundMounted.current = true;
      return;
    }
    if (viewMode !== 'grid' || !soundEnabled) return;
    playFocusSignature(CAROUSEL_STATES[selectedIndex]);
    return stopSoundSequences;
  }, [carouselStep, selectedIndex, soundEnabled, viewMode]);

  const selectCarouselState = (index: number) => {
    if (index !== selectedIndex && soundEnabled) playControlSound('page', 0.08);
    setCarouselStep((index === 0 ? 0 : index === 1 ? 1 : 3) as UnifiedAgentSequenceStep);
  };

  const selectSequenceStep = (step: UnifiedAgentSequenceStep) => {
    if (soundEnabled) playControlSound('page', 0.08);
    if (viewMode === 'grid') {
      setCarouselStep(step);
      return;
    }
    requestId.current += 1;
    setRequestedStep({ id: requestId.current, step });
  };

  return (
    <main
      className={`morph-experience unified-agent-page theme--${theme} mode--${viewMode}`}
      data-capture-format={lastExport?.format}
      data-capture-size={lastExport?.size}
      data-capture-bytes={lastExport?.bytes}
      data-recording={recording}
    >
      <div className="experience-controls" aria-label="Display controls">
        <div className="theme-control">
          <span className={theme === 'light' ? 'is-active' : ''}>Light</span>
          <button
            type="button"
            className="theme-switch"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => {
              playControlSound('toggle', 0.1);
              setTheme((current) => (current === 'light' ? 'dark' : 'light'));
            }}
          >
            <span className="theme-switch__thumb" />
          </button>
          <span className={theme === 'dark' ? 'is-active' : ''}>Dark</span>
        </div>

        <span className="controls-divider" aria-hidden="true" />

        <button
          type="button"
          className="sound-toggle"
          aria-label={soundEnabled ? 'Mute interaction sounds' : 'Enable interaction sounds'}
          aria-pressed={soundEnabled}
          onClick={() => {
            if (soundEnabled) playControlSound('toggle', 0.1);
            if (!soundEnabled) playControlSound('ready', 0.1);
            setSoundEnabled((current) => !current);
          }}
        >
          <SoundGlyph enabled={soundEnabled} />
        </button>

        <span className="controls-divider" aria-hidden="true" />

        <div className="view-switch" role="group" aria-label="Experience view">
          <button
            type="button"
            className={`view-switch__button ${viewMode === 'list' ? 'is-active' : ''}`}
            disabled={captureBusy || recording}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            onClick={() => {
              if (viewMode !== 'list' && soundEnabled) playControlSound('page', 0.08);
              setViewMode('list');
            }}
          >
            <ListGlyph />
          </button>
          <button
            type="button"
            className={`view-switch__button ${viewMode === 'grid' ? 'is-active' : ''}`}
            disabled={captureBusy || recording}
            aria-label="Grid carousel view"
            aria-pressed={viewMode === 'grid'}
            onClick={() => {
              if (viewMode !== 'grid' && soundEnabled) playControlSound('page', 0.08);
              setViewMode('grid');
            }}
          >
            <GridGlyph />
          </button>
        </div>
      </div>

      <div className="capture-frame" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      {viewMode === 'list' ? (
        <section
          className="unified-agent-stage"
          aria-label={`Unified magnetic agent at ${stageSize} pixels`}
          style={{ '--agent-size': `${stageSize}px` } as CSSProperties}
        >
          <AgentCanvas
            accentColor={accentColor}
            detail={detail}
            label="A black-eyed rotating particle agent over a feathered color field"
            onSequenceStepChange={setActiveSequenceStep}
            onEngineReady={(engine) => {
              mainEngineRef.current = engine;
            }}
            onPointerEnter={() => {
              if (soundEnabled) playHoverSignature('agent');
            }}
            requestedStep={requestedStep}
            theme={theme}
            variant="auto"
          />
        </section>
      ) : (
        <section
          className="agent-carousel"
          aria-label="Current magnetic agent states"
          tabIndex={0}
          style={{ '--agent-size': `${stageSize}px` } as CSSProperties}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              selectRelative(-1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              selectRelative(1);
            }
          }}
        >
          {CAROUSEL_STATES.map((state, index) => (
            <figure
              key={state}
              className="agent-carousel__item"
              data-selected={index === selectedIndex}
              style={carouselStyle(index, selectedIndex, detail)}
            >
              <button
                type="button"
                className="agent-carousel__button"
                disabled={captureBusy || recording}
                aria-label={`Select ${state === 'agent' ? 'aware face' : state === 'fast' ? 'dizzy fast' : 'void collapse'} state`}
                aria-pressed={index === selectedIndex}
                onClick={() => selectCarouselState(index)}
              >
                <AgentCanvas
                  accentColor={accentColor}
                  decorative
                  detail={detail}
                  label=""
                  onPointerEnter={() => {
                    if (soundEnabled) playHoverSignature(state);
                  }}
                  onEngineReady={(engine) => {
                    carouselEngineRefs.current[index] = engine;
                  }}
                  theme={theme}
                  variant={state}
                />
              </button>
            </figure>
          ))}
        </section>
      )}

      <div className="agent-bottom-controls">
        <div className="sequence-controls" role="group" aria-label="Animation sequence">
          {SEQUENCE_STEPS.map(({ label }, index) => {
            const step = index as UnifiedAgentSequenceStep;
            const active = (viewMode === 'list' ? activeSequenceStep : carouselStep) === step;
            return (
              <button
                key={`${index}-${label}`}
                type="button"
                className={active ? 'is-active' : ''}
                aria-label={`${index + 1}. ${label}`}
                aria-pressed={active}
                onClick={() => selectSequenceStep(step)}
              >
                <span className="sequence-step__number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="sequence-step__label">{label}</span>
              </button>
            );
          })}
        </div>

        <span className="bottom-controls-divider" aria-hidden="true" />

        <div className="agent-utility-controls">
          <div className="detail-controls" role="group" aria-label="Agent display size">
            {([1, 2, 4] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={detail === value ? 'is-active' : ''}
                disabled={captureBusy || recording}
                aria-label={`Display agent at ${value * 80} pixels`}
                aria-pressed={detail === value}
                onClick={() => {
                  if (value !== detail && soundEnabled) playControlSound('tick', 0.09);
                  setDetail(value);
                }}
              >
                {value}×
              </button>
            ))}
          </div>

          <span className="bottom-controls-divider" aria-hidden="true" />

          <div className="color-controls" role="group" aria-label="Agent field color">
            {COLOR_PRESETS.map(({ label, value }) => {
              const active = accentColor.toUpperCase() === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={active ? 'is-active' : ''}
                  aria-label={`Use ${label} field`}
                  aria-pressed={active}
                  onClick={() => {
                    if (!active && soundEnabled) playControlSound('tick', 0.07);
                    setAccentColor(value);
                  }}
                >
                  <span
                    className="color-control__swatch"
                    style={{ '--swatch-color': value } as CSSProperties}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
            <label className="custom-color-control" title="Custom color">
              <input
                type="color"
                value={accentColor}
                aria-label="Choose custom field color"
                onInput={(event) => setAccentColor(event.currentTarget.value.toUpperCase())}
              />
              <span
                className="custom-color-control__swatch"
                style={{ '--swatch-color': accentColor } as CSSProperties}
                aria-hidden="true"
              />
            </label>
          </div>

          <span className="bottom-controls-divider" aria-hidden="true" />

          <div
            className="capture-controls"
            data-error={Boolean(captureError)}
            role="group"
            aria-label="Capture and export"
          >
            <div
              className="capture-scale-control"
              role="group"
              aria-label={`Export size, currently ${captureSize} by ${captureSize} pixels`}
            >
              {([1, 2, 3] as const).map((value) => {
                const outputSize = UNIFIED_AGENT_EXPORT_SIZE * value;
                return (
                  <button
                    key={value}
                    type="button"
                    className={exportScale === value ? 'is-active' : ''}
                    disabled={captureBusy || recording}
                    aria-label={`${value} times, ${outputSize} by ${outputSize} pixels`}
                    aria-pressed={exportScale === value}
                    onClick={() => {
                      if (value !== exportScale && soundEnabled) playControlSound('tick', 0.07);
                      setExportScale(value as AgentCaptureScale);
                    }}
                  />
                );
              })}
            </div>

            <button
              type="button"
              className="capture-action capture-action--record"
              data-recording={recording}
              disabled={captureBusy}
              aria-label={
                recording
                  ? `Stop and save MP4 recording, ${recordingSeconds} seconds captured`
                  : `Record ${captureSize} by ${captureSize} MP4 at 30 frames per second`
              }
              aria-pressed={recording}
              onClick={toggleRecording}
            >
              <RecordGlyph recording={recording} />
            </button>
            <button
              type="button"
              className="capture-action"
              disabled={captureBusy || recording}
              aria-label={`Save transparent PNG at ${captureSize} by ${captureSize} pixels`}
              onClick={() => void savePng()}
            >
              <SnapshotGlyph />
            </button>
            <button
              type="button"
              className="capture-action"
              disabled={captureBusy || recording}
              aria-label={`Save transparent SVG at ${captureSize} by ${captureSize} pixels`}
              onClick={saveSvg}
            >
              <VectorGlyph />
            </button>
            <span className="capture-status" role="status" aria-live="polite">
              {captureError ||
                (recording
                  ? `Recording MP4 at 30 frames per second. ${recordingSeconds} seconds captured.`
                  : lastExport
                    ? `${lastExport.format.toUpperCase()} saved at ${lastExport.size} pixels.`
                    : '')}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
