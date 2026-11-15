import { describe, expect, it } from 'vitest';
import { BATTERY_OUTPUT, DOME_COVERS, MAX_CREW, MAX_OF, POWER_COST, SOLAR_OUTPUT } from './constants';
import { acceptCargo, assign, build, buildableCells, createGame, lifeFlow, power, shieldCover, step, toggleModule, wear } from './engine';
import { carefulBot, passiveBot, play } from './bots';
import type { Catalog } from './events';
import type { ModuleKind } from './types';
import { spo2For } from './vitals';

const catalog: Catalog = {
  flare: [{ id: 'f1', strength: 0.5 }, { id: 'f2', strength: 0.8 }, { id: 'f3', strength: 1 }],
  cme: [{ id: 'c1', strength: 0.4 }, { id: 'c2', strength: 0.7 }, { id: 'c3', strength: 1 }],
  dust: [{ id: 'd1', strength: 0.6 }, { id: 'd2', strength: 1 }],
};
const seeds = Array.from({ length: 24 }, (_, i) => 1000 + i * 7919);
const toFirstLander = (seed: number) => {
  let s = createGame(seed, catalog);
  while (!s.offer) s = step(s, 0.05);
  return s;
};

describe('no perfect equilibrium', () => {
  it('even the biggest possible base cannot power everything at once', () => {
    const supply = MAX_OF.solar * SOLAR_OUTPUT + MAX_OF.battery * BATTERY_OUTPUT;
    const demand = (Object.keys(POWER_COST) as ModuleKind[]).reduce((n, k) => n + POWER_COST[k] * MAX_OF[k], 0);
    expect(demand).toBeGreaterThan(supply);
  });

  it('refuses to switch on a module the power budget cannot cover', () => {
    let s = acceptCargo(toFirstLander(1), ['dome', 'hydro']);
    s = build(s, 'dome');
    s = step(s, 1.1);
    const r = toggleModule(s, s.modules.find((m) => m.kind === 'dome')!.id);
    expect(r.ok).toBe(false);
    expect(power(r.state).free).toBeGreaterThanOrEqual(0);
  });

  it('a commander who never touches a switch loses', () => {
    for (const seed of seeds) expect(play(createGame(seed, catalog), passiveBot).status).toBe('lost');
  });

  it('a careful commander can grow the base and bring everyone home', () => {
    const results = seeds.map((seed) => play(createGame(seed, catalog), carefulBot));
    const wins = results.filter((r) => r.status === 'won');
    expect(wins.length / seeds.length).toBeGreaterThan(0.7);
    for (const r of wins) {
      expect(r.crew.length).toBeGreaterThan(2);
      expect(r.modules.length).toBeGreaterThan(6);
      for (const c of r.crew) expect(c.dose).toBeGreaterThan(0);
    }
  });
});

describe('growth has a cost', () => {
  it('every new astronaut drains life support faster', () => {
    const before = toFirstLander(3);
    const after = acceptCargo(before, []);
    expect(after.crew.length).toBe(before.crew.length + 1);
    expect(lifeFlow(after).used).toBeGreaterThan(lifeFlow(before).used);
  });

  it('one Shield Dome cannot cover a full crew', () => {
    expect(DOME_COVERS).toBeLessThan(MAX_CREW);
    const end = play(createGame(seeds[0], catalog), carefulBot);
    const oneDome = { ...end, modules: end.modules.map((m, i) => ({ ...m, on: m.kind === 'dome' && i === end.modules.findIndex((x) => x.kind === 'dome') })) };
    if (end.crew.filter((c) => !c.out).length > DOME_COVERS) expect(shieldCover(oneDome)).toBeLessThan(1);
  });

  it('a staffed module out-produces an empty one, and a specialist does best', () => {
    const s = createGame(5, catalog);
    const oxygen = s.modules.find((m) => m.kind === 'oxygen')!;
    const empty = lifeFlow(s).made;
    const medic = lifeFlow(assign(s, 'mei', oxygen.id)).made;
    const engineer = lifeFlow(assign(s, 'ada', oxygen.id)).made;
    expect(medic).toBeGreaterThan(empty);
    expect(engineer).toBeGreaterThan(medic);
  });

  it('long-stay crew need more, and fresh food eases it', () => {
    let s = createGame(5, catalog);
    const fresh = wear(s, s.crew[0]);
    s = { ...s, time: 20 };
    expect(wear(s, s.crew[0])).toBeGreaterThan(fresh);
    const withFood = { ...s, modules: [...s.modules, { ...s.modules[2], id: 'x', kind: 'hydro' as const, cell: 0, on: true }] };
    expect(wear(withFood, s.crew[0])).toBeLessThan(wear(s, s.crew[0]));
  });

  it('domes go on the surface next to the base, rooms go underground, gear goes in the yard', () => {
    const s = acceptCargo(toFirstLander(2), ['solar', 'hydro']);
    expect(build(s, 'hydro', 0)).toBe(s); // not next to anything yet
    expect(buildableCells(s, 'hydro')).toEqual([1, 3]);
    expect(buildableCells(s, 'solar')[0]).toBeGreaterThanOrEqual(100);
    const built = build(build(s, 'hydro'), 'solar');
    expect(built.modules.length).toBe(s.modules.length + 2);
    expect(buildableCells(s, 'oxygen').every((c) => c >= 5 && c <= 9)).toBe(true);
  });
});

describe('simulation rules', () => {
  it('never lets power use exceed supply, even when dust cuts sunlight', () => {
    for (const seed of seeds.slice(0, 6)) {
      let s = createGame(seed, catalog);
      for (let i = 0; i < 700 && s.status === 'playing'; i++) {
        s = step(carefulBot(s), 0.05);
        expect(power(s).free).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    expect(play(createGame(42, catalog), carefulBot)).toEqual(play(createGame(42, catalog), carefulBot));
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
