export type MagneticShape =
  | 'loader'
  | 'grid'
  | 'cube'
  | 'sphere'
  | 'cloud'
  | 'check'
  | 'spreadsheet'
  | 'columns'
  | 'pyramid'
  | 'diamond'
  | 'helix'
  | 'wave'
  | 'checklist'
  | 'agent-round'
  | 'agent-tall'
  | 'agent-long';

export type MagneticTheme = 'light' | 'dark';
export type MagneticSurface = 'page' | 'card';

type Vec3 = {
  size: number;
  tone: number;
  x: number;
  y: number;
  z: number;
};

type Particle = {
  activation: number;
  holdSize: number;
  holdTone: number;
  holdX: number;
  holdY: number;
  mass: number;
  seed: number;
  size: number;
  sizeVelocity: number;
  slot: number;
  tone: number;
  toneVelocity: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

type EngineOptions = {
  offset: number;
  scale: number;
  sequence: MagneticShape[];
  surface: MagneticSurface;
  tempo: number;
  theme: MagneticTheme;
  variant: number;
};

const PARTICLE_COUNT = 72;
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const BACKGROUNDS: Record<MagneticTheme, Record<MagneticSurface, string>> = {
  light: {
    page: '#FFFFFF',
    card: '#F6F6F6',
  },
  dark: {
    page: '#0A0506',
    card: '#141208',
  },
};
const PALETTES: Record<MagneticTheme, string[]> = {
  light: ['#323232', '#505050', '#747474', '#989898', '#b8b8b8'],
  dark: ['#D9FF2F', '#B8D929', '#91AA22', '#697B1B', '#424D13'],
};

const POINTER_GAZE = {
  lastMove: Number.NEGATIVE_INFINITY,
  x: 0,
  y: 0,
};
let gazeListenerCount = 0;

function updatePointerGaze(event: PointerEvent) {
  POINTER_GAZE.x = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
  POINTER_GAZE.y = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);
  POINTER_GAZE.lastMove = performance.now();
}

function acquirePointerGaze() {
  gazeListenerCount += 1;
  if (gazeListenerCount === 1) {
    window.addEventListener('pointermove', updatePointerGaze, { passive: true });
  }
}

function releasePointerGaze() {
  gazeListenerCount = Math.max(0, gazeListenerCount - 1);
  if (gazeListenerCount === 0) {
    window.removeEventListener('pointermove', updatePointerGaze);
  }
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const hash = (value: number) => {
  const result = Math.sin(value * 91.3458 + 17.234) * 47453.5453;
  return result - Math.floor(result);
};

const rotateX = (point: Vec3, angle: number): Vec3 => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    ...point,
    y: point.y * cosine - point.z * sine,
    z: point.y * sine + point.z * cosine,
  };
};

const rotateY = (point: Vec3, angle: number): Vec3 => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    ...point,
    x: point.x * cosine + point.z * sine,
    z: -point.x * sine + point.z * cosine,
  };
};

const project = (point: Vec3, perspective: number, displayScale: number): Vec3 => {
  const scale = perspective / (perspective - point.z);
  return {
    ...point,
    size: point.size * clamp(scale, 0.72, 1.32),
    tone: clamp(point.tone - point.z * 0.1, 0, 1),
    x: point.x * scale * displayScale,
    y: point.y * scale * displayScale,
  };
};

function loaderTargets(phase: number, variant: number): Vec3[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const angle = (index / PARTICLE_COUNT) * TAU + phase * (0.72 + variant * 0.025);
    const wave = 0.5 + 0.5 * Math.cos(angle - phase * 1.6);
    const radius = 10.7 + Math.sin(index * 1.71 + variant) * 0.34;
    return {
      size: 0.43 + Math.pow(wave, 2.6) * 0.62 + hash(index + variant * 11) * 0.08,
      tone: clamp(0.16 + (1 - wave) * 0.58, 0, 1),
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: 0,
    };
  });
}

