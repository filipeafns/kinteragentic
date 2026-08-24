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
  type MagneticTheme,
} from './magnetic-morph-engine';

type Study = {
  label: string;
  offset: number;
  sequence: MagneticShape[];
  tempo: number;
};

type DisplayMode = 'carousel' | 'grid';

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
    label: 'Magnetic loader morphing through a grid, check, sphere, and cloud',
    offset: 0,
    sequence: ['loader', 'grid', 'check', 'sphere', 'cloud'],
    tempo: 2320,
  },
  {
    label: 'Magnetic grid morphing through spreadsheet cells, columns, a cube, and sphere',
    offset: 0.08,
    sequence: ['grid', 'spreadsheet', 'columns', 'cube', 'sphere'],
    tempo: 2460,
  },
  {
    label: 'Magnetic cube morphing through a pyramid, diamond, sphere, and cloud',
    offset: 0.16,
    sequence: ['cube', 'pyramid', 'diamond', 'sphere', 'cloud'],
    tempo: 2240,
  },
  {
    label: 'Magnetic sphere morphing through a loader, helix, cube, and check',
    offset: 0.24,
    sequence: ['sphere', 'loader', 'helix', 'cube', 'check'],
    tempo: 2520,
  },
  {
    label: 'Magnetic cloud morphing through a wave, sphere, pyramid, and grid',
    offset: 0.32,
    sequence: ['cloud', 'wave', 'sphere', 'pyramid', 'grid'],
    tempo: 2380,
  },
  {
    label: 'Magnetic check morphing through a grid, columns, sphere, and loader',
    offset: 0.4,
    sequence: ['check', 'grid', 'columns', 'sphere', 'loader'],
    tempo: 2280,
  },
  {
    label: 'Magnetic spreadsheet morphing through columns, grid, check, and cube',
    offset: 0.48,
    sequence: ['spreadsheet', 'columns', 'grid', 'check', 'cube'],
    tempo: 2420,
  },
  {
    label: 'Magnetic columns morphing through a spreadsheet, pyramid, wave, and grid',
    offset: 0.56,
    sequence: ['columns', 'spreadsheet', 'pyramid', 'wave', 'grid'],
    tempo: 2340,
  },
  {
    label: 'Magnetic pyramid morphing through a cube, diamond, sphere, and cloud',
    offset: 0.64,
    sequence: ['pyramid', 'cube', 'diamond', 'sphere', 'cloud'],
    tempo: 2500,
  },
  {
    label: 'Magnetic diamond morphing through a helix, pyramid, cube, and loader',
    offset: 0.72,
    sequence: ['diamond', 'helix', 'pyramid', 'cube', 'loader'],
    tempo: 2260,
  },
  {
    label: 'Magnetic helix morphing through a sphere, wave, cloud, and check',
    offset: 0.8,
    sequence: ['helix', 'sphere', 'wave', 'cloud', 'check'],
    tempo: 2440,
  },
  {
    label: 'Magnetic wave morphing through a loader, grid, columns, and sphere',
    offset: 0.88,
    sequence: ['wave', 'loader', 'grid', 'columns', 'sphere'],
    tempo: 2300,
  },
];

function shortestDelta(index: number, selectedIndex: number) {
  const total = STUDIES.length;
  let delta = (index - selectedIndex + total) % total;
  if (delta > total / 2) delta -= total;
  return delta;
}

function carouselStyle(index: number, selectedIndex: number): CarouselStyle {
  const delta = shortestDelta(index, selectedIndex);
  const distance = Math.abs(delta);
  const hidden = distance > 3;
  const opacity = hidden ? 0 : [1, 0.7, 0.24, 0.055][distance];
  const scale = [1.56, 1, 0.78, 0.62][Math.min(distance, 3)];
  const x = Math.sign(delta) * Math.pow(distance, 0.82) * 154;
  const y = distance === 0 ? 0 : 68 + Math.pow(distance, 1.58) * 44;

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

function ExperienceControls({
  displayMode,
  onDisplayModeChange,
  onThemeChange,
  theme,
}: {
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onThemeChange: () => void;
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

function MorphStudy({
  displayMode,
  index,
  onSelect,
  selected,
  study,
  style,
  theme,
}: {
  displayMode: DisplayMode;
  index: number;
  onSelect: () => void;
  selected: boolean;
  study: Study;
  style?: CarouselStyle;
  theme: MagneticTheme;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MagneticMorphEngine | null>(null);
  const initialTheme = useRef(theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new MagneticMorphEngine(canvas, {
      offset: study.offset,
      sequence: study.sequence,
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
  const [displayMode, setDisplayMode] = useState<DisplayMode>('carousel');
  const [selectedIndex, setSelectedIndex] = useState(8);

  const selectRelative = useCallback((step: number) => {
    setSelectedIndex((current) => (current + step + STUDIES.length) % STUDIES.length);
  }, []);

  useEffect(() => {
    if (displayMode !== 'carousel' || shouldReduceMotion) return;
    const autoplay = window.setTimeout(() => selectRelative(1), AUTOPLAY_MS);
    return () => window.clearTimeout(autoplay);
  }, [displayMode, selectRelative, selectedIndex, shouldReduceMotion]);

  const selectedName = STUDIES[selectedIndex].sequence[0].toUpperCase();

  return (
    <main className={`morph-experience theme--${theme} view--${displayMode}`}>
      <ExperienceControls
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        onThemeChange={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
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
            displayMode={displayMode}
            index={index}
            onSelect={() => {
              setSelectedIndex(index);
              if (displayMode === 'grid') setDisplayMode('carousel');
            }}
            selected={index === selectedIndex}
            study={study}
            style={displayMode === 'carousel' ? carouselStyle(index, selectedIndex) : undefined}
            theme={theme}
          />
        ))}

        {displayMode === 'carousel' ? (
          <p className="carousel-caption" aria-live="polite">
            Magnetic {selectedName}
          </p>
        ) : null}
      </section>
    </main>
  );
}
