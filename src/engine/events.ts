import { MISSION_SOLS } from './constants';
import type { Rng } from './rng';
import type { EventKind, GameEvent } from './types';

/** A real record the engine can replay. Strength (0-1) is worked out from real measurements. */
export interface CatalogEntry {
  id: string;
  strength: number;
}
export interface Catalog {
  flare: CatalogEntry[];
  cme: CatalogEntry[];
  dust: CatalogEntry[];
}

/**
 * Warning time, in sols.
 * REAL: a flare's light reaches Mars in about 12.5 minutes, so there is almost no warning.
 * REAL: a CME is a slower cloud of particles that takes a day or more to cross, and Mars
 * dust storms can be seen building from orbit.
 */
const WARNING: Record<EventKind, [number, number]> = {
  flare: [0.3, 0.4],
  cme: [1.2, 1.6],
  dust: [0.9, 1.3],
};
const DURATION: Record<EventKind, [number, number]> = {
  flare: [0.5, 0.7],
  cme: [1.6, 2.6],
  dust: [2.4, 3.6],
};

/**
 * Plans a mission's emergencies. The order and the real records change every game,
 * but the mission always ramps up: one gentle storm to learn on, then harder mixes.
 * `activity` (0.8-1.25) comes from how busy the real Sun is right now.
 */
export function planEvents(rng: Rng, catalog: Catalog, activity = 1, cadet = false): GameEvent[] {
  // Cadet missions get weaker storms and more warning time.
  const ease = cadet ? 0.72 : 1;
  const extraWarning = cadet ? 0.6 : 0;
  const middle = rng.shuffle<EventKind>(['dust', 'flare', 'cme', 'dust', 'flare']);
  if (activity > 1.1) middle.splice(rng.pick([1, 2, 3]), 0, 'flare');
  const order: EventKind[] = ['cme', ...middle, 'cme'];

  const used = new Set<string>();
  const byStrength = (kind: EventKind, want: number) => {
    const pool = catalog[kind].filter((e) => !used.has(e.id));
    const from = pool.length ? pool : catalog[kind];
    // Pick among the three records closest to the difficulty we want here.
    const near = from.slice().sort((a, b) => Math.abs(a.strength - want) - Math.abs(b.strength - want)).slice(0, 3);
    const chosen = rng.pick(near);
    used.add(chosen.id);
    return chosen;
  };

  const first = 7.8;
  const last = MISSION_SOLS - 3.4;
  const gap = (last - first) / (order.length - 1);
  const events: GameEvent[] = [];
  order.forEach((kind, i) => {
    const progress = i / (order.length - 1);
    const record = byStrength(kind, 0.35 + 0.65 * progress);
    const startAt = first + gap * i + (i === 0 ? 0 : rng.range(-0.8, 0.8));
    const ramp = Math.min(1, (0.55 + 0.45 * progress) * activity);
    events.push({
      id: `e${i}`,
      kind,
      recordId: record.id,
      warnAt: startAt - rng.range(...WARNING[kind]) - extraWarning,
      startAt,
      endAt: startAt + rng.range(...DURATION[kind]),
      strength: Math.max(0.3, Math.min(1, record.strength * ramp + 0.15 * progress)) * ease,
      phase: 'pending',
      doseTaken: 0,
      doseUnshielded: 0,
    });
  });

  // The finale: a dust storm rolls in while the last CME is still hitting,
  // so power is short exactly when the shield needs it most.
  const finale = events[events.length - 1];
  const dust = byStrength('dust', 0.8);
  const dustStart = finale.startAt - 0.5;
  events.push({
    id: 'e-finale-dust',
    kind: 'dust',
    recordId: dust.id,
    warnAt: dustStart - 1 - extraWarning,
    startAt: dustStart,
    endAt: finale.endAt + 0.4,
    strength: Math.max(0.6, dust.strength) * ease,
    phase: 'pending',
    doseTaken: 0,
    doseUnshielded: 0,
  });
  return events.sort((a, b) => a.warnAt - b.warnAt);
}
