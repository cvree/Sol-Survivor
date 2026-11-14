import { flareFlux } from '../data/records';

/**
 * Asks NASA's DONKI database what the real Sun has been doing for the last
 * 30 days. A busy Sun makes the mission's storms a little stronger.
 * If NASA cannot be reached, the game says so and plays at normal strength.
 */
export interface LiveSun {
  status: 'loading' | 'live' | 'offline';
  from?: string;
  to?: string;
  mFlares?: number;
  xFlares?: number;
  biggest?: string;
  /** 0.9 (quiet) to 1.25 (very busy). 1 when offline. */
  activity: number;
  level?: 'quiet' | 'active' | 'very active';
}

const KEY = (import.meta.env.VITE_NASA_API_KEY as string | undefined) || 'DEMO_KEY';
const CACHE = 'sol-survivor-live-sun';
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function fetchLiveSun(): Promise<LiveSun> {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400000);
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE) ?? 'null');
    if (cached && cached.to === iso(to)) return cached;
  } catch { /* no cache */ }
  try {
    const res = await fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${iso(from)}&endDate=${iso(to)}&api_key=${KEY}`);
    if (!res.ok) throw new Error(String(res.status));
    const flares: { classType: string }[] = (await res.json()) ?? [];
    const m = flares.filter((f) => f.classType?.startsWith('M')).length;
    const x = flares.filter((f) => f.classType?.startsWith('X')).length;
    const biggest = flares.reduce((best, f) => (flareFlux(f.classType) > flareFlux(best) ? f.classType : best), '');
    // An X flare counts five times as much as an M flare.
    const score = m + 5 * x;
    const level = score >= 40 ? 'very active' : score >= 12 ? 'active' : 'quiet';
    const out: LiveSun = {
      status: 'live', from: iso(from), to: iso(to), mFlares: m, xFlares: x, biggest: biggest || undefined,
      activity: level === 'very active' ? 1.25 : level === 'active' ? 1.1 : 0.9, level,
    };
    try { localStorage.setItem(CACHE, JSON.stringify(out)); } catch { /* private mode */ }
    return out;
  } catch {
    return { status: 'offline', activity: 1 };
  }
}
