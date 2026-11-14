import { HYPOTHERMIA_TEMP, HYPOXIA } from './constants';
import type { CrewState, Triage } from './types';

/**
 * Crew health rules, written from an EMT's field notes and squeezed to game time.
 * In real life the oxygen timeline below takes minutes. Here one stage lasts
 * a sol or two so a young commander has time to react.
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

/** Blood oxygen (SpO2 %) for a given time without air. */
export function spo2For(noAir: number): number {
  const { dizzy, weak, faint, lost } = HYPOXIA;
  if (noAir <= 0) return 98;
  if (noAir < dizzy) return lerp(98, 93, noAir / dizzy);
  if (noAir < weak) return lerp(93, 86, (noAir - dizzy) / (weak - dizzy));
  if (noAir < faint) return lerp(86, 72, (noAir - weak) / (faint - weak));
  return lerp(72, 58, (noAir - faint) / (lost - faint));
}

export type HypoxiaStage = 0 | 1 | 2 | 3;
export function hypoxiaStage(noAir: number): HypoxiaStage {
  if (noAir >= HYPOXIA.faint) return 3;
  if (noAir >= HYPOXIA.weak) return 2;
  if (noAir >= HYPOXIA.dizzy) return 1;
  return 0;
}

/**
 * Heart rate target. Early hypoxia: the heart races to make up for thin air.
 * Late hypoxia: it tires and crashes (bradycardia). Cold slows it. Radiation
 * sickness speeds it up.
 */
export function heartRateFor(c: CrewState): number {
  const stage = hypoxiaStage(c.noAir);
  let hr = c.restHr;
  if (stage === 1) hr = 116;
  else if (stage === 2) hr = lerp(116, 46, (c.noAir - HYPOXIA.weak) / 0.8);
  else if (stage === 3) hr = 40;
  if (c.temp < HYPOTHERMIA_TEMP) hr -= Math.min(20, (HYPOTHERMIA_TEMP - c.temp) * 6);
  hr += c.sick * 30;
  return Math.max(30, Math.min(150, hr));
}

export const isFainted = (c: CrewState) => hypoxiaStage(c.noAir) === 3 || c.temp < 90.5 || c.health < 12;

/** START-style triage, with the fourth colour left out for young players. */
export function triage(c: CrewState): Triage {
  if (c.out || isFainted(c) || c.spo2 < 86 || c.temp < 93 || c.health < 35 || c.sick > 0.6) return 'red';
  if (c.spo2 < 94 || c.temp < HYPOTHERMIA_TEMP + 0.6 || c.health < 65 || c.sick > 0.25) return 'yellow';
  return 'green';
}

export const TRIAGE_LABEL: Record<Triage, string> = {
  green: 'OK',
  yellow: 'Needs help soon',
  red: 'Critical',
};

/** Permanent radiation damage lowers the most health a crew member can ever have. */
export const maxHealth = (dose: number, careerLimit: number) => Math.max(5, 100 * (1 - dose / careerLimit));
