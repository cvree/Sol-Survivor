import { CLIMB_SPEED, GRID_COLS, LAYER, SOL_SECONDS, WALK_ACCEL, WALK_SPEED, ROVER_SPEED } from '../engine/constants';
import { isFainted, tripPos } from '../engine/engine';
import type { CrewState, GameState, Trip } from '../engine/types';
import { canWander, restingAct } from '../components/crewAct';
import { clockRate, useGame } from '../store/game';
import { follow, useFollow, followTo } from './camera';

/**
 * Where every astronaut (and the rover) really is.
 *
 * Each one has exactly one position in world pixels, owned here and nowhere else. One element
 * draws each of them for the whole mission (`CrewLayer`); this module moves it every animation
 * frame. The engine decides WHERE someone is going (`crew.at`, `crew.trip`); this module walks the
 * body there along a real route (the ground, the corridor, the ladder shafts, through the one
 * airlock door) at one steady speed, with a short speed-up and slow-down, and tells the engine when
 * they arrive (`arrive`, `tripReached`). Every new route starts from where the body is, so a
 * position never jumps: not on a new job, a change of mind, a pick-up, or a drop.
 *
 * Kept free of React. Camera moves only note a goal (`followTo`), never move the camera here.
 */

// ---------- the map: floors, the corridor, ladders, the airlock ----------

/** Which floor a body is standing on. */
export type Loc = 'out' | 'in' | 'under' | 'ladder' | 'door' | 'pod' | 'podstep' | 'free';
const OUTSIDE: Loc[] = ['out', 'pod', 'podstep'];
const INSIDE: Loc[] = ['in', 'under', 'ladder'];

interface Spot { x: number; y: number; loc: Loc }
interface Span { l: number; r: number; y: number; loc: Loc }

export interface Geo {
  W: number;
  /** Floor of the surface domes and the corridor that joins them. */
  yIn: number;
  /** Floor of the rooms dug in below. */
  yUnder: number;
  /** The ground outside, in front of the base. */
  yOut: number;
  /** The airlock door: the only way between inside and outside. */
  door: number;
  /** The corridor inside, from the airlock to the far end of the base. Null before there is a base. */
  hall: [number, number] | null;
  /** One ladder shaft above each dug-in room. */
  shafts: number[];
  /** Dug-in rooms joined by tubes: you can walk along each group without climbing. */
  groups: [number, number][];
  /** The capsule's floor, and the ground in front of it. */
  pod: { x: number; y: number; l: number; r: number } | null;
  pad: number;
  garage: number | null;
  /** Where people stand in each place (module id, or 'pod'). */
  spans: Map<string, Span>;
}

