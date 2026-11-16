export type ModuleKind = 'pod' | 'miner' | 'rover' | 'hab' | 'solar' | 'battery' | 'oxygen' | 'hydro' | 'dome' | 'medbay' | 'lab' | 'comms';
export type Role = 'Engineer' | 'Botanist' | 'Medic' | 'Scientist';

export interface ModuleState {
  id: string;
  kind: ModuleKind;
  /** 0-4 are surface plots, 5-9 are dug-in rooms below them, 100+ is the yard. */
  cell: number;
  on: boolean;
  /** Sols of building work left. 0 means ready. */
  buildLeft: number;
  /** Game time when it was last switched on. Newest loads trip first in a brownout. */
  onSince: number;
  /** Game time until which a jury-rigged patch keeps it running without drawing power. 0 means no patch. */
  patchedUntil: number;
  /** 1 to 3. Upgrades make a module stronger and change how it looks. */
  level: number;
  /** True while being upgraded: the module is offline until a builder finishes. */
  upgrading: boolean;
  /** How long the current building or upgrade job is, for the progress bar. */
  buildTotal: number;
  /** Regolith Miner: bricks waiting in the bin to be collected. */
  bin: number;
}

/** A walk out into the crater: to a discovery or a rock pile, some work there, and back home. */
export interface Trip {
  phase: 'out' | 'work' | 'back';
  left: number;
  total: number;
  /** Where in the crater, 0 (far west) to 1 (far east). */
  x: number;
  job: { kind: 'find'; id: string; reward: 'science' | 'part' | 'supplies'; title: string } | { kind: 'mine'; dep: string } | { kind: 'go' };
  /** Bricks being carried home. */
  carry: number;
  /** Where the walk out started (0-1), if not at the base: a trip that was changed on the way. */
  from?: number;
  /** Where to go once home again: a place in the base the commander chose while they were out. */
  then?: string;
}

/** A pile of rock in the crater. Regolith can be dug out and pressed into bricks. */
export interface Deposit { id: string; x: number; left: number; size: number }

/** The one thing each astronaut loves doing. Doing it cheers them up. */
export type Like = 'fixing' | 'medbay' | 'hydro' | 'explore' | 'lab' | 'build' | 'sleep' | 'company';

export type TraitId = 'nightowl' | 'steady' | 'sunny' | 'explorer' | 'tireless' | 'builder' | 'sleepyhead' | 'brave';

export type Triage = 'green' | 'yellow' | 'red';
export type Cause = 'air' | 'cold' | 'radiation';

export interface CrewState {
  id: string;
  name: string;
  role: Role;
  /** Colours for the portrait, so every astronaut looks different. */
  skin: string;
  suit: string;
  /** One small made-up habit, so each astronaut feels like a person. Story only, not science. */
  quirk: string;
  /** A trait that changes how this astronaut plays. */
  trait: TraitId;
  /** What they love doing. Doing it lifts their mood. */
  likes: Like;
  /** Game time the commander last chatted, high-fived or gave a pep talk. */
  cheeredAt: number;
  /** A little picture that pops up over their head. */
  emote: { kind: 'heart' | 'star' | 'note' | 'sweat'; until: number } | null;
  /** Game time when they landed. Longer stays wear the body down. */
  arrived: number;
  /** Id of the module they are working or resting in. */
  at: string;
  restHr: number;
  /** 0.88-1.12. Bodies differ, so the same emergency hits each person a bit differently. */
  tolerance: number;
  spo2: number;
  hr: number;
  /** Core body temperature, degrees Fahrenheit. */
  temp: number;
  /** Total absorbed radiation, millisieverts. Never goes down. */
  dose: number;
  /** 0-1 radiation sickness. Heals properly only in the Med Bay. */
  sick: number;
  health: number;
  /** Sols of breathing empty air. Drives the hypoxia stages. */
  noAir: number;
  hurtBy: Record<Cause, number>;
  /** Did not survive. Death is permanent: the crew carries on without them. */
  out: boolean;
  /** 0-100. Working uses it up, sleeping in the Hab fills it. Tired astronauts work slower. */
  energy: number;
  /** 0-100. Tired, cold, overworked or sad astronauts get unhappy, and very unhappy ones stop working. */
  mood: number;
  /** Ran out of energy and fell asleep where they stood. They wake once rested enough. */
  exhausted: boolean;
  /** The player's own astronaut. If the commander dies, the mission is over. */
  commander: boolean;
  /** Game time of death, or null. */
  diedAt: number | null;
  /** Out in the crater on a job, or null when at the base. */
  trip: Trip | null;
  /** Sols until they have walked over to the place they were sent (above 0 while walking). Not working until then. */
  arriving: number;
  /** Where they last walked from (a module id, 'hab', 'out' for the airlock or 'pad' for a lander). */
  walkFrom: string;
  /** How long that walk takes in total, in sols. */
  walkTotal: number;
  say: { text: string; until: number; mood: 'bad' | 'good' } | null;
  lastSaid: string;
}

