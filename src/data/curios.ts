/**
 * Curiosities: things in the scenery that answer back when tapped. The first tap each mission
 * gives a true Mars fact and one regolith brick, so poking around always pays.
 * Facts typed in by hand from well-known NASA science (not downloaded):
 * - From Mars the Sun looks about two-thirds the size it does from Earth (Mars is 1.52 times as far).
 * - Phobos orbits Mars in about 7 hours 39 minutes, so about three times a day.
 * - Deimos is about 12 km across and looks like a bright star from the surface.
 * - Mars ice: polar caps, and ice under the ground (seen by Phoenix and orbiters).
 * - Mars is red because iron in its rocks and dust has rusted (iron oxide).
 * - Capsules use heat shields to slow down through the air.
 * - Entry, descent and landing takes about seven minutes: "seven minutes of terror".
 * - The daytime Mars sky is butterscotch, and sunsets look blue (Curiosity, 2015).
 */
export interface Curio { id: string; name: string; fact: string }

export const CURIOS: Curio[] = [
  { id: 'sun', name: 'The Sun', fact: 'From Mars, the Sun looks only about two-thirds as big as it does from Earth.' },
  { id: 'phobos', name: 'Phobos', fact: 'Phobos is the bigger of Mars\'s two moons. It zooms around Mars about three times every day!' },
  { id: 'deimos', name: 'Deimos', fact: 'Deimos is Mars\'s smaller moon, only about 12 kilometres (8 miles) across. From the ground it looks like a bright star.' },
  { id: 'ice', name: 'Buried ice', fact: 'Mars has lots of frozen water, in its ice caps at the poles and hidden under the ground.' },
  { id: 'rock', name: 'Red rock', fact: 'Mars is red because the iron in its rocks and dust has rusted.' },
  { id: 'capsule', name: 'Your capsule', fact: 'A capsule has a heat shield underneath. It glows hot as the capsule slows down through the air.' },
  { id: 'lander', name: 'The landing pad', fact: 'Landing on Mars takes about seven minutes from the top of the air to the ground. Engineers call it "seven minutes of terror".' },
  { id: 'sky', name: 'The Mars sky', fact: 'The Mars sky is a dusty butterscotch colour in the day, and its sunsets glow blue.' },
];
export const curioById = (id: string) => CURIOS.find((c) => c.id === id);

const KEY = 'sol-survivor:curios';
/** Curiosities ever found on this device. */
export const curiosEver = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; } catch { return []; } };
export const markCurio = (id: string) => {
  const got = curiosEver();
  if (!got.includes(id)) try { localStorage.setItem(KEY, JSON.stringify([...got, id])); } catch { /* fine */ }
};
