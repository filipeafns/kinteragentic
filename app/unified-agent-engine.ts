export type UnifiedAgentTheme = 'light' | 'dark';
export type UnifiedAgentDetail = 1 | 2 | 4;

type AgentScene = 'agent' | 'fast' | 'cube' | 'collapse' | 'bars' | 'globe';
export type UnifiedAgentVariant = 'auto' | AgentScene;

type Target = {
  alpha: number;
  angle?: number;
  radiusX: number;
  radiusY: number;
  x: number;
  y: number;
  z: number;
};

type Node = Target & {
  activation: number;
  alphaVelocity: number;
  angleVelocity: number;
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

const LOGICAL_SIZE = 180;
const CENTER = LOGICAL_SIZE / 2;
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const NODE_COUNT = 28;
const FACE_DURATION = 11_500;
const SHAPE_DURATION = 3_900;
const FACE_SPHERE_RADIUS = 42;
const EYE_ARRIVAL_DURATION = 1_100;
const FAST_SPEED = 7;
const COLLAPSE_CYCLE = 2.35;
const BURST_DURATION = 1_000;
const REPEL_RADIUS = 13;
const REPEL_FORCE = 520;
const RANDOM_SHAPES: AgentScene[] = ['fast', 'cube', 'collapse', 'bars', 'globe'];

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

function expressionAmount(localTime: number) {
  const start = 6.2;
  const end = 7.9;
  if (localTime < start || localTime > end) return 0;
  return Math.sin(((localTime - start) / (end - start)) * Math.PI);
}

function eyeTargets(localTime: number, gazeX: number, gazeY: number, thinking = false): Target[] {
  const blink = blinkAmount(localTime);
  const expression = expressionAmount(localTime);
  const arrival = ease(localTime / (EYE_ARRIVAL_DURATION * 0.001));
  const headTilt = gazeX * 0.28;
  const fastEnvelope = thinking ? ease(localTime / 0.55) : 0;
  const fastPhase = localTime * FAST_SPEED * 0.94;
  const fastX = Math.sin(fastPhase) * 6.2 * fastEnvelope;
  const fastY = Math.cos(fastPhase * 1.17) * 3.4 * fastEnvelope;
  const fastTilt = Math.sin(fastPhase * 0.73) * 0.2 * fastEnvelope;
  const cosine = Math.cos(headTilt + fastTilt);
  const sine = Math.sin(headTilt + fastTilt);

  return [-12.2, 12.2].map((offset, index): Target => {
    const expressiveClosure = index === 0 ? expression * 0.12 : expression * 0.54;
    const thinkingClosure = thinking ? (index === 0 ? 0.26 : 0.66) : 0;
    const closure = Math.max(blink, expressiveClosure, thinkingClosure);
    const localX = offset * arrival;
    return {
      alpha: 1,
      angle: headTilt + fastTilt,
      radiusX: mix(1.4, 5.05, arrival),
      radiusY: mix(1.4, mix(12.35, 2.8, closure), arrival),
      x: localX * cosine + gazeX * 2.2 + fastX,
      y:
        -1 +
        localX * sine +
        gazeY * 1.8 +
        Math.sin(localTime * 0.76) * 0.35 +
        fastY,
      z: FACE_SPHERE_RADIUS + 4,
    };
  });
}

function avoidEyes(target: Target, eyes: Target[], index: number, protection: number): Target {
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
    const strength = Math.pow(1 - distance, 1.7) * protection;
    x += (normalX - normalY * 0.32) * strength * 10.5;
    y += (normalY + normalX * 0.32) * strength * 10.5;
  }

  return { ...target, x, y };
}

