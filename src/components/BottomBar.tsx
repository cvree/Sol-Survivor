import { AnimatePresence, motion } from 'motion/react';
import { FastForward, Heart, Pause, Play, Radiation, Satellite, Thermometer, Volume2, VolumeX, Wind, X } from 'lucide-react';
import { FACTS } from '../data/facts';
import { CAREER_LIMIT } from '../engine/constants';
import { isOn, power, stormDose } from '../engine/engine';
import type { CrewState, GameState } from '../engine/types';
import { TRIAGE_LABEL, maxHealth, triage } from '../engine/vitals';
import { useGame } from '../store/game';
import { Astronaut, Marv, type Mood } from './art';
import { feeling, lookOf } from './crewLook';
import { Term } from './Term';
import { TOUR } from './tour';

/** What M.A.R.V. says when nothing else is going on: the single most useful thing to know right now. */
function advice(game: GameState, party: boolean): { text: string; mood: Mood } {
  if (party) return { text: 'Storm beaten! Systems stabilized. Great work, Commander!', mood: 'party' };
  const hasShield = game.modules.some((m) => m.kind === 'shield');
  if (stormDose(game) > 0 && game.shield < 50) {
    return { text: hasShield ? 'Radiation is getting in! Switch on the Storm Shield!' : 'Radiation is hitting us and we have no shield. Hang on, crew!', mood: 'alert' };
  }
  if (stormDose(game) > 0 && hasShield) return { text: 'The shield is holding! Hang on until the storm passes.', mood: 'worried' };
  const coming = game.events.find((e) => e.phase === 'warned');
  if (coming && coming.kind !== 'dust' && hasShield && !isOn(game, 'shield')) return { text: 'Storm on the way! Switch rooms off until the Storm Shield has 6 power, then switch it on.', mood: 'alert' };
  if (coming && coming.kind === 'dust') return { text: 'Dust storm on the way. Solar power is about to drop.', mood: 'worried' };
  if (game.life <= 0) return { text: 'The air tank is empty! Switch on the Oxygen Maker right now!', mood: 'alert' };
  if (game.life < 20) return { text: 'Life support is nearly empty. Switch on the Oxygen Maker and Greenhouse.', mood: 'alert' };
  const red = game.crew.find((c) => triage(c) === 'red');
  if (red) return { text: `${red.name} is in trouble: ${feeling(red).toLowerCase()}. Click ${red.name} to check.`, mood: 'worried' };
  if (!isOn(game, 'heater')) return { text: 'The Heater is off. The crew are getting colder every sol.', mood: 'worried' };
  const sick = game.crew.find((c) => c.sick > 0.25);
  if (sick && game.loadout.medbay && game.patient !== sick.id) return { text: `${sick.name} has radiation sickness. Click ${sick.name}, then send them to the Med Bay.`, mood: 'worried' };
  const p = power(game);
  const off = game.modules.find((m) => !m.on && m.kind !== 'solar' && m.kind !== 'shield');
  if (p.free > 0 && off) return { text: `You have ${p.free} spare power. Is there a room you could switch on?`, mood: 'happy' };
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

function VitalsCard({ c, game }: { c: CrewState; game: GameState }) {
  const { pick, treat } = useGame();
  const t = triage(c);
  const cap = maxHealth(c.dose, CAREER_LIMIT);
  const medOn = isOn(game, 'medbay');
  const inBed = medOn && game.patient === c.id;
  return (
    <motion.section
      className={`vitals-card t-${t}`}
      initial={{ y: 30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      aria-label={`${c.name}'s vitals`}
    >
      <header>
        <Astronaut id={c.id} look={lookOf(c)} bust size={54} />
        <div>
          <h3>{c.name} <small>{c.role}</small></h3>
          <p className={`chip t-${t}`}><Term k="triage">{TRIAGE_LABEL[t]}</Term>: {feeling(c)}</p>
        </div>
        <button className="icon-btn" onClick={() => pick(null)} aria-label="Close"><X /></button>
      </header>
      <div className="tiles">
        <div className={`tile ${c.spo2 < 94 ? (c.spo2 < 86 ? 'bad' : 'warn') : ''}`}>
          <Wind /><span><Term k="spo2">Oxygen</Term></span><b>{Math.round(c.spo2)}%</b>
        </div>
        <div className={`tile ${c.hr > 105 || c.hr < 52 ? 'warn' : ''}`}>
          <Heart /><span><Term k="bpm">Heart</Term></span><b>{Math.round(c.hr)}</b><Ecg hr={c.hr} />
        </div>
        <div className={`tile ${c.temp < 95 ? (c.temp < 93 ? 'bad' : 'warn') : ''}`}>
          <Thermometer /><span>Body temp</span><b>{c.temp.toFixed(1)}°F</b>
        </div>
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
      {game.loadout.medbay > 0 && (
        <motion.button className="btn btn-go" whileTap={{ scale: 0.95 }} disabled={!medOn} onClick={() => treat(inBed ? null : c.id)}>
          {!medOn ? 'Med Bay is switched off' : inBed ? 'Leave the Med Bay' : 'Send to the Med Bay'}
        </motion.button>
      )}
    </motion.section>
  );
}

export function BottomBar({ game }: { game: GameState }) {
  const { tour, setTour, picked, pick, notice, party, paused, speed, muted, setPaused, setSpeed, toggleMute, open } = useGame();
  const step = tour !== null ? TOUR[tour] : null;
  const partying = Date.now() - party < 4500;
  const fresh = notice && Date.now() - notice.at < 2600;
  const talk = step
    ? { text: step.say(game), mood: 'happy' as Mood }
    : fresh ? { text: notice.text, mood: 'worried' as Mood } : advice(game, partying);
  const last = tour === TOUR.length - 1;
  const chosen = game.crew.find((c) => c.id === picked);

  return (
    <footer className="bottom">
      <div className={`marv ${step ? 'teaching' : ''} mood-${talk.mood}`}>
        <Marv mood={talk.mood} size={78} />
        <AnimatePresence mode="wait">
          <motion.div key={talk.text} className="marv-say" role="status"
            initial={{ opacity: 0, x: -12, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
            {step && <span className="marv-step">Training {tour! + 1} of {TOUR.length}</span>}
            <p>{talk.text}</p>
            {step && (
              <span className="marv-actions">
                {!step.done && <motion.button className="btn btn-go" whileTap={{ scale: 0.95 }} onClick={() => setTour(last ? null : tour! + 1)} autoFocus>{last ? 'Start the mission' : 'Next'}</motion.button>}
                {step.done && <span className="marv-wait">Your turn!</span>}
                {!last && <button className="btn btn-ghost" onClick={() => setTour(null)}>Skip training</button>}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="crew-row">
        {game.crew.map((c) => {
          const look = lookOf(c);
          return (
            <motion.button key={c.id} className={`portrait t-${look.triage} ${picked === c.id ? 'picked' : ''}`} whileTap={{ scale: 0.94 }} whileHover={{ y: -3 }}
              onClick={() => pick(picked === c.id ? null : c.id)} aria-pressed={picked === c.id}
              aria-label={`${c.name}. ${TRIAGE_LABEL[look.triage]}. ${feeling(c)}. Open vitals.`}>
              <Astronaut id={c.id} look={look} bust size={46} />
              <span className="portrait-name">{c.name}</span>
              <span className="portrait-feel">{feeling(c)}</span>
              <span className="health mini"><motion.i className="health-fill" animate={{ width: `${c.health}%` }} /></span>
            </motion.button>
          );
        })}
        <AnimatePresence>{chosen && <VitalsCard key={chosen.id} c={chosen} game={game} />}</AnimatePresence>
      </div>

      <div className="controls">
        <motion.button className="icon-btn big" whileTap={{ scale: 0.9 }} onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Play' : 'Pause'} title={paused ? 'Play (P)' : 'Pause (P)'}>{paused ? <Play /> : <Pause />}</motion.button>
        <motion.button className="icon-btn" whileTap={{ scale: 0.9 }} onClick={() => setSpeed(speed === 1 ? 2 : 1)} aria-pressed={speed === 2} aria-label="Double speed" title="Double speed"><FastForward /></motion.button>
        <motion.button className="icon-btn" whileTap={{ scale: 0.9 }} onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Sound is off' : 'Sound is on'} title="Sound">{muted ? <VolumeX /> : <Volume2 />}</motion.button>
        <motion.button className="btn btn-nasa" whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'data' })}><Satellite /> NASA data</motion.button>
      </div>
    </footer>
  );
}