function gridTargets(phase: number, variant: number): Vec3[] {
  const lean = Math.sin(phase * 0.52 + variant) * 0.035;
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const column = index % 9;
    const row = Math.floor(index / 9);
    const x = (column - 4) * 2.62;
    const y = (row - 3.5) * 2.62;
    return {
      size: 0.5 + hash(index * 1.37 + variant * 5) * 0.26,
      tone: 0.22 + ((row + column) % 4) * 0.12,
      x: x + y * lean,
      y: y - x * lean,
      z: 0,
    };
  });
}

const CUBE_EDGES: Array<[number, number, number, number, number, number]> = [
  [-1, -1, -1, 1, -1, -1],
  [-1, 1, -1, 1, 1, -1],
  [-1, -1, 1, 1, -1, 1],
  [-1, 1, 1, 1, 1, 1],
  [-1, -1, -1, -1, 1, -1],
  [1, -1, -1, 1, 1, -1],
  [-1, -1, 1, -1, 1, 1],
  [1, -1, 1, 1, 1, 1],
  [-1, -1, -1, -1, -1, 1],
  [1, -1, -1, 1, -1, 1],
  [-1, 1, -1, -1, 1, 1],
  [1, 1, -1, 1, 1, 1],
];

function cubeTargets(phase: number, variant: number): Vec3[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const edge = CUBE_EDGES[Math.floor(index / 6)];
    const progress = (index % 6) / 5;
    let point: Vec3 = {
      size: 0.55 + hash(index + variant * 7) * 0.24,
      tone: 0.38,
      x: edge[0] + (edge[3] - edge[0]) * progress,
      y: edge[1] + (edge[4] - edge[1]) * progress,
      z: edge[2] + (edge[5] - edge[2]) * progress,
    };
    point = rotateY(point, phase * 0.58 + variant * 0.3);
    point = rotateX(point, -0.52 + Math.sin(phase * 0.24 + variant) * 0.14);
    return project(point, 4.3, 7.7);
  });
}

function sphereTargets(phase: number, variant: number): Vec3[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const y = 1 - (index / (PARTICLE_COUNT - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * GOLDEN_ANGLE + variant * 0.16;
    let point: Vec3 = {
      size: 0.44 + hash(index * 2.11 + variant * 17) * 0.28,
      tone: 0.42,
      x: Math.cos(angle) * radius,
      y,
      z: Math.sin(angle) * radius,
    };
    point = rotateY(point, phase * 0.66 + variant * 0.22);
    point = rotateX(point, Math.sin(phase * 0.18 + variant) * 0.16);
    return project(point, 4.7, 10.2);
  });
}

function cloudTargets(phase: number, variant: number): Vec3[] {
  const centers = [
    { x: -4.4, y: 0.9 },
    { x: 3.7, y: -1.4 },
    { x: 0.7, y: 3.1 },
  ];
  const perLobe = PARTICLE_COUNT / centers.length;

  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const lobe = index % centers.length;
    const localIndex = Math.floor(index / centers.length);
    const radius = Math.sqrt((localIndex + 0.55) / perLobe);
    const angle = localIndex * GOLDEN_ANGLE + lobe * 1.7 + variant * 0.3;
    const breathing = 1 + Math.sin(phase * 0.74 + lobe * 1.9 + variant) * 0.09;
    const center = centers[lobe];
    const x = center.x + Math.cos(angle) * radius * (7.1 + lobe * 0.35) * breathing;
    const y = center.y + Math.sin(angle) * radius * (5.7 + (2 - lobe) * 0.42) / breathing;
    const rotation = Math.sin(phase * 0.31 + variant) * 0.13;
    return {
      size: 0.44 + hash(index * 3.43 + variant * 23) * 0.52,
      tone: 0.28 + hash(index * 0.77 + variant) * 0.45,
      x: x * Math.cos(rotation) - y * Math.sin(rotation),
      y: x * Math.sin(rotation) + y * Math.cos(rotation),
      z: Math.sin(angle * 1.7 + phase * 0.5) * 0.55,
    };
  });
}

