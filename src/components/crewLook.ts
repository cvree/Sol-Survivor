import { HYPOTHERMIA_TEMP } from '../engine/constants';
import type { CrewState } from '../engine/types';
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

/** One short phrase on how they are, in a child's words. */
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

export const HAPPY: Look = { triage: 'green', blueLips: false, flushed: false, fainted: false, shiver: false, dizzy: false };
