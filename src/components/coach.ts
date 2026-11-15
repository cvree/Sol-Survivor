import { pannedBy } from '../lib/camera';
import type { GameState } from '../engine/types';

/**
 * M.A.R.V.'s hands-on lessons, one at a time, right after the first dome.
 * Each step waits until the player has actually done it. The clock is stopped
 * for the steps marked `pause`, so nothing bad can happen while learning.
 */
interface CoachState { game: GameState | null; picked: string | null }
export interface CoachStep {
  say: (s: CoachState) => string;
  /** What to make glow: a module kind, the crew, an assign button, or the edges. */
  target: 'oxygen' | 'crew' | 'assign-oxygen' | 'explore' | 'none';
  pause: boolean;
  done: (s: CoachState, ms: number) => boolean;
}

const oxygen = (s: CoachState) => s.game?.modules.find((m) => m.kind === 'oxygen');
const lead = (s: CoachState) => s.game?.crew.find((c) => c.commander)?.name ?? 'yourself';

export const COACH: CoachStep[] = [
  { say: () => 'Lesson 1: every module needs power. Tap the Oxygen Maker to switch it OFF. Watch the yellow power blocks.', target: 'oxygen', pause: true,
    done: (s) => oxygen(s)?.on === false },
  { say: () => 'See? One block came back. Now tap it again to switch the air back ON. No air, no crew!', target: 'oxygen', pause: true,
    done: (s) => oxygen(s)?.on === true },
  { say: (s) => `Lesson 2: modules work twice as well with someone inside. Tap ${lead(s)}, the astronaut with the star.`, target: 'crew', pause: true,
    done: (s) => !!s.picked },
  { say: () => 'Now press "Oxygen Maker" on the card to send them to work.', target: 'assign-oxygen', pause: true,
    done: (s) => !!s.game && s.game.crew.some((c) => c.at === oxygen(s)?.id) },
  { say: () => 'Lesson 3: drag the ground sideways, or press an arrow, to explore. Real Mars discoveries are hiding out there!', target: 'explore', pause: true,
    done: () => pannedBy() > 260 },
  { say: () => 'You are ready, Commander! Keep the crew alive for 30 sols. If your commander dies, the mission is over. Watch the sky for storms!', target: 'none', pause: false,
    done: (_s, ms) => ms > 7000 },
];
