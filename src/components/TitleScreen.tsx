import { motion } from 'motion/react';
import { GraduationCap, Rocket, Satellite } from 'lucide-react';
import { hasDonki } from '../data/records';
import { MISSION_SOLS } from '../engine/constants';
import { useGame } from '../store/game';
import { Astronaut, Marv, type Look } from './art';
import { DataPanel } from './Panels';
import { Term } from './Term';

const OK: Look = { triage: 'green', blueLips: false, flushed: false, fainted: false, shiver: false, dizzy: false };

export function TitleScreen() {
  const { goPack, sun, difficulty, setDifficulty, open, panel } = useGame();
  return (
    <div className="title">
      <div className="sky" aria-hidden="true">
        <div className="sky-band" />
        <div className="sun" />
        <div className="hills hills-far" />
        <div className="hills hills-near" />
      </div>
      <div className="title-ground" aria-hidden="true" />

      <motion.div className="title-card" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
        <div className="title-crew" aria-hidden="true">
          {['ada', 'kofi', 'mei', 'luis'].map((id, i) => (
            <motion.span key={id} animate={{ y: [0, -6, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 }}><Astronaut id={id} look={OK} size={46} /></motion.span>
          ))}
          <Marv mood="happy" size={70} />
        </div>
        <h1 className="logo">Sol Survivor</h1>
        <p className="title-lede">
          Pack a lander, fly to Mars, and keep four astronauts alive for {MISSION_SOLS} <Term k="sol">sols</Term>.
          You will never have enough power for everything.
        </p>

        <fieldset className="levels">
          <legend>Pick your mission</legend>
          <label className={difficulty === 'cadet' ? 'picked' : ''}>
            <input type="radio" name="level" checked={difficulty === 'cadet'} onChange={() => setDifficulty('cadet')} />
            <b><GraduationCap /> Cadet</b><span>Gentler storms and more warning.</span>
          </label>
          <label className={difficulty === 'commander' ? 'picked' : ''}>
            <input type="radio" name="level" checked={difficulty === 'commander'} onChange={() => setDifficulty('commander')} />
            <b><Rocket /> Commander</b><span>Storms at full strength.</span>
          </label>
        </fieldset>

        <div className="title-actions">
          <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }} onClick={goPack}><Rocket /> Play</motion.button>
          <motion.button className="btn btn-nasa" whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'data' })}><Satellite /> NASA data</motion.button>
        </div>

        <p className="sun-report" aria-live="polite">
          <span className={`dot dot-${sun.status}`} aria-hidden="true" />
          {sun.status === 'loading' && 'Asking NASA what the real Sun is doing...'}
          {sun.status === 'live' && (
            <>The real Sun right now is <b>{sun.level}</b>: {sun.mFlares} M-class and {sun.xFlares} X-class flares in the last 30 days (NASA DONKI, live). {sun.activity > 1 ? 'Expect stronger storms.' : sun.activity < 1 ? 'Storms will be a bit weaker.' : ''}</>
          )}
          {sun.status === 'offline' && `Could not reach NASA for today's Sun. ${hasDonki ? 'Playing with archived NASA storms.' : 'Storms are normal strength.'}`}
        </p>
      </motion.div>
      {panel?.type === 'data' && <DataPanel />}
    </div>
  );
}
