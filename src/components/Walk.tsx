import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import type { CrewState, GameState } from '../engine/types';
import { placeVerb, sendTo, tapPlace, useDrag, useHolding } from '../lib/crewDrag';
import { useGame } from '../store/game';
import { Astronaut } from './art';
import { lookOf } from './crewLook';

/**
 * A glowing drop zone over a place an astronaut could go, with what they would do there.
 * Only shows while an astronaut is being carried or has been picked with a tap.
 */
export function DropZone({ id, game }: { id: string; game: GameState }) {
  const holding = useHolding();
  const over = useDrag((d) => (d.id ? d.over : null));
  if (!holding) return null;
  const verb = placeVerb(holding, id, game);
  if (!verb) return null;
  const go = () => tapPlace(id);
  return (
    <span role="button" tabIndex={0} className={`drop-zone no-drag ${over === id ? 'hot' : ''}`} data-mod={id}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); go(); }}
      onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go(); } }}
      aria-label={`${verb} here`}>
      <b className="drop-label">{verb}</b>
    </span>
  );
}

/** Light up the places an astronaut can go, and dim the ones they cannot. */
export function useDropClass(id: string, game: GameState): string {
  const holding = useHolding();
  if (!holding) return '';
  return placeVerb(holding, id, game) ? 'drop-can' : 'drop-dim';
}

/** A puff of dust and a ring where an astronaut was just sent. */
export function LandPuff({ id }: { id: string }) {
  const landed = useDrag((d) => (d.landed?.target === id ? d.landed.at : 0));
  if (!landed || Date.now() - landed > 900) return null;
  return (
    <span key={landed} className="drop-puff" aria-hidden="true">
      <i /><i /><i /><i /><i />
    </span>
  );
}

/** The best astronaut to send to a building site: rested, free, and not already building. */
export function bestBuilder(game: GameState): CrewState | null {
  const free = game.crew.filter((c) => !c.out && !c.trip && !c.exhausted && c.energy > 25 && !game.modules.some((m) => m.id === c.at && m.buildLeft > 0));
  free.sort((a, b) => (a.at === 'hab' ? 0 : 1) - (b.at === 'hab' ? 0 : 1) || b.energy - a.energy);
  return free[0] ?? null;
}

/** One tap sends the best free astronaut to build this site. */
export function SendBuilder({ siteId, game }: { siteId: string; game: GameState }) {
  const who = bestBuilder(game);
  const holding = useHolding();
  if (!who || holding) return null;
  return (
    <button className="send-btn no-drag" onClick={(e) => { e.stopPropagation(); sendTo(who.id, siteId); }}
      aria-label={`Send ${who.name} to build it`}>
      <span className="send-face"><Astronaut who={who} look={lookOf(who)} bust size={26} /></span>
      Send {who.name}
    </button>
  );
}

// ---------- walking around the base ----------

interface Pt { x: number; y: number }
interface Anchor extends Pt { under: boolean; shaft: number }

/** Where a place is on screen, relative to the base: the middle of its floor. */
function anchorOf(home: DOMRect, id: string): Anchor | null {
  const pick = (sel: string) => document.querySelector(sel) as HTMLElement | null;
  // Coming home from the crater: they walk in from the middle of the base.
  if (id === 'out') return { x: home.width / 2, y: groundY(home), under: false, shaft: home.width / 2 };
  const floor = (id === 'hab' ? pick('.mod[data-mod="hab"] .mod-floor') : pick(`.mod[data-mod="${id}"] .mod-floor`) ?? pick(`.prop-wrap[data-mod="${id}"] .prop-floor`))
    ?? pick('.pod .pod-floor');
  if (!floor) return null;
  const r = floor.getBoundingClientRect();
  const room = floor.closest('.mod') as HTMLElement | null;
  const under = !!room?.classList.contains('under');
  const rr = room?.getBoundingClientRect() ?? r;
  return { x: r.left + r.width / 2 - home.left, y: r.bottom - home.top, under, shaft: rr.left + rr.width / 2 - home.left };
}