function checkTargets(phase: number, variant: number): Vec3[] {
  const rotation = Math.sin(phase * 0.22 + variant) * 0.025;
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const firstSegment = index < 28;
    const localIndex = firstSegment ? index : index - 28;
    const samples = firstSegment ? 14 : 22;
    const step = Math.floor(localIndex / 2);
    const lane = localIndex % 2 === 0 ? -1 : 1;
    const progress = step / (samples - 1);
    const start = firstSegment ? { x: -10.5, y: -0.6 } : { x: -3.1, y: 6.7 };
    const end = firstSegment ? { x: -3.1, y: 6.7 } : { x: 11.2, y: -8.7 };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const x = start.x + dx * progress + (-dy / length) * lane * 0.31;
    const y = start.y + dy * progress + (dx / length) * lane * 0.31;
    return {
      size: 0.48 + hash(index * 1.91 + variant * 9) * 0.26,
      tone: 0.2 + hash(index * 0.67 + variant) * 0.24,
      x: x * Math.cos(rotation) - y * Math.sin(rotation),
      y: x * Math.sin(rotation) + y * Math.cos(rotation),
      z: 0,
    };
  });
}

function spreadsheetTargets(phase: number, variant: number): Vec3[] {
  const drift = Math.sin(phase * 0.3 + variant) * 0.08;
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    if (index < 36) {
      const row = Math.floor(index / 9);
      const columnPoint = index % 9;
      return {
        size: 0.45 + hash(index + variant * 13) * 0.18,
        tone: row === 0 ? 0.16 : 0.4 + (columnPoint % 3) * 0.08,
        x: -10.5 + (columnPoint / 8) * 21,
        y: -8.25 + (row / 3) * 16.5 + drift,
        z: 0,
      };
    }

    const localIndex = index - 36;
    const column = Math.floor(localIndex / 6);
    const rowPoint = localIndex % 6;
    return {
      size: 0.45 + hash(index + variant * 13) * 0.18,
      tone: column === 0 ? 0.2 : 0.46 + (rowPoint % 2) * 0.08,
      x: -10.5 + (column / 5) * 21,
      y: -8.25 + (rowPoint / 5) * 16.5 + drift,
      z: 0,
    };
  });
}

function columnTargets(phase: number, variant: number): Vec3[] {
  const heights = [0.48, 0.82, 0.62, 1, 0.7, 0.9];
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const column = index % 6;
    const level = Math.floor(index / 6);
    const breathing = 1 + Math.sin(phase * 0.56 + column * 0.72 + variant) * 0.018;
    const height = heights[column] * breathing;
    return {
      size: 0.53 + hash(index * 2.27 + variant * 15) * 0.22,
      tone: 0.18 + column * 0.085,
      x: -10.25 + column * 4.1,
      y: 9.4 - (level / 11) * height * 18.8,
      z: 0,
    };
  });
}

const PYRAMID_EDGES: Array<[number, number, number, number, number, number]> = [
  [0, -1.25, 0, -1, 0.9, -1],
  [0, -1.25, 0, 1, 0.9, -1],
  [0, -1.25, 0, 1, 0.9, 1],
  [0, -1.25, 0, -1, 0.9, 1],
  [-1, 0.9, -1, 1, 0.9, -1],
  [1, 0.9, -1, 1, 0.9, 1],
  [1, 0.9, 1, -1, 0.9, 1],
  [-1, 0.9, 1, -1, 0.9, -1],
];

