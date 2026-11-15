import { HYPOTHERMIA_TEMP } from '../engine/constants';
import { activeEvents, alive, isOn, isPatched, lifeFlow, power, stormDose } from '../engine/engine';
import type { GameState } from '../engine/types';

/**
 * The mission ticker: short lines from M.A.R.V. and the crew that react to how the base is doing.
 * These are story, not science. Anything that states a fact about Mars is true:
 * low gravity, Earth seen as a bright dot, old rocks, thin air.
 */
export interface Line { who: string; crewId?: string; text: string; tone: 'calm' | 'good' | 'warn' | 'bad' }

const MARV = 'M.A.R.V.';
const m = (tone: Line['tone'], ...texts: string[]): Line[] => texts.map((text) => ({ who: MARV, text, tone }));

const CALM = m('calm',
  'All systems green. I checked twice. Okay, three times.',
  'Quiet sol. I am counting rocks. So far: lots.',
  'I ran the numbers. The numbers say you are doing great, Commander.',
  'Nobody has built this base before. You are the first. No pressure!',
  'Base status: cozy. Planet status: still Mars.',
  'Fun job for later: name the dust. All of it.',
);
const LOW_LIFE = m('bad',
  'Air is getting low. Breathing is my favourite thing you do. Please keep doing it.',
  'Life support is dropping. Time to science our way out of this, Commander!',
  'The tank is low. Oxygen Maker on, crew inside. We can fix this.',
);
const DRAINING = m('warn',
  'Life support is going down, not up. More crew means more air to make.',
  'We are using air faster than we make it. An astronaut in the Oxygen Maker would help.',
);
const FULL_LIFE = m('good',
  'Life support is nearly full. The crew may now breathe with confidence.',
  'Air: plenty. Food: plenty. Me: proud.',
);
const SPARE = m('calm',
  'We have spare power just sitting there. It looks bored.',
  'Spare power detected. Something could be switched on.',
);
const TUNED = m('good',
  'Every bit of power is in use. That is some fine engineering.',
  'Power is perfectly balanced. Hear that hum? That is the sound of smart.',
);
const WARNED = m('warn',
  'The Sun is grumpy. Shield Dome time!',
  'Storm clock is ticking. Stay cool. I mean calm. Stay calm.',
  'Storm incoming! Time to science our way out of this, Commander!',
);
const WARNED_DUST = m('warn',
  'Dust wall on the way. Solar Fields are about to take a nap.',
  'Dust is coming. Decide now what the base can live without.',
);
const STORM = m('bad',
  'Hold on, crew! Radiation is knocking and we are not answering.',
  'Shield status is everything right now. Keep that dome on!',
);
const DUST = m('warn',
  'Dust everywhere. I would sneeze if I had a nose.',
  'The Solar Fields are napping under the dust. Batteries, you are up!',
  'Low sunlight. Switch off what you can spare before the power trips.',
);
const COLD = m('bad', 'The Hab is off. Brr. Even my circuits feel it.', 'No heat! Bodies warm up slowly. Hab on, please.');
const PATCHED = m('good', 'That patch is tape, hope and science. Mostly tape.', 'Jury-rig holding! Engineers call that a "temporary forever" fix.');
const BIG_CREW = m('calm', 'A full crew! That is a lot of lunch.', 'More astronauts, more air needed. Worth it for the company.');
const SCIENCE = m('good', 'The lab sent new data to Earth. Earth says thanks!', 'Science is flowing. The next lander will come sooner.');

const AT_WORK: Record<string, string[]> = {
  hydro: ['The lettuce grew a new leaf! I named it Leafy.', 'Tomatoes are coming along. Do not tell the others.', 'Plants like it when you hum. I tested it.'],
  oxygen: ['The Oxygen Maker is purring.', 'Tightened a bolt. Felt heroic.', 'Turning Mars air into breathing air. Best job ever.'],
  lab: ['Found a cool rock!', 'This rock is billions of years old. Wow.', 'Sending my notes to Earth. They will love this.'],
  medbay: ['Everybody drink your water!', 'Heartbeats sound good today.', 'Check-up time. Say "aah".'],
  hab: ['Coffee break!', 'Space coffee again. Yum. Sort of.', 'I can see Earth! It is that tiny bright dot.', 'I jumped really high today. Low gravity is the best.', 'Who moved my sock?', 'Movie night later? I vote space movie.'],
};
const CREW_COLD = ['Can someone switch the Hab on? Please?', 'I can see my breath in here!'];
const CREW_AIR = ['Is it stuffy in here?', 'My head feels fuzzy...'];
const CREW_STORM = ['I trust the dome. I trust the dome.', 'Stay inside, everyone!'];
const CREW_DUST = ['Listen to that wind!', 'I cannot see the hills any more.'];

