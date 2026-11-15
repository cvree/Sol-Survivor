import { FIRST_GOAL_CARGO_BOOST } from './constants';
import { SPECIALIST, alive, habReady, power, workersIn } from './engine';
import type { Cause, GameState } from './types';
import { triage } from './vitals';

/**
 * Mini-missions: one small goal is always on screen. Pure rules, so they can be tested.
 * `mark` is a snapshot taken when the goal started, for goals that count from "now".
 */
export interface GoalMark { time: number; science: number; eventsDone: number }
export interface Goal {
  id: string;
  text: string;
  /** What Earth sends when it is done. Every goal also brings the next lander closer. */
  reward: 'part' | 'supplies';
  /** How much closer the next lander comes. Defaults to GOAL_CARGO_BOOST. */
  boost?: number;
  /** Can this goal be worked on right now? */
  can: (s: GameState) => boolean;
  /** 0-1. `reset` asks the caller to take a fresh mark (the streak broke). */
  progress: (s: GameState, mark: GoalMark) => { value: number; reset?: boolean };
}

const has = (s: GameState, kind: string) => s.modules.some((m) => m.kind === kind && m.buildLeft <= 0);
const done01 = (ok: boolean) => ({ value: ok ? 1 : 0 });
const streak = (s: GameState, mark: GoalMark, sols: number, holding: boolean) =>
  holding ? { value: Math.min(1, (s.time - mark.time) / sols) } : { value: 0, reset: true };
const stormsDone = (s: GameState) => s.events.filter((e) => e.kind !== 'dust' && e.phase === 'done');
const blockedShare = (e: GameState['events'][number]) => (e.doseUnshielded > 0 ? 1 - e.doseTaken / e.doseUnshielded : 0);

export const markOf = (s: GameState): GoalMark => ({ time: s.time, science: s.science, eventsDone: stormsDone(s).length });

export const GOALS: Goal[] = [
  {
    id: 'first-find', text: 'Explore the crater and make your first discovery', reward: 'part', boost: FIRST_GOAL_CARGO_BOOST,
    can: () => true,
    progress: (s) => done01(s.stats.finds > 0),
  },
  {
    id: 'first-build', text: 'Build your first module (drag an astronaut onto the site)', reward: 'supplies',
    can: (s) => s.blueprints.length > 0 || s.modules.some((m) => m.buildLeft > 0),
    progress: (s) => done01(s.modules.some((m) => m.kind !== 'pod' && m.buildLeft <= 0)),
  },
  {
    id: 'staff-oxygen', text: 'Send an astronaut to work in the Oxygen Maker', reward: 'supplies',
    can: (s) => has(s, 'oxygen') && s.modules.some((m) => m.kind === 'oxygen' && m.on),
    progress: (s) => done01(s.modules.some((m) => m.kind === 'oxygen' && m.on && workersIn(s, m.id).length > 0)),
  },
  {
    id: 'rest-up', text: 'Let an astronaut sleep until their energy is full', reward: 'part',
    can: (s) => s.crew.some((c) => !c.out && c.energy < 60),
    progress: (s) => done01(s.crew.some((c) => !c.out && c.at === 'hab' && c.energy >= 99)),
  },
  {
    id: 'botanist-hydro', text: 'Get a Botanist into Hydroponics', reward: 'supplies',
    can: (s) => has(s, 'hydro') && alive(s).some((c) => c.role === 'Botanist'),
    progress: (s) => done01(s.modules.some((m) => m.kind === 'hydro' && m.on && workersIn(s, m.id).some((c) => c.role === 'Botanist'))),
  },
  {
    id: 'zero-spare', text: 'Use every bit of power: get to 0 spare', reward: 'part',
    can: (s) => power(s).supply >= 6,
    progress: (s) => { const p = power(s); return done01(p.free === 0 && p.supply > 0); },
  },
  {
    id: 'block-80', text: 'Block 80% of the next radiation storm', reward: 'part',
    can: (s) => has(s, 'dome') && s.events.some((e) => e.kind !== 'dust' && e.phase !== 'done'),
    progress: (s, mark) => done01(stormsDone(s).slice(mark.eventsDone).some((e) => blockedShare(e) >= 0.8)),
  },
  {
    id: 'life-50', text: 'Keep Life support above 50 for 3 sols', reward: 'supplies',
    can: (s) => s.modules.some((m) => m.kind === 'oxygen' && m.buildLeft <= 0),
    progress: (s, mark) => streak(s, mark, 3, s.life > 50),
  },
  {
    id: 'science-10', text: 'Do 10 points of science in the lab', reward: 'part',
    can: (s) => has(s, 'lab'),
    progress: (s, mark) => ({ value: Math.min(1, (s.science - mark.science) / 10) }),
  },
  {
    id: 'all-specialists', text: 'Put every specialist in their best job', reward: 'supplies',
    can: (s) => s.modules.filter((m) => SPECIALIST[m.kind] && m.on).length >= 2,
    progress: (s) => {
      const rooms = s.modules.filter((m) => SPECIALIST[m.kind] && m.kind !== 'medbay' && m.on);
      return done01(rooms.length >= 2 && rooms.every((m) => workersIn(s, m.id).some((c) => c.role === SPECIALIST[m.kind])));
    },
  },
  {
    id: 'all-green', text: 'Keep every astronaut feeling good for 2 sols', reward: 'supplies',
    can: (s) => s.crew.length >= 2,
    progress: (s, mark) => streak(s, mark, 2, alive(s).every((c) => triage(c) === 'green')),
  },
  {
    id: 'crew-5', text: 'Grow the crew to 5 astronauts', reward: 'part',
    can: (s) => s.crew.length >= 3,
    progress: (s) => ({ value: Math.min(1, alive(s).length / 5) }),
  },
  {
    id: 'life-80', text: 'Fill Life support to 80', reward: 'part',
    can: (s) => s.crew.length >= 4,
    progress: (s) => ({ value: Math.min(1, s.life / 80) }),
  },
  {
    id: 'hab-warm', text: 'Keep the Hab switched on for 4 sols', reward: 'supplies',
    can: (s) => habReady(s),
    progress: (s, mark) => streak(s, mark, 4, s.modules.some((m) => m.kind === 'hab' && m.on)),
  },
];

/** After a loss, the first goal of the retry practises the thing that went wrong. */
export const TIP_GOAL: Record<Cause, string> = { air: 'life-50', cold: 'hab-warm', radiation: 'block-80' };
/** The opening missions always come first and in order: they teach how to earn the base. */
export const OPENING = ['first-find', 'first-build'];

/** The next goal to show: the first one not yet done that can be worked on now. */
export function nextGoal(s: GameState, doneIds: string[], prefer?: string): Goal | null {
  const open = GOALS.filter((g) => !doneIds.includes(g.id));
  const opening = open.find((g) => OPENING.includes(g.id) && g.can(s));
  if (opening && !prefer) return opening;
  const first = open.find((g) => g.id === prefer);
  if (first) return first;
  return open.find((g) => g.can(s) && g.progress(s, markOf(s)).value < 1) ?? open.find((g) => g.can(s)) ?? null;
}
