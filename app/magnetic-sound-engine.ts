import { play, setEnabled, setVolume, type SoundName } from 'cuelume';
import type { MagneticShape } from './magnetic-morph-engine';

type SoundLayer = {
  cue: SoundName;
  delay: number;
  volume: number;
};

type SoundSignature = {
  focus: readonly SoundLayer[];
  hover: readonly SoundLayer[];
};

const layer = (cue: SoundName, delay: number, volume: number): SoundLayer => ({
  cue,
  delay,
  volume,
});

const SOUND_SIGNATURES: Record<MagneticShape, SoundSignature> = {
  loader: {
    hover: [layer('tick', 0, 0.16), layer('loading', 38, 0.12)],
    focus: [layer('tick', 0, 0.2), layer('loading', 42, 0.19), layer('pulse', 128, 0.13)],
  },
  grid: {
    hover: [layer('tick', 0, 0.16), layer('scan', 34, 0.1)],
    focus: [layer('tick', 0, 0.19), layer('scan', 38, 0.18), layer('page', 116, 0.11)],
  },
  cube: {
    hover: [layer('tick', 0, 0.16), layer('page', 42, 0.1)],
    focus: [layer('page', 0, 0.17), layer('tick', 48, 0.18), layer('ready', 132, 0.12)],
  },
  sphere: {
    hover: [layer('tick', 0, 0.14), layer('bloom', 34, 0.1)],
    focus: [layer('bloom', 0, 0.17), layer('tick', 48, 0.16), layer('sparkle', 138, 0.11)],
  },
  cloud: {
    hover: [layer('tick', 0, 0.12), layer('whisper', 34, 0.1)],
    focus: [layer('whisper', 0, 0.17), layer('bloom', 54, 0.14), layer('chime', 142, 0.1)],
  },
  check: {
    hover: [layer('tick', 0, 0.16), layer('release', 36, 0.11)],
    focus: [layer('tick', 0, 0.18), layer('release', 42, 0.14), layer('success', 122, 0.13)],
  },
  spreadsheet: {
    hover: [layer('tick', 0, 0.15), layer('page', 34, 0.1)],
    focus: [layer('tick', 0, 0.19), layer('page', 40, 0.15), layer('scan', 126, 0.11)],
  },
  columns: {
    hover: [layer('tick', 0, 0.15), layer('pulse', 36, 0.1)],
    focus: [layer('tick', 0, 0.18), layer('scan', 38, 0.16), layer('pulse', 118, 0.12)],
  },
  pyramid: {
    hover: [layer('tick', 0, 0.15), layer('ready', 40, 0.09)],
    focus: [layer('page', 0, 0.15), layer('tick', 46, 0.18), layer('ready', 132, 0.13)],
  },
  diamond: {
    hover: [layer('tick', 0, 0.14), layer('sparkle', 38, 0.1)],
    focus: [layer('tick', 0, 0.17), layer('sparkle', 42, 0.15), layer('chime', 128, 0.11)],
  },
  helix: {
    hover: [layer('tick', 0, 0.14), layer('scan', 34, 0.1)],
    focus: [layer('scan', 0, 0.17), layer('pulse', 50, 0.14), layer('sparkle', 136, 0.1)],
  },
  wave: {
    hover: [layer('tick', 0, 0.13), layer('droplet', 34, 0.1)],
    focus: [layer('droplet', 0, 0.16), layer('whisper', 48, 0.13), layer('chime', 138, 0.1)],
  },
};

let focusTimers: number[] = [];
let lastHoverAt = 0;

function schedule(layers: readonly SoundLayer[], replaceFocus = false) {
  if (replaceFocus) {
    focusTimers.forEach((timer) => window.clearTimeout(timer));
    focusTimers = [];
  }

  const timers = layers.map(({ cue, delay, volume }) =>
    window.setTimeout(() => play(cue, { volume }), delay),
  );

  if (replaceFocus) focusTimers = timers;
}

export function configureSoundSystem(enabled: boolean) {
  setVolume(0.72);
  setEnabled(enabled);
}

export function playControlSound(cue: SoundName, volume = 0.14) {
  play(cue, { volume });
}

export function playFocusSignature(shape: MagneticShape) {
  schedule(SOUND_SIGNATURES[shape].focus, true);
}

export function playHoverSignature(shape: MagneticShape) {
  const now = performance.now();
  if (now - lastHoverAt < 150) return;
  lastHoverAt = now;
  schedule(SOUND_SIGNATURES[shape].hover);
}

export function stopSoundSequences() {
  focusTimers.forEach((timer) => window.clearTimeout(timer));
  focusTimers = [];
}
