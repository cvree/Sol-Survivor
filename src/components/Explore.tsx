import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Home, Sparkles } from 'lucide-react';
import { glideTo, homeX, nudge, useCamera } from '../lib/camera';
import { sfx } from '../lib/sound';

/** Big arrows at the edges: a click-only way to look around, with a count of finds waiting that way. */
export function EdgeArrows({ targets, hidden }: { targets: number[]; hidden: boolean }) {
  const { x, vw, W } = useCamera();
  if (hidden) return null;
  const left = targets.filter((t) => t < x + 30).length;
  const right = targets.filter((t) => t > x + vw - 30).length;
  const Arrow = ({ side, n, can }: { side: 'l' | 'r'; n: number; can: boolean }) => (
    <AnimatePresence>
      {can && (
        <motion.button key={side} className={`edge edge-${side} no-drag ${n ? 'has' : ''}`} onClick={() => nudge((side === 'l' ? -1 : 1) * vw * 0.7)}
          initial={{ opacity: 0, x: side === 'l' ? -30 : 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} whileTap={{ scale: 0.88 }}
          aria-label={`Look ${side === 'l' ? 'west' : 'east'}${n ? `. ${n} thing${n > 1 ? 's' : ''} to discover that way` : ''}`}>
          {side === 'l' ? <ChevronLeft /> : <ChevronRight />}
          {n > 0 && <b className="edge-count"><Sparkles />{n}</b>}
        </motion.button>
      )}
    </AnimatePresence>
  );
  return (
    <>
      <Arrow side="l" n={left} can={x > 4} />
      <Arrow side="r" n={right} can={x < W - vw - 4} />
    </>
  );
}

/** A strip map of the whole area: where the base is, where you are looking, and what is waiting to be found. */
export function MiniMap({ targets, hidden }: { targets: number[]; hidden: boolean }) {
  const { x, vw, W } = useCamera();
  const count = useRef(targets.length);
  useEffect(() => {
    if (targets.length > count.current) sfx.ping();
    count.current = targets.length;
  }, [targets.length]);
  if (hidden) return null;
  const pct = (n: number) => `${(n / W) * 100}%`;
  const away = Math.abs(x - homeX()) > vw * 0.25;
  return (
    <div className="minimap no-drag">
      <button className="mm-track" aria-label="Map of the area. Press a spot to look there."
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); glideTo(((e.clientX - r.left) / r.width) * W - vw / 2); }}>
        <i className="mm-ground" />
        <i className="mm-home" style={{ left: pct((W - vw) / 2), width: pct(vw) }} />
        {targets.map((t, i) => <i key={i} className="mm-find" style={{ left: pct(t) }} />)}
        <i className="mm-view" style={{ left: pct(x), width: pct(vw) }} />
      </button>
      <motion.button className="mm-home-btn" onClick={() => glideTo(homeX())} disabled={!away} whileTap={{ scale: 0.88 }} aria-label="Look back at the base"><Home /></motion.button>
    </div>
  );
}
