'use client';

import { useEffect, useRef } from 'react';
import {
  MagneticMorphEngine,
  type MagneticShape,
} from './magnetic-morph-engine';

type Study = {
  label: string;
  offset: number;
  sequence: MagneticShape[];
  tempo: number;
};

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

function MorphStudy({ study, index }: { index: number; study: Study }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new MagneticMorphEngine(canvas, {
      offset: study.offset,
      sequence: study.sequence,
      tempo: study.tempo,
      variant: index,
    });

    return () => engine.destroy();
  }, [index, study]);

  return (
    <figure className="morph-study">
      <canvas
        ref={canvasRef}
        aria-label={study.label}
        className="morph-canvas"
        height={120}
        role="img"
        width={120}
      />
    </figure>
  );
}

export function MorphGallery() {
  return (
    <section className="morph-gallery" aria-label="Magnetic morph studies">
      {STUDIES.map((study, index) => (
        <MorphStudy key={study.label} index={index} study={study} />
      ))}
    </section>
  );
}
