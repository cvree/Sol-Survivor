import { recordById } from '../data/records';
import { CAREER_LIMIT, MISSION_SOLS } from '../engine/constants';
import type { Cause, GameState } from '../engine/types';
import { maxHealth, triage } from '../engine/vitals';
import { useGame } from '../store/game';
import { EVENT_TITLE } from './Alerts';
import { Face } from './art';

const WHY: Record<Cause, { lost: string; tip: string }> = {
  air: {
    lost: 'The life-support reserve ran dry, and the crew had no air.',
    tip: 'Watch the Life support arrow. If it points down for long, switch the Oxygen Maker or Greenhouse back on before the tank is empty.',
  },
  cold: {
    lost: 'The outpost got too cold for too long.',
    tip: 'The Heater only needs 1 power. Body heat comes back slowly, so it is cheaper to stay warm than to warm up.',
  },
  radiation: {
    lost: 'Too much storm radiation got through.',
    tip: 'Build the Storm Shield early and switch it on as soon as a warning appears. Radiation damage never heals.',
  },
};

export function Debrief({ game }: { game: GameState }) {
  const { start, quit, open } = useGame();
  const won = game.status === 'won';
  const sols = Math.min(MISSION_SOLS, Math.floor(game.time) - (won ? 1 : 0));
  const storms = game.events.filter((e) => e.kind !== 'dust' && e.phase !== 'pending' && e.doseUnshielded > 0);
  const blocked = storms.length ? Math.round(100 * (1 - storms.reduce((n, e) => n + e.doseTaken, 0) / storms.reduce((n, e) => n + e.doseUnshielded, 0))) : null;
  const avgDose = game.crew.reduce((n, c) => n + c.dose, 0) / game.crew.length;
  const worst = (['air', 'cold', 'radiation'] as Cause[])
    .map((k) => ({ k, n: game.crew.reduce((sum, c) => sum + c.hurtBy[k], 0) }))
    .sort((a, b) => b.n - a.n)[0];
  const stars = !won ? 0 : 1 + (game.crew.every((c) => triage(c) === 'green') ? 1 : 0) + (avgDose < 110 ? 1 : 0);
  const cause = game.lostCause ?? worst.k;

  return (
    <div className="debrief-wrap">
      <div className={`debrief ${won ? 'won' : 'lost'}`}>
        <p className="debrief-kicker">Mission debrief</p>
        <h1>{won ? 'All four came home.' : `The mission ended on Sol ${sols}.`}</h1>
        {won ? (
          <p className="lede">
            You kept the outpost alive for {MISSION_SOLS} sols. <span className="stars" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
          </p>
        ) : (
          <p className="lede">{WHY[cause].lost} The crew is safe on the return ship, and every commander fails a few times first.</p>
        )}

        <div className="debrief-grid">
          <section>
            <h2>What happened</h2>
            <ul className="plain">
              <li>Sols survived: <b>{sols} of {MISSION_SOLS}</b></li>
              {blocked !== null && <li>Storm radiation your shield blocked: <b>{blocked}%</b></li>}
              <li>Time with no air in the tank: <b>{game.stats.airOutSols.toFixed(1)} sols</b></li>
              <li>Time with the heater off: <b>{game.stats.coldSols.toFixed(1)} sols</b></li>
              <li>Brownouts: <b>{game.stats.brownouts}</b></li>
              {worst.n > 1 && <li>What hurt the crew most: <b>{worst.k === 'air' ? 'thin air' : worst.k === 'cold' ? 'the cold' : 'radiation'}</b></li>}
            </ul>
            <h2>{won ? 'To do even better' : 'Try this next time'}</h2>
            <p>{WHY[won ? worst.k : cause].tip}</p>
            {won && stars < 3 && <p>Three stars need every crew member in the green and an average dose under 110 mSv.</p>}
          </section>

          <section>
            <h2>Your crew</h2>
            <ul className="debrief-crew">
              {game.crew.map((c) => (
                <li key={c.id}>
                  <Face id={c.id} triage={triage(c)} blueLips={false} flushed={false} fainted={c.out} shiver={false} />
                  <span>
                    <b>{c.name}</b> health {Math.round(c.health)} of {Math.round(maxHealth(c.dose, CAREER_LIMIT))}
                    <small>{Math.round(c.dose)} mSv soaked up, for good</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>The real events you faced</h2>
            <ul className="debrief-events">
              {game.events.filter((e) => e.phase !== 'pending').map((e) => {
                const r = recordById(e.recordId);
                return (
                  <li key={e.id}>
                    <button className="linklike" onClick={() => open({ type: 'data', recordId: e.recordId })}>
                      {EVENT_TITLE[e.kind]}: {r?.title ?? 'record'} ({r?.date})
                    </button>
                    {e.kind !== 'dust' && e.doseUnshielded > 0 && <small>Shield blocked {Math.round(100 * (1 - e.doseTaken / e.doseUnshielded))}%</small>}
                  </li>
                );
              })}
            </ul>
            <p className="aside">Every mission picks different real storms, in a different order.</p>
          </section>
        </div>

        <div className="modal-actions">
          <button className="btn btn-go" onClick={start} autoFocus>Fly a new mission</button>
          <button className="btn btn-nasa" onClick={() => open({ type: 'data' })}>NASA data</button>
          <button className="btn btn-quiet" onClick={quit}>Main menu</button>
        </div>
      </div>
    </div>
  );
}
