'use client';

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  MagneticMorphEngine,
  type MagneticShape,
  type MagneticSurface,
  type MagneticTheme,
} from './magnetic-morph-engine';
import {
  configureSoundSystem,
  playControlSound,
  playFocusSignature,
  playHoverSignature,
  stopSoundSequences,
} from './magnetic-sound-engine';

type Study = {
  label: string;
  offset: number;
  sequence: MagneticShape[];
  tempo: number;
};

type DisplayMode = 'carousel' | 'grid';
type DetailScale = 1 | 2 | 4;

type ExperienceStyle = CSSProperties & {
  '--detail-scale': number;
};

type CarouselStyle = CSSProperties & {
  '--carousel-blur': string;
  '--carousel-opacity': string;
  '--carousel-scale': string;
  '--carousel-x': string;
  '--carousel-y': string;
};

const AUTOPLAY_MS = 4200;

const STUDIES: Study[] = [
  {
    label: 'Magnetic loader morphing through round agent eyes, a grid, check, sphere, and cloud',
    offset: 0,
    sequence: ['loader', 'agent-round', 'grid', 'check', 'sphere', 'cloud'],
    tempo: 2320,
  },
  {
    label: 'Magnetic grid morphing through long agent eyes, spreadsheet cells, a checklist, columns, cube, and sphere',
    offset: 0.08,
    sequence: ['grid', 'agent-long', 'spreadsheet', 'checklist', 'columns', 'cube', 'sphere'],
    tempo: 2460,
  },
  {
    label: 'Magnetic cube morphing through tall agent eyes, a pyramid, diamond, sphere, and cloud',
    offset: 0.16,
    sequence: ['cube', 'agent-tall', 'pyramid', 'diamond', 'sphere', 'cloud'],
    tempo: 2240,
  },
  {
    label: 'Magnetic sphere morphing through round agent eyes, a loader, helix, cube, and check',
    offset: 0.24,
    sequence: ['sphere', 'agent-round', 'loader', 'helix', 'cube', 'check'],
    tempo: 2520,
  },
  {
    label: 'Magnetic cloud morphing through long agent eyes, a wave, sphere, pyramid, and grid',
    offset: 0.32,
    sequence: ['cloud', 'agent-long', 'wave', 'sphere', 'pyramid', 'grid'],
    tempo: 2380,
  },
  {
    label: 'Magnetic check morphing through tall agent eyes, a grid, checklist, columns, sphere, and loader',
    offset: 0.4,
    sequence: ['check', 'agent-tall', 'grid', 'checklist', 'columns', 'sphere', 'loader'],
    tempo: 2280,
  },
  {
    label: 'Magnetic spreadsheet morphing through long agent eyes, a checklist, columns, grid, check, and cube',
    offset: 0.48,
    sequence: ['spreadsheet', 'agent-long', 'checklist', 'columns', 'grid', 'check', 'cube'],
    tempo: 2420,
  },
  {
    label: 'Magnetic columns morphing through tall agent eyes, a spreadsheet, checklist, pyramid, wave, and grid',
    offset: 0.56,
    sequence: ['columns', 'agent-tall', 'spreadsheet', 'checklist', 'pyramid', 'wave', 'grid'],
    tempo: 2340,
  },
  {
    label: 'Magnetic pyramid morphing through round agent eyes, a cube, diamond, sphere, and cloud',
    offset: 0.64,
    sequence: ['pyramid', 'agent-round', 'cube', 'diamond', 'sphere', 'cloud'],
    tempo: 2500,
  },
  {
    label: 'Magnetic diamond morphing through tall agent eyes, a helix, pyramid, cube, and loader',
    offset: 0.72,
    sequence: ['diamond', 'agent-tall', 'helix', 'pyramid', 'cube', 'loader'],
    tempo: 2260,
  },
  {
    label: 'Magnetic helix morphing through long agent eyes, a sphere, wave, cloud, and check',
    offset: 0.8,
    sequence: ['helix', 'agent-long', 'sphere', 'wave', 'cloud', 'check'],
    tempo: 2440,
  },
  {
    label: 'Magnetic wave morphing through round agent eyes, a loader, grid, columns, and sphere',
    offset: 0.88,
    sequence: ['wave', 'agent-round', 'loader', 'grid', 'columns', 'sphere'],
    tempo: 2300,
  },
];

