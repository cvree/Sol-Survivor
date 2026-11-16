import { create } from 'zustand';
import { BASE_HALF, MODULE_NAME, assign, canGoOut, habReady } from '../engine/engine';
import type { GameState } from '../engine/types';
import { PICKUP } from '../data/characters';
import { useGame } from '../store/game';
import { follow, panBy, useCamera } from './camera';
import { sfx } from './sound';

/**
 * Moving astronauts around, by hand.
 *
 * Two ways, and both work with a mouse, a trackpad or a finger:
 *  - Drag: press on an astronaut and drag. They dangle from your finger, every place they
 *    could go lights up with what they would do there, and letting go sends them.
 *  - Tap, then tap: tap an astronaut to pick them, then tap a glowing place.
 *
 * Either way they then walk there for real (see `CrewWalkers` in Walk.tsx).
 */
interface DragState {
  /** Astronaut being dragged right now. */
  id: string | null;
  /** Astronaut picked with a tap, waiting for you to tap a place. */
  sel: string | null;
  x: number;
  y: number;
  /** Sideways speed of the pointer, so the carried astronaut can swing. */
  vx: number;
  over: string | null;
  ok: boolean;
  /** What they said when picked up. */
  line: string;
  /** A bad drop: the astronaut flies back home from here. */
  back: { id: string; x: number; y: number; at: number } | null;
  /** A good drop: a puff of dust where they are heading. */
  landed: { target: string; at: number } | null;
  /** Someone who just shook their head at a bad drop. */
  nope: { id: string; at: number } | null;
  /** A happy word over someone just sent somewhere: what they are off to do. */
  cheer: { crewId: string; text: string; at: number } | null;
  /** While dragging over open crater ground: where they would walk to (screen x). */
  ground: number | null;
}
export const useDrag = create<DragState>(() => ({ id: null, sel: null, x: 0, y: 0, vx: 0, over: null, ok: false, line: '', back: null, landed: null, nope: null, cheer: null, ground: null }));

/** The astronaut whose possible places should light up: being dragged, or picked with a tap. */
export const useHolding = () => useDrag((d) => d.id ?? d.sel);

let justDragged = false;
/** True right after a drag ends, so the tap that follows is ignored. */
export const wasDragged = () => justDragged;

const targetAt = (x: number, y: number) => {
  for (const el of document.elementsFromPoint(x, y)) {
    const mod = (el as HTMLElement).closest?.('[data-mod]') as HTMLElement | null;
    if (mod) return mod.dataset.mod ?? null;
  }
  return null;
};

const homeId = (id: string) => (id === 'pod' ? 'hab' : id);

/** Can this astronaut go there right now? Someone already out in the crater can be sent anywhere too. */
export function canDrop(crewId: string, target: string, game: GameState | null = useGame.getState().game): boolean {
  if (!game) return false;
  const c = game.crew.find((x) => x.id === crewId);
  if (!c || c.out) return false;
  // Out in the crater: a discovery, a rock pile or any open ground. Anyone rested enough can go,
  // and someone already outside can change course.
  if (target.startsWith('find:') || target.startsWith('dep:') || target.startsWith('ground:')) return c.trip ? !c.exhausted : canGoOut(c);
  if (target === 'pod' && habReady(game)) return false;
  const id = homeId(target);
  if (c.trip) {
    // They will head there once they are back at the base.
    const home = { ...game, crew: game.crew.map((x) => (x.id === crewId ? { ...x, trip: null, at: 'out' } : x)) };
    return id === 'hab' || assign(home, crewId, id) !== home;
  }
  if (c.at === id) return false;
  return assign(game, crewId, id) !== game;
}

