import type { GameState } from '../engine/types';

/** M.A.R.V.'s hands-on training. The clock is stopped until it ends. */
export interface TourStep {
  say: (g: GameState) => string;
  /** What to point at. */
  target?: 'rooms' | 'power' | 'life' | 'crew' | 'greenhouse' | 'shield';
  /** If set, the step finishes by itself once the player has done the thing. */
  done?: (g: GameState, picked: string | null) => boolean;
}

const greenhouse = (g: GameState) => g.modules.find((m) => m.kind === 'greenhouse')!;

export const TOUR: TourStep[] = [
  { say: () => 'Hi Commander! I am M.A.R.V., your outpost robot. This is your home on Mars. Four astronauts live in these rooms.', target: 'rooms' },
  { say: () => 'These yellow blocks are all the power you have. Every room that is switched on uses some. You never have enough for everything.', target: 'power' },
  { say: () => 'Try it! Click the Greenhouse to switch it off.', target: 'greenhouse', done: (g) => !greenhouse(g).on },
  { say: () => 'Lights out! Now Life support is draining, because nothing is growing food. Click the Greenhouse again to switch it back on.', target: 'greenhouse', done: (g) => greenhouse(g).on },
  { say: () => 'Nice. Faces tell you how your crew feel. Click any astronaut to check their body signs.', target: 'crew', done: (_g, picked) => picked !== null },
  {
    say: (g) =>
      g.loadout.shield
        ? 'Last thing. When the Sun throws a storm at us, I will warn you. Switch on the Storm Shield. It is very hungry, so you must switch other rooms off to feed it.'
        : 'Last thing. You did not pack a Storm Shield, so solar storms will hurt the crew. Keep them warm and breathing, and they may still make it.',
    target: 'shield',
  },
];
