export type UnifiedAgentTheme = 'light' | 'dark';
export type UnifiedAgentDetail = 1 | 2 | 4;

type AgentScene = 'agent' | 'globe' | 'checklist' | 'wave' | 'pyramid';

type Target = {
  alpha: number;
  radiusX: number;
  radiusY: number;
  x: number;
  y: number;
  z: number;
};

type Node = Target & {
  activation: number;
  alphaVelocity: number;
  hold: Target;
  mass: number;
  radiusXVelocity: number;
  radiusYVelocity: number;
  seed: number;
  slot: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
};

const LOGICAL_SIZE = 100;
const CENTER = LOGICAL_SIZE / 2;
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const NODE_COUNT = 28;
const FOREGROUND_COUNT = 22;
const FACE_DURATION = 11_500;
const SHAPE_DURATION = 3_900;
const FACE_SPHERE_RADIUS = 42;
const REPEL_RADIUS = 13;
const REPEL_FORCE = 520;
const RANDOM_SHAPES: AgentScene[] = ['globe', 'checklist', 'wave', 'pyramid'];

const COLORS: Record<UnifiedAgentTheme, { background: string; particle: string }> = {
  light: { background: '#FFFFFF', particle: '#000000' },
  dark: { background: '#0A0506', particle: '#D9FF2F' },
};

