import * as K from './constants';
import { planEvents, type Catalog } from './events';
import { makeRng } from './rng';
import type { Cause, CrewState, GameEvent, GameState, ModuleKind, ModuleState, PowerInfo } from './types';
import { heartRateFor, hypoxiaStage, isFainted, maxHealth, spo2For } from './vitals';

const CREW_SEED = [
  { id: 'ada', name: 'Ada', role: 'Engineer', restHr: 62 },
  { id: 'kofi', name: 'Kofi', role: 'Botanist', restHr: 66 },
  { id: 'mei', name: 'Mei', role: 'Medic', restHr: 60 },
  { id: 'luis', name: 'Luis', role: 'Pilot', restHr: 68 },
];

const LINES = {
  air1: ['I feel a little dizzy...', 'Is the air getting thin in here?'],
  air2: ["It's so hard to breathe...", "I'm too tired to walk."],
  cold: ["I can't stop shivering!", 'My fingers are freezing, Commander!'],
  rad: ['My skin feels like it is burning!', 'I feel really sick to my stomach...'],
  airBack: ['Ah, fresh air!', 'I can breathe again!'],
  warm: ['Warming up now, thanks Commander!'],
  well: ['Back to 100%!', 'Feeling much better!'],
};

export type Difficulty = 'cadet' | 'commander';

export function createGame(seed: number, catalog: Catalog, activity = 1, difficulty: Difficulty = 'commander'): GameState {
  const cadet = difficulty === 'cadet';
  const rng = makeRng(seed);
  const mod = (kind: ModuleKind, slot: number, i: number): ModuleState => ({
    id: `m${i}`, kind, slot, on: kind !== 'solar', buildLeft: 0, onSince: 0,
  });
  const crew: CrewState[] = CREW_SEED.map((c) => ({
    ...c,
    tolerance: rng.range(0.88, 1.12),
    spo2: 98, hr: c.restHr, temp: K.NORMAL_TEMP, dose: 0, sick: 0, health: 100, noAir: 0,
    hurtBy: { air: 0, cold: 0, radiation: 0 },
    out: false, say: null, lastSaid: '',
  }));
  return {
    seed,
    time: 1,
    status: 'playing',
    lostCause: null,
    modules: [mod('solar', 0, 0), mod('solar', 1, 1), mod('oxygen', 3, 2), mod('greenhouse', 4, 3), mod('heater', 5, 4)],
    crew,
    life: cadet ? 75 : 60,
    shield: 0,
    events: planEvents(rng, catalog, activity, cadet),
    difficulty,
    patient: null,
    log: [{ t: 1, tone: 'info', text: 'Touchdown at Gale Crater. Keep your crew alive for 30 sols.' }],
    stats: { brownouts: 0, builds: 0, airOutSols: 0, coldSols: 0, lowestLife: 60 },
    pulse: { brownout: 0, denied: 0, hit: 0 },
    nextId: 5,
  };
}

// ---------- reading the state ----------

export const activeEvents = (s: GameState, kind?: GameEvent['kind']) =>
  s.events.filter((e) => e.phase === 'active' && (!kind || e.kind === kind));

/** Share of sunlight reaching the panels (1 = clear sky). */
export function sunlight(s: GameState): number {
  const dust = activeEvents(s, 'dust').reduce((m, e) => Math.max(m, e.strength), 0);
  return 1 - K.DUST_MAX_LOSS * dust;
}

export function power(s: GameState): PowerInfo {
  const light = sunlight(s);
  const arrays = s.modules.filter((m) => m.kind === 'solar' && m.buildLeft <= 0).length;
  const supply = Math.floor(arrays * K.SOLAR_OUTPUT * light + 1e-6);
  const used = s.modules.reduce((n, m) => n + (m.on ? K.POWER_COST[m.kind] : 0), 0);
  return { supply, used, free: supply - used, sunlight: light };
}

export const isOn = (s: GameState, kind: ModuleKind) => s.modules.some((m) => m.kind === kind && m.on);
const countOn = (s: GameState, kind: ModuleKind) => s.modules.filter((m) => m.kind === kind && m.on).length;

