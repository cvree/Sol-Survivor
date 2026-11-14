import { hasDonki } from '../data/records';
import { MISSION_SOLS } from '../engine/constants';
import { useGame } from '../store/game';
import { DataPanel } from './Panels';
import { Term } from './Term';

export function TitleScreen() {
  const { start, sun, difficulty, setDifficulty, open, panel } = useGame();
  return (
    <div className="title">
      <div className="title-sky" aria-hidden="true">
        <div className="sun" />
        <div className="hills" />
      </div>
      <div className="title-card">
        <h1 className="logo">Sol Survivor</h1>
        <p className="title-lede">
          You are the commander of a Mars outpost. Keep four astronauts alive for {MISSION_SOLS} <Term k="sol">sols</Term>.
          There is never enough power for everything.
        </p>

        <ol className="how">
          <li><b>Click a room</b> to switch it on or off. Every room needs power.</li>
          <li><b>Watch your crew.</b> Their oxygen, heartbeat and temperature tell you what they need.</li>
          <li><b>Storms are real.</b> Each one comes from NASA's records of the Sun and Mars.</li>
        </ol>

        <fieldset className="levels">
          <legend>Pick your mission</legend>
          <label className={difficulty === 'cadet' ? 'picked' : ''}>
            <input type="radio" name="level" checked={difficulty === 'cadet'} onChange={() => setDifficulty('cadet')} />
            <b>Cadet</b><span>Gentler storms and more warning. Best for a first mission.</span>
          </label>
          <label className={difficulty === 'commander' ? 'picked' : ''}>
            <input type="radio" name="level" checked={difficulty === 'commander'} onChange={() => setDifficulty('commander')} />
            <b>Commander</b><span>Storms at full strength. Even experts lose crew health.</span>
          </label>
        </fieldset>

        <div className="title-actions">
          <button className="btn btn-go btn-big" onClick={start}>Start mission</button>
          <button className="btn btn-nasa" onClick={() => open({ type: 'data' })}>See the NASA data</button>
        </div>

        <p className="sun-report" aria-live="polite">
          <span className={`dot dot-${sun.status}`} aria-hidden="true" />
          {sun.status === 'loading' && 'Asking NASA what the real Sun is doing...'}
          {sun.status === 'live' && (
            <>The real Sun right now is <b>{sun.level}</b>: {sun.mFlares} M-class and {sun.xFlares} X-class flares in the last 30 days (NASA DONKI, live). {sun.activity > 1 ? 'Expect stronger storms.' : sun.activity < 1 ? 'Storms will be a bit weaker.' : ''}</>
          )}
          {sun.status === 'offline' && `Could not reach NASA for today's Sun. ${hasDonki ? 'Playing with archived NASA storms.' : ''}`}
        </p>
      </div>
      {panel?.type === 'data' && <DataPanel />}
    </div>
  );
}
