import { motion } from 'motion/react';
import { ArrowRight, Check, Rocket, RotateCcw, Satellite, Star } from 'lucide-react';
import { recordById } from '../data/records';
import { CAREER_LIMIT, DOME_COVERS, MISSION_SOLS } from '../engine/constants';
import { MODULE_NAME } from '../engine/engine';
import { GOALS, TIP_GOAL } from '../engine/goals';
import type { Cause, GameState } from '../engine/types';
import { maxHealth, triage } from '../engine/vitals';
import { useGame } from '../store/game';
import { Astronaut, INK, Marv } from './art';
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

/** What went well. Every mission has something, and a young commander should hear it first. */
function wins(game: GameState, sols: number, blocked: number | null): string[] {
  const out: string[] = [];
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  out.push(sols >= 10 ? `You kept a crew alive on Mars for ${sols} sols. That is real commander work.` : 'You landed on Mars, built a base and made choices under pressure.');
  if (game.stats.stormsBeaten > 0) out.push(`You beat ${n(game.stats.stormsBeaten, 'radiation storm', 'radiation storms')} with your shield.`);
  else if (blocked !== null && blocked >= 40) out.push(`Your shield blocked ${blocked}% of the storm radiation.`);
  if (game.stats.goals > 0) out.push(`You finished ${n(game.stats.goals, 'mini-mission', 'mini-missions')}.`);
  if (game.stats.patches > 0) out.push(`You jury-rigged ${n(game.stats.patches, 'fix', 'fixes')} with spare parts. The Apollo 13 crew would be proud.`);
  if (game.modules.length >= 6) out.push(`You grew the base to ${game.modules.length} modules.`);
  if (game.science >= 5) out.push(`Your lab sent ${Math.floor(game.science)} points of science back to Earth.`);
  if (game.stats.brownouts === 0 && sols >= 8) out.push('Not one brownout. You balanced the power yourself.');
  if (game.crew.length >= 4) out.push(`You led a crew of ${game.crew.length}.`);
  return out.slice(0, 4);
}

/** One or two things to try, said as a next step and never as a telling-off. */
function nextTime(game: GameState, cause: Cause, won: boolean): string[] {
  const out: string[] = [];
  if (game.stats.brownouts >= 2) out.push(`The power tripped ${game.stats.brownouts} times. Before a dust storm, switch something off yourself, so you choose what goes dark.`);
  const empty = game.modules.some((m) => (m.kind === 'oxygen' || m.kind === 'hydro') && !game.crew.some((c) => c.at === m.id));
  if (empty) out.push('A module with an astronaut inside makes twice as much. Try to keep the Oxygen Maker and Hydroponics staffed.');
  if (game.spareParts > 0 && !won) out.push(`You still had ${game.spareParts} spare ${game.spareParts === 1 ? 'part' : 'parts'}. A Patch can keep the air flowing for a whole sol.`);
  if (cause === 'radiation' && !game.modules.some((m) => m.kind === 'dome')) out.push('Pick the Shield Dome blueprint from the first lander that offers it.');
  if (won && !out.length) out.push('Ready for a tougher Sun? Try the next level up.');
  return out.slice(0, 2);
}

function MissionPatch({ won, stars }: { won: boolean; stars: number }) {
  return (
    <svg viewBox="0 0 120 120" width="104" height="104" aria-hidden="true" className="patch-badge">
      <circle cx="60" cy="60" r="56" fill={won ? '#1f4fd1' : '#46306f'} stroke={INK} strokeWidth="5" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="#f7f4ec" strokeWidth="2.5" strokeDasharray="2 6" strokeLinecap="round" />
      <circle cx="60" cy="72" r="28" fill="#c2512a" stroke={INK} strokeWidth="4" />
      <path d="M38 66c10-5 16 4 26 0s14-3 22 2M42 82c8-3 14 2 22 0" fill="none" stroke="#8f2f2a" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 18c9 7 12 18 12 28v10H48V46c0-10 3-21 12-28z" fill="#f7f4ec" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="60" cy="40" r="5" fill="#4fd8ff" stroke={INK} strokeWidth="3" />
      <path d="M48 52l-8 8h8zM72 52l8 8h-8z" fill="#ff9a4d" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => <path key={i} d="M0-7l2 5h5l-4 3l2 5l-5-3l-5 3l2-5l-4-3h5z" fill={i < stars ? '#ffd23f' : '#6b5b98'} stroke={INK} strokeWidth="1.5" transform={`translate(${22 + i * 38} ${i === 1 ? 16 : 30})`} />)}
    </svg>
  );
}

