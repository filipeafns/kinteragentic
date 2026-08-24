type AgentScene = 'agent' | 'globe' | 'checklist' | 'wave' | 'pyramid';

type Target = {
  alpha: number;
  size: number;
  x: number;
  y: number;
  z: number;
};

type Particle = Target & {
  activation: number;
  alphaVelocity: number;
  hold: Target;
  mass: number;
  seed: number;
  sizeVelocity: number;
  slot: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
};

type SceneStep = {
  duration: number;
  scene: AgentScene;
};

const PARTICLE_COUNT = 64;
const EYE_PARTICLE_COUNT = 20;
const FOREGROUND_PARTICLE_COUNT = 48;
const LOGICAL_SIZE = 100;
const CENTER = LOGICAL_SIZE / 2;
const SPHERE_RADIUS = 31;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;
const REPEL_RADIUS = 18;
const REPEL_FORCE = 680;

const SEQUENCE: SceneStep[] = [
  { scene: 'agent', duration: 10_400 },
  { scene: 'globe', duration: 2_400 },
  { scene: 'checklist', duration: 4_200 },
  { scene: 'globe', duration: 2_500 },
  { scene: 'wave', duration: 4_200 },
  { scene: 'globe', duration: 2_500 },
  { scene: 'pyramid', duration: 4_200 },
  { scene: 'globe', duration: 2_500 },
];

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

const ease = (value: number) => {
  const normalized = clamp(value, 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};

const hash = (value: number) => {
  const result = Math.sin(value * 91.3458 + 17.234) * 47453.5453;
  return result - Math.floor(result);
};

function mixTarget(from: Target, to: Target, amount: number): Target {
  const progress = ease(amount);
  return {
    alpha: mix(from.alpha, to.alpha, progress),
    size: mix(from.size, to.size, progress),
    x: mix(from.x, to.x, progress),
    y: mix(from.y, to.y, progress),
    z: mix(from.z, to.z, progress),
  };
}

function spherePoint(
  index: number,
  count: number,
  phase: number,
  radius = SPHERE_RADIUS,
): Target {
  const normalizedY = 1 - (index / Math.max(1, count - 1)) * 2;
  const ringRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
  const angle = index * GOLDEN_ANGLE + phase;
  const x3d = Math.cos(angle) * ringRadius * radius;
  const y3d = normalizedY * radius;
  const z3d = Math.sin(angle) * ringRadius * radius;
  const perspective = 1 + (z3d / Math.max(radius, 1)) * 0.085;
  const x = x3d * perspective;
  const y = y3d * perspective;
  const edge = clamp(Math.hypot(x, y) / Math.max(radius, 1), 0, 1);
  const depth = clamp((z3d / Math.max(radius, 1) + 1) * 0.5, 0, 1);

  return {
    alpha: 0.3 + depth * 0.7,
    size: 0.68 + Math.pow(edge, 1.55) * 1.72,
    x,
    y,
    z: z3d,
  };
}

function globeTargets(absoluteTime: number, scale = 1): Target[] {
  const phase = absoluteTime * 0.58;
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const point = spherePoint(index, PARTICLE_COUNT, phase);
    return {
      ...point,
      size: point.size * mix(0.7, 1, scale),
      x: point.x * scale,
      y: point.y * scale,
      z: point.z * scale,
    };
  });
}

function blinkAmount(localTime: number) {
  const cycle = localTime % 4;
  if (cycle < 3.2) return 0;
  return Math.sin(((cycle - 3.2) / 0.8) * Math.PI);
}

function agentTargets(
  absoluteTime: number,
  localTime: number,
  gazeX: number,
  gazeY: number,
): Target[] {
  const globe = globeTargets(absoluteTime);
  const blink = blinkAmount(localTime);
  const orbit = absoluteTime * 0.72 + gazeX * 0.18;
  const normalX = Math.sin(orbit);
  const normalZ = Math.cos(orbit);
  const tangentX = Math.cos(orbit);
  const tangentZ = -Math.sin(orbit);

  return globe.map((globeTarget, index) => {
    if (index >= EYE_PARTICLE_COUNT) return globeTarget;

    const eye = index < EYE_PARTICLE_COUNT / 2 ? 0 : 1;
    const localIndex = index % (EYE_PARTICLE_COUNT / 2);
    const row = Math.floor(localIndex / 2);
    const column = localIndex % 2;
    const localY = (row - 2) * 2.45;
    const ovalWidth = 1.18 * Math.sqrt(Math.max(0.16, 1 - Math.pow(localY / 6.2, 2)));
    const localX = (column === 0 ? -1 : 1) * ovalWidth;
    const tangentOffset = (eye === 0 ? -6.25 : 6.25) + localX;
    const curvature = (tangentOffset * tangentOffset + localY * localY) / (SPHERE_RADIUS * 2);
    const radial = SPHERE_RADIUS - curvature;
    const z = normalZ * radial + tangentZ * tangentOffset;
    const depth = clamp((z / SPHERE_RADIUS + 1) * 0.5, 0, 1);
    const perspective = 1 + (z / SPHERE_RADIUS) * 0.085;
    const eyeTarget: Target = {
      alpha: 0.3 + depth * 0.7,
      size: 2.34 * mix(0.78, 1.08, depth),
      x: (normalX * radial + tangentX * tangentOffset) * perspective,
      y: (localY + gazeY * 1.2) * perspective,
      z,
    };

    return mixTarget(eyeTarget, globeTarget, blink);
  });
}