function groundY(home: DOMRect) {
  const dirt = document.querySelector('.scene .dirt') as HTMLElement | null;
  return dirt ? dirt.getBoundingClientRect().top - home.top + 2 : home.height * 0.46;
}

/** The way there: along the ground, and down the ladder shaft for rooms dug in below. */
function pathOf(home: DOMRect, from: string, to: string): Pt[] | null {
  const a = anchorOf(home, from);
  const b = anchorOf(home, to);
  if (!a || !b) return null;
  const g = groundY(home);
  const pts: Pt[] = [{ x: a.x, y: a.y }];
  if (a.under) { pts.push({ x: a.shaft, y: a.y }, { x: a.shaft, y: g }); }
  if (b.under) { pts.push({ x: b.shaft, y: g }, { x: b.shaft, y: b.y }); }
  pts.push({ x: b.x, y: b.y });
  return pts;
}

/** A point part-way along a path, and whether that part is a ladder. */
function along(pts: Pt[], k: number): { p: Pt; dir: number; climb: boolean } {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let d = Math.max(0, Math.min(1, k)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const t = lens[i] ? Math.min(1, d / lens[i]) : 1;
      const a = pts[i];
      const b = pts[i + 1];
      return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, dir: Math.sign(b.x - a.x), climb: Math.abs(b.y - a.y) > Math.abs(b.x - a.x) };
    }
    d -= lens[i];
  }
  return { p: pts[pts.length - 1], dir: 0, climb: false };
}

/** Is this astronaut on their way somewhere inside the base right now? */
export const walking = (c: CrewState) => !c.out && !c.trip && c.arriving > 0 && c.walkTotal > 0;

/**
 * Astronauts on their way to a new job, walking along the surface and climbing the ladder.
 * The walk takes exactly as long as the engine's `arriving` time, so the picture matches the rules:
 * work starts the moment they get there.
 */
export function CrewWalkers({ game }: { game: GameState }) {
  const layer = useRef<HTMLDivElement>(null);
  const movers = game.crew.filter(walking);
  useLayoutEffect(() => {
    const el = layer.current;
    const home = el?.parentElement?.getBoundingClientRect();
    if (!el || !home) return;
    for (const node of Array.from(el.children) as HTMLElement[]) {
      const c = game.crew.find((x) => x.id === node.dataset.crew);
      if (!c) continue;
      const pts = pathOf(home, c.walkFrom, c.at);
      if (!pts) { node.style.opacity = '0'; continue; }
      const { p, dir, climb } = along(pts, 1 - c.arriving / c.walkTotal);
      node.style.opacity = '1';
      node.style.transform = `translate(${p.x}px, ${p.y}px)`;
      node.classList.toggle('climb', climb);
      node.classList.toggle('face-left', !climb && dir < 0);
    }
  });
  return (
    <div ref={layer} className="crew-walkers" aria-hidden="true">
      {movers.map((c) => (
        <div key={c.id} className="crew-walker" data-crew={c.id} style={{ opacity: 0 }}>
          <span className="cw-body"><Astronaut who={c} look={lookOf(c)} size={44} act="idle" /></span>
          <span className="cw-dust" />
        </div>
      ))}
    </div>
  );
}

/** Is an astronaut picked with a tap? Show who, and what to do next. */
export function useSelected(game: GameState) {
  const sel = useDrag((d) => d.sel);
  return game.crew.find((c) => c.id === sel && !c.out) ?? null;
}

/** Keyboard: Escape puts a picked astronaut back down. */
export function cancelOnEscape(e: globalThis.KeyboardEvent) {
  if (e.key === 'Escape' && useDrag.getState().sel) { useDrag.setState({ sel: null }); useGame.getState().pick(null); }
}
