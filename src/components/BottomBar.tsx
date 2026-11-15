import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { BatteryMedium, Compass, FastForward, Smile, Hammer, Heart, Hourglass, Pause, Play, Radiation, Satellite, ScrollText, Star, Thermometer, Users, Volume2, VolumeX, Wind, X } from 'lucide-react';
import { FACTS } from '../data/facts';
import { CAREER_LIMIT, POWER_COST, WORK_SLOTS } from '../engine/constants';
import { MODULE_NAME, SPECIALIST, TRAITS, alive, bedName, habReady, isOn, power, shieldCover, stormDose, wear, workRate, workersIn } from '../engine/engine';
import type { CrewState, GameState } from '../engine/types';
import { TRIAGE_LABEL, maxHealth, triage } from '../engine/vitals';
import { useGame } from '../store/game';
import { Astronaut, Marv, type Mood } from './art';
import { feeling, lookOf } from './crewLook';
import { Term } from './Term';
import { TOUR } from './tour';
import { lessonOf, stepOf } from './coach';
import { useOpenFinds } from './Finds';
import { FINDS } from '../data/discoveries';

/**
 * What M.A.R.V. says when nothing else is going on: the single most useful thing to know right now,
 * in the voice of a cheerful mission director who solves problems out loud.
 */