function coreTargets(absoluteTime: number): Target[] {
  return Array.from(
    { length: PARTICLE_COUNT - FOREGROUND_PARTICLE_COUNT },
    (_, index) => {
      const point = spherePoint(index, PARTICLE_COUNT - FOREGROUND_PARTICLE_COUNT, absoluteTime * 0.72, 7.4);
      return {
        ...point,
        alpha: 0.3,
        size: point.size * 0.62,
        z: point.z - 19,
      };
    },
  );
}

function checklistTargets(absoluteTime: number): Target[] {
  const foreground = Array.from({ length: FOREGROUND_PARTICLE_COUNT }, (_, index) => {
    const row = Math.floor(index / 16);
    const localIndex = index % 16;
    const rowY = -14 + row * 14;

    if (localIndex < 6) {
      const path = [
        { x: -21, y: rowY },
        { x: -18.8, y: rowY + 2.4 },
        { x: -14.5, y: rowY - 3.3 },
      ];
      const segment = localIndex < 3 ? 0 : 1;
      const segmentIndex = localIndex % 3;
      const progress = segmentIndex / 2;
      const from = path[segment];
      const to = path[segment + 1];
      return {
        alpha: 1,
        size: 1.45 - Math.abs(segmentIndex - 1) * 0.15,
        x: mix(from.x, to.x, progress),
        y: mix(from.y, to.y, progress),
        z: 10,
      };
    }

    const lineIndex = localIndex - 6;
    const progress = lineIndex / 9;
    return {
      alpha: 1,
      size: 0.72 + Math.pow(Math.abs(progress - 0.5) * 2, 1.25) * 0.62,
      x: -7 + progress * 29,
      y: rowY + Math.sin(absoluteTime * 0.55 + row) * 0.25,
      z: 10,
    };
  });

  return [...foreground, ...coreTargets(absoluteTime)];
}

function waveTargets(absoluteTime: number): Target[] {
  const foreground = Array.from({ length: FOREGROUND_PARTICLE_COUNT }, (_, index) => {
    const lane = Math.floor(index / 16);
    const localIndex = index % 16;
    const progress = localIndex / 15;
    const x = -25 + progress * 50;
    const wave = Math.sin(progress * TAU * 1.35 + absoluteTime * 1.05 + lane * 0.7);
    const edge = Math.abs(progress - 0.5) * 2;
    return {
      alpha: 1,
      size: 0.62 + Math.pow(edge, 1.35) * 1.25,
      x,
      y: (lane - 1) * 8 + wave * 5.2,
      z: 10 + wave * 1.5,
    };
  });

  return [...foreground, ...coreTargets(absoluteTime)];
}

const PYRAMID_EDGES: Array<[number, number, number, number, number, number]> = [
  [0, -1.25, 0, -1, 0.75, -1],
  [0, -1.25, 0, 1, 0.75, -1],
  [0, -1.25, 0, 1, 0.75, 1],
  [0, -1.25, 0, -1, 0.75, 1],
  [-1, 0.75, -1, 1, 0.75, -1],
  [1, 0.75, -1, 1, 0.75, 1],
  [1, 0.75, 1, -1, 0.75, 1],
  [-1, 0.75, 1, -1, 0.75, -1],
];

function pyramidTargets(absoluteTime: number): Target[] {
  const rotation = absoluteTime * 0.42;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const foreground = Array.from({ length: FOREGROUND_PARTICLE_COUNT }, (_, index) => {
    const edge = PYRAMID_EDGES[Math.floor(index / 6)];
    const progress = (index % 6) / 5;
    const x3d = mix(edge[0], edge[3], progress) * 18;
    const y3d = mix(edge[1], edge[4], progress) * 18;
    const z3d = mix(edge[2], edge[5], progress) * 18;
    const rotatedX = x3d * cosine + z3d * sine;
    const rotatedZ = -x3d * sine + z3d * cosine;
    const perspective = 1 + rotatedZ / 190;
    const edgeDistance = clamp(Math.hypot(rotatedX, y3d) / 30, 0, 1);
    return {
      alpha: 1,
      size: 0.72 + edgeDistance * 1.18,
      x: rotatedX * perspective,
      y: y3d * perspective + 3,
      z: rotatedZ + 10,
    };
  });

  return [...foreground, ...coreTargets(absoluteTime)];
}

