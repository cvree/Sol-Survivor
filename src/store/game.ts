import { create } from 'zustand';
import { catalog } from '../data/records';
import { EXPLORER_FINDS, FIND_EVERY_SOLS, SOL_SECONDS } from '../engine/constants';
import { activeFinds, findById, findOrder, loadAlbum, saveAlbum } from '../data/discoveries';
import { acceptCargo, activeEvents, assign, build, canGoOut, cheer, collectBin, createGame, grantReward, moveModule, patch, power, sendOut, startUpgrade, step, stormDose, toggleModule, type Difficulty } from '../engine/engine';
import { saveRecord } from '../lib/records';
import { CHAT, HIGH_FIVE, PEP_TALK } from '../data/characters';
import { takeBonus } from '../lib/daily';
import { LESSONS, TRAINING, isTrained, lessonOf, loadSeen, markTrained, saveSeen, stepOf, type CoachRun } from '../components/coach';
import { glideTo, homeX, resetPanned } from '../lib/camera';
import { GOALS, TIP_GOAL, markOf, nextGoal, type GoalMark } from '../engine/goals';
import type { GameState, ModuleKind } from '../engine/types';
import type { LiveSun } from '../lib/liveSun';
import { isMuted, setMood, setMusic, setMuted, sfx } from '../lib/sound';

/** The last stretch before a storm lands plays in slow motion: about 300 ms of real time. */
const SLOWMO_SOLS = 0.01;
const SLOWMO_RATE = 0.25;
/** How long the big moments hold the screen, in milliseconds. */
export const HOLD_SURVIVED = 2600;
export const HOLD_LANDER = 2400;

/** A moment that stops the clock and takes the whole screen for a couple of seconds. */
export type Moment =
  | { type: 'survived'; eventId: string; recordId: string; kind: 'flare' | 'cme'; blocked: number; stars: number; at: number }
  | { type: 'lander'; number: number; at: number }
  | { type: 'find'; id: string; isNew: boolean; at: number }
  | { type: 'died'; crewId: string; at: number };

/** Who to send out: the rover if it is free, otherwise the most rested astronaut, preferring ones who are resting. */
function pickAgent(game: GameState): string | null {
  if (game.rover && !game.rover.trip) return 'rover';
  const busy = (c: GameState['crew'][number]) => (c.at === 'hab' ? 0 : game.modules.some((m) => m.id === c.at && m.buildLeft > 0) ? 2 : 1);
  const free = game.crew.filter(canGoOut).sort((a, b) => busy(a) - busy(b) || b.energy - a.energy);
  return free[0]?.id ?? null;
}

/**
 * During a paused lesson step, only the thing M.A.R.V. asked for works.
 * A stray tap on something else (a rock pile next to the sparkle, say) does nothing,
 * so the lesson can never get stuck.
 */
type Act = 'collect' | 'dig' | 'assign' | 'toggle' | 'build' | 'other';
const ALLOW: Partial<Record<string, Act[]>> = { find: ['collect'], deposit: ['dig'], site: ['assign'], bed: ['assign'], module: ['toggle'], spot: ['build'] };
function lessonAllows(act: Act): boolean {
  const { coach, tour } = useGame.getState();
  if (tour === 0) return false;
  const step = stepOf(coach);
  if (!step?.pause) return true;
  return !!ALLOW[step.target]?.includes(act);
}

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
  | { type: 'finds' }
  | { type: 'upgrade'; id: string }
  | { type: 'records' }
  | { type: 'daily' }
  | null;

