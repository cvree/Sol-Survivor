/**
 * The Daily Sol Check: one five-letter space word a day, six tries, like Wordle.
 * Real astronauts take short brain tests to check they are sharp before hard work;
 * this is a game version. Solving it gives today's missions a small head start.
 */
export const WORDS: { word: string; hint: string }[] = [
  { word: 'ORBIT', hint: 'The curved path a moon or spacecraft takes around a planet.' },
  { word: 'COMET', hint: 'A ball of ice and dust that grows a tail near the Sun.' },
  { word: 'ROVER', hint: 'A robot car that drives on another world.' },
  { word: 'LUNAR', hint: 'To do with the Moon.' },
  { word: 'SOLAR', hint: 'To do with the Sun.' },
  { word: 'VENUS', hint: 'The hottest planet in our solar system.' },
  { word: 'EARTH', hint: 'Home. From Mars it looks like a bright star.' },
  { word: 'SPACE', hint: 'What is between the planets. Mostly empty.' },
  { word: 'STARS', hint: 'Faraway suns.' },
  { word: 'LASER', hint: 'Curiosity zaps rocks with one to see what they are made of.' },
  { word: 'PROBE', hint: 'A spacecraft sent to explore.' },
  { word: 'ROCKS', hint: 'What Mars is covered in.' },
  { word: 'CRUST', hint: 'The outer, rocky layer of a planet.' },
  { word: 'FLARE', hint: 'A sudden burst of light and energy from the Sun.' },
  { word: 'RADAR', hint: 'Radio waves used to see through clouds and dust.' },
  { word: 'DUNES', hint: 'Hills of sand pushed by the wind.' },
  { word: 'STORM', hint: 'On Mars these can be made of dust, and cover the whole planet.' },
  { word: 'MOONS', hint: 'Mars has two: Phobos and Deimos.' },
  { word: 'WATER', hint: 'Mars has it frozen as ice.' },
  { word: 'METAL', hint: 'Iron meteorites are made of it.' },
  { word: 'PLANT', hint: 'Astronauts have grown lettuce in space.' },
  { word: 'SEEDS', hint: 'What a botanist plants in Hydroponics.' },
  { word: 'HATCH', hint: 'A door on a spacecraft.' },
  { word: 'ROBOT', hint: 'M.A.R.V. is one.' },
  { word: 'DRILL', hint: 'A tool that makes holes in rock.' },
  { word: 'BOOTS', hint: 'They leave footprints in the dust.' },
  { word: 'VALVE', hint: 'It opens and closes to control air or water.' },
  { word: 'SPARK', hint: 'A tiny flash of electricity.' },
  { word: 'POWER', hint: 'Solar Fields make it.' },
  { word: 'LIGHT', hint: 'From the Sun, it takes about 12 minutes to reach Mars.' },
  { word: 'MOXIE', hint: 'The machine on Perseverance that made oxygen from Mars air.' },
  { word: 'CREWS', hint: 'Teams of astronauts.' },
  { word: 'ALIEN', hint: 'Life from another world. None found yet!' },
  { word: 'CLOUD', hint: 'Mars has thin ones, made of ice.' },
  { word: 'SUITS', hint: 'Astronauts wear them outside.' },
];

const KEY = 'sol-survivor-daily-v1';
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Same word for everyone on the same day. */
export function wordFor(key = todayKey()) {
  const days = Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000);
  return WORDS[((days * 7) % WORDS.length + WORDS.length) % WORDS.length];
}

export interface DailyState { key: string; guesses: string[]; done: boolean; won: boolean; bonusUsed: boolean }
export function loadDaily(): DailyState {
  const key = todayKey();
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && v.key === key) return v;
  } catch { /* new day */ }
  return { key, guesses: [], done: false, won: false, bonusUsed: false };
}
export function saveDaily(d: DailyState) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* fine */ }
}

/** Wordle colours: right letter in the right place, in the word, or not in it. Works for any word length. */
export function score(guess: string, answer: string): ('hit' | 'near' | 'miss')[] {
  const n = answer.length;
  const out: ('hit' | 'near' | 'miss')[] = Array(n).fill('miss');
  const left: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) out[i] = 'hit';
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (out[i] === 'hit') continue;
    if (left[guess[i]]) { out[i] = 'near'; left[guess[i]]--; }
  }
  return out;
}