export function Debrief({ game }: { game: GameState }) {
  const { start, retry, quit, open } = useGame();
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
  const level = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }[game.difficulty];
  const practise = GOALS.find((g) => g.id === TIP_GOAL[cause]);
  const good = wins(game, sols, blocked);
  const tips = nextTime(game, cause, won);

  return (
    <div className="debrief-wrap">
      <motion.div className={`debrief ${won ? 'won' : 'lost'}`} initial={{ scale: 0.85, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 20 }}>
        <div className="debrief-top">
          <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.15 }}><MissionPatch won={won} stars={stars} /></motion.div>
          <div className="debrief-title">
            <p className="debrief-kicker">Mission Control to Gale Crater Base · Official debrief</p>
            <h1>{won ? 'Mission accomplished, Commander!' : `Mission report: you reached Sol ${sols}`}</h1>
            <p className="debrief-sub">Flight Director's review · {level} Sun · {sols} of {MISSION_SOLS} sols · {game.crew.length} crew</p>
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
          <Marv mood={won ? 'party' : 'happy'} size={70} />
        </div>

        <div className="lesson">
          <small>Flight Director's note</small>
          {won && (worst.n < 20 || stars === 3 || (worst.k === 'radiation' && (blocked ?? 0) >= 85)) ? `${game.crew.length} astronauts, ${game.modules.length} modules, ${MISSION_SOLS} sols. Every trade-off you made kept them alive. Outstanding work.` : lesson(game, won ? worst.k : cause, won)}
          {!won && ' Everyone is safe on the return ship, and every commander learns this way.'}
        </div>

        <div className="review">
          <section className="review-good">
            <h2>What went well</h2>
            <ul>{good.map((t, i) => <motion.li key={t} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 + i * 0.12 }}><Check /><span>{t}</span></motion.li>)}</ul>
          </section>
          <section className="review-next">
            <h2>Try this next mission</h2>
            <ul>
              {tips.map((t) => <li key={t}><ArrowRight /><span>{t}</span></li>)}
              {won && stars < 3 && <li><ArrowRight /><span>Three stars need every astronaut in the green and a base of 11 modules or more.</span></li>}
              {!won && practise && <li><ArrowRight /><span>Your first mini-mission will be practice: <b>{practise.text}</b>.</span></li>}
            </ul>
          </section>
        </div>

        <div className="debrief-grid">
          <section>
            <h2>Mission numbers</h2>
            <ul className="plain mono-list">
              <li><span>Sols survived</span><b>{sols}/{MISSION_SOLS}</b></li>
              <li><span>Modules built</span><b>{game.modules.length}</b></li>
              <li><span>Cargo landers</span><b>{game.landers}</b></li>
              <li><span>Mini-missions done</span><b>{game.stats.goals}</b></li>
              {blocked !== null && <li><span>Storm radiation blocked</span><b>{blocked}%</b></li>}
              <li><span>Patches used</span><b>{game.stats.patches}</b></li>
              <li><span>Time with no air</span><b>{game.stats.airOutSols.toFixed(1)} sols</b></li>
              <li><span>Time with no heat</span><b>{game.stats.coldSols.toFixed(1)} sols</b></li>
            </ul>
            <p className="aside built">Built: {kinds}</p>
          </section>
          <section>
            <h2>Crew report</h2>
            <ul className="debrief-crew">
              {game.crew.map((c) => (
                <li key={c.id}>
                  <Astronaut who={c} look={lookOf(c)} bust size={36} />
                  <span><b>{c.name}</b>, {c.role} · health {Math.round(c.health)}/{Math.round(maxHealth(c.dose, CAREER_LIMIT))}<small>{Math.round(c.dose)} mSv, {Math.max(0, Math.floor(game.time - c.arrived))} sols on Mars</small></span>
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
                    <button className="linklike" onClick={() => open({ type: 'data', recordId: e.recordId })}>{EVENT_TITLE[e.kind]}{e.recordId.startsWith('no-snapshot') ? ' (practice)' : `, ${r?.date}`}</button>
                    {e.kind !== 'dust' && e.doseUnshielded > 0 && <small>Blocked {Math.round(100 * (1 - e.doseTaken / e.doseUnshielded))}%</small>}
                  </li>
                );
              })}
              {!game.events.some((e) => e.phase !== 'pending') && <li><small>No storms reached the base this time.</small></li>}
            </ul>
          </section>
        </div>

        <div className="modal-actions">
          {won
            ? <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} onClick={() => start()} autoFocus><Rocket /> Fly a new mission</motion.button>
            : <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.04 }} onClick={() => retry()} autoFocus><RotateCcw /> Try again</motion.button>}
          <motion.button className="btn btn-nasa" whileTap={{ scale: 0.95 }} onClick={() => open({ type: 'data' })}><Satellite /> Science Log</motion.button>
          <button className="btn btn-ghost" onClick={quit}>Main menu</button>
          {!won && <span className="aside">Try again starts at once, with no intro.</span>}
        </div>
      </motion.div>
    </div>
  );
}