interface Store {
  /** title, then pick your commander, then a short briefing, then the game. */
  screen: 'title' | 'pick' | 'brief' | 'game';
  /** The astronaut the player chose to be. */
  commander: string;
  /** The lesson M.A.R.V. is teaching right now, or null. */
  coach: CoachRun | null;
  coachAt: number;
  /** Lessons already taught, so each one runs only once. */
  lessonsSeen: string[];
  findsOrder: string[];
  findsActive: string[];
  findsGot: string[];
  /** Every discovery ever made, kept between missions. */
  album: string[];
  albumSeen: number;
  /** Layout editing: the clock stops and modules can be moved. */
  editing: boolean;
  /** Module picked up in the layout editor (click to pick, click a spot to drop). */
  moving: string | null;
  /** Where the last finished mission landed on the leaderboard (0 = not on it). */
  lastRank: number;
  /** Today's Sol Check head start was applied to this mission. */
  sharpMind: boolean;
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
  /** Go from the title to choosing a commander. */
  begin: () => void;
  chooseCommander: (id: string) => void;
  /** Send someone out to a discovery (by find id). */
  collect: (id: string, who?: string) => void;
  /** Send someone out to dig at a rock pile. */
  dig: (depositId: string, who?: string) => void;
  emptyBin: (id: string) => void;
  /** Spend a moment with an astronaut. */
  cheerUp: (id: string, kind: 'chat' | 'highfive' | 'peptalk') => void;
  /** What an astronaut just said to the commander. */
  said: { crewId: string; text: string; at: number } | null;
  upgrade: (id: string) => void;
  setEditing: (on: boolean) => void;
  pickToMove: (id: string | null) => void;
  move: (id: string, cell: number) => void;
  setCoach: (run: CoachRun | null) => void;
  /** The "Got it" button: finish a step that only needed reading. */
  coachNext: () => void;
  /** Straight back in after a loss: no intro, and the first mini-mission practises what went wrong. */
  retry: () => void;
  patch: (id: string) => void;
  endMoment: () => void;
  quit: () => void;
  tick: (realSeconds: number) => void;
  toggle: (id: string) => void;
  build: (kind: ModuleKind, cell?: number) => void;
  assign: (crewId: string, moduleId: string) => void;
  unpack: (picks: ModuleKind[], crewId?: string | null) => void;
  pick: (crewId: string | null) => void;
  setTour: (n: number | null) => void;
  setPaused: (p: boolean) => void;
  setSpeed: (s: 1 | 2) => void;
  open: (p: Panel) => void;
  toggleMute: () => void;
}

