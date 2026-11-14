import { motion } from 'motion/react';
import { Rocket, Satellite, Star } from 'lucide-react';
import { recordById } from '../data/records';
import { CAREER_LIMIT, MISSION_SOLS } from '../engine/constants';
import type { Cause, GameState } from '../engine/types';
import { maxHealth, triage } from '../engine/vitals';
import { useGame } from '../store/game';
import { Astronaut, Marv } from './art';
import { lookOf } from './crewLook';
import { EVENT_TITLE } from './Panels';

/** Ties the ending back to what was packed, the way a real mission review would. */
function lesson(game: GameState, cause: Cause, won: boolean): string {
  const l = game.loadout;
  if (cause === 'radiation') {
    if (!l.shield) return won
      ? 'You left the Storm Shield on Earth, and the crew paid for it in radiation. They made it, but only just.'
      : 'You left the Storm Shield on Earth. When the Sun stormed, nothing stood between the radiation and your crew.';
    if (!l.solar && !l.battery) return 'You packed the Storm Shield but no extra power, so raising it meant switching nearly everything else off.';
    return 'You had a Storm Shield, but it was not up in time. Switch it on the moment a warning appears.';
  }
  if (cause === 'air') {
    return l.tank === 0
      ? 'You packed no spare Oxygen Tanks, so there was no cushion when the Oxygen Maker had to go off.'
      : 'Life support ran dry. The Oxygen Maker and Greenhouse were off for too long.';
  }
  return 'The Heater was off for too long. It only needs 1 power, and bodies warm up slowly.';
}

export function Debrief({ game }: { game: GameState }) {
  const { goPack, quit, open } = useGame();
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
  const packed = [
    game.loadout.shield && 'Storm Shield', game.loadout.medbay && 'Med Bay', game.loadout.solar && 'Extra Solar Array',
    game.loadout.battery && `${game.loadout.battery} Battery`, game.loadout.tank && `${game.loadout.tank} Oxygen Tank`, game.loadout.lab && 'Science Lab',
  ].filter(Boolean).join(', ') || 'nothing extra';

  return (
    <div className="debrief-wrap">
      <motion.div className={`debrief ${won ? 'won' : 'lost'}`} initial={{ scale: 0.85, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 20 }}>
        <div className="debrief-top">
          <Marv mood={won ? 'party' : 'worried'} size={96} />
          <div>
            <p className="debrief-kicker">Mission debrief</p>
            <h1>{won ? 'All four came home!' : `Mission ended on Sol ${sols}`}</h1>
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

        <p className="lesson">{lesson(game, won ? worst.k : cause, won)}</p>
        <p className="aside">
          {won ? '' : 'The crew is safe on the return ship. '}Real NASA engineers face the same puzzle: every kilogram on the rocket is a choice between safety, power and science.
        </p>

        <div className="debrief-grid">
          <section>
            <h2>Your mission</h2>
            <ul className="plain mono-list">
              <li><span>Sols survived</span><b>{sols}/{MISSION_SOLS}</b></li>
              <li><span>You packed</span><b className="wrap">{packed}</b></li>
              {blocked !== null && <li><span>Storm radiation blocked</span><b>{blocked}%</b></li>}
              <li><span>Time with no air</span><b>{game.stats.airOutSols.toFixed(1)} sols</b></li>
              <li><span>Time with no heat</span><b>{game.stats.coldSols.toFixed(1)} sols</b></li>
              {game.loadout.lab > 0 && <li><span>Science points</span><b>{Math.floor(game.science)}</b></li>}
            </ul>
          </section>
          <section>
            <h2>Your crew</h2>
            <ul className="debrief-crew">
              {game.crew.map((c) => (
                <li key={c.id}>
                  <Astronaut id={c.id} look={lookOf(c)} bust size={40} />
                  <span><b>{c.name}</b> health {Math.round(c.health)}/{Math.round(maxHealth(c.dose, CAREER_LIMIT))}<small>{Math.round(c.dose)} mSv, for good</small></span>
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
          <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} onClick={goPack} autoFocus><Rocket /> Pack a new lander</motion.button>
          <motion.button className="btn btn-nasa" whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'data' })}><Satellite /> NASA data</motion.button>
          <button className="btn btn-ghost" onClick={quit}>Main menu</button>
        </div>
      </motion.div>
    </div>
  );
}