export type EventKind = 'flare' | 'cme' | 'dust';

export interface GameEvent {
  id: string;
  kind: EventKind;
  /** Id of the real record this event replays (DONKI id or mission-record id). */
  recordId: string;
  warnAt: number;
  startAt: number;
  endAt: number;
  /** 0-1, worked out from the real record (flare class, CME speed, dust thickness). */
  strength: number;
  phase: 'pending' | 'warned' | 'active' | 'done';
  doseTaken: number;
  doseUnshielded: number;
}

/** What a cargo lander brought. The game waits until the commander has chosen. */
export interface CargoOffer {
  number: number;
  crew: Pick<CrewState, 'id' | 'name' | 'role' | 'skin' | 'suit' | 'restHr' | 'quirk' | 'trait' | 'likes'> | null;
  /** Who wants to come. The commander picks one, or nobody for extra supplies. */
  crewOptions: NonNullable<CargoOffer['crew']>[];
  options: ModuleKind[];
  picks: number;
}

export interface LogEntry {
  t: number;
  tone: 'info' | 'warn' | 'bad' | 'good';
  text: string;
}

export interface Stats {
  brownouts: number;
  stormsBeaten: number;
  airOutSols: number;
  coldSols: number;
  lowestLife: number;
  built: number;
  /** Mini-missions finished. */
  goals: number;
  /** Jury-rig patches used. */
  patches: number;
  /** Discoveries collected around the base. */
  finds: number;
  /** Crew who did not survive. */
  lost: number;
  /** Times someone collapsed from overwork. */
  collapses: number;
  /** Times someone was too unhappy to keep working. */
  strikes: number;
  upgrades: number;
  /** Bricks dug or collected. */
  mined: number;
}

export interface GameState {
  seed: number;
  /** Game clock in sols. Starts at 1.0, so Math.floor(time) is the sol number. */
  time: number;
  status: 'playing' | 'won' | 'lost';
  difficulty: 'easy' | 'normal' | 'hard';
  lostCause: Cause | null;
  modules: ModuleState[];
  crew: CrewState[];
  /** Life-support reserve (air, water and food), 0-100. */
  life: number;
  /** Shield charge, 0-100. How much of the crew it covers depends on how many domes are on. */
  shield: number;
  events: GameEvent[];
  /** Blueprints delivered but not built yet. */
  blueprints: ModuleKind[];
  /** 0-1 progress toward the next cargo lander. */
  cargoProgress: number;
  landers: number;
  offer: CargoOffer | null;
  science: number;
  /** Spare parts for jury-rig patches. A patch runs a dead module for a short while with no power. */
  spareParts: number;
  /** Regolith bricks: building material for upgrades. */
  materials: number;
  deposits: Deposit[];
  /** The rover, once a Rover Garage is built. It fetches finds and digs rock without tiring. */
  rover: { trip: Trip | null } | null;
  /** Discoveries brought home this mission, in order, so the screen can celebrate each one. */
  foundLog: string[];
  /** Until this game time the crew are grieving a lost crewmate, and work a little slower. */
  griefUntil: number;
  log: LogEntry[];
  stats: Stats;
  /** Bumped whenever something notable happens, so the UI can play a sound or shake. */
  pulse: { brownout: number; denied: number; hit: number; survived: number; landed: number; built: number; patched: number; died: number; upgraded: number; delivered: number };
  nextId: number;
  /** Builders walk on to the next building site by themselves when they finish one (a player setting; on unless false). */
  autoBuild?: boolean;
  /**
   * The screen is moving the astronauts. Walks then end only when the screen says someone got
   * there (`arrive`, `tripReached`), so the rules never run ahead of what the player sees.
   * Off for tests and the simulated players, where walks take `walkSols` / `walkTime`.
   */
  liveWalk?: boolean;
}

export interface PowerInfo {
  supply: number;
  used: number;
  free: number;
  /** 0-1 share of sunlight reaching the panels. */
  sunlight: number;
  /** Supply on a clear day, for drawing the lost blocks. */
  most: number;
}
