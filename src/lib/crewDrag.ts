import { create } from 'zustand';
import { MODULE_NAME, assign, canGoOut, habReady } from '../engine/engine';
import type { GameState } from '../engine/types';
import { PICKUP } from '../data/characters';
import { useGame } from '../store/game';
import { panBy } from './camera';
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
}
export const useDrag = create<DragState>(() => ({ id: null, sel: null, x: 0, y: 0, vx: 0, over: null, ok: false, line: '', back: null, landed: null, nope: null }));

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

/** Can this astronaut go there right now? */
export function canDrop(crewId: string, target: string, game: GameState | null = useGame.getState().game): boolean {
  if (!game) return false;
  const c = game.crew.find((x) => x.id === crewId);
  if (!c || c.out || c.trip) return false;
  // Out in the crater: a discovery or a rock pile. Anyone rested enough can go.
  if (target.startsWith('find:') || target.startsWith('dep:')) return canGoOut(c);
  if (target === 'pod' && habReady(game)) return false;
  const id = homeId(target);
  if (c.at === id) return false;
  return assign(game, crewId, id) !== game;
}

/** What they would do there, in two or three words. Null if they cannot go. */
export function placeVerb(crewId: string, target: string, game: GameState | null = useGame.getState().game): string | null {
  if (!game || !canDrop(crewId, target, game)) return null;
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
  if (target.startsWith('find:')) g.collect(target.slice(5), crewId);
  else if (target.startsWith('dep:')) g.dig(target.slice(4), crewId);
  else g.assign(crewId, homeId(target));
  const moved = useGame.getState().game !== game;
  if (moved) {
    // The store already played the "off you go" sound.
    useDrag.setState({ landed: { target, at: Date.now() }, sel: null });
    g.pick(null);
  }
  return moved;
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
    const over = targetAt(ev.clientX, ev.clientY);
    const prev = useDrag.getState();
    const ok = !!over && canDrop(crewId, over);
    if (over && over !== prev.over && ok) sfx.hover();
    useDrag.setState({ id: crewId, x: ev.clientX, y: ev.clientY, vx: prev.vx * 0.6 + vx * 0.4, over, ok });
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    cancelAnimationFrame(raf);
    if (!dragging) return; // a tap: the click handler picks them
    const { over, ok } = useDrag.getState();
    useDrag.setState({ id: null, over: null, ok: false, vx: 0 });
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 0);
    if (over && ok && sendTo(crewId, over)) return;
    // A bad drop: they bounce back home, shaking their head.
    useDrag.setState({ back: { id: crewId, x: ev.clientX, y: ev.clientY, at: Date.now() } });
    refuse(crewId);
  };
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
