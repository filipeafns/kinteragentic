'use client';

import { useEffect, useRef, useState } from 'react';
import {
  configureSoundSystem,
  playControlSound,
  playHoverSignature,
  stopSoundSequences,
} from './magnetic-sound-engine';
import {
  type UnifiedAgentDetail,
  UnifiedAgentEngine,
  type UnifiedAgentTheme,
} from './unified-agent-engine';

function SoundGlyph({ enabled }: { enabled: boolean }) {
  return (
    <span className="sound-glyph" data-enabled={enabled} aria-hidden="true">
      <span className="sound-glyph__speaker" />
      <span className="sound-glyph__wave" />
    </span>
  );
}

function AgentGlyph() {
  return (
    <span className="agent-view-glyph" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

function GridGlyph() {
  return (
    <span className="view-glyph view-glyph--carousel" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

export function UnifiedAgent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UnifiedAgentEngine | null>(null);
  const [detail, setDetail] = useState<UnifiedAgentDetail>(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<UnifiedAgentTheme>('light');
  const initialDetail = useRef(detail);
  const initialTheme = useRef(theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new UnifiedAgentEngine(canvas, {
      detail: initialDetail.current,
      theme: initialTheme.current,
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => engineRef.current?.setDetail(detail), [detail]);
  useEffect(() => engineRef.current?.setTheme(theme), [theme]);
  useEffect(() => {
    configureSoundSystem(soundEnabled);
    return stopSoundSequences;
  }, [soundEnabled]);

  return (
    <main className={`morph-experience unified-agent-page theme--${theme}`}>
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
            configureSoundSystem(!soundEnabled);
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
            className="view-switch__button is-active"
            aria-label="Unified agent view"
            aria-pressed="true"
          >
            <AgentGlyph />
          </button>
          <a className="view-switch__button" href="/studies" aria-label="Open particle studies">
            <GridGlyph />
          </a>
        </div>
      </div>

      <section className="unified-agent-stage" aria-label="Unified magnetic agent">
        <canvas
          ref={canvasRef}
          className="unified-agent-canvas"
          role="img"
          aria-label="A fixed-size particle agent with two solid oval eyes and a mapped circular field"
          onPointerEnter={() => {
            if (soundEnabled) playHoverSignature('agent-tall');
          }}
        />
      </section>

      <div className="detail-controls" role="group" aria-label="Canvas render density">
        {([1, 2, 4] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={detail === value ? 'is-active' : ''}
            aria-label={`Render canvas at ${value} times density`}
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
    </main>
  );
}
