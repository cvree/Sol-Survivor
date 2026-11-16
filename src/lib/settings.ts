import { create } from 'zustand';

/**
 * Player settings, kept on this device between visits.
 * The Esc menu (`Settings.tsx`) edits them; sound, motion and lessons read them.
 */
export interface Settings {
  /** Volumes, 0 to 1. */
  master: number;
  music: number;
  effects: number;
  ambience: number;
  /** Soft music: the tracks are played quieter and darker, like through a wall. On by default. */
  softMusic: boolean;
  /** Calm motion: animations are cut down. 'auto' follows the device setting. */
  motion: 'auto' | 'calm';
  shake: boolean;
  bigText: boolean;
  /** M.A.R.V.'s lessons after the first-run training. */
  hints: boolean;
  /** Builders walk to the next building site by themselves when they finish one. */
  autoBuilders: boolean;
}

export const DEFAULTS: Settings = {
  master: 0.8,
  music: 0.5,
  effects: 0.7,
  ambience: 0.5,
  softMusic: true,
  motion: 'auto',
  shake: true,
  bigText: false,
  hints: true,
  autoBuilders: true,
};

const KEY = 'sol-survivor:settings';
function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>;
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

interface SettingsStore extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...load(),
  set: (key, value) => {
    set({ [key]: value } as Partial<Settings>);
    save(get());
  },
  reset: () => { set({ ...DEFAULTS }); save(DEFAULTS); },
}));

function save(s: Settings) {
  const out: Partial<Settings> = {};
  for (const k of Object.keys(DEFAULTS) as (keyof Settings)[]) (out as Record<string, unknown>)[k] = s[k];
  try { localStorage.setItem(KEY, JSON.stringify(out)); } catch { /* fine */ }
}

/** Reflect the look settings on the page, so plain CSS can follow them. */
export function applyLook(s: Settings) {
  const html = document.documentElement;
  html.classList.toggle('calm-motion', s.motion === 'calm');
  html.classList.toggle('no-shake', !s.shake);
  html.classList.toggle('big-text', s.bigText);
}
