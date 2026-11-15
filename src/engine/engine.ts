import * as K from './constants';
import { planEvents, type Catalog } from './events';
import { makeRng } from './rng';
import type { CargoOffer, Cause, CrewState, GameEvent, GameState, Like, ModuleKind, ModuleState, PowerInfo, Role, TraitId, Trip } from './types';
import { heartRateFor, hypoxiaStage, isFainted, maxHealth, spo2For } from './vitals';

export type Difficulty = 'easy' | 'normal' | 'hard';
/** Easy: gentler storms, more warning, a fuller tank. Hard: storms at the strength of the real records. */
export const LEVEL: Record<Difficulty, { ease: number; warning: number; life: number }> = {
  easy: { ease: 0.72, warning: 0.6, life: 15 },
  normal: { ease: 0.88, warning: 0.3, life: 8 },
  hard: { ease: 1.15, warning: 0, life: -8 },
};
type Recruit = NonNullable<CargoOffer['crew']>;

/** Every astronaut has one trait that changes how they play. */
export const TRAITS: Record<TraitId, { name: string; text: string }> = {
  nightowl: { name: 'Night owl', text: 'Works at night without getting extra tired.' },
  steady: { name: 'Steady', text: 'Stays calm. Loses mood half as fast.' },
  sunny: { name: 'Sunny', text: 'Cheers up everyone in the same room.' },
  explorer: { name: 'Explorer', text: 'Spots extra discoveries out in the crater.' },
  tireless: { name: 'Coffee powered', text: 'Gets tired 25% slower.' },
  builder: { name: 'Speed builder', text: 'Builds twice as fast.' },
  sleepyhead: { name: 'Big sleeper', text: 'Tires a bit faster, but sleeps it off quickly.' },
  brave: { name: 'Brave', text: 'Bad news and cold barely dent their mood.' },
};
const has = (c: CrewState, t: TraitId) => c.trait === t && !c.out;

/** What each 'likes' means, in a child's words. */
export const LIKE_TEXT: Record<Like, string> = {
  fixing: 'working in the Oxygen Maker', medbay: 'looking after people in the Med Bay', hydro: 'growing plants in Hydroponics',
  explore: 'exploring the crater', lab: 'doing science in the Lab', build: 'building and upgrading',
  sleep: 'a good long sleep', company: 'being with other people',
};
/** Is this astronaut doing the thing they love right now? */
export function enjoying(s: GameState, c: CrewState): boolean {
  if (c.out) return false;
  const room = s.modules.find((m) => m.id === c.at);
  switch (c.likes) {
    case 'explore': return !!c.trip;
    case 'build': return !!room && room.buildLeft > 0;
    case 'sleep': return c.at === 'hab' && !c.trip;
    case 'company': return !c.trip && s.crew.some((o) => o !== c && !o.out && !o.trip && o.at === c.at);
    case 'fixing': return room?.kind === 'oxygen' && room.on;
    case 'medbay': return room?.kind === 'medbay' && room.on;
    case 'hydro': return room?.kind === 'hydro' && room.on;
    case 'lab': return room?.kind === 'lab' && room.on;
  }
}

/** The four astronauts a player can pick as their commander, one of each specialist. */
export const COMMANDERS: (Recruit & { perk: string })[] = [
  { id: 'ada', likes: 'fixing', trait: 'nightowl', name: 'Ada', role: 'Engineer', skin: '#9a6240', suit: '#ffd23f', restHr: 62, quirk: "Names every wrench. Her favourite is Gerald.", perk: `Starts with ${K.ENGINEER_EXTRA_PARTS} extra spare parts for Patches.` },
  { id: 'mei', likes: 'medbay', trait: 'steady', name: 'Mei', role: 'Medic', skin: '#f3cfa6', suit: '#ff8fb1', restHr: 60, quirk: "Hums while she checks heartbeats.", perk: 'The whole crew heals faster while Mei is alive.' },
  { id: 'kofi', likes: 'hydro', trait: 'sunny', name: 'Kofi', role: 'Botanist', skin: '#6a432c', suit: '#5ee6a0', restHr: 66, quirk: "Talks to the lettuce. Says it listens.", perk: 'Green fingers: Hydroponics makes 25% more food while Kofi is alive.' },
  { id: 'yuki', likes: 'explore', trait: 'explorer', name: 'Yuki', role: 'Scientist', skin: '#f6d9b8', suit: '#c9a6ff', restHr: 61, quirk: "Collects cool rocks. So many rocks.", perk: 'Cargo landers arrive faster, because Earth loves the data.' },
];
const RECRUITS: Recruit[] = [
  ...COMMANDERS.map(({ perk: _perk, ...r }) => r),
  { id: 'luis', likes: 'lab', trait: 'tireless', name: 'Luis', role: 'Scientist', skin: '#cf9668', suit: '#4fd8ff', restHr: 68, quirk: "Hates space-dried coffee. Drinks it anyway." },
  { id: 'zara', likes: 'build', trait: 'builder', name: 'Zara', role: 'Engineer', skin: '#b87a4f', suit: '#ff9a4d', restHr: 64, quirk: "Can fix anything with tape. Packed a lot of tape." },
  { id: 'omar', likes: 'sleep', trait: 'sleepyhead', name: 'Omar', role: 'Botanist', skin: '#e0b088', suit: '#b6f04f', restHr: 67, quirk: "Brought 40 kinds of seeds and one sock." },
  { id: 'tala', likes: 'company', trait: 'brave', name: 'Tala', role: 'Medic', skin: '#8a5a3c', suit: '#ff6f91', restHr: 65, quirk: "Tells terrible space jokes on purpose." },
];

/** Which specialist makes each module work best. */
export const SPECIALIST: Partial<Record<ModuleKind, Role>> = { oxygen: 'Engineer', hydro: 'Botanist', lab: 'Scientist', medbay: 'Medic' };

