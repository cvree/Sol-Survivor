import type { Catalog } from '../engine/events';
import type { EventKind } from '../engine/types';
import osdr from './osdr-studies.json';

/**
 * Turns the saved NASA records into things the game can replay and show.
 * Nothing in here invents a measurement: strengths are worked out from the
 * real numbers in each record.
 */

export interface RealRecord {
  id: string;
  kind: EventKind;
  /** Short name a child can read. */
  title: string;
  /** When it really happened. */
  date: string;
  /** The real measurements, as label/value pairs. */
  facts: { label: string; value: string }[];
  /** Plain-language story of the real event. */
  story: string;
  source: string;
  link: string;
  strength: number;
}

interface DonkiFile {
  fetchedAt: string;
  flares: { id: string; classType: string; beginTime: string; peakTime: string; sourceLocation: string; activeRegion: number | null; link: string }[];
  cmes: { id: string; startTime: string; speedKmS: number; halfAngleDeg: number; type: string; marsArrival: { time: string; glancing: boolean } | null; linkedFlare: string | null; link: string }[];
}

// The DONKI snapshot is made by `npm run fetch-nasa`. The game still starts without it.
const found = import.meta.glob<{ default: DonkiFile }>('./donki-events.json', { eager: true });
export const donki: DonkiFile | null = Object.values(found)[0]?.default ?? null;
export const osdrStudies = osdr.studies;
export const osdrFetchedAt = osdr.fetchedAt;

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const clock = (iso: string) => iso.slice(11, 16) + ' UTC';

/** X9.3 means 9.3 x 0.0001 watts per square metre of X-rays. Each letter is 10 times stronger. */
export function flareFlux(cls: string): number {
  const m = /^([ABCMX])(\d+(\.\d+)?)$/.exec(cls);
  if (!m) return 0;
  return Number(m[2]) * { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }[m[1] as 'A'];
}
/** M5 -> 0.35, X10 or more -> 1, on the same times-ten scale scientists use. */
export const flareStrength = (cls: string) => clamp(0.35 + (0.65 * Math.log10(flareFlux(cls) / 5e-5)) / Math.log10(20), 0.35);
/** 600 km/s -> 0.35, 2500 km/s -> 1. */
export const cmeStrength = (speed: number) => clamp(0.35 + (0.65 * (speed - 600)) / 1900, 0.35);

const flareRecords: RealRecord[] = (donki?.flares ?? []).map((f) => ({
  id: f.id,
  kind: 'flare',
  title: `${f.classType} solar flare`,
  date: day(f.peakTime),
  facts: [
    { label: 'Flare class', value: f.classType },
    { label: 'Brightest at', value: clock(f.peakTime) },
    ...(f.activeRegion ? [{ label: 'Sunspot group', value: `AR ${f.activeRegion}` }] : []),
    { label: 'NASA record', value: f.id },
  ],
  story: `On ${day(f.peakTime)} the Sun fired off a real ${f.classType} flare. ${f.classType.startsWith('X') ? 'X is the strongest class there is.' : 'M is the second strongest class.'} The bigger the number, the stronger the blast.`,
  source: 'NASA DONKI space weather database',
  link: f.link,
  strength: flareStrength(f.classType),
}));

const cmeRecords: RealRecord[] = (donki?.cmes ?? []).map((c) => ({
  id: c.id,
  kind: 'cme',
  title: `Solar storm at ${Math.round(c.speedKmS).toLocaleString('en-US')} km/s`,
  date: day(c.startTime),
  facts: [
    { label: 'Left the Sun', value: `${day(c.startTime)}, ${clock(c.startTime)}` },
    { label: 'Speed', value: `${Math.round(c.speedKmS).toLocaleString('en-US')} km every second` },
    ...(c.marsArrival ? [{ label: 'NASA model: reached Mars', value: day(c.marsArrival.time) + (c.marsArrival.glancing ? ' (glancing blow)' : '') }] : []),
    { label: 'NASA record', value: c.id },
  ],
  story: `On ${day(c.startTime)} the Sun threw out a real cloud of hot gas, called a coronal mass ejection, moving at ${Math.round(c.speedKmS).toLocaleString('en-US')} km every second.${c.marsArrival ? ' NASA\'s forecast model showed it reaching Mars.' : ''}`,
  source: 'NASA DONKI space weather database',
  link: c.link,
  strength: cmeStrength(c.speedKmS),
}));

