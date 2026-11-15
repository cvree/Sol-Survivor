import * as K from './constants';
import { planEvents, type Catalog } from './events';
import { makeRng } from './rng';
import type { CargoOffer, Cause, CrewState, GameEvent, GameState, ModuleKind, ModuleState, PowerInfo, Role } from './types';
import { heartRateFor, hypoxiaStage, isFainted, maxHealth, spo2For } from './vitals';

export type Difficulty = 'easy' | 'normal' | 'hard';
/** Easy: gentler storms, more warning, a fuller tank. Hard: storms at the strength of the real records. */
export const LEVEL: Record<Difficulty, { ease: number; warning: number; life: number }> = {
  easy: { ease: 0.72, warning: 0.6, life: 15 },
  normal: { ease: 0.88, warning: 0.3, life: 8 },
  hard: { ease: 1.15, warning: 0, life: -8 },
};
type Recruit = NonNullable<CargoOffer['crew']>;

const FIRST_CREW: Recruit[] = [
  { id: 'ada', name: 'Ada', role: 'Engineer', skin: '#9a6240', suit: '#ffd23f', restHr: 62 },
  { id: 'mei', name: 'Mei', role: 'Medic', skin: '#f3cfa6', suit: '#ff8fb1', restHr: 60 },
];
const RECRUITS: Recruit[] = [
  { id: 'kofi', name: 'Kofi', role: 'Botanist', skin: '#6a432c', suit: '#5ee6a0', restHr: 66 },
  { id: 'luis', name: 'Luis', role: 'Scientist', skin: '#cf9668', suit: '#4fd8ff', restHr: 68 },
  { id: 'zara', name: 'Zara', role: 'Engineer', skin: '#b87a4f', suit: '#ff9a4d', restHr: 64 },
  { id: 'omar', name: 'Omar', role: 'Botanist', skin: '#e0b088', suit: '#b6f04f', restHr: 67 },
  { id: 'yuki', name: 'Yuki', role: 'Scientist', skin: '#f6d9b8', suit: '#c9a6ff', restHr: 61 },
  { id: 'tala', name: 'Tala', role: 'Medic', skin: '#8a5a3c', suit: '#ff6f91', restHr: 65 },
];

/** Which specialist makes each module work best. */
export const SPECIALIST: Partial<Record<ModuleKind, Role>> = { oxygen: 'Engineer', hydro: 'Botanist', lab: 'Scientist', medbay: 'Medic' };

export const MODULE_NAME: Record<ModuleKind, string> = {
  hab: 'Hab', solar: 'Solar Field', battery: 'Battery Bank', oxygen: 'Oxygen Maker', hydro: 'Hydroponics',
  dome: 'Shield Dome', medbay: 'Med Bay', lab: 'Science Lab', comms: 'Comms Array',
};

const LINES = {
  air1: ['I feel a little dizzy...', 'Is the air getting thin in here?'],
  air2: ["It's so hard to breathe...", "I'm too tired to walk."],
  cold: ["I can't stop shivering!", 'My fingers are freezing, Commander!'],
  rad: ['My skin feels like it is burning!', 'I feel really sick to my stomach...'],
  airBack: ['Ah, fresh air!', 'I can breathe again!'],
  warm: ['Warming up now, thanks Commander!'],
  well: ['Back to 100%!', 'Feeling much better!'],
  hello: ['Reporting for duty!', 'Wow, Mars!'],
};

function newCrew(r: Recruit, time: number, at: string, tolerance: number): CrewState {
  return {
    ...r, arrived: time, at, tolerance,
    spo2: 98, hr: r.restHr, temp: K.NORMAL_TEMP, dose: 0, sick: 0, health: 100, noAir: 0,
    hurtBy: { air: 0, cold: 0, radiation: 0 }, out: false, say: null, lastSaid: '',
  };
}