export const MODULE_NAME: Record<ModuleKind, string> = {
  pod: 'Capsule', miner: 'Regolith Miner', rover: 'Rover Garage', hab: 'Hab', solar: 'Solar Field', battery: 'Battery Bank', oxygen: 'Oxygen Maker', hydro: 'Hydroponics',
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
  grief: ['I miss them already.', 'We keep going. For them.', 'This one is for our friend.'],
  tired: ['I am so tired...', 'Need... sleep...', 'Can I take a nap soon?'],
  collapse: ['Zzz...'],
  rested: ['Ah, that nap was great!', 'Fully charged!'],
  strike: ['I need a break!', 'I have been working forever!'],
};

/** Each astronaut says things their own way. Falls back to the shared lines. */
const VOICE: Record<string, Partial<Record<keyof typeof LINES, string[]>>> = {
  ada: { hello: ['Gerald and I are ready to work!'], tired: ['Even Gerald needs a break...'], rested: ['Recharged! Where is my wrench?'] },
  mei: { hello: ['Everybody breathe in... and out. Hello, Mars.'], tired: ['Doctor\'s orders: I need a nap.'], rested: ['Heart rate normal. Ready!'] },
  kofi: { hello: ['Hello, little plants of the future!'], tired: ['Even sunflowers sleep at night...'], rested: ['Rise and shine, like a tomato!'] },
  yuki: { hello: ['Look at all these rocks!'], tired: ['Too tired to even look at rocks...'], rested: ['Rock hunting time!'] },
  luis: { hello: ['Is there coffee on Mars? There is now.'], tired: ['My coffee needs a coffee.'], rested: ['Fully caffeinated!'] },
  zara: { hello: ['I brought tape. Lots of tape.'], tired: ['Too tired to tape anything...'], rested: ['Let\'s build something!'] },
  omar: { hello: ['I packed 40 seeds and one sock. Hi!'], tired: ['Is it bedtime? It feels like bedtime.'], rested: ['That was the best nap of my life.'] },
  tala: { hello: ['Why did the astronaut bring a ladder? To reach space!'], tired: ['Too tired for jokes. That is serious.'], rested: ['I am back, and so are my jokes!'] },
};

function newCrew(r: Recruit, time: number, at: string, tolerance: number, commander = false): CrewState {
  const { perk: _perk, ...rest } = r as Recruit & { perk?: string };
  return {
    ...rest, arrived: time, at, tolerance, commander, diedAt: null, energy: 100, mood: 80, exhausted: false, trip: null, arriving: 0, cheeredAt: -9, emote: null,
    spo2: 98, hr: r.restHr, temp: K.NORMAL_TEMP, dose: 0, sick: 0, health: 100, noAir: 0,
    hurtBy: { air: 0, cold: 0, radiation: 0 }, out: false, say: null, lastSaid: '',
  };
}

export function createGame(seed: number, catalog: Catalog, activity = 1, difficulty: Difficulty = 'hard', commanderId = 'ada'): GameState {
  const level = LEVEL[difficulty];
  const rng = makeRng(seed);
  const mod = (id: string, kind: ModuleKind, cell: number, on: boolean): ModuleState => ({ id, kind, cell, on, buildLeft: 0, onSince: 0, patchedUntil: 0, level: 1, upgrading: false, buildTotal: 0, bin: 0 });
  // Rock piles out in the crater, west and east of the base (never under it).
  const spots = [0.04, 0.12, 0.2, 0.78, 0.86, 0.95];
  const deposits = spots.slice(0, K.DEPOSIT_COUNT).map((x, i) => {
    const size = Math.round(rng.range(K.DEPOSIT_MIN, K.DEPOSIT_MAX));
    return { id: `d${i}`, x: x + rng.range(-0.015, 0.015), left: size, size };
  });
  const life = K.START_LIFE + level.life;
  const lead = COMMANDERS.find((c) => c.id === commanderId) ?? COMMANDERS[0];
  return {
    seed,
    time: 1,
    status: 'playing',
    difficulty,
    lostCause: null,
    // Only the capsule is free. Everything else is earned and built by hand.
    modules: [mod('pod', 'pod', K.YARD_CELL, true)],
    // You land alone. Cargo landers bring the rest of the crew, one at a time.
    crew: [newCrew(lead, 1, 'hab', rng.range(0.9, 1.1), true)],
    life,
    shield: 0,
    events: planEvents(rng, catalog, activity, level.ease, level.warning),
    blueprints: [],
    cargoProgress: K.START_CARGO,
    landers: 0,
    offer: null,
    science: 0,
    spareParts: K.START_SPARE_PARTS + (lead.role === 'Engineer' ? K.ENGINEER_EXTRA_PARTS : 0),
    materials: 0,
    deposits,
    rover: null,
    foundLog: [],
    griefUntil: 0,
    log: [{ t: 1, tone: 'info', text: `Touchdown at Gale Crater. Commander ${lead.name} has landed alone, with nothing but a capsule.` }],
    stats: { brownouts: 0, stormsBeaten: 0, airOutSols: 0, coldSols: 0, lowestLife: life, built: 0, goals: 0, patches: 0, finds: 0, lost: 0, collapses: 0, strikes: 0, upgrades: 0, mined: 0 },
    pulse: { brownout: 0, denied: 0, hit: 0, survived: 0, landed: 0, built: 0, patched: 0, died: 0, upgraded: 0, delivered: 0 },
    nextId: 3,
  };
}

// ---------- reading the state ----------

const GENERATOR = (k: ModuleKind) => k === 'solar' || k === 'battery' || k === 'pod';
const ready = (m: ModuleState) => m.buildLeft <= 0;
/** Is the Hab built and finished? Until then the crew's home is the capsule. */
export const habReady = (s: GameState) => s.modules.some((m) => m.kind === 'hab' && m.id === 'hab' && ready(m));
/** Where the crew sleep right now: the Hab once it is built, the capsule before that. */
export const bedName = (s: GameState) => (habReady(s) ? 'the Hab' : 'the capsule');
/** Is this astronaut working on a building site? */
export const atSite = (s: GameState, c: CrewState) => s.modules.some((m) => m.id === c.at && !ready(m));
/** A jury-rigged module runs on spare parts for a while, so it draws no power. */
export const isPatched = (s: GameState, m: ModuleState) => m.patchedUntil > s.time;
/** Power this module is drawing right now. */
const draw = (s: GameState, m: ModuleState) => (m.on && !isPatched(s, m) ? K.POWER_COST[m.kind] : 0);