function shortestDelta(index: number, selectedIndex: number) {
  const total = STUDIES.length;
  let delta = (index - selectedIndex + total) % total;
  if (delta > total / 2) delta -= total;
  return delta;
}

function carouselStyle(
  index: number,
  selectedIndex: number,
  detailScale: DetailScale,
): CarouselStyle {
  const delta = shortestDelta(index, selectedIndex);
  const distance = Math.abs(delta);
  const hidden = distance > 3;
  const opacity = hidden ? 0 : [1, 0.7, 0.24, 0.055][distance];
  const scale = [1.56, 1, 0.78, 0.62][Math.min(distance, 3)];
  const horizontalSpread = 1 + (detailScale - 1) * 0.68;
  const verticalSpread = 1 + (detailScale - 1) * 0.45;
  const x = Math.sign(delta) * Math.pow(distance, 0.82) * 154 * horizontalSpread;
  const y = distance === 0 ? 0 : (68 + Math.pow(distance, 1.58) * 44) * verticalSpread;

  return {
    '--carousel-blur': `${distance <= 1 ? 0 : (distance - 1) * 3.5}px`,
    '--carousel-opacity': `${opacity}`,
    '--carousel-scale': `${scale}`,
    '--carousel-x': `${x}px`,
    '--carousel-y': `${y}px`,
    pointerEvents: hidden ? 'none' : 'auto',
    zIndex: 100 - distance,
  };
}

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