export function createGame(seed: number, catalog: Catalog, activity = 1, difficulty: Difficulty = 'hard'): GameState {
  const level = LEVEL[difficulty];
  const rng = makeRng(seed);
  const mod = (id: string, kind: ModuleKind, cell: number, on: boolean): ModuleState => ({ id, kind, cell, on, buildLeft: 0, onSince: 0 });
  const life = K.START_LIFE + level.life;
  return {
    seed,
    time: 1,
    status: 'playing',
    difficulty,
    lostCause: null,
    modules: [mod('hab', 'hab', K.HAB_CELL, true), mod('m1', 'solar', K.YARD_CELL, false), mod('m2', 'oxygen', K.HAB_CELL + K.GRID_COLS, true)],
    crew: FIRST_CREW.map((c) => newCrew(c, 1, 'hab', rng.range(0.9, 1.1))),
    life,
    shield: 0,
    events: planEvents(rng, catalog, activity, level.ease, level.warning),
    blueprints: [],
    cargoProgress: 0.15,
    landers: 0,
    offer: null,
    science: 0,
    log: [{ t: 1, tone: 'info', text: 'Touchdown at Gale Crater. Grow the base and keep everyone alive for 30 sols.' }],
    stats: { brownouts: 0, stormsBeaten: 0, airOutSols: 0, coldSols: 0, lowestLife: life, built: 0 },
    pulse: { brownout: 0, denied: 0, hit: 0, survived: 0, landed: 0, built: 0 },
    nextId: 3,
  };
}

// ---------- reading the state ----------

const GENERATOR = (k: ModuleKind) => k === 'solar' || k === 'battery';
const ready = (m: ModuleState) => m.buildLeft <= 0;

export const activeEvents = (s: GameState, kind?: GameEvent['kind']) =>
  s.events.filter((e) => e.phase === 'active' && (!kind || e.kind === kind));

/** Share of sunlight reaching the panels (1 = clear sky). */
export function sunlight(s: GameState): number {
  const dust = activeEvents(s, 'dust').reduce((m, e) => Math.max(m, e.strength), 0);
  return 1 - K.DUST_MAX_LOSS * dust;
}

export function power(s: GameState): PowerInfo {
  const light = sunlight(s);
  const arrays = s.modules.filter((m) => m.kind === 'solar' && ready(m)).length;
  const batteries = s.modules.filter((m) => m.kind === 'battery' && ready(m)).length;
  const supply = Math.floor(arrays * K.SOLAR_OUTPUT * light + 1e-6) + batteries * K.BATTERY_OUTPUT;
  const used = s.modules.reduce((n, m) => n + (m.on ? K.POWER_COST[m.kind] : 0), 0);
  return { supply, used, free: supply - used, sunlight: light, most: arrays * K.SOLAR_OUTPUT + batteries * K.BATTERY_OUTPUT };
}

export const isOn = (s: GameState, kind: ModuleKind) => s.modules.some((m) => m.kind === kind && m.on);
export const count = (s: GameState, kind: ModuleKind) => s.modules.filter((m) => m.kind === kind).length + s.blueprints.filter((b) => b === kind).length;
export const alive = (s: GameState) => s.crew.filter((c) => !c.out);
export const workersIn = (s: GameState, moduleId: string) => s.crew.filter((c) => c.at === moduleId && !c.out);

/** How well a module is working: half with nobody inside, best with the right specialist. */
export function staffing(s: GameState, m: ModuleState): number {
  const able = workersIn(s, m.id).filter((c) => !isFainted(c));
  if (!able.length) return K.UNSTAFFED;
  return 1 + (able.some((c) => c.role === SPECIALIST[m.kind]) ? K.SPECIALIST_BONUS : 0);
}

/** Share of the crew the powered Shield Domes are big enough to cover. */
export function shieldCover(s: GameState): number {
  const domes = s.modules.filter((m) => m.kind === 'dome' && m.on).length;
  const crew = alive(s).length;
  return crew ? Math.min(1, (domes * K.DOME_COVERS) / crew) : 1;
}
/** 0-1: the share of storm radiation being blocked right now. */
export const shieldBlock = (s: GameState) => K.SHIELD_BLOCK * (s.shield / 100) * shieldCover(s);

/** Storm radiation arriving right now, mSv per sol, before the shield. */
export function stormDose(s: GameState): number {
  let rate = 0;
  for (const e of activeEvents(s)) {
    if (e.kind === 'cme') rate += K.CME_DOSE * e.strength;
    if (e.kind === 'flare') rate += K.FLARE_DOSE * e.strength;
  }
  return rate;
}