export const activeEvents = (s: GameState, kind?: GameEvent['kind']) =>
  s.events.filter((e) => e.phase === 'active' && (!kind || e.kind === kind));

/** Share of sunlight reaching the panels (1 = clear sky). */
export function sunlight(s: GameState): number {
  const dust = activeEvents(s, 'dust').reduce((m, e) => Math.max(m, e.strength), 0);
  return 1 - K.DUST_MAX_LOSS * dust;
}

export function power(s: GameState): PowerInfo {
  const light = sunlight(s);
  // Upgrading panels are offline. Higher levels make more.
  const arrays = s.modules.filter((m) => m.kind === 'solar' && ready(m)).reduce((n, m) => n + K.SOLAR_BY_LEVEL[m.level], 0);
  const batteries = s.modules.filter((m) => m.kind === 'battery' && ready(m)).reduce((n, m) => n + K.BATTERY_BY_LEVEL[m.level], 0);
  const pods = s.modules.filter((m) => m.kind === 'pod').length * K.POD_POWER;
  const supply = Math.floor(arrays * light + 1e-6) + batteries + pods;
  const used = s.modules.reduce((n, m) => n + draw(s, m), 0);
  return { supply, used, free: supply - used, sunlight: light, most: arrays + batteries + pods };
}

/** Power a kind of module needs when it is on. */
export const POWER_COST_OF = (k: ModuleKind) => K.POWER_COST[k];
export const isOn = (s: GameState, kind: ModuleKind) => s.modules.some((m) => m.kind === kind && m.on);
export const count = (s: GameState, kind: ModuleKind) => s.modules.filter((m) => m.kind === kind).length + s.blueprints.filter((b) => b === kind).length;
export const alive = (s: GameState) => s.crew.filter((c) => !c.out);
/** True while the commander of this role is alive, so their perk keeps working. */
export const leadIs = (s: GameState, role: Role) => s.crew.some((c) => c.commander && !c.out && c.role === role);
/** Crew at this module (working, building or resting). People out in the crater are not. */
export const workersIn = (s: GameState, moduleId: string) => s.crew.filter((c) => c.at === moduleId && !c.out && !c.trip);
/** How much better a module works at its level. */
export const boost = (m: ModuleState) => K.LEVEL_BOOST[m.level] ?? 1;

/** Is it night on Mars right now? The last part of every sol. */
export const isNight = (s: GameState) => s.time - Math.floor(s.time) >= K.NIGHT_FROM;

/** How fast this astronaut works right now: slower when tired or unhappy, not at all when collapsed. */
export function workRate(c: CrewState): number {
  if (c.exhausted || c.out) return 0;
  const e = c.energy >= K.TIRED_AT ? 1 : K.TIRED_MIN + (1 - K.TIRED_MIN) * (c.energy / K.TIRED_AT);
  const m = c.mood >= K.GRUMPY_AT ? 1 : K.GRUMPY_MIN + (1 - K.GRUMPY_MIN) * (c.mood / K.GRUMPY_AT);
  return e * m;
}

/** How well a module is working: half with nobody inside, best with a rested, happy specialist. */
export function staffing(s: GameState, m: ModuleState): number {
  const able = workersIn(s, m.id).filter((c) => !isFainted(c) && !c.exhausted && c.arriving <= 0);
  const grief = s.griefUntil > s.time ? K.GRIEF_WORK : 1;
  if (!able.length) return K.UNSTAFFED * grief;
  const best = Math.max(...able.map(workRate));
  const skill = 1 + (able.some((c) => c.role === SPECIALIST[m.kind]) ? K.SPECIALIST_BONUS : 0);
  return Math.max(K.UNSTAFFED, skill * best) * grief;
}

/** Which column of the base an astronaut is in, or null if they are outside (in the crater, the yard or the capsule). */
export function columnOf(s: GameState, c: CrewState): number | null {
  if (c.trip || c.out) return null;
  const m = s.modules.find((x) => x.id === c.at);
  if (!m || K.LAYER[m.kind] === 'yard') return null;
  return m.cell % K.GRID_COLS;
}
/** Columns a powered Shield Dome protects. Layout matters: build domes next to where people live and work. */
export function domeZone(m: ModuleState): [number, number] {
  const col = m.cell % K.GRID_COLS;
  const r = K.DOME_RADIUS[m.level] ?? 1;
  return [Math.max(0, col - r), Math.min(K.GRID_COLS - 1, col + r)];
}
/** 0-1: how well this astronaut is shielded by the domes around them. */
export function coverOf(s: GameState, c: CrewState): number {
  const col = columnOf(s, c);
  if (col === null) return 0;
  let best = 0;
  for (const m of s.modules) {
    if (m.kind !== 'dome' || !m.on || !ready(m)) continue;
    const [a, b] = domeZone(m);
    if (col >= a && col <= b) best = Math.max(best, K.DOME_STRENGTH[m.level] ?? 1);
  }
  return best;
}
/** Share of the crew inside a powered dome's zone. */
export function shieldCover(s: GameState): number {
  const crew = alive(s);
  return crew.length ? crew.filter((c) => coverOf(s, c) > 0).length / crew.length : 1;
}
/** 0-1: the share of storm radiation being blocked right now, across the whole crew. */
export const shieldBlock = (s: GameState) => {
  const crew = alive(s);
  if (!crew.length) return 0;
  return K.SHIELD_BLOCK * (s.shield / 100) * crew.reduce((n, c) => n + coverOf(s, c), 0) / crew.length;
};

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
    if (!ready(m)) continue;
    if (m.kind === 'oxygen') made += K.OXYGEN_MAKES * staffing(s, m) * boost(m);
    if (m.kind === 'hydro') made += K.HYDRO_MAKES * staffing(s, m) * boost(m) * (leadIs(s, 'Botanist') ? 1.25 : 1);
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
    // The first dome goes in the middle, and the first room is dug right below it.
    const anchor = c === (layer === 'surface' ? K.HAB_CELL : K.HAB_CELL + K.GRID_COLS);
    if (beside || anchor) out.push(c);
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
    m.patchedUntil = 0;
  }
  return { state: s, ok: true };
}