function advice(game: GameState, party: boolean, finds = 0): { text: string; mood: Mood } {
  if (party) return { text: 'Storm beaten! We scienced our way out of that one. Great work, Commander!', mood: 'party' };
  const domes = game.modules.filter((m) => m.kind === 'dome' && m.buildLeft <= 0);
  const storm = stormDose(game) > 0;
  const p = power(game);
  if (storm && !domes.length) return { text: 'Radiation is hitting us and we have no Shield Dome. Hang on, crew! We will build one next.', mood: 'alert' };
  if (storm && game.shield < 50) return { text: 'Radiation is getting in! Switch on a Shield Dome, quick!', mood: 'alert' };
  if (storm && shieldCover(game) < 1) return { text: `The domes only cover part of the crew. ${domes.some((m) => !m.on) ? 'Switch on the other dome!' : 'We need a second Shield Dome.'}`, mood: 'alert' };
  if (storm) return { text: 'The shield is holding! Nice and steady until the storm passes.', mood: 'worried' };
  const site = game.modules.find((m) => m.buildLeft > 0 && !game.crew.some((c) => c.at === m.id));
  const hand = alive(game).find((c) => !c.exhausted && c.energy > 35 && !game.modules.some((m) => m.id === c.at && m.buildLeft > 0));
  if (site && hand) return { text: `The ${MODULE_NAME[site.kind]} will not build itself! Drag ${hand.name} onto the building site.`, mood: 'happy' };
  if (game.blueprints.length) return { text: `You earned plans for a ${MODULE_NAME[game.blueprints[0]]}. Press a green spot (or Build) to mark out the site.`, mood: 'happy' };
  if (!game.modules.some((m) => m.kind === 'oxygen') && game.life < 30) return { text: 'The capsule air is running low! Explore and finish missions to bring the next lander sooner, then build an Oxygen Maker.', mood: 'alert' };
  if (game.modules.length === 1) return { text: `Everything here must be earned. Explore the crater and finish missions to fill the Next lander bar (${Math.round(game.cargoProgress * 100)}%).`, mood: 'happy' };
  const coming = game.events.find((e) => e.phase === 'warned');
  if (coming && coming.kind !== 'dust' && domes.length && !isOn(game, 'dome')) return { text: `${coming.kind === 'cme' ? 'Solar storm' : 'Solar flare'} incoming! Time to science our way out: free up 4 power, then switch on the Shield Dome.`, mood: 'alert' };
  if (coming && coming.kind === 'dust') return { text: 'Dust storm on the way. Solar power is about to drop, so pick what can go dark.', mood: 'worried' };
  const dead = game.modules.find((m) => !m.on && m.buildLeft <= 0 && ((m.kind === 'oxygen' && game.life < 45 && !isOn(game, 'oxygen')) || m.kind === 'hab') && POWER_COST[m.kind] > p.free);
  if (dead && game.spareParts > 0) return { text: `No power for the ${MODULE_NAME[dead.kind]}? Press its Patch button. A spare part will run it for 1 sol.`, mood: 'worried' };
  if (game.life <= 0) return { text: 'The air tank is empty! Switch on the Oxygen Maker right now!', mood: 'alert' };
  if (game.life < 20) return { text: 'Life support is nearly empty. Oxygen Maker and Hydroponics on, with crew inside. We can fix this!', mood: 'alert' };
  const red = game.crew.find((c) => !c.out && triage(c) === 'red');
  if (red) return { text: `${red.name} is in trouble: ${feeling(red).toLowerCase()}. Click ${red.name} to check.`, mood: 'worried' };
  if (habReady(game) && !isOn(game, 'hab')) return { text: 'The Hab is off, so there is no heat. The crew are getting colder.', mood: 'worried' };
  const med = game.modules.find((m) => m.kind === 'medbay' && m.buildLeft <= 0);
  const sick = game.crew.find((c) => c.sick > 0.25 && c.at !== med?.id);
  if (sick && med) return { text: `${sick.name} has radiation sickness. Click ${sick.name} and send them to the Med Bay.`, mood: 'worried' };
  const fell = alive(game).find((c) => c.exhausted);
  if (fell) return { text: `${fell.name} collapsed from overwork and fell asleep on the spot! Drag ${fell.name} to ${bedName(game)} to sleep properly.`, mood: 'worried' };
  const tired = alive(game).find((c) => c.at !== 'hab' && c.energy < 35);
  if (tired) return { text: `${tired.name} is tired and working slower. Drag ${tired.name} to ${bedName(game)} for some sleep.`, mood: 'worried' };
  const sad = alive(game).find((c) => c.mood < 30);
  if (sad) return { text: `${sad.name} is unhappy. Rest, warmth, fresh food and company help. Very unhappy crew stop working!`, mood: 'worried' };
  const idle = game.modules.find((m) => m.on && WORK_SLOTS[m.kind] && m.kind !== 'medbay' && workersIn(game, m.id).length === 0);
  const resting = alive(game).find((c) => c.at === 'hab' && triage(c) !== 'red' && c.energy > 75);
  if (idle && resting) return { text: `${resting.name} is rested. Drag ${resting.name} into the ${MODULE_NAME[idle.kind]} to get it working.`, mood: 'happy' };
  if (game.griefUntil > game.time) { const gone = game.crew.filter((c) => c.out).slice(-1)[0]; if (gone) return { text: `We lost ${gone.name}. The crew is sad and working slower. Look after the ones still with us.`, mood: 'worried' }; }
  if (finds > 0 && Math.floor(game.time) % 3 !== 1) return { text: `My scanner sees ${finds} thing${finds > 1 ? 's' : ''} to discover out there! Drag the ground or press an arrow to explore.`, mood: 'happy' };
  const off = game.modules.find((m) => !m.on && m.buildLeft <= 0 && m.kind !== 'dome' && m.kind !== 'solar' && m.kind !== 'battery');
  if (p.free > 0 && off && p.free >= 1) return { text: `You have ${p.free} spare power. Is there a module you could switch on?`, mood: 'happy' };
  const sol = Math.floor(game.time);
  return { text: `Sol ${sol} log. Did you know? ${FACTS[(sol + game.seed) % FACTS.length]}`, mood: 'happy' };
}

function Ecg({ hr }: { hr: number }) {
  const beat = 'l6 0l3-9l4 16l3-10l3 3l11 0';
  return (
    <svg viewBox="0 0 90 24" className="ecg" aria-hidden="true">
      <g className="ecg-run" style={{ animationDuration: `${(60 / Math.max(30, hr)).toFixed(2)}s` }}>
        <path d={`M0 14${beat}${beat}${beat}${beat}${beat}`} />
      </g>
    </svg>
  );
}

