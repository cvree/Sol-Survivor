import { LAYER } from '../engine/constants';
import { habReady, isNight } from '../engine/engine';
import type { CrewState, GameState } from '../engine/types';
import type { Act } from './art';

/**
 * What an astronaut is busy with where they are: their job in this room, or a little human
 * moment. Shared by the drawing (which pose) and the movement (only idle crew wander about).
 */
export function restingAct(c: CrewState, game: GameState, partying: boolean): Act {
  if (c.exhausted) return c.at === 'hab' ? 'sleep' : 'collapse';
  if (partying) return 'jump';
  // Before the Hab is built, home is the capsule.
  if (c.at === 'hab' && !habReady(game)) return c.energy < 97 || isNight(game) ? 'sleep' : 'sip';
  const m = game.modules.find((x) => x.id === c.at);
  if (!m) return 'idle';
  if (LAYER[m.kind] === 'yard') return 'wrench';
  if (m.buildLeft > 0) return 'wrench';
  if (m.kind === 'hab' && (c.energy < 97 || isNight(game))) return 'sleep';
  const t = game.time;
  const index = game.crew.indexOf(c);
  const mates = game.crew.filter((o) => !o.out && !o.trip && o.at === c.at).length;
  // Two people in one room say hello now and then.
  if (mates > 1 && (t * 0.55 + m.cell * 0.37 + index * 0.08) % 1 < 0.13) return 'wave';
  if (!m.on) return 'idle';
  switch (m.kind) {
    case 'lab': return 'type';
    case 'hydro': return 'water';
    case 'oxygen': return 'wrench';
    case 'medbay': return c.role === 'Medic' ? 'check' : 'sleep';
    case 'hab': {
      const phase = Math.floor(t * 0.4 + index * 1.7) % 4;
      return phase === 1 ? 'sip' : phase === 3 && index % 2 === 1 ? 'sleep' : 'idle';
    }
    default: return 'idle';
  }
}

/** Free to stroll about the room: nothing to do, and well enough to walk. */
export const canWander = (act: Act) => act === 'idle' || act === 'sip';