/**
 * Jury-rig a dead module with spare parts. It runs for PATCH_SOLS without drawing
 * any power, which can keep the air flowing through a dust storm.
 */
export function patch(prev: GameState, id: string): ToggleResult {
  const target = prev.modules.find((m) => m.id === id);
  if (!target || !K.PATCHABLE.includes(target.kind) || prev.status !== 'playing' || !ready(target) || target.on) return { state: prev, ok: false };
  if (prev.spareParts <= 0) return { state: prev, ok: false, reason: 'No spare parts left. The next lander brings more.' };
  const s = clone(prev);
  const m = s.modules.find((x) => x.id === id)!;
  m.on = true;
  m.onSince = s.time;
  m.patchedUntil = s.time + K.PATCH_SOLS;
  s.spareParts--;
  s.stats.patches++;
  s.pulse.patched++;
  log(s, 'good', `Patched the ${MODULE_NAME[m.kind]} with spare parts. It will run for ${K.PATCH_SOLS} sol with no power.`);
  return { state: s, ok: true };
}

/**
 * The commander spends a moment with an astronaut: a chat, a high five or a pep talk.
 * It lifts their mood, and they will not need it again for a little while.
 */
export function cheer(prev: GameState, id: string, kind: keyof typeof K.CHEER_MOOD): ToggleResult {
  const c0 = prev.crew.find((c) => c.id === id);
  if (!c0 || c0.out || prev.status !== 'playing') return { state: prev, ok: false };
  if (c0.trip) return { state: prev, ok: false, reason: `${c0.name} is out in the crater.` };
  if (prev.time - c0.cheeredAt < K.CHEER_COOLDOWN) return { state: prev, ok: false, reason: `${c0.name} is happy, and getting back to work. Try again later!` };
  const s = clone(prev);
  const c = s.crew.find((x) => x.id === id)!;
  c.mood = Math.min(100, c.mood + K.CHEER_MOOD[kind]);
  c.cheeredAt = s.time;
  c.emote = { kind: kind === 'chat' ? 'note' : kind === 'highfive' ? 'star' : 'heart', until: s.time + 0.5 };
  return { state: s, ok: true };
}

/** Apply a discovery's rewards to the state (changes it in place). */
function applyFind(s: GameState, reward: 'science' | 'part' | 'supplies', title: string) {
  s.stats.finds++;
  // Every discovery is news for Earth, so the next lander comes sooner. Data finds even more so.
  if (!s.offer) s.cargoProgress = Math.min(0.999, s.cargoProgress + K.FIND_CARGO_BOOST * (reward === 'science' ? 1.5 : 1));
  if (reward === 'part' && s.spareParts < K.MAX_SPARE_PARTS) s.spareParts++;
  else if (reward === 'science') s.science += K.FIND_SCIENCE;
  else s.life = Math.min(100, s.life + K.FIND_SUPPLIES);
  s.materials += K.FIND_MATERIALS;
  log(s, 'good', `Discovery: ${title}!`);
}

/** Something real found around the base: data for Earth, a spare part, or supplies, plus a few bricks. */
export function collectFind(prev: GameState, reward: 'science' | 'part' | 'supplies', title: string): GameState {
  if (prev.status !== 'playing') return prev;
  const s = clone(prev);
  applyFind(s, reward, title);
  return s;
}

/** Earth says thanks for a finished mini-mission: a spare part, or a small crate of supplies. */
export function grantReward(prev: GameState, reward: 'part' | 'supplies', boost: number = K.GOAL_CARGO_BOOST): GameState {
  if (prev.status !== 'playing') return prev;
  const s = clone(prev);
  s.stats.goals++;
  // Earth rewards a job well done: the next lander comes sooner.
  if (!s.offer) s.cargoProgress = Math.min(0.999, s.cargoProgress + boost);
  if (reward === 'part' && s.spareParts < K.MAX_SPARE_PARTS) s.spareParts++;
  else s.life = Math.min(100, s.life + K.GOAL_SUPPLIES);
  return s;
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
  // The Hab is built at a site of its own, then becomes the crew's home.
  s.modules.push({ id: kind === 'hab' ? 'hab-site' : `m${s.nextId++}`, kind, cell, on: false, buildLeft: K.BUILD_SOLS, onSince: 0, patchedUntil: 0, level: 1, upgrading: false, buildTotal: K.BUILD_SOLS, bin: 0 });
  s.stats.built++;
  log(s, 'info', `Building site ready for a ${MODULE_NAME[kind]}. Send an astronaut to build it!`);
  return s;
}

/**
 * Send a crew member somewhere: to work in a module, to build at a building site,
 * or home to rest ('hab' means home: the Hab once built, the capsule before that).
 */
export function assign(prev: GameState, crewId: string, moduleId: string): GameState {
  const id = moduleId === 'pod' ? 'hab' : moduleId;
  const m = prev.modules.find((x) => x.id === id);
  const c = prev.crew.find((x) => x.id === crewId);
  if (!c || c.out || prev.status !== 'playing') return prev;
  if (id !== 'hab') {
    if (!m) return prev;
    const slots = ready(m) ? K.WORK_SLOTS[m.kind] : K.BUILD_SLOTS;
    if (!slots || (c.at !== m.id && workersIn(prev, m.id).length >= slots)) return prev;
  }
  if (c.at === id || c.trip) return prev;
  moduleId = id;
  const s = clone(prev);
  const who = s.crew.find((x) => x.id === crewId)!;
  who.at = moduleId;
  // Nobody teleports: it takes a moment to walk (or climb down the ladder) to the new place.
  who.arriving = K.WALK_BASE;
  return s;
}

// ---------- jobs out in the crater ----------