export const useGame = create<Store>((set, get) => ({
  screen: 'title',
  commander: 'ada',
  coach: null,
  coachAt: 0,
  lessonsSeen: [],
  findsOrder: [],
  findsActive: [],
  findsGot: [],
  album: loadAlbum(),
  albumSeen: loadAlbum().length,
  editing: false,
  moving: null,
  said: null,
  lastRank: 0,
  sharpMind: false,
  game: null,
  paused: false,
  speed: 1,
  panel: null,
  tour: null,
  picked: null,
  notice: null,
  party: 0,
  seenKinds: [],
  muted: isMuted(),
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

  begin: () => { sfx.build(); set({ screen: 'pick', panel: null }); },
  chooseCommander: (commander) => { sfx.reward(); set({ commander, screen: 'brief' }); },
  setCoach: (coach) => set({ coach, coachAt: Date.now() }),
  coachNext: () => {
    const { coach } = get();
    if (!coach) return;
    const steps = lessonOf(coach.lesson)?.steps.length ?? 0;
    sfx.learn();
    if (coach.step + 1 < steps) get().setCoach({ ...coach, step: coach.step + 1 });
    else { if (coach.lesson === TRAINING[TRAINING.length - 1]) markTrained(); get().setCoach(null); }
  },

  start: () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { sun, difficulty, commander, album } = get();
    // The first-run training happens once. After that the intro is skipped and lessons are remembered.
    const trained = isTrained();
    const seen = loadSeen().filter((id) => !TRAINING.includes(id));
    sfx.build();
    landerShown = -1;
    clearTimeout(holdTimer);
    resetPanned();
    const order = findOrder(seed, album);
    let fresh = createGame(seed, catalog, sun.activity, difficulty, commander);
    // Solved today's Sol Check? A sharp mind starts with a few bricks and a spare part.
    const sharp = takeBonus();
    if (sharp) fresh = { ...fresh, materials: fresh.materials + 10, spareParts: fresh.spareParts + 1 };
    set({ sharpMind: sharp, editing: false, moving: null, lastRank: 0,
      coach: null, findsOrder: order, findsActive: activeFinds(order, 1), findsGot: [],
      screen: 'game', game: fresh,
      paused: false, speed: 1, panel: null, notice: null, picked: null, seenKinds: [], party: 0,
      tour: trained ? null : 0, lessonsSeen: trained ? [...seen, ...TRAINING] : seen, slowmo: false, moment: null, goal: null, goalsDone: [], goalFlash: null, tip: null, bubble: null,
    });
  },
  retry: () => {
    const { game } = get();
    const cause = game?.lostCause;
    get().start();
    sfx.thump();
    set({ tip: cause ? TIP_GOAL[cause] : null });
  },
  quit: () => { setMood('off'); set({ coach: null }); clearTimeout(holdTimer); set({ screen: 'title', game: null, panel: null, tour: null, picked: null, moment: null, slowmo: false }); },

  endMoment: () => {
    const { moment, game } = get();
    if (!moment) return;
    clearTimeout(holdTimer);
    if (moment.type === 'lander' && game?.offer) set({ moment: null, panel: { type: 'cargo' }, picked: null });
    else if (moment.type === 'died') { glideTo(homeX()); set({ moment: null }); }
    else set({ moment: null });
  },

  tick: (realSeconds) => {
    const { game, paused, panel, speed, tour, moment, goal, goalsDone, tip } = get();
    if (!game) return;
    if (game.status !== 'playing' || tour !== null) setMood(game.status === 'playing' ? 'calm' : 'off');
    else setMood(stormDose(game) > 0 ? 'storm' : activeEvents(game, 'dust').length ? 'dust' : game.events.some((e) => e.phase === 'warned') ? 'tension' : 'calm');
    // The music follows the story: bright while building, dramatic in a storm, and an ending for the debrief.
    setMusic(game.status === 'won' ? 'win' : game.status === 'lost' ? 'lost'
      : stormDose(game) > 0 || game.events.some((e) => e.kind !== 'dust' && e.phase === 'warned') ? 'storm'
      : activeEvents(game, 'dust').length ? 'dust' : 'base');
    // M.A.R.V.'s lessons move on as soon as the player has done the thing asked,
    // and a new lesson starts the first time it is needed.
    const { coach, lessonsSeen, picked } = get();
    if (coach) {
      const step = stepOf(coach);
      const steps = lessonOf(coach.lesson)?.steps.length ?? 0;
      if (step?.done?.({ game, picked, subject: coach.subject })) {
        sfx.learn();
        const last = coach.step + 1 >= steps;
        if (last && coach.lesson === TRAINING[TRAINING.length - 1]) markTrained();
        get().setCoach(last ? null : { ...coach, step: coach.step + 1 });
      }
    } else if (tour === null && game.status === 'playing' && !moment && !panel && !get().editing) {
      const cs = { game, picked };
      const next = LESSONS.find((l) => !lessonsSeen.includes(l.id) && l.when(cs));
      if (next) {
        sfx.ping();
        const seen = [...lessonsSeen, next.id];
        set({ lessonsSeen: seen });
        saveSeen([...new Set([...loadSeen(), ...seen.filter((id) => !TRAINING.includes(id))])]);
        get().setCoach({ lesson: next.id, step: 0, subject: next.subject?.(cs) });
      }
    }
    // The clock waits while the commander is learning.
    const learning = !!stepOf(get().coach)?.pause;
    if (game.status !== 'playing' || paused || panel || tour !== null || moment || learning || get().editing) return;

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
    if (s.pulse.built !== game.pulse.built) sfx.built();
    // Someone got to where they were sent: a little hop.
    if (s.crew.some((c) => c.arriving <= 0 && (game.crew.find((x) => x.id === c.id)?.arriving ?? 0) > 0 && !c.trip)) sfx.land();
    if (s.status === 'won' && game.status === 'playing') sfx.win();
    if (s.status === 'lost' && game.status === 'playing') sfx.lose();
    if (s.pulse.delivered !== game.pulse.delivered) sfx.reward();
    if (s.pulse.upgraded !== game.pulse.upgraded) { sfx.thump(); sfx.win(); }
    const patch: Partial<Store> = { game: s, slowmo: slow && s.pulse.hit === game.pulse.hit };
    // The mission is over: put it on the leaderboard.
    if (s.status !== 'playing' && game.status === 'playing') {
      const lead = s.crew.find((c) => c.commander);
      patch.lastRank = saveRecord({ sols: Math.min(30, Math.floor(s.time) - (s.status === 'won' ? 1 : 0)), won: s.status === 'won', commander: lead?.name ?? '?', difficulty: s.difficulty, crew: s.crew.length, modules: s.modules.length, finds: s.stats.finds, date: new Date().toISOString().slice(0, 10) });
    }
    // An astronaut (or the rover) came home with a discovery: celebrate it.
    if (s.foundLog.length > game.foundLog.length && s.status === 'playing') {
      const id = s.foundLog[s.foundLog.length - 1];
      const { album } = get();
      const isNew = !album.includes(id);
      const nextAlbum = isNew ? [...album, id] : album;
      if (isNew) saveAlbum(nextAlbum);
      sfx.discover();
      clearTimeout(holdTimer);
      set({ ...patch, album: nextAlbum, moment: { type: 'find', id, isNew, at: Date.now() }, picked: null });
      return;
    }

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
          s = grantReward(s, def.reward, def.boost);
          patch.game = s;
          sfx.reward();
          patch.goalsDone = [...goalsDone, def.id];
          patch.goalFlash = { text: def.text, reward: def.reward, at: Date.now() };
          current = null;
        } else current = { ...current, mark: r.reset ? markOf(s) : current.mark, value: r.value };
      }
      if (current !== goal) patch.goal = current;
    }

    // New things to discover turn up as the sols go by.
    const nowActive = activeFinds(get().findsOrder, s.time + (s.crew.some((c) => c.trait === 'explorer' && !c.out) ? EXPLORER_FINDS * FIND_EVERY_SOLS : 0));
    if (nowActive.length !== get().findsActive.length) patch.findsActive = nowActive;

    // A crewmate died: stop and let it land. If it was the commander, the debrief takes over.
    const dead = s.crew.find((c) => c.out && !game.crew.find((x) => x.id === c.id)?.out);
    if (dead && s.status === 'playing') {
      sfx.mourn();
      clearTimeout(holdTimer);
      patch.moment = { type: 'died', crewId: dead.id, at: Date.now() };
      patch.picked = null;
      set(patch);
      return;
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
    if (!game || !lessonAllows('toggle')) return;
    const r = toggleModule(game, id);
    if (r.ok) (r.state.modules.find((m) => m.id === id)?.on ? sfx.on : sfx.off)();
    else if (r.reason) sfx.denied();
    set({ game: r.state, notice: r.reason ? { text: r.reason, at: Date.now() } : get().notice });
  },
  collect: (id, who) => {
    const { game, findsActive, findsGot, moment, panel } = get();
    const f = findById(id);
    if (!lessonAllows('collect')) return;
    if (!game || !f || game.status !== 'playing' || moment || panel || !findsActive.includes(id) || findsGot.includes(id)) return;
    const agent = who ?? pickAgent(game);
    if (!agent) { sfx.denied(); set({ notice: { text: 'Everyone is busy or too tired to go out. Build a Rover Garage, or let someone rest.', at: Date.now() } }); return; }
    const r = sendOut(game, agent, { kind: 'find', id, reward: f.reward, title: f.title }, f.layer === 'roam' ? 0.5 : f.x);
    if (!r.ok) { sfx.denied(); set({ notice: r.reason ? { text: r.reason, at: Date.now() } : get().notice }); return; }
    sfx.assign();
    const name = agent === 'rover' ? 'The rover' : game.crew.find((c) => c.id === agent)?.name;
    set({ game: r.state, findsGot: [...findsGot, id], picked: null, notice: { text: `${name} is heading out to investigate!`, at: Date.now() } });
  },
  dig: (depId, who) => {
    const { game } = get();
    const d = game?.deposits.find((x) => x.id === depId);
    if (!game || !d || !lessonAllows('dig')) return;
    const agent = who ?? pickAgent(game);
    if (!agent) { sfx.denied(); set({ notice: { text: 'Everyone is busy or too tired to go out.', at: Date.now() } }); return; }
    const r = sendOut(game, agent, { kind: 'mine', dep: depId }, d.x);
    if (!r.ok) { sfx.denied(); set({ notice: r.reason ? { text: r.reason, at: Date.now() } : get().notice }); return; }
    sfx.assign();
    const name = agent === 'rover' ? 'The rover' : game.crew.find((c) => c.id === agent)?.name;
    set({ game: r.state, picked: null, notice: { text: `${name} is heading out to dig regolith bricks.`, at: Date.now() } });
  },
  cheerUp: (id, kind) => {
    const { game } = get();
    if (!game) return;
    const r = cheer(game, id, kind);
    if (!r.ok) { sfx.denied(); set({ notice: r.reason ? { text: r.reason, at: Date.now() } : get().notice }); return; }
    const lines = CHAT[id] ?? ['Thanks, Commander!'];
    const text = kind === 'chat' ? lines[Math.floor(Math.random() * lines.length)] : kind === 'highfive' ? HIGH_FIVE[id] ?? 'High five!' : PEP_TALK[id] ?? 'Thanks, Commander! I needed that.';
    if (kind === 'chat') sfx.pop(); else if (kind === 'highfive') sfx.reward(); else sfx.win();
    set({ game: r.state, said: { crewId: id, text, at: Date.now() }, bubble: { crewId: id, text, until: Date.now() + 3500 } });
  },
  emptyBin: (id) => {
    const { game } = get();
    if (!game || !lessonAllows('other')) return;
    const next = collectBin(game, id);
    if (next !== game) { sfx.reward(); set({ game: next }); }
  },
  upgrade: (id) => {
    const { game } = get();
    if (!game || !lessonAllows('other')) return;
    const r = startUpgrade(game, id);
    if (r.ok) { sfx.thump(); set({ game: r.state, panel: null }); }
    else { sfx.denied(); set({ notice: r.reason ? { text: r.reason, at: Date.now() } : get().notice }); }
  },
  setEditing: (editing) => { sfx.build(); set({ editing, moving: null, picked: null }); },
  pickToMove: (moving) => { if (moving) sfx.on(); set({ moving }); },
  move: (id, cell) => {
    const { game } = get();
    if (!game) return;
    const next = moveModule(game, id, cell);
    if (next !== game) { sfx.thump(); set({ game: next, moving: null }); } else sfx.denied();
  },
  patch: (id) => {
    const { game } = get();
    if (!game || !lessonAllows('other')) return;
    const r = patch(game, id);
    if (r.ok) sfx.patch(); else sfx.denied();
    set({ game: r.state, notice: r.reason ? { text: r.reason, at: Date.now() } : get().notice });
  },
  build: (kind, cell) => {
    const { game } = get();
    if (!game || !lessonAllows('build')) return;
    sfx.build();
    set({ game: build(game, kind, cell), panel: null });
  },
  assign: (crewId, moduleId) => { const { game } = get(); if (game && lessonAllows('assign')) {
    const next = assign(game, crewId, moduleId);
    if (next === game) { sfx.denied(); set({ notice: { text: 'There is no room to work there.', at: Date.now() } }); return; }
    sfx.assign();
    set({ game: next });
  } },
  unpack: (picks, crewId) => {
    const { game } = get();
    if (!game) return;
    sfx.reward();
    set({ game: acceptCargo(game, picks, crewId), panel: null });
  },
  pick: (picked) => set({ picked }),
  setTour: (tour) => {
    sfx.build();
    // After the first dome, M.A.R.V. coaches one thing at a time, by doing.
    if (tour !== 0 && get().tour === 0) tour = null;
    if (tour === null && get().tour !== null) {
      const lead = get().game?.crew.find((c) => c.commander)?.id;
      set({ tour, coach: { lesson: 'start', step: 0, subject: lead }, coachAt: Date.now(), lessonsSeen: [...new Set([...get().lessonsSeen, 'start'])] });
    }
    else set({ tour });
  },
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
  open: (panel) => {
    if (panel?.type === 'data' || panel?.type === 'log' || panel?.type === 'finds') sfx.ping();
    if (panel?.type === 'finds') set({ albumSeen: get().album.length });
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
