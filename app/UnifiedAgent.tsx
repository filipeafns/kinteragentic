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
  type UnifiedAgentTheme,
  type UnifiedAgentVariant,
} from './unified-agent-engine';

type ViewMode = 'list' | 'grid';
type CarouselStyle = CSSProperties & {
  '--carousel-blur': string;
  '--carousel-opacity': string;
  '--carousel-scale': string;
  '--carousel-x': string;
  '--carousel-y': string;
};

const VARIANTS: UnifiedAgentVariant[] = ['auto', 'agent', 'globe', 'cube', 'fast'];
const CAROUSEL_STATES: AgentSoundState[] = ['agent', 'globe', 'cube', 'fast'];
const AUTOPLAY_MS = 4_200;

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
  const oppositeScale = detail === 1 ? 0.7 : detail === 2 ? 0.56 : 0.38;
  const opposite = distance === 2;

  return {
    '--carousel-blur': `${distance < 2 ? 0 : 4.5}px`,
    '--carousel-opacity': `${[1, 0.72, 0.2][distance]}`,
    '--carousel-scale': `${[selectedScale, neighborScale, oppositeScale][distance]}`,
    '--carousel-x': `${
      opposite ? 0 : Math.sign(delta) * (154 + (stageSize - 80) * 0.72)
    }px`,
    '--carousel-y': `${
      distance === 0
        ? 0
        : opposite
          ? 258 + (stageSize - 80) * 0.38
          : 116 + (stageSize - 80) * 0.28
    }px`,
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

function VariantGlyph({ variant }: { variant: UnifiedAgentVariant }) {
  const count = variant === 'agent' ? 2 : variant === 'fast' ? 3 : 1;
  return (
    <span className={`variant-glyph variant-glyph--${variant}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function AgentCanvas({
  decorative = false,
  detail,
  glowEnabled,
  label,
  onPointerEnter,
  theme,
  variant,
}: {
  decorative?: boolean;
  detail: UnifiedAgentDetail;
  glowEnabled: boolean;
  label: string;
  onPointerEnter: () => void;
  theme: UnifiedAgentTheme;
  variant: UnifiedAgentVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UnifiedAgentEngine | null>(null);
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
  useEffect(() => engineRef.current?.setGlow(glowEnabled), [glowEnabled]);
  useEffect(() => engineRef.current?.setTheme(theme), [theme]);
  useEffect(() => engineRef.current?.setVariant(variant), [variant]);

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
  const [carouselAuto, setCarouselAuto] = useState(true);
  const [detail, setDetail] = useState<UnifiedAgentDetail>(1);
  const [glowEnabled, setGlowEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<UnifiedAgentTheme>('dark');
  const [variant, setVariant] = useState<UnifiedAgentVariant>('auto');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const soundMounted = useRef(false);
  const stageSize = detail * 80;

  const selectRelative = useCallback((step: number) => {
    setSelectedIndex(
      (current) => (current + step + CAROUSEL_STATES.length) % CAROUSEL_STATES.length,
    );
  }, []);

  useEffect(() => {
    configureSoundSystem(soundEnabled);
    return stopSoundSequences;
  }, [soundEnabled]);

  useEffect(() => {
    if (viewMode !== 'grid' || !carouselAuto || shouldReduceMotion) return;
    const autoplay = window.setTimeout(() => selectRelative(1), AUTOPLAY_MS);
    return () => window.clearTimeout(autoplay);
  }, [carouselAuto, selectedIndex, selectRelative, shouldReduceMotion, viewMode]);

  useEffect(() => {
    if (!soundMounted.current) {
      soundMounted.current = true;
      return;
    }
    if (viewMode !== 'grid' || !soundEnabled) return;
    playFocusSignature(CAROUSEL_STATES[selectedIndex]);
    return stopSoundSequences;
  }, [selectedIndex, soundEnabled, viewMode]);

  const selectCarouselState = (index: number, manual = true) => {
    if (index !== selectedIndex && soundEnabled) playControlSound('page', 0.08);
    setSelectedIndex(index);
    if (manual) setCarouselAuto(false);
  };

  return (
    <main className={`morph-experience unified-agent-page theme--${theme} mode--${viewMode}`}>
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
            className={`view-switch__button ${viewMode === 'list' ? 'is-active' : ''}`}
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

      {viewMode === 'list' ? (
        <section
          className="unified-agent-stage"
          aria-label={`Unified magnetic agent at ${stageSize} pixels`}
          style={{ '--agent-size': `${stageSize}px` } as CSSProperties}
        >
          <AgentCanvas
            detail={detail}
            glowEnabled={glowEnabled}
            label="A rotating particle agent whose dots flow around two solid oval eyes"
            onPointerEnter={() => {
              if (soundEnabled) playHoverSignature('agent');
            }}
            theme={theme}
            variant={variant}
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
              setCarouselAuto(false);
              selectRelative(-1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              setCarouselAuto(false);
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
                aria-label={`Select ${state === 'agent' ? 'face' : state} state`}
                aria-pressed={index === selectedIndex}
                onClick={() => selectCarouselState(index)}
              >
                <AgentCanvas
                  decorative
                  detail={detail}
                  glowEnabled={glowEnabled}
                  label=""
                  onPointerEnter={() => {
                    if (soundEnabled) playHoverSignature(state);
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
        <div className="variant-controls" role="group" aria-label="Agent variant">
          {VARIANTS.map((value) => {
            const stateIndex = value === 'auto' ? -1 : CAROUSEL_STATES.indexOf(value);
            const active =
              viewMode === 'list'
                ? variant === value
                : value === 'auto'
                  ? carouselAuto
                  : !carouselAuto && stateIndex === selectedIndex;
            return (
              <button
                key={value}
                type="button"
                className={active ? 'is-active' : ''}
                aria-label={`${value === 'agent' ? 'Face' : value} variant`}
                aria-pressed={active}
                onClick={() => {
                  if (viewMode === 'list') {
                    if (value !== variant && soundEnabled) playControlSound('page', 0.08);
                    setVariant(value);
                    return;
                  }
                  if (value === 'auto') {
                    if (!carouselAuto && soundEnabled) playControlSound('ready', 0.08);
                    setCarouselAuto(true);
                    return;
                  }
                  selectCarouselState(stateIndex);
                }}
              >
                <VariantGlyph variant={value} />
              </button>
            );
          })}
        </div>

        <div className="detail-controls" role="group" aria-label="Agent display size">
          {([1, 2, 4] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={detail === value ? 'is-active' : ''}
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

        <button
          type="button"
          className={`glow-toggle ${glowEnabled ? 'is-active' : ''}`}
          aria-label={glowEnabled ? 'Disable faint green glow' : 'Enable faint green glow'}
          aria-pressed={glowEnabled}
          onClick={() => {
            if (soundEnabled) playControlSound('bloom', 0.08);
            setGlowEnabled((current) => !current);
          }}
        >
          <span aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
