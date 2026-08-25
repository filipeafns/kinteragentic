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
  type UnifiedAgentSequenceStep,
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

function AgentCanvas({
  decorative = false,
  detail,
  glowEnabled,
  label,
  onSequenceStepChange,
  onPointerEnter,
  requestedStep,
  theme,
  variant,
}: {
  decorative?: boolean;
  detail: UnifiedAgentDetail;
  glowEnabled: boolean;
  label: string;
  onSequenceStepChange?: (step: UnifiedAgentSequenceStep) => void;
  onPointerEnter: () => void;
  requestedStep?: { id: number; step: UnifiedAgentSequenceStep } | null;
  theme: UnifiedAgentTheme;
  variant: UnifiedAgentVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UnifiedAgentEngine | null>(null);
  const initialDecorative = useRef(decorative);
  const initialDetail = useRef(detail);
  const initialStepChange = useRef(onSequenceStepChange);
  const initialTheme = useRef(theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new UnifiedAgentEngine(canvas, {
      detail: initialDetail.current,
      interactive: !initialDecorative.current,
      onSequenceStepChange: initialStepChange.current,
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
  const [carouselStep, setCarouselStep] = useState<UnifiedAgentSequenceStep>(0);
  const [detail, setDetail] = useState<UnifiedAgentDetail>(1);
  const [glowEnabled, setGlowEnabled] = useState(false);
  const [requestedStep, setRequestedStep] = useState<{
    id: number;
    step: UnifiedAgentSequenceStep;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<UnifiedAgentTheme>('dark');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const requestId = useRef(0);
  const soundMounted = useRef(false);
  const stageSize = detail * 80;
  const selectedIndex = SEQUENCE_STEPS[carouselStep].carouselIndex;

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
            onSequenceStepChange={setActiveSequenceStep}
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
                aria-label={`Select ${state === 'agent' ? 'aware face' : state === 'fast' ? 'dizzy fast' : 'void collapse'} state`}
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

        <div className="agent-utility-controls">
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
      </div>
    </main>
  );
}