function pyramidTargets(phase: number, variant: number): Vec3[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const edge = PYRAMID_EDGES[Math.floor(index / 9)];
    const progress = (index % 9) / 8;
    let point: Vec3 = {
      size: 0.49 + hash(index * 1.49 + variant * 19) * 0.25,
      tone: 0.34,
      x: edge[0] + (edge[3] - edge[0]) * progress,
      y: edge[1] + (edge[4] - edge[1]) * progress,
      z: edge[2] + (edge[5] - edge[2]) * progress,
    };
    point = rotateY(point, phase * 0.55 + variant * 0.24);
    point = rotateX(point, -0.18 + Math.sin(phase * 0.2 + variant) * 0.08);
    return project(point, 4.5, 8.4);
  });
}

const DIAMOND_EDGES: Array<[number, number, number, number, number, number]> = [
  [0, -1.25, 0, -1, 0, 0],
  [0, -1.25, 0, 0, 0, -1],
  [0, -1.25, 0, 1, 0, 0],
  [0, -1.25, 0, 0, 0, 1],
  [0, 1.25, 0, -1, 0, 0],
  [0, 1.25, 0, 0, 0, -1],
  [0, 1.25, 0, 1, 0, 0],
  [0, 1.25, 0, 0, 0, 1],
  [-1, 0, 0, 0, 0, -1],
  [0, 0, -1, 1, 0, 0],
  [1, 0, 0, 0, 0, 1],
  [0, 0, 1, -1, 0, 0],
];

function diamondTargets(phase: number, variant: number): Vec3[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const edge = DIAMOND_EDGES[Math.floor(index / 6)];
    const progress = (index % 6) / 5;
    let point: Vec3 = {
      size: 0.48 + hash(index * 2.73 + variant * 7) * 0.28,
      tone: 0.36,
      x: edge[0] + (edge[3] - edge[0]) * progress,
      y: edge[1] + (edge[4] - edge[1]) * progress,
      z: edge[2] + (edge[5] - edge[2]) * progress,
    };
    point = rotateY(point, phase * 0.62 + variant * 0.31);
    point = rotateX(point, -0.14 + Math.sin(phase * 0.26 + variant) * 0.1);
    return project(point, 4.6, 8.6);
  });
}

function helixTargets(phase: number, variant: number): Vec3[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const strand = Math.floor(index / 36);
    const localIndex = index % 36;
    const progress = localIndex / 35;
    const angle = progress * Math.PI * 3.8 + strand * Math.PI + phase * 0.72 + variant * 0.2;
    const point: Vec3 = {
      size: 0.46 + hash(index * 3.03 + variant * 5) * 0.25,
      tone: strand === 0 ? 0.28 : 0.52,
      x: Math.cos(angle),
      y: (progress - 0.5) * 2.35,
      z: Math.sin(angle),
    };
    return project(point, 5.2, 7.6);
  });
}

function waveTargets(phase: number, variant: number): Vec3[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const lane = Math.floor(index / 24);
    const localIndex = index % 24;
    const progress = localIndex / 23;
    const x = -10.8 + progress * 21.6;
    const y =
      (lane - 1) * 5.15 +
      Math.sin(progress * TAU * 1.45 + phase * 0.78 + lane * 0.72 + variant * 0.18) * 2.05;
    return {
      size: 0.45 + hash(index * 2.19 + variant * 21) * 0.3,
      tone: 0.24 + lane * 0.2,
      x,
      y,
      z: 0,
    };
  });
}