/** What they would do there, in two or three words. Null if they cannot go. */
export function placeVerb(crewId: string, target: string, game: GameState | null = useGame.getState().game): string | null {
  if (!game || !canDrop(crewId, target, game)) return null;
  if (target.startsWith('ground:')) return 'Walk here';
  if (target.startsWith('find:')) return 'Explore';
  if (target.startsWith('dep:')) return 'Dig bricks';
  const id = homeId(target);
  if (id === 'hab') return 'Sleep';
  const m = game.modules.find((x) => x.id === id);
  if (!m) return null;
  if (m.buildLeft > 0) return m.upgrading ? 'Upgrade' : 'Build';
  const c = game.crew.find((x) => x.id === crewId);
  switch (m.kind) {
    case 'oxygen': return 'Make air';
    case 'hydro': return 'Grow food';
    case 'lab': return 'Do science';
    case 'medbay': return c?.role === 'Medic' ? 'Heal crew' : 'Get well';
    default: return `Work in the ${MODULE_NAME[m.kind]}`;
  }
}

/** Send an astronaut to a place. Returns true if they are on their way. */
export function sendTo(crewId: string, target: string): boolean {
  const g = useGame.getState();
  const game = g.game;
  if (!game || !canDrop(crewId, target, game)) return false;
  const outside = target.startsWith('find:') || target.startsWith('dep:') || target.startsWith('ground:');
  if (target.startsWith('find:')) g.collect(target.slice(5), crewId);
  else if (target.startsWith('dep:')) g.dig(target.slice(4), crewId);
  else if (target.startsWith('ground:')) g.goTo(crewId, Number(target.slice(7)));
  else g.assign(crewId, homeId(target));
  const moved = useGame.getState().game !== game;
  if (moved) {
    // The store already played the "off you go" sound.
    useDrag.setState({ landed: { target, at: Date.now() }, sel: null, cheer: { crewId, text: placeVerb(crewId, target, game) ?? 'On it!', at: Date.now() } });
    g.pick(null);
    // Walking out into the crater: the camera goes with them, so you can watch the whole trip.
    if (outside && target.startsWith('ground:')) follow(crewId);
  }
  return moved;
}

/** The world spot (0-1 across the crater) under a point on the screen, or null if it is not over the scene. */
function groundAt(x: number, y: number): number | null {
  const scene = document.querySelector('.scene') as HTMLElement | null;
  if (!scene) return null;
  const r = scene.getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  const { x: cam, W } = useCamera.getState();
  return (cam + x - r.left) / W;
}

/**
 * Where a drop should go. Right on a place: there. Close to one: it snaps there.
 * Out on open ground: they walk to that spot. Never a dead end if there is any good place nearby.
 */
export function resolveDrop(crewId: string, x: number, y: number): string | null {
  const over = targetAt(x, y);
  if (over && canDrop(crewId, over)) return over;
  // The nearest place they could go, within a short reach of the finger.
  let best: { id: string; d: number } | null = null;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('.scene [data-mod]'))) {
    const id = el.dataset.mod;
    if (!id || !canDrop(crewId, id)) continue;
    const r = el.getBoundingClientRect();
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top - y, 0, y - r.bottom);
    const d = Math.hypot(dx, dy);
    if (!best || d < best.d) best = { id, d };
  }
  if (best && best.d < 110) return best.id;
  const g = groundAt(x, y);
  if (g === null) return null;
  // Open ground away from the base: walk there.
  if (Math.abs(g - 0.5) > BASE_HALF) {
    const t = `ground:${g.toFixed(3)}`;
    return canDrop(crewId, t) ? t : null;
  }
  // Somewhere in the base but not on anything: the nearest good place in the base.
  return best && best.d < 320 ? best.id : null;
}

/** Is this the place they already are? Dropping them back there just puts them down. */
function sameSpot(crewId: string, target: string | null) {
  const c = useGame.getState().game?.crew.find((x) => x.id === crewId);
  return !!c && !!target && !c.trip && homeId(target) === c.at;
}

/** Tap a glowing place while an astronaut is picked: send them there. Returns true if the tap was used. */
export function tapPlace(target: string): boolean {
  const sel = useDrag.getState().sel;
  if (!sel) return false;
  if (sendTo(sel, target)) return true;
  refuse(sel);
  return true;
}

/** Shake their head, say why not. */
function refuse(crewId: string) {
  const c = useGame.getState().game?.crew.find((x) => x.id === crewId);
  sfx.nope();
  useDrag.setState({ nope: { id: crewId, at: Date.now() } });
  if (c) useGame.setState({ notice: { text: c.energy <= 25 && !c.exhausted ? `${c.name} is too tired for that. Let them sleep first.` : `${c.name} cannot go there. Try a glowing place!`, at: Date.now() } });
}