/** Today's head start, if the Sol Check was solved and not used yet. Marks it used. */
export function takeBonus(): boolean {
  const d = loadDaily();
  if (!d.won || d.bonusUsed) return false;
  saveDaily({ ...d, bonusUsed: true });
  return true;
}

// ---------- practice words, the Word Log and ranks ----------
// Once today's word is done, children can keep playing practice words in three sizes.
// Every word solved (today's or practice) goes into the Word Log with its fact, kept between visits.
// Nothing is lost by missing a day: there are no streaks.

export type Level = 4 | 5 | 6;
export const LEVELS: { len: Level; name: string; blurb: string }[] = [
  { len: 4, name: 'Cadet', blurb: '4 letters' },
  { len: 5, name: 'Pilot', blurb: '5 letters' },
  { len: 6, name: 'Commander', blurb: '6 letters' },
];

const WORDS4: { word: string; hint: string }[] = [
  { word: 'MARS', hint: 'The red planet. Rusty dust gives it its colour.' },
  { word: 'MOON', hint: 'Earth has one. Mars has two.' },
  { word: 'STAR', hint: 'The Sun is one of these.' },
  { word: 'DUST', hint: 'Mars storms are made of it.' },
  { word: 'SUIT', hint: 'Astronauts wear one to go outside.' },
  { word: 'FUEL', hint: 'Rockets burn it to fly.' },
  { word: 'SHIP', hint: 'A spacecraft is a kind of this.' },
  { word: 'LAVA', hint: 'Melted rock. Olympus Mons, a giant volcano on Mars, was built by it.' },
  { word: 'CREW', hint: 'The team of astronauts on a mission.' },
  { word: 'COLD', hint: 'Mars averages about minus 80°F.' },
  { word: 'SAND', hint: 'Tiny bits of rock. Mars has whole dunes of it.' },
  { word: 'WIND', hint: 'Moving air. On Mars it is thin but can still lift dust.' },
  { word: 'NOVA', hint: 'A star that suddenly shines much brighter for a while.' },
  { word: 'RING', hint: 'Saturn has bright ones made of ice and rock.' },
  { word: 'DISH', hint: 'A bowl-shaped antenna that listens for radio messages.' },
  { word: 'LAND', hint: 'What a lander does at the end of its trip.' },
  { word: 'TANK', hint: 'Astronauts carry air in one.' },
  { word: 'ROCK', hint: 'Curiosity has studied lots of these in Gale Crater.' },
  { word: 'GLOW', hint: 'What lava and hot metal do.' },
  { word: 'ATOM', hint: 'A tiny piece that everything is made of.' },
];

const WORDS5_MORE: { word: string; hint: string }[] = [
  { word: 'ATOMS', hint: 'Tiny pieces that everything is made of.' },
  { word: 'ORION', hint: 'A group of stars shaped like a hunter. Also NASA\'s spacecraft for carrying astronauts.' },
  { word: 'PLUTO', hint: 'A dwarf planet far beyond Neptune.' },
  { word: 'TITAN', hint: 'Saturn\'s biggest moon. It has thick clouds.' },
  { word: 'BEAMS', hint: 'Lines of light, like the ones from a torch.' },
];

const WORDS6: { word: string; hint: string }[] = [
  { word: 'PLANET', hint: 'A big round world that travels around a star. Mars is one.' },
  { word: 'ROCKET', hint: 'It pushes hot gas down to fly up.' },
  { word: 'GALAXY', hint: 'A huge family of stars. We live in the Milky Way.' },
  { word: 'CRATER', hint: 'A bowl-shaped hole made when a space rock hits. Your base sits in Gale Crater.' },
  { word: 'NEBULA', hint: 'A cloud of gas and dust where stars are born.' },
  { word: 'OXYGEN', hint: 'The gas we breathe in.' },
  { word: 'HELMET', hint: 'It covers an astronaut\'s head and holds their air.' },
  { word: 'LANDER', hint: 'A spacecraft that sets down gently on another world.' },
  { word: 'ORBITS', hint: 'The circles and ovals that moons and planets travel in.' },
  { word: 'COMETS', hint: 'Icy visitors that grow tails near the Sun.' },
  { word: 'METEOR', hint: 'A space rock burning up as a streak of light in the sky.' },
  { word: 'SATURN', hint: 'The planet with the biggest, brightest rings.' },
  { word: 'LAUNCH', hint: 'When a rocket takes off.' },
  { word: 'PHOBOS', hint: 'The bigger of Mars\'s two moons.' },
  { word: 'DEIMOS', hint: 'The smaller of Mars\'s two moons.' },
  { word: 'SAMPLE', hint: 'Perseverance seals bits of Mars rock in tubes, called these.' },
  { word: 'SHIELD', hint: 'Something that blocks danger, like the Shield Dome blocks radiation.' },
  { word: 'SENSOR', hint: 'A part that measures things, like heat or light.' },
  { word: 'COSMOS', hint: 'Another word for the whole universe.' },
  { word: 'HUBBLE', hint: 'A space telescope that has circled Earth since 1990.' },
  { word: 'SIGNAL', hint: 'A message sent by radio.' },
  { word: 'ROVERS', hint: 'Robot cars. NASA has driven five of them on Mars.' },
];