const MOOD = (c: CrewState) => {
  const f = feeling(c);
  return f.startsWith('Fainted') ? '😵' : f.startsWith('Can barely') ? '😰' : f.startsWith('Dizzy') ? '😵‍💫' : f.startsWith('Freezing') ? '🥶' : f.startsWith('Radiation') ? '🤢' : f.startsWith('Worn') ? '😓' : '😀';
};

function VitalsCard({ c, game }: { c: CrewState; game: GameState }) {
  const { pick, assign } = useGame();
  const coachAssign = useGame((s) => stepOf(s.coach)?.target === 'assign-oxygen');
  const t = triage(c);
  const cap = maxHealth(c.dose, CAREER_LIMIT);
  const sols = Math.max(0, Math.floor(game.time - c.arrived));
  const extra = Math.round((wear(game, c) - 1) * 100);
  // Home first (the Hab, or the capsule before it exists), then building sites, then workplaces.
  const places = [
    { id: 'hab', label: habReady(game) ? 'Hab (sleep)' : 'Capsule (rest)', best: false, full: false },
    ...game.modules.filter((m) => m.buildLeft > 0).map((m) => ({ id: m.id, label: `Build: ${MODULE_NAME[m.kind]}`, best: false, full: c.at !== m.id && workersIn(game, m.id).length >= 2 })),
    ...game.modules.filter((m) => m.buildLeft <= 0 && WORK_SLOTS[m.kind]).map((m) => ({ id: m.id, label: MODULE_NAME[m.kind], best: SPECIALIST[m.kind] === c.role, full: c.at !== m.id && workersIn(game, m.id).length >= (WORK_SLOTS[m.kind] ?? 0) })),
  ];
  return (
    <motion.section
      className={`vitals-card t-${t}`}
      initial={{ y: 30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      aria-label={`${c.name}'s vitals`}
    >
      <header>
        <Astronaut who={c} look={lookOf(c)} bust size={54} />
        <div>
          <h3>{c.name} <small>{c.commander ? `Commander · ${c.role}` : c.role}</small> <span className="mood" aria-hidden="true">{MOOD(c)}</span></h3>
          <p className={`chip t-${t}`}><Term k="triage">{TRIAGE_LABEL[t]}</Term>: {feeling(c)}</p>
          <p className="trait-chip small">{TRAITS[c.trait].name}: {TRAITS[c.trait].text}</p>
          <p className="quirk">{c.quirk}</p>
        </div>
        <button className="icon-btn" onClick={() => pick(null)} aria-label="Close"><X /></button>
      </header>
      <div className="tiles">
        <div className={`vt ${c.spo2 < 94 ? (c.spo2 < 86 ? 'bad' : 'warn') : ''}`}>
          <Wind /><span><Term k="spo2">Oxygen</Term></span><b>{Math.round(c.spo2)}%</b>
        </div>
        <div className={`vt ${c.hr > 105 || c.hr < 52 ? 'warn' : ''}`}>
          <Heart /><span><Term k="bpm">Heart</Term></span><b>{Math.round(c.hr)}</b><Ecg hr={c.hr} />
        </div>
        <div className={`vt ${c.temp < 95 ? (c.temp < 93 ? 'bad' : 'warn') : ''}`}>
          <Thermometer /><span>Body temp</span><b>{c.temp.toFixed(1)}°F</b>
        </div>
      </div>
      <div className="needs">
        <div className={`need ${c.exhausted || c.energy < 30 ? 'bad' : c.energy < 50 ? 'warn' : ''}`}>
          <BatteryMedium /><span>Energy</span>
          <span className="need-bar"><motion.i animate={{ width: `${c.energy}%` }} /></span>
          <b>{c.exhausted ? 'Collapsed' : c.energy >= 70 ? 'Rested' : c.energy >= 50 ? 'OK' : c.energy >= 30 ? 'Tired' : 'Worn out'}</b>
        </div>
        <div className={`need mood ${c.mood < 15 ? 'bad' : c.mood < 40 ? 'warn' : ''}`}>
          <Smile /><span>Mood</span>
          <span className="need-bar"><motion.i animate={{ width: `${c.mood}%` }} /></span>
          <b>{c.mood >= 70 ? 'Happy' : c.mood >= 40 ? 'OK' : c.mood >= 15 ? 'Grumpy' : 'Upset'}</b>
        </div>
        <p className="need-tip">{
          c.exhausted ? `${c.name} collapsed from overwork and is asleep where they fell. Drag them to ${bedName(game)} to sleep properly.`
            : c.at === 'hab' ? `Sleeping in ${bedName(game)}. Energy is filling up${game.time - Math.floor(game.time) >= 0.72 ? ' fast, because it is night' : ''}.`
            : c.energy < 50 ? `Tired, so working ${Math.round((1 - workRate(c)) * 100)}% slower. Send them to ${bedName(game)} to sleep.`
            : c.mood < 40 ? 'Unhappy, so working slower. If mood gets too low they will stop working.'
            : 'Working hard. Working uses energy, so plan a sleep soon.'
        }</p>
      </div>
      <div className="dose-row">
        <Radiation />
        <span><Term k="radiation">Radiation</Term> soaked up, for good</span>
        <b>{Math.round(c.dose)} <Term k="msv">mSv</Term></b>
      </div>
      <div className="health" role="img" aria-label={`Health ${Math.round(c.health)} of 100. Radiation has removed ${Math.round(100 - cap)} for good.`}>
        <motion.i className="health-fill" animate={{ width: `${c.health}%` }} />
        <i className="health-lost" style={{ width: `${100 - cap}%` }} />
      </div>
      <div className="dose-row">
        <Hourglass />
        <span><Term k="wear">{sols} sols on Mars</Term></span>
        <b>{extra > 0 ? `needs ${extra}% more food` : 'just landed'}</b>
      </div>
      <div className="assign">
        <span className="assign-label">Send {c.name} to</span>
        <div className="assign-list">
          {places.map((pl) => {
            const here = c.at === pl.id;
            return (
              <motion.button key={pl.id} className={`btn assign-btn ${here ? 'here' : ''} ${coachAssign && pl.label === 'Oxygen Maker' && !here ? 'coach-target' : ''}`} whileTap={{ scale: 0.94 }} disabled={pl.full || here} onClick={() => assign(c.id, pl.id)}
                aria-label={`Send ${c.name} to ${pl.label}${pl.best ? `. Best job for a ${c.role}` : ''}${here ? '. Already here' : pl.full ? '. Full' : ''}`}>
                {pl.best && <Star />}{pl.label}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

export function BottomBar({ game }: { game: GameState }) {
  const { tour, setTour, picked, pick, notice, party, paused, speed, muted, setPaused, setSpeed, toggleMute, open, coach, album, albumSeen } = useGame();
  const openFinds = useOpenFinds().length;
  const lesson = stepOf(coach);
  const lessonSteps = coach ? lessonOf(coach.lesson)?.steps.length ?? 0 : 0;
  const [roster, setRoster] = useState(false);
  const step = tour !== null ? TOUR[tour] : null;
  const partying = Date.now() - party < 4500;
  const fresh = notice && Date.now() - notice.at < 2600;
  const talk = step
    ? { text: step.say, mood: (tour === 1 ? 'party' : 'happy') as Mood }
    : lesson ? { text: lesson.say({ game, picked, subject: coach?.subject }), mood: 'happy' as Mood }
    : fresh ? { text: notice.text, mood: 'worried' as Mood } : advice(game, partying, openFinds);
  const chosen = game.crew.find((c) => c.id === picked && !c.out);
  const trouble = game.crew.filter((c) => !c.out && triage(c) !== 'green').length;

  return (
    <footer className="drawer">
      <div className={`marv ${step || lesson ? 'teaching' : ''} mood-${talk.mood}`}>
        <Marv mood={talk.mood} size={74} />
        <AnimatePresence mode="wait">
          <motion.div key={talk.text} className="marv-say" role="status"
            initial={{ opacity: 0, x: -12, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }}>
            {lesson && <span className="marv-step">{coach?.lesson === 'start' ? `Training ${coach.step + 1} of ${lessonSteps}` : 'New lesson'}{lesson.pause ? ' · the clock is stopped' : ''}</span>}
            <p>{talk.text}{tour === 1 ? ' 👍' : ''}</p>
            {lesson && lesson.pause && <button className="linklike skip-coach" onClick={() => useGame.getState().setCoach(null)}>Skip this lesson</button>}
            {tour === 1 && <motion.button className="btn btn-go" whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.05 }} onClick={() => setTour(null)} autoFocus>Let's go!</motion.button>}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="dock" aria-label="Base actions">
        <motion.button className="dock-btn build" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.06 }} disabled={!game.blueprints.length || tour !== null} onClick={() => open({ type: 'build' })}>
          <Hammer /><span>Build</span>{game.blueprints.length > 0 && <b className="count">{game.blueprints.length}</b>}
        </motion.button>
        <motion.button className="dock-btn crew" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.06 }} aria-expanded={roster} onClick={() => setRoster(!roster)}>
          <Users /><span>Crew</span>{trouble > 0 && <b className="count alarm">{trouble}</b>}
        </motion.button>
        <motion.button className="dock-btn science" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.06 }} onClick={() => open({ type: 'data' })}>
          <Satellite /><span>NASA Log</span>
        </motion.button>
 <motion.button className="dock-btn finds" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.06 }} onClick={() => open({ type: 'finds' })} aria-label={`Discoveries album, ${album.length} of ${FINDS.length}`}>
          <Compass /><span>Finds</span>{album.length > albumSeen ? <b className="count new">{album.length - albumSeen}</b> : openFinds > 0 ? <b className="count">{openFinds}</b> : null}
        </motion.button>
        <motion.button className="dock-btn log" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.06 }} onClick={() => open({ type: 'log' })}>
          <ScrollText /><span>Mission</span>
        </motion.button>
        <AnimatePresence>
          {roster && (
            <motion.div className="roster" initial={{ y: 20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 22 }}>
              {game.crew.map((c) => {
                const look = lookOf(c);
                return (
                  <motion.button key={c.id} className={`portrait t-${look.triage} ${picked === c.id ? 'picked' : ''} ${c.out ? 'gone' : ''}`} whileTap={{ scale: 0.92 }} whileHover={{ y: -3 }}
                    onClick={() => !c.out && pick(picked === c.id ? null : c.id)} aria-pressed={picked === c.id} disabled={c.out}
                    aria-label={`${c.name}, ${c.role}. ${TRIAGE_LABEL[look.triage]}. ${feeling(c)}. Open vitals.`}>
                    <Astronaut who={c} look={look} bust size={42} />
                    <span className="portrait-name">{c.name}</span>
                    <span className="portrait-feel">{feeling(c)}</span>
                    <span className="health mini"><motion.i className="health-fill" animate={{ width: `${c.health}%` }} /></span>
                    <span className="health mini energy-mini"><motion.i className="health-fill" animate={{ width: `${c.energy}%` }} /></span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="controls">
        <motion.button className="icon-btn big" whileTap={{ scale: 0.9 }} onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Play' : 'Pause'} title={paused ? 'Play (P)' : 'Pause (P)'}>{paused ? <Play /> : <Pause />}</motion.button>
        <motion.button className="icon-btn" whileTap={{ scale: 0.9 }} onClick={() => setSpeed(speed === 1 ? 2 : 1)} aria-pressed={speed === 2} aria-label="Double speed" title="Double speed"><FastForward /></motion.button>
        <motion.button className="icon-btn" whileTap={{ scale: 0.9 }} onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Sound is off' : 'Sound is on'} title="Sound">{muted ? <VolumeX /> : <Volume2 />}</motion.button>
      </div>
      <AnimatePresence>{chosen && <VitalsCard key={chosen.id} c={chosen} game={game} />}</AnimatePresence>
    </footer>
  );
}
