export type UnifiedAgentTheme = 'light' | 'dark';
export type UnifiedAgentDetail = 1 | 2 | 4;

type AgentScene = 'agent' | 'fast' | 'collapse';
export type UnifiedAgentVariant = 'auto' | AgentScene;
export type UnifiedAgentSequenceStep = 0 | 1 | 2 | 3;

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

type Point3 = {
  x: number;
  y: number;
  z: number;
};

const LOGICAL_SIZE = 180;
const CENTER = LOGICAL_SIZE / 2;
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const STEP_DURATION = 3_000;
const FACE_SPHERE_RADIUS = 42;
const BURST_DURATION = 1_000;
const REPEL_RADIUS = 13;
const REPEL_FORCE = 520;
const STEP_SCENES: readonly AgentScene[] = ['agent', 'fast', 'agent', 'collapse'];

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
  const blinkWindows: Array<[number, number]> = [[2.32, 2.62]];
  for (const [start, end] of blinkWindows) {
    if (localTime >= start && localTime <= end) {
      return Math.sin(((localTime - start) / (end - start)) * Math.PI);
    }
  }
  return 0;
}

function expressionAmount(localTime: number) {
  const start = 1.25;
  const end = 1.95;
  if (localTime < start || localTime > end) return 0;
  return Math.sin(((localTime - start) / (end - start)) * Math.PI);
}

function rotatePoint(point: Point3, yaw: number, pitch: number, roll: number): Point3 {
  const yawCosine = Math.cos(yaw);
  const yawSine = Math.sin(yaw);
  const yawX = point.x * yawCosine + point.z * yawSine;
  const yawZ = -point.x * yawSine + point.z * yawCosine;

  const pitchCosine = Math.cos(pitch);
  const pitchSine = Math.sin(pitch);
  const pitchY = point.y * pitchCosine - yawZ * pitchSine;
  const pitchZ = point.y * pitchSine + yawZ * pitchCosine;

  const rollCosine = Math.cos(roll);
  const rollSine = Math.sin(roll);
  return {
    x: yawX * rollCosine - pitchY * rollSine,
    y: yawX * rollSine + pitchY * rollCosine,
    z: pitchZ,
  };
}

function headPose(localTime: number, headX: number, headY: number, dizzy: boolean) {
  const dizzyEnvelope = dizzy ? ease(localTime / 0.42) : 0;
  const dizzyPhase = localTime * 7.4;
  return {
    dizzyEnvelope,
    dizzyPhase,
    pitch:
      -headY * 0.39 +
      Math.cos(dizzyPhase * 0.83) * 0.13 * dizzyEnvelope,
    roll:
      headX * 0.13 -
      headX * headY * 0.1 +
      Math.sin(dizzyPhase * 0.71) * 0.16 * dizzyEnvelope,
    yaw:
      headX * 0.5 +
      Math.sin(dizzyPhase * 0.91) * 0.18 * dizzyEnvelope,
  };
}

