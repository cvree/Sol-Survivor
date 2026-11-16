import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Flag, Pickaxe } from 'lucide-react';
import type { GameState, Trip } from '../engine/types';
import { useCamera } from '../lib/camera';
import { tapPlace, useDrag, useHolding } from '../lib/crewDrag';
import { DropZone, LandPuff } from './Walk';
import { placeVerb } from '../lib/crewDrag';
import { useGame } from '../store/game';
import { INK } from './art';

/** Rock piles out in the crater. Tap one (or drag an astronaut onto it) to dig regolith bricks. */
export function Deposits({ game }: { game: GameState }) {
  const W = useCamera((s) => s.W);
  const dig = useGame((s) => s.dig);
  const hovered = useDrag((d) => (d.id ? d.over : null));
  const holding = useHolding();
  const busy = (id: string) => [...game.crew.map((c) => c.trip), game.rover?.trip].some((t) => t && t.job.kind === 'mine' && t.job.dep === id && t.phase !== 'back');
  return (
    <>
      {game.deposits.map((d) => {
        const empty = d.left <= 0;
        const style: CSSProperties = { left: d.x * W - 55, top: 'calc(var(--ground) - 50px)' };
        const full = d.left / d.size;
        const art = (
          <svg viewBox="0 0 110 60" aria-hidden="true">
            {empty ? (
              <path d="M8 58c10-8 30-10 50-8s34 2 44 8z" fill="#7a2b22" stroke={INK} strokeWidth="3" />
            ) : (
              <>
                <path d={`M6 58L${20 - full * 4} ${30 - full * 14}L${44} ${22 - full * 14}L${70} ${26 - full * 16}L${92} ${34 - full * 10}L104 58Z`} fill="#b5532d" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
                <path d="M30 40l10-8M58 34l12 6M80 44l8-6" stroke="#8a3520" strokeWidth="4" strokeLinecap="round" />
                <rect x="44" y="44" width="14" height="9" rx="2" fill="#e07a3f" stroke={INK} strokeWidth="2" />
                <rect x="60" y="46" width="14" height="9" rx="2" fill="#e07a3f" stroke={INK} strokeWidth="2" />
              </>
            )}
          </svg>
        );
        if (empty) return <div key={d.id} className="deposit empty" style={style} aria-hidden="true">{art}</div>;
        return (
          <motion.button key={d.id} className={`deposit ${hovered === `dep:${d.id}` ? 'drop-ok' : ''} ${busy(d.id) ? 'busy' : ''} ${holding ? (placeVerb(holding, `dep:${d.id}`, game) ? 'drop-can' : 'drop-dim') : ''}`} style={style} data-mod={`dep:${d.id}`}
            onClick={() => { if (!tapPlace(`dep:${d.id}`)) dig(d.id); }} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
            aria-label={`Rock pile with about ${Math.round(d.left)} bricks of regolith. Press to send someone to dig.`}>
            {art}
            <span className="dep-tag"><Pickaxe /> {Math.round(d.left)}</span>
            <DropZone id={`dep:${d.id}`} game={game} />
            <LandPuff id={`dep:${d.id}`} />
          </motion.button>
        );
      })}
    </>
  );
}

/** What someone out in the crater is doing, in a few words. */
export function tripWords(t: Trip): string {
  if (t.phase === 'back') return t.then ? 'Coming back for a new job' : 'Walking home';
  if (t.phase === 'out') return t.job.kind === 'find' ? `Off to explore: ${t.job.title}` : t.job.kind === 'mine' ? 'Off to a rock pile' : 'Walking out to explore';
  return t.job.kind === 'find' ? 'Investigating' : t.job.kind === 'mine' ? 'Digging bricks' : 'Looking around';
}

/**
 * A flag where each trip is headed. The astronauts and the rover themselves (and the dashed
 * trail behind them) are drawn by `CrewLayer` from their one real position.
 */
export function TripFlags({ game }: { game: GameState }) {
  const W = useCamera((c) => c.W);
  const trips = [...game.crew.filter((c) => !c.out && c.trip).map((c) => ({ id: c.id, t: c.trip! })), ...(game.rover?.trip ? [{ id: 'rover', t: game.rover.trip }] : [])];
  return (
    <>
      {trips.filter(({ t }) => t.phase !== 'back').map(({ id, t }) => (
        <span key={`flag-${id}`} className={`trip-flag ${t.phase === 'work' ? 'there' : ''}`} style={{ left: t.x * W - 4 }} aria-hidden="true"><Flag /></span>
      ))}
    </>
  );
}
