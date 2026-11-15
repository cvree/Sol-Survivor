import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { FINDS, type Find } from '../data/discoveries';
import { useCamera } from '../lib/camera';
import { useGame } from '../store/game';
import { INK, Rover } from './art';

const O = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const thin = { ...O, strokeWidth: 3 };

/** The drawing for each discovery. Flat shapes, thick outlines, like the rest of the base. */
export function FindArt({ id }: { id: string }) {
  switch (id) {
    case 'rim':
      return (
        <svg viewBox="0 0 300 130" aria-hidden="true">
          <path d="M0 130L18 72L58 42L108 30L150 12L198 32L250 50L288 92L300 130Z" fill="#a8452a" {...O} />
          <path d="M16 82C80 66 200 72 290 100M34 60C96 46 190 50 246 60M70 42C110 34 160 30 200 40" fill="none" stroke="#8a3520" strokeWidth="7" strokeLinecap="round" />
          <path d="M150 12l-14 24M108 30l-8 18" stroke="#c9653c" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="226" cy="104" rx="12" ry="7" fill="#7a2b1c" /><ellipse cx="80" cy="96" rx="9" ry="5" fill="#7a2b1c" />
        </svg>
      );
    case 'dunes':
      return (
        <svg viewBox="0 0 240 70" aria-hidden="true">
          <path d="M0 70C26 26 64 14 104 42C134 10 186 4 240 70Z" fill="#4a2b3d" {...O} />
          <path d="M30 56c12-10 24-14 38-12M70 52c10-8 22-10 32-8M128 46c14-14 32-20 50-16M150 58c14-10 30-12 46-6" fill="none" stroke="#7a4a62" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'meteorite':
      return (
        <svg viewBox="0 0 74 54" aria-hidden="true">
          <path d="M8 50C2 30 14 8 36 6C58 4 72 22 68 44L60 52Z" fill="#7d7891" {...O} />
          <circle cx="28" cy="26" r="6" fill="#5e5a73" /><circle cx="48" cy="34" r="4.5" fill="#5e5a73" /><circle cx="44" cy="18" r="3" fill="#5e5a73" />
          <path d="M18 18c4-6 10-8 16-8" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".7" />
        </svg>
      );
    case 'laser':
      return (
        <svg viewBox="0 0 90 56" aria-hidden="true" style={{ overflow: 'visible' }}>
          <path d="M6 54C0 34 12 14 36 12C64 10 86 24 84 54Z" fill="#b8603a" {...O} />
          {[24, 34, 44, 54, 64].map((x) => <circle key={x} cx={x} cy="36" r="2.6" fill={INK} />)}
          <path className="zap" d="M140 -40L50 34" stroke="#ff2e4d" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="6 8" />
          <circle className="zap-flash" cx="50" cy="34" r="7" fill="#fff7c9" stroke="#ff2e4d" strokeWidth="2" />
        </svg>
      );
    case 'tracks':
      return (
        <svg viewBox="0 0 170 30" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <g key={i}>
              <rect x={i * 17} y="3" width="11" height="7" rx="2" fill="#6e2620" />
              <rect x={i * 17 + 6} y="19" width="11" height="7" rx="2" fill="#6e2620" />
              {i % 3 === 0 && <circle cx={i * 17 + 5} cy="6.5" r="1.6" fill="#e7b08a" />}
              {i % 3 === 1 && <rect x={i * 17 + 2} y="5.5" width="6" height="2" fill="#e7b08a" />}
            </g>
          ))}
        </svg>
      );
    case 'curiosity':
      return <Rover size={130} />;
    case 'lake':
      return (
        <svg viewBox="0 0 120 64" aria-hidden="true">
          <rect x="4" y="6" width="112" height="54" rx="20" fill="#8d7f9e" {...O} />
          <path d="M12 22c16-6 30 6 48 0s30-6 48 0M12 36c16-6 30 6 48 0s30-6 48 0M14 50c16-5 30 5 46 0s30-5 44 0" fill="none" stroke="#c4b6d3" strokeWidth="4" strokeLinecap="round" />
          <path d="M20 29c10-3 18 3 26 0" stroke="#4fd8ff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'sulfur':
      return (
        <svg viewBox="0 0 100 64" aria-hidden="true">
          <path d="M4 60L10 20L40 8L46 60Z" fill="#6f3a2c" {...O} />
          <path d="M96 60L90 18L60 8L54 60Z" fill="#6f3a2c" {...O} />
          <path d="M44 58L38 30L46 14L52 28L50 10L60 24L58 58Z" fill="#ffd23f" {...thin} />
          <path d="M46 20l2 10M56 22l-2 8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case 'ice':
      return (
        <svg viewBox="0 0 86 60" aria-hidden="true">
          <path d="M6 56l12-30l12 30zM24 56l16-50l16 50zM52 56l12-28l14 28z" fill="#9fdcf5" stroke="#5e1d22" strokeWidth="4" strokeLinejoin="round" />
          <path d="M40 18l-5 24M18 34l-3 12M64 36l-2 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'organics':
      return (
        <svg viewBox="0 0 100 64" aria-hidden="true">
          <path d="M6 58C2 34 16 10 46 8C78 6 98 26 94 58Z" fill="#8a6f5c" {...O} />
          <path d="M20 40c14-4 30 4 60-2" stroke="#a88a74" strokeWidth="4" fill="none" strokeLinecap="round" />
          <polygon className="glow-hex" points="50,18 62,25 62,39 50,46 38,39 38,25" fill="none" stroke="#5ee6a0" strokeWidth="4" strokeLinejoin="round" />
          <circle cx="50" cy="18" r="3" fill="#5ee6a0" /><circle cx="62" cy="39" r="3" fill="#5ee6a0" /><circle cx="38" cy="39" r="3" fill="#5ee6a0" />
        </svg>
      );
    case 'sharp':
      return (
        <svg viewBox="0 0 460 190" aria-hidden="true">
          <path d="M0 190L70 120L120 96L170 54L214 20L246 8L276 30L320 66L370 98L420 140L460 190Z" fill="#b5532d" {...O} />
          <path d="M40 158C140 140 320 142 432 160M86 124C170 108 300 110 382 116M140 88C200 74 280 76 336 82M186 54C220 44 260 46 300 52" fill="none" stroke="#9a4426" strokeWidth="9" strokeLinecap="round" />
          <path d="M246 8l-30 40M214 20l-16 28" stroke="#d07043" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case 'devil':
      return (
        <svg viewBox="0 0 70 120" aria-hidden="true">
          <path d="M2 6C24 0 46 0 68 6C60 40 46 80 38 116H32C26 80 12 40 2 6Z" fill="#e7b08a" stroke="#b9532c" strokeWidth="3" opacity=".9" />
          <path d="M8 18c18 6 36 6 54 0M14 40c14 5 28 5 42 0M22 64c9 4 18 4 26 0M28 88c5 2 9 2 14 0" fill="none" stroke="#c9653c" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="35" cy="116" rx="22" ry="5" fill="#c9653c" opacity=".6" />
        </svg>
      );
  }
  return null;
}

function Marker() {
  return (
    <span className="find-mark" aria-hidden="true">
      <Sparkles />
      <b>?</b>
    </span>
  );
}

/** A find on the map: plain scenery until it turns up, then a sparkling thing to tap. */
function FindObject({ f, open, style }: { f: Find; open: boolean; style: CSSProperties }) {
  const collect = useGame((s) => s.collect);
  const body = (
    <>
      <span className="find-art"><FindArt id={f.id} /></span>
      {f.sign && <span className="find-sign">{f.sign}</span>}
      {open && <Marker />}
    </>
  );
  const cls = `find f-${f.id} layer-${f.layer} ${open ? 'open' : ''}`;
  const s = { ...style, width: f.w, height: f.h };
  if (!open) return <div className={cls} style={s} aria-hidden="true">{body}</div>;
  return (
    <motion.button className={cls} style={s} onClick={() => collect(f.id)} aria-label={`Something to investigate: ${f.sign ?? 'a mystery'}. Press to find out.`}
      initial={{ scale: f.layer === 'ground' ? 0 : 1 }} animate={{ scale: 1 }} whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 360, damping: 14 }}>
      {body}
    </motion.button>
  );
}