function targetsFor(
  scene: AgentScene,
  absoluteTime: number,
  localTime: number,
  progress: number,
  gazeX: number,
  gazeY: number,
  sceneIndex: number,
): Target[] {
  switch (scene) {
    case 'agent':
      return agentTargets(absoluteTime, localTime, gazeX, gazeY);
    case 'globe': {
      const afterAgent = sceneIndex === 1;
      const scale = afterAgent
        ? mix(1, 0.38, ease(progress))
        : 0.38 + Math.sin(progress * Math.PI) * 0.62;
      return globeTargets(absoluteTime, scale);
    }
    case 'checklist':
      return checklistTargets(absoluteTime);
    case 'wave':
      return waveTargets(absoluteTime);
    case 'pyramid':
      return pyramidTargets(absoluteTime);
  }
}

function assignNearest(particles: Particle[], targets: Target[]) {
  const available = new Set(targets.map((_, index) => index));
  const ordered = [...particles].sort(
    (a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y),
  );

  for (const particle of ordered) {
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const targetIndex of available) {
      const target = targets[targetIndex];
      const distance =
        Math.pow(particle.x - target.x, 2) +
        Math.pow(particle.y - target.y, 2) +
        Math.abs(particle.size - target.size) * 4;
      if (distance < nearestDistance) {
        nearest = targetIndex;
        nearestDistance = distance;
      }
    }
    particle.slot = nearest;
    available.delete(nearest);
  }
}

export class UnifiedAgentEngine {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private frame = 0;
  private gaze = { targetX: 0, targetY: 0, x: 0, y: 0 };
  private lastTime = 0;
  private particles: Particle[];
  private prefersReducedMotion: MediaQueryList;
  private repel = { active: false, strength: 0, x: CENTER, y: CENTER };
  private resizeObserver: ResizeObserver;
  private sceneIndex = 0;
  private sceneStarted = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable.');

