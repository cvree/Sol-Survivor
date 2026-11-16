import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Home, X } from 'lucide-react';
import { tripPos } from '../engine/engine';
import type { GameState, Trip } from '../engine/types';
import { follow, glideTo, useCamera, useFollow } from '../lib/camera';
import { sfx } from '../lib/sound';
import { useGame } from '../store/game';
import { Astronaut, Rover } from './art';
import { lookOf } from './crewLook';
import { tripWords } from './World';

/** How far along this part of the trip is, 0 to 1. A "look around" trip has no end, so it shows full. */
function progress(t: Trip) {
  if (t.phase === 'work' && t.job.kind === 'go') return 1;
  return t.total > 0 ? Math.max(0, Math.min(1, 1 - t.left / t.total)) : 1;
}

/**
 * Everyone out in the crater, at a glance: what they are doing, how far along, and two buttons.
 * Follow sends the camera along with them. Call back turns them around, wherever they are.
 */
export function TripTracker({ game }: { game: GameState }) {
  const followId = useFollow((f) => f.id);
  const recall = useGame((s) => s.recall);
  const out = [
    ...game.crew.filter((c) => c.trip && !c.out).map((c) => ({ id: c.id, name: c.name, trip: c.trip!, face: <Astronaut who={c} look={lookOf(c)} bust size={30} /> })),
    ...(game.rover?.trip ? [{ id: 'rover', name: 'Rover', trip: game.rover.trip, face: <span className="trip-rover"><Rover size={38} /></span> }] : []),
  ];
  const watch = (id: string, t: Trip) => {
    sfx.ping();
    if (followId === id) { follow(null); return; }
    const { W, vw } = useCamera.getState();
    glideTo(tripPos(t) * W - vw / 2, 420);
    setTimeout(() => follow(id), 440);
  };
  return (
    <div className="trips" aria-label="Out in the crater">
      <AnimatePresence>
        {out.map(({ id, name, trip, face }) => (
          <motion.div key={id} className={`trip-chip ${trip.phase} ${followId === id ? 'followed' : ''}`} layout
            initial={{ x: 80, opacity: 0, scale: 0.8 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ x: 80, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}>
            <span className="trip-face">{face}</span>
            <span className="trip-text">
              <b>{name}</b>
              <small>{tripWords(trip)}</small>
              <span className="trip-bar"><motion.i animate={{ width: `${progress(trip) * 100}%` }} transition={{ duration: 0.2 }} /></span>
            </span>
            <motion.button className={`trip-btn ${followId === id ? 'on' : ''}`} whileTap={{ scale: 0.85 }} onClick={() => watch(id, trip)}
              aria-pressed={followId === id} aria-label={followId === id ? `Stop following ${name}` : `Follow ${name}`} title={followId === id ? 'Stop following' : 'Follow'}>
              {followId === id ? <EyeOff /> : <Eye />}
            </motion.button>
            {trip.phase !== 'back' && (
              <motion.button className="trip-btn back" whileTap={{ scale: 0.85 }} onClick={() => recall(id)} aria-label={`Call ${name} back to the base`} title="Call back">
                <Home />
              </motion.button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** A small "x" on a building site. One tap asks, a second tap packs it up (or stops an upgrade). */
export function CancelSite({ id, upgrading }: { id: string; upgrading: boolean }) {
  const cancel = useGame((s) => s.cancelSite);
  const [sure, setSure] = useState(false);
  useEffect(() => {
    if (!sure) return;
    const t = setTimeout(() => setSure(false), 2600);
    return () => clearTimeout(t);
  }, [sure]);
  return (
    <motion.button className={`cancel-site no-drag ${sure ? 'sure' : ''}`} layout whileTap={{ scale: 0.85 }}
      onClick={(e) => { e.stopPropagation(); if (sure) cancel(id); else { sfx.ping(); setSure(true); } }}
      aria-label={sure ? (upgrading ? 'Tap again to stop the upgrade and get your bricks back' : 'Tap again to pack up this site and keep the plan') : (upgrading ? 'Stop this upgrade' : 'Pack up this building site')}
      title={upgrading ? 'Stop upgrade' : 'Pack up site'}>
      <X />{sure && <span>{upgrading ? 'Stop? Bricks back' : 'Pack up? Plan back'}</span>}
    </motion.button>
  );
}
