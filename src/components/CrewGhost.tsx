import { motion } from 'motion/react';
import { placeVerb, useDrag } from '../lib/crewDrag';
import { useGame } from '../store/game';

/**
 * While carrying an astronaut: what they would do where they are, and what they said when picked
 * up, shown just above the finger. The astronaut themself is drawn by `CrewLayer` (one body, one
 * position), dangling below the finger. Over open ground, a flag marks where they would walk to.
 */
export function CrewGhost() {
  const { id, x, y, over, ok, line, ground } = useDrag();
  const game = useGame((s) => s.game);
  const c = game?.crew.find((m) => m.id === id);
  const verb = c && over ? placeVerb(c.id, over, game) : null;
  const label = !c ? '' : verb ? `${verb}!` : over ? 'Not there!' : 'Drop anywhere: a place, or open ground';
  // Over open ground: a flag shows the spot on the ground they would walk to.
  const groundY = ground !== null ? (document.querySelector('.scene .dirt') as HTMLElement | null)?.getBoundingClientRect().top ?? null : null;
  return (
    <>
      {c && (
        <div className={`ghost ${over ? (ok ? 'ok' : 'no') : ''}`} style={{ left: x, top: y }} aria-hidden="true">
          {line && <motion.span key={line} className="ghost-say" initial={{ scale: 0, y: 8 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 16 }}>{line}</motion.span>}
          <motion.span key={label} className="ghost-label" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }}>{label}</motion.span>
          <i className="ghost-grip" />
        </div>
      )}
      {c && ground !== null && groundY !== null && (
        <span className="ground-mark" style={{ left: ground, top: groundY }} aria-hidden="true">
          <i className="ground-ring" /><i className="ground-pole" /><i className="ground-flag" />
        </span>
      )}
    </>
  );
}
