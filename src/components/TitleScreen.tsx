import { motion } from 'motion/react';
import { Brain, Compass, Rocket, Satellite, Trophy } from 'lucide-react';
import { DailyCheck } from './DailyCheck';
import { RecordsPanel } from './Records';
import { ALL_WORDS, loadDaily, loadLog } from '../lib/daily';
import { FINDS } from '../data/discoveries';
import { AlbumPanel } from './Album';
import { hasDonki } from '../data/records';
import { MISSION_SOLS } from '../engine/constants';
import { useGame } from '../store/game';
import { Astronaut, Marv } from './art';
import { HAPPY } from './crewLook';
import { DataPanel } from './Panels';
import { Term } from './Term';
import { SettingsButton } from './Settings';

const CREW = [{ skin: '#9a6240', suit: '#ffd23f' }, { skin: '#f3cfa6', suit: '#ff8fb1' }, { skin: '#6a432c', suit: '#5ee6a0' }, { skin: '#cf9668', suit: '#4fd8ff' }];

export function TitleScreen() {
  const { begin, sun, difficulty, setDifficulty, open, panel, album } = useGame();
  return (
    <div className="title">
      <div className="sky" aria-hidden="true">
        <div className="sky-band" />
        <div className="sun" />
        <div className="hills hills-far" />
        <div className="hills hills-near" />
      </div>
      <div className="title-ground" aria-hidden="true" />

      <SettingsButton className="title-gear" />
      <motion.div className="title-card" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
        <div className="title-crew" aria-hidden="true">
          {CREW.map((who, i) => (
            <motion.span key={i} animate={{ y: [0, -6, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 }}><Astronaut who={who} look={HAPPY} size={46} /></motion.span>
          ))}
          <Marv mood="happy" size={70} />
        </div>
        <h1 className="logo">Sol Survivor</h1>
        <p className="title-lede">
          Pick your commander and land on Mars with nothing but a capsule. Earn cargo landers, build every module by hand, choose your crew, and survive solar storms
          for {MISSION_SOLS} <Term k="sol">sols</Term>. Astronauts can really die, so look after them!
        </p>

        <fieldset className="levels">
          <legend>How tough is the Sun today?</legend>
          {([['easy', 'Easy', 'Slow days, fewer storms, lots of warning.'], ['normal', 'Normal', 'Quicker days, stronger storms.'], ['hard', 'Hard', 'Fast days, fierce storms. For experts.']] as const).map(([id, name, blurb]) => (
            <label key={id} className={difficulty === id ? 'picked' : ''}>
              <input type="radio" name="level" checked={difficulty === id} onChange={() => setDifficulty(id)} />
              <b>{name}</b><span>{blurb}</span>
            </label>
          ))}
        </fieldset>

        <div className="title-actions">
          <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }} onClick={() => begin()}><Rocket /> Play</motion.button>
          <motion.button className="btn btn-nasa" whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'data' })}><Satellite /> Science Log</motion.button>
          <motion.button className="btn btn-finds" whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'finds' })}><Compass /> Discoveries {album.length}/{FINDS.length}</motion.button>
          <motion.button className={`btn btn-daily ${loadDaily().done ? '' : 'fresh'}`} whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'daily' })}><Brain /> {loadDaily().done ? <>Word games <small className="btn-count">{loadLog().length}/{ALL_WORDS.length}</small></> : 'Daily Sol Check!'}</motion.button>
          <motion.button className="btn btn-records" whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'records' })}><Trophy /> Records</motion.button>
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
      {panel?.type === 'finds' && <AlbumPanel />}
      {panel?.type === 'daily' && <DailyCheck />}
      {panel?.type === 'records' && <RecordsPanel />}
    </div>
  );
}
