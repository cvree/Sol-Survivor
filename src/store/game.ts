import { create } from 'zustand';
import { catalog } from '../data/records';
import { SOL_SECONDS } from '../engine/constants';
import { acceptCargo, activeEvents, assign, build, createGame, grantReward, patch, power, step, stormDose, toggleModule, type Difficulty } from '../engine/engine';
import { GOALS, TIP_GOAL, markOf, nextGoal, type GoalMark } from '../engine/goals';
import type { GameState, ModuleKind } from '../engine/types';
import type { LiveSun } from '../lib/liveSun';
import { setMood, setMuted, sfx } from '../lib/sound';

/** The last stretch before a storm lands plays in slow motion: about 300 ms of real time. */
const SLOWMO_SOLS = 0.01;
const SLOWMO_RATE = 0.25;
/** How long the big moments hold the screen, in milliseconds. */
export const HOLD_SURVIVED = 2600;
export const HOLD_LANDER = 2400;

/** A moment that stops the clock and takes the whole screen for a couple of seconds. */
export type Moment =
  | { type: 'survived'; eventId: string; recordId: string; kind: 'flare' | 'cme'; blocked: number; stars: number; at: number }
  | { type: 'lander'; number: number; at: number };

let lastTick = 0;
let lastTuned = 0;
let landerShown = -1;
let holdTimer: ReturnType<typeof setTimeout> | undefined;

