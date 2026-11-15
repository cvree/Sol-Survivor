/** The leaderboard: your longest missions on this device. Nothing leaves the device. */
export interface RunRecord { sols: number; won: boolean; commander: string; difficulty: string; crew: number; modules: number; finds: number; date: string }
const KEY = 'sol-survivor-records-v1';

export function loadRecords(): RunRecord[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
const rank = (a: RunRecord, b: RunRecord) => b.sols - a.sols || Number(b.won) - Number(a.won) || b.crew - a.crew || b.modules - a.modules;

/** Save a finished mission. Returns its place on the board (1 = best), or 0 if it did not make the top 10. */
export function saveRecord(r: RunRecord): number {
  const all = [...loadRecords(), r].sort(rank).slice(0, 10);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* the board is a bonus */ }
  return all.indexOf(r) + 1;
}
