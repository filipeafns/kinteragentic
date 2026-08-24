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
    label: 'Magnetic loader morphing through a grid, cube, sphere, and cloud',
    offset: 0,
    sequence: ['loader', 'grid', 'cube', 'sphere', 'cloud'],
    tempo: 2320,
  },
  {
    label: 'Magnetic grid morphing through a sphere, cloud, loader, and cube',
    offset: 0.72,
    sequence: ['grid', 'sphere', 'cloud', 'loader', 'cube'],
    tempo: 2460,
  },
  {
    label: 'Magnetic cube morphing through a cloud, sphere, grid, and loader',
    offset: 1.48,
    sequence: ['cube', 'cloud', 'sphere', 'grid', 'loader'],
    tempo: 2240,
  },
  {
    label: 'Magnetic sphere morphing through a cube, loader, cloud, and grid',
    offset: 2.25,
    sequence: ['sphere', 'cube', 'loader', 'cloud', 'grid'],
    tempo: 2520,
  },
  {
    label: 'Magnetic cloud morphing through a loader, sphere, cube, and grid',
    offset: 3.08,
    sequence: ['cloud', 'loader', 'sphere', 'cube', 'grid'],
    tempo: 2380,
  },
  {
    label: 'Magnetic forms cycling from sphere to grid, cloud, cube, and loader',
    offset: 3.82,
    sequence: ['sphere', 'grid', 'cloud', 'cube', 'loader'],
    tempo: 2280,
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
