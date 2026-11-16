import type { EventKind } from '../engine/types';

/**
 * Space weather school: what M.A.R.V. teaches the first time each kind of event happens.
 * One idea per card, in words a seven-year-old can read, then one quick question.
 *
 * Every fact here is well-established NASA science, typed in by hand (not downloaded):
 * - Flares: bursts from tangled magnetic fields near sunspots; classes A, B, C, M, X, each 10 times
 *   stronger; light reaches Mars in about 13 minutes (12.7 on average, 1.52 times Earth's distance).
 * - CMEs: billions of tons of the Sun's gas; usually 1 to 3 days to reach Earth, longer to Mars.
 * - Mars lost its global magnetic field long ago and its air is about 1% as thick as Earth's (MAVEN).
 * - Curiosity's RAD detector has measured solar storms on the ground in Gale Crater.
 * - Mars has auroras: seen by MAVEN, and from the ground by Perseverance in 2024.
 * - Dust: the 2018 planet-wide storm ended Opportunity's mission; InSight's dusty panels ended it in 2022;
 *   Curiosity and Perseverance run on nuclear power (MMRTG).
 * - The International Space Station crew shelter in its most shielded parts during solar storms.
 */

export type ArtId =
  | 'flare-flash' | 'flare-race' | 'flare-scale' | 'shield-compare' | 'shelter'
  | 'cme-burst' | 'cme-travel' | 'particles' | 'rad-detector' | 'aurora'
  | 'dust-lift' | 'dust-panel' | 'dust-breeze' | 'dust-nuclear' | 'dust-switch';

export interface BriefCard { art: ArtId; title: string; say: string }
export interface Quiz { q: string; options: string[]; answer: number; why: string }
export interface Brief { kind: EventKind; name: string; cards: BriefCard[]; quiz: Quiz; facts: string[]; sources: { name: string; link: string }[] }

