import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { follow, glideTo, useCamera } from '../lib/camera';
import { useDrag } from '../lib/crewDrag';
import { useGame } from '../store/game';
import { Astronaut, Marv } from './art';
import { lookOf } from './crewLook';
import { sites, stepOf, trainingStep, type CoachRun, type CoachStep, type CoachTarget } from './coach';

/**
 * M.A.R.V. points at the thing. During a lesson step the rest of the screen dims,
 * the target sits in a bright hole with a bouncing hand on it, and the instruction
 * sits in a bubble right beside it. On a paused step everything outside the hole is
 * blocked, so a wrong tap cannot derail the lesson. Drag steps loop a ghost hand that
 * carries the astronaut onto the target until the player does it.
 */
interface Box { x: number; y: number; w: number; h: number }
interface Geo { t: Box | null; f: Box | null; alt: string | null; vw: number; vh: number }

const GO_STEP: CoachStep = { say: () => 'You landed on Mars! Tap Step outside.', target: 'pod', pause: true, done: () => false };

const box = (el: Element | null, pad = 0): Box | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  // A discovery's "?" marker floats outside its box: include it in the spotlight.
  let { left, top, right, bottom } = r;
  for (const extra of Array.from(el.querySelectorAll('.find-mark'))) {
    const e = extra.getBoundingClientRect();
    left = Math.min(left, e.left); top = Math.min(top, e.top); right = Math.max(right, e.right); bottom = Math.max(bottom, e.bottom);
  }
  return { x: left - pad, y: top - pad, w: right - left + pad * 2, h: bottom - top + pad * 2 };
};
const q = (sel: string) => document.querySelector(sel);
const all = (sel: string) => Array.from(document.querySelectorAll(sel));

/** Is this element on screen inside the scene (not off past the edge)? */
function inView(el: Element) {
  const scene = q('.scene')?.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (!scene) return true;
  return r.left > scene.left + 50 && r.right < scene.right - 50;
}

/** Find what the step is about on screen. `alt` replaces the words when we point somewhere else. */
function locate(target: CoachTarget | 'go', run: CoachRun | null): { t: Element | null; f: Element | null; alt: string | null } {
  const game = useGame.getState().game;
  const subject = run?.subject;
  const sprite = subject ? q(`.sprite[data-crew="${subject}"]`) : null;
  const arrow = () => q('.edge.has') ?? q('.edge-r') ?? q('.edge-l');
  switch (target) {
    case 'go': return { t: q('.pod-go'), f: null, alt: null };
    case 'pod': return { t: q('.pod .pod-craft'), f: null, alt: null };
    case 'life': return { t: q('.res-life'), f: null, alt: null };
    case 'arrow': return { t: arrow(), f: null, alt: null };
    case 'find': {
      const open = all('button.find.open').filter(inView);
      const scene = q('.scene')?.getBoundingClientRect();
      const mid = scene ? scene.left + scene.width / 2 : 0;
      open.sort((a, b) => Math.abs(a.getBoundingClientRect().left - mid) - Math.abs(b.getBoundingClientRect().left - mid));
      if (open[0]) return { t: open[0], f: null, alt: null };
      return { t: arrow(), f: null, alt: 'No sparkles here. Tap the arrow to look further!' };
    }
    case 'trip': return { t: q('.body.walker > .sprite'), f: null, alt: null };
    case 'spot': {
      const spot = all('.spot.tip')[0] ?? all('.spot.ready')[0];
      if (spot) return { t: spot, f: null, alt: null };
      return { t: q('.dock-btn.build'), f: null, alt: 'You got new plans! Tap Build to choose where they go.' };
    }
    case 'site': {
      const site = game && sites({ game, picked: null })[0];
      const el = site ? q(`.mod[data-mod="${site.id}"] .mod-hit`) ?? q(`.prop-wrap[data-mod="${site.id}"]`) : null;
      return { t: el, f: sprite, alt: null };
    }
    case 'module': return { t: subject ? q(`.mod[data-mod="${subject}"] .mod-hit`) : null, f: null, alt: null };
    case 'bed': return { t: q('.mod[data-mod="hab"] .mod-hit') ?? q('.pod .pod-craft'), f: sprite, alt: null };
    case 'crew': return { t: sprite, f: null, alt: null };
    case 'deposit': return { t: all('.deposit:not(.empty)').filter(inView)[0] ?? null, f: null, alt: null };
    case 'upgrade': return { t: q('.up-btn'), f: null, alt: null };
    case 'edit': return { t: q('.edit-btn'), f: null, alt: null };
    default: return { t: null, f: null, alt: null };
  }
}