export type Panel =
  | { type: 'data'; recordId?: string }
  | { type: 'event'; eventId: string }
  | { type: 'cargo' }
  | { type: 'build'; cell?: number }
  | { type: 'log' }
  | null;

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
  /** True for the slow-motion beat just before a storm hits. */
  slowmo: boolean;
  moment: Moment | null;
  /** The mini-mission on screen, with the snapshot it counts from. */
  goal: { id: string; mark: GoalMark; value: number } | null;
  goalsDone: string[];
  /** The goal just finished, shown for a moment before the next one slides in. */
  goalFlash: { text: string; reward: 'part' | 'supplies'; at: number } | null;
  /** A goal to practise first, set when retrying after a loss. */
  tip: string | null;
  /** Something a crew member just said out loud (from the mission ticker). */
  bubble: { crewId: string; text: string; until: number } | null;
  /** Real time the power last became perfectly used, for a short cyan flourish. */
  tunedAt: number;
  setSun: (s: LiveSun) => void;
  setDifficulty: (d: Difficulty) => void;
  start: () => void;
  /** Straight back in after a loss: no intro, and the first mini-mission practises what went wrong. */
  retry: () => void;
  patch: (id: string) => void;
  endMoment: () => void;
  quit: () => void;
  tick: (realSeconds: number) => void;
  toggle: (id: string) => void;
  build: (kind: ModuleKind, cell?: number) => void;
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
  difficulty: 'easy',
  slowmo: false,
  moment: null,
  goal: null,
  goalsDone: [],
  goalFlash: null,
  tip: null,
  bubble: null,
  tunedAt: 0,

  setSun: (sun) => set({ sun }),
  setDifficulty: (difficulty) => set({ difficulty }),

  start: () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { sun, difficulty } = get();
    sfx.build();
    landerShown = -1;
    clearTimeout(holdTimer);
    set({
      screen: 'game', game: createGame(seed, catalog, sun.activity, difficulty),
      paused: false, speed: 1, panel: null, notice: null, picked: null, seenKinds: [], party: 0,
      tour: 0, slowmo: false, moment: null, goal: null, goalsDone: [], goalFlash: null, tip: null, bubble: null,
    });
  },
  retry: () => {
    const { game } = get();
    const cause = game?.lostCause;
    get().start();
    sfx.thump();
    set({ tour: null, tip: cause ? TIP_GOAL[cause] : null });
  },
  quit: () => { setMood('off'); clearTimeout(holdTimer); set({ screen: 'title', game: null, panel: null, tour: null, picked: null, moment: null, slowmo: false }); },

  endMoment: () => {
    const { moment, game } = get();
    if (!moment) return;
    clearTimeout(holdTimer);
    if (moment.type === 'lander' && game?.offer) set({ moment: null, panel: { type: 'cargo' }, picked: null });
    else set({ moment: null });
  },

  tick: (realSeconds) => {
    const { game, paused, panel, speed, tour, moment, goal, goalsDone, tip } = get();
    if (!game) return;
    if (game.status !== 'playing' || tour !== null) setMood(game.status === 'playing' ? 'calm' : 'off');
    else setMood(stormDose(game) > 0 ? 'storm' : activeEvents(game, 'dust').length ? 'dust' : game.events.some((e) => e.phase === 'warned') ? 'tension' : 'calm');
    if (game.status !== 'playing' || paused || panel || tour !== null || moment) return;

    // The fuse: the nearest warned storm ticks faster and higher as it closes in, then time slows.
    const now = performance.now();
    const incoming = game.events.filter((e) => e.phase === 'warned').sort((a, b) => a.startAt - b.startAt)[0];
    const leftSols = incoming ? incoming.startAt - game.time : Infinity;
    const slow = leftSols < SLOWMO_SOLS;
    if (incoming) {
      const near = Math.max(0, Math.min(1, 1 - leftSols / Math.max(0.2, incoming.startAt - incoming.warnAt)));
      if (now - lastTick > 950 - 800 * near) { lastTick = now; sfx.tick(near); }
    }
    if (slow && !get().slowmo) sfx.slowmo();

    let left = Math.min(realSeconds, 0.25) * (speed / SOL_SECONDS) * (slow ? SLOWMO_RATE : 1);
    let s = game;
    while (left > 1e-6 && s.status === 'playing' && !s.offer) {
      const dt = Math.min(left, 0.02);
      s = step(s, dt);
      left -= dt;
    }
    if (s.pulse.hit !== game.pulse.hit) sfx.hit();
    if (s.pulse.brownout !== game.pulse.brownout) sfx.brownout();
    if (s.pulse.built !== game.pulse.built) sfx.thump();
    if (s.status === 'won' && game.status === 'playing') sfx.win();
    if (s.status === 'lost' && game.status === 'playing') sfx.lose();
    const patch: Partial<Store> = { game: s, slowmo: slow && s.pulse.hit === game.pulse.hit };

    // Perfect power: every block in use and none wasted. The base hums.
    const p = power(s);
    const was = power(game);
    if (p.free === 0 && p.supply >= 4 && was.free !== 0 && now - lastTuned > 6000) { lastTuned = now; sfx.tuned(); patch.tunedAt = Date.now(); }

    // Mini-missions: one is always on screen. Finishing it pays out and the next one appears.
    if (s.status === 'playing') {
      let current = goal;
      if (!current) {
        const g = nextGoal(s, goalsDone, tip ?? undefined);
        if (g) current = { id: g.id, mark: markOf(s), value: 0 };
        if (tip) patch.tip = null;
      }
      const def = current && GOALS.find((g) => g.id === current!.id);
      if (current && def) {
        const r = def.progress(s, current.mark);
        if (r.value >= 1) {
          s = grantReward(s, def.reward);
          patch.game = s;
          sfx.reward();
          patch.goalsDone = [...goalsDone, def.id];
          patch.goalFlash = { text: def.text, reward: def.reward, at: Date.now() };
          current = null;
        } else current = { ...current, mark: r.reset ? markOf(s) : current.mark, value: r.value };
      }
      if (current !== goal) patch.goal = current;
    }

    // A radiation storm just ended: hold the screen and show how it went.
    const ended = s.events.find((e) => e.kind !== 'dust' && e.phase === 'done' && game.events.find((x) => x.id === e.id)?.phase === 'active');
    // Warnings and cargo landers stop the clock, so a young commander has time to think.
    const fresh = s.events.find((e) => e.phase === 'warned' && game.events.find((x) => x.id === e.id)?.phase === 'pending');
    if (ended && s.status === 'playing') {
      const blocked = ended.doseUnshielded > 0 ? Math.round(100 * (1 - ended.doseTaken / ended.doseUnshielded)) : 0;
      const stars = blocked >= 85 ? 3 : blocked >= 70 ? 2 : blocked >= 40 ? 1 : 0;
      if (stars > 0) { patch.party = Date.now(); sfx.win(); } else sfx.build();
      patch.moment = { type: 'survived', eventId: ended.id, recordId: ended.recordId, kind: ended.kind as 'flare' | 'cme', blocked, stars, at: Date.now() };
      patch.picked = null;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => get().endMoment(), HOLD_SURVIVED);
    } else if (fresh) {
      sfx.warning();
      patch.panel = { type: 'event', eventId: fresh.id };
      patch.picked = null;
    } else if (s.offer && s.status === 'playing') {
      patch.picked = null;
      if (landerShown !== s.offer.number) {
        // The lander comes down first; the cargo panel opens once it has landed.
        landerShown = s.offer.number;
        sfx.descent();
        patch.moment = { type: 'lander', number: s.offer.number, at: Date.now() };
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => get().endMoment(), HOLD_LANDER);
      } else patch.panel = { type: 'cargo' };
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
  patch: (id) => {
    const { game } = get();
    if (!game) return;
    const r = patch(game, id);
    if (r.ok) sfx.patch(); else sfx.denied();
    set({ game: r.state, notice: r.reason ? { text: r.reason, at: Date.now() } : get().notice });
  },
  build: (kind, cell) => {
    const { game } = get();
    if (!game) return;
    sfx.build();
    set({ game: build(game, kind, cell), panel: null });
  },
  assign: (crewId, moduleId) => { const { game } = get(); if (game) { sfx.assign(); set({ game: assign(game, crewId, moduleId) }); } },
  unpack: (picks) => {
    const { game } = get();
    if (!game) return;
    sfx.reward();
    set({ game: acceptCargo(game, picks), panel: null });
  },
  pick: (picked) => set({ picked }),
  setTour: (tour) => { sfx.build(); set({ tour }); },
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
  open: (panel) => {
    if (panel?.type === 'data' || panel?.type === 'log') sfx.ping();
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
