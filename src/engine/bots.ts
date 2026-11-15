import { POWER_COST, WORK_SLOTS } from './constants';
import { SPECIALIST, acceptCargo, assign, build, collectFind, grantReward, power, step, toggleModule, workersIn } from './engine';
import type { GameState, ModuleKind } from './types';

/**
 * Simulated players. They exist to prove the balance: a commander who does
 * nothing must fail, and a commander who makes sensible trade-offs can win.
 */
export type Bot = (s: GameState) => GameState;

/** Takes whatever is on top of the lander and never touches a switch. */
export const passiveBot: Bot = (s) => (s.offer ? acceptCargo(s, s.offer.options.slice(0, s.offer.picks)) : s);

function applyPriority(s: GameState, order: ModuleKind[]): GameState {
  let budget = power(s).supply;
  const want = new Set<string>();
  for (const kind of order) {
    for (const m of s.modules.filter((x) => x.kind === kind && x.buildLeft <= 0)) {
      if (POWER_COST[kind] <= budget) {
        budget -= POWER_COST[kind];
        want.add(m.id);
      }
    }
  }
  for (const m of s.modules) if (m.on && !want.has(m.id) && POWER_COST[m.kind] > 0) s = toggleModule(s, m.id).state;
  for (const m of s.modules) if (!m.on && want.has(m.id)) s = toggleModule(s, m.id).state;
  return s;
}

const WANT: ModuleKind[] = ['oxygen', 'hab', 'dome', 'solar', 'hydro', 'medbay', 'battery', 'dome', 'solar', 'comms', 'lab', 'hydro'];

export const carefulBot: Bot = (s0) => {
  let s = s0;
  // A careful player explores: about one discovery every two sols (the first right away),
  // and finishes a mini-mission every few sols. Both bring landers sooner.
  if (s.stats.finds < Math.min(12, 1 + Math.floor((s.time - 1) / 2))) s = collectFind(s, 'science', 'a discovery');
  if (s.stats.goals < Math.floor((s.time - 1) / 4)) s = grantReward(s, 'supplies');
  if (s.offer) {
    const short = power(s).free <= 1 && s.landers > 0;
    const order = short ? ['solar', 'battery', ...WANT] : WANT;
    const picks: ModuleKind[] = [];
    for (const k of order) if (s.offer.options.includes(k as ModuleKind) && !picks.includes(k as ModuleKind) && picks.length < s.offer.picks) picks.push(k as ModuleKind);
    s = acceptCargo(s, picks);
  }
  for (let i = 0; i < 4 && s.blueprints.length; i++) s = build(s, s.blueprints[0]);

  // Nothing builds itself: send a rested astronaut to each site that has nobody on it.
  for (const site of s.modules.filter((m) => m.buildLeft > 0 && workersIn(s, m.id).length === 0)) {
    const hand = s.crew.find((c) => !c.out && !c.exhausted && c.energy > 45 && c.sick < 0.15 && !s.modules.some((m) => m.id === c.at && m.buildLeft > 0));
    if (hand) s = assign(s, hand.id, site.id);
  }

  // Staff the working modules, specialists first, and send the sick to the Med Bay.
  const med = s.modules.find((m) => m.kind === 'medbay' && m.on);
  for (const c of s.crew.filter((x) => !x.out)) {
    const needsBed = c.sick > 0.15 || c.health < 55;
    if (med && needsBed && c.at !== med.id && workersIn(s, med.id).length < 2) { s = assign(s, c.id, med.id); continue; }
    if (med && c.at === med.id && !needsBed && c.health > 85) s = assign(s, c.id, 'hab');
    // Tired or unhappy crew go to bed; rested crew go back to work.
    if (c.at !== 'hab' && c.at !== med?.id && (c.energy < 28 || c.mood < 30)) { s = assign(s, c.id, 'hab'); continue; }
    if (s.modules.some((m) => m.id === c.at && m.buildLeft > 0)) continue;
    if (c.at !== 'hab') continue;
    if (c.energy < 85 || c.exhausted) continue;
    const jobs = s.modules.filter((m) => m.on && WORK_SLOTS[m.kind] && m.kind !== 'medbay' && workersIn(s, m.id).length === 0);
    const job = jobs.find((m) => SPECIALIST[m.kind] === c.role) ?? jobs[0];
    if (job && !needsBed) s = assign(s, c.id, job.id);
  }

  const threat = s.events.some((e) => e.kind !== 'dust' && (e.phase === 'warned' || e.phase === 'active'));
  const needBed = s.crew.some((c) => !c.out && (c.sick > 0.15 || c.health < 55));
  const cold = s.crew.some((c) => c.temp < 96);
  let order: ModuleKind[];
  if (threat) order = s.life < 12 ? ['oxygen', 'dome', 'hab', 'hydro', 'medbay', 'comms', 'lab'] : ['dome', 'hab', 'oxygen', 'hydro', 'medbay', 'comms', 'lab'];
  else if (s.life < 25) order = ['oxygen', 'hydro', 'hab', 'medbay', 'comms', 'lab'];
  else if (cold) order = ['hab', 'oxygen', 'hydro', 'medbay', 'comms', 'lab'];
  else order = needBed ? ['oxygen', 'hab', 'medbay', 'hydro', 'comms', 'lab'] : ['oxygen', 'hab', 'hydro', 'comms', 'lab', 'medbay'];
  return applyPriority(s, order);
};

export function play(start: GameState, bot: Bot, dt = 0.05): GameState {
  let s = start;
  for (let i = 0; i < 2000 && s.status === 'playing'; i++) s = step(bot(s), dt);
  return s;
}
