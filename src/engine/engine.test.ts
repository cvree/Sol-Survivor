import { describe, expect, it } from 'vitest';
import { BATTERY_OUTPUT, PAYLOAD, PAYLOAD_LIMIT, POWER_COST, SOLAR_OUTPUT } from './constants';
import { createGame, payloadMass, power, step, toggleModule } from './engine';
import { carefulBot, passiveBot, play } from './bots';
import type { Catalog } from './events';
import type { Loadout, PayloadId } from './types';
import { spo2For } from './vitals';

const catalog: Catalog = {
  flare: [{ id: 'f1', strength: 0.5 }, { id: 'f2', strength: 0.8 }, { id: 'f3', strength: 1 }],
  cme: [{ id: 'c1', strength: 0.4 }, { id: 'c2', strength: 0.7 }, { id: 'c3', strength: 1 }],
  dust: [{ id: 'd1', strength: 0.6 }, { id: 'd2', strength: 1 }],
};
const seeds = Array.from({ length: 30 }, (_, i) => 1000 + i * 7919);

/** Every loadout that fits on the lander. */
function allLoadouts(): Loadout[] {
  const ids = Object.keys(PAYLOAD) as PayloadId[];
  const out: Loadout[] = [];
  const walk = (i: number, cur: Loadout) => {
    if (i === ids.length) { if (payloadMass(cur) <= PAYLOAD_LIMIT) out.push({ ...cur }); return; }
    for (let n = 0; n <= PAYLOAD[ids[i]].max; n++) walk(i + 1, { ...cur, [ids[i]]: n });
  };
  walk(0, { shield: 0, medbay: 0, solar: 0, lab: 0, battery: 0, tank: 0 });
  return out;
}
const SHIELD_KIT: Loadout = { shield: 1, medbay: 1, solar: 1, lab: 0, battery: 0, tank: 1 };

describe('no perfect equilibrium', () => {
  it('you cannot pack everything', () => {
    const everything = (Object.keys(PAYLOAD) as PayloadId[]).reduce((n, k) => n + PAYLOAD[k].mass * PAYLOAD[k].max, 0);
    expect(everything).toBeGreaterThan(PAYLOAD_LIMIT);
  });

  it('no loadout that includes the shield can power every room at once', () => {
    for (const l of allLoadouts().filter((x) => x.shield)) {
      const supply = (2 + l.solar) * SOLAR_OUTPUT + l.battery * BATTERY_OUTPUT;
      const demand = POWER_COST.oxygen + POWER_COST.greenhouse + POWER_COST.heater + POWER_COST.shield
        + l.medbay * POWER_COST.medbay + l.lab * POWER_COST.lab;
      expect(demand).toBeGreaterThan(supply);
    }
  });

  it('refuses to switch on a room the power budget cannot cover', () => {
    const s = createGame(1, catalog, SHIELD_KIT);
    const shield = s.modules.find((m) => m.kind === 'shield')!;
    const r = toggleModule(s, shield.id);
    expect(r.ok).toBe(false);
    expect(power(r.state).free).toBeGreaterThanOrEqual(0);
  });

  it('a commander who never touches anything loses, whatever they packed', () => {
    for (const l of allLoadouts()) expect(play(createGame(seeds[0], catalog, l), passiveBot).status).toBe('lost');
  });

  it('a careful commander with a sensible loadout usually wins, and still pays for it', () => {
    const results = seeds.map((seed) => play(createGame(seed, catalog, SHIELD_KIT), carefulBot));
    const wins = results.filter((r) => r.status === 'won');
    expect(wins.length / seeds.length).toBeGreaterThan(0.6);
    for (const r of wins) for (const c of r.crew) expect(c.dose).toBeGreaterThan(15);
  });
});

describe('simulation rules', () => {
  it('never lets power use exceed supply, even when dust cuts sunlight', () => {
    for (const seed of seeds.slice(0, 8)) {
      let s = createGame(seed, catalog, SHIELD_KIT);
      for (let i = 0; i < 700 && s.status === 'playing'; i++) {
        s = step(carefulBot(s), 0.05);
        expect(power(s).free).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    expect(play(createGame(42, catalog, SHIELD_KIT), carefulBot)).toEqual(play(createGame(42, catalog, SHIELD_KIT), carefulBot));
  });

  it('follows the EMT hypoxia timeline', () => {
    expect(spo2For(0)).toBeGreaterThanOrEqual(95);
    expect(spo2For(1.5)).toBeLessThan(93);
    expect(spo2For(1.5)).toBeGreaterThan(85);
    expect(spo2For(3.5)).toBeLessThan(86);
    expect(spo2For(5)).toBeLessThan(72);
  });

  it('radiation dose never goes down', () => {
    let s = createGame(7, catalog, SHIELD_KIT);
    let last = 0;
    for (let i = 0; i < 600 && s.status === 'playing'; i++) {
      s = step(carefulBot(s), 0.05);
      expect(s.crew[0].dose).toBeGreaterThanOrEqual(last);
      last = s.crew[0].dose;
    }
  });
});