function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let e: HTMLElement | null = el;
  while (e && e !== root) {
    x += e.offsetLeft;
    y += e.offsetTop;
    e = e.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/**
 * Measure the map, in world pixels (ignoring any animation transforms, so it never wobbles).
 * The base grid is worked out from its own box; yard gear and the capsule are measured.
 */
export function measure(game: GameState): Geo | null {
  const world = document.querySelector('.scene .world') as HTMLElement | null;
  const base = world?.querySelector('.base') as HTMLElement | null;
  const dirt = world?.querySelector('.dirt') as HTMLElement | null;
  if (!world || !base || !dirt || !world.offsetWidth) return null;
  const W = world.offsetWidth;
  const b = offsetIn(base, world);
  const cs = getComputedStyle(base);
  const rowH = parseFloat(cs.gridTemplateRows.split(' ')[0]) || 150;
  const rg = parseFloat(cs.rowGap) || 0;
  const cg = parseFloat(cs.columnGap) || 0;
  const colW = (base.offsetWidth - (GRID_COLS - 1) * cg) / GRID_COLS;
  const colL = (c: number) => b.x + c * (colW + cg);
  const ground = dirt.offsetTop;
  const yIn = b.y + rowH * (1 - 0.17);
  const yUnder = b.y + 2 * rowH + rg - rowH * 0.12;
  const yOut = ground + 6;
  const door = b.x - 20;
  const spans = new Map<string, Span>();
  let far = -1;
  const under: number[] = [];
  for (const m of game.modules) {
    if (LAYER[m.kind] === 'yard') continue;
    const col = m.cell % GRID_COLS;
    const row = m.cell < GRID_COLS ? 0 : 1;
    far = Math.max(far, col);
    const l = colL(col);
    if (row === 0) spans.set(m.id, { l: l + colW * 0.18, r: l + colW * 0.82, y: yIn, loc: 'in' });
    else {
      spans.set(m.id, { l: l + colW * 0.1, r: l + colW * 0.48, y: yUnder, loc: 'under' });
      under.push(col);
    }
  }
  under.sort((a, c) => a - c);
  const shafts = under.map((c) => colL(c) + colW / 2);
  const groups: [number, number][] = [];
  for (let i = 0; i < under.length; i++) {
    const start = under[i];
    while (i + 1 < under.length && under[i + 1] === under[i] + 1) i++;
    groups.push([colL(start) + colW * 0.06, colL(under[i]) + colW * 0.94]);
  }
  const hall: [number, number] | null = far >= 0 ? [door, colL(far) + colW * 0.9] : null;
  let garage: number | null = null;
  for (const el of Array.from(world.querySelectorAll<HTMLElement>('.yard .prop-wrap[data-mod]'))) {
    const id = el.dataset.mod!;
    const o = offsetIn(el, world);
    const cx = o.x + el.offsetWidth / 2;
    spans.set(id, { l: cx - 16, r: cx + 16, y: yOut, loc: 'out' });
    if (game.modules.find((m) => m.id === id)?.kind === 'rover') garage = cx;
  }
  const podEl = world.querySelector('.yard .pod') as HTMLElement | null;
  let pod: Geo['pod'] = null;
  if (podEl) {
    const o = offsetIn(podEl, world);
    const cx = o.x + podEl.offsetWidth / 2;
    pod = { x: cx, y: o.y + podEl.offsetHeight - 8, l: cx - 22, r: cx + 22 };
    spans.set('pod', { l: pod.l, r: pod.r, y: pod.y, loc: 'pod' });
  }
  const padEl = world.querySelector('.home > .pad') as HTMLElement | null;
  const pad = padEl ? offsetIn(padEl, world).x + padEl.offsetWidth / 2 : W * 0.75;
  return { W, yIn, yUnder, yOut, door, hall, shafts, groups, pod, pad, garage, spans };
}

/** Engine place id to a standing place: home is the Hab once it is built, the capsule before. */
function placeKey(game: GameState, id: string): string {
  if (id === 'hab' || id === 'pod') return game.modules.some((m) => m.id === 'hab') ? 'hab' : 'pod';
  return id;
}

// ---------- routes ----------

interface Leg { to: Spot; kind: 'walk' | 'climb' | 'step'; during: Loc }
interface Node extends Spot { id: number }

const inGroup = (g: Geo, x: number) => g.groups.findIndex(([l, r]) => x >= l - 2 && x <= r + 2);
const nearestGroup = (g: Geo, x: number) => {
  let best = -1;
  let d = Infinity;
  g.groups.forEach(([l, r], i) => { const e = Math.max(l - x, 0, x - r); if (e < d) { d = e; best = i; } });
  return best;
};

/** Can you walk straight along the floor from a to b? */
function sameFloor(g: Geo, a: Spot, b: Spot): boolean {
  if (a.loc !== b.loc) return false;
  if (a.loc === 'out' || a.loc === 'pod') return true;
  if (a.loc === 'in') return !!g.hall;
  if (a.loc === 'under') { const ga = inGroup(g, a.x) < 0 ? nearestGroup(g, a.x) : inGroup(g, a.x); const gb = inGroup(g, b.x) < 0 ? nearestGroup(g, b.x) : inGroup(g, b.x); return ga === gb; }
  return false;
}

/**
 * The way from where a body is to a spot: along floors, up and down ladders, through the airlock.
 * A tiny graph, searched afresh each time the goal changes; it is always planned from the body's
 * own position, which is what keeps every change of plan smooth.
 */
function plan(g: Geo, from: Spot, to: Spot): Leg[] {
  const nodes: Node[] = [];
  const add = (x: number, y: number, loc: Loc) => { const n = { x, y, loc, id: nodes.length }; nodes.push(n); return n; };
  const start = add(from.x, from.y, from.loc);
  const goal = add(to.x, to.y, to.loc);
  const pairs: [Node, Node, Leg['kind'], Loc][] = [];
  if (g.hall) {
    const di = add(g.door, g.yIn, 'in');
    const dout = add(g.door, g.yOut, 'out');
    pairs.push([di, dout, 'step', 'door']);
    if (from.loc === 'door') pairs.push([start, di, 'step', 'door'], [start, dout, 'step', 'door']);
  }
  if (g.pod) {
    const ps = add(g.pod.x, g.pod.y, 'pod');
    const pg = add(g.pod.x, g.yOut, 'out');
    pairs.push([ps, pg, 'step', 'podstep']);
    if (from.loc === 'podstep') pairs.push([start, ps, 'step', 'podstep'], [start, pg, 'step', 'podstep']);
  }
  let nearShaft = -1;
  g.shafts.forEach((x, i) => {
    const top = add(x, g.yIn, 'in');
    const bot = add(x, g.yUnder, 'under');
    pairs.push([top, bot, 'climb', 'ladder']);
    if (from.loc === 'ladder' && (nearShaft < 0 || Math.abs(x - from.x) < Math.abs(g.shafts[nearShaft] - from.x))) nearShaft = i;
  });
  if (nearShaft >= 0) {
    const x = g.shafts[nearShaft];
    const top = nodes.find((n) => n.x === x && n.loc === 'in' && n.y === g.yIn)!;
    const bot = nodes.find((n) => n.x === x && n.loc === 'under')!;
    pairs.push([start, top, 'climb', 'ladder'], [start, bot, 'climb', 'ladder']);
  }
  // Floors: anyone on the same floor can walk straight there.
  for (const a of nodes) for (const b of nodes) if (a.id < b.id && sameFloor(g, a, b)) pairs.push([a, b, 'walk', a.loc]);
  // Somewhere the map does not cover (a room that was just packed up): walk to the nearest way on.
  if (from.loc === 'free' || !nodes.some((n) => n !== start && pairs.some(([a, b]) => (a === start && b === n) || (b === start && a === n)))) {
    for (const n of nodes) if (n !== start) pairs.push([start, n, 'walk', 'free']);
  }
  const cost = (a: Node, b: Node, kind: Leg['kind'], during: Loc) => {
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    return (kind === 'climb' ? d / CLIMB_SPEED : d / WALK_SPEED) * (during === 'free' ? 3 : 1);
  };
  const edges = new Map<number, { to: Node; kind: Leg['kind']; during: Loc; c: number }[]>();
  for (const [a, b, kind, during] of pairs) {
    const c = cost(a, b, kind, during);
    edges.set(a.id, [...(edges.get(a.id) ?? []), { to: b, kind, during, c }]);
    edges.set(b.id, [...(edges.get(b.id) ?? []), { to: a, kind, during, c }]);
  }
  const dist = nodes.map(() => Infinity);
  const prev: ({ from: Node; kind: Leg['kind']; during: Loc } | null)[] = nodes.map(() => null);
  const done = nodes.map(() => false);
  dist[start.id] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === goal.id) break;
    done[u] = true;
    for (const e of edges.get(u) ?? []) {
      if (dist[u] + e.c < dist[e.to.id]) { dist[e.to.id] = dist[u] + e.c; prev[e.to.id] = { from: nodes[u], kind: e.kind, during: e.during }; }
    }
  }
  if (dist[goal.id] === Infinity) return [{ to, kind: 'walk', during: 'free' }];
  const legs: Leg[] = [];
  for (let n: Node = goal; n !== start;) {
    const p = prev[n.id]!;
    legs.unshift({ to: { x: n.x, y: n.y, loc: n.loc }, kind: p.kind, during: p.during });
    n = p.from;
  }
  return legs.filter((l, i) => i === legs.length - 1 || Math.hypot(l.to.x - (i ? legs[i - 1].to.x : from.x), l.to.y - (i ? legs[i - 1].to.y : from.y)) > 0.01);
}