/** Finds on the surface and under the ground, placed across the wide world. */
export function Finds() {
  const W = useCamera((s) => s.W);
  const active = useGame((s) => s.findsActive);
  const got = useGame((s) => s.findsGot);
  return (
    <>
      {FINDS.filter((f) => f.layer === 'surface' || f.layer === 'ground' || f.layer === 'roam').map((f) => {
        const on = active.includes(f.id);
        const open = on && !got.includes(f.id);
        if ((f.layer === 'ground' || f.layer === 'roam') && !open) return null;
        if (f.layer === 'roam') return <div key={f.id} className="roamer" style={{ top: `calc(var(--ground) - ${f.h - 12}px)` }}><FindObject f={f} open style={{}} /></div>;
        const left = f.x * W - f.w / 2;
        const style: CSSProperties = f.layer === 'surface'
          ? { left, top: `calc(var(--ground) - ${f.h - (f.sink ?? 0)}px)` }
          : { left, top: `calc(var(--ground) + (100% - var(--ground)) * ${f.depth ?? 0.5})` };
        return <FindObject key={f.id} f={f} open={open} style={style} />;
      })}
    </>
  );
}

/** Mount Sharp sits on the horizon and moves slower than the ground, so it feels far away. */
export function MountSharp({ factor }: { factor: number }) {
  const { W, vw } = useCamera();
  const active = useGame((s) => s.findsActive);
  const got = useGame((s) => s.findsGot);
  const f = FINDS.find((x) => x.id === 'sharp')!;
  const camAt = f.x * W - vw / 2;
  const left = vw / 2 - f.w / 2 + (1 - factor) * camAt;
  return (
    <div className="px mount" style={{ '--f': factor, left } as CSSProperties}>
      <FindObject f={f} open={active.includes('sharp') && !got.includes('sharp')} style={{ position: 'relative' }} />
    </div>
  );
}

/** World positions of finds still waiting to be found, for the edge arrows and the map. */
export function useOpenFinds(): number[] {
  const W = useCamera((s) => s.W);
  const active = useGame((s) => s.findsActive);
  const got = useGame((s) => s.findsGot);
  return FINDS.filter((f) => f.layer !== 'roam' && active.includes(f.id) && !got.includes(f.id)).map((f) => f.x * W);
}