/** Every word there is to find, by length. Today's words are the five-letter ones. */
export const BANK: Record<Level, { word: string; hint: string }[]> = { 4: WORDS4, 5: [...WORDS, ...WORDS5_MORE], 6: WORDS6 };
export const ALL_WORDS = [...BANK[4], ...BANK[5], ...BANK[6]];
export const hintFor = (word: string) => ALL_WORDS.find((w) => w.word === word)?.hint ?? '';

const LOG_KEY = 'sol-survivor-wordlog-v1';
/** The Word Log: every space word this player has solved. */
export function loadLog(): string[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as string[]; } catch { return []; }
}
/** Adds a solved word. Returns true if it is new to the log. */
export function addToLog(word: string): boolean {
  const log = loadLog();
  if (log.includes(word)) return false;
  try { localStorage.setItem(LOG_KEY, JSON.stringify([...log, word])); } catch { /* fine */ }
  return true;
}

/** Ranks for the Word Log. Each one is a reason to play one more word. */
export const RANKS: { at: number; name: string }[] = [
  { at: 0, name: 'Word Cadet' },
  { at: 5, name: 'Word Pilot' },
  { at: 15, name: 'Word Explorer' },
  { at: 30, name: 'Word Commander' },
  { at: 50, name: 'Word Wizard' },
  { at: ALL_WORDS.length, name: 'Space Word Legend' },
];
export function rankOf(found: number) {
  let i = 0;
  while (i + 1 < RANKS.length && found >= RANKS[i + 1].at) i++;
  return { rank: RANKS[i], next: RANKS[i + 1] ?? null };
}

export interface PracticeState { len: Level; word: string; guesses: string[]; done: boolean; won: boolean }
const PRACTICE_KEY = 'sol-survivor-practice-v1';
export function loadPractice(): PracticeState | null {
  try { return JSON.parse(localStorage.getItem(PRACTICE_KEY) ?? 'null') as PracticeState | null; } catch { return null; }
}
export function savePractice(p: PracticeState | null) {
  try { if (p) localStorage.setItem(PRACTICE_KEY, JSON.stringify(p)); else localStorage.removeItem(PRACTICE_KEY); } catch { /* fine */ }
}
/** A fresh practice word: one not in the Word Log yet if there is one, never the one just played. */
export function newPractice(len: Level, avoid?: string, rand: () => number = Math.random): PracticeState {
  const log = loadLog();
  const pool = BANK[len].filter((w) => w.word !== avoid && w.word !== wordFor().word);
  const fresh = pool.filter((w) => !log.includes(w.word));
  const from = fresh.length ? fresh : pool;
  return { len, word: from[Math.floor(rand() * from.length)].word, guesses: [], done: false, won: false };
}

export interface WordStats { played: number; won: number; /** wins by number of guesses, 1 to 6 */ dist: number[] }
const STATS_KEY = 'sol-survivor-wordstats-v1';
export function loadStats(): WordStats {
  try { return { played: 0, won: 0, dist: [0, 0, 0, 0, 0, 0], ...JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}') }; } catch { return { played: 0, won: 0, dist: [0, 0, 0, 0, 0, 0] }; }
}
export function recordGame(won: boolean, guesses: number) {
  const st = loadStats();
  st.played++;
  if (won) { st.won++; st.dist[Math.min(6, guesses) - 1]++; }
  try { localStorage.setItem(STATS_KEY, JSON.stringify(st)); } catch { /* fine */ }
}