export const BRIEFS: Record<EventKind, Brief> = {
  flare: {
    kind: 'flare',
    name: 'Solar flares',
    cards: [
      { art: 'flare-flash', title: 'What is a solar flare?', say: 'A solar flare is a giant flash of light and energy from the Sun. It happens when tangled magnetic fields near dark sunspots suddenly snap.' },
      { art: 'flare-race', title: 'As fast as light', say: 'The flash travels at the speed of light. It reaches Mars in about 13 minutes, so there is almost no warning!' },
      { art: 'flare-scale', title: 'Letters for size', say: 'Scientists sort flares by letter: A, B, C, M and X. Each letter is 10 times stronger than the one before. X flares are the biggest.' },
      { art: 'shield-compare', title: 'Why Mars is risky', say: 'Earth has a magnetic bubble and thick air that block most radiation. Mars lost its magnetic bubble long ago, and its air is thin, so radiation reaches the ground.' },
      { art: 'shelter', title: 'What astronauts do', say: 'Get behind something thick: walls, water or piles of dirt. On the Space Station, astronauts move to the best-shielded rooms. Here, your Shield Dome is that shelter.' },
    ],
    quiz: {
      q: 'How long does a flare\'s flash take to reach Mars?',
      options: ['About 13 minutes', 'About 3 days', 'About a year'],
      answer: 0,
      why: 'Light is the fastest thing there is. That is why a flare gives almost no warning.',
    },
    facts: [
      'NASA\'s Solar Dynamics Observatory watches the Sun all day, every day, to catch flares the moment they flash.',
      'Each flare letter is 10 times stronger than the last, so an X flare is 10 times stronger than an M flare.',
      'Flares come from sunspots: dark, cooler patches where the Sun\'s magnetic fields are tangled up.',
    ],
    sources: [
      { name: 'NASA: Solar Dynamics Observatory', link: 'https://science.nasa.gov/mission/sdo/' },
      { name: 'NASA DONKI space weather database', link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/' },
    ],
  },
  cme: {
    kind: 'cme',
    name: 'Solar storms',
    cards: [
      { art: 'cme-burst', title: 'What is a solar storm?', say: 'Sometimes the Sun throws a giant cloud of its hot gas into space. Scientists call it a coronal mass ejection, or CME. One cloud can weigh billions of tons!' },
      { art: 'cme-travel', title: 'Slower than light', say: 'The cloud is much slower than a flare\'s flash. It usually takes one to three days to reach Earth, and longer to reach Mars. That gives you time to get ready.' },
      { art: 'particles', title: 'An invisible danger', say: 'Big storms carry super-fast particles. They are far too small to see, but they can go right into your body and damage the tiny cells you are made of.' },
      { art: 'rad-detector', title: 'Measured on Mars', say: 'NASA\'s Curiosity rover carries a radiation detector called RAD. It has measured solar storms arriving at Gale Crater. That is where your base is!' },
      { art: 'aurora', title: 'Watching the Sun', say: 'NASA scientists track every storm in a database called DONKI and warn astronauts. Big storms even make auroras glow in the Mars sky!' },
      { art: 'shelter', title: 'Your job, Commander', say: 'Get the crew into the Shield Dome\'s blue zone before the cloud arrives. Radiation adds up over a whole life, so every bit you block counts.' },
    ],
    quiz: {
      q: 'Which one gets to Mars first?',
      options: ['The storm cloud', 'The flash from a flare', 'They arrive together'],
      answer: 1,
      why: 'Light is fastest. The storm cloud takes days, which gives you time to get ready.',
    },
    facts: [
      'Curiosity\'s RAD detector has been measuring radiation on the ground in Gale Crater since 2012.',
      'NASA\'s MAVEN spacecraft has watched solar storms reach Mars and make its sky glow with auroras.',
      'On Earth, solar storms make the northern and southern lights. Our magnetic bubble steers the particles to the poles.',
    ],
    sources: [
      { name: 'NASA: Curiosity rover (RAD)', link: 'https://science.nasa.gov/mission/msl-curiosity/' },
      { name: 'NASA: MAVEN', link: 'https://science.nasa.gov/mission/maven/' },
      { name: 'NASA DONKI space weather database', link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/' },
    ],
  },
  dust: {
    kind: 'dust',
    name: 'Dust storms',
    cards: [
      { art: 'dust-lift', title: 'What is a dust storm?', say: 'Mars wind lifts its fine, powdery dust high into the sky. Some storms grow so big they cover the whole planet!' },
      { art: 'dust-panel', title: 'Goodbye, sunlight', say: 'Dust hides the Sun, so solar panels make much less power. In 2018 a planet-wide storm left the Opportunity rover with no power, and it never woke up again.' },
      { art: 'dust-breeze', title: 'Thin air, gentle wind', say: 'Mars air is about 100 times thinner than Earth\'s, so even fast wind only pushes gently. A dust storm is a power problem, not a blow-you-over problem.' },
      { art: 'dust-nuclear', title: 'Power that keeps going', say: 'Batteries keep working in the dust. The Curiosity and Perseverance rovers use nuclear power, so dust storms do not stop them.' },
      { art: 'dust-switch', title: 'Your job, Commander', say: 'When the power drops, choose what to switch off. Keep air and heat running first.' },
    ],
    quiz: {
      q: 'What does a dust storm do to solar panels?',
      options: ['Makes them stronger', 'Blocks the sunlight, so they make less power', 'Blows them away'],
      answer: 1,
      why: 'The dust hides the Sun. The thin Mars wind is too gentle to blow panels over.',
    },
    facts: [
      'Dust settling on solar panels slowly ended NASA\'s InSight lander in 2022.',
      'A global dust storm in 2018 wrapped the whole of Mars for many weeks.',
      'Mars dust is finer than flour, so it sticks to everything: panels, suits and machines.',
    ],
    sources: [
      { name: 'NASA: Opportunity rover', link: 'https://science.nasa.gov/mission/mer-opportunity/' },
      { name: 'NASA: InSight lander', link: 'https://science.nasa.gov/mission/insight/' },
    ],
  },
};

// ---------- remembered on this device ----------

const KEY = 'sol-survivor:weather-learned';
export const learnedWeather = (): EventKind[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as EventKind[]; } catch { return []; } };
export const markLearned = (k: EventKind) => {
  const got = learnedWeather();
  if (got.includes(k)) return;
  try { localStorage.setItem(KEY, JSON.stringify([...got, k])); } catch { /* fine */ }
};
export const forgetWeather = () => { try { localStorage.removeItem(KEY); } catch { /* fine */ } };
/** A "did you know" for the end of a storm, different from storm to storm. */
export const factFor = (kind: EventKind, seed: string) => {
  const f = BRIEFS[kind].facts;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return f[h % f.length];
};