function checklistTargets(phase: number, variant: number): Vec3[] {
  const sway = Math.sin(phase * 0.34 + variant) * 0.08;

  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const row = Math.floor(index / 24);
    const localIndex = index % 24;
    const rowY = -7 + row * 7;

    if (localIndex < 10) {
      const progress = (localIndex / 10) * 4;
      const side = Math.floor(progress);
      const sideProgress = progress - side;
      const points = [
        { x: -10.7 + sideProgress * 4, y: rowY - 2 },
        { x: -6.7, y: rowY - 2 + sideProgress * 4 },
        { x: -6.7 - sideProgress * 4, y: rowY + 2 },
        { x: -10.7, y: rowY + 2 - sideProgress * 4 },
      ];
      const point = points[Math.min(side, 3)];
      return {
        size: 0.48 + hash(index + variant * 7) * 0.18,
        tone: 0.2,
        x: point.x,
        y: point.y + sway,
        z: 0,
      };
    }

    if (localIndex < 16) {
      const checkIndex = localIndex - 10;
      const firstStroke = checkIndex < 3;
      const progress = firstStroke ? checkIndex / 2 : (checkIndex - 3) / 2;
      return {
        size: 0.52 + hash(index + variant * 11) * 0.15,
        tone: 0.08,
        x: firstStroke ? -10 + progress * 1.35 : -8.65 + progress * 2.5,
        y: firstStroke ? rowY + progress * 1.25 : rowY + 1.25 - progress * 2.8 + sway,
        z: 0,
      };
    }

    const lineIndex = localIndex - 16;
    return {
      size: 0.46 + hash(index * 1.9 + variant * 13) * 0.16,
      tone: 0.38 + row * 0.1,
      x: -2.7 + (lineIndex / 7) * 13.2,
      y: rowY + sway,
      z: 0,
    };
  });
}

function agentEyeTargets(
  phase: number,
  variant: number,
  mode: 'agent-round' | 'agent-tall' | 'agent-long',
): Vec3[] {
  const dimensions = {
    'agent-round': { x: 2.35, y: 2.35 },
    'agent-tall': { x: 1.2, y: 3.5 },
    'agent-long': { x: 3.5, y: 1.2 },
  }[mode];
  const pointerFresh = performance.now() - POINTER_GAZE.lastMove < 2400;
  const automaticX = Math.sin(phase * 1.18 + variant * 0.73);
  const automaticY = Math.sin(phase * 0.61 + variant * 1.11) * 0.38;
  const gazeX = (pointerFresh ? POINTER_GAZE.x : automaticX) * 1.9;
  const gazeY = (pointerFresh ? POINTER_GAZE.y : automaticY) * 0.84;
  const blinkSignal = Math.max(0, (Math.cos(phase * 1.8 + variant * 1.37) - 0.955) / 0.045);
  const eyeHeight = dimensions.y * (1 - Math.min(1, blinkSignal) * 0.84);

  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    if (index < 20) {
      const eye = index < 10 ? 0 : 1;
      const localIndex = index % 10;
      const radius = Math.pow((localIndex + 0.55) / 10, 1.35);
      const angle = localIndex * GOLDEN_ANGLE + eye * 0.24;
      return {
        size: 0.46 + hash(index * 2.17 + variant * 19) * 0.2,
        tone: 0.01 + hash(index + variant) * 0.055,
        x: (eye === 0 ? -4.65 : 4.65) + gazeX + Math.cos(angle) * radius * dimensions.x,
        y: gazeY + Math.sin(angle) * radius * eyeHeight,
        z: 0,
      };
    }

    if (index < 50) {
      const localIndex = index - 20;
      const radius = Math.pow((localIndex + 0.7) / 30, 1.5);
      const angle = localIndex * GOLDEN_ANGLE + variant * 0.31 + phase * 0.045;
      return {
        size: 0.28 + hash(index * 2.73 + variant * 17) * 0.28,
        tone: 0.58 + hash(index * 0.83 + variant) * 0.3,
        x: Math.cos(angle) * radius * 8.9,
        y: Math.sin(angle) * radius * 6.9,
        z: 0,
      };
    }

    const localIndex = index - 50;
    const angle = (localIndex / 22) * TAU + phase * 0.045;
    const pulse = 1 + Math.sin(phase * 0.64 + localIndex * 0.39 + variant) * 0.025;
    return {
      size: 0.34 + hash(index * 3.13 + variant * 29) * 0.26,
      tone: 0.38 + hash(index * 0.91 + variant) * 0.34,
      x: Math.cos(angle) * 11.25 * pulse,
      y: Math.sin(angle) * 9.35 / pulse,
      z: 0,
    };
  });
}

