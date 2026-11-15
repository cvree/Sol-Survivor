import { pannedBy } from '../lib/camera';
import type { GameState } from '../engine/types';
import { MODULE_NAME, POWER_COST_OF, bedName, habReady, power } from '../engine/engine';

/**
 * M.A.R.V.'s hands-on lessons. Each one teaches a single idea by doing, and only
 * when it is needed: the first one right after landing, the others the first time
 * something happens (someone gets tired, night falls, someone gets grumpy...).
 * Steps marked `pause` stop the clock, so nothing bad happens while learning.
 */
export interface CoachState { game: GameState | null; picked: string | null; subject?: string }
export type CoachTarget = 'oxygen' | 'crew' | 'assign-oxygen' | 'assign-hab' | 'explore' | 'pod' | 'spot' | 'site' | 'build-btn' | 'edit' | 'none';
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

const lead = (s: CoachState) => s.game?.crew.find((c) => c.commander);
const who = (s: CoachState) => s.game?.crew.find((c) => c.id === s.subject);
const name = (s: CoachState) => who(s)?.name ?? lead(s)?.name ?? 'your astronaut';
const bed = (s: CoachState) => (s.game ? bedName(s.game) : 'the capsule');
const tired = (s: CoachState) => s.game?.crew.find((c) => !c.out && c.at !== 'hab' && c.energy < 45);
const grumpy = (s: CoachState) => s.game?.crew.find((c) => !c.out && c.mood < 40);
const sites = (s: CoachState) => s.game?.modules.filter((m) => m.buildLeft > 0) ?? [];
const idleHand = (s: CoachState) => s.game?.crew.find((c) => !c.out && !c.exhausted && !s.game!.modules.some((m) => m.id === c.at && m.buildLeft > 0));
const switchable = (s: CoachState) => s.game?.modules.find((m) => m.buildLeft <= 0 && !m.on && !['pod', 'solar', 'battery'].includes(m.kind) && !!s.game && POWER_COST_OF(m.kind) <= power(s.game).free && m.onSince === 0);

export const LESSONS: Lesson[] = [
  {
    id: 'start', when: () => false, subject: (s) => lead(s)?.id,
    steps: [
      { say: () => 'This capsule is all you have, Commander. It keeps you warm and makes 3 power. But its air tank will run out! Watch the Life support bar at the top.', target: 'pod', pause: true,
        done: (_s, ms) => ms > 8500 },
      { say: () => 'Earth will send cargo landers full of building plans, but you have to earn them. Drag the ground sideways to explore the crater!', target: 'explore', pause: true,
        done: () => pannedBy() > 260 },
      { say: () => 'See something sparkle? Tap it and you will walk out there to investigate. Every discovery brings the next lander closer.', target: 'none', pause: false,
        done: (s) => (s.game?.stats.finds ?? 0) > 0 },
    ],
  },
  {
    id: 'place', when: (s) => !!s.game && s.game.blueprints.length > 0 && !sites(s).length && s.game.modules.length <= 2,
    steps: [
      { say: (s) => `You earned plans for a ${MODULE_NAME[s.game!.blueprints[0]]}! Press a glowing green spot, or the Build button, to mark out a building site.`, target: 'spot', pause: true,
        done: (s) => sites(s).length > 0 },
    ],
  },
  {
    id: 'builder', when: (s) => sites(s).some((m) => !s.game!.crew.some((c) => c.at === m.id)) && !!idleHand(s), subject: (s) => idleHand(s)?.id,
    steps: [
      { say: (s) => `Nothing on Mars builds itself. Drag ${name(s)} onto the building site to build it. Building is hard work and uses energy!`, target: 'site', pause: true,
        done: (s) => sites(s).length === 0 || sites(s).some((m) => s.game!.crew.some((c) => c.at === m.id)) },
    ],
  },
  {
    id: 'switch', when: (s) => !!switchable(s), subject: (s) => switchable(s)?.id,
    steps: [
      { say: () => 'You built it! New modules start switched off. Tap it to switch it on. Every module uses power, and power is never quite enough.', target: 'none', pause: false,
        done: (s, ms) => ms > 9000 || !!s.game?.modules.find((m) => m.id === s.subject)?.on },
    ],
  },
  {
    id: 'dig', when: (s) => !!s.game && habReady(s.game) && s.game.materials < 15 && s.game.deposits.some((d) => d.left > 0),
    steps: [
      { say: () => 'See the rock piles out in the crater? Mars dirt (regolith) makes building bricks! Tap a rock pile, or drag an astronaut onto it. They will walk out, dig, and carry the bricks home.', target: 'none', pause: false,
        done: (s, ms) => ms > 12000 || !!s.game?.crew.some((c) => c.trip?.job.kind === 'mine') },
    ],
  },
  {
    id: 'upgrade', when: (s) => !!s.game && s.game.materials >= 30 && habReady(s.game),
    steps: [
      { say: () => 'You have enough bricks to upgrade! Tap the arrow on the Hab. A bigger Hab lets every other module level up too. Upgrades switch a module off until a builder finishes, so pick a calm moment.', target: 'none', pause: false,
        done: (s, ms) => ms > 12000 || !!s.game?.modules.some((m) => m.upgrading) },
    ],
  },
  {
    id: 'zone', when: (s) => !!s.game?.modules.some((m) => m.kind === 'dome' && m.buildLeft <= 0),
    steps: [
      { say: () => 'Your Shield Dome only protects crew inside its blue zone: its own column and the ones next to it. Press Edit layout to move modules where they are safe. Anyone outside in the crater gets no shield at all!', target: 'edit', pause: false,
        done: (_s, ms) => ms > 12000 },
    ],
  },
  {
    id: 'rover', when: (s) => !!s.game?.rover,
    steps: [
      { say: () => 'Your rover is ready! Now when you tap a discovery or a rock pile, the rover goes instead of an astronaut. It never gets tired, and radiation does not bother it.', target: 'none', pause: false,
        done: (_s, ms) => ms > 9000 },
    ],
  },
  {
    id: 'tired', when: (s) => !!tired(s), subject: (s) => tired(s)?.id,
    steps: [
      { say: (s) => `${name(s)} is getting tired! Tired astronauts work slower, and if they keep going they collapse. Drag ${name(s)} to ${bed(s)} to sleep.`, target: 'crew', pause: true,
        done: (s) => who(s)?.at === 'hab' },
      { say: (s) => `Sweet dreams, ${name(s)}! Sleep fills energy back up, fastest at night${bed(s) === 'the capsule' ? '. A real bed in a Hab is even better than the cramped capsule.' : '.'}`, target: 'none', pause: false,
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
      { say: (s) => `${name(s)} is grumpy (see the storm cloud?). Being tired, cold, cramped or overworked makes crew unhappy. Very unhappy crew stop working! Rest, warmth, fresh food and friends cheer them up.`, target: 'crew', pause: false,
        done: (_s, ms) => ms > 8000 },
    ],
  },
  {
    id: 'crew2', when: (s) => !!s.game && s.game.crew.filter((c) => !c.out).length >= 2,
    steps: [
      { say: () => 'A new crewmate! Now you can take turns: one works while the other sleeps. Everyone has their own trait, so tap them to see what makes them special.', target: 'none', pause: false,
        done: (_s, ms) => ms > 8000 },
    ],
  },
];

export interface CoachRun { lesson: string; step: number; subject?: string }
export const lessonOf = (id: string) => LESSONS.find((l) => l.id === id);
export const stepOf = (run: CoachRun | null): CoachStep | null => (run ? lessonOf(run.lesson)?.steps[run.step] ?? null : null);