/** How much extra food and care a crew member needs after this long on Mars. 1 = just landed. */
export function wear(s: GameState, c: CrewState): number {
  const fresh = s.modules.some((m) => m.kind === 'hydro' && m.on);
  return 1 + Math.max(0, s.time - c.arrived) * K.WEAR_PER_SOL * (fresh ? K.FRESH_FOOD_RELIEF : 1);
}

/** Life-support change per sol, split up so the UI can explain it. */
export function lifeFlow(s: GameState) {
  const used = alive(s).reduce((n, c) => n + K.CREW_USE * wear(s, c) * (c.temp < K.HYPOTHERMIA_TEMP ? K.COLD_USE_MULTIPLIER : 1), 0);
  let made = 0;
  for (const m of s.modules) {
    if (!m.on) continue;
    if (m.kind === 'oxygen') made += K.OXYGEN_MAKES * staffing(s, m);
    if (m.kind === 'hydro') made += K.HYDRO_MAKES * staffing(s, m);
  }
  return { made, used, net: made - used };
}

/**
 * Where a module of this kind could go. Domes sit side by side on the surface,
 * rooms are dug next to each other below, and yard gear just needs open ground.
 */
export function buildableCells(s: GameState, kind: ModuleKind): number[] {
  const layer = K.LAYER[kind];
  if (layer === 'yard') return [K.YARD_CELL + s.modules.filter((m) => K.LAYER[m.kind] === 'yard').length];
  const taken = new Set(s.modules.map((m) => m.cell));
  const from = layer === 'surface' ? 0 : K.GRID_COLS;
  const out: number[] = [];
  for (let c = from; c < from + K.GRID_COLS; c++) {
    if (taken.has(c)) continue;
    const beside = (c > from && taken.has(c - 1)) || (c < from + K.GRID_COLS - 1 && taken.has(c + 1));
    const underHab = layer === 'under' && c === K.HAB_CELL + K.GRID_COLS;
    if (beside || underHab) out.push(c);
  }
  // Fill outward from the Hab so the base grows from its heart.
  const mid = from + K.HAB_CELL;
  return out.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
}

// ---------- player actions (each returns a new state) ----------

const clone = (s: GameState): GameState => structuredClone(s);
const log = (s: GameState, tone: GameState['log'][number]['tone'], text: string) => {
  s.log.push({ t: s.time, tone, text });
  if (s.log.length > 60) s.log.shift();
};

export type ToggleResult = { state: GameState; ok: boolean; reason?: string };

export function toggleModule(prev: GameState, id: string): ToggleResult {
  const target = prev.modules.find((m) => m.id === id);
  if (!target || GENERATOR(target.kind) || prev.status !== 'playing') return { state: prev, ok: false };
  if (!ready(target)) return { state: prev, ok: false, reason: 'Still being built.' };
  const s = clone(prev);
  const m = s.modules.find((x) => x.id === id)!;
  if (!m.on) {
    const p = power(s);
    const need = K.POWER_COST[m.kind];
    if (need > p.free) {
      s.pulse.denied++;
      return { state: s, ok: false, reason: `Not enough power! Free up ${need - p.free} more first.` };
    }
    m.on = true;
    m.onSince = s.time;
  } else {
    m.on = false;
  }
  return { state: s, ok: true };
}

export function canBuild(s: GameState, kind: ModuleKind, cell: number): string | null {
  if (!s.blueprints.includes(kind)) return 'You do not have that blueprint.';
  if (!buildableCells(s, kind).includes(cell)) return 'That will not fit there.';
  return null;
}

/** Build a blueprint. With no cell given it goes in the nearest free spot of the right kind. */
export function build(prev: GameState, kind: ModuleKind, at?: number): GameState {
  const cell = at ?? buildableCells(prev, kind)[0];
  if (prev.status !== 'playing' || cell === undefined || canBuild(prev, kind, cell)) return prev;
  const s = clone(prev);
  s.blueprints.splice(s.blueprints.indexOf(kind), 1);
  s.modules.push({ id: `m${s.nextId++}`, kind, cell, on: false, buildLeft: K.BUILD_SOLS, onSince: 0 });
  s.stats.built++;
  log(s, 'info', `Building a ${MODULE_NAME[kind]}.`);
  return s;
}

