import { create } from 'zustand';

/**
 * The camera over the base. The world is wider than the screen, so the player
 * can drag the ground (or scroll, use the arrow keys, the edge arrows or the map)
 * to look around. Kept out of the game store so panning never re-renders the game.
 */
export const WORLD = 2.6;
export interface Cam { x: number; vw: number; W: number }
export const useCamera = create<Cam>(() => ({ x: 0, vw: 1000, W: 2600 }));

const get = useCamera.getState;
const set = useCamera.setState;
const max = () => Math.max(0, get().W - get().vw);
const clamp = (x: number) => Math.max(0, Math.min(max(), x));
export const homeX = () => max() / 2;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let raf = 0;
let moved = 0;
/** How far the player has panned by hand this mission, in px. Used by the coach. */
export const pannedBy = () => moved;
export const resetPanned = () => { moved = 0; };

export function stop() { cancelAnimationFrame(raf); raf = 0; }

export function setView(vw: number) {
  if (!vw) return;
  const { x, vw: oldVw, W: oldW } = get();
  const centre = oldW > 1 ? (x + oldVw / 2) / oldW : 0.5;
  const W = Math.round(vw * WORLD);
  set({ vw, W, x: Math.max(0, Math.min(W - vw, centre * W - vw / 2)) });
}

export function jumpHome() { stop(); set({ x: homeX() }); }

export function glideTo(target: number, ms = 560) {
  stop();
  const to = clamp(target);
  const from = get().x;
  if (reduced() || Math.abs(to - from) < 1) { set({ x: to }); return; }
  const t0 = performance.now();
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    set({ x: from + (to - from) * e });
    raf = k < 1 ? requestAnimationFrame(tick) : 0;
  };
  raf = requestAnimationFrame(tick);
}

export const nudge = (dx: number) => { moved += Math.abs(dx); follow(null); glideTo(get().x + dx); };

/** Who the camera is following out in the crater, if anyone. Panning by hand stops following. */
export const useFollow = create<{ id: string | null }>(() => ({ id: null }));
export const follow = (id: string | null) => { if (useFollow.getState().id !== id) useFollow.setState({ id }); };
/**
 * Where the followed walker is (world px). Safe to call while drawing: it only notes the goal.
 * The camera eases toward it on its own animation frames.
 *
 * It must never move the camera directly: the scene redraws when the camera moves, and a redraw
 * that moves the camera again loops until React gives up and blanks the whole page.
 */
let followGoal: number | null = null;
let followRaf = 0;
export function followTo(worldX: number) {
  followGoal = worldX;
  if (!followRaf) followRaf = requestAnimationFrame(followStep);
}
function followStep() {
  followRaf = 0;
  if (followGoal === null || !useFollow.getState().id) { followGoal = null; return; }
  // Waits for any glide to finish first.
  if (!raf) {
    const want = clamp(followGoal - get().vw / 2);
    const x = get().x;
    if (Math.abs(want - x) >= 0.5) set({ x: reduced() ? want : x + (want - x) * 0.12 });
  }
  followRaf = requestAnimationFrame(followStep);
}

/** Past the edge the world stretches like a rubber band, then springs back. */
function rubber(x: number) {
  const m = max();
  if (x < 0) return x * 0.3;
  if (x > m) return m + (x - m) * 0.3;
  return x;
}

function fling(v: number) {
  stop();
  if (reduced()) { set({ x: clamp(get().x) }); return; }
  const tick = () => {
    let x = get().x;
    const m = max();
    if (x < 0 || x > m) { glideTo(clamp(x), 380); return; }
    v *= 0.93;
    x += v;
    set({ x });
    if (Math.abs(v) > 0.4) raf = requestAnimationFrame(tick);
    else if (x < 0 || x > m) glideTo(clamp(x), 380);
    else raf = 0;
  };
  raf = requestAnimationFrame(tick);
}

/** Drag, fling, wheel and arrow keys. Clicks still work: a press only becomes a drag after it moves 8 px. */
export function attachDrag(el: HTMLElement, locked: () => boolean) {
  let down: { x: number; cam: number; id: number } | null = null;
  let dragged = false;
  let vx = 0;
  let lastX = 0;
  let lastT = 0;
  let eat = false;
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || locked() || (e.target as HTMLElement).closest('.no-drag')) return;
    stop();
    down = { x: e.clientX, cam: get().x, id: e.pointerId };
    dragged = false;
    vx = 0;
    lastX = e.clientX;
    lastT = e.timeStamp;
  };
  const onMove = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x;
    if (!dragged && Math.abs(dx) > 8) {
      dragged = true;
      follow(null);
      try { el.setPointerCapture(e.pointerId); } catch { /* fine */ }
      el.classList.add('dragging');
    }
    if (!dragged) return;
    moved += Math.abs(e.clientX - lastX);
    set({ x: rubber(down.cam - dx) });
    const dt = Math.max(1, e.timeStamp - lastT);
    vx = 0.7 * vx + 0.3 * ((lastX - e.clientX) / dt) * 16;
    lastX = e.clientX;
    lastT = e.timeStamp;
  };
  const onUp = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    down = null;
    if (!dragged) return;
    el.classList.remove('dragging');
    eat = true;
    setTimeout(() => { eat = false; }, 0);
    fling(e.timeStamp - lastT > 90 ? 0 : vx);
  };
  const onClick = (e: MouseEvent) => {
    if (!eat) return;
    e.stopPropagation();
    e.preventDefault();
    eat = false;
  };
  const onWheel = (e: WheelEvent) => {
    if (locked()) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!d) return;
    e.preventDefault();
    stop();
    follow(null);
    moved += Math.abs(d);
    set({ x: clamp(get().x + d) });
  };
  const onKey = (e: KeyboardEvent) => {
    if (locked() || document.querySelector('dialog[open]') || (e.target as HTMLElement).closest?.('input, textarea')) return;
    if (e.key === 'ArrowLeft') nudge(-get().vw * 0.5);
    else if (e.key === 'ArrowRight') nudge(get().vw * 0.5);
    else if (e.key === 'Home') glideTo(homeX());
    else return;
    e.preventDefault();
  };
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  el.addEventListener('click', onClick, true);
  el.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    el.removeEventListener('click', onClick, true);
    el.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
  };
}

/** Nudge the camera directly, for edge-scrolling while carrying an astronaut. */
export function panBy(dx: number) { stop(); set({ x: clamp(get().x + dx) }); }
