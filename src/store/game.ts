import { create } from 'zustand';
import { catalog } from '../data/records';
import { SOL_SECONDS } from '../engine/constants';
import { build, createGame, removeModule, setPatient, step, toggleModule, type Difficulty } from '../engine/engine';
import type { EventKind, GameState, ModuleKind } from '../engine/types';
import type { LiveSun } from '../lib/liveSun';
import { setMuted, sfx } from '../lib/sound';

export type Panel =
  | { type: 'data'; recordId?: string }
  | { type: 'build'; slot: number }
  | { type: 'brief'; eventId: string }
  | null;

interface Store {
  screen: 'title' | 'game';
  game: GameState | null;
  paused: boolean;
  speed: 1 | 2;
  panel: Panel;
  notice: { text: string; at: number } | null;
  briefed: EventKind[];
  muted: boolean;
  sun: LiveSun;
  difficulty: Difficulty;
  setSun: (s: LiveSun) => void;
  setDifficulty: (d: Difficulty) => void;
  start: () => void;
  quit: () => void;
  tick: (realSeconds: number) => void;
  toggle: (id: string) => void;
  build: (kind: ModuleKind, slot: number) => void;
  remove: (id: string) => void;
  treat: (crewId: string | null) => void;
  setPaused: (p: boolean) => void;
  setSpeed: (s: 1 | 2) => void;
  open: (p: Panel) => void;
  toggleMute: () => void;
}

export const useGame = create<Store>((set, get) => ({
  screen: 'title',
  game: null,
  paused: false,
  speed: 1,
  panel: null,
  notice: null,
  briefed: [],
  muted: false,
  sun: { status: 'loading', activity: 1 },
  difficulty: 'cadet',

  setSun: (sun) => set({ sun }),
  setDifficulty: (difficulty) => set({ difficulty }),

  start: () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { sun, difficulty } = get();
    set({ screen: 'game', game: createGame(seed, catalog, sun.activity, difficulty), paused: false, speed: 1, panel: null, notice: null, briefed: [] });
  },
  quit: () => set({ screen: 'title', game: null, panel: null }),

  tick: (realSeconds) => {
    const { game, paused, panel, speed, briefed } = get();
    if (!game || game.status !== 'playing' || paused || panel) return;
    let left = Math.min(realSeconds, 0.25) * (speed / SOL_SECONDS);
    let s = game;
    while (left > 1e-6 && s.status === 'playing') {
      const dt = Math.min(left, 0.02);
      s = step(s, dt);
      left -= dt;
    }
    if (s.pulse.hit !== game.pulse.hit) sfx.hit();
    if (s.pulse.brownout !== game.pulse.brownout) sfx.brownout();
    if (s.status === 'won' && game.status === 'playing') sfx.win();
    if (s.status === 'lost' && game.status === 'playing') sfx.lose();

    // The first time each kind of emergency shows up, stop the clock and explain it.
    const fresh = s.events.find((e) => e.phase === 'warned' && game.events.find((p) => p.id === e.id)?.phase === 'pending');
    if (fresh) {
      sfx.warning();
      if (!briefed.includes(fresh.kind)) {
        set({ game: s, panel: { type: 'brief', eventId: fresh.id }, briefed: [...briefed, fresh.kind] });
        return;
      }
    }
    set({ game: s });
  },

  toggle: (id) => {
    const { game } = get();
    if (!game) return;
    const r = toggleModule(game, id);
    if (r.ok) (r.state.modules.find((m) => m.id === id)?.on ? sfx.on : sfx.off)();
    else if (r.reason) sfx.denied();
    set({ game: r.state, notice: r.reason ? { text: r.reason, at: Date.now() } : get().notice });
  },
  build: (kind, slot) => {
    const { game } = get();
    if (!game) return;
    sfx.build();
    set({ game: build(game, kind, slot), panel: null });
  },
  remove: (id) => { const { game } = get(); if (game) set({ game: removeModule(game, id) }); },
  treat: (crewId) => { const { game } = get(); if (game) { sfx.on(); set({ game: setPatient(game, crewId) }); } },
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
  open: (panel) => set({ panel }),
  toggleMute: () => { const muted = !get().muted; setMuted(muted); set({ muted }); },
}));