// Directly mapped from the supplied reference. Coordinates use a 100 × 100 field.
const REFERENCE_RING: ReadonlyArray<readonly [number, number, number]> = [
  [41, 10, 4.05],
  [55, 10, 4.05],
  [23, 18, 4.05],
  [33, 20, 2.3],
  [46, 18, 2.3],
  [65, 18, 2.3],
  [75, 17, 4.05],
  [78, 27, 2.3],
  [13, 32, 4.05],
  [23, 30, 2.3],
  [86, 33, 4.05],
  [19, 44, 2.3],
  [81, 44, 2.3],
  [11, 51, 4.05],
  [89, 54, 4.05],
  [20, 60, 2.3],
  [79, 61, 2.3],
  [15, 68, 4.05],
  [84, 72, 4.05],
  [28, 76, 2.3],
  [72, 75, 2.3],
  [27, 84, 4.05],
  [38, 80, 2.3],
  [44, 86, 4.05],
  [58, 82, 2.3],
  [68, 84, 4.05],
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

function blinkAmount(localTime: number) {
  const blinkWindows: Array<[number, number]> = [
    [2.7, 3.2],
    [9.7, 10.2],
  ];
  for (const [start, end] of blinkWindows) {
    if (localTime >= start && localTime <= end) {
      return Math.sin(((localTime - start) / (end - start)) * Math.PI);
    }
  }
  return 0;
}

function orbitAngle(localTime: number) {
  const start = 4.1;
  const end = 9.45;
  const restingWobble = Math.sin(localTime * 0.62) * 0.07;
  if (localTime <= start) return restingWobble;
  if (localTime >= end) return Math.sin((localTime - end) * 0.72) * 0.055;
  return ease((localTime - start) / (end - start)) * TAU;
}

function eyeTargets(localTime: number, gazeY: number): Target[] {
  const rotation = orbitAngle(localTime);
  const blink = blinkAmount(localTime);
  const normalX = Math.sin(rotation);
  const normalZ = Math.cos(rotation);
  const tangentX = Math.cos(rotation);
  const tangentZ = -Math.sin(rotation);
  const faceDepth = 20;
  const front = clamp((normalZ + 1) * 0.5, 0, 1);
  const horizontalCompression = 0.2 + Math.abs(tangentX) * 0.8;

  return [-12.2, 12.2].map((offset): Target => ({
    alpha: 0.3 + front * 0.7,
    radiusX: 5.05 * horizontalCompression,
    radiusY: mix(12.35, 1.35, blink),
    x: normalX * faceDepth + tangentX * offset,
    y: -1 + gazeY * 0.65 + Math.sin(localTime * 0.76) * 0.35,
    z: normalZ * faceDepth + tangentZ * offset,
  }));
}

function avoidEyes(target: Target, eyes: Target[], index: number): Target {
  let x = target.x;
  let y = target.y;

  for (const eye of eyes) {
    if (eye.alpha < 0.54) continue;
    const exclusionX = eye.radiusX + target.radiusX + 5.4;
    const exclusionY = eye.radiusY + target.radiusY + 4.8;
    const dx = x - eye.x;
    const dy = y - eye.y;
    const normalizedX = dx / exclusionX;
    const normalizedY = dy / exclusionY;
    const distance = Math.hypot(normalizedX, normalizedY);
    if (distance >= 1) continue;

    const fallbackAngle = index * GOLDEN_ANGLE;
    const gradientX = dx / (exclusionX * exclusionX) || Math.cos(fallbackAngle);
    const gradientY = dy / (exclusionY * exclusionY) || Math.sin(fallbackAngle);
    const gradientLength = Math.max(0.001, Math.hypot(gradientX, gradientY));
    const normalX = gradientX / gradientLength;
    const normalY = gradientY / gradientLength;
    const strength = Math.pow(1 - distance, 1.7);
    x += (normalX - normalY * 0.32) * strength * 10.5;
    y += (normalY + normalX * 0.32) * strength * 10.5;
  }

  return { ...target, x, y };
}

function flowingRingTargets(localTime: number, eyes: Target[]): Target[] {
  const rotation = localTime * 0.255;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const wobbleEnvelope = ease(localTime / 1.15);

  return REFERENCE_RING.map(([mappedX, mappedY, mappedRadius], index): Target => {
    const baseX = mappedX - CENTER;
    const baseY = mappedY - CENTER;
    const baseZ = Math.sqrt(
      Math.max(0, FACE_SPHERE_RADIUS * FACE_SPHERE_RADIUS - baseX * baseX - baseY * baseY),
    );
    const rotatedX = baseX * cosine + baseZ * sine;
    const rotatedZ = -baseX * sine + baseZ * cosine;
    const depth = clamp((rotatedZ / FACE_SPHERE_RADIUS + 1) * 0.5, 0, 1);
    const perspective = 1 + (rotatedZ / FACE_SPHERE_RADIUS) * 0.065;
    const wobble = Math.sin(localTime * (0.72 + (index % 4) * 0.055) + index * 1.91);
    const x = rotatedX * perspective;
    const y = (baseY + wobble * 1.15 * wobbleEnvelope) * perspective;
    const edge = clamp(Math.hypot(x, y) / FACE_SPHERE_RADIUS, 0, 1);
    const radius = mappedRadius * (0.62 + edge * 0.38) * (0.94 + depth * 0.06);

    return avoidEyes(
      {
        alpha: 0.3 + depth * 0.7,
        radiusX: radius,
        radiusY: radius,
        x,
        y,
        z: rotatedZ,
      },
      eyes,
      index,
    );
  });
}

function referenceAgentTargets(localTime: number, gazeY: number): Target[] {
  const eyes = eyeTargets(localTime, gazeY);
  const ring = flowingRingTargets(localTime, eyes);

  return [...eyes, ...ring];
}

function globePoint(index: number, phase: number, radius = 34): Target {
  const normalizedY = 1 - (index / Math.max(1, NODE_COUNT - 1)) * 2;
  const ringRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
  const angle = index * GOLDEN_ANGLE + phase;
  const x3d = Math.cos(angle) * ringRadius * radius;
  const y3d = normalizedY * radius;
  const z3d = Math.sin(angle) * ringRadius * radius;
  const perspective = 1 + (z3d / radius) * 0.07;
  const x = x3d * perspective;
  const y = y3d * perspective;
  const edge = clamp(Math.hypot(x, y) / radius, 0, 1);
  const depth = clamp((z3d / radius + 1) * 0.5, 0, 1);
  const nodeRadius = 1.05 + Math.pow(edge, 1.5) * 2.5;
  return {
    alpha: 0.3 + depth * 0.7,
    radiusX: nodeRadius,
    radiusY: nodeRadius,
    x,
    y,
    z: z3d,
  };
}

function globeTargets(absoluteTime: number, scale: number): Target[] {
  return Array.from({ length: NODE_COUNT }, (_, index) => {
    const target = globePoint(index, absoluteTime * 0.5);
    const scaledRadius = target.radiusX * mix(0.72, 1, scale);
    return {
      ...target,
      radiusX: scaledRadius,
      radiusY: scaledRadius,
      x: target.x * scale,
      y: target.y * scale,
      z: target.z * scale,
    };
  });
}

function coreTargets(absoluteTime: number): Target[] {
  return Array.from({ length: NODE_COUNT - FOREGROUND_COUNT }, (_, index) => {
    const normalizedY = 1 - (index / (NODE_COUNT - FOREGROUND_COUNT - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
    const angle = index * GOLDEN_ANGLE + absoluteTime * 0.54;
    const edge = Math.hypot(Math.cos(angle) * ring, normalizedY);
    const radius = 0.72 + edge * 0.7;
    return {
      alpha: 0.3,
      radiusX: radius,
      radiusY: radius,
      x: Math.cos(angle) * ring * 6.5,
      y: normalizedY * 6.5,
      z: -18,
    };
  });
}

function checklistTargets(absoluteTime: number): Target[] {
  const foreground = Array.from({ length: FOREGROUND_COUNT }, (_, index) => {
    const row = Math.floor(index / 11);
    const localIndex = index % 11;
    const rowY = row === 0 ? -10 : 10;
    if (localIndex < 4) {
      const path = [
        { x: -22, y: rowY },
        { x: -18.5, y: rowY + 3 },
        { x: -13.8, y: rowY - 4 },
      ];
      const segment = localIndex < 2 ? 0 : 1;
      const progress = localIndex % 2;
      return {
        alpha: 1,
        radiusX: 1.55,
        radiusY: 1.55,
        x: mix(path[segment].x, path[segment + 1].x, progress),
        y: mix(path[segment].y, path[segment + 1].y, progress),
        z: 10,
      };
    }
    const progress = (localIndex - 4) / 6;
    const radius = 0.9 + Math.abs(progress - 0.5) * 0.7;
    return {
      alpha: 1,
      radiusX: radius,
      radiusY: radius,
      x: -5 + progress * 29,
      y: rowY + Math.sin(absoluteTime * 0.45 + row) * 0.18,
      z: 10,
    };
  });
  return [...foreground, ...coreTargets(absoluteTime)];
}

function waveTargets(absoluteTime: number): Target[] {
  const foreground = Array.from({ length: FOREGROUND_COUNT }, (_, index) => {
    const lane = Math.floor(index / 11);
    const localIndex = index % 11;
    const progress = localIndex / 10;
    const wave = Math.sin(progress * TAU * 1.25 + absoluteTime * 0.9 + lane * 0.85);
    const edge = Math.abs(progress - 0.5) * 2;
    const radius = 0.82 + Math.pow(edge, 1.35) * 1.45;
    return {
      alpha: 1,
      radiusX: radius,
      radiusY: radius,
      x: -26 + progress * 52,
      y: (lane === 0 ? -6 : 6) + wave * 5.2,
      z: 10 + wave,
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
  const rotation = absoluteTime * 0.34;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const foreground = Array.from({ length: FOREGROUND_COUNT }, (_, index) => {
    const edgeIndex = index % PYRAMID_EDGES.length;
    const sampleIndex = Math.floor(index / PYRAMID_EDGES.length);
    const samplesOnEdge = Math.ceil(FOREGROUND_COUNT / PYRAMID_EDGES.length);
    const progress = sampleIndex / Math.max(1, samplesOnEdge - 1);
    const edge = PYRAMID_EDGES[edgeIndex];
    const x3d = mix(edge[0], edge[3], progress) * 18;
    const y3d = mix(edge[1], edge[4], progress) * 18;
    const z3d = mix(edge[2], edge[5], progress) * 18;
    const rotatedX = x3d * cosine + z3d * sine;
    const rotatedZ = -x3d * sine + z3d * cosine;
    const perspective = 1 + rotatedZ / 190;
    const nodeRadius = 0.95 + clamp(Math.hypot(rotatedX, y3d) / 30, 0, 1) * 1.3;
    return {
      alpha: 1,
      radiusX: nodeRadius,
      radiusY: nodeRadius,
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
  gazeY: number,
): Target[] {
  switch (scene) {
    case 'agent':
      return referenceAgentTargets(localTime, gazeY);
    case 'globe':
      return globeTargets(absoluteTime, 1);
    case 'checklist':
      return checklistTargets(absoluteTime);
    case 'wave':
      return waveTargets(absoluteTime);
    case 'pyramid':
      return pyramidTargets(absoluteTime);
  }
}

function assignNearest(nodes: Node[], targets: Target[]) {
  const available = new Set(targets.map((_, index) => index));
  const ordered = [...nodes].sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y));
  for (const node of ordered) {
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const targetIndex of available) {
      const target = targets[targetIndex];
      const distance =
        Math.pow(node.x - target.x, 2) +
        Math.pow(node.y - target.y, 2) +
        Math.abs(node.radiusX - target.radiusX) * 3;
      if (distance < nearestDistance) {
        nearest = targetIndex;
        nearestDistance = distance;
      }
    }
    node.slot = nearest;
    available.delete(nearest);
  }
}

export class UnifiedAgentEngine {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private frame = 0;
  private gaze = { targetY: 0, y: 0 };
  private lastShape: AgentScene = 'globe';
  private lastTime = 0;
  private nodes: Node[];
  private prefersReducedMotion: MediaQueryList;
  private repel = { active: false, strength: 0, x: CENTER, y: CENTER };
  private resizeObserver: ResizeObserver;
  private scene: AgentScene = 'agent';
  private sceneStarted = performance.now();
  private theme: UnifiedAgentTheme;

  constructor(
    canvas: HTMLCanvasElement,
    options: { detail: UnifiedAgentDetail; theme: UnifiedAgentTheme },
  ) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable.');
    this.canvas = canvas;
    this.context = context;
    this.theme = options.theme;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const firstTargets = referenceAgentTargets(0, 0);
    this.nodes = firstTargets.map((target, index) => ({
      ...target,
      activation: 0,
      alphaVelocity: 0,
      hold: { ...target },
      mass: 0.88 + hash(index * 2.7) * 0.3,
      radiusXVelocity: 0,
      radiusYVelocity: 0,
      seed: hash(index * 5.13),
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

  setDetail(detail: UnifiedAgentDetail) {
    void detail;
    this.resize();
    this.draw();
  }

  setTheme(theme: UnifiedAgentTheme) {
    this.theme = theme;
    this.draw();
  }

  private resize = () => {
    const bounds = this.canvas.getBoundingClientRect();
    const cssSize = Math.max(1, Math.min(bounds.width || 320, bounds.height || 320));
    const renderSize = Math.round(cssSize * Math.min(window.devicePixelRatio || 1, 2));
    if (this.canvas.width === renderSize && this.canvas.height === renderSize) return;
    this.canvas.width = renderSize;
    this.canvas.height = renderSize;
    const scale = renderSize / LOGICAL_SIZE;
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
    this.context.imageSmoothingEnabled = true;
  };

  private updateGaze = (event: PointerEvent) => {
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
    if (this.scene === 'agent') {
      const candidates = RANDOM_SHAPES.filter((scene) => scene !== this.lastShape);
      this.scene = candidates[Math.floor(Math.random() * candidates.length)] ?? 'globe';
      this.lastShape = this.scene;
    } else {
      this.scene = 'agent';
    }
    this.sceneStarted = time;
    const targets = targetsFor(this.scene, time * 0.001, 0, this.gaze.y);
    assignNearest(this.nodes, targets);
    for (const node of this.nodes) {
      node.activation = time + Math.pow(node.seed, 1.7) * 130;
      node.hold = {
        alpha: node.alpha,
        radiusX: node.radiusX,
        radiusY: node.radiusY,
        x: node.x,
        y: node.y,
        z: node.z,
      };
    }
  }

  private tick = (time: number) => {
    const delta = this.lastTime ? Math.min(1 / 30, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    const elapsed = time - this.sceneStarted;
    const duration = this.scene === 'agent' ? FACE_DURATION : SHAPE_DURATION;
    if (!this.prefersReducedMotion.matches) {
      if (elapsed >= duration) this.beginScene(time);
      this.update(time, delta);
    }
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(time: number, delta: number) {
    const elapsed = time - this.sceneStarted;
    const localTime = elapsed * 0.001;
    this.gaze.y += (this.gaze.targetY - this.gaze.y) * (1 - Math.exp(-4.2 * delta));
    this.repel.strength +=
      ((this.repel.active ? 1 : 0) - this.repel.strength) * (1 - Math.exp(-13 * delta));
    const targets = targetsFor(
      this.scene,
      time * 0.001,
      localTime,
      this.gaze.y,
    );

    for (const node of this.nodes) {
      const target = targets[node.slot];
      const destination = time >= node.activation ? target : node.hold;
      const stiffness = (76 + node.seed * 14) / node.mass;
      const damping = Math.exp((-13.4 / node.mass) * delta);
      node.velocityX += (destination.x - node.x) * stiffness * delta;
      node.velocityY += (destination.y - node.y) * stiffness * delta;
      node.velocityZ += (destination.z - node.z) * stiffness * delta;

      if (this.repel.strength > 0.001) {
        let repelX = CENTER + node.x - this.repel.x;
        let repelY = CENTER + node.y - this.repel.y;
        let distance = Math.hypot(repelX, repelY);
        if (distance < 0.001) {
          const angle = node.seed * TAU;
          repelX = Math.cos(angle);
          repelY = Math.sin(angle);
          distance = 1;
        }
        if (distance < REPEL_RADIUS) {
          const proximity = 1 - distance / REPEL_RADIUS;
          const force = (REPEL_FORCE * proximity * proximity * this.repel.strength) / node.mass;
          node.velocityX += (repelX / distance) * force * delta;
          node.velocityY += (repelY / distance) * force * delta;
        }
      }

      node.velocityX *= damping;
      node.velocityY *= damping;
      node.velocityZ *= damping;
      node.x += node.velocityX * delta;
      node.y += node.velocityY * delta;
      node.z += node.velocityZ * delta;

      node.radiusXVelocity += (destination.radiusX - node.radiusX) * 92 * delta;
      node.radiusYVelocity += (destination.radiusY - node.radiusY) * 92 * delta;
      node.radiusXVelocity *= Math.exp(-14 * delta);
      node.radiusYVelocity *= Math.exp(-14 * delta);
      node.radiusX += node.radiusXVelocity * delta;
      node.radiusY += node.radiusYVelocity * delta;

      node.alphaVelocity += (destination.alpha - node.alpha) * 86 * delta;
      node.alphaVelocity *= Math.exp(-13 * delta);
      node.alpha = clamp(node.alpha + node.alphaVelocity * delta, 0.3, 1);
    }
  }

  private draw() {
    const context = this.context;
    const colors = COLORS[this.theme];
    context.globalAlpha = 1;
    context.fillStyle = colors.background;
    context.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    context.fillStyle = colors.particle;

    const ordered = [...this.nodes].sort((a, b) => a.z - b.z);
    for (const node of ordered) {
      context.globalAlpha = node.alpha;
      context.beginPath();
      context.ellipse(
        CENTER + node.x,
        CENTER + node.y,
        clamp(node.radiusX, 0.34, 5.2),
        clamp(node.radiusY, 0.34, 12.5),
        0,
        0,
        TAU,
      );
      context.fill();
    }
    context.globalAlpha = 1;
  }
}