/** Storm radiation arriving at the outpost right now, mSv per sol, before the shield. */
export function stormDose(s: GameState): number {
  let rate = 0;
  for (const e of activeEvents(s)) {
    if (e.kind === 'cme') rate += K.CME_DOSE * e.strength;
    if (e.kind === 'flare') rate += K.FLARE_DOSE * e.strength;
  }
  return rate;
}

/** Life-support change per sol, split up so the UI can explain it. */
export function lifeFlow(s: GameState) {
  const alive = s.crew.filter((c) => !c.out);
  const crewUse = alive.reduce((n, c) => n + K.CREW_USE * (c.temp < K.HYPOTHERMIA_TEMP ? K.COLD_USE_MULTIPLIER : 1), 0);
  const rooms = s.modules.filter((m) => m.kind !== 'solar').length;
  const upkeep = Math.max(0, rooms - K.UPKEEP_FREE_ROOMS) * K.UPKEEP_PER_ROOM;
  const made = countOn(s, 'oxygen') * K.OXYGEN_MAKES + countOn(s, 'greenhouse') * K.GREENHOUSE_MAKES;
  return { made, used: crewUse + upkeep, net: made - crewUse - upkeep };
}

// ---------- player actions (each returns a new state) ----------

const clone = (s: GameState): GameState => structuredClone(s);
const log = (s: GameState, tone: GameState['log'][number]['tone'], text: string) => {
  s.log.push({ t: s.time, tone, text });
  if (s.log.length > 60) s.log.shift();
};

export const MODULE_NAME: Record<ModuleKind, string> = {
  solar: 'Solar Array',
  oxygen: 'Oxygen Maker',
  greenhouse: 'Greenhouse',
  heater: 'Heater',
  shield: 'Storm Shield',
  medbay: 'Med Bay',
};

export type ToggleResult = { state: GameState; ok: boolean; reason?: string };

export function toggleModule(prev: GameState, id: string): ToggleResult {
  const target = prev.modules.find((m) => m.id === id);
  if (!target || target.kind === 'solar' || prev.status !== 'playing') return { state: prev, ok: false };
  if (target.buildLeft > 0) return { state: prev, ok: false, reason: 'Still being built.' };
  const s = clone(prev);
  const m = s.modules.find((x) => x.id === id)!;
  if (!m.on) {
    const p = power(s);
    const need = K.POWER_COST[m.kind];
    if (need > p.free) {
      s.pulse.denied++;
      const short = need - p.free;
      return { state: s, ok: false, reason: `Not enough power. Switch off ${short} more power first.` };
    }
    m.on = true;
    m.onSince = s.time;
  } else {
    m.on = false;
    if (m.kind === 'medbay') s.patient = null;
  }
  return { state: s, ok: true };
}

export function canBuild(s: GameState, kind: ModuleKind, slot: number): string | null {
  if (s.modules.some((m) => m.slot === slot)) return 'Something is already built here.';
  const surface = K.SURFACE_SLOTS.includes(slot);
  if (surface !== (kind === 'solar')) return surface ? 'Only solar arrays work up on the surface.' : 'Solar arrays need sunlight. Build them on the surface.';
  if ((kind === 'shield' || kind === 'medbay' || kind === 'heater') && s.modules.some((m) => m.kind === kind)) return `You already have a ${MODULE_NAME[kind]}.`;
  if (s.life <= K.BUILD_LIFE_COST + 3) return 'Life support is too low to build safely.';
  return null;
}

export function build(prev: GameState, kind: ModuleKind, slot: number): GameState {
  if (prev.status !== 'playing' || canBuild(prev, kind, slot)) return prev;
  const s = clone(prev);
  s.modules.push({ id: `m${s.nextId++}`, kind, slot, on: false, buildLeft: K.BUILD_SOLS, onSince: 0 });
  s.life -= K.BUILD_LIFE_COST;
  s.stats.builds++;
  log(s, 'info', `Building a ${MODULE_NAME[kind]}. The hard work used ${K.BUILD_LIFE_COST} life support.`);
  return s;
}