// ---------- bodies ----------

interface Body {
  id: string;
  rover: boolean;
  x: number;
  y: number;
  loc: Loc;
  /** Speed along the route right now, px per second of walking time. */
  v: number;
  face: 1 | -1;
  legs: Leg[];
  goal: Spot | null;
  mode: 'free' | 'carried' | 'drop';
  /** Carried: the pointer, in screen pixels. */
  px: number;
  py: number;
  swing: number;
  vy: number;
  land: Spot | null;
  bad: boolean;
  /** Seconds to stand still (landing, a head shake). */
  hold: number;
  /** Seconds to stand before strolling somewhere else in the room. */
  wait: number;
  wander: number | null;
  slot: string;
  el: HTMLElement | null;
  trail: HTMLElement | null;
  /** For the trip tracker: how long this part of the trip is, and the key of that part. */
  legKey: string;
  legLen: number;
  shakeUntil: number;
  landedAt: number;
  /** Did they move this frame? The walk cycle only plays while they really move. */
  stepped: boolean;
}

const bodies = new Map<string, Body>();
let seed = -1;
let geo: Geo | null = null;
let lastW = 0;

/** How far a body's feet hang below the finger while carried. */
const HANG = 46;
const FALL_G = 1600;
const FALL_MAX = 470;
const LIFT = 320;
/** However fast the finger or a slow frame, a body never moves more than this in one frame. */
const STEP_MAX = 9;

