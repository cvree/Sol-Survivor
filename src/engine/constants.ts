import type { ModuleKind } from './types';

/** Every balance number lives here. Real-world anchors are marked REAL with a source. */

export const MISSION_SOLS = 30;
/**
 * Real seconds per sol at 1x speed, by difficulty. Easy is the slowest, so a young commander
 * has time to look, think and act between storms. GAME VALUES.
 * REAL: a sol is 24 h 39 min 35 s (NASA Mars facts).
 */
export const SOL_SECONDS = { easy: 20, normal: 15, hard: 11 } as const;
/** Storms in the middle of a mission (the first and last solar storms, and the finale dust storm, come on top). */
export const MIDDLE_STORMS = { easy: 3, normal: 5, hard: 5 } as const;

// The site map.
/** The base is a side-view cutaway: domes on the surface, rooms dug in below, gear out in the yard. */
export const GRID_COLS = 5;
export const HAB_CELL = 2;
export const YARD_CELL = 100;
export type Layer = 'surface' | 'under' | 'yard';
export const LAYER: Record<ModuleKind, Layer> = {
  pod: 'yard', miner: 'yard', rover: 'yard', hab: 'surface', hydro: 'surface', dome: 'surface',
  oxygen: 'under', medbay: 'under', lab: 'under',
  solar: 'yard', battery: 'yard', comms: 'yard',
};

/** Power each module draws when it is on. Generators draw nothing. */
export const POWER_COST: Record<ModuleKind, number> = {
  pod: 0, miner: 1, rover: 1, hab: 1, solar: 0, battery: 0, oxygen: 2, hydro: 2, dome: 4, medbay: 2, lab: 2, comms: 1,
};
export const SOLAR_OUTPUT = 4;
/** A battery gives steady power that dust cannot block. */
export const BATTERY_OUTPUT = 2;
/** The most of each module a base can have. */
export const MAX_OF: Record<ModuleKind, number> = {
  pod: 1, miner: 2, rover: 1, hab: 1, solar: 4, battery: 2, oxygen: 2, hydro: 2, dome: 2, medbay: 1, lab: 1, comms: 1,
};
/** Modules that astronauts can work in, and how many fit. */
export const WORK_SLOTS: Partial<Record<ModuleKind, number>> = { oxygen: 2, hydro: 2, lab: 2, medbay: 2 };
export const BUILD_SOLS = 1;
/** A builder walks on to the next building site by themselves only with more energy than this. */
export const AUTO_BUILD_ENERGY = 30;

// Cargo landers.
/** A lander comes on its own every this many sols. Missions, discoveries and storms bring it sooner. */
export const CARGO_SOLS = 8;
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
/** The capsule's air tank. It only lasts so long: earn an Oxygen Maker before it runs dry. */
export const START_LIFE = 40;
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
export const FIND_CARGO_BOOST = 0.12;
export const FIND_SCIENCE = 4;
export const FIND_SUPPLIES = 5;

// Energy, sleep and mood. GAME VALUES, squeezed into game time.
/** Energy used per sol while working in a module that is on. */
export const WORK_DRAIN = 30;
/** Energy used per sol while standing in a module that is off. */
export const IDLE_DRAIN = 8;
/** Energy gained per sol sleeping in a warm Hab. */
export const SLEEP_GAIN = 55;
/** Energy gained per sol resting anywhere else (a Med Bay bed, a cold Hab). */
export const REST_GAIN = 30;
/** Energy gained per sol after collapsing on the spot. */
export const COLLAPSE_GAIN = 22;
/** Last part of each sol is night: sleep is better and work is harder. */
export const NIGHT_FROM = 0.72;
export const NIGHT_SLEEP = 1.5;
export const NIGHT_WORK = 1.4;
/** Below this energy an astronaut works slower. At 0 energy they work this fast. */
export const TIRED_AT = 50;
export const TIRED_MIN = 0.4;
/** A collapsed astronaut wakes up once they have this much energy. */
export const WAKE_AT = 40;
/** Below this mood an astronaut works slower. At 0 mood they work this fast. */
export const GRUMPY_AT = 40;
export const GRUMPY_MIN = 0.7;
/** Below this mood an astronaut stops working and goes to the Hab for a break. */
export const STRIKE_AT = 15;
/** Building goes this fast when nobody is fit to build. */
export const BUILD_MIN = 0.35;