/** How long it takes to walk from the base to a spot in the crater (0-1 across the world). */
export const walkTime = (x: number, rover = false) => (K.WALK_BASE + Math.abs(x - 0.5) * 2 * K.WALK_FAR) / (rover ? K.ROVER_SPEED : 1);
/** Who could be sent out right now: rested, at the base, not already out. */
export const canGoOut = (c: CrewState) => !c.out && !c.trip && !c.exhausted && c.energy > 25;
const sameJob = (a: Trip['job'], b: Trip['job']) => (a.kind === 'find' && b.kind === 'find' && a.id === b.id) || (a.kind === 'mine' && b.kind === 'mine' && a.dep === b.dep);
const jobTaken = (s: GameState, job: Trip['job']) => [...s.crew.map((c) => c.trip), s.rover?.trip].some((t) => !!t && t.phase !== 'back' && sameJob(t.job, job));

/**
 * Send an astronaut (or 'rover') out into the crater to fetch a discovery or dig bricks.
 * They walk there, work, and walk home. While outside they get no shield and no heat.
 */
export function sendOut(prev: GameState, who: string, job: Trip['job'], x: number): ToggleResult {
  if (prev.status !== 'playing') return { state: prev, ok: false };
  if (jobTaken(prev, job)) return { state: prev, ok: false, reason: 'Someone is already on the way there.' };
  if (job.kind === 'mine' && !(prev.deposits.find((d) => d.id === job.dep)?.left)) return { state: prev, ok: false, reason: 'That rock pile is used up.' };
  const s = clone(prev);
  const rover = who === 'rover';
  const t = walkTime(x, rover);
  const trip: Trip = { phase: 'out', left: t, total: t, x, job, carry: 0 };
  if (rover) {
    if (!s.rover || s.rover.trip) return { state: prev, ok: false, reason: 'The rover is busy.' };
    s.rover.trip = trip;
  } else {
    const c = s.crew.find((m) => m.id === who);
    if (!c || !canGoOut(c)) return { state: prev, ok: false, reason: c && !c.out && c.energy <= 25 ? `${c.name} is too tired to go out.` : 'Nobody is free to go.' };
    c.trip = trip;
    c.at = 'out';
    c.arriving = 0;
  }
  log(s, 'info', `${rover ? 'The rover' : s.crew.find((m) => m.id === who)!.name} heads out ${job.kind === 'find' ? `to investigate: ${job.title}` : 'to dig regolith'}.`);
  return { state: s, ok: true };
}

/** Tap a Regolith Miner to empty its bin into your brick pile. */
export function collectBin(prev: GameState, id: string): GameState {
  const m = prev.modules.find((x) => x.id === id);
  if (!m || m.kind !== 'miner' || m.bin < 1) return prev;
  const s = clone(prev);
  const mm = s.modules.find((x) => x.id === id)!;
  const got = Math.floor(mm.bin);
  mm.bin -= got;
  s.materials += got;
  s.stats.mined += got;
  s.pulse.delivered++;
  return s;
}

// ---------- upgrades ----------

/** The Hab is the heart of the base: nothing can be upgraded past the Hab's own level. */
export const habLevel = (s: GameState) => s.modules.find((m) => m.id === 'hab')?.level ?? 0;
export const upgradeCost = (m: ModuleState) => (m.kind === 'hab' ? K.HAB_UPGRADE_COST : K.UPGRADE_COST)[m.level] ?? Infinity;

/** Why this module cannot be upgraded right now, or null if it can. */
export function cannotUpgrade(s: GameState, m: ModuleState): string | null {
  if (m.kind === 'pod') return 'The capsule cannot be upgraded.';
  if (!ready(m)) return m.upgrading ? 'Already being upgraded.' : 'Finish building it first.';
  if (m.level >= K.MAX_LEVEL) return 'Already at the top level!';
  if (m.kind !== 'hab' && m.level >= habLevel(s)) return `Upgrade the Hab to level ${m.level + 1} first. Nothing can be better than your Hab.`;
  if (s.materials < upgradeCost(m)) return `Needs ${upgradeCost(m) - s.materials} more bricks.`;
  return null;
}

/** Start an upgrade: spend bricks, take the module offline, and wait for a builder. */
export function startUpgrade(prev: GameState, id: string): ToggleResult {
  const m0 = prev.modules.find((x) => x.id === id);
  if (!m0 || prev.status !== 'playing') return { state: prev, ok: false };
  const why = cannotUpgrade(prev, m0);
  if (why) return { state: prev, ok: false, reason: why };
  const s = clone(prev);
  const m = s.modules.find((x) => x.id === id)!;
  s.materials -= upgradeCost(m);
  m.upgrading = true;
  m.buildLeft = m.buildTotal = K.UPGRADE_SOLS[m.level] ?? 2;
  m.on = false;
  m.patchedUntil = 0;
  log(s, 'info', `Upgrading the ${MODULE_NAME[m.kind]} to level ${m.level + 1}. It is offline until a builder finishes.`);
  return { state: s, ok: true };
}

// ---------- layout ----------

/** Where this module could be moved to: any free spot in its own row that touches the rest of the base. */
export function moveTargets(s: GameState, id: string): number[] {
  const m = s.modules.find((x) => x.id === id);
  if (!m || K.LAYER[m.kind] === 'yard') return [];
  const others = { ...s, modules: s.modules.filter((x) => x.id !== id) };
  return buildableCells(others, m.kind).filter((c) => c !== m.cell);
}

/** Move a module to a new spot. Rearranging the base is free and instant. */
export function moveModule(prev: GameState, id: string, cell: number): GameState {
  if (!moveTargets(prev, id).includes(cell)) return prev;
  const s = clone(prev);
  s.modules.find((x) => x.id === id)!.cell = cell;
  return s;
}

/**
 * Works out what the next lander carries. The first one brings only building plans:
 * a Hab, an Oxygen Maker, power. You can only unpack two, so the very first choice matters.
 * Later landers bring a choice of crewmate too.
 */
