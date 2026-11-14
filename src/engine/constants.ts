import type { ModuleKind, PayloadId } from './types';

/** Every balance number lives here. Real-world anchors are marked REAL with a source. */

export const MISSION_SOLS = 30;
/** Real seconds per sol at 1x speed. REAL: a sol is 24 h 39 min 35 s (NASA Mars facts). */
export const SOL_SECONDS = 8;

export const POWER_COST: Record<ModuleKind, number> = {
  solar: 0,
  oxygen: 3,
  greenhouse: 2,
  heater: 1,
  shield: 6,
  medbay: 2,
  lab: 1,
};
export const SOLAR_OUTPUT = 3;

/** A battery gives steady power that dust cannot block. */
export const BATTERY_OUTPUT = 1;
export const SCIENCE_PER_SOL = 3;

/**
 * The lander can only carry so much. REAL: every kilogram sent to Mars costs
 * fuel, so mission planners argue over each one. Masses here are game values.
 */
export const PAYLOAD_LIMIT = 1000;
export const PAYLOAD_SECONDS = 60;
export const PAYLOAD: Record<PayloadId, { mass: number; max: number }> = {
  shield: { mass: 400, max: 1 },
  medbay: { mass: 250, max: 1 },
  solar: { mass: 250, max: 1 },
  lab: { mass: 200, max: 1 },
  battery: { mass: 150, max: 2 },
  tank: { mass: 100, max: 3 },
};
export const TANK_LIFE = 14;
export const START_LIFE = 50;

// Life support, in reserve points per sol.
export const CREW_USE = 1.5;
export const OXYGEN_MAKES = 4.2;
export const GREENHOUSE_MAKES = 3.4;
/** EMT rule: shivering burns through food and energy twice as fast. */
export const COLD_USE_MULTIPLIER = 2;

// Shield strength, points per sol.
export const SHIELD_CHARGE = 135;
export const SHIELD_FADE = 55;
/** Share of storm radiation a full shield stops. Nothing blocks all of it. */
export const SHIELD_BLOCK = 0.92;

// Radiation.
/** REAL: Curiosity's RAD instrument measured about 0.67 mSv per day on the surface
 *  of Mars (Hassler et al., Science, 2014). */
export const BACKGROUND_DOSE = 0.67;
/** REAL: NASA's career radiation limit for astronauts is 600 mSv (NASA-STD-3001, 2022). */
export const CAREER_LIMIT = 600;
/** GAME SCALE: storm doses are turned up so a single storm matters in a 30-sol game. */
export const CME_DOSE = 85;
export const FLARE_DOSE = 60;

// Body temperature, degrees F per sol.
export const NORMAL_TEMP = 98.2;
export const TEMP_FALL = 1.3;
export const TEMP_RISE = 0.5;
export const TEMP_RISE_MEDBAY = 1.4;
export const HYPOTHERMIA_TEMP = 95;

// Hypoxia timeline in sols without air (EMT-reviewed, squeezed to game time).
export const HYPOXIA = { dizzy: 0.4, weak: 2.5, faint: 4.6, lost: 6 };

export const DUST_MAX_LOSS = 0.67;