function newBody(id: string, at: Spot): Body {
  return { id, rover: id === 'rover', x: at.x, y: at.y, loc: at.loc, v: 0, face: 1, legs: [], goal: null, mode: 'free', px: 0, py: 0, swing: 0, vy: 0, land: null, bad: false, hold: 0, wait: 1 + Math.random() * 3, wander: null, slot: '', el: null, trail: null, legKey: '', legLen: 1, shakeUntil: 0, landedAt: 0, stepped: false };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Every crew member's standing place in a room, and their spot among the people there. */
function slotsOf(game: GameState) {
  const by = new Map<string, string[]>();
  for (const c of game.crew) {
    if (c.out) continue;
    let place: string | null = null;
    if (!c.trip) place = c.at;
    else if (c.trip.phase === 'back') place = c.trip.then ?? 'hab';
    if (!place) continue;
    const key = placeKey(game, place);
    by.set(key, [...(by.get(key) ?? []), c.id]);
  }
  const out = new Map<string, { place: string; i: number; n: number }>();
  for (const [place, ids] of by) ids.forEach((id, i) => out.set(id, { place, i, n: ids.length }));
  return out;
}

/** A spot out in the crater for a trip. People heading to the same spot stand a little apart. */
function craterSpot(g: Geo, game: GameState, t: Trip, who: string): Spot {
  const i = game.crew.findIndex((c) => c.id === who);
  return { x: clamp(t.x * g.W + (who === 'rover' ? 0 : ((i % 3) - 1) * 16), 30, g.W - 30), y: g.yOut, loc: 'out' };
}

/** Where this body should be heading right now, worked out from the engine's state. */
function goalOf(b: Body, game: GameState, g: Geo, slots: ReturnType<typeof slotsOf>, dt: number, partying: boolean): Spot | null {
  if (b.rover) {
    const t = game.rover?.trip;
    if (t && t.phase !== 'back') return craterSpot(g, game, t, 'rover');
    return { x: g.garage ?? g.pad, y: g.yOut, loc: 'out' };
  }
  const c = game.crew.find((x) => x.id === b.id);
  if (!c) return null;
  if (c.trip && c.trip.phase !== 'back') { b.wander = null; return craterSpot(g, game, c.trip, c.id); }
  const s = slots.get(c.id);
  if (!s) return null;
  const span = g.spans.get(s.place);
  if (!span) return null;
  const w = (span.r - span.l) / s.n;
  const mid = span.l + w * (s.i + 0.5);
  const slot = `${s.place}:${s.i}/${s.n}`;
  if (slot !== b.slot) { b.slot = slot; b.wander = null; }
  // Settled in and nothing to do: stroll about their part of the room now and then.
  const settled = !c.trip && c.arriving <= 0 && !b.legs.length && b.mode === 'free';
  const free = settled && canWander(restingAct(c, game, partying)) && !c.exhausted && !isFainted(c) && w > 34;
  if (!free) { if (!settled || !canWander(restingAct(c, game, partying))) b.wander = null; }
  else {
    b.wait -= dt;
    if (b.wait <= 0) {
      const reach = Math.min(w / 2 - 8, 46);
      b.wander = mid + (Math.random() * 2 - 1) * reach;
      b.wait = 2.2 + Math.random() * 3.5;
    }
  }
  return { x: b.wander ?? mid, y: span.y, loc: span.loc };
}

/** Where a body would first appear: walking over from the lander, out on a trip, or in their room. */
function spawnSpot(id: string, game: GameState, g: Geo): Spot | null {
  if (id === 'rover') {
    const t = game.rover?.trip;
    return { x: t ? clamp(tripPos(t) * g.W, 30, g.W - 30) : g.garage ?? g.pad, y: g.yOut, loc: 'out' };
  }
  const c = game.crew.find((x) => x.id === id);
  if (!c) return null;
  if (c.walkFrom === 'pad' && c.arriving > 0) return { x: g.pad, y: g.yOut, loc: 'out' };
  if (c.trip && c.arriving <= 0) return { x: clamp(tripPos(c.trip) * g.W, 30, g.W - 30), y: g.yOut, loc: 'out' };
  const span = g.spans.get(placeKey(game, c.trip ? 'hab' : c.at));
  if (!span) return null;
  const s = slotsOf(game).get(c.id);
  const k = s ? (s.i + 0.5) / s.n : 0.5;
  return { x: span.l + (span.r - span.l) * k, y: span.y, loc: span.loc };
}

/** The speed allowed at the end of leg i: slow for a turn or a ladder, a stop at the very end. */
function endSpeed(legs: Leg[], i: number, top: number, climb: number): number {
  const a = legs[i];
  const b = legs[i + 1];
  if (!b) return 0;
  const vmax = (l: Leg) => (l.kind === 'climb' ? climb : l.kind === 'step' ? top * 0.6 : top);
  const turn = (a.kind === 'climb') !== (b.kind === 'climb') || a.kind === 'step' || b.kind === 'step';
  return Math.min(vmax(a), vmax(b), turn ? Math.min(climb, 40) : Infinity);
}

/** Walk along the route for dt seconds of walking time. */
function advance(b: Body, dt: number, top: number, climb: number) {
  let left = dt;
  let guard = 0;
  while (b.legs.length && left > 1e-6 && guard++ < 20) {
    const leg = b.legs[0];
    const dx = leg.to.x - b.x;
    const dy = leg.to.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.01) { b.loc = leg.to.loc; b.legs.shift(); continue; }
    const vmax = leg.kind === 'climb' ? climb : leg.kind === 'step' ? top * 0.6 : top;
    const vEnd = endSpeed(b.legs, 0, top, climb);
    const brake = Math.sqrt(vEnd * vEnd + 2 * WALK_ACCEL * d);
    b.v = Math.max(Math.min(vmax, brake, b.v + WALK_ACCEL * left), 14);
    if (Math.abs(dx) > 0.3 && leg.kind !== 'climb') b.face = dx < 0 ? -1 : 1;
    const go = b.v * left;
    if (go >= d) {
      b.x = leg.to.x;
      b.y = leg.to.y;
      b.loc = leg.to.loc;
      left -= d / b.v;
      b.legs.shift();
    } else {
      b.x += (dx / d) * go;
      b.y += (dy / d) * go;
      b.loc = leg.during;
      left = 0;
    }
  }
  if (!b.legs.length) b.v = 0;
}