/** Tap an astronaut: pick them (places light up). Tap them again to open their card. */
export function tapCrew(crewId: string) {
  const { sel } = useDrag.getState();
  const g = useGame.getState();
  if (sel === crewId) {
    useDrag.setState({ sel: null });
    g.pick(g.picked === crewId ? null : crewId);
    return;
  }
  const c = g.game?.crew.find((x) => x.id === crewId);
  if (!c || c.out) return;
  sfx.pickup();
  useDrag.setState({ sel: crewId, line: lineFor(crewId) });
  if (g.picked && g.picked !== crewId) g.pick(null);
}

export const clearSelection = () => { if (useDrag.getState().sel) useDrag.setState({ sel: null }); };

let lineIx = 0;
const lineFor = (id: string) => {
  const lines = PICKUP[id] ?? ['Where to, Commander?'];
  return lines[lineIx++ % lines.length];
};

export function startCrewDrag(e: React.PointerEvent, crewId: string) {
  if ((e.pointerType === 'mouse' && e.button !== 0) || useGame.getState().tour !== null) return;
  const sx = e.clientX;
  const sy = e.clientY;
  let dragging = false;
  let raf = 0;
  let lastX = sx;
  let lastT = performance.now();
  const scene = document.querySelector('.scene') as HTMLElement | null;
  // Near the edge of the scene, the camera slides along so you can carry them far.
  // It only arms once the pointer has been away from the edges, so picking someone up
  // who stands near the edge does not send the camera flying.
  let armed = false;
  const edgePan = () => {
    const d = useDrag.getState();
    if (scene && d.id) {
      const r = scene.getBoundingClientRect();
      const zone = Math.min(60, r.width * 0.1);
      if (d.x > r.left + zone * 1.6 && d.x < r.right - zone * 1.6) armed = true;
      if (armed && d.x < r.left + zone) panBy(-12);
      else if (armed && d.x > r.right - zone) panBy(12);
      // Let the swing settle when the pointer stops.
      if (performance.now() - lastT > 50 && Math.abs(d.vx) > 0.01) useDrag.setState({ vx: d.vx * 0.82 });
    }
    raf = requestAnimationFrame(edgePan);
  };
  const move = (ev: PointerEvent) => {
    if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
      dragging = true;
      useGame.getState().pick(null);
      sfx.pickup();
      useDrag.setState({ sel: null, line: lineFor(crewId) });
      raf = requestAnimationFrame(edgePan);
    }
    if (!dragging) return;
    if (ev.cancelable) ev.preventDefault();
    const now = performance.now();
    const vx = (ev.clientX - lastX) / Math.max(8, now - lastT);
    lastX = ev.clientX;
    lastT = now;
    const over = resolveDrop(crewId, ev.clientX, ev.clientY);
    const prev = useDrag.getState();
    const ok = !!over;
    const onGround = !!over && over.startsWith('ground:');
    if (over && (onGround ? !prev.over?.startsWith('ground:') : over !== prev.over)) sfx.hover();
    useDrag.setState({ id: crewId, x: ev.clientX, y: ev.clientY, vx: prev.vx * 0.6 + vx * 0.4, over, ok, ground: onGround ? ev.clientX : null });
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    cancelAnimationFrame(raf);
    if (!dragging) return; // a tap: the click handler picks them
    const over = resolveDrop(crewId, ev.clientX, ev.clientY);
    const under = targetAt(ev.clientX, ev.clientY);
    useDrag.setState({ id: null, over: null, ok: false, vx: 0, ground: null });
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 0);
    // Put back where they were: a gentle landing, no fuss.
    if (sameSpot(crewId, under)) { sfx.land(); return; }
    if (over && sendTo(crewId, over)) return;
    // A bad drop: they bounce back home, shaking their head.
    useDrag.setState({ back: { id: crewId, x: ev.clientX, y: ev.clientY, at: Date.now() } });
    refuse(crewId);
  };
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