function makeOffer(s: GameState): CargoOffer {
  const n = s.landers + 1;
  const rng = makeRng(s.seed + n * 9973);
  const room = (k: ModuleKind) => count(s, k) < K.MAX_OF[k];
  const all: ModuleKind[] = ['hab', 'solar', 'battery', 'oxygen', 'hydro', 'dome', 'medbay', 'lab', 'comms', 'miner', 'rover'];
  let options: ModuleKind[];
  if (n === 1) options = ['hab', 'oxygen', 'solar', 'battery'];
  else {
    const pool = rng.shuffle(all.filter(room));
    // Essentials you still lack come first.
    const must = (['hab', 'oxygen'] as ModuleKind[]).filter((k) => room(k));
    // The second lander always offers a way to make bricks.
    if (n === 2 && room('miner') && !count(s, 'miner')) must.push('miner');
    const power = pool.find((k) => k === 'solar' || k === 'battery');
    options = [...new Set([...must, ...(power ? [power] : []), ...pool])].slice(0, 4);
    // Earth always offers a Shield Dome when the crew has outgrown the ones you have.
    const crewSoon = Math.min(K.MAX_CREW, s.crew.length + 1);
    if (!options.includes('dome') && room('dome') && count(s, 'dome') * K.DOME_COVERS < crewSoon) options[options.length - 1] = 'dome';
  }
  const taken = new Set(s.crew.map((c) => c.id));
  const free = rng.shuffle(RECRUITS.filter((r) => !taken.has(r.id)));
  // The first crewmate offer always includes a Botanist, for the first Hydroponics.
  const botanist = free.find((r) => r.role === 'Botanist');
  const pair = n === 2 && botanist ? [botanist, ...free.filter((r) => r !== botanist)] : free;
  const crewOptions = n === 1 || s.crew.length >= K.MAX_CREW ? [] : pair.slice(0, 2);
  return { number: n, crew: crewOptions[0] ?? null, crewOptions, options, picks: Math.min(K.CARGO_PICKS, options.length) };
}

/**
 * Unpack the lander: the chosen blueprints are yours, and the chosen astronaut walks home.
 * `crewId` picks who comes (default: the first offered); null means nobody, for extra supplies.
 */
export function acceptCargo(prev: GameState, picks: ModuleKind[], crewId?: string | null): GameState {
  const offer = prev.offer;
  if (!offer) return prev;
  const s = clone(prev);
  const chosen = picks.filter((k) => offer.options.includes(k)).slice(0, offer.picks);
  s.blueprints.push(...chosen);
  const who = crewId === null ? null : offer.crewOptions.find((r) => r.id === crewId) ?? offer.crewOptions[0] ?? null;
  if (who) {
    const c = newCrew(who, s.time, 'hab', makeRng(s.seed + offer.number).range(0.88, 1.12));
    c.say = { text: (VOICE[c.id]?.hello ?? LINES.hello)[0], until: s.time + 0.9, mood: 'good' };
    s.crew.push(c);
    log(s, 'good', `${c.name} the ${c.role} has landed.`);
  } else if (offer.crewOptions.length) {
    s.life = Math.min(100, s.life + K.SKIP_CREW_SUPPLIES);
    log(s, 'info', 'No new crew this time. The lander was packed with extra supplies instead.');
  }
  s.life = Math.min(100, s.life + K.CARGO_SUPPLIES);
  s.spareParts = Math.min(K.MAX_SPARE_PARTS, s.spareParts + K.CARGO_SPARE_PARTS);
  s.materials += K.CARGO_MATERIALS;
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
    const victim = s.modules.filter((m) => draw(s, m) > 0).sort((a, b) => b.onSince - a.onSince)[0];
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
  const options = VOICE[c.id]?.[key] ?? LINES[key];
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
        if (blocked >= 60) { s.stats.stormsBeaten++; s.pulse.survived++; if (!s.offer) s.cargoProgress = Math.min(0.999, s.cargoProgress + K.STORM_CARGO_BOOST); }
        log(s, blocked >= 60 ? 'good' : 'warn', blocked < 5 ? `${EVENT_NAME[e.kind]} is over. Nothing blocked it.` : `${EVENT_NAME[e.kind]} is over. Your shield blocked ${blocked}% of it.`);
      }
    }
  }
}

/** What hurt this astronaut most. */
export const causeOf = (c: CrewState): Cause => (Object.keys(c.hurtBy) as Cause[]).sort((a, b) => c.hurtBy[b] - c.hurtBy[a])[0];
export const CAUSE_LINE: Record<Cause, string> = {
  air: 'The air ran out.',
  cold: 'It was too cold for too long.',
  radiation: 'Too much radiation got through.',
};

function hurt(c: CrewState, cause: Cause, amount: number) {
  c.health -= amount;
  c.hurtBy[cause] += amount;
}