/** Send a crew member to work in a module, or back to the Hab to rest. */
export function assign(prev: GameState, crewId: string, moduleId: string): GameState {
  const m = prev.modules.find((x) => x.id === moduleId);
  const c = prev.crew.find((x) => x.id === crewId);
  if (!m || !c || c.out || prev.status !== 'playing' || !ready(m)) return prev;
  if (m.kind !== 'hab') {
    const slots = K.WORK_SLOTS[m.kind];
    if (!slots || (c.at !== m.id && workersIn(prev, m.id).length >= slots)) return prev;
  }
  const s = clone(prev);
  s.crew.find((x) => x.id === crewId)!.at = moduleId;
  return s;
}

/** Works out what the next lander carries. The first one always offers the essentials. */
function makeOffer(s: GameState): CargoOffer {
  const n = s.landers + 1;
  const rng = makeRng(s.seed + n * 9973);
  const room = (k: ModuleKind) => count(s, k) < K.MAX_OF[k];
  const all: ModuleKind[] = ['solar', 'battery', 'oxygen', 'hydro', 'dome', 'medbay', 'lab', 'comms'];
  let options: ModuleKind[];
  if (n === 1) options = ['dome', 'hydro', 'solar', rng.pick<ModuleKind>(['battery', 'medbay', 'lab'])];
  else {
    const pool = rng.shuffle(all.filter(room));
    const power = pool.find((k) => k === 'solar' || k === 'battery');
    options = [...(power ? [power] : []), ...pool.filter((k) => k !== power)].slice(0, 4);
    // Earth always offers a Shield Dome when the crew has outgrown the ones you have.
    const crewSoon = Math.min(K.MAX_CREW, s.crew.length + 1);
    if (!options.includes('dome') && room('dome') && count(s, 'dome') * K.DOME_COVERS < crewSoon) options[options.length - 1] = 'dome';
  }
  const taken = new Set(s.crew.map((c) => c.id));
  const free = rng.shuffle(RECRUITS.filter((r) => !taken.has(r.id)));
  // The first new arrival is always a Botanist, so the first Hydroponics Bay has its specialist.
  const recruit = s.crew.length >= K.MAX_CREW ? null : (n === 1 ? free.find((r) => r.role === 'Botanist') : free[0]) ?? null;
  return { number: n, crew: recruit, options, picks: Math.min(K.CARGO_PICKS, options.length) };
}

/** Unpack the lander: the new astronaut walks to the Hab and the chosen blueprints are yours. */
export function acceptCargo(prev: GameState, picks: ModuleKind[]): GameState {
  const offer = prev.offer;
  if (!offer) return prev;
  const s = clone(prev);
  const chosen = picks.filter((k) => offer.options.includes(k)).slice(0, offer.picks);
  s.blueprints.push(...chosen);
  if (offer.crew) {
    const c = newCrew(offer.crew, s.time, 'hab', makeRng(s.seed + offer.number).range(0.88, 1.12));
    c.say = { text: LINES.hello[offer.number % 2], until: s.time + 0.8, mood: 'good' };
    s.crew.push(c);
    log(s, 'good', `${c.name} the ${c.role} has landed.`);
  }
  s.life = Math.min(100, s.life + K.CARGO_SUPPLIES);
  s.landers = offer.number;
  s.offer = null;
  s.cargoProgress = 0;
  return s;
}

// ---------- the simulation ----------

/** When power drops, the newest loads trip off until the base fits its budget. */
function shedLoad(s: GameState) {
  let p = power(s);
  let tripped = false;
  while (p.free < 0) {
    const victim = s.modules.filter((m) => m.on && K.POWER_COST[m.kind] > 0).sort((a, b) => b.onSince - a.onSince)[0];
    if (!victim) break;
    victim.on = false;
    log(s, 'bad', `Brownout! The ${MODULE_NAME[victim.kind]} lost power.`);
    tripped = true;
    p = power(s);
  }
  if (tripped) {
    s.stats.brownouts++;
    s.pulse.brownout++;
  }
}

function speak(s: GameState, c: CrewState, key: keyof typeof LINES, mood: 'bad' | 'good') {
  if (c.lastSaid === key || (c.say && c.say.until > s.time)) return;
  const options = LINES[key];
  c.say = { text: options[Math.floor(s.time * 7 + c.name.length) % options.length], until: s.time + 0.55, mood };
  c.lastSaid = key;
}

