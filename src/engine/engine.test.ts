import { describe, expect, it } from 'vitest';
import { BATTERY_OUTPUT, DOME_COVERS, PATCH_SOLS, MAX_CREW, MAX_OF, POWER_COST, SOLAR_OUTPUT } from './constants';
import { acceptCargo, assign, build, cancelSite, goTo, recall, tripPos, buildableCells, collectBin, collectFind, coverOf, moveModule, moveTargets, sendOut, startUpgrade, createGame, grantReward, lifeFlow, patch, power, shieldCover, staffing, step, toggleModule, wear, workRate } from './engine';
import { GOALS, markOf, nextGoal } from './goals';
import { carefulBot, passiveBot, play } from './bots';
import type { Catalog } from './events';
import type { GameState, ModuleKind } from './types';
import { spo2For } from './vitals';

const catalog: Catalog = {
  flare: [{ id: 'f1', strength: 0.5 }, { id: 'f2', strength: 0.8 }, { id: 'f3', strength: 1 }],
  cme: [{ id: 'c1', strength: 0.4 }, { id: 'c2', strength: 0.7 }, { id: 'c3', strength: 1 }],
  dust: [{ id: 'd1', strength: 0.6 }, { id: 'd2', strength: 1 }],
};
const seeds = Array.from({ length: 24 }, (_, i) => 1000 + i * 7919);
/** Play on, accepting landers, until a lander with a crewmate is waiting. */
const toCrewLander = (seed: number, commander = 'ada') => {
  let s = createGame(seed, catalog, 1, 'easy', commander);
  for (let i = 0; i < 4000 && !(s.offer && s.offer.crewOptions.length); i++) s = s.offer ? acceptCargo(s, []) : step(s, 0.05);
  return s;
};
/** Skip the short walk after an assignment, so a test can measure the work straight away. */
const arrive = (s: GameState) => { s.crew.forEach((c) => { c.arriving = 0; }); return s; };
/** A game with a Hab and a working Oxygen Maker already built, for testing the rules. */
const starter = (seed: number, commander = 'ada', difficulty: 'easy' | 'hard' = 'hard') => {
  const s = createGame(seed, catalog, 1, difficulty, commander);
  const mod = (id: string, kind: ModuleKind, cell: number) => ({ id, kind, cell, on: true, buildLeft: 0, onSince: 0, patchedUntil: 0, level: 1, upgrading: false, buildTotal: 0, bin: 0 });
  s.modules.push(mod('hab', 'hab', 2), mod('m2', 'oxygen', 7));
  return s;
};

