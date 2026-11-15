import { motion } from 'motion/react';
import { Rocket, Satellite, Star } from 'lucide-react';
import { recordById } from '../data/records';
import { CAREER_LIMIT, DOME_COVERS, MISSION_SOLS } from '../engine/constants';
import { MODULE_NAME } from '../engine/engine';
import type { Cause, GameState } from '../engine/types';
import { maxHealth, triage } from '../engine/vitals';
import { useGame } from '../store/game';
import { Astronaut, Marv } from './art';
import { lookOf } from './crewLook';
import { EVENT_TITLE } from './Panels';

/** Ties the ending back to how the base was grown, the way a real mission review would. */
function lesson(game: GameState, cause: Cause, won: boolean): string {
  const domes = game.modules.filter((m) => m.kind === 'dome').length;
  const crew = game.crew.length;
  if (cause === 'radiation') {
    if (!domes) return won
      ? 'You never built a Shield Dome, and the crew paid for it in radiation. They made it, but only just.'
      : 'The base grew, but it never got a Shield Dome. When the Sun stormed, nothing stood between the radiation and your crew.';
    if (domes * DOME_COVERS < crew) return `Your crew grew to ${crew}, but one Shield Dome only covers ${DOME_COVERS}. Shielding has to grow with the base.`;
    return 'You had the domes, but they were not on in time. Switch them on the moment a warning appears.';
  }
  if (cause === 'air') return `Life support could not keep up with ${crew} astronauts. More crew need more Oxygen Makers and Hydroponics, with people working inside.`;
  return 'The Hab was off for too long. It only needs 1 power, and bodies warm up slowly.';
}

export function Debrief({ game }: { game: GameState }) {
  const { start, quit, open } = useGame();
  const won = game.status === 'won';
  const sols = Math.min(MISSION_SOLS, Math.floor(game.time) - (won ? 1 : 0));
  const storms = game.events.filter((e) => e.kind !== 'dust' && e.phase !== 'pending' && e.doseUnshielded > 0);
  const blocked = storms.length ? Math.round(100 * (1 - storms.reduce((n, e) => n + e.doseTaken, 0) / storms.reduce((n, e) => n + e.doseUnshielded, 0))) : null;
  const worst = (['air', 'cold', 'radiation'] as Cause[])
    .map((k) => ({ k, n: game.crew.reduce((sum, c) => sum + c.hurtBy[k], 0) }))
    .sort((a, b) => b.n - a.n)[0];
  const stars = !won ? 0 : 1 + (game.crew.every((c) => triage(c) === 'green') ? 1 : 0) + (game.modules.length >= 11 ? 1 : 0);
  const cause = game.lostCause ?? worst.k;
  const kinds = [...new Set(game.modules.map((m) => m.kind))].map((k) => MODULE_NAME[k]).join(', ');

  return (
    <div className="debrief-wrap">
      <motion.div className={`debrief ${won ? 'won' : 'lost'}`} initial={{ scale: 0.85, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 20 }}>
        <div className="debrief-top">
          <Marv mood={won ? 'party' : 'worried'} size={96} />
          <div>
            <p className="debrief-kicker">Mission debrief</p>
            <h1>{won ? 'You built a home on Mars!' : `Mission ended on Sol ${sols}`}</h1>
            {won && (
              <p className="stars" aria-label={`${stars} of 3 stars`}>
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.4 + i * 0.2 }}>
                    <Star className={i < stars ? 'lit' : ''} />
                  </motion.span>
                ))}
              </p>
            )}
          </div>
        </div>

        <p className="lesson">{won && worst.n < 20 ? `${game.crew.length} astronauts, ${game.modules.length} modules, ${MISSION_SOLS} sols. Every trade-off you made kept them alive.` : lesson(game, won ? worst.k : cause, won)}</p>
        <p className="aside">
          {won ? '' : 'The crew is safe on the return ship. '}Real mission planners face the same puzzle: every new astronaut and every new module needs more power, air and shielding.
          {won && stars < 3 ? ' Three stars need every astronaut in the green and a base of 11 modules or more.' : ''}
        </p>

        <div className="debrief-grid">
          <section>
            <h2>Your base</h2>
            <ul className="plain mono-list">
              <li><span>Sols survived</span><b>{sols}/{MISSION_SOLS}</b></li>
              <li><span>Crew</span><b>{game.crew.length}</b></li>
              <li><span>Modules</span><b>{game.modules.length}</b></li>
              <li><span>Cargo landers</span><b>{game.landers}</b></li>
              {blocked !== null && <li><span>Storm radiation blocked</span><b>{blocked}%</b></li>}
              <li><span>Time with no air</span><b>{game.stats.airOutSols.toFixed(1)} sols</b></li>
              <li><span>Time with no heat</span><b>{game.stats.coldSols.toFixed(1)} sols</b></li>
            </ul>
            <p className="aside built">Built: {kinds}</p>
          </section>
          <section>
            <h2>Your crew</h2>
            <ul className="debrief-crew">
              {game.crew.map((c) => (
                <li key={c.id}>
                  <Astronaut who={c} look={lookOf(c)} bust size={36} />
                  <span><b>{c.name}</b> health {Math.round(c.health)}/{Math.round(maxHealth(c.dose, CAREER_LIMIT))}<small>{Math.round(c.dose)} mSv, {Math.max(0, Math.floor(game.time - c.arrived))} sols on Mars</small></span>
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
                    <button className="linklike" onClick={() => open({ type: 'data', recordId: e.recordId })}>{EVENT_TITLE[e.kind]}, {r?.date}</button>
                    {e.kind !== 'dust' && e.doseUnshielded > 0 && <small>Blocked {Math.round(100 * (1 - e.doseTaken / e.doseUnshielded))}%</small>}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="modal-actions">
          <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} onClick={() => start(false)} autoFocus><Rocket /> Land a new mission</motion.button>
          <motion.button className="btn btn-nasa" whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'data' })}><Satellite /> Science Log</motion.button>
          <button className="btn btn-ghost" onClick={quit}>Main menu</button>
        </div>
      </motion.div>
    </div>
  );
}
