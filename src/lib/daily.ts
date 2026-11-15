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

/** Wordle colours: right letter in the right place, in the word, or not in it. */
export function score(guess: string, answer: string): ('hit' | 'near' | 'miss')[] {
  const out: ('hit' | 'near' | 'miss')[] = Array(5).fill('miss');
  const left: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) out[i] = 'hit';
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
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