const pick = <T,>(list: T[], n: number) => list[((n % list.length) + list.length) % list.length];

/** The line to show now. `n` counts up each time, so the ticker takes turns between M.A.R.V. and the crew. */
export function tickerLine(game: GameState, n: number): Line {
  const crew = alive(game);
  const speaker = crew.length ? pick(crew, n * 7 + 3) : null;
  const crewTurn = n % 2 === 1 && !!speaker;
  const say = (texts: string[], tone: Line['tone']): Line => ({ who: speaker!.name, crewId: speaker!.id, text: pick(texts, n + speaker!.name.length), tone });

  const storm = stormDose(game) > 0;
  const dust = activeEvents(game, 'dust').length > 0;
  const warned = game.events.find((e) => e.phase === 'warned');
  const cold = crew.some((c) => c.temp < HYPOTHERMIA_TEMP + 1.5) && !isOn(game, 'hab');
  const p = power(game);
  const flow = lifeFlow(game);

  const gone = game.crew.filter((c) => c.out).slice(-1)[0];
  if (gone && game.griefUntil > game.time) return crewTurn ? say([`I keep thinking about ${gone.name}.`, `${gone.name} would want us to keep going.`, `This one is for ${gone.name}.`], 'warn') : { who: MARV, text: `Crew morale is low after losing ${gone.name}. Small wins will help.`, tone: 'warn' };
  if (storm) return crewTurn ? say(CREW_STORM, 'bad') : pick(STORM, n);
  if (game.life < 20) return crewTurn ? say(CREW_AIR, 'bad') : pick(LOW_LIFE, n);
  if (cold) return crewTurn ? say(CREW_COLD, 'bad') : pick(COLD, n);
  if (warned) return pick(warned.kind === 'dust' ? WARNED_DUST : WARNED, n);
  if (dust) return crewTurn ? say(CREW_DUST, 'warn') : pick(DUST, n);
  if (crewTurn && speaker!.exhausted) return { who: speaker!.name, crewId: speaker!.id, text: 'Zzz... five more minutes...', tone: 'warn' };
  if (crewTurn && speaker!.energy < 30) return say(['I can barely keep my eyes open.', 'Is it bedtime yet?', 'Everything takes sooo long when I am tired.'], 'warn');
  if (crewTurn && speaker!.mood < 35) return say(['I have been working forever.', 'Nobody asked if I wanted a break.', 'Grumble grumble.'], 'warn');
  if (crewTurn && speaker!.at === 'hab' && game.time - Math.floor(game.time) >= 0.72) return say(['Good night, Mars.', 'Best sleep ever.', 'Sleeping bags are cozy.'], 'calm');
  if (crewTurn) {
    const room = game.modules.find((x) => x.id === speaker!.at);
    const lines = room && room.on ? AT_WORK[room.kind] : undefined;
    // Every so often they share their own little habit instead.
    if (n % 6 === 5) return { who: speaker!.name, crewId: speaker!.id, text: `Fun fact about me: ${speaker!.quirk.charAt(0).toLowerCase()}${speaker!.quirk.slice(1)}`, tone: 'calm' };
    if (lines) return say(lines, 'calm');
  }
  const pools: Line[][] = [];
  if (game.modules.some((x) => isPatched(game, x))) pools.push(PATCHED);
  if (flow.net < -1.5 && game.life < 60) pools.push(DRAINING);
  if (game.life > 85) pools.push(FULL_LIFE);
  if (p.free === 0 && p.supply >= 4) pools.push(TUNED);
  if (p.free >= 2) pools.push(SPARE);
  if (crew.length >= 5) pools.push(BIG_CREW);
  if (game.modules.some((x) => x.kind === 'lab' && x.on) && game.science > 3) pools.push(SCIENCE);
  pools.push(CALM);
  return pick(pick(pools, n >> 1), n);
}