/** World pixels under a point on the screen. */
function toWorld(cx: number, cy: number): { x: number; y: number } | null {
  const world = document.querySelector('.scene .world') as HTMLElement | null;
  if (!world || !world.offsetWidth) return null;
  const r = world.getBoundingClientRect();
  const k = r.width / world.offsetWidth || 1;
  return { x: (cx - r.left) / k, y: (cy - r.top) / k };
}

/** Where a body lands when let go here: the floor right below, or the nearest floor. */
function landingSpot(g: Geo, x: number, y: number): Spot {
  const c: Spot[] = [{ x: clamp(x, 30, g.W - 30), y: g.yOut, loc: 'out' }];
  if (g.hall && x >= g.hall[0] + 6 && x <= g.hall[1]) c.push({ x, y: g.yIn, loc: 'in' });
  const gi = inGroup(g, x);
  if (gi >= 0) c.push({ x: clamp(x, g.groups[gi][0] + 4, g.groups[gi][1] - 4), y: g.yUnder, loc: 'under' });
  const below = c.filter((s) => s.y >= y - 12).sort((a, b) => a.y - b.y);
  if (below.length) return below[0];
  return c.sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
}

// ---------- what the rest of the game calls ----------

const els = new Map<string, HTMLElement>();
const trails = new Map<string, HTMLElement>();