const EVENT_NAME = { flare: 'Solar flare', cme: 'Solar storm', dust: 'Dust storm' };

function stepEvents(s: GameState) {
  const early = isOn(s, 'comms') ? K.COMMS_EXTRA_WARNING : 0;
  for (const e of s.events) {
    if (e.phase === 'pending' && s.time >= e.warnAt - early) {
      e.phase = 'warned';
      log(s, 'warn', `${EVENT_NAME[e.kind]} warning!`);
    }
    if (e.phase === 'warned' && s.time >= e.startAt) {
      e.phase = 'active';
      s.pulse.hit++;
      log(s, 'bad', `${EVENT_NAME[e.kind]} has arrived.`);
    }
    if (e.phase === 'active' && s.time >= e.endAt) {
      e.phase = 'done';
      if (e.kind === 'dust') log(s, 'good', 'The dust is clearing. Sunlight is back.');
      else {
        const blocked = e.doseUnshielded > 0 ? Math.round(100 * (1 - e.doseTaken / e.doseUnshielded)) : 0;
        if (blocked >= 60) { s.stats.stormsBeaten++; s.pulse.survived++; }
        log(s, blocked >= 60 ? 'good' : 'warn', blocked < 5 ? `${EVENT_NAME[e.kind]} is over. Nothing blocked it.` : `${EVENT_NAME[e.kind]} is over. Your shield blocked ${blocked}% of it.`);
      }
    }
  }
}

function hurt(c: CrewState, cause: Cause, amount: number) {
  c.health -= amount;
  c.hurtBy[cause] += amount;
}

function stepCrew(s: GameState, dt: number, air: boolean, heat: boolean, rate: number) {
  const med = s.modules.find((m) => m.kind === 'medbay' && m.on);
  const medicIn = !!med && workersIn(s, med.id).some((c) => c.role === 'Medic' && !isFainted(c));
  for (const c of s.crew) {
    if (c.out) continue;
    const inBed = !!med && c.at === med.id;
    const care = inBed ? (medicIn ? 1.4 : 1) : 0;

    // Air
    const wasStage = hypoxiaStage(c.noAir);
    c.noAir = air ? Math.max(0, c.noAir - 5 * dt) : c.noAir + dt / c.tolerance;
    const stage = hypoxiaStage(c.noAir);
    c.spo2 = spo2For(c.noAir);
    if (stage === 1) hurt(c, 'air', 4 * dt);
    if (stage === 2) hurt(c, 'air', 9 * dt);
    if (stage === 3) hurt(c, 'air', 16 * dt);
    if (stage > wasStage && stage === 1) speak(s, c, 'air1', 'bad');
    if (stage > wasStage && stage === 2) speak(s, c, 'air2', 'bad');
    if (wasStage > 0 && stage === 0) speak(s, c, 'airBack', 'good');

    // Warmth
    const wasCold = c.temp < K.HYPOTHERMIA_TEMP;
    if (heat) c.temp = Math.min(K.NORMAL_TEMP, c.temp + (inBed ? K.TEMP_RISE_MEDBAY : K.TEMP_RISE) * dt);
    else c.temp = Math.max(88, c.temp - (K.TEMP_FALL / c.tolerance) * dt);
    if (c.temp < K.HYPOTHERMIA_TEMP) hurt(c, 'cold', (c.temp < 92 ? 10 : 4.5) * dt);
    const cold = c.temp < K.HYPOTHERMIA_TEMP;
    if (cold && !wasCold) speak(s, c, 'cold', 'bad');
    if (!cold && wasCold) speak(s, c, 'warm', 'good');

    // Radiation: the dose is permanent, the sickness can be treated.
    c.dose += (rate / c.tolerance) * dt;
    const acute = Math.max(0, rate - K.BACKGROUND_DOSE);
    const wasSick = c.sick > 0.25;
    if (acute > 8) c.sick = Math.min(1, c.sick + (acute / 70 / c.tolerance) * dt);
    else c.sick = Math.max(0, c.sick - (care ? 0.55 * care : c.at === 'hab' ? 0.13 : 0.05) * dt);
    if (c.sick > 0.05) hurt(c, 'radiation', 9 * c.sick * dt);
    if (c.sick > 0.25 && !wasSick) speak(s, c, 'rad', 'bad');

    // Recovery, up to a ceiling that radiation lowers for good.
    const cap = maxHealth(c.dose, K.CAREER_LIMIT);
    const stable = stage === 0 && !cold && c.sick < 0.15;
    const before = c.health;
    if (stable) c.health += (care ? 12 * care : c.at === 'hab' ? 4.5 : 3) * dt;
    if (c.health > cap) {
      if (before > cap) c.hurtBy.radiation += before - cap;
      c.health = cap;
    }
    if (stable && before < cap - 0.5 && c.health >= cap - 0.5 && c.lastSaid !== 'well' && c.lastSaid !== '' && c.lastSaid !== 'hello') speak(s, c, 'well', 'good');

    c.hr += (heartRateFor(c) - c.hr) * Math.min(1, 3 * dt);
    if (c.say && c.say.until <= s.time) c.say = null;

    if (c.health <= 0 || c.noAir >= K.HYPOXIA.lost) {
      c.health = 0;
      c.out = true;
      c.say = null;
    }
  }
}

