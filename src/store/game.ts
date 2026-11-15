import { create } from 'zustand';
import { catalog } from '../data/records';
import { SOL_SECONDS } from '../engine/constants';
import { acceptCargo, assign, build, createGame, step, toggleModule, type Difficulty } from '../engine/engine';
import type { GameState, ModuleKind } from '../engine/types';
import type { LiveSun } from '../lib/liveSun';
import { setMuted, sfx } from '../lib/sound';

export type Panel =
  | { type: 'data'; recordId?: string }
  | { type: 'event'; eventId: string }
  | { type: 'cargo' }
  | { type: 'build'; cell: number }
  | null;

const TRAINED = 'sol-survivor-trained-v2';
const wasTrained = () => { try { return localStorage.getItem(TRAINED) === '1'; } catch { return false; } };

interface Store {
  screen: 'title' | 'game';
  game: GameState | null;
  paused: boolean;
  speed: 1 | 2;
  panel: Panel;
  /** Step of M.A.R.V.'s training, or null when it is not running. */
  tour: number | null;
  /** Crew member whose vitals card is open. */
  picked: string | null;
  notice: { text: string; at: number } | null;
  party: number;
  seenKinds: string[];
  muted: boolean;
  sun: LiveSun;
  difficulty: Difficulty;
  setSun: (s: LiveSun) => void;
  setDifficulty: (d: Difficulty) => void;
  start: (train?: boolean) => void;
  quit: () => void;
  tick: (realSeconds: number) => void;
  toggle: (id: string) => void;
  build: (kind: ModuleKind, cell: number) => void;
  assign: (crewId: string, moduleId: string) => void;
  unpack: (picks: ModuleKind[]) => void;
  pick: (crewId: string | null) => void;
  setTour: (n: number | null) => void;
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
  tour: null,
  picked: null,
  notice: null,
  party: 0,
  seenKinds: [],
  muted: false,
  sun: { status: 'loading', activity: 1 },
  difficulty: 'cadet',

  setSun: (sun) => set({ sun }),
  setDifficulty: (difficulty) => set({ difficulty }),

  start: (train) => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { sun, difficulty } = get();
    sfx.build();
    set({
      screen: 'game', game: createGame(seed, catalog, sun.activity, difficulty),
      paused: false, speed: 1, panel: null, notice: null, picked: null, seenKinds: [], party: 0,
      tour: train ?? !wasTrained() ? 0 : null,
    });
  },
  quit: () => set({ screen: 'title', game: null, panel: null, tour: null, picked: null }),

  tick: (realSeconds) => {
    const { game, paused, panel, speed, tour } = get();
    if (!game || game.status !== 'playing' || paused || panel || tour !== null) return;
    let left = Math.min(realSeconds, 0.25) * (speed / SOL_SECONDS);
    let s = game;
    while (left > 1e-6 && s.status === 'playing' && !s.offer) {
      const dt = Math.min(left, 0.02);
      s = step(s, dt);
      left -= dt;
    }
    if (s.pulse.hit !== game.pulse.hit) sfx.hit();
    if (s.pulse.brownout !== game.pulse.brownout) sfx.brownout();
    if (s.pulse.built !== game.pulse.built) sfx.build();
    if (s.status === 'won' && game.status === 'playing') sfx.win();
    if (s.status === 'lost' && game.status === 'playing') sfx.lose();
    const patch: Partial<Store> = { game: s };
    if (s.pulse.survived !== game.pulse.survived) { sfx.win(); patch.party = Date.now(); }

    // Warnings and cargo landers stop the clock, so a young commander has time to think.
    const fresh = s.events.find((e) => e.phase === 'warned' && game.events.find((p) => p.id === e.id)?.phase === 'pending');
    if (fresh) {
      sfx.warning();
      patch.panel = { type: 'event', eventId: fresh.id };
      patch.picked = null;
    } else if (s.offer && s.status === 'playing') {
      sfx.win();
      patch.panel = { type: 'cargo' };
      patch.picked = null;
    }
    set(patch);
  },

  toggle: (id) => {
    const { game } = get();
    if (!game) return;
    const r = toggleModule(game, id);
    if (r.ok) (r.state.modules.find((m) => m.id === id)?.on ? sfx.on : sfx.off)();
    else if (r.reason) sfx.denied();
    set({ game: r.state, notice: r.reason ? { text: r.reason, at: Date.now() } : get().notice });
  },
  build: (kind, cell) => {
    const { game } = get();
    if (!game) return;
    sfx.build();
    set({ game: build(game, kind, cell), panel: null });
  },
  assign: (crewId, moduleId) => { const { game } = get(); if (game) { sfx.on(); set({ game: assign(game, crewId, moduleId) }); } },
  unpack: (picks) => {
    const { game } = get();
    if (!game) return;
    sfx.build();
    set({ game: acceptCargo(game, picks), panel: null });
  },
  pick: (picked) => set({ picked }),
  setTour: (tour) => {
    if (tour === null) { try { localStorage.setItem(TRAINED, '1'); } catch { /* private mode */ } }
    set({ tour });
  },
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
  open: (panel) => {
    const { panel: was, seenKinds, game } = get();
    if (was?.type === 'cargo' && game?.offer) return; // the lander must be unpacked first
    if (!panel && was?.type === 'event' && game) {
      const kind = game.events.find((e) => e.id === was.eventId)?.kind;
      if (kind && !seenKinds.includes(kind)) set({ seenKinds: [...seenKinds, kind] });
    }
    set({ panel });
  },
  toggleMute: () => { const muted = !get().muted; setMuted(muted); set({ muted }); },
}));
