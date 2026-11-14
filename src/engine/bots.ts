import { POWER_COST } from './constants';
import { build, canBuild, power, setPatient, step, toggleModule } from './engine';
import type { GameState, ModuleKind } from './types';

/**
 * Simulated players. They exist to prove the balance: a commander who does
 * nothing must fail, and a commander who makes sensible trade-offs can win.
 */
export type Bot = (s: GameState) => GameState;

export const passiveBot: Bot = (s) => s;

function applyPriority(s: GameState, order: ModuleKind[]): GameState {
  // Work out which modules fit the budget in priority order, then switch to that set.
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
  for (const m of s.modules) if (m.on && !want.has(m.id) && m.kind !== 'solar') s = toggleModule(s, m.id).state;
  for (const m of s.modules) if (!m.on && want.has(m.id)) s = toggleModule(s, m.id).state;
  return s;
}

export const carefulBot: Bot = (s0) => {
  let s = s0;
  const has = (k: ModuleKind) => s.modules.some((m) => m.kind === k);
  const free = (slots: number[]) => slots.find((n) => !s.modules.some((m) => m.slot === n));
  const tryBuild = (k: ModuleKind, slots: number[]) => {
    const slot = free(slots);
    if (slot !== undefined && !canBuild(s, k, slot) && s.life > 45) s = build(s, k, slot);
  };
  if (!has('shield')) tryBuild('shield', [6, 7, 8]);
  else if (s.modules.filter((m) => m.kind === 'solar').length < 3 && s.time > 3) tryBuild('solar', [0, 1, 2]);
  else if (!has('medbay') && s.time > 8) tryBuild('medbay', [6, 7, 8]);

  const threat = s.events.some((e) => e.kind !== 'dust' && (e.phase === 'warned' || e.phase === 'active'));
  const sickest = s.crew.filter((c) => !c.out).sort((a, b) => b.sick - a.sick || a.health - b.health)[0];
  const needBed = sickest && (sickest.sick > 0.15 || sickest.health < 60);
  const cold = s.crew.some((c) => c.temp < 96);

  let order: ModuleKind[];
  if (threat) order = s.life < 12 ? ['oxygen', 'shield', 'heater', 'greenhouse', 'medbay'] : ['shield', 'heater', 'oxygen', 'greenhouse', 'medbay'];
  else if (s.life < 25) order = ['oxygen', 'greenhouse', 'heater', 'medbay'];
  else if (cold) order = ['heater', 'oxygen', 'greenhouse', 'medbay'];
  else order = needBed ? ['oxygen', 'heater', 'medbay', 'greenhouse'] : ['oxygen', 'greenhouse', 'heater', 'medbay'];
  s = applyPriority(s, order);
  if (needBed && s.patient !== sickest.id) s = setPatient(s, sickest.id);
  return s;
};

export function play(start: GameState, bot: Bot, dt = 0.05): GameState {
  let s = start;
  for (let i = 0; i < 2000 && s.status === 'playing'; i++) s = step(bot(s), dt);
  return s;
}