/**
 * Move the base forward by `dt` sols. Pure: the same state and dt always
 * give the same result, which is what makes the balance testable.
 */
export function step(prev: GameState, dt: number): GameState {
  if (prev.status !== 'playing') return prev;
  const s = clone(prev);
  s.time += dt;

  stepEvents(s);

  for (const m of s.modules) {
    if (m.buildLeft > 0) {
      m.buildLeft = Math.max(0, m.buildLeft - dt);
      if (m.buildLeft === 0) {
        s.pulse.built++;
        log(s, 'good', `${MODULE_NAME[m.kind]} is ready${GENERATOR(m.kind) ? '. More power!' : '. Switch it on when you have power'}.`);
      }
    }
  }
  shedLoad(s);

  // Cargo: Earth sends a lander every few sols, sooner when the lab is doing science.
  const lab = s.modules.find((m) => m.kind === 'lab' && m.on);
  const research = lab && workersIn(s, lab.id).some((c) => !isFainted(c)) ? staffing(s, lab) : 0;
  s.science += K.SCIENCE_PER_SOL * research * dt;
  if (!s.offer && s.time < K.MISSION_SOLS - 1) {
    s.cargoProgress += (dt / K.CARGO_SOLS) * (1 + K.LAB_CARGO_BOOST * research);
    if (s.cargoProgress >= 1) {
      s.cargoProgress = 1;
      s.offer = makeOffer(s);
      s.pulse.landed++;
      log(s, 'good', 'A cargo lander has touched down.');
    }
  }

  // Life support
  const flow = lifeFlow(s);
  s.life = Math.max(0, Math.min(100, s.life + flow.net * dt));
  s.stats.lowestLife = Math.min(s.stats.lowestLife, s.life);
  const air = s.life > 0;
  if (!air) s.stats.airOutSols += dt;
  const heat = isOn(s, 'hab');
  if (!heat) s.stats.coldSols += dt;

  // Shield
  s.shield = Math.max(0, Math.min(100, s.shield + (isOn(s, 'dome') ? K.SHIELD_CHARGE : -K.SHIELD_FADE) * dt));

  // Radiation
  const storm = stormDose(s);
  const stormIn = storm * (1 - shieldBlock(s));
  const rate = K.BACKGROUND_DOSE + stormIn;
  for (const e of activeEvents(s)) {
    if (e.kind === 'dust') continue;
    e.doseTaken += stormIn * dt;
    e.doseUnshielded += storm * dt;
  }

  stepCrew(s, dt, air, heat, rate);

  const lost = s.crew.find((c) => c.out);
  if (lost) {
    s.status = 'lost';
    const h = lost.hurtBy;
    s.lostCause = (Object.keys(h) as Cause[]).sort((a, b) => h[b] - h[a])[0];
    log(s, 'bad', `${lost.name} had to be rushed to the emergency return ship. Mission over.`);
  } else if (s.time >= K.MISSION_SOLS + 1) {
    s.status = 'won';
    s.time = K.MISSION_SOLS + 1;
    log(s, 'good', 'Sol 30 complete. You built a home on Mars!');
  }
  return s;
}

export { isFainted };