function stepCrew(s: GameState, dt: number, air: boolean, habHeat: boolean, storm: number) {
  const inPod = !habReady(s);
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

    // Warmth: the Hab heats the whole base. Before it exists, only the capsule is warm. Outside is cold.
    const outside = !!c.trip;
    const heat = !outside && (habHeat || (inPod && c.at === 'hab'));
    const wasCold = c.temp < K.HYPOTHERMIA_TEMP;
    if (heat) c.temp = Math.min(K.NORMAL_TEMP, c.temp + (inBed ? K.TEMP_RISE_MEDBAY : K.TEMP_RISE) * dt);
    else c.temp = Math.max(88, c.temp - (K.TEMP_FALL / c.tolerance) * dt);
    if (c.temp < K.HYPOTHERMIA_TEMP) hurt(c, 'cold', (c.temp < 92 ? 10 : 4.5) * dt);
    const cold = c.temp < K.HYPOTHERMIA_TEMP;
    if (cold && !wasCold) speak(s, c, 'cold', 'bad');
    if (!cold && wasCold) speak(s, c, 'warm', 'good');

    // Radiation: the dose is permanent, the sickness can be treated. The domes only protect crew in their zone.
    const rate = K.BACKGROUND_DOSE + storm * (1 - K.SHIELD_BLOCK * (s.shield / 100) * coverOf(s, c));
    c.dose += (rate / c.tolerance) * dt;
    const acute = Math.max(0, rate - K.BACKGROUND_DOSE);
    const wasSick = c.sick > 0.25;
    if (acute > 8) c.sick = Math.min(1, c.sick + (acute / 70 / c.tolerance) * dt);
    else c.sick = Math.max(0, c.sick - (care ? 0.55 * care : c.at === 'hab' ? 0.13 : 0.05) * dt);
    if (c.sick > 0.05) hurt(c, 'radiation', 9 * c.sick * dt);
    if (c.sick > 0.25 && !wasSick) speak(s, c, 'rad', 'bad');

    // Energy: work uses it, sleep fills it. Night makes both stronger.
    const night = isNight(s);
    const room = s.modules.find((m) => m.id === c.at);
    if (c.arriving > 0) c.arriving = Math.max(0, c.arriving - dt);
    const resting = !outside && (c.exhausted || c.at === 'hab' || (inBed && c.role !== 'Medic'));
    const wasTired = c.energy < 30;
    if (resting) {
      // A real bed in a warm Hab beats a cramped capsule seat.
      const habLvl = s.modules.find((m) => m.id === 'hab')?.level ?? 1;
      const gain = c.exhausted && c.at !== 'hab' ? K.COLLAPSE_GAIN : c.at === 'hab' && habHeat && !inPod ? K.SLEEP_GAIN * (K.LEVEL_BOOST[habLvl] ?? 1) : K.REST_GAIN;
      c.energy = Math.min(100, c.energy + gain * (night ? K.NIGHT_SLEEP : 1) * (has(c, 'sleepyhead') ? 1.4 : 1) * dt);
    } else {
      const building = !!room && !ready(room);
      const drain = room?.on || building || outside ? K.WORK_DRAIN : K.IDLE_DRAIN;
      const nightCost = night && !has(c, 'nightowl') ? K.NIGHT_WORK : 1;
      const style = has(c, 'tireless') ? 0.75 : has(c, 'sleepyhead') ? 1.2 : 1;
      c.energy = Math.max(0, c.energy - drain * nightCost * style * dt);
    }
    if (!resting && !wasTired && c.energy < 30) speak(s, c, 'tired', 'bad');
    if (!c.exhausted && c.energy <= 0) {
      c.exhausted = true;
      c.mood = Math.max(0, c.mood - 15);
      s.stats.collapses++;
      log(s, 'bad', `${c.name} collapsed from exhaustion! Overworked astronauts fall asleep wherever they are.`);
      c.lastSaid = '';
      speak(s, c, 'collapse', 'bad');
    } else if (c.exhausted && c.energy >= K.WAKE_AT) {
      c.exhausted = false;
      speak(s, c, 'rested', 'good');
    }

    // Mood: tired, cold, overworked or sad crew get unhappy. Rest, warmth, fresh food and company help.
    let up = resting ? 8 : 1.5;
    let down = 0;
    if (c.exhausted) down += 20;
    else if (!resting && c.energy < K.TIRED_AT) down += 14 * (1 - c.energy / K.TIRED_AT);
    if (c.temp < K.HYPOTHERMIA_TEMP) down += has(c, 'brave') ? 4 : 15;
    if (s.griefUntil > s.time && !has(c, 'brave')) down += 8;
    if (inPod && c.at === 'hab') down += K.POD_GLOOM;
    if (s.modules.some((m) => m.kind === 'hydro' && m.on)) up += 2;
    const mates = s.crew.filter((o) => o !== c && !o.out && o.at === c.at);
    if (mates.length) up += 3;
    if (mates.some((o) => has(o, 'sunny'))) up += 6;
    if (enjoying(s, c)) up += K.LIKE_MOOD;
    if (has(c, 'steady')) down /= 2;
    c.mood = Math.max(0, Math.min(100, c.mood + (up - down) * dt));
    if (c.emote && c.emote.until <= s.time) c.emote = null;
    if (!c.emote && c.energy < 20 && !resting) c.emote = { kind: 'sweat', until: s.time + 0.4 };
    if (c.mood < K.STRIKE_AT && !resting && !c.exhausted && !outside && c.at !== 'hab') {
      c.at = 'hab';
      s.stats.strikes++;
      log(s, 'warn', `${c.name} is too unhappy to work and went to the Hab for a break.`);
      c.lastSaid = '';
      speak(s, c, 'strike', 'bad');
    }

    // Recovery, up to a ceiling that radiation lowers for good.
    const cap = maxHealth(c.dose, K.CAREER_LIMIT);
    const stable = stage === 0 && !cold && c.sick < 0.15;
    const before = c.health;
    const medic = leadIs(s, 'Medic') ? K.MEDIC_HEAL_BOOST : 1;
    if (stable) c.health += (care ? 12 * care : c.at === 'hab' ? 4.5 : 3) * medic * dt;
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
      c.trip = null;
      c.say = null;
      c.diedAt = s.time;
      s.stats.lost++;
      s.pulse.died++;
      s.griefUntil = s.time + K.GRIEF_SOLS;
      log(s, 'bad', `${c.name} did not survive. ${CAUSE_LINE[causeOf(c)]}`);
      for (const mate of s.crew) if (!mate.out) { mate.lastSaid = ''; speak(s, mate, 'grief', 'bad'); }
    }
  }
}

/**
 * Move the base forward by `dt` sols. Pure: the same state and dt always
 * give the same result, which is what makes the balance testable.
 */