function targetsFor(shape: MagneticShape, phase: number, variant: number): Vec3[] {
  switch (shape) {
    case 'loader':
      return loaderTargets(phase, variant);
    case 'grid':
      return gridTargets(phase, variant);
    case 'cube':
      return cubeTargets(phase, variant);
    case 'sphere':
      return sphereTargets(phase, variant);
    case 'cloud':
      return cloudTargets(phase, variant);
    case 'check':
      return checkTargets(phase, variant);
    case 'spreadsheet':
      return spreadsheetTargets(phase, variant);
    case 'columns':
      return columnTargets(phase, variant);
    case 'pyramid':
      return pyramidTargets(phase, variant);
    case 'diamond':
      return diamondTargets(phase, variant);
    case 'helix':
      return helixTargets(phase, variant);
    case 'wave':
      return waveTargets(phase, variant);
    case 'checklist':
      return checklistTargets(phase, variant);
    case 'agent-round':
    case 'agent-tall':
    case 'agent-long':
      return agentEyeTargets(phase, variant, shape);
  }
}

function assignNearest(particles: Particle[], targets: Vec3[]) {
  const available = new Set(targets.map((_, index) => index));
  const ordered = [...particles].sort(
    (a, b) => Math.hypot(b.x - 20, b.y - 20) - Math.hypot(a.x - 20, a.y - 20),
  );

  for (const particle of ordered) {
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const targetIndex of available) {
      const target = targets[targetIndex];
      const dx = particle.x - (20 + target.x);
      const dy = particle.y - (20 + target.y);
      const distance = dx * dx + dy * dy + Math.abs(particle.size - target.size) * 3;
      if (distance < nearestDistance) {
        nearest = targetIndex;
        nearestDistance = distance;
      }
    }
    particle.slot = nearest;
    available.delete(nearest);
  }
}

export class MagneticMorphEngine {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private detailScale: number;
  private frame = 0;
  private lastTime = 0;
  private options: EngineOptions;
  private particles: Particle[];
  private prefersReducedMotion: MediaQueryList;
  private resizeObserver: ResizeObserver;
  private shapeIndex = 0;
  private shapeStarted = 0;
  private surface: MagneticSurface;
  private theme: MagneticTheme;

  constructor(canvas: HTMLCanvasElement, options: EngineOptions) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable.');