function ViewGlyph({ mode }: { mode: DisplayMode }) {
  return (
    <span className={`view-glyph view-glyph--${mode}`} aria-hidden="true">
      {Array.from({ length: mode === 'grid' ? 3 : 4 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function SoundGlyph({ enabled }: { enabled: boolean }) {
  return (
    <span className="sound-glyph" data-enabled={enabled} aria-hidden="true">
      <span className="sound-glyph__speaker" />
      <span className="sound-glyph__wave" />
    </span>
  );
}

function ExperienceControls({
  displayMode,
  onDisplayModeChange,
  onSoundChange,
  onThemeChange,
  soundEnabled,
  theme,
}: {
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onSoundChange: () => void;
  onThemeChange: () => void;
  soundEnabled: boolean;
  theme: MagneticTheme;
}) {
  return (
    <div className="experience-controls" aria-label="Display controls">
      <div className="theme-control">
        <span className={theme === 'light' ? 'is-active' : ''}>Light</span>
        <button
          type="button"
          className="theme-switch"
          role="switch"
          aria-checked={theme === 'dark'}
          aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} mode`}
          onClick={onThemeChange}
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
        onClick={onSoundChange}
      >
        <SoundGlyph enabled={soundEnabled} />
      </button>

      <span className="controls-divider" aria-hidden="true" />

      <div className="view-switch" role="group" aria-label="Display mode">
        {(['grid', 'carousel'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`view-switch__button ${displayMode === mode ? 'is-active' : ''}`}
            aria-label={`${mode === 'carousel' ? 'Carousel' : 'Grid'} view`}
            aria-pressed={displayMode === mode}
            onClick={() => onDisplayModeChange(mode)}
          >
            <ViewGlyph mode={mode} />
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailControls({
  onChange,
  value,
}: {
  onChange: (scale: DetailScale) => void;
  value: DetailScale;
}) {
  return (
    <div className="detail-controls" role="group" aria-label="Particle detail size">
      {([1, 2, 4] as const).map((scale) => (
        <button
          key={scale}
          type="button"
          className={value === scale ? 'is-active' : ''}
          aria-label={`Render particles at ${scale} times size`}
          aria-pressed={value === scale}
          onClick={() => onChange(scale)}
        >
          {scale}×
        </button>
      ))}
    </div>
  );
}

function MorphStudy({
  detailScale,
  displayMode,
  index,
  onPreview,
  onSelect,
  selected,
  study,
  style,
  theme,
}: {
  detailScale: DetailScale;
  displayMode: DisplayMode;
  index: number;
  onPreview: () => void;
  onSelect: () => void;
  selected: boolean;
  study: Study;
  style?: CarouselStyle;
  theme: MagneticTheme;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MagneticMorphEngine | null>(null);
  const renderScale = detailScale * (displayMode === 'carousel' ? 68 / 40 : 1);
  const surface: MagneticSurface = displayMode === 'carousel' ? 'card' : 'page';
  const initialScale = useRef(renderScale);
  const initialSurface = useRef(surface);
  const initialTheme = useRef(theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new MagneticMorphEngine(canvas, {
      offset: study.offset,
      scale: initialScale.current,
      sequence: study.sequence,
      surface: initialSurface.current,
      tempo: study.tempo,
      theme: initialTheme.current,
      variant: index,
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [index, study]);

  useEffect(() => engineRef.current?.setTheme(theme), [theme]);
  useEffect(() => engineRef.current?.setScale(renderScale), [renderScale]);
  useEffect(() => engineRef.current?.setSurface(surface), [surface]);

  return (
    <figure
      className="morph-study"
      data-selected={selected}
      data-view={displayMode}
      style={style}
    >
      <button
        type="button"
        className="morph-study__button"
        aria-label={study.label}
        aria-pressed={selected}
        onClick={onSelect}
        onMouseEnter={onPreview}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="morph-canvas"
          height={120}
          width={120}
        />
      </button>
    </figure>
  );
}

export function MorphGallery() {
  const shouldReduceMotion = useReducedMotion();
  const [theme, setTheme] = useState<MagneticTheme>('dark');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [selectedIndex, setSelectedIndex] = useState(8);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [detailScale, setDetailScale] = useState<DetailScale>(1);
  const soundMounted = useRef(false);

  const selectRelative = useCallback((step: number) => {
    setSelectedIndex((current) => (current + step + STUDIES.length) % STUDIES.length);
  }, []);

  useEffect(() => {
    if (displayMode !== 'carousel' || shouldReduceMotion) return;
    const autoplay = window.setTimeout(() => selectRelative(1), AUTOPLAY_MS);
    return () => window.clearTimeout(autoplay);
  }, [displayMode, selectRelative, selectedIndex, shouldReduceMotion]);

  useEffect(() => {
    configureSoundSystem(soundEnabled);
    return stopSoundSequences;
  }, [soundEnabled]);

  useEffect(() => {
    if (!soundMounted.current) {
      soundMounted.current = true;
      return;
    }
    if (displayMode !== 'carousel' || !soundEnabled) return;
    playFocusSignature(STUDIES[selectedIndex].sequence[0]);
    return stopSoundSequences;
  }, [displayMode, selectedIndex, soundEnabled]);

  const selectedName = STUDIES[selectedIndex].sequence[0].toUpperCase();
  const experienceStyle: ExperienceStyle = { '--detail-scale': detailScale };

  return (
    <main
      className={`morph-experience theme--${theme} view--${displayMode}`}
      data-detail-scale={detailScale}
      style={experienceStyle}
    >
      <ExperienceControls
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        onSoundChange={() => {
          if (soundEnabled) playControlSound('toggle', 0.12);
          configureSoundSystem(!soundEnabled);
          if (!soundEnabled) playControlSound('ready', 0.12);
          setSoundEnabled((current) => !current);
        }}
        onThemeChange={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        soundEnabled={soundEnabled}
        theme={theme}
      />

      <section
        className="morph-gallery"
        aria-label="Magnetic morph studies"
        tabIndex={displayMode === 'carousel' ? 0 : -1}
        onKeyDown={(event) => {
          if (displayMode !== 'carousel') return;
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
        {STUDIES.map((study, index) => (
          <MorphStudy
            key={study.label}
            detailScale={detailScale}
            displayMode={displayMode}
            index={index}
            onPreview={() => {
              if (soundEnabled) playHoverSignature(study.sequence[0]);
            }}
            onSelect={() => {
              setSelectedIndex(index);
              if (displayMode === 'grid') setDisplayMode('carousel');
            }}
            selected={index === selectedIndex}
            study={study}
            style={
              displayMode === 'carousel'
                ? carouselStyle(index, selectedIndex, detailScale)
                : undefined
            }
            theme={theme}
          />
        ))}

        {displayMode === 'carousel' ? (
          <p className="carousel-caption" aria-live="polite">
            Magnetic {selectedName}
          </p>
        ) : null}
      </section>

      <DetailControls
        value={detailScale}
        onChange={(scale) => {
          if (scale !== detailScale && soundEnabled) playControlSound('tick', 0.1);
          setDetailScale(scale);
        }}
      />
    </main>
  );
}
