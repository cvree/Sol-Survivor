import { CAREER_LIMIT, HYPOTHERMIA_TEMP } from '../engine/constants';
import { isOn } from '../engine/engine';
import type { CrewState, GameState } from '../engine/types';
import { TRIAGE_LABEL, hypoxiaStage, isFainted, maxHealth, triage } from '../engine/vitals';
import { useGame } from '../store/game';
import { Face } from './art';
import { Term } from './Term';

function Ecg({ hr, flat }: { hr: number; flat: boolean }) {
  // One heartbeat drawn as a line. It scrolls faster when the heart beats faster.
  const beat = 'l6 0l3-9l4 16l3-10l3 3l11 0';
  return (
    <svg viewBox="0 0 90 24" className="ecg" aria-hidden="true">
      <g style={{ animationDuration: `${(60 / Math.max(30, hr)).toFixed(2)}s` }} className={flat ? '' : 'ecg-run'}>
        <path d={flat ? 'M0 14h150' : `M0 14${beat}${beat}${beat}${beat}${beat}`} />
      </g>
    </svg>
  );
}

function Card({ c, game }: { c: CrewState; game: GameState }) {
  const treat = useGame((s) => s.treat);
  const t = triage(c);
  const stage = hypoxiaStage(c.noAir);
  const cold = c.temp < HYPOTHERMIA_TEMP;
  const cap = maxHealth(c.dose, CAREER_LIMIT);
  const medOn = isOn(game, 'medbay');
  const inBed = medOn && game.patient === c.id;
  const fainted = isFainted(c);
  return (
    <article className={`crew-card triage-${t}`} aria-label={`${c.name}, ${c.role}. ${TRIAGE_LABEL[t]}.`}>
      {c.say && <div className={`bubble-say ${c.say.mood}`} role="status">{c.say.text}</div>}
      <div className="crew-top">
        <Face id={c.id} triage={t} blueLips={stage >= 2} flushed={c.sick > 0.25} fainted={fainted} shiver={cold} />
        <div className="crew-id">
          <div className="crew-name">{c.name}</div>
          <div className="crew-role">{c.role}{inBed ? ', in Med Bay' : fainted ? ', fainted' : ''}</div>
        </div>
        <span className={`chip chip-${t}`}>{TRIAGE_LABEL[t]}</span>
      </div>

      <div className="vitals">
        <div className={`vital ${c.spo2 < 94 ? (c.spo2 < 86 ? 'bad' : 'warn') : ''}`}>
          <span className="vital-label"><Term k="spo2">Oxygen</Term></span>
          <span className="vital-num">{Math.round(c.spo2)}<small>%</small></span>
        </div>
        <div className={`vital ${c.hr > 105 || c.hr < 52 ? 'warn' : ''}`}>
          <span className="vital-label"><Term k="bpm">Heart</Term></span>
          <span className="vital-num">{Math.round(c.hr)}<small> bpm</small></span>
          <Ecg hr={c.hr} flat={c.out} />
        </div>
        <div className={`vital ${cold ? (c.temp < 93 ? 'bad' : 'warn') : ''}`}>
          <span className="vital-label">Body temp</span>
          <span className="vital-num">{c.temp.toFixed(1)}<small>°F</small></span>
        </div>
      </div>

      <div className="crew-foot">
        <div className="health" role="img" aria-label={`Health ${Math.round(c.health)} out of 100. Radiation has permanently removed ${Math.round(100 - cap)}.`}>
          <span className="health-fill" style={{ width: `${c.health}%` }} />
          <span className="health-lost" style={{ width: `${100 - cap}%` }} />
        </div>
        <span className="dose"><Term k="radiation">Radiation</Term> <b>{Math.round(c.dose)}</b> <Term k="msv">mSv</Term></span>
        {medOn && (
          <button className="btn btn-small" onClick={() => treat(inBed ? null : c.id)} aria-pressed={inBed}>
            {inBed ? 'Leave bed' : 'To Med Bay'}
          </button>
        )}
      </div>
    </article>
  );
}

export function Crew({ game }: { game: GameState }) {
  const recent = game.log.slice(-3).reverse();
  return (
    <aside className="crew">
      <h2 className="side-title">Crew vitals</h2>
      <div className="crew-list">{game.crew.map((c) => <Card key={c.id} c={c} game={game} />)}</div>
      <h2 className="side-title">Mission log</h2>
      <ol className="log" aria-live="polite">
        {recent.map((l, i) => (
          <li key={`${l.t}-${i}`} className={`log-${l.tone}`}><span>Sol {Math.floor(l.t)}</span>{l.text}</li>
        ))}
      </ol>
    </aside>
  );
}