    this.canvas = canvas;
    this.context = context;
    this.detailScale = options.scale;
    this.options = options;
    this.surface = options.surface;
    this.theme = options.theme;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.shapeIndex = Math.floor(options.offset) % options.sequence.length;
    const firstShape = options.sequence[this.shapeIndex];
    const firstTargets = targetsFor(firstShape, options.offset, options.variant);
    this.particles = firstTargets.map((target, index) => ({
      activation: 0,
      holdSize: target.size,
      holdTone: target.tone,
      holdX: 20 + target.x,
      holdY: 20 + target.y,
      mass: 0.76 + hash(index + options.variant * 31) * 0.62,
      seed: hash(index * 4.31 + options.variant * 37),
      size: target.size,
      sizeVelocity: 0,
      slot: index,
      tone: target.tone,
      toneVelocity: 0,
      velocityX: 0,
      velocityY: 0,
      x: 20 + target.x,
      y: 20 + target.y,
    }));

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    acquirePointerGaze();
    this.resize();
    this.shapeStarted = performance.now() - (options.offset % 1) * options.tempo;
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    releasePointerGaze();
  }

  setScale(scale: number) {
    this.detailScale = scale;
    this.resize();
    this.draw();
  }

  setTheme(theme: MagneticTheme) {
    this.theme = theme;
    this.draw();
  }

  setSurface(surface: MagneticSurface) {
    this.surface = surface;
    this.draw();
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const renderScale = dpr * this.detailScale;
    const width = Math.round(40 * renderScale);
    if (this.canvas.width === width && this.canvas.height === width) return;
    this.canvas.width = width;
    this.canvas.height = width;
    this.context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    this.context.imageSmoothingEnabled = true;
  };

  private beginShape(time: number) {
    this.shapeIndex = (this.shapeIndex + 1) % this.options.sequence.length;
    this.shapeStarted = time;
    const targets = targetsFor(
      this.options.sequence[this.shapeIndex],
      time * 0.001,
      this.options.variant,
    );
    assignNearest(this.particles, targets);

    for (const particle of this.particles) {
      const target = targets[particle.slot];
      particle.activation = time + Math.pow(particle.seed, 1.65) * 210;
      particle.holdX = particle.x;
      particle.holdY = particle.y;
      particle.holdSize = particle.size;
      particle.holdTone = particle.tone;

      const dx = 20 + target.x - particle.x;
      const dy = 20 + target.y - particle.y;
      const distance = Math.hypot(dx, dy);
      const curl = (particle.seed > 0.5 ? 1 : -1) * Math.min(24, distance * 1.35);
      particle.velocityX += distance > 0.01 ? (-dy / distance) * curl : 0;
      particle.velocityY += distance > 0.01 ? (dx / distance) * curl : 0;
    }
  }

  private tick = (time: number) => {
    const delta = this.lastTime ? Math.min(1 / 30, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;

    if (!this.prefersReducedMotion.matches) {
      const currentShape = this.options.sequence[this.shapeIndex];
      const duration = currentShape.startsWith('agent-')
        ? this.options.tempo * 1.45
        : currentShape === 'checklist'
          ? this.options.tempo * 1.15
          : this.options.tempo;
      if (time - this.shapeStarted >= duration) this.beginShape(time);
      this.update(time, delta);
    }
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(time: number, delta: number) {
    const shape = this.options.sequence[this.shapeIndex];
    const targets = targetsFor(shape, time * 0.001, this.options.variant);

    for (const particle of this.particles) {
      const target = targets[particle.slot];
      const active = time >= particle.activation;
      const targetX = active ? 20 + target.x : particle.holdX;
      const targetY = active ? 20 + target.y : particle.holdY;
      const targetSize = active ? target.size : particle.holdSize;
      const targetTone = active ? target.tone : particle.holdTone;
      const stiffness = (86 + particle.seed * 34) / particle.mass;
      const damping = Math.exp((-12.2 / particle.mass) * delta);

      particle.velocityX += (targetX - particle.x) * stiffness * delta;
      particle.velocityY += (targetY - particle.y) * stiffness * delta;
      particle.velocityX *= damping;
      particle.velocityY *= damping;
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;

      particle.sizeVelocity += (targetSize - particle.size) * 104 * delta;
      particle.sizeVelocity *= Math.exp(-14 * delta);
      particle.size += particle.sizeVelocity * delta;

      particle.toneVelocity += (targetTone - particle.tone) * 92 * delta;
      particle.toneVelocity *= Math.exp(-13 * delta);
      particle.tone += particle.toneVelocity * delta;
    }
  }

  private draw() {
    const context = this.context;
    const palette = PALETTES[this.theme];
    context.fillStyle = BACKGROUNDS[this.theme][this.surface];
    context.fillRect(0, 0, 40, 40);

    const ordered = [...this.particles].sort((a, b) => a.size - b.size);
    for (const particle of ordered) {
      const paletteIndex = Math.round(clamp(particle.tone, 0, 1) * (palette.length - 1));
      const radius = clamp(particle.size, 0.38, 1.14);
      context.fillStyle = palette[paletteIndex];
      context.beginPath();
      context.arc(particle.x, particle.y, radius, 0, TAU);
      context.fill();
    }
  }
}