/** Make a body for anyone on screen who has none yet, where they first appear. */
function ensure(id: string, game: GameState, g: Geo): Body | null {
  let b = bodies.get(id);
  if (!b) {
    const at = spawnSpot(id, game, g);
    if (!at) return null;
    b = newBody(id, at);
    bodies.set(id, b);
  }
  b.el = els.get(id) ?? null;
  b.trail = trails.get(id) ?? null;
  return b;
}

/** Connect a body's element. The element is placed straight away, so it never shows at the corner. */
export function bind(id: string, el: HTMLElement | null) {
  if (el) els.set(id, el); else els.delete(id);
  const game = useGame.getState().game;
  if (!el || !game) return;
  if (game.seed !== seed) { seed = game.seed; bodies.clear(); }
  const g = measure(game);
  if (g && !bodies.size) lastW = g.W;
  geo = g ?? geo;
  const b = geo ? ensure(id, game, geo) : null;
  if (b) draw(b);
  else el.style.visibility = 'hidden';
}
export function bindTrail(id: string, el: HTMLElement | null) {
  if (el) trails.set(id, el); else trails.delete(id);
  const b = bodies.get(id);
  if (b) b.trail = el;
}

/** Picked up by hand: they lift toward the finger and dangle there. */
export function pickUp(id: string, cx: number, cy: number) {
  const b = bodies.get(id);
  if (!b) return;
  b.mode = 'carried';
  b.legs = [];
  b.v = 0;
  b.px = cx;
  b.py = cy;
  b.wander = null;
}
export function carry(id: string, cx: number, cy: number) {
  const b = bodies.get(id);
  if (!b || b.mode !== 'carried') return;
  b.px = cx;
  b.py = cy;
}
/** Let go: a small drop onto the floor below the finger. A bad drop ends in a head shake. */
export function putDown(id: string, bad: boolean) {
  const b = bodies.get(id);
  if (!b || b.mode !== 'carried' || !geo) return;
  b.mode = 'drop';
  b.vy = 0;
  b.bad = bad;
  // Set down right below where the finger let go.
  const p = toWorld(b.px, b.py);
  b.land = landingSpot(geo, p ? p.x : b.x, p ? p.y + HANG : b.y);
}
/** A shake of the head where they stand (for a tap on a place they cannot go). */
export function shake(id: string) {
  const b = bodies.get(id);
  if (b) b.shakeUntil = performance.now() + 600;
}

/** Where a body is, in world pixels (for the camera and the trip tracker). */
export function positionOf(id: string): { x: number; y: number } | null {
  const b = bodies.get(id);
  return b ? { x: b.x, y: b.y } : null;
}
/** How far along the current part of a trip they are, 0 to 1. */
export function tripProgress(id: string): number {
  const b = bodies.get(id);
  if (!b || !b.legs.length) return 1;
  let left = 0;
  let px = b.x;
  let py = b.y;
  for (const l of b.legs) { left += Math.hypot(l.to.x - px, l.to.y - py); px = l.to.x; py = l.to.y; }
  return clamp(1 - left / Math.max(1, b.legLen), 0, 1);
}
/** Is this body walking right now? */
export const isMoving = (id: string) => { const b = bodies.get(id); return !!b && (b.legs.length > 0 || b.mode !== 'free'); };

function routeLength(b: Body) {
  let n = 0;
  let px = b.x;
  let py = b.y;
  for (const l of b.legs) { n += Math.hypot(l.to.x - px, l.to.y - py); px = l.to.x; py = l.to.y; }
  return n;
}

