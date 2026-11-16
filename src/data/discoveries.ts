import { FIND_EVERY_SOLS, FIND_FIRST } from '../engine/constants';
import { makeRng } from '../engine/rng';

/**
 * Things to discover around the base. All but one are real things the Curiosity rover
 * has seen in Gale Crater, where the base sits; buried water ice is a fact about Mars in general.
 * Facts typed in by hand from NASA mission pages, not downloaded. Checked against NASA and
 * news sources on 16 November 2026 (see docs/SUBMISSION.md).
 * Where each one sits next to the base is made up for the game.
 */
export type FindReward = 'science' | 'part' | 'supplies';
export type FindLayer = 'surface' | 'ground' | 'mountain' | 'roam';
export interface Find {
  id: string;
  title: string;
  fact: string;
  reward: FindReward;
  layer: FindLayer;
  /** Where it sits along the world, 0 (far west) to 1 (far east). */
  x: number;
  /** Underground finds: how deep, 0 (just below the surface) to 1 (bottom). */
  depth?: number;
  w: number;
  h: number;
  /** How far a surface find sinks into the ground, in px. */
  sink?: number;
  /** A signpost, for named places. */
  sign?: string;
  /** Hint shown in the album before it is found. */
  where: string;
}

export const FINDS: Find[] = [
  { id: 'rim', title: 'The crater rim', layer: 'surface', x: 0.06, w: 300, h: 130, sink: 10, sign: 'Crater rim', reward: 'science', where: 'Far to the west, on the surface.',
    fact: 'Gale Crater is named after Walter Gale, an Australian amateur astronomer who studied Mars in the 1800s.' },
  { id: 'dunes', title: 'Bagnold Dunes', layer: 'surface', x: 0.155, w: 240, h: 70, sink: 8, sign: 'Bagnold Dunes', reward: 'supplies', where: 'West of the base, on the surface.',
    fact: 'These dark sand dunes really move, a little at a time, pushed by the wind. Curiosity was the first rover to visit moving dunes on another planet.' },
  { id: 'meteorite', title: 'Iron meteorite', layer: 'surface', x: 0.25, w: 74, h: 54, sink: 6, reward: 'part', where: 'Just west of the base, on the surface.',
    fact: 'Space rocks land on Mars too. Curiosity has found iron meteorites lying on the ground in Gale Crater.' },
  { id: 'lake', title: 'Ancient lakebed', layer: 'ground', x: 0.1, depth: 0.32, w: 120, h: 64, reward: 'science', where: 'Buried, far to the west.',
    fact: 'Billions of years ago, Gale Crater held lakes of liquid water. Curiosity found the mud rocks they left behind.' },
  { id: 'sulfur', title: 'Yellow sulfur crystals', layer: 'ground', x: 0.21, depth: 0.62, w: 100, h: 64, reward: 'part', where: 'Deep underground, west of the base.',
    fact: 'In 2024 Curiosity drove over a rock, cracked it open, and found yellow crystals of pure sulfur. Nobody had seen that on Mars before.' },
  { id: 'laser', title: 'A laser-zapped rock', layer: 'surface', x: 0.735, w: 90, h: 56, sink: 6, reward: 'science', where: 'Just east of the base, on the surface.',
    fact: 'Curiosity zaps rocks with a laser from as far as 7 meters (23 feet) away, then reads the flash to find out what they are made of.' },
  { id: 'tracks', title: 'Rover tracks', layer: 'surface', x: 0.79, w: 170, h: 30, sink: 22, reward: 'part', where: 'East of the base, on the ground.',
    fact: 'Curiosity’s wheels have holes that spell JPL in Morse code. It writes its team’s name in the dust as it drives.' },
  { id: 'curiosity', title: 'The Curiosity rover', layer: 'surface', x: 0.87, w: 130, h: 86, sink: 4, sign: 'Curiosity rover', reward: 'science', where: 'Far to the east, on the surface.',
    fact: 'Curiosity landed in Gale Crater in August 2012 and has been exploring it ever since. It is about the size of a car.' },
  { id: 'ice', title: 'Buried water ice', layer: 'ground', x: 0.8, depth: 0.55, w: 86, h: 60, reward: 'supplies', where: 'Underground, east of the base.',
    fact: 'Mars has frozen water hidden under the ground. Astronauts could melt it to drink, and split it to make oxygen.' },
  { id: 'organics', title: 'Old organic molecules', layer: 'ground', x: 0.94, depth: 0.3, w: 100, h: 64, reward: 'science', where: 'Buried, far to the east.',
    fact: 'In 2018 Curiosity found organic molecules, the carbon chemistry that life uses, in rocks about 3 billion years old. It is not proof of life, but it is a clue.' },
  { id: 'sharp', title: 'Mount Sharp', layer: 'mountain', x: 0.9, w: 400, h: 165, sign: 'Mount Sharp', reward: 'science', where: 'On the horizon to the east.',
    fact: 'The mountain in the middle of Gale Crater is Mount Sharp. It is about 5 kilometers (3 miles) tall, and its rock layers are like pages in a history book.' },
  { id: 'devil', title: 'A dust devil', layer: 'roam', x: 0.5, w: 70, h: 120, reward: 'part', where: 'It moves around. Keep your eyes open!',
    fact: 'Spinning winds called dust devils whirl across Gale Crater. Curiosity has filmed them dancing over the ground.' },
];

export const findById = (id: string) => FINDS.find((f) => f.id === id);

/** The order finds turn up in a mission: ones not yet in the album come first. */
export function findOrder(seed: number, album: string[]): string[] {
  const rng = makeRng(seed ^ 0x5eed);
  const ids = FINDS.map((f) => f.id);
  return [...rng.shuffle(ids.filter((id) => !album.includes(id))), ...rng.shuffle(ids.filter((id) => album.includes(id)))];
}

/** Finds that have turned up by this time: a few at the start, then one more every couple of sols. */
export const activeFinds = (order: string[], time: number) =>
  order.slice(0, Math.min(order.length, FIND_FIRST + Math.floor(Math.max(0, time - 1) / FIND_EVERY_SOLS)));

const KEY = 'sol-survivor-album-v1';
export function loadAlbum(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
export function saveAlbum(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* the album is a bonus */ }
}
