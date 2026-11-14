export type ModuleKind = 'solar' | 'oxygen' | 'greenhouse' | 'heater' | 'shield' | 'medbay' | 'lab';

/** What the player chose to pack on the lander. Counts per item. */
export type PayloadId = 'shield' | 'medbay' | 'solar' | 'lab' | 'battery' | 'tank';
export type Loadout = Record<PayloadId, number>;

export interface ModuleState {
  id: string;
  kind: ModuleKind;
  on: boolean;
  /** Game time when it was last switched on. Newest loads trip first in a brownout. */
  onSince: number;
}

export type Triage = 'green' | 'yellow' | 'red';
export type Cause = 'air' | 'cold' | 'radiation';

export interface CrewState {
  id: string;
  name: string;
  role: string;
  /** Resting heart rate, beats per minute. */
  restHr: number;
  /** 0.88-1.12. Bodies differ, so the same emergency hits each person a bit differently. */
  tolerance: number;
  spo2: number;
  hr: number;
  /** Core body temperature, degrees Fahrenheit. */
  temp: number;
  /** Total absorbed radiation, millisieverts. Never goes down. */
  dose: number;
  /** 0-1 radiation sickness (nausea, burns). Heals properly only in the Med Bay. */
  sick: number;
  health: number;
  /** Sols of breathing empty air. Drives the hypoxia stages. */
  noAir: number;
  /** Health lost to each cause, for the debrief. */
  hurtBy: Record<Cause, number>;
  out: boolean;
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
  /** Radiation (mSv, crew average) taken during this event. */
  doseTaken: number;
  /** What the crew would have taken with no shield at all. */
  doseUnshielded: number;
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
}

export interface GameState {
  seed: number;
  /** Game clock in sols. Starts at 1.0, so Math.floor(time) is the sol number. */
  time: number;
  status: 'playing' | 'won' | 'lost';
  difficulty: 'cadet' | 'commander';
  lostCause: Cause | null;
  modules: ModuleState[];
  crew: CrewState[];
  /** Life-support reserve (air, water and food), 0-100. */
  life: number;
  /** Shield strength, 0-100. */
  shield: number;
  events: GameEvent[];
  /** Crew id resting in the Med Bay bed, if any. */
  patient: string | null;
  log: LogEntry[];
  stats: Stats;
  /** Bumped whenever something notable happens, so the UI can play a sound or shake. */
  pulse: { brownout: number; denied: number; hit: number; survived: number };
  loadout: Loadout;
  /** Science points earned by the lab. The reason the outpost exists. */
  science: number;
}

export interface PowerInfo {
  supply: number;
  used: number;
  free: number;
  /** 0-1 share of sunlight reaching the panels. */
  sunlight: number;
}
