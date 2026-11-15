import type { ModuleKind } from './types';

/** Every balance number lives here. Real-world anchors are marked REAL with a source. */

export const MISSION_SOLS = 30;
/** Real seconds per sol at 1x speed. REAL: a sol is 24 h 39 min 35 s (NASA Mars facts). */
export const SOL_SECONDS = 8;

// The site map.
/** The base is a side-view cutaway: domes on the surface, rooms dug in below, gear out in the yard. */
export const GRID_COLS = 5;
export const HAB_CELL = 2;
export const YARD_CELL = 100;
export type Layer = 'surface' | 'under' | 'yard';
export const LAYER: Record<ModuleKind, Layer> = {
  hab: 'surface', hydro: 'surface', dome: 'surface',
  oxygen: 'under', medbay: 'under', lab: 'under',
  solar: 'yard', battery: 'yard', comms: 'yard',
};

/** Power each module draws when it is on. Generators draw nothing. */
export const POWER_COST: Record<ModuleKind, number> = {
  hab: 1, solar: 0, battery: 0, oxygen: 2, hydro: 2, dome: 4, medbay: 2, lab: 2, comms: 1,
};
export const SOLAR_OUTPUT = 4;
/** A battery gives steady power that dust cannot block. */
export const BATTERY_OUTPUT = 2;
/** The most of each module a base can have. */
export const MAX_OF: Record<ModuleKind, number> = {
  hab: 1, solar: 4, battery: 2, oxygen: 2, hydro: 2, dome: 2, medbay: 1, lab: 1, comms: 1,
};
/** Modules that astronauts can work in, and how many fit. */
export const WORK_SLOTS: Partial<Record<ModuleKind, number>> = { oxygen: 2, hydro: 2, lab: 2, medbay: 2 };
export const BUILD_SOLS = 1;

// Cargo landers.
export const CARGO_SOLS = 5;
export const MAX_CREW = 6;
export const CARGO_PICKS = 2;
export const CARGO_SUPPLIES = 10;
/** A staffed lab finds things out faster, and Earth sends the next lander sooner. */
export const LAB_CARGO_BOOST = 0.35;
export const SCIENCE_PER_SOL = 3;

// Life support, in reserve points per sol.
export const CREW_USE = 1.5;
export const OXYGEN_MAKES = 3.4;
export const HYDRO_MAKES = 3.0;
export const START_LIFE = 55;
/** EMT rule: shivering burns through food and energy twice as fast. */
export const COLD_USE_MULTIPLIER = 2;
/** A module with nobody in it only half works. The right specialist makes it work better. */
export const UNSTAFFED = 0.5;
export const SPECIALIST_BONUS = 0.3;
/**
 * Long stays wear the body down, so long-stay crew need more food and care.
 * REAL: spaceflight studies in NASA's OSDR show bone loss (OSD-417), muscle
 * changes (OSD-195) and stressed cells (OSD-343). The rate here is a game value.
 */
export const WEAR_PER_SOL = 0.014;
/** Fresh food from a working Hydroponics Bay halves that wear. */
export const FRESH_FOOD_RELIEF = 0.5;

// Shielding.
export const SHIELD_CHARGE = 135;
export const SHIELD_FADE = 55;
/** Share of storm radiation a full shield stops. Nothing blocks all of it. */
export const SHIELD_BLOCK = 0.92;
/** One Shield Dome is big enough to cover this many astronauts. */
export const DOME_COVERS = 4;
/** A Comms Array hears NASA's storm forecasts sooner. */
export const COMMS_EXTRA_WARNING = 0.9;

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

// Jury-rig patches. GAME VALUES: the idea (fixing things with what you have) is real, the numbers are not.
/** Spare parts on the first lander. */
export const START_SPARE_PARTS = 2;
/** Each cargo lander brings this many more. */
export const CARGO_SPARE_PARTS = 1;
export const MAX_SPARE_PARTS = 4;
/** Only life-support modules can be patched: the ones the crew cannot live without. */
export const PATCHABLE: ModuleKind[] = ['hab', 'oxygen', 'hydro', 'medbay'];
/** A patched module runs this long without drawing power. */
export const PATCH_SOLS = 1;
/** Life support a finished mini-mission can send as a thank-you crate from Earth. */
export const GOAL_SUPPLIES = 5;

// Losing crew. Death is permanent, and the base carries on short-handed.
/** After a crewmate dies, everyone works a little slower for a while. GAME VALUES. */
export const GRIEF_SOLS = 2;
export const GRIEF_WORK = 0.85;

// The commander you pick. Each specialist brings one perk. GAME VALUES.
export const ENGINEER_EXTRA_PARTS = 2;
export const MEDIC_HEAL_BOOST = 1.5;
export const SCIENTIST_CARGO_BOOST = 1.25;

// Discoveries around the base. GAME VALUES; the facts on each card are real.
export const FIND_FIRST = 4;
export const FIND_EVERY_SOLS = 2;
export const FIND_CARGO_BOOST = 0.08;
export const FIND_SCIENCE = 4;
export const FIND_SUPPLIES = 5;