const same = (a: Box | null, b: Box | null) => (!a && !b) || (!!a && !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5);

/** A rounded rectangle as part of an SVG path, for cutting holes in the dimmer. */
const rrect = ({ x, y, w, h }: Box, r = 18) => {
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
};

export function Guide() {
  const tour = useGame((s) => s.tour);
  const coach = useGame((s) => s.coach);
  const panel = useGame((s) => s.panel);
  const moment = useGame((s) => s.moment);
  const editing = useGame((s) => s.editing);
  const game = useGame((s) => s.game);
  const coachNext = useGame((s) => s.coachNext);
  const dragging = useDrag((d) => !!d.id);
  const step = tour === 0 ? GO_STEP : tour === null ? stepOf(coach) : null;
  const target: CoachTarget | 'go' | null = tour === 0 ? 'go' : step?.target ?? null;
  const show = !!step && !panel && !moment && !editing && game?.status === 'playing';
  const [geo, setGeo] = useState<Geo>({ t: null, f: null, alt: null, vw: 0, vh: 0 });
  const bubble = useRef<HTMLDivElement>(null);
  const [bsize, setBsize] = useState({ w: 340, h: 120 });
  const lastGlide = useRef(0);

  // Follow the target every frame: the camera moves, astronauts walk, panels slide.
  useEffect(() => {
    if (!show || !target) return;
    let raf = 0;
    let prev: Geo = { t: null, f: null, alt: null, vw: 0, vh: 0 };
    const loop = () => {
      const found = locate(target, coach);
      const pad = target === 'life' || target === 'arrow' ? 6 : 10;
      const next: Geo = { t: box(found.t, pad), f: box(found.f, 6), alt: found.alt, vw: window.innerWidth, vh: window.innerHeight };
      if (!same(next.t, prev.t) || !same(next.f, prev.f) || next.alt !== prev.alt || next.vw !== prev.vw || next.vh !== prev.vh) { prev = next; setGeo(next); }
      const b = bubble.current?.getBoundingClientRect();
      if (b && (Math.abs(b.width - bsize.w) > 1 || Math.abs(b.height - bsize.h) > 1)) setBsize({ w: b.width, h: b.height });
      // Bring the target into view if it is off past the edge of the crater view.
      const el = found.t;
      const scene = q('.scene')?.getBoundingClientRect();
      if (el && scene && el.closest('.world') && performance.now() - lastGlide.current > 900) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        if (cx < scene.left + 60 || cx > scene.right - 60) { lastGlide.current = performance.now(); follow(null); glideTo(useCamera.getState().x + (cx - (scene.left + scene.width / 2))); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [show, target, coach, bsize.w, bsize.h]);

  if (!show || !step || !game) return null;
  const words = geo.alt ?? step.say({ game, picked: null, subject: coach?.subject });
  const training = trainingStep(coach);
  const gotIt = tour === null && !step.done;
  const block = step.pause;
  const { t, f, vw, vh } = geo;
  const holes = [t, step.drag ? f : null].filter(Boolean) as Box[];

  // The bubble goes above the target if there is room, otherwise below, and never off screen.
  const margin = 12;
  let bx = vw / 2 - bsize.w / 2;
  let by = Math.max(120, vh * 0.17);
  let tail: 'down' | 'up' | null = null;
  if (t) {
    const focus = step.drag && f ? { x: Math.min(t.x, f.x), y: Math.min(t.y, f.y), w: Math.max(t.x + t.w, f.x + f.w) - Math.min(t.x, f.x), h: Math.max(t.y + t.h, f.y + f.h) - Math.min(t.y, f.y) } : t;
    bx = t.x + t.w / 2 - bsize.w / 2;
    if (focus.y - bsize.h - 30 > 8) { by = focus.y - bsize.h - 26; tail = 'down'; }
    else { by = focus.y + focus.h + 64; tail = 'up'; }
    if (by + bsize.h > vh - 8) { by = Math.max(8, vh - bsize.h - 8); tail = null; }
  }
  bx = Math.max(margin, Math.min(vw - bsize.w - margin, bx));
  const tailX = t ? Math.max(24, Math.min(bsize.w - 24, t.x + t.w / 2 - bx)) : 0;
  const handFlip = !!t && t.y + t.h > vh - 150;
  const subject = game.crew.find((c) => c.id === coach?.subject);

  return (
    <div className={`guide ${block ? 'blocking' : ''}`} aria-live="polite">
      {block && vw > 0 && (
        <svg className="guide-dim" width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} aria-hidden="true">
          <path d={`M0 0H${vw}V${vh}H0Z ${holes.map((h) => rrect(h)).join(' ')}`} fillRule="evenodd" />
        </svg>
      )}
      {holes.map((h, i) => <i key={i} className={`guide-ring ${i ? 'from' : ''}`} style={{ left: h.x, top: h.y, width: h.w, height: h.h }} aria-hidden="true" />)}

      {t && !(step.drag && f) && (
        <span className={`guide-hand ${handFlip ? 'flip' : ''}`} style={{ left: t.x + t.w / 2, top: handFlip ? t.y + 6 : t.y + t.h * 0.62 }} aria-hidden="true"><Hand /></span>
      )}
      {t && f && step.drag && !dragging && (
        <span key={`${Math.round(f.x)}-${Math.round(t.x)}`} className="guide-drag" aria-hidden="true"
          style={{ '--fx': `${f.x + f.w / 2}px`, '--fy': `${f.y + f.h * 0.45}px`, '--tx': `${t.x + t.w / 2}px`, '--ty': `${t.y + t.h * 0.5}px` } as CSSProperties}>
          {subject && <span className="guide-drag-crew"><Astronaut who={subject} look={lookOf(subject)} size={40} act="jump" /></span>}
          <span className="guide-drag-hand"><Hand /></span>
        </span>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={words} ref={bubble} className={`guide-bubble ${tail ? `tail-${tail}` : ''}`} style={{ left: bx, top: by, '--tail': `${tailX}px` } as CSSProperties}
          initial={{ scale: 0.6, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          role="dialog" aria-label="M.A.R.V. says">
          <span className="guide-marv"><Marv mood="happy" size={54} /></span>
          <div className="guide-text">
            {training && <small>Training {training.n} of {training.of}</small>}
            {!training && tour === null && <small>New lesson</small>}
            <p>{words}</p>
            {step.drag && subject && <span className="guide-or">Or tap {subject.name}, then tap the glowing place.</span>}
            {gotIt && <motion.button className="btn btn-go guide-ok" onClick={coachNext} whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.05 }} autoFocus><Check /> Got it</motion.button>}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** A big friendly cartoon hand, finger pointing up. Flat, thick outline, like the rest of the game. */
function Hand() {
  return (
    <svg viewBox="0 0 64 80" width="64" height="80" aria-hidden="true">
      <path d="M22 6c0-4 9-4 9 0v26l2-1c1-3 8-3 8 1v2c1-3 8-3 8 1v3c1-3 8-2 8 2v14c0 12-8 20-20 20h-4c-9 0-14-5-18-12L6 47c-3-5 3-9 7-5l9 8z"
        fill="#f7f4ec" stroke="#1d1033" strokeWidth="4" strokeLinejoin="round" />
      <path d="M31 33v9M41 35v8M51 39v6" stroke="#1d1033" strokeWidth="3" strokeLinecap="round" />
      <rect x="20" y="68" width="34" height="10" rx="4" fill="#ffd23f" stroke="#1d1033" strokeWidth="4" />
    </svg>
  );
}
