import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { placeVerb, useDrag } from '../lib/crewDrag';
import { useGame } from '../store/game';
import { Astronaut } from './art';
import { lookOf } from './crewLook';

/**
 * The astronaut you are carrying. They hang from your finger by the helmet, swing as you
 * move, kick their legs and say something. A label says what they would do where they are.
 * After a bad drop they fly back home and shake their head.
 */
export function CrewGhost() {
  const { id, x, y, vx, over, ok, line, back, ground } = useDrag();
  const game = useGame((s) => s.game);
  const c = game?.crew.find((m) => m.id === id);
  // Swing like a pendulum: lean against the way you are moving.
  const swing = Math.max(-38, Math.min(38, -vx * 22));
  const verb = c && over ? placeVerb(c.id, over, game) : null;
  const label = !c ? '' : verb ? `${verb}!` : over ? 'Not there!' : 'Drop anywhere: a place, or open ground';
  // Over open ground: a flag shows the spot on the ground they would walk to.
  const groundY = ground !== null ? (document.querySelector('.scene .dirt') as HTMLElement | null)?.getBoundingClientRect().top ?? null : null;
  return (
    <>
      {c && (
        <div className={`ghost ${over ? (ok ? 'ok' : 'no') : ''}`} style={{ left: x, top: y }} aria-hidden="true">
          <i className="ghost-grip" />
          <motion.div className="ghost-hang" animate={{ rotate: swing }} transition={{ type: 'spring', stiffness: 160, damping: 7, mass: 0.9 }}>
            <motion.span className="ghost-body" initial={{ scale: 0.6, y: 18 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
              <Astronaut who={c} look={lookOf(c)} size={52} act="jump" />
            </motion.span>
          </motion.div>
          {line && <motion.span key={line} className="ghost-say" initial={{ scale: 0, y: 8 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 16 }}>{line}</motion.span>}
          <motion.span key={label} className="ghost-label" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }}>{label}</motion.span>
        </div>
      )}
      {c && ground !== null && groundY !== null && (
        <span className="ground-mark" style={{ left: ground, top: groundY }} aria-hidden="true">
          <i className="ground-ring" /><i className="ground-pole" /><i className="ground-flag" />
        </span>
      )}
      <AnimatePresence>{back && <BounceBack key={back.at} />}</AnimatePresence>
    </>
  );
}

/** A bad drop: the astronaut sails back to where they were, lands, and shakes their head. */
function BounceBack() {
  const back = useDrag((d) => d.back);
  const game = useGame((s) => s.game);
  const c = game?.crew.find((m) => m.id === back?.id);
  const [to, setTo] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!back) return;
    const el = document.querySelector(`[data-crew="${back.id}"]`) as HTMLElement | null;
    const r = el?.getBoundingClientRect();
    setTo(r ? { x: r.left + r.width / 2, y: r.top + 10 } : { x: back.x, y: back.y });
    const done = setTimeout(() => useDrag.setState({ back: null }), 900);
    return () => clearTimeout(done);
  }, [back]);
  if (!back || !c || !to) return null;
  const midY = Math.min(back.y, to.y) - 90;
  return (
    <motion.div className="ghost back" aria-hidden="true" style={{ left: 0, top: 0 }}
      initial={{ x: back.x, y: back.y }} animate={{ x: [back.x, (back.x + to.x) / 2, to.x], y: [back.y, midY, to.y] }}
      exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
      <motion.span className="ghost-body" animate={{ rotate: [0, -16, 16, -12, 12, 0] }} transition={{ delay: 0.45, duration: 0.45 }}>
        <Astronaut who={c} look={lookOf(c)} size={52} act="idle" />
      </motion.span>
    </motion.div>
  );
}