// Earning everything. GAME VALUES.
/** The landing capsule: warm, cramped, and its battery makes a little power. */
export const POD_POWER = 3;
/** Mood lost per sol while living in the cramped capsule. */
export const POD_GLOOM = 3;
/** Where the next lander starts. The first discovery brings it in. */
export const START_CARGO = 0.4;
/** Lander progress for finishing a mini-mission, making a discovery, or beating a storm. */
export const GOAL_CARGO_BOOST = 0.3;
export const FIRST_GOAL_CARGO_BOOST = 0.6;
export const STORM_CARGO_BOOST = 0.15;
/** How many astronauts can work on one building site. */
export const BUILD_SLOTS = 2;
/** Supplies a lander brings instead of a new crewmate, if the commander says no thanks. */
export const SKIP_CREW_SUPPLIES = 12;
/** Extra discoveries an Explorer spots. */
export const EXPLORER_FINDS = 2;

// Base building, Clash style. GAME VALUES.
export const MAX_LEVEL = 3;
/** Bricks to go from level n to n+1. The Hab is the heart of the base and costs more. */
export const UPGRADE_COST: Record<number, number> = { 1: 20, 2: 45 };
export const HAB_UPGRADE_COST: Record<number, number> = { 1: 30, 2: 60 };
/** Builder time for an upgrade from level n, in sols at full speed. The module is offline meanwhile. */
export const UPGRADE_SOLS: Record<number, number> = { 1: 1.2, 2: 1.8 };
/** How much better a module works at each level (index = level). */
export const LEVEL_BOOST = [1, 1, 1.35, 1.7];
export const SOLAR_BY_LEVEL = [0, 4, 5, 6];
export const BATTERY_BY_LEVEL = [0, 2, 3, 4];
/** A Shield Dome protects crew in its own column and this many columns either side. */
export const DOME_RADIUS = [0, 1, 1, 2];
/** Share of the shield's full strength a dome gives at each level. */
export const DOME_STRENGTH = [0, 0.85, 0.95, 1];

// Bricks and trips. GAME VALUES.
export const CARGO_MATERIALS = 10;
export const FIND_MATERIALS = 5;
export const DEPOSIT_COUNT = 6;
export const DEPOSIT_MIN = 20;
export const DEPOSIT_MAX = 40;
/** Bricks an astronaut (or the rover) can carry home in one trip. */
export const CARRY = 10;
export const ROVER_CARRY = 15;
/** Time spent digging at a rock pile, or looking at a discovery, at full speed. */
export const MINE_SOLS = 0.4;
export const FIND_WORK_SOLS = 0.25;
/** Short walk inside the base, and the walk to the far edge of the crater. */
export const WALK_BASE = 0.06;
export const WALK_FAR = 0.9;
/** Walking inside the base: extra time per column crossed, and per ladder climbed into or out of a dug-in room. */
export const WALK_PER_COL = 0.05;
export const WALK_LADDER = 0.07;
export const ROVER_SPEED = 2;
/** Regolith Miner: bricks per sol at level 1, and how many fit in its bin. */
export const MINER_RATE = 5;
export const MINER_BIN = 20;

// Getting to know the crew. GAME VALUES.
/** Mood gained per sol while doing the thing they love. */
export const LIKE_MOOD = 6;
/** How long before the commander can cheer the same astronaut again. */
export const CHEER_COOLDOWN = 0.6;
export const CHEER_MOOD = { chat: 6, highfive: 10, peptalk: 14 } as const;
