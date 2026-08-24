export type MagneticShape = 'loader' | 'grid' | 'cube' | 'sphere' | 'cloud';

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
  sequence: MagneticShape[];
  tempo: number;
  variant: number;
};

const PARTICLE_COUNT = 72;
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const BACKGROUND = '#ffffff';
const PALETTE = ['#323232', '#505050', '#747474', '#989898', '#b8b8b8'];

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
  private frame = 0;
  private lastTime = 0;
  private options: EngineOptions;
  private particles: Particle[];
  private prefersReducedMotion: MediaQueryList;
  private resizeObserver: ResizeObserver;
  private shapeIndex = 0;
  private shapeStarted = 0;

  constructor(canvas: HTMLCanvasElement, options: EngineOptions) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable.');

    this.canvas = canvas;
    this.context = context;
    this.options = options;
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
    this.resize();
    this.shapeStarted = performance.now() - (options.offset % 1) * options.tempo;
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.round(40 * dpr);
    if (this.canvas.width === width && this.canvas.height === width) return;
    this.canvas.width = width;
    this.canvas.height = width;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      if (time - this.shapeStarted >= this.options.tempo) this.beginShape(time);
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
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, 40, 40);

    const ordered = [...this.particles].sort((a, b) => a.size - b.size);
    for (const particle of ordered) {
      const paletteIndex = Math.round(clamp(particle.tone, 0, 1) * (PALETTE.length - 1));
      const radius = clamp(particle.size, 0.38, 1.14);
      context.fillStyle = PALETTE[paletteIndex];
      context.beginPath();
      context.arc(particle.x, particle.y, radius, 0, TAU);
      context.fill();
    }
  }
}
