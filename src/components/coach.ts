import { pannedBy } from '../lib/camera';
import type { GameState } from '../engine/types';
import { MODULE_NAME, POWER_COST_OF, bedName, habReady, power } from '../engine/engine';

/**
 * M.A.R.V.'s hands-on lessons. Each step asks for one thing, points right at it
 * (see Guide.tsx), and is finished by doing it, or by pressing "Got it" when there is
 * nothing to do but read. Nothing ends on a timer, and the first-run training cannot be skipped.
 * Steps marked `pause` stop the clock and block every other button, so nothing can go wrong.
 */
export interface CoachState { game: GameState | null; picked: string | null; subject?: string }
export type CoachTarget =
  | 'pod' | 'life' | 'arrow' | 'find' | 'trip' | 'spot' | 'site' | 'module' | 'bed' | 'crew' | 'deposit' | 'upgrade' | 'edit' | 'none';
export interface CoachStep {
  say: (s: CoachState) => string;
  target: CoachTarget;
  pause: boolean;
  /** Finished when this turns true. Steps without it need the "Got it" button. */
  done?: (s: CoachState) => boolean;
  /** Show a ghost hand dragging the astronaut onto the target, on a loop. */
  drag?: boolean;
}
export interface Lesson {
  id: string;
  /** When this lesson should start by itself. The first lesson is started by the intro. */
  when: (s: CoachState) => boolean;
  /** The astronaut (or module) the lesson is about, if any. */
  subject?: (s: CoachState) => string | undefined;
  steps: CoachStep[];
}

/** The first-run training, in order. It must be finished once; after that it is remembered. */
export const TRAINING = ['start', 'place', 'builder'];

const lead = (s: CoachState) => s.game?.crew.find((c) => c.commander);
const who = (s: CoachState) => s.game?.crew.find((c) => c.id === s.subject);
const name = (s: CoachState) => who(s)?.name ?? lead(s)?.name ?? 'your astronaut';
const bed = (s: CoachState) => (s.game && bedName(s.game) !== 'the capsule' ? 'the Hab' : 'the capsule');
const tired = (s: CoachState) => s.game?.crew.find((c) => !c.out && !c.trip && c.arriving <= 0 && c.at !== 'hab' && c.energy < 45);
const grumpy = (s: CoachState) => s.game?.crew.find((c) => !c.out && c.mood < 40);
export const sites = (s: CoachState) => s.game?.modules.filter((m) => m.buildLeft > 0) ?? [];
const idleHand = (s: CoachState) => s.game?.crew.find((c) => !c.out && !c.trip && c.arriving <= 0 && !c.exhausted && c.energy > 25 && !s.game!.modules.some((m) => m.id === c.at && m.buildLeft > 0));
const switchable = (s: CoachState) => s.game?.modules.find((m) => m.buildLeft <= 0 && !m.on && !['pod', 'solar', 'battery', 'miner', 'rover', 'comms'].includes(m.kind) && !!s.game && POWER_COST_OF(m.kind) <= power(s.game).free && m.onSince === 0);
const builderAt = (s: CoachState) => sites(s).some((m) => s.game!.crew.some((c) => c.at === m.id));