export function removeModule(prev: GameState, id: string): GameState {
  const m = prev.modules.find((x) => x.id === id);
  if (!m || prev.status !== 'playing') return prev;
  const s = clone(prev);
  s.modules = s.modules.filter((x) => x.id !== id);
  if (m.kind === 'medbay') s.patient = null;
  log(s, 'info', `${MODULE_NAME[m.kind]} taken apart.`);
  shedLoad(s);
  return s;
}

/** Put one crew member in the Med Bay bed (or pass null to empty it). One bed: that is triage. */
export function setPatient(prev: GameState, crewId: string | null): GameState {
  if (prev.status !== 'playing') return prev;
  const s = clone(prev);
  s.patient = crewId && s.crew.some((c) => c.id === crewId && !c.out) ? crewId : null;
  return s;
}

// ---------- the simulation ----------

/** When power drops, the newest loads trip off until the outpost fits its budget. */
function shedLoad(s: GameState) {
  let p = power(s);
  let tripped = false;
  while (p.free < 0) {
    const victim = s.modules.filter((m) => m.on && K.POWER_COST[m.kind] > 0).sort((a, b) => b.onSince - a.onSince)[0];
    if (!victim) break;
    victim.on = false;
    if (victim.kind === 'medbay') s.patient = null;
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
  for (const e of s.events) {
    if (e.phase === 'pending' && s.time >= e.warnAt) {
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
  const medOn = isOn(s, 'medbay');
  for (const c of s.crew) {
    if (c.out) continue;
    const inBed = medOn && s.patient === c.id;

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
    const got = (rate / c.tolerance) * dt;
    c.dose += got;
    const acute = Math.max(0, rate - K.BACKGROUND_DOSE);
    const wasSick = c.sick > 0.25;
    if (acute > 8) c.sick = Math.min(1, c.sick + (acute / 70 / c.tolerance) * dt);
    else c.sick = Math.max(0, c.sick - (inBed ? 0.55 : 0.04) * dt);
    if (c.sick > 0.05) hurt(c, 'radiation', 9 * c.sick * dt);
    if (c.sick > 0.25 && !wasSick) speak(s, c, 'rad', 'bad');

    // Recovery, up to a ceiling that radiation lowers for good.
    const cap = maxHealth(c.dose, K.CAREER_LIMIT);
    const stable = stage === 0 && !cold && c.sick < 0.15;
    const before = c.health;
    if (stable) c.health += (inBed ? 12 : 3.5) * dt;
    if (c.health > cap) {
      if (before > cap) c.hurtBy.radiation += before - cap;
      c.health = cap;
    }
    if (stable && before < cap - 0.5 && c.health >= cap - 0.5 && c.lastSaid !== 'well' && c.lastSaid !== '') speak(s, c, 'well', 'good');

    c.hr += (heartRateFor(c) - c.hr) * Math.min(1, 3 * dt);
    if (c.say && c.say.until <= s.time) c.say = null;

    if (c.health <= 0 || c.noAir >= K.HYPOXIA.lost) {
      c.health = 0;
      c.out = true;
      c.say = null;
      if (s.patient === c.id) s.patient = null;
    }
  }
}

/**
 * Move the outpost forward by `dt` sols. Pure: the same state and dt always
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
      if (m.buildLeft === 0) log(s, 'good', `${MODULE_NAME[m.kind]} is ready${m.kind === 'solar' ? '' : '. Switch it on when you have power'}.`);
    }
  }
  shedLoad(s);

  // Life support
  const flow = lifeFlow(s);
  s.life = Math.max(0, Math.min(100, s.life + flow.net * dt));
  s.stats.lowestLife = Math.min(s.stats.lowestLife, s.life);
  const air = s.life > 0;
  if (!air) s.stats.airOutSols += dt;
  const heat = isOn(s, 'heater');
  if (!heat) s.stats.coldSols += dt;

  // Shield
  s.shield = Math.max(0, Math.min(100, s.shield + (isOn(s, 'shield') ? K.SHIELD_CHARGE : -K.SHIELD_FADE) * dt));

  // Radiation
  const storm = stormDose(s);
  const stormIn = storm * (1 - K.SHIELD_BLOCK * (s.shield / 100));
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
    log(s, 'good', 'Sol 30 complete. The relief crew has landed. You did it, Commander!');
  }
  return s;
}

export { isFainted };
