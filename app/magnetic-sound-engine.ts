import { play, setEnabled, setVolume, type SoundName } from 'cuelume';

export type AgentSoundState = 'agent' | 'fast' | 'cube' | 'collapse' | 'bars' | 'globe';

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

const SOUND_SIGNATURES: Record<AgentSoundState, SoundSignature> = {
  agent: {
    hover: [layer('tick', 0, 0.14), layer('pulse', 34, 0.09)],
    focus: [layer('tick', 0, 0.17), layer('pulse', 46, 0.13), layer('chime', 128, 0.1)],
  },
  globe: {
    hover: [layer('tick', 0, 0.14), layer('bloom', 34, 0.1)],
    focus: [layer('bloom', 0, 0.17), layer('tick', 48, 0.16), layer('sparkle', 138, 0.11)],
  },
  cube: {
    hover: [layer('tick', 0, 0.16), layer('page', 42, 0.1)],
    focus: [layer('page', 0, 0.17), layer('tick', 48, 0.18), layer('ready', 132, 0.12)],
  },
  fast: {
    hover: [layer('tick', 0, 0.15), layer('scan', 28, 0.1)],
    focus: [layer('scan', 0, 0.17), layer('tick', 36, 0.16), layer('pulse', 104, 0.12)],
  },
  collapse: {
    hover: [layer('tick', 0, 0.14), layer('release', 28, 0.1)],
    focus: [layer('release', 0, 0.17), layer('pulse', 38, 0.15), layer('bloom', 112, 0.11)],
  },
  bars: {
    hover: [layer('tick', 0, 0.14), layer('scan', 30, 0.1)],
    focus: [layer('scan', 0, 0.16), layer('tick', 42, 0.17), layer('loading', 118, 0.11)],
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

export function playFocusSignature(state: AgentSoundState) {
  schedule(SOUND_SIGNATURES[state].focus, true);
}

export function playHoverSignature(state: AgentSoundState) {
  const now = performance.now();
  if (now - lastHoverAt < 150) return;
  lastHoverAt = now;
  schedule(SOUND_SIGNATURES[state].hover);
}

export function stopSoundSequences() {
  focusTimers.forEach((timer) => window.clearTimeout(timer));
  focusTimers = [];
}
