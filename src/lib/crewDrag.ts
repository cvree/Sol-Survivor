import { create } from 'zustand';
import { assign } from '../engine/engine';
import { useGame } from '../store/game';
import { panBy } from './camera';

/**
 * Carrying an astronaut to a new job. Press on an astronaut and drag: they follow
 * the pointer, modules that have room glow, and letting go over one sends them there.
 * A press that does not move is still a tap, which opens their card.
 */
interface DragState { id: string | null; x: number; y: number; over: string | null; ok: boolean }
export const useDrag = create<DragState>(() => ({ id: null, x: 0, y: 0, over: null, ok: false }));

let justDragged = false;
/** True right after a drag ends, so the tap that follows is ignored. */
export const wasDragged = () => justDragged;

const moduleAt = (x: number, y: number) => {
  for (const el of document.elementsFromPoint(x, y)) {
    const mod = (el as HTMLElement).closest?.('[data-mod]') as HTMLElement | null;
    if (mod) return mod.dataset.mod ?? null;
  }
  return null;
};

export const canDrop = (crewId: string, moduleId: string) => {
  const game = useGame.getState().game;
  if (!game) return false;
  const id = moduleId === 'pod' ? 'hab' : moduleId;
  const c = game.crew.find((x) => x.id === crewId);
  if (c?.at === id) return true;
  return assign(game, crewId, id) !== game;
};

export function startCrewDrag(e: React.PointerEvent, crewId: string) {
  if (e.button !== 0 || useGame.getState().tour !== null) return;
  const sx = e.clientX;
  const sy = e.clientY;
  let dragging = false;
  let raf = 0;
  const scene = document.querySelector('.scene') as HTMLElement | null;
  // Near the edge of the scene, the camera slides along so you can carry them far.
  const edgePan = () => {
    const d = useDrag.getState();
    if (scene && d.id) {
      const r = scene.getBoundingClientRect();
      if (d.x < r.left + 70) panBy(-14);
      else if (d.x > r.right - 70) panBy(14);
    }
    raf = requestAnimationFrame(edgePan);
  };
  const move = (ev: PointerEvent) => {
    if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
      dragging = true;
      useGame.getState().pick(null);
      raf = requestAnimationFrame(edgePan);
    }
    if (!dragging) return;
    const over = moduleAt(ev.clientX, ev.clientY);
    useDrag.setState({ id: crewId, x: ev.clientX, y: ev.clientY, over, ok: !!over && canDrop(crewId, over) });
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    cancelAnimationFrame(raf);
    if (!dragging) return;
    const { over, ok } = useDrag.getState();
    useDrag.setState({ id: null, over: null, ok: false });
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 0);
    if (over) {
      const game = useGame.getState().game;
      const target = over === 'pod' ? 'hab' : over;
      if (ok && game?.crew.find((c) => c.id === crewId)?.at !== target) useGame.getState().assign(crewId, target);
      else if (!ok) useGame.getState().assign(crewId, over); // explains why not
    }
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