export const LESSONS: Lesson[] = [
  {
    id: 'start', when: () => false, subject: (s) => lead(s)?.id,
    steps: [
      { say: () => 'This little capsule is your home on Mars. It keeps you warm.', target: 'pod', pause: true },
      { say: () => 'This bar is your air and food. It is going down! You will need to build more.', target: 'life', pause: true },
      { say: () => 'Let\'s look around the crater. Tap the arrow!', target: 'arrow', pause: true,
        done: () => pannedBy() > 200 },
      { say: () => 'Something sparkles! Tap the ? to explore it.', target: 'find', pause: true,
        done: (s) => !!s.game && (s.game.stats.finds > 0 || s.game.crew.some((c) => c.trip?.job.kind === 'find')) },
      { say: (s) => `${name(s)} is walking out to take a look. Watch!`, target: 'trip', pause: false,
        done: (s) => (s.game?.stats.finds ?? 0) > 0 },
    ],
  },
  {
    id: 'place', when: (s) => !!s.game && s.game.blueprints.length > 0 && !sites(s).length && s.game.modules.length <= 2,
    steps: [
      { say: (s) => `You got plans for a ${MODULE_NAME[s.game!.blueprints[0]]}! Tap the green spot to build it.`, target: 'spot', pause: true,
        done: (s) => sites(s).length > 0 },
    ],
  },
  {
    id: 'builder', when: (s) => sites(s).length > 0 && !builderAt(s) && !!idleHand(s), subject: (s) => idleHand(s)?.id,
    steps: [
      { say: (s) => `Nothing builds itself! Drag ${name(s)} onto the building site.`, target: 'site', pause: true, drag: true,
        done: (s) => sites(s).length === 0 || builderAt(s) },
      { say: (s) => `${name(s)} walks over and builds it. Watch the bar fill up!`, target: 'site', pause: false,
        done: (s) => !!s.game && s.game.modules.some((m) => m.kind !== 'pod' && m.buildLeft <= 0) },
    ],
  },
  {
    id: 'switch', when: (s) => !!switchable(s), subject: (s) => switchable(s)?.id,
    steps: [
      { say: () => 'You built it! Tap it to switch it on.', target: 'module', pause: true,
        done: (s) => !!s.game?.modules.find((m) => m.id === s.subject)?.on },
      { say: () => 'Every machine uses power. Power is never quite enough, so choose what to switch on.', target: 'none', pause: true },
    ],
  },
  {
    id: 'tired', when: (s) => !!tired(s), subject: (s) => tired(s)?.id,
    steps: [
      { say: (s) => `${name(s)} is sleepy! Drag ${name(s)} to ${bed(s)} for a nap.`, target: 'bed', pause: true, drag: true,
        done: (s) => who(s)?.at === 'hab' || !!who(s)?.out || !!who(s)?.trip },
    ],
  },
  {
    id: 'night', when: (s) => !!s.game && s.game.time - Math.floor(s.game.time) >= 0.72 && s.game.time > 1.5,
    steps: [
      { say: () => 'Night is falling. Astronauts sleep best at night, and working in the dark tires them out.', target: 'none', pause: true },
    ],
  },
  {
    id: 'grumpy', when: (s) => !!grumpy(s), subject: (s) => grumpy(s)?.id,
    steps: [
      { say: (s) => `${name(s)} is grumpy. Rest, warmth, food and friends cheer people up. Tap ${name(s)} twice to chat!`, target: 'crew', pause: true },
    ],
  },
  {
    id: 'crew2', when: (s) => !!s.game && s.game.crew.filter((c) => !c.out).length >= 2,
    steps: [
      { say: () => 'A new crewmate! Now one can work while the other sleeps.', target: 'none', pause: true },
    ],
  },
  {
    id: 'dig', when: (s) => !!s.game && habReady(s.game) && s.game.materials < 15 && s.game.deposits.some((d) => d.left > 0),
    steps: [
      { say: () => 'Rock piles make bricks for upgrades! Drag an astronaut onto a rock pile to dig.', target: 'deposit', pause: false,
        done: (s) => !!s.game?.crew.some((c) => c.trip?.job.kind === 'mine') || !!s.game?.rover?.trip },
    ],
  },
  {
    id: 'upgrade', when: (s) => !!s.game && s.game.materials >= 30 && habReady(s.game),
    steps: [
      { say: () => 'You have enough bricks! Tap the arrow to make a module better.', target: 'upgrade', pause: false,
        done: (s) => !!s.game?.modules.some((m) => m.upgrading) },
    ],
  },
  {
    id: 'zone', when: (s) => !!s.game?.modules.some((m) => m.kind === 'dome' && m.buildLeft <= 0),
    steps: [
      { say: () => 'Your Shield Dome only protects rooms in its blue zone. Use Edit layout to move rooms close to it.', target: 'edit', pause: true },
    ],
  },
  {
    id: 'rover', when: (s) => !!s.game?.rover,
    steps: [
      { say: () => 'Your rover is ready! Now when you tap a sparkle or a rock pile, the rover goes. It never gets tired.', target: 'none', pause: true },
    ],
  },
];

export interface CoachRun { lesson: string; step: number; subject?: string }
export const lessonOf = (id: string) => LESSONS.find((l) => l.id === id);
export const stepOf = (run: CoachRun | null): CoachStep | null => (run ? lessonOf(run.lesson)?.steps[run.step] ?? null : null);

/** Training progress for the little "Training 3 of 8" label. */
export function trainingStep(run: CoachRun | null): { n: number; of: number } | null {
  if (!run || !TRAINING.includes(run.lesson)) return null;
  let n = 0;
  let of = 0;
  for (const id of TRAINING) {
    const steps = lessonOf(id)?.steps.length ?? 0;
    if (id === run.lesson) n = of + run.step + 1;
    of += steps;
  }
  return { n, of };
}

// ---------- remembered between visits ----------

const TRAINED_KEY = 'sol-survivor:trained';
const SEEN_KEY = 'sol-survivor:lessons';
export const isTrained = () => { try { return localStorage.getItem(TRAINED_KEY) === '1'; } catch { return false; } };
export const markTrained = () => { try { localStorage.setItem(TRAINED_KEY, '1'); } catch { /* fine */ } };
export const loadSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]; } catch { return []; } };
export const saveSeen = (ids: string[]) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* fine */ } };