function fullSphereTargets(localTime: number, eyes: Target[], speed = 1): Target[] {
  const motionTime = localTime * speed;
  const rotation = motionTime * 0.78;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const tilt = 0.24 + Math.sin(motionTime * 0.31) * 0.08;
  const tiltCosine = Math.cos(tilt);
  const tiltSine = Math.sin(tilt);
  const protection = clamp((eyes[0].radiusX - 1.4) / (5.05 - 1.4), 0, 1);

  return REFERENCE_RING.map(([, , mappedRadius], index): Target => {
    const normalizedY = 1 - ((index + 0.5) / REFERENCE_RING.length) * 2;
    const ringRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
    const angle = index * GOLDEN_ANGLE;
    const baseX = Math.cos(angle) * ringRadius * FACE_SPHERE_RADIUS;
    const baseY = normalizedY * FACE_SPHERE_RADIUS;
    const baseZ = Math.sin(angle) * ringRadius * FACE_SPHERE_RADIUS;
    const rotatedX = baseX * cosine + baseZ * sine;
    const rotatedZ = -baseX * sine + baseZ * cosine;
    const rotatedY = baseY * tiltCosine - rotatedZ * tiltSine;
    const tiltedZ = baseY * tiltSine + rotatedZ * tiltCosine;
    const depth = clamp((tiltedZ / FACE_SPHERE_RADIUS + 1) * 0.5, 0, 1);
    const perspective = 1 + (tiltedZ / FACE_SPHERE_RADIUS) * 0.075;
    const wobble = Math.sin(motionTime * (1.18 + (index % 4) * 0.08) + index * 1.91);
    const x = (rotatedX + wobble * 0.7) * perspective;
    const y = (rotatedY + wobble * 0.9) * perspective;
    const edge = clamp(Math.hypot(x, y) / FACE_SPHERE_RADIUS, 0, 1);
    const radius = mappedRadius * (0.56 + edge * 0.46) * (0.9 + depth * 0.1);

    return avoidEyes(
      {
        alpha: 0.3 + depth * 0.7,
        radiusX: radius,
        radiusY: radius,
        x,
        y,
        z: tiltedZ,
      },
      eyes,
      index,
      protection,
    );
  });
}