function eyeTargets(
  localTime: number,
  eyeX: number,
  eyeY: number,
  headX: number,
  headY: number,
  dizzy: boolean,
): Target[] {
  const blink = dizzy ? 0 : blinkAmount(localTime);
  const expression = dizzy ? 0 : expressionAmount(localTime);
  const pose = headPose(localTime, headX, headY, dizzy);
  const residualX = eyeX - headX;
  const residualY = eyeY - headY;

  return [-12.2, 12.2].map((offset, index): Target => {
    const transformed = rotatePoint(
      {
        x:
          offset +
          Math.sin(pose.dizzyPhase + index * 0.32) * 3.4 * pose.dizzyEnvelope,
        y:
          -1 +
          Math.cos(pose.dizzyPhase * 1.13 + index * 0.46) * 2.7 * pose.dizzyEnvelope,
        z: 20,
      },
      pose.yaw,
      pose.pitch,
      pose.roll,
    );
    const depth = clamp((transformed.z + 24) / 48, 0, 1);
    const perspective = 1 + transformed.z / 330;
    const expressiveClosure = index === 0 ? expression * 0.1 : expression * 0.56;
    const dizzyClosure = dizzy
      ? 0.25 + (Math.sin(pose.dizzyPhase + index * Math.PI) + 1) * 0.27
      : 0;
    const closure = Math.max(blink, expressiveClosure, dizzyClosure);
    const foreshortening =
      1 - Math.abs(pose.yaw) * (index === (pose.yaw > 0 ? 0 : 1) ? 0.5 : 0.13);

    return {
      alpha: 1,
      angle: pose.roll + Math.sin(pose.dizzyPhase + index) * 0.08 * pose.dizzyEnvelope,
      radiusX: 5.05 * foreshortening * mix(0.86, 1.11, depth),
      radiusY: mix(12.35, 2.65, closure) * mix(0.9, 1.08, depth),
      x:
        transformed.x * perspective +
        eyeX * 1.9 +
        residualX * 4.6,
      y:
        transformed.y * perspective +
        eyeY * 1.65 +
        residualY * 4 +
        Math.sin(localTime * 0.76) * 0.28,
      z: transformed.z + FACE_SPHERE_RADIUS * 0.48,
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

function fullSphereTargets(
  localTime: number,
  eyes: Target[],
  spherePhase: number,
  headX: number,
  headY: number,
  dizzy: boolean,
): Target[] {
  const pose = headPose(localTime, headX, headY, dizzy);
  const phaseCosine = Math.cos(spherePhase);
  const phaseSine = Math.sin(spherePhase);
  const protection = clamp((eyes[0].radiusX - 1.4) / (5.05 - 1.4), 0, 1);

  return REFERENCE_RING.map(([, , mappedRadius], index): Target => {
    const normalizedY = 1 - ((index + 0.5) / REFERENCE_RING.length) * 2;
    const ringRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
    const angle = index * GOLDEN_ANGLE;
    const baseX = Math.cos(angle) * ringRadius * FACE_SPHERE_RADIUS;
    const baseY = normalizedY * FACE_SPHERE_RADIUS;
    const baseZ = Math.sin(angle) * ringRadius * FACE_SPHERE_RADIUS;
    const spun = {
      x: baseX * phaseCosine + baseZ * phaseSine,
      y: baseY,
      z: -baseX * phaseSine + baseZ * phaseCosine,
    };
    const transformed = rotatePoint(spun, pose.yaw, pose.pitch + 0.2, pose.roll);
    const depth = clamp((transformed.z / FACE_SPHERE_RADIUS + 1) * 0.5, 0, 1);
    const perspective = 1 + (transformed.z / FACE_SPHERE_RADIUS) * 0.075;
    const wobbleSpeed = dizzy ? 5.2 : 1.18;
    const wobble = Math.sin(localTime * (wobbleSpeed + (index % 4) * 0.08) + index * 1.91);
    const x = (transformed.x + wobble * 0.7) * perspective;
    const y = (transformed.y + wobble * 0.9) * perspective;
    const edge = clamp(Math.hypot(x, y) / FACE_SPHERE_RADIUS, 0, 1);
    const radius = mappedRadius * (0.56 + edge * 0.46) * (0.9 + depth * 0.1);

    return avoidEyes(
      {
        alpha: 0.3 + depth * 0.7,
        radiusX: radius,
        radiusY: radius,
        x,
        y,
        z: transformed.z,
      },
      eyes,
      index,
      protection,
    );
  });
}

function referenceAgentTargets(
  localTime: number,
  eyeX: number,
  eyeY: number,
  headX: number,
  headY: number,
  spherePhase: number,
  dizzy = false,
): Target[] {
  const eyes = eyeTargets(localTime, eyeX, eyeY, headX, headY, dizzy);
  const ring = fullSphereTargets(localTime, eyes, spherePhase, headX, headY, dizzy);

  return [...eyes, ...ring];
}

function collapseTarget(node: Node, localTime: number): Target {
  const inwardDelay = node.seed * 0.42;
  const inward = ease((localTime - inwardDelay) / 0.72);
  const outwardDelay = 1.42 + node.seed * 0.24;
  const outward = ease((localTime - outwardDelay) / 0.92);
  const collapse = inward * (1 - outward);
  const radialScale = mix(1, 0.006, collapse);
  const coreAngle = node.seed * TAU;
  const coreRadius = mix(0, 0.16 + node.seed * 0.16, collapse);
  const circleRadius = 0.72 + node.seed * 0.28;
  return {
    alpha: mix(node.hold.alpha, 1, collapse),
    angle: mix(node.hold.angle ?? 0, 0, collapse),
    radiusX: mix(node.hold.radiusX, circleRadius, collapse),
    radiusY: mix(node.hold.radiusY, circleRadius, collapse),
    x: node.hold.x * radialScale + Math.cos(coreAngle) * coreRadius,
    y: node.hold.y * radialScale + Math.sin(coreAngle) * coreRadius,
    z: node.hold.z * radialScale,
  };
}

function targetsFor(
  scene: Exclude<AgentScene, 'collapse'>,
  localTime: number,
  eyeX: number,
  eyeY: number,
  headX: number,
  headY: number,
  spherePhase: number,
): Target[] {
  return referenceAgentTargets(
    localTime,
    eyeX,
    eyeY,
    headX,
    headY,
    spherePhase,
    scene === 'fast',
  );
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
  private gaze = {
    eyeX: 0,
    eyeY: 0,
    headX: 0,
    headY: 0,
    targetX: 0,
    targetY: 0,
  };
  private glowEnabled = false;
  private interactive: boolean;
  private lastTime = 0;
  private manualScene: AgentScene | null = null;
  private nodes: Node[];
  private onSequenceStepChange?: (step: UnifiedAgentSequenceStep) => void;
  private pendingPointer = {
    clientX: 0,
    clientY: 0,
    dirty: false,
    pointerType: 'mouse',
  };
  private prefersReducedMotion: MediaQueryList;
  private reactionTimer = 0;
  private repel = { strength: 0, targetStrength: 0, x: CENTER, y: CENTER };
  private resizeObserver: ResizeObserver;
  private scene: AgentScene = 'agent';
  private sceneStarted = performance.now();
  private sequenceStep: UnifiedAgentSequenceStep = 0;
  private spherePhase = 0;
  private spinDrive = 0.42;
  private theme: UnifiedAgentTheme;

  constructor(
    canvas: HTMLCanvasElement,
    options: {
      detail: UnifiedAgentDetail;
      interactive?: boolean;
      onSequenceStepChange?: (step: UnifiedAgentSequenceStep) => void;
      theme: UnifiedAgentTheme;
    },
  ) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable.');
    this.canvas = canvas;
    this.context = context;
    this.interactive = options.interactive ?? true;
    this.onSequenceStepChange = options.onSequenceStepChange;
    this.theme = options.theme;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const firstTargets = referenceAgentTargets(0, 0, 0, 0, 0, 0);
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
    if (this.interactive) {
      canvas.addEventListener('pointerdown', this.triggerBurst, { passive: true });
      window.addEventListener('pointermove', this.updatePointer, { passive: true });
      window.addEventListener('pointercancel', this.releaseRepel);
      window.addEventListener('blur', this.releaseRepel);
    }
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.burstTimer);
    window.clearTimeout(this.reactionTimer);
    this.canvas.removeAttribute('data-bursting');
    this.resizeObserver.disconnect();
    if (this.interactive) {
      this.canvas.removeEventListener('pointerdown', this.triggerBurst);
      window.removeEventListener('pointermove', this.updatePointer);
      window.removeEventListener('pointercancel', this.releaseRepel);
      window.removeEventListener('blur', this.releaseRepel);
    }
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
      this.transitionToStep(0, performance.now());
      return;
    }
    this.manualScene = variant;
    this.transitionTo(variant, performance.now());
  }

  playSequenceStep(step: UnifiedAgentSequenceStep) {
    this.manualScene = null;
    this.transitionToStep(step, performance.now());
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
    this.pendingPointer.clientX = event.clientX;
    this.pendingPointer.clientY = event.clientY;
    this.pendingPointer.pointerType = event.pointerType;
    this.pendingPointer.dirty = true;
  };

  private flushPointer() {
    if (!this.pendingPointer.dirty) return;
    this.pendingPointer.dirty = false;
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const centerX = bounds.left + bounds.width * 0.5;
    const centerY = bounds.top + bounds.height * 0.5;
    const gazeRange = Math.max(90, bounds.width * 1.25);
    const { clientX, clientY, pointerType } = this.pendingPointer;
    this.gaze.targetX = clamp((clientX - centerX) / gazeRange, -1, 1);
    this.gaze.targetY = clamp((clientY - centerY) / gazeRange, -1, 1);

    if (pointerType === 'touch') {
      this.repel.targetStrength = 0;
      return;
    }
    const outsideX = Math.max(bounds.left - clientX, 0, clientX - bounds.right);
    const outsideY = Math.max(bounds.top - clientY, 0, clientY - bounds.bottom);
    const distance = Math.hypot(outsideX, outsideY);
    const approachRadius = Math.max(72, bounds.width * 0.48);
    this.repel.x = clamp(((clientX - bounds.left) / bounds.width) * LOGICAL_SIZE, 0, LOGICAL_SIZE);
    this.repel.y = clamp(((clientY - bounds.top) / bounds.height) * LOGICAL_SIZE, 0, LOGICAL_SIZE);
    this.repel.targetStrength = clamp(1 - distance / approachRadius, 0, 1);
  }

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

    window.clearTimeout(this.reactionTimer);
    this.reactionTimer = window.setTimeout(() => {
      const reactionStep: UnifiedAgentSequenceStep = Math.random() < 0.5 ? 1 : 3;
      this.playSequenceStep(reactionStep);
    }, BURST_DURATION * 0.9);
  };

  private transitionTo(scene: AgentScene, time: number) {
    const previousScene = this.scene;
    this.scene = scene;
    this.sceneStarted = time;
    if (scene !== 'collapse') {
      const targets = targetsFor(
        scene,
        0,
        this.gaze.eyeX,
        this.gaze.eyeY,
        this.gaze.headX,
        this.gaze.headY,
        this.spherePhase,
      );
      assignNearest(this.nodes, targets);
    }
    const activationSpread =
      scene === 'collapse' || previousScene === 'collapse' ? 18 : 92;
    for (const node of this.nodes) {
      node.activation = time + Math.pow(node.seed, 1.7) * activationSpread;
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

  private transitionToStep(step: UnifiedAgentSequenceStep, time: number) {
    this.sequenceStep = step;
    this.onSequenceStepChange?.(step);
    this.transitionTo(STEP_SCENES[step], time);
  }

  private beginScene(time: number) {
    const nextStep = ((this.sequenceStep + 1) % STEP_SCENES.length) as UnifiedAgentSequenceStep;
    this.transitionToStep(nextStep, time);
  }

  private tick = (time: number) => {
    const delta = this.lastTime ? Math.min(1 / 30, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    const elapsed = time - this.sceneStarted;
    if (!this.prefersReducedMotion.matches) {
      this.flushPointer();
      if (elapsed >= STEP_DURATION) {
        if (this.manualScene === null) this.beginScene(time);
        else if (this.manualScene === 'collapse') this.transitionTo('collapse', time);
      }
      this.update(time, delta);
    }
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(time: number, delta: number) {
    const elapsed = time - this.sceneStarted;
    const localTime = elapsed * 0.001;
    this.gaze.eyeX +=
      (this.gaze.targetX - this.gaze.eyeX) * (1 - Math.exp(-10.2 * delta));
    this.gaze.eyeY +=
      (this.gaze.targetY - this.gaze.eyeY) * (1 - Math.exp(-8.8 * delta));
    this.gaze.headX +=
      (this.gaze.targetX - this.gaze.headX) * (1 - Math.exp(-3.15 * delta));
    this.gaze.headY +=
      (this.gaze.targetY - this.gaze.headY) * (1 - Math.exp(-2.75 * delta));

    const requestedSpin =
      Math.abs(this.gaze.targetX) < 0.08 ? 0.42 : Math.sign(this.gaze.targetX);
    this.spinDrive += (requestedSpin - this.spinDrive) * (1 - Math.exp(-2.7 * delta));
    const spinDirection = Math.sign(this.spinDrive) || 1;
    const spinMagnitude = 0.64 + Math.abs(this.spinDrive) * 0.48;
    const spinSpeed = this.scene === 'fast' ? 6.4 : 0.86;
    if (this.scene !== 'collapse') {
      this.spherePhase += delta * spinSpeed * spinDirection * spinMagnitude;
    }

    this.repel.strength +=
      (this.repel.targetStrength - this.repel.strength) * (1 - Math.exp(-10 * delta));
    const targets =
      this.scene === 'collapse'
        ? null
        : targetsFor(
            this.scene,
            localTime,
            this.gaze.eyeX,
            this.gaze.eyeY,
            this.gaze.headX,
            this.gaze.headY,
            this.spherePhase,
          );

    for (const node of this.nodes) {
      const target =
        this.scene === 'collapse' ? collapseTarget(node, localTime) : targets![node.slot];
      const destination = time >= node.activation ? target : node.hold;
      const burstElapsed = time - this.burstStarted;
      const burstActive = burstElapsed >= 0 && burstElapsed < BURST_DURATION;
      const burstReturn = burstActive ? ease(burstElapsed / BURST_DURATION) : 1;
      const sceneStiffness = this.scene === 'collapse' ? 188 : this.scene === 'fast' ? 104 : 78;
      const restingDamping = this.scene === 'collapse' ? 19 : this.scene === 'fast' ? 15.2 : 13.6;
      const stiffness =
        ((sceneStiffness + node.seed * 14) / node.mass) * mix(0.045, 1, burstReturn);
      const dampingRate = burstActive ? mix(5.4, restingDamping, burstReturn) : restingDamping;
      const damping = Math.exp((-dampingRate / node.mass) * delta);
      node.velocityX += (destination.x - node.x) * stiffness * delta;
      node.velocityY += (destination.y - node.y) * stiffness * delta;
      node.velocityZ += (destination.z - node.z) * stiffness * delta;

      const isEye = (this.scene === 'agent' || this.scene === 'fast') && node.slot < 2;
      if (!isEye && this.scene !== 'collapse' && this.repel.strength > 0.001) {
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
    context.globalAlpha = this.scene === 'fast' ? 0.19 : 1;
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