/** Move one trip forward: walk out, do the job, walk home. Returns true when it is finished. */
function stepTrip(s: GameState, t: Trip, dt: number, rate: number, carry: number): boolean {
  if (t.phase === 'out') {
    t.left -= dt;
    if (t.left <= 0) {
      t.phase = 'work';
      t.left = t.total = t.job.kind === 'find' ? K.FIND_WORK_SOLS : K.MINE_SOLS;
    }
  } else if (t.phase === 'work') {
    t.left -= dt * rate;
    if (t.left <= 0) {
      if (t.job.kind === 'find') {
        applyFind(s, t.job.reward, t.job.title);
        s.foundLog.push(t.job.id);
      } else {
        const job = t.job;
        const d = s.deposits.find((x) => x.id === job.dep);
        const take = Math.min(carry, d?.left ?? 0);
        if (d) d.left -= take;
        t.carry = take;
      }
      t.phase = 'back';
      t.left = t.total = walkTime(t.x, carry === K.ROVER_CARRY);
    }
  } else {
    t.left -= dt;
    if (t.left <= 0) {
      if (t.carry) {
        s.materials += t.carry;
        s.stats.mined += t.carry;
        s.pulse.delivered++;
        log(s, 'good', `${t.carry} regolith bricks delivered to the base.`);
      }
      return true;
    }
  }
  return false;
}

export function step(prev: GameState, dt: number): GameState {
  if (prev.status !== 'playing') return prev;
  const s = clone(prev);
  s.time += dt;

  stepEvents(s);

  // Trips out in the crater. Collapsed astronauts stop where they are until they wake.
  for (const c of s.crew) {
    if (!c.trip || c.out) continue;
    if (c.exhausted) continue;
    if (stepTrip(s, c.trip, dt, Math.max(0.3, workRate(c)), K.CARRY)) {
      c.trip = null;
      c.at = 'hab';
      c.arriving = K.WALK_BASE;
    }
  }
  if (s.rover?.trip && stepTrip(s, s.rover.trip, dt, 1, K.ROVER_CARRY)) s.rover.trip = null;

  // Regolith Miners fill their bins while switched on. Bigger miners hold more.
  for (const m of s.modules) {
    if (m.kind === 'miner' && m.on && ready(m)) m.bin = Math.min(K.MINER_BIN * m.level, m.bin + K.MINER_RATE * boost(m) * dt);
  }

  // Nothing builds itself: an astronaut has to be at the site. Rested crew build faster.
  for (const m of s.modules) {
    if (m.buildLeft > 0) {
      const hands = workersIn(s, m.id).filter((c) => !c.exhausted);
      const rate = hands.length ? Math.max(...hands.map((c) => workRate(c) * (has(c, 'builder') ? 2 : 1))) * (1 + 0.25 * (hands.length - 1)) : 0;
      m.buildLeft = Math.max(0, m.buildLeft - dt * rate);
      if (m.buildLeft === 0) {
        // Builders stay on to work in a workplace; otherwise they head home.
        for (const c of s.crew) if (c.at === m.id && !(K.WORK_SLOTS[m.kind] && m.kind !== 'medbay')) { c.at = 'hab'; c.arriving = K.WALK_BASE; }
        if (m.id === 'hab-site') { m.id = 'hab'; m.on = true; m.onSince = s.time; }
        if (m.kind === 'rover' && !s.rover) s.rover = { trip: null };
        if (m.upgrading) {
          m.upgrading = false;
          m.level++;
          m.on = true;
          m.onSince = s.time;
          s.stats.upgrades++;
          s.pulse.upgraded++;
          log(s, 'good', `${MODULE_NAME[m.kind]} upgraded to level ${m.level}!`);
        } else {
          s.pulse.built++;
          log(s, 'good', `${MODULE_NAME[m.kind]} is ready${GENERATOR(m.kind) ? '. More power!' : m.kind === 'rover' ? '. The rover is ready to roll!' : '. Switch it on when you have power'}.`);
        }
      }
    }
  }
  // A patch that has run out stops helping. If there is no power for the module, it trips like any other.
  for (const m of s.modules) {
    if (m.patchedUntil > 0 && m.patchedUntil <= s.time) {
      m.patchedUntil = 0;
      log(s, 'warn', `The patch on the ${MODULE_NAME[m.kind]} has worn out.`);
    }
  }
  shedLoad(s);

  // Cargo: Earth sends a lander every few sols, sooner when the lab is doing science.
  const lab = s.modules.find((m) => m.kind === 'lab' && m.on);
  const research = lab && ready(lab) && workersIn(s, lab.id).some((c) => !isFainted(c)) ? staffing(s, lab) * boost(lab) : 0;
  s.science += K.SCIENCE_PER_SOL * research * dt;
  if (!s.offer && s.time < K.MISSION_SOLS - 1) {
    s.cargoProgress += (dt / K.CARGO_SOLS) * (1 + K.LAB_CARGO_BOOST * research) * (leadIs(s, 'Scientist') ? K.SCIENTIST_CARGO_BOOST : 1);
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
  const heat = habReady(s) && isOn(s, 'hab');
  if (!heat && alive(s).some((c) => c.at !== 'hab' || habReady(s))) s.stats.coldSols += dt;

  // Shield
  s.shield = Math.max(0, Math.min(100, s.shield + (isOn(s, 'dome') ? K.SHIELD_CHARGE : -K.SHIELD_FADE) * dt));

  // Radiation: each astronaut gets their own dose, depending on where they are.
  const storm = stormDose(s);
  const stormIn = storm * (1 - shieldBlock(s));
  for (const e of activeEvents(s)) {
    if (e.kind === 'dust') continue;
    e.doseTaken += stormIn * dt;
    e.doseUnshielded += storm * dt;
  }

  stepCrew(s, dt, air, heat, storm);

  // The mission ends if the commander dies, or if nobody is left.
  const lead = s.crew.find((c) => c.commander);
  const ended = (lead && lead.out) || s.crew.every((c) => c.out);
  if (ended) {
    s.status = 'lost';
    const last = lead && lead.out ? lead : s.crew[s.crew.length - 1];
    s.lostCause = causeOf(last);
    log(s, 'bad', lead && lead.out ? `Commander ${lead.name} is gone. Mission over.` : 'No crew left. Mission over.');
  } else if (s.time >= K.MISSION_SOLS + 1) {
    s.status = 'won';
    s.time = K.MISSION_SOLS + 1;
    log(s, 'good', 'Sol 30 complete. You built a home on Mars!');
  }
  return s;
}

export { isFainted };
