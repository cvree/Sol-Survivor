import type { GameState } from '../engine/types';

/** M.A.R.V.'s hands-on training. The clock is stopped until it ends. */
export interface TourStep {
  say: (g: GameState) => string;
  /** What to point at. */
  target?: 'map' | 'power' | 'life' | 'crew' | 'oxygen' | 'cargo';
  /** If set, the step finishes by itself once the player has done the thing. */
  done?: (g: GameState, picked: string | null) => boolean;
}

const oxygen = (g: GameState) => g.modules.find((m) => m.kind === 'oxygen')!;

export const TOUR: TourStep[] = [
  { say: () => 'Hi Commander! I am M.A.R.V., your base robot. This is your landing site on Mars: one Hab, one Solar Field, one Oxygen Maker and two astronauts.', target: 'map' },
  { say: () => 'These yellow blocks are all the power you have. Every module that is switched on uses some. You will never have enough for everything.', target: 'power' },
  { say: () => 'Try it! Click the Oxygen Maker to switch it off.', target: 'oxygen', done: (g) => !oxygen(g).on },
  { say: () => 'Lights out! Now Life support is draining, because nothing is making air. Click the Oxygen Maker again to switch it back on.', target: 'oxygen', done: (g) => oxygen(g).on },
  { say: () => 'Modules work better with someone inside. Click an astronaut, then send them to the Oxygen Maker.', target: 'crew', done: (g) => g.crew.some((c) => c.at === oxygen(g).id) },
  { say: () => 'Perfect! Soon a cargo lander will arrive from Earth with a new astronaut and new blueprints. Grow the base, and get a Shield Dome before the Sun storms. Good luck!', target: 'cargo' },
];