function draw(b: Body) {
  const el = b.el;
  if (!el) return;
  el.style.visibility = '';
  el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0)`;
  el.dataset.x = b.x.toFixed(2);
  el.dataset.y = b.y.toFixed(2);
  const moving = b.mode === 'free' && b.stepped;
  const climbing = moving && b.loc === 'ladder';
  el.classList.toggle('moving', moving && !climbing);
  el.classList.toggle('climb', climbing);
  el.classList.toggle('face-left', b.face < 0);
  el.classList.toggle('carried', b.mode === 'carried');
  el.classList.toggle('falling', b.mode === 'drop');
  el.classList.toggle('outside', OUTSIDE.includes(b.loc) || b.loc === 'door');
  el.classList.toggle('shaking', performance.now() < b.shakeUntil);
  el.classList.toggle('landing', performance.now() - b.landedAt < 450);
  el.style.setProperty('--swing', `${b.swing.toFixed(1)}deg`);
}

// ---------- the frame loop ----------

let raf = 0;
let last = 0;

function frame(now: number) {
  raf = requestAnimationFrame(frame);
  // A stalled frame (a busy device) slows the walk for that frame rather than letting anyone leap.
  const real = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  const st = useGame.getState();
  const game = st.game;
  if (!game) { bodies.clear(); return; }
  // A new mission: everyone starts again where the new mission puts them.
  if (game.seed !== seed) { seed = game.seed; bodies.clear(); }
  const g = measure(game);
  if (!g) return;
  // The screen was resized (or first measured): the whole world was redrawn at a new size, so
  // everyone is put back where the engine says they are. This is the one time a body is placed
  // rather than walked, and it only happens when the window itself changes size.
  if (lastW && Math.abs(g.W - lastW) > 0.5) {
    for (const b of bodies.values()) {
      // (Bodies made before the first real measurement are placed now too.)
      const at = b.mode === 'free' ? spawnSpot(b.id, game, g) : null;
      if (at) { b.x = at.x; b.y = at.y; b.loc = at.loc; }
      else b.x *= g.W / lastW;
      b.legs = [];
      b.goal = null;
      b.v = 0;
    }
  }
  lastW = g.W;
  geo = g;
  // Walking runs on the game clock: it stops when the clock stops, and keeps step with 2x speed.
  const rate = clockRate(st) * (SOL_SECONDS.easy / SOL_SECONDS[game.difficulty]);
  const dt = real * rate;
  const partying = Date.now() - st.party < 3200;
  const slots = slotsOf(game);
  const followId = useFollow.getState().id;
  const alive = new Set(game.crew.filter((c) => !c.out).map((c) => c.id));
  if (game.rover) alive.add('rover');
  for (const id of bodies.keys()) if (!alive.has(id) || !els.has(id)) bodies.delete(id);
  for (const id of els.keys()) if (alive.has(id)) ensure(id, game, g);

  for (const b of bodies.values()) {
    const c = b.rover ? null : game.crew.find((x) => x.id === b.id) ?? null;
    const t = b.rover ? game.rover?.trip ?? null : c?.trip ?? null;
    if (b.mode === 'carried') {
      const p = toWorld(b.px, b.py);
      if (p) {
        // Lift toward the hand smoothly, then follow it.
        const tx = p.x;
        const ty = p.y + HANG;
        const k = 1 - Math.exp(-real * 22);
        const nx = b.x + (tx - b.x) * k;
        const ny = b.y + (ty - b.y) * k;
        const cap = Math.min(STEP_MAX, 560 * real);
        const d = Math.hypot(nx - b.x, ny - b.y);
        const vx = (nx - b.x) / Math.max(real, 1e-3);
        if (d > cap) { b.x += ((nx - b.x) / d) * cap; b.y += ((ny - b.y) / d) * cap; }
        else { b.x = nx; b.y = ny; }
        b.swing += (clamp(-vx * 0.06, -30, 30) - b.swing) * Math.min(1, real * 8);
        b.loc = 'free';
      }
    } else if (b.mode === 'drop' && b.land) {
      // A small drop and land, like being set down. Never faster than a body can fall in one frame.
      const L = b.land;
      const dx = L.x - b.x;
      b.x += Math.sign(dx) * Math.min(Math.abs(dx), LIFT * real, STEP_MAX * 0.7);
      if (b.y < L.y) { b.vy = Math.min(FALL_MAX, b.vy + FALL_G * real); b.y = Math.min(L.y, b.y + Math.min(b.vy * real, STEP_MAX * 0.7)); }
      else b.y = Math.max(L.y, b.y - Math.min(LIFT * real, STEP_MAX * 0.7));
      b.swing *= Math.max(0, 1 - real * 10);
      if (Math.abs(b.x - L.x) < 0.01 && Math.abs(b.y - L.y) < 0.01) {
        b.mode = 'free';
        b.loc = L.loc;
        b.land = null;
        b.swing = 0;
        b.landedAt = performance.now();
        b.hold = b.bad ? 0.7 : 0.18;
        if (b.bad) b.shakeUntil = performance.now() + 650;
        b.goal = null;
      }
    } else {
      if (b.hold > 0) b.hold -= real;
      const goal = goalOf(b, game, g, slots, dt, partying);
      if (goal) {
        if (!b.goal || Math.abs(goal.x - b.goal.x) > 0.75 || Math.abs(goal.y - b.goal.y) > 0.75 || goal.loc !== b.goal.loc) {
          const before = b.legs[0];
          b.legs = Math.hypot(goal.x - b.x, goal.y - b.y) < 0.5 && goal.loc === b.loc ? [] : plan(g, { x: b.x, y: b.y, loc: b.loc }, goal);
          b.goal = goal;
          // Turning round: stop and turn, then speed up again.
          const now0 = b.legs[0];
          if (before && now0) {
            const a = { x: before.to.x - b.x, y: before.to.y - b.y };
            const n = { x: now0.to.x - b.x, y: now0.to.y - b.y };
            if (a.x * n.x + a.y * n.y < 0) b.v = 0;
          }
          const key = t ? `${t.phase}:${t.x}:${c?.arriving && c.arriving > 0 ? 'leave' : ''}` : `walk:${goal.x.toFixed(0)}`;
          if (key !== b.legKey) { b.legKey = key; b.legLen = routeLength(b); }
        }
      }
      const frozen = !!c && (c.exhausted || isFainted(c));
      const x0 = b.x;
      const y0 = b.y;
      if (!frozen && b.hold <= 0 && dt > 0) {
        const speed = b.rover ? WALK_SPEED * ROVER_SPEED : WALK_SPEED;
        advance(b, dt, speed, b.rover ? speed : CLIMB_SPEED);
      }
      if (frozen) b.v = 0;
      b.stepped = Math.hypot(b.x - x0, b.y - y0) > 0.01;
      // Tell the engine what happened. It is the engine that starts the work.
      if (st.game === game && b.hold <= 0 && !frozen) report(b, c, t, game);
    }
    // The camera walks along with whoever it is following, and lets go once they are home.
    if (followId === b.id) {
      if (t) followTo(b.x);
      else follow(null);
    }
    if (b.trail) {
      const to = t && t.phase !== 'back' ? clamp(t.x * g.W, 30, g.W - 30) : g.door;
      b.trail.style.left = `${Math.min(b.x, to)}px`;
      b.trail.style.width = `${Math.abs(to - b.x)}px`;
      b.trail.style.opacity = Math.abs(to - b.x) > 6 && t ? '' : '0';
    }
    draw(b);
  }
}

function report(b: Body, c: CrewState | null, t: Trip | null, game: GameState) {
  const at = !b.legs.length && !!b.goal && Math.hypot(b.goal.x - b.x, b.goal.y - b.y) < 1;
  const st = useGame.getState();
  if (b.rover) {
    if (t && t.phase !== 'work' && at) st.tripReached('rover');
    return;
  }
  if (!c || c.out) return;
  if (t) {
    // Out through the airlock (or already outside): the crater walk begins.
    if (c.arriving > 0) { if (OUTSIDE.includes(b.loc)) st.tripReached(c.id); return; }
    if (t.phase === 'out' && at) st.tripReached(c.id);
    // Back in through the airlock, or home if home is outside (the capsule, the yard).
    else if (t.phase === 'back' && (INSIDE.includes(b.loc) || at)) st.tripReached(c.id);
    return;
  }
  if (c.arriving > 0 && at && game.status === 'playing') st.arrive(c.id);
}

export function startMovement() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
export function stopMovement() {
  cancelAnimationFrame(raf);
  raf = 0;
}
/** For test scripts: everyone's position and route. */
export const debugBodies = () => [...bodies.values()].map((b) => ({ id: b.id, x: b.x, y: b.y, loc: b.loc, v: b.v, mode: b.mode, legs: b.legs.map((l) => ({ ...l.to, kind: l.kind })), goal: b.goal }));
export const debugGeo = () => geo;
/** Forget everyone (a new mission). */
export function resetBodies() { bodies.clear(); seed = -1; lastW = 0; }
