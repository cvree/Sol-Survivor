import { pannedBy } from '../lib/camera';
import type { GameState } from '../engine/types';

/**
 * M.A.R.V.'s hands-on lessons. Each one teaches a single idea by doing, and only
 * when it is needed: the first one right after landing, the others the first time
 * something happens (someone gets tired, night falls, someone gets grumpy...).
 * Steps marked `pause` stop the clock, so nothing bad happens while learning.
 */
export interface CoachState { game: GameState | null; picked: string | null; subject?: string }
export type CoachTarget = 'oxygen' | 'crew' | 'assign-oxygen' | 'assign-hab' | 'explore' | 'none';
export interface CoachStep {
  say: (s: CoachState) => string;
  target: CoachTarget;
  pause: boolean;
  done: (s: CoachState, ms: number) => boolean;
}
export interface Lesson {
  id: string;
  /** When this lesson should start by itself. The first lesson is started by the intro. */
  when: (s: CoachState) => boolean;
  /** The astronaut the lesson is about, if any. */
  subject?: (s: CoachState) => string | undefined;
  steps: CoachStep[];
}

const oxygen = (s: CoachState) => s.game?.modules.find((m) => m.kind === 'oxygen');
const lead = (s: CoachState) => s.game?.crew.find((c) => c.commander);
const who = (s: CoachState) => s.game?.crew.find((c) => c.id === s.subject);
const name = (s: CoachState) => who(s)?.name ?? lead(s)?.name ?? 'your astronaut';
const tired = (s: CoachState) => s.game?.crew.find((c) => !c.out && c.at !== 'hab' && c.energy < 45);
const grumpy = (s: CoachState) => s.game?.crew.find((c) => !c.out && c.mood < 40);

export const LESSONS: Lesson[] = [
  {
    id: 'start', when: () => false, subject: (s) => lead(s)?.id,
    steps: [
      { say: () => 'Lesson 1: every module needs power. Tap the Oxygen Maker to switch it OFF. Watch the yellow power blocks.', target: 'oxygen', pause: true,
        done: (s) => oxygen(s)?.on === false },
      { say: () => 'See? Power came back. Now tap it again to switch the air back ON. No air, no astronaut!', target: 'oxygen', pause: true,
        done: (s) => oxygen(s)?.on === true },
      { say: (s) => `Lesson 2: modules work twice as well with someone inside. Drag ${name(s)} into the Oxygen Maker. (Or tap ${name(s)} and pick it.)`, target: 'crew', pause: true,
        done: (s) => !!s.game && s.game.crew.some((c) => c.at === oxygen(s)?.id) },
      { say: (s) => `Working uses energy. See the green bar under ${name(s)}? It goes down while they work. Astronauts need sleep!`, target: 'none', pause: false,
        done: (_s, ms) => ms > 6500 },
      { say: () => 'Lesson 3: drag the ground sideways, or press an arrow, to explore. Real Mars discoveries are hiding out there!', target: 'explore', pause: true,
        done: () => pannedBy() > 260 },
      { say: () => 'You are on your own for now, Commander. Cargo landers will bring more crew. Keep yourself alive: if the commander dies, the mission is over!', target: 'none', pause: false,
        done: (_s, ms) => ms > 7000 },
    ],
  },
  {
    id: 'tired', when: (s) => !!tired(s), subject: (s) => tired(s)?.id,
    steps: [
      { say: (s) => `${name(s)} is getting tired! The energy bar is low. Tired astronauts work slower, and if they keep going they collapse. Drag ${name(s)} to the Hab to sleep.`, target: 'crew', pause: true,
        done: (s) => who(s)?.at === 'hab' },
      { say: (s) => `Sweet dreams, ${name(s)}! Sleep fills energy back up, fastest at night. When the bar is full again, send them back to work.`, target: 'none', pause: false,
        done: (_s, ms) => ms > 7000 },
    ],
  },
  {
    id: 'night', when: (s) => !!s.game && s.game.time - Math.floor(s.game.time) >= 0.72 && s.game.time > 1.5,
    steps: [
      { say: () => 'Night is falling on Mars. Astronauts sleep best at night, and working in the dark tires them out faster.', target: 'none', pause: false,
        done: (_s, ms) => ms > 6500 },
    ],
  },
  {
    id: 'grumpy', when: (s) => !!grumpy(s), subject: (s) => grumpy(s)?.id,
    steps: [
      { say: (s) => `${name(s)} is grumpy (see the storm cloud?). Being tired, cold or overworked makes crew unhappy. Very unhappy crew stop working! Rest, warmth, fresh food and friends cheer them up.`, target: 'crew', pause: false,
        done: (_s, ms) => ms > 8000 },
    ],
  },
  {
    id: 'crew2', when: (s) => !!s.game && s.game.crew.filter((c) => !c.out).length >= 2,
    steps: [
      { say: () => 'A new crewmate! Now you can take turns: one works while the other sleeps. Astronauts in the same room cheer each other up too.', target: 'none', pause: false,
        done: (_s, ms) => ms > 7500 },
    ],
  },
];

export interface CoachRun { lesson: string; step: number; subject?: string }
export const lessonOf = (id: string) => LESSONS.find((l) => l.id === id);
export const stepOf = (run: CoachRun | null): CoachStep | null => (run ? lessonOf(run.lesson)?.steps[run.step] ?? null : null);