function referenceAgentTargets(
  localTime: number,
  gazeX: number,
  gazeY: number,
  speed = 1,
  thinking = false,
  arrived = false,
): Target[] {
  const eyeTime = localTime + (arrived ? EYE_ARRIVAL_DURATION * 0.001 : 0);
  const eyes = eyeTargets(eyeTime, gazeX, gazeY, thinking);
  const ring = fullSphereTargets(localTime, eyes, speed);

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

function cubeTargets(absoluteTime: number): Target[] {
  const rotationY = absoluteTime * 0.58;
  const rotationX = 0.48 + Math.sin(absoluteTime * 0.32) * 0.12;
  const cosineY = Math.cos(rotationY);
  const sineY = Math.sin(rotationY);
  const cosineX = Math.cos(rotationX);
  const sineX = Math.sin(rotationX);

  return Array.from({ length: NODE_COUNT }, (_, index) => {
    const normalizedY = 1 - ((index + 0.5) / NODE_COUNT) * 2;
    const radial = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
    const angle = index * GOLDEN_ANGLE;
    const directionX = Math.cos(angle) * radial;
    const directionY = normalizedY;
    const directionZ = Math.sin(angle) * radial;
    const cubeProjection = 24 / Math.max(Math.abs(directionX), Math.abs(directionY), Math.abs(directionZ));
    const x3d = directionX * cubeProjection;
    const y3d = directionY * cubeProjection;
    const z3d = directionZ * cubeProjection;
    const rotatedX = x3d * cosineY + z3d * sineY;
    const rotatedZ = -x3d * sineY + z3d * cosineY;
    const rotatedY = y3d * cosineX - rotatedZ * sineX;
    const tiltedZ = y3d * sineX + rotatedZ * cosineX;
    const depth = clamp((tiltedZ / 42 + 1) * 0.5, 0, 1);
    const perspective = 1 + tiltedZ / 230;
    const projectedX = rotatedX * perspective;
    const projectedY = rotatedY * perspective;
    const nodeRadius = 1.1 + clamp(Math.hypot(projectedX, projectedY) / 40, 0, 1) * 1.6;
    return {
      alpha: 0.38 + depth * 0.62,
      radiusX: nodeRadius,
      radiusY: nodeRadius,
      x: projectedX,
      y: projectedY,
      z: tiltedZ,
    };
  });
}

function collapseTargets(absoluteTime: number, localTime: number): Target[] {
  const phase = localTime % COLLAPSE_CYCLE;
  let collapse = 0;
  if (phase < 0.34) {
    collapse = ease(phase / 0.34);
  } else if (phase < 0.58) {
    collapse = 1;
  } else if (phase < 1.08) {
    collapse = 1 - ease((phase - 0.58) / 0.5);
  }

  const scale = mix(1, 0.025, collapse);
  const spin = absoluteTime * mix(0.7, 7.8, collapse);
  return Array.from({ length: NODE_COUNT }, (_, index) => {
    const target = globePoint(index, spin, 34);
    const coreAngle = index * GOLDEN_ANGLE + absoluteTime * 9.4;
    const coreRadius = (0.18 + hash(index * 7.9) * 0.92) * collapse;
    const x = target.x * scale + Math.cos(coreAngle) * coreRadius;
    const y = target.y * scale + Math.sin(coreAngle) * coreRadius;
    const nodeRadius = mix(target.radiusX, 1.05 + hash(index * 3.2) * 0.42, collapse);
    return {
      alpha: mix(target.alpha, 0.82 + hash(index * 4.1) * 0.18, collapse),
      radiusX: nodeRadius,
      radiusY: nodeRadius,
      x,
      y,
      z: target.z * scale,
    };
  });
}

function barTargets(absoluteTime: number): Target[] {
  const columnCount = 7;
  const nodesPerColumn = NODE_COUNT / columnCount;
  return Array.from({ length: NODE_COUNT }, (_, index) => {
    const column = Math.floor(index / nodesPerColumn);
    const row = index % nodesPerColumn;
    const columnPhase = absoluteTime * 4.4 + column * 0.88;
    const trackingY =
      Math.sin(columnPhase) * 10.5 + Math.sin(columnPhase * 0.53 + column * 1.7) * 3.4;
    const pulse = (Math.sin(columnPhase * 1.17 + row * 0.62) + 1) * 0.5;
    const x = (column - (columnCount - 1) * 0.5) * 8.2;
    const y = (row - (nodesPerColumn - 1) * 0.5) * 7.2 + trackingY;
    const nodeRadius = 1.45 + pulse * 0.72;
    return {
      alpha: 0.72 + pulse * 0.28,
      radiusX: nodeRadius,
      radiusY: nodeRadius,
      x,
      y,
      z: Math.sin(columnPhase + row * 0.8) * 8,
    };
  });
}

function targetsFor(
  scene: AgentScene,
  absoluteTime: number,
  localTime: number,
  gazeX: number,
  gazeY: number,
): Target[] {
  switch (scene) {
    case 'agent':
      return referenceAgentTargets(localTime, gazeX, gazeY);
    case 'globe':
      return globeTargets(absoluteTime, 1);
    case 'cube':
      return cubeTargets(absoluteTime);
    case 'fast':
      return referenceAgentTargets(localTime, gazeX, gazeY, FAST_SPEED, true, true);
    case 'collapse':
      return collapseTargets(absoluteTime, localTime);
    case 'bars':
      return barTargets(absoluteTime);
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
  private burstStarted = Number.NEGATIVE_INFINITY;
  private burstTimer = 0;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private frame = 0;
  private gaze = { targetX: 0, targetY: 0, x: 0, y: 0 };
  private glowEnabled = false;
  private lastShape: AgentScene = 'globe';
  private lastTime = 0;
  private manualScene: AgentScene | null = null;
  private nodes: Node[];
  private prefersReducedMotion: MediaQueryList;
  private repel = { strength: 0, targetStrength: 0, x: CENTER, y: CENTER };
  private resizeObserver: ResizeObserver;
  private scene: AgentScene = 'agent';
  private sceneStarted = performance.now() - EYE_ARRIVAL_DURATION;
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
    const firstTargets = referenceAgentTargets(EYE_ARRIVAL_DURATION * 0.001, 0, 0);
    this.nodes = firstTargets.map((target, index) => ({
      ...target,
      activation: 0,
      alphaVelocity: 0,
      angle: target.angle ?? 0,
      angleVelocity: 0,
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
    canvas.addEventListener('pointerdown', this.triggerBurst, { passive: true });
    window.addEventListener('pointermove', this.updatePointer, { passive: true });
    window.addEventListener('pointercancel', this.releaseRepel);
    window.addEventListener('blur', this.releaseRepel);
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.burstTimer);
    this.canvas.removeAttribute('data-bursting');
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.triggerBurst);
    window.removeEventListener('pointermove', this.updatePointer);
    window.removeEventListener('pointercancel', this.releaseRepel);
    window.removeEventListener('blur', this.releaseRepel);
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

  setGlow(enabled: boolean) {
    this.glowEnabled = enabled;
    this.draw();
  }

  setVariant(variant: UnifiedAgentVariant) {
    if (variant === 'auto') {
      this.manualScene = null;
      if (this.scene !== 'agent') this.transitionTo('agent', performance.now());
      return;
    }
    this.manualScene = variant;
    this.transitionTo(variant, performance.now());
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

  private updatePointer = (event: PointerEvent) => {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const centerX = bounds.left + bounds.width * 0.5;
    const centerY = bounds.top + bounds.height * 0.5;
    const gazeRange = Math.max(90, bounds.width * 1.25);
    this.gaze.targetX = clamp((event.clientX - centerX) / gazeRange, -1, 1);
    this.gaze.targetY = clamp((event.clientY - centerY) / gazeRange, -1, 1);

    if (event.pointerType === 'touch') {
      this.repel.targetStrength = 0;
      return;
    }
    const outsideX = Math.max(bounds.left - event.clientX, 0, event.clientX - bounds.right);
    const outsideY = Math.max(bounds.top - event.clientY, 0, event.clientY - bounds.bottom);
    const distance = Math.hypot(outsideX, outsideY);
    const approachRadius = Math.max(72, bounds.width * 0.48);
    this.repel.x = clamp(((event.clientX - bounds.left) / bounds.width) * LOGICAL_SIZE, 0, LOGICAL_SIZE);
    this.repel.y = clamp(((event.clientY - bounds.top) / bounds.height) * LOGICAL_SIZE, 0, LOGICAL_SIZE);
    this.repel.targetStrength = clamp(1 - distance / approachRadius, 0, 1);
  };

  private releaseRepel = () => {
    this.repel.targetStrength = 0;
  };

  private triggerBurst = (event: PointerEvent) => {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const originX = clamp(((event.clientX - bounds.left) / bounds.width) * LOGICAL_SIZE, 0, LOGICAL_SIZE);
    const originY = clamp(((event.clientY - bounds.top) / bounds.height) * LOGICAL_SIZE, 0, LOGICAL_SIZE);
    this.burstStarted = performance.now();
    this.repel.targetStrength = 0;
    this.canvas.dataset.bursting = 'true';
    window.clearTimeout(this.burstTimer);
    this.burstTimer = window.setTimeout(() => {
      this.canvas.removeAttribute('data-bursting');
    }, BURST_DURATION + 80);

    for (const node of this.nodes) {
      let directionX = CENTER + node.x - originX;
      let directionY = CENTER + node.y - originY;
      let distance = Math.hypot(directionX, directionY);
      if (distance < 0.5) {
        const angle = node.seed * TAU;
        directionX = Math.cos(angle);
        directionY = Math.sin(angle);
        distance = 1;
      }
      const impulse = 155 + node.seed * 75;
      const tangent = (node.seed - 0.5) * 46;
      node.velocityX += (directionX / distance) * impulse - (directionY / distance) * tangent;
      node.velocityY += (directionY / distance) * impulse + (directionX / distance) * tangent;
      node.velocityZ += (node.seed - 0.5) * 54;
    }
  };

  private transitionTo(scene: AgentScene, time: number) {
    this.scene = scene;
    this.sceneStarted = time;
    const targets = targetsFor(scene, time * 0.001, 0, this.gaze.x, this.gaze.y);
    assignNearest(this.nodes, targets);
    for (const node of this.nodes) {
      node.activation = time + Math.pow(node.seed, 1.7) * 130;
      node.hold = {
        alpha: node.alpha,
        angle: node.angle ?? 0,
        radiusX: node.radiusX,
        radiusY: node.radiusY,
        x: node.x,
        y: node.y,
        z: node.z,
      };
    }
  }

  private beginScene(time: number) {
    let nextScene: AgentScene;
    if (this.scene === 'agent') {
      const candidates = RANDOM_SHAPES.filter((scene) => scene !== this.lastShape);
      nextScene = candidates[Math.floor(Math.random() * candidates.length)] ?? 'globe';
      this.lastShape = nextScene;
    } else {
      nextScene = 'agent';
    }
    this.transitionTo(nextScene, time);
  }

  private tick = (time: number) => {
    const delta = this.lastTime ? Math.min(1 / 30, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    const elapsed = time - this.sceneStarted;
    const duration = this.scene === 'agent' ? FACE_DURATION : SHAPE_DURATION;
    if (!this.prefersReducedMotion.matches) {
      if (this.manualScene === null && elapsed >= duration) this.beginScene(time);
      this.update(time, delta);
    }
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(time: number, delta: number) {
    const elapsed = time - this.sceneStarted;
    const localTime = elapsed * 0.001;
    this.gaze.x += (this.gaze.targetX - this.gaze.x) * (1 - Math.exp(-5.2 * delta));
    this.gaze.y += (this.gaze.targetY - this.gaze.y) * (1 - Math.exp(-4.2 * delta));
    this.repel.strength +=
      (this.repel.targetStrength - this.repel.strength) * (1 - Math.exp(-10 * delta));
    const targets = targetsFor(
      this.scene,
      time * 0.001,
      localTime,
      this.gaze.x,
      this.gaze.y,
    );

    for (const node of this.nodes) {
      const target = targets[node.slot];
      const destination = time >= node.activation ? target : node.hold;
      const burstElapsed = time - this.burstStarted;
      const burstActive = burstElapsed >= 0 && burstElapsed < BURST_DURATION;
      const burstReturn = burstActive ? ease(burstElapsed / BURST_DURATION) : 1;
      const sceneStiffness = this.scene === 'collapse' ? 188 : this.scene === 'bars' ? 112 : 76;
      const restingDamping = this.scene === 'collapse' ? 19 : this.scene === 'bars' ? 16 : 13.4;
      const stiffness =
        ((sceneStiffness + node.seed * 14) / node.mass) * mix(0.045, 1, burstReturn);
      const dampingRate = burstActive ? mix(5.4, restingDamping, burstReturn) : restingDamping;
      const damping = Math.exp((-dampingRate / node.mass) * delta);
      node.velocityX += (destination.x - node.x) * stiffness * delta;
      node.velocityY += (destination.y - node.y) * stiffness * delta;
      node.velocityZ += (destination.z - node.z) * stiffness * delta;

      const isEye = (this.scene === 'agent' || this.scene === 'fast') && node.slot < 2;
      if (!isEye && this.repel.strength > 0.001) {
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

      node.angleVelocity += ((destination.angle ?? 0) - (node.angle ?? 0)) * 74 * delta;
      node.angleVelocity *= Math.exp(-13.5 * delta);
      node.angle = (node.angle ?? 0) + node.angleVelocity * delta;

      node.alphaVelocity += (destination.alpha - node.alpha) * 86 * delta;
      node.alphaVelocity *= Math.exp(-13 * delta);
      node.alpha = clamp(node.alpha + node.alphaVelocity * delta, 0.3, 1);
    }
  }

  private draw() {
    const context = this.context;
    const colors = COLORS[this.theme];
    context.globalAlpha = this.scene === 'fast' ? 0.19 : this.scene === 'collapse' ? 0.34 : 1;
    context.shadowBlur = 0;
    context.fillStyle = colors.background;
    context.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    context.fillStyle = colors.particle;
    if (this.glowEnabled) {
      context.shadowColor = 'rgba(217, 255, 47, 0.34)';
      context.shadowBlur = 2.7;
    }

    const ordered = [...this.nodes].sort((a, b) => a.z - b.z);
    for (const node of ordered) {
      context.globalAlpha = node.alpha;
      context.beginPath();
      context.ellipse(
        CENTER + node.x,
        CENTER + node.y,
        clamp(node.radiusX, 0.34, 5.2),
        clamp(node.radiusY, 0.34, 12.5),
        node.angle ?? 0,
        0,
        TAU,
      );
      context.fill();
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
  }
}
