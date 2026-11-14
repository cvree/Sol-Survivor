import { HYPOTHERMIA_TEMP } from '../engine/constants';
import { isOn } from '../engine/engine';
import type { CrewState, GameState, ModuleKind } from '../engine/types';
import { hypoxiaStage, isFainted, triage } from '../engine/vitals';
import type { Look } from './art';

/** What an EMT would see on this person's face right now. */
export function lookOf(c: CrewState): Look {
  const stage = hypoxiaStage(c.noAir);
  return {
    triage: triage(c),
    blueLips: stage >= 2,
    flushed: c.sick > 0.25,
    fainted: c.out || isFainted(c),
    shiver: c.temp < HYPOTHERMIA_TEMP,
    dizzy: stage === 1 || c.sick > 0.5,
  };
}

/** One short sentence on what is wrong, in a child's words. */
export function feeling(c: CrewState): string {
  const stage = hypoxiaStage(c.noAir);
  if (c.out) return 'Evacuated';
  if (stage === 3) return 'Fainted: no air';
  if (stage === 2) return 'Can barely breathe';
  if (stage === 1) return 'Dizzy: air is thin';
  if (c.temp < HYPOTHERMIA_TEMP) return 'Freezing cold';
  if (c.sick > 0.25) return 'Radiation sick';
  if (c.health < 65) return 'Worn out';
  return 'Feeling good';
}

const HOME: Record<string, ModuleKind[]> = {
  ada: ['oxygen'],
  kofi: ['greenhouse'],
  mei: ['medbay', 'heater'],
  luis: ['lab', 'heater'],
};

/** Which room each crew member is standing in. The Med Bay patient moves to the Med Bay. */
export function roomOf(game: GameState, crewId: string): string | undefined {
  if (game.patient === crewId && isOn(game, 'medbay')) return game.modules.find((m) => m.kind === 'medbay')?.id;
  for (const kind of HOME[crewId] ?? []) {
    const m = game.modules.find((x) => x.kind === kind);
    if (m) return m.id;
  }
  return game.modules.find((m) => m.kind === 'heater')?.id;
}
