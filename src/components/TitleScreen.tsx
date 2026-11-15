import { motion } from 'motion/react';
import { GraduationCap, Rocket, Satellite } from 'lucide-react';
import { hasDonki } from '../data/records';
import { MISSION_SOLS } from '../engine/constants';
import { useGame } from '../store/game';
import { Astronaut, Marv } from './art';
import { HAPPY } from './crewLook';
import { DataPanel } from './Panels';
import { Term } from './Term';

const CREW = [{ skin: '#9a6240', suit: '#ffd23f' }, { skin: '#f3cfa6', suit: '#ff8fb1' }, { skin: '#6a432c', suit: '#5ee6a0' }, { skin: '#cf9668', suit: '#4fd8ff' }];

export function TitleScreen() {
  const { start, sun, difficulty, setDifficulty, open, panel } = useGame();
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
          {CREW.map((who, i) => (
            <motion.span key={i} animate={{ y: [0, -6, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 }}><Astronaut who={who} look={HAPPY} size={46} /></motion.span>
          ))}
          <Marv mood="happy" size={70} />
        </div>
        <h1 className="logo">Sol Survivor</h1>
        <p className="title-lede">
          Land on Mars with two astronauts and build a base. Cargo landers bring more crew and new modules.
          Keep everyone alive for {MISSION_SOLS} <Term k="sol">sols</Term>.
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
          <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }} onClick={() => start()}><Rocket /> Play</motion.button>
          <motion.button className="btn btn-nasa" whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'data' })}><Satellite /> Science Log</motion.button>
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