    this.canvas = canvas;
    this.context = context;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const firstTargets = agentTargets(this.sceneStarted * 0.001, 0, 0, 0);
    this.particles = firstTargets.map((target, index) => ({
      ...target,
      activation: 0,
      alphaVelocity: 0,
      hold: { ...target },
      mass: 0.78 + hash(index * 2.7) * 0.58,
      seed: hash(index * 5.13),
      sizeVelocity: 0,
      slot: index,
      velocityX: 0,
      velocityY: 0,
      velocityZ: 0,
    }));

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    canvas.addEventListener('pointermove', this.updateRepel, { passive: true });
    canvas.addEventListener('pointerleave', this.releaseRepel);
    canvas.addEventListener('pointercancel', this.releaseRepel);
    window.addEventListener('pointermove', this.updateGaze, { passive: true });
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointermove', this.updateRepel);
    this.canvas.removeEventListener('pointerleave', this.releaseRepel);
    this.canvas.removeEventListener('pointercancel', this.releaseRepel);
    window.removeEventListener('pointermove', this.updateGaze);
  }

  private resize = () => {
    const bounds = this.canvas.getBoundingClientRect();
    const cssSize = Math.max(1, Math.min(bounds.width || 360, bounds.height || 360));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const renderSize = Math.round(cssSize * dpr);
    if (this.canvas.width === renderSize && this.canvas.height === renderSize) return;
    this.canvas.width = renderSize;
    this.canvas.height = renderSize;
    const scale = renderSize / LOGICAL_SIZE;
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
    this.context.imageSmoothingEnabled = true;
  };

  private updateGaze = (event: PointerEvent) => {
    this.gaze.targetX = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
    this.gaze.targetY = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);
  };

  private updateRepel = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.repel.x = clamp(((event.clientX - bounds.left) / bounds.width) * LOGICAL_SIZE, 0, LOGICAL_SIZE);
    this.repel.y = clamp(((event.clientY - bounds.top) / bounds.height) * LOGICAL_SIZE, 0, LOGICAL_SIZE);
    this.repel.active = true;
  };

  private releaseRepel = () => {
    this.repel.active = false;
  };

  private beginScene(time: number) {
    this.sceneIndex = (this.sceneIndex + 1) % SEQUENCE.length;
    this.sceneStarted = time;
    const step = SEQUENCE[this.sceneIndex];
    const targets = targetsFor(step.scene, time * 0.001, 0, 0, this.gaze.x, this.gaze.y, this.sceneIndex);
    assignNearest(this.particles, targets);

    for (const particle of this.particles) {
      particle.activation = time + Math.pow(particle.seed, 1.55) * 240;
      particle.hold = {
        alpha: particle.alpha,
        size: particle.size,
        x: particle.x,
        y: particle.y,
        z: particle.z,
      };
      const target = targets[particle.slot];
      const dx = target.x - particle.x;
      const dy = target.y - particle.y;
      const distance = Math.hypot(dx, dy);
      const curl = (particle.seed > 0.5 ? 1 : -1) * Math.min(34, distance * 1.18);
      particle.velocityX += distance > 0.01 ? (-dy / distance) * curl : 0;
      particle.velocityY += distance > 0.01 ? (dx / distance) * curl : 0;
    }
  }

  private tick = (time: number) => {
    const delta = this.lastTime ? Math.min(1 / 30, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    const step = SEQUENCE[this.sceneIndex];
    const elapsed = time - this.sceneStarted;

    if (!this.prefersReducedMotion.matches) {
      if (elapsed >= step.duration) this.beginScene(time);
      this.update(time, delta);
    }

    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(time: number, delta: number) {
    const step = SEQUENCE[this.sceneIndex];
    const localMilliseconds = time - this.sceneStarted;
    const localTime = localMilliseconds * 0.001;
    const progress = clamp(localMilliseconds / step.duration, 0, 1);
    this.gaze.x += (this.gaze.targetX - this.gaze.x) * (1 - Math.exp(-5.5 * delta));
    this.gaze.y += (this.gaze.targetY - this.gaze.y) * (1 - Math.exp(-5.5 * delta));
    this.repel.strength +=
      ((this.repel.active ? 1 : 0) - this.repel.strength) * (1 - Math.exp(-14 * delta));

    const targets = targetsFor(
      step.scene,
      time * 0.001,
      localTime,
      progress,
      this.gaze.x,
      this.gaze.y,
      this.sceneIndex,
    );

    for (const particle of this.particles) {
      const target = targets[particle.slot];
      const active = time >= particle.activation;
      const destination = active ? target : particle.hold;
      const stiffness = (70 + particle.seed * 30) / particle.mass;
      const damping = Math.exp((-10.8 / particle.mass) * delta);
      particle.velocityX += (destination.x - particle.x) * stiffness * delta;
      particle.velocityY += (destination.y - particle.y) * stiffness * delta;
      particle.velocityZ += (destination.z - particle.z) * stiffness * delta;

      if (this.repel.strength > 0.001) {
        const screenX = CENTER + particle.x;
        const screenY = CENTER + particle.y;
        let repelX = screenX - this.repel.x;
        let repelY = screenY - this.repel.y;
        let distance = Math.hypot(repelX, repelY);
        if (distance < 0.001) {
          const angle = particle.seed * TAU;
          repelX = Math.cos(angle);
          repelY = Math.sin(angle);
          distance = 1;
        }
        if (distance < REPEL_RADIUS) {
          const proximity = 1 - distance / REPEL_RADIUS;
          const force =
            (REPEL_FORCE * proximity * proximity * this.repel.strength) / particle.mass;
          particle.velocityX += (repelX / distance) * force * delta;
          particle.velocityY += (repelY / distance) * force * delta;
        }
      }

      particle.velocityX *= damping;
      particle.velocityY *= damping;
      particle.velocityZ *= damping;
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;
      particle.z += particle.velocityZ * delta;

      particle.sizeVelocity += (destination.size - particle.size) * 86 * delta;
      particle.sizeVelocity *= Math.exp(-12 * delta);
      particle.size += particle.sizeVelocity * delta;

      particle.alphaVelocity += (destination.alpha - particle.alpha) * 82 * delta;
      particle.alphaVelocity *= Math.exp(-12 * delta);
      particle.alpha = clamp(particle.alpha + particle.alphaVelocity * delta, 0.3, 1);
    }
  }

  private draw() {
    const context = this.context;
    context.globalAlpha = 1;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

    const ordered = [...this.particles].sort((a, b) => a.z - b.z);
    context.fillStyle = '#000000';
    for (const particle of ordered) {
      context.globalAlpha = particle.alpha;
      context.beginPath();
      context.arc(
        CENTER + particle.x,
        CENTER + particle.y,
        clamp(particle.size, 0.36, 2.75),
        0,
        TAU,
      );
      context.fill();
    }
    context.globalAlpha = 1;
  }
}