/**
 * Dust storms are not in DONKI. These come from NASA/JPL mission status reports
 * and were typed in by hand, so they are marked as such in the game.
 */
const dustRecords: RealRecord[] = [
  {
    id: 'MER-B-2018-global-dust-storm',
    kind: 'dust',
    title: 'The storm that stopped Opportunity',
    date: 'June 2018',
    facts: [
      { label: 'Rover', value: 'Opportunity' },
      { label: 'Dust thickness (tau)', value: '10.8, thicker than any rover had measured before' },
      { label: 'Solar power', value: 'fell from 645 to 22 watt-hours a day' },
    ],
    story: 'In June 2018 a dust storm grew until it wrapped around all of Mars. So little sunlight reached the solar-powered Opportunity rover that it went to sleep on June 10 and never woke up. It had worked for over 14 years.',
    source: 'NASA/JPL Opportunity mission reports (entered by hand)',
    link: 'https://science.nasa.gov/mission/mer-opportunity/',
    strength: 1,
  },
  {
    id: 'MER-B-2007-global-dust-storm',
    kind: 'dust',
    title: 'The 2007 planet-wide dust storm',
    date: 'July 2007',
    facts: [
      { label: 'Rovers', value: 'Spirit and Opportunity' },
      { label: 'Opportunity solar power before', value: 'about 700 watt-hours a day' },
      { label: 'Opportunity solar power at worst', value: '128 watt-hours a day (July 18, 2007)' },
    ],
    story: 'In July 2007 dust blocked almost all direct sunlight for weeks. Engineers switched off nearly everything on both rovers to save power, and both rovers made it through.',
    source: 'NASA/JPL Mars Exploration Rover reports (entered by hand)',
    link: 'https://science.nasa.gov/mission/mer-opportunity/',
    strength: 0.7,
  },
  {
    id: 'InSight-2022-regional-dust-storm',
    kind: 'dust',
    title: 'The storm that put InSight in safe mode',
    date: 'January 2022',
    facts: [
      { label: 'Lander', value: 'InSight' },
      { label: 'What happened', value: 'entered safe mode on January 7, 2022' },
    ],
    story: 'In January 2022 a regional dust storm cut the sunlight reaching the InSight lander. It switched itself into safe mode, running only what it needed to survive, until the sky cleared.',
    source: 'NASA/JPL InSight mission reports (entered by hand)',
    link: 'https://science.nasa.gov/mission/insight/',
    strength: 0.5,
  },
];

/** Used only if the DONKI snapshot has not been downloaded yet. */
const missing = (kind: 'flare' | 'cme'): RealRecord => ({
  id: `no-snapshot-${kind}`,
  kind,
  title: kind === 'flare' ? 'Solar flare' : 'Solar storm',
  date: 'not loaded',
  facts: [],
  story: 'The NASA storm archive has not been downloaded into this copy of the game yet, so this storm is a practice one.',
  source: 'none (practice storm)',
  link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  strength: 0.65,
});

export const records: RealRecord[] = [
  ...(flareRecords.length ? flareRecords : [missing('flare')]),
  ...(cmeRecords.length ? cmeRecords : [missing('cme')]),
  ...dustRecords,
];
export const recordById = (id: string) => records.find((r) => r.id === id);
export const hasDonki = flareRecords.length > 0 && cmeRecords.length > 0;

const entries = (kind: EventKind) => records.filter((r) => r.kind === kind).map((r) => ({ id: r.id, strength: r.strength }));
export const catalog: Catalog = { flare: entries('flare'), cme: entries('cme'), dust: entries('dust') };
