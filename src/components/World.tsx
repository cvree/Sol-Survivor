import { useEffect, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Flag, Package, Pickaxe } from 'lucide-react';
import type { CrewState, GameState, Trip } from '../engine/types';
import { follow, followTo, useCamera, useFollow } from '../lib/camera';
import { startCrewDrag, tapCrew, tapPlace, useDrag, useHolding, wasDragged } from '../lib/crewDrag';
import { DropZone, LandPuff } from './Walk';
import { placeVerb } from '../lib/crewDrag';
import { useGame } from '../store/game';
import { Astronaut, INK, Rover } from './art';
import { lookOf } from './crewLook';

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

/** Where a trip is right now, in world pixels: walking out, working, or walking home. */
export function tripX(t: Trip, home: number, W: number) {
  const target = t.x * W;
  const start = (t.from ?? 0.5) * W;
  const k = t.total > 0 ? 1 - Math.max(0, t.left) / t.total : 1;
  if (t.phase === 'out') return { x: start + (target - start) * k, dir: Math.sign(target - start) };
  if (t.phase === 'work') return { x: target, dir: 0 };
  return { x: target + (home - target) * k, dir: Math.sign(home - target) };
}

/** What someone out in the crater is doing, in a few words. */
export function tripWords(t: Trip): string {
  if (t.phase === 'back') return t.then ? 'Coming back for a new job' : 'Walking home';
  if (t.phase === 'out') return t.job.kind === 'find' ? `Off to explore: ${t.job.title}` : t.job.kind === 'mine' ? 'Off to a rock pile' : 'Walking out to explore';
  return t.job.kind === 'find' ? 'Investigating' : t.job.kind === 'mine' ? 'Digging bricks' : 'Looking around';
}

/** Astronauts and the rover out in the crater. Every job outside is a real walk, and you can watch it. */
export function Walkers({ game }: { game: GameState }) {
  const { W, vw } = useCamera();
  const carried = useDrag((d) => d.id);
  const followId = useFollow((f) => f.id);
  const home = (W - vw) / 2 + vw * 0.5;
  const out = game.crew.filter((c) => c.trip && !c.out) as (CrewState & { trip: Trip })[];
  const rover = game.rover?.trip;
  // The camera walks along with whoever it is following, and lets go when they are home.
  useEffect(() => {
    if (!followId) return;
    const t = followId === 'rover' ? game.rover?.trip : game.crew.find((c) => c.id === followId && !c.out)?.trip;
    if (!t) { follow(null); return; }
    followTo(tripX(t, home, W).x);
  });
  const trail = (t: Trip, key: string) => {
    const { x } = tripX(t, home, W);
    const to = t.phase === 'back' ? home : t.x * W;
    const left = Math.min(x, to);
    return (
      <div key={key} aria-hidden="true">
        {Math.abs(to - x) > 6 && <i className={`trip-path ${t.phase}`} style={{ left, width: Math.abs(to - x) }} />}
        {t.phase !== 'back' && <span className={`trip-flag ${t.phase === 'work' ? 'there' : ''}`} style={{ left: t.x * W - 4 }}><Flag /></span>}
      </div>
    );
  };
  return (
    <>
      {out.map((c) => trail(c.trip, `trail-${c.id}`))}
      {rover && trail(rover, 'trail-rover')}
      {out.map((c, i) => {
        const { x, dir } = tripX(c.trip, home, W);
        const act = c.exhausted ? 'collapse' : c.trip.phase === 'work' ? (c.trip.job.kind === 'mine' ? 'wrench' : c.trip.job.kind === 'go' ? 'wave' : 'check') : 'idle';
        return (
          <button key={c.id} data-crew={c.id} className={`walker no-drag ${c.trip.phase} ${c.exhausted ? 'down' : ''} ${carried === c.id ? 'carried' : ''} ${followId === c.id ? 'followed' : ''}`}
            style={{ left: x - 22 + i * 6, top: 'calc(var(--ground) - 58px)' }}
            onPointerDown={(e) => startCrewDrag(e, c.id)} onClick={(e) => { e.stopPropagation(); if (!wasDragged()) tapCrew(c.id); }}
            aria-label={`${c.name} is out in the crater: ${tripWords(c.trip)}. Drag them somewhere new, or tap to pick them.`}>
            <span className={dir < 0 ? 'face-left' : ''}><span className={c.trip.phase !== 'work' && !c.exhausted ? 'waddle' : ''}><Astronaut who={c} look={lookOf(c)} size={36} act={act} /></span></span>
            {c.trip.carry > 0 && <span className="carry"><Package /> {c.trip.carry}</span>}
            <span className="walker-name">{c.name}</span>
          </button>
        );
      })}
      {rover && (() => {
        const { x, dir } = tripX(rover, home, W);
        return (
          <div className={`walker rover-walker ${rover.phase}`} style={{ left: x - 40, top: 'calc(var(--ground) - 46px)' }} aria-label="The rover is out in the crater.">
            <span className={dir < 0 ? 'face-left' : ''}><Rover size={80} /></span>
            {rover.carry > 0 && <span className="carry"><Package /> {rover.carry}</span>}
          </div>
        );
      })()}
    </>
  );
}
