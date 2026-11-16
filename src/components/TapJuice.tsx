import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Package, Sparkles } from 'lucide-react';
import { CURIOS, curioById, curiosEver } from '../data/curios';
import { sfx } from '../lib/sound';
import { useGame } from '../store/game';
import { emitPop } from './Pops';

/**
 * Every tap answers back. A little burst of stars where you touched, and a soft note when you
 * tap the world itself. Tap something new in the scenery (the Sun, a moon, buried ice...) and it
 * tells you a true Mars fact and drops a brick into your pile: the first tap each mission pays.
 */
interface Burst { id: number; x: number; y: number; big: boolean }
interface Bubble { id: number; x: number; y: number; curio: string; fresh: boolean; everNew: boolean; count: number }

const INTERACTIVE = 'button, a, input, [role="button"], [role="switch"], [data-mod], .walker, .sprite, .deposit, .find';

/** The curiosity under a point. Small things win over big ones (a moon in front of the sky). */
function curioAt(x: number, y: number): string | null {
  let best: { id: string; area: number } | null = null;
  for (const el of Array.from(document.querySelectorAll<HTMLElement | SVGElement>('.scene [data-curio]'))) {
    const r = el.getBoundingClientRect();
    if (!r.width || x < r.left - 6 || x > r.right + 6 || y < r.top - 6 || y > r.bottom + 6) continue;
    const area = r.width * r.height;
    if (!best || area < best.area) best = { id: (el as HTMLElement).dataset.curio!, area };
  }
  return best?.id ?? null;
}

export function TapJuice() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const next = useRef(1);
  const down = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => { down.current = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const onUp = (e: PointerEvent) => {
      const d = down.current;
      down.current = null;
      // Only real taps: not drags, not long presses, and not inside a card that is open on top.
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 600) return;
      const target = e.target as HTMLElement;
      if (target.closest('dialog') || !target.closest('.game')) return;
      const onThing = !!target.closest(INTERACTIVE);
      const id = next.current++;
      setBursts((b) => [...b.slice(-8), { id, x: e.clientX, y: e.clientY, big: !onThing }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 700);
      if (onThing || !target.closest('.scene')) return;
      const curio = curioAt(e.clientX, e.clientY);
      if (!curio) { sfx.tap(); return; }
      const everNew = !curiosEver().includes(curio);
      const fresh = useGame.getState().findCurio(curio);
      if (fresh) {
        sfx.discover();
        emitPop('+1 brick', [e.clientX, e.clientY - 30], 'bricks', 'science');
      } else sfx.ping();
      const count = useGame.getState().curios.length;
      setBubble({ id, x: e.clientX, y: e.clientY, curio, fresh, everNew, count });
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);
    return () => { window.removeEventListener('pointerdown', onDown, true); window.removeEventListener('pointerup', onUp, true); };
  }, []);

  // A fact stays long enough to read, then floats away. Another tap anywhere replaces it.
  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble((b) => (b?.id === bubble.id ? null : b)), bubble.fresh ? 6500 : 4200);
    return () => clearTimeout(t);
  }, [bubble]);

  const c = bubble ? curioById(bubble.curio) : null;
  const bx = bubble ? Math.max(170, Math.min(window.innerWidth - 170, bubble.x)) : 0;
  // Near the top of the screen the fact hangs below the finger, so it never covers the header.
  const below = !!bubble && bubble.y < 330;
  const by = bubble ? bubble.y : 0;
  return (
    <div className="tap-juice" aria-hidden={!bubble}>
      {bursts.map((b) => (
        <span key={b.id} className={`tap-burst ${b.big ? 'big' : ''}`} style={{ left: b.x, top: b.y }}>
          <i className="tap-ring" />
          {Array.from({ length: b.big ? 7 : 5 }, (_, i) => <s key={i} style={{ '--a': `${(i / (b.big ? 7 : 5)) * 360 + (b.id % 5) * 13}deg` } as React.CSSProperties} />)}
        </span>
      ))}
      <AnimatePresence>
        {bubble && c && (
          <motion.div key={bubble.id} className={`curio-bubble ${bubble.fresh ? 'fresh' : ''} ${below ? 'below' : ''}`} role="status" style={{ left: bx, top: by }}
            initial={{ scale: 0.3, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
            <span className="curio-kicker"><Sparkles /> {bubble.fresh ? (bubble.everNew ? 'New discovery!' : 'Curious commander!') : c.name}</span>
            {bubble.fresh && <b className="curio-name">{c.name}</b>}
            <span className="curio-fact">{c.fact}</span>
            {bubble.fresh && (
              <span className="curio-reward">
                <span className="curio-brick"><Package /> +1 brick</span>
                <small>{bubble.count} of {CURIOS.length} curiosities this mission</small>
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