describe('no perfect equilibrium', () => {
  it('even the biggest possible base cannot power everything at once', () => {
    const supply = MAX_OF.solar * SOLAR_OUTPUT + MAX_OF.battery * BATTERY_OUTPUT;
    const demand = (Object.keys(POWER_COST) as ModuleKind[]).reduce((n, k) => n + POWER_COST[k] * MAX_OF[k], 0);
    expect(demand).toBeGreaterThan(supply);
  });

  it('refuses to switch on a module the power budget cannot cover', () => {
    let s = starter(1);
    s.blueprints = ['dome'];
    s = build(s, 'dome');
    s = assign(s, s.crew[0].id, s.modules.find((m) => m.kind === 'dome')!.id);
    for (let i = 0; i < 80 && s.modules.some((m) => m.buildLeft > 0); i++) s = step(s, 0.05);
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
    const before = toCrewLander(3);
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
    const s = starter(5, 'ada');
    const m = starter(5, 'mei');
    const oxygen = s.modules.find((x) => x.kind === 'oxygen')!;
    const empty = lifeFlow(s).made;
    const medic = lifeFlow(arrive(assign(m, 'mei', oxygen.id))).made;
    const engineer = lifeFlow(arrive(assign(s, 'ada', oxygen.id))).made;
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
    const s = starter(2);
    s.blueprints = ['solar', 'hydro'];
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

  it('a patch runs a dead module for one sol with no power, then wears out', () => {
    let s = starter(5);
    const oxy = s.modules.find((m) => m.kind === 'oxygen')!.id;
    s = toggleModule(s, oxy).state;
    const before = power(s).used;
    const parts = s.spareParts;
    const r = patch(s, oxy);
    expect(r.ok).toBe(true);
    s = r.state;
    expect(s.spareParts).toBe(parts - 1);
    expect(s.modules.find((m) => m.id === oxy)!.on).toBe(true);
    expect(power(s).used).toBe(before);
    for (let i = 0; i < (PATCH_SOLS + 0.2) / 0.05; i++) s = step(s, 0.05);
    expect(s.modules.find((m) => m.id === oxy)!.patchedUntil).toBe(0);
    expect(power(s).free).toBeGreaterThanOrEqual(0);
  });

  it('cannot patch without spare parts', () => {
    let s = starter(5);
    s.spareParts = 0;
    const oxy = s.modules.find((m) => m.kind === 'oxygen')!.id;
    s = toggleModule(s, oxy).state;
    expect(patch(s, oxy).ok).toBe(false);
  });

  it('always has a mini-mission to offer, and finishing one pays out', () => {
    let s = starter(5);
    expect(nextGoal(s, [])!.id).toBe('first-find');
    const g = nextGoal(s, ['first-find'])!;
    expect(g.id).toBe('staff-oxygen');
    expect(g.progress(s, markOf(s)).value).toBe(0);
    s = assign(s, s.crew[0].id, s.modules.find((m) => m.kind === 'oxygen')!.id);
    expect(g.progress(s, markOf(s)).value).toBe(1);
    const life = s.life;
    s = grantReward(s, g.reward);
    expect(s.life).toBeGreaterThan(life);
    expect(s.stats.goals).toBe(1);
    expect(nextGoal(s, GOALS.map((x) => x.id))).toBeNull();
    expect(nextGoal(s, ['first-find', g.id])).not.toBeNull();
  });

  it('a crewmate can die and the base carries on, but losing the commander ends the mission', () => {
    expect(createGame(5, catalog, 1, 'easy', 'kofi').crew.length).toBe(1);
    let s = acceptCargo(toCrewLander(5, 'kofi'), []);
    expect(s.crew[0].commander).toBe(true);
    s.crew.forEach((c) => { c.health = 100; c.noAir = 0; });
    s.crew[1].noAir = 9;
    s.crew[1].hurtBy.air = 50;
    s = step(s, 0.05);
    expect(s.crew[1].out).toBe(true);
    expect(s.status).toBe('playing');
    expect(s.stats.lost).toBe(1);
    expect(s.griefUntil).toBeGreaterThan(s.time);
    s.crew[0].noAir = 9;
    s = step(s, 0.05);
    expect(s.status).toBe('lost');
  });

  it('each commander brings their own perk', () => {
    expect(createGame(5, catalog, 1, 'easy', 'ada').spareParts).toBeGreaterThan(createGame(5, catalog, 1, 'easy', 'mei').spareParts);
    expect(createGame(5, catalog, 1, 'easy', 'kofi').blueprints).toEqual([]);
  });

  it('a discovery pays out', () => {
    const s = createGame(5, catalog);
    expect(collectFind(s, 'science', 'Test').cargoProgress).toBeGreaterThan(s.cargoProgress);
    expect(collectFind(s, 'supplies', 'Test').life).toBeGreaterThan(s.life);
    expect(collectFind(s, 'part', 'Test').stats.finds).toBe(1);
  });

  it('work tires astronauts out, tired ones work slower, and sleep in the Hab brings them back', () => {
    let s = starter(5, 'ada', 'easy');
    const oxy = s.modules.find((m) => m.kind === 'oxygen')!;
    s = arrive(assign(s, s.crew[0].id, oxy.id));
    const fresh = staffing(s, s.modules.find((m) => m.id === oxy.id)!);
    for (let i = 0; i < 60; i++) s = step(s, 0.05);
    expect(s.crew[0].energy).toBeLessThan(70);
    s.crew[0].energy = 10;
    expect(workRate(s.crew[0])).toBeLessThan(1);
    expect(staffing(s, s.modules.find((m) => m.id === oxy.id)!)).toBeLessThan(fresh);
    s = assign(s, s.crew[0].id, 'hab');
    for (let i = 0; i < 40; i++) s = step(s, 0.05);
    expect(s.crew[0].energy).toBeGreaterThan(50);
  });

  it('an overworked astronaut collapses, and a very unhappy one walks off the job', () => {
    let s = starter(5, 'ada', 'easy');
    s = assign(s, s.crew[0].id, s.modules.find((m) => m.kind === 'oxygen')!.id);
    s.crew[0].energy = 0.5;
    s = step(s, 0.05);
    expect(s.crew[0].exhausted).toBe(true);
    expect(s.stats.collapses).toBe(1);
    expect(workRate(s.crew[0])).toBe(0);
    s.crew[0].exhausted = false;
    s.crew[0].energy = 60;
    s.crew[0].mood = 10;
    s = step(s, 0.05);
    expect(s.crew[0].at).toBe('hab');
    expect(s.stats.strikes).toBe(1);
  });

  it('every job outside is a real trip: walk out, work, walk home', () => {
    let s = starter(5, 'ada', 'easy');
    const c = s.crew[0].id;
    const r = sendOut(s, c, { kind: 'find', id: 'rim', reward: 'science', title: 'The crater rim' }, 0.06);
    expect(r.ok).toBe(true);
    s = r.state;
    expect(s.crew[0].trip?.phase).toBe('out');
    expect(coverOf(s, s.crew[0])).toBe(0);
    for (let i = 0; i < 400 && s.crew[0].trip; i++) s = step(s, 0.02);
    expect(s.crew[0].trip).toBeNull();
    expect(s.crew[0].at).toBe('hab');
    expect(s.foundLog).toEqual(['rim']);
    expect(s.stats.finds).toBe(1);
  });

  it('digging at a rock pile brings bricks home, and a full miner bin can be collected', () => {
    let s = starter(5, 'ada', 'easy');
    const dep = s.deposits[0];
    s = sendOut(s, s.crew[0].id, { kind: 'mine', dep: dep.id }, dep.x).state;
    for (let i = 0; i < 600 && s.crew[0].trip; i++) s = step(s, 0.02);
    expect(s.materials).toBeGreaterThan(0);
    expect(s.deposits[0].left).toBeLessThan(dep.left);
    s.modules.push({ id: 'mx', kind: 'miner', cell: 101, on: true, buildLeft: 0, onSince: 0, patchedUntil: 0, level: 1, upgrading: false, buildTotal: 0, bin: 7.5 });
    const before = s.materials;
    expect(collectBin(s, 'mx').materials).toBe(before + 7);
  });

  it('upgrades cost bricks, need a builder, and nothing can pass the Hab level', () => {
    let s = starter(5, 'ada', 'easy');
    s.materials = 200;
    expect(startUpgrade(s, 'm2').ok).toBe(false); // Oxygen Maker cannot pass the level-1 Hab
    s = startUpgrade(s, 'hab').state;
    expect(s.materials).toBeLessThan(200);
    const site = s.modules.find((m) => m.id === 'hab')!;
    expect(site.upgrading).toBe(true);
    s = assign(s, s.crew[0].id, 'hab');
    s.crew[0].at = 'hab';
    for (let i = 0; i < 300 && s.modules.find((m) => m.id === 'hab')!.upgrading; i++) s = step(s, 0.02);
    expect(s.modules.find((m) => m.id === 'hab')!.level).toBe(2);
    expect(startUpgrade(s, 'm2').ok).toBe(true);
  });

  it('a dome only shields crew in its zone, and modules can be moved', () => {
    let s = starter(5, 'ada', 'easy');
    s.shield = 100;
    s.modules.push({ id: 'dm', kind: 'dome', cell: 0, on: true, buildLeft: 0, onSince: 0, patchedUntil: 0, level: 1, upgrading: false, buildTotal: 0, bin: 0 });
    s.modules.push({ id: 'h1', kind: 'hydro', cell: 1, on: true, buildLeft: 0, onSince: 0, patchedUntil: 0, level: 1, upgrading: false, buildTotal: 0, bin: 0 });
    s.crew[0].at = 'm2'; // column 2: outside the level-1 dome's zone (columns 0-1)
    expect(coverOf(s, s.crew[0])).toBe(0);
    expect(moveTargets(s, 'dm')).toContain(3);
    s = moveModule(s, 'dm', 3);
    expect(coverOf(s, s.crew[0])).toBeGreaterThan(0);
  });
});

describe('every plan you pick is really yours', () => {
  /** Play on until the first lander is waiting. */
  const toFirstLander = (seed: number) => {
    let s = createGame(seed, catalog, 1, 'easy', 'ada');
    for (let i = 0; i < 4000 && !s.offer; i++) s = step(s, 0.05);
    return s;
  };

  it('marks out a building site for each plan, yard gear included', () => {
    const s = acceptCargo(toFirstLander(11), ['solar', 'hab']);
    const sites = s.modules.filter((m) => m.buildLeft > 0).map((m) => m.kind).sort();
    expect(sites).toEqual(['hab', 'solar']);
    expect(s.blueprints).toEqual([]);
  });

  it('a builder walks on to the next site by themselves when one is finished', () => {
    let s = acceptCargo(toFirstLander(12), ['oxygen', 'hab']);
    const lead = s.crew[0];
    s = arrive(assign(s, lead.id, 'hab-site'));
    s.crew[0].energy = 100;
    for (let i = 0; i < 400 && s.modules.some((m) => m.kind === 'hab' && m.buildLeft > 0); i++) s = step(s, 0.05);
    const oxygen = s.modules.find((m) => m.kind === 'oxygen')!;
    expect(oxygen.buildLeft).toBeGreaterThan(0);
    expect(s.crew[0].at).toBe(oxygen.id);
  });

  it('stays put when the player turns that off', () => {
    let s = acceptCargo(toFirstLander(12), ['oxygen', 'hab']);
    s.autoBuild = false;
    s = arrive(assign(s, s.crew[0].id, 'hab-site'));
    s.crew[0].energy = 100;
    for (let i = 0; i < 400 && s.modules.some((m) => m.kind === 'hab' && m.buildLeft > 0); i++) s = step(s, 0.05);
    expect(s.crew[0].at).toBe('hab');
  });
});

describe('the commander is in control', () => {
  it('dropping someone inside the base puts them there at once', () => {
    const s = starter(21);
    const next = assign(s, s.crew[0].id, 'm2', true);
    expect(next.crew[0].at).toBe('m2');
    expect(next.crew[0].arriving).toBe(0);
    // Without a drop (the Send button, or the engine moving people), they still walk.
    expect(assign(s, s.crew[0].id, 'm2').crew[0].arriving).toBeGreaterThan(0);
  });

  it('anyone rested can walk out to any spot in the crater and stays there', () => {
    let s = starter(22);
    const r = goTo(s, s.crew[0].id, 0.9);
    expect(r.ok).toBe(true);
    s = r.state;
    for (let i = 0; i < 24; i++) s = step(s, 0.05);
    const t = s.crew[0].trip!;
    expect(t.phase).toBe('work');
    expect(tripPos(t)).toBeCloseTo(0.9);
    // Once tired, they head home on their own.
    s.crew[0].energy = 20;
    s = step(s, 0.05);
    expect(s.crew[0].trip!.phase).toBe('back');
  });

  it('can be called back from halfway, turning around where they stand', () => {
    let s = goTo(starter(23), 'ada', 0.95).state;
    for (let i = 0; i < 6; i++) s = step(s, 0.05);
    const mid = tripPos(s.crew[0].trip!);
    expect(mid).toBeGreaterThan(0.5);
    s = recall(s, 'ada');
    expect(s.crew[0].trip!.phase).toBe('back');
    expect(tripPos(s.crew[0].trip!)).toBeCloseTo(mid);
    for (let i = 0; i < 200 && s.crew[0].trip; i++) s = step(s, 0.05);
    expect(s.crew[0].trip).toBeNull();
  });

  it('can change course out in the crater, from where they are', () => {
    let s = goTo(starter(24), 'ada', 0.95).state;
    for (let i = 0; i < 6; i++) s = step(s, 0.05);
    const mid = tripPos(s.crew[0].trip!);
    s = goTo(s, 'ada', 0.1).state;
    expect(tripPos(s.crew[0].trip!)).toBeCloseTo(mid);
    expect(s.crew[0].trip!.x).toBeCloseTo(0.1);
  });

  it('a place chosen while they are out is where they go once home', () => {
    let s = goTo(starter(25), 'ada', 0.8).state;
    s = recall(s, 'ada', 'm2');
    for (let i = 0; i < 200 && s.crew[0].trip; i++) s = step(s, 0.05);
    expect(s.crew[0].at).toBe('m2');
  });

  it('packing up a site gives the plan back, and stopping an upgrade gives the bricks back', () => {
    let s = starter(26);
    s.blueprints = ['solar'];
    s = build(s, 'solar');
    const site = s.modules.find((m) => m.buildLeft > 0)!;
    s = cancelSite(s, site.id);
    expect(s.modules.some((m) => m.id === site.id)).toBe(false);
    expect(s.blueprints).toEqual(['solar']);

    s.materials = 100;
    const before = s.materials;
    s = startUpgrade(s, 'hab').state;
    expect(s.materials).toBeLessThan(before);
    s = cancelSite(s, 'hab');
    expect(s.materials).toBe(before);
    expect(s.modules.find((m) => m.id === 'hab')!.upgrading).toBe(false);
  });
});
