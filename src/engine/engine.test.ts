import { describe, expect, it } from 'vitest';
import { POWER_COST, ROOM_SLOTS, SOLAR_OUTPUT, SURFACE_SLOTS } from './constants';
import { build, createGame, power, step, toggleModule } from './engine';
import { carefulBot, passiveBot, play } from './bots';
import type { Catalog } from './events';
import { spo2For } from './vitals';

const catalog: Catalog = {
  flare: [{ id: 'f1', strength: 0.5 }, { id: 'f2', strength: 0.8 }, { id: 'f3', strength: 1 }],
  cme: [{ id: 'c1', strength: 0.4 }, { id: 'c2', strength: 0.7 }, { id: 'c3', strength: 1 }],
  dust: [{ id: 'd1', strength: 0.6 }, { id: 'd2', strength: 1 }],
};
const seeds = Array.from({ length: 40 }, (_, i) => 1000 + i * 7919);

describe('no perfect equilibrium', () => {
  it('cannot power every system at once, even with every solar pad filled', () => {
    const maxSupply = SURFACE_SLOTS.length * SOLAR_OUTPUT;
    const oneOfEach = POWER_COST.oxygen + POWER_COST.greenhouse + POWER_COST.heater + POWER_COST.shield + POWER_COST.medbay;
    expect(oneOfEach).toBeGreaterThan(maxSupply);
    expect(ROOM_SLOTS.length).toBeGreaterThan(5);
  });

  it('refuses to switch on a module the power budget cannot cover', () => {
    let s = createGame(1, catalog);
    s = build(s, 'shield', 6);
    s = step(s, 2);
    const shield = s.modules.find((m) => m.kind === 'shield')!;
    const r = toggleModule(s, shield.id);
    expect(r.ok).toBe(false);
    expect(power(r.state).free).toBeGreaterThanOrEqual(0);
  });

  it('a commander who never touches anything loses the mission', () => {
    for (const seed of seeds) expect(play(createGame(seed, catalog), passiveBot).status).toBe('lost');
  });

  it('a commander who makes trade-offs usually wins, but never untouched', () => {
    const results = seeds.map((seed) => play(createGame(seed, catalog), carefulBot));
    const wins = results.filter((r) => r.status === 'won');
    expect(wins.length / seeds.length).toBeGreaterThan(0.6);
    expect(wins.length / seeds.length).toBeLessThan(1.01);
    for (const r of wins) {
      // Winning still costs something: every crew member carries permanent dose.
      for (const c of r.crew) expect(c.dose).toBeGreaterThan(15);
    }
  });
});

describe('simulation rules', () => {
  it('never lets power use exceed supply, even when dust cuts sunlight', () => {
    for (const seed of seeds.slice(0, 10)) {
      let s = createGame(seed, catalog);
      for (let i = 0; i < 700 && s.status === 'playing'; i++) {
        s = step(carefulBot(s), 0.05);
        expect(power(s).free).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const a = play(createGame(42, catalog), carefulBot);
    const b = play(createGame(42, catalog), carefulBot);
    expect(a).toEqual(b);
  });

  it('follows the EMT hypoxia timeline', () => {
    expect(spo2For(0)).toBeGreaterThanOrEqual(95);
    expect(spo2For(1.5)).toBeLessThan(93);
    expect(spo2For(1.5)).toBeGreaterThan(85);
    expect(spo2For(3.5)).toBeLessThan(86);
    expect(spo2For(5)).toBeLessThan(72);
  });

  it('radiation dose never goes down', () => {
    let s = createGame(7, catalog);
    let last = 0;
    for (let i = 0; i < 600 && s.status === 'playing'; i++) {
      s = step(carefulBot(s), 0.05);
      expect(s.crew[0].dose).toBeGreaterThanOrEqual(last);
      last = s.crew[0].dose;
    }
  });
});
