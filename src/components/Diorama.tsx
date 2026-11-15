import { useEffect, useRef, type CSSProperties } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Hammer, Plus, Wrench } from 'lucide-react';
import { BATTERY_OUTPUT, BUILD_SOLS, GRID_COLS, LAYER, MAX_LEVEL, PATCHABLE, POWER_COST, SOLAR_OUTPUT, WORK_SLOTS } from '../engine/constants';
import { MODULE_NAME, SPECIALIST, activeEvents, buildableCells, domeZone, habReady, isNight, isPatched, moveTargets, power, staffing, stormDose, workersIn } from '../engine/engine';
import { Deposits, Walkers } from './World';
import { LevelDeco, LevelStars } from './LevelDeco';
import type { CrewState, GameState, ModuleKind, ModuleState } from '../engine/types';
import { useGame } from '../store/game';
import { Astronaut, Lander, MODULE_ICON, Rover, type Act } from './art';
import { lookOf } from './crewLook';
import { ModuleArt } from './moduleArt';
import { nearness } from './StormFuse';
import { stepOf } from './coach';
import { canDrop, startCrewDrag, useDrag, wasDragged } from '../lib/crewDrag';
import { EdgeArrows, MiniMap } from './Explore';
import { Finds, MountSharp, useOpenFinds } from './Finds';
import { attachDrag, glideTo, homeX, jumpHome, setView, useCamera } from '../lib/camera';
import { ArrowUpCircle, Check, CloudLightning, LayoutGrid, Move, Package, Rocket, Star } from 'lucide-react';

export const MODULE_JOB: Record<ModuleKind, string> = {
  pod: `Warm, cramped, +3 power`,
  miner: 'Digs bricks into a bin. Tap to collect',
  rover: 'A rover that fetches finds and digs, no tiring',
  hab: 'Heat and beds',
  solar: `+${SOLAR_OUTPUT} power from sun`,
  battery: `+${BATTERY_OUTPUT} power, dust-proof`,
  oxygen: 'Makes air',
  hydro: 'Grows fresh food',
  dome: 'Blocks radiation',
  medbay: 'Heals the sick',
  lab: 'Speeds up landers',
  comms: 'Earlier warnings',
};

const place = (cell: number) => ({ gridColumn: (cell % GRID_COLS) + 1, gridRow: cell < GRID_COLS ? 1 : 2 });

/** What this astronaut is busy with: their job in this room, or a little human moment. */
function actFor(c: CrewState, m: ModuleState | undefined, game: GameState, mates: number, index: number, partying: boolean): Act {
  if (c.exhausted) return c.at === 'hab' ? 'sleep' : 'collapse';
  if (partying) return 'jump';
  if (!m) return 'idle';
  if (m.buildLeft > 0) return 'wrench';
  if (m.kind === 'hab' && (c.energy < 97 || isNight(game))) return 'sleep';
  const t = game.time;
  // Two people in one room say hello now and then.
  if (mates > 1 && (t * 0.55 + m.cell * 0.37 + index * 0.08) % 1 < 0.13) return 'wave';
  if (!m.on) return 'idle';
  switch (m.kind) {
    case 'lab': return 'type';
    case 'hydro': return 'water';
    case 'oxygen': return 'wrench';
    case 'medbay': return c.role === 'Medic' ? 'check' : 'sleep';
    case 'hab': {
      const phase = Math.floor(t * 0.4 + index * 1.7) % 4;
      return phase === 1 ? 'sip' : phase === 3 && index % 2 === 1 ? 'sleep' : 'idle';
    }
    default: return 'idle';
  }
}

function Sprite({ c, index, act = 'idle' }: { c: CrewState; index: number; act?: Act }) {
  const { pick, picked } = useGame();
  const coach = useGame((s) => (stepOf(s.coach)?.target === 'crew' ? s.coach?.subject : null));
  const carried = useDrag((d) => d.id === c.id);
  const bubble = useGame((s) => s.bubble);
  const look = lookOf(c);
  const chat = bubble && bubble.crewId === c.id && bubble.until > Date.now() ? bubble.text : null;
  const say = c.say ?? (chat ? { text: chat, mood: 'chat' } : null);
  const still = look.fainted || look.shiver || c.exhausted || (act !== 'idle' && act !== 'sip');
  return (
    <motion.button
      layoutId={`crew-${c.id}`}
      className={`sprite no-drag ${picked === c.id ? 'picked' : ''} ${coach === c.id ? 'coach-target' : ''} ${carried ? 'carried' : ''} ${c.energy < 30 && !c.exhausted ? 'tired' : ''}`}
      onPointerDown={(e) => startCrewDrag(e, c.id)}
      onClick={() => { if (!wasDragged()) pick(picked === c.id ? null : c.id); }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      aria-label={`${c.name}, ${c.role}${c.commander ? ', your commander' : ''}. Energy ${Math.round(c.energy)}%${c.mood < 35 ? ', unhappy' : ''}${c.exhausted ? ', collapsed asleep' : ''}. Press to open their card, or drag to a module.`}
    >
      {c.commander && <span className="sprite-star" aria-hidden="true"><Star /></span>}
      <AnimatePresence>
        {say && (
          <motion.span key={say.text} className={`say ${say.mood}`} initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }} role="status">{say.text}</motion.span>
        )}
      </AnimatePresence>
      {/* Healthy crew with nothing to do wander about. Busy, sick or fainted crew stay put. */}
      <span className={still ? '' : `pace pace-${index % 3}`}>
        <span className={still ? '' : 'waddle'}><Astronaut who={c} look={look} size={38} act={act} /></span>
      </span>
      <span className={`sprite-dot t-${look.triage}`} />
      {c.mood < 35 && <span className="grump" aria-hidden="true"><CloudLightning /></span>}
      <span className={`energy ${c.energy < 30 ? 'low' : c.energy < 55 ? 'mid' : ''}`} aria-hidden="true"><i style={{ width: `${Math.max(4, c.energy)}%` }} /></span>
    </motion.button>
  );
}

function Module({ m, game, fresh, partying }: { m: ModuleState; game: GameState; fresh: boolean; partying: boolean }) {
  const toggle = useGame((s) => s.toggle);
  const open = useGame((s) => s.open);
  const editing = useGame((s) => s.editing);
  const moving = useGame((s) => s.moving);
  const pickToMove = useGame((s) => s.pickToMove);
  const move = useGame((s) => s.move);
  const total = m.buildTotal || BUILD_SOLS;
  // In the layout editor: press a module and drag it to a glowing spot (or tap it, then tap a spot).
  const startMove = (e: React.PointerEvent) => {
    if (!editing || e.button !== 0) return;
    pickToMove(m.id);
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointerup', up);
      for (const el of document.elementsFromPoint(ev.clientX, ev.clientY)) {
        const slot = (el as HTMLElement).closest?.('[data-cell]') as HTMLElement | null;
        if (slot) { move(m.id, Number(slot.dataset.cell)); return; }
      }
    };
    window.addEventListener('pointerup', up);
  };
  const coached = useGame((s) => {
    const t = stepOf(s.coach)?.target;
    if (t === 'site') return m.buildLeft > 0;
    return t === m.kind && game.modules.find((x) => x.kind === m.kind)?.id === m.id;
  });
  const carrying = useDrag((d) => d.id);
  const hovered = useDrag((d) => (d.id && d.over === m.id ? (d.ok ? 'drop-ok' : 'drop-no') : ''));
  const dropCan = !!carrying && m.buildLeft <= 0 && canDrop(carrying, m.id);
  const patch = useGame((s) => s.patch);
  const Icon = MODULE_ICON[m.kind];
  const building = m.buildLeft > 0;
  const here = game.crew.filter((c) => !c.out && c.at === m.id);
  const cost = POWER_COST[m.kind];
  const slots = WORK_SLOTS[m.kind];
  const boosted = !!slots && m.on && staffing(game, m) > 1;
  const empty = !!slots && m.kind !== 'medbay' && m.on && workersIn(game, m.id).length === 0;
  const row = m.cell < GRID_COLS ? 0 : 1;
  const leftTaken = m.cell % GRID_COLS > 0 && game.modules.some((x) => x.cell === m.cell - 1);
  const below = row === 0 && game.modules.some((x) => x.cell === m.cell + GRID_COLS);
  const patched = isPatched(game, m);
  const canPatch = !building && !m.on && PATCHABLE.includes(m.kind) && game.spareParts > 0 && cost > power(game).free;
  const status = building ? `${m.upgrading ? 'Upgrading' : 'Building'}, ${Math.round((1 - m.buildLeft / total) * 100)}% done` : patched ? 'Patched and running' : m.on ? 'On' : 'Off';
  return (
    <motion.div
      className={`mod ${row ? 'under' : 'surface'} k-${m.kind} ${m.on ? 'on' : 'off'} ${building ? 'building' : ''} ${leftTaken ? 'link-left' : ''} ${below ? 'shaft' : ''} ${patched ? 'patched' : ''} ${coached ? 'coach-target' : ''} ${dropCan ? 'drop-can' : ''} ${hovered} ${editing ? 'editable' : ''} ${moving === m.id ? 'moving' : ''} lvl-${m.level}`}
      onPointerDown={startMove}
      style={place(m.cell)}
      data-mod={m.id}
      initial={{ scale: 0.2, y: row ? 0 : 60, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 13, delay: fresh ? 0.15 + (m.cell % 3) * 0.12 : 0 }}
    >
      <span className="thump" aria-hidden="true" />
      {/* A ring bursts out every time the switch flips, so the choice answers back at once. */}
      {!building && <span key={m.on ? 'on' : 'off'} className={`flip ${m.on ? 'flip-on' : 'flip-off'}`} aria-hidden="true" />}
      <motion.button
        className="mod-hit"
        whileTap={building ? undefined : { scale: 0.95 }}
        whileHover={building ? undefined : { scale: 1.03 }}
        transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        onClick={(e) => { if (!editing) toggle(m.id); else if (e.detail === 0) pickToMove(moving === m.id ? null : m.id); /* pointer presses pick it up on pointerdown */ }}
        disabled={building && !editing}
        aria-pressed={m.on}
        aria-label={`${MODULE_NAME[m.kind]}. ${status}. ${MODULE_JOB[m.kind]}.${building ? '' : ` Uses ${cost} power. Press to switch ${m.on ? 'off' : 'on'}.`}`}
      >
        <ModuleArt kind={m.kind} on={m.on} building={building && !m.upgrading} />
        <LevelDeco level={m.level} under={row === 1} />
        {m.upgrading && <span className="upgrade-scaffold" aria-hidden="true" />}
        {patched && (
          <svg viewBox="0 0 240 150" className="tape" aria-hidden="true">
            <path d="M150 20l58 34" stroke="#d9d3c5" strokeWidth="16" strokeLinecap="round" /><path d="M150 20l58 34" stroke="#1d1033" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />
            <path d="M206 18l-52 40" stroke="#bdb6a6" strokeWidth="16" strokeLinecap="round" /><path d="M206 18l-52 40" stroke="#1d1033" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />
          </svg>
        )}
      </motion.button>
      <div className="mod-floor">{here.map((c, i) => { const n = game.crew.indexOf(c); return <Sprite key={c.id} c={c} index={n + i} act={actFor(c, m, game, here.length, n, partying)} />; })}</div>
      <div className="plate" aria-hidden="true">
        <span className="plate-icon">{building ? <Hammer /> : <Icon />}</span>
        <span className="plate-name">{MODULE_NAME[m.kind]}</span>
        {building ? (
          <span className="build-bar"><i style={{ width: `${(1 - m.buildLeft / total) * 100}%` }} /></span>
        ) : (
          <>
            <LevelStars level={m.level} />
            <span className="plate-cost">{Array.from({ length: cost }, (_, i) => <i key={i} />)}</span>
            <span className="switch"><motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 28 }} /></span>
          </>
        )}
      </div>
      {building && <span className={`tag site-tag ${here.length ? 'good' : ''}`}><Hammer /> {here.length ? `${m.upgrading ? 'Upgrading' : 'Building'}... ${Math.round((1 - m.buildLeft / total) * 100)}%` : m.upgrading ? `Drag a builder here: level ${m.level + 1}` : 'Drag an astronaut here to build!'}</span>}
      {!building && !editing && m.level < MAX_LEVEL && (
        <motion.button className="up-btn no-drag" onClick={() => open({ type: 'upgrade', id: m.id })} whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.12 }}
          aria-label={`Upgrade the ${MODULE_NAME[m.kind]} (level ${m.level})`} title="Upgrade"><ArrowUpCircle /></motion.button>
      )}
      {patched
        ? <span className="tag patch-tag"><Wrench /> Patched! {Math.max(0, m.patchedUntil - game.time).toFixed(1)} sols left</span>
        : !building && (empty || boosted) && <span className={`tag ${boosted ? 'good' : ''}`}>{boosted ? `${SPECIALIST[m.kind]} boost!` : 'Needs a worker'}</span>}
      {canPatch && (
        <motion.button className="patch-btn" onClick={() => patch(m.id)} whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.08 }}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}
          aria-label={`Patch the ${MODULE_NAME[m.kind]} with a spare part. It will run for 1 sol with no power. You have ${game.spareParts}.`}>
          <Wrench /> Patch
        </motion.button>
      )}
    </motion.div>
  );
}

/** The landing capsule: the only free thing on Mars. Warm and cramped. Home until the Hab is built. */
function Pod({ game, intro }: { game: GameState; intro: boolean }) {
  const setTour = useGame((s) => s.setTour);
  const coached = useGame((s) => stepOf(s.coach)?.target === 'pod');
  const home = !habReady(game);
  const resting = home ? game.crew.filter((c) => !c.out && c.at === 'hab') : [];
  const carrying = useDrag((d) => d.id);
  const hovered = useDrag((d) => (d.id && d.over === 'pod' ? (d.ok ? 'drop-ok' : 'drop-no') : ''));
  return (
    <div className={`pod ${home ? 'is-home' : 'retired'} ${carrying && home ? 'drop-can' : ''} ${hovered} ${coached ? 'coach-target' : ''}`} data-mod={home ? 'pod' : undefined}>
      <motion.div className="pod-craft" initial={intro ? { y: -380, rotate: -10 } : false} animate={{ y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 70, damping: 10 }}>
        <Lander size={92} capsule />
        {home && <i className="pod-window" aria-hidden="true" />}
      </motion.div>
      <div className="pod-floor">{resting.map((c, i) => <Sprite key={c.id} c={c} index={i} act={c.exhausted || c.energy < 97 || isNight(game) ? 'sleep' : 'sip'} />)}</div>
      <span className="pod-plate"><span className="plate-icon"><Rocket /></span>Capsule <small>+3 power</small></span>
      {intro && (
        <motion.button className="big-build pod-go" onClick={() => setTour(1)} autoFocus
          animate={{ y: [0, -8, 0] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}>Step outside</motion.button>
      )}
    </div>
  );
}

/** Gear out in the yard. A building site waits for an astronaut to come and build it. */
function YardProp({ m, game, lit, index, fresh }: { m: ModuleState; game: GameState; lit: boolean; index: number; fresh: boolean }) {
  const toggle = useGame((s) => s.toggle);
  const open = useGame((s) => s.open);
  const emptyBin = useGame((s) => s.emptyBin);
  const total = m.buildTotal || BUILD_SOLS;
  const coached = useGame((s) => stepOf(s.coach)?.target === 'site' && m.buildLeft > 0);
  const carrying = useDrag((d) => d.id);
  const hovered = useDrag((d) => (d.id && d.over === m.id ? (d.ok ? 'drop-ok' : 'drop-no') : ''));
  const building = m.buildLeft > 0;
  const here = game.crew.filter((c) => !c.out && c.at === m.id);
  const on = building ? false : m.kind === 'solar' ? lit : m.kind === 'battery' ? true : m.on;
  const label = `${MODULE_NAME[m.kind]}. ${building ? 'Building site' : m.kind === 'comms' ? (m.on ? 'On' : 'Off') : on ? 'Making power' : 'Blocked by dust'}. ${MODULE_JOB[m.kind]}.`;
  const dropCan = !!carrying && building && canDrop(carrying, m.id);
  return (
    <motion.div className={`prop-wrap ${building ? 'building' : ''} ${dropCan ? 'drop-can' : ''} ${hovered} ${coached ? 'coach-target' : ''}`} data-mod={m.id}
      initial={{ y: -90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: fresh ? 0.5 + index * 0.1 : 0 }}>
      <motion.button className={`prop k-${m.kind} ${on ? 'on' : 'off'} ${building ? 'building' : ''}`}
        disabled={!['comms', 'miner', 'rover'].includes(m.kind) || building} onClick={() => toggle(m.id)} aria-label={label} aria-pressed={m.kind === 'comms' ? m.on : undefined} title={MODULE_NAME[m.kind]}
        whileTap={m.kind === 'comms' ? { scale: 0.9 } : undefined}>
        <ModuleArt kind={m.kind} on={on} building={building} />
        {['comms', 'miner', 'rover'].includes(m.kind) && !building && <span className="prop-switch"><span className="switch"><i /></span></span>}
        {m.kind === 'rover' && !building && game.rover && !game.rover.trip && <span className="parked"><Rover size={64} /></span>}
      </motion.button>
      {m.kind === 'miner' && !building && m.bin >= 1 && (
        <motion.button className={`bin-bubble no-drag ${m.bin >= 20 * m.level - 0.5 ? 'full' : ''}`} onClick={() => emptyBin(m.id)} initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.85 }}
          aria-label={`Collect ${Math.floor(m.bin)} bricks from the miner`}><Package /> +{Math.floor(m.bin)}</motion.button>
      )}
      {!building && <span className="prop-level"><LevelStars level={m.level} />{m.level < MAX_LEVEL && <button className="up-btn small no-drag" onClick={() => open({ type: 'upgrade', id: m.id })} aria-label={`Upgrade the ${MODULE_NAME[m.kind]}`}><ArrowUpCircle /></button>}</span>}
      {building && <span className="build-bar prop-bar"><i style={{ width: `${(1 - m.buildLeft / total) * 100}%` }} /></span>}
      {building && <span className={`tag site-tag ${here.length ? 'good' : ''}`}><Hammer /> {here.length ? (m.upgrading ? 'Upgrading...' : 'Building...') : m.upgrading ? 'Needs a builder' : `Build the ${MODULE_NAME[m.kind]}`}</span>}
      <div className="prop-floor">{here.map((c, i) => <Sprite key={c.id} c={c} index={i} act="wrench" />)}</div>
    </motion.div>
  );
}

const ROCKS = [[3, 30], [9, 72], [14, 18], [19, 84], [26, 50], [31, 18], [37, 74], [44, 30], [52, 86], [58, 22], [63, 64], [70, 28], [76, 80], [81, 40], [87, 70], [92, 16], [97, 52], [47, 58]];
const ICE = [[33, 80], [64, 46]];
const STARS = [[2, 12], [7, 30], [12, 8], [18, 22], [24, 6], [30, 16], [36, 30], [42, 10], [48, 34], [55, 20], [61, 8], [67, 28], [73, 14], [79, 36], [85, 8], [91, 24], [96, 12]];

/** Parallax: far layers slide slower than the ground, so the world has depth. */
const px = (f: number, extra: CSSProperties = {}) => ({ '--f': f, ...extra } as CSSProperties);

export function Diorama({ game }: { game: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const { tour, open, slowmo, moment, party, tunedAt, editing, moving, setEditing, move } = useGame();
  const coachTarget = useGame((s) => stepOf(s.coach)?.target ?? null);
  const night = isNight(game) && tour !== 0;
  const warnedNow = game.events.some((e) => e.kind !== 'dust' && e.phase === 'warned');
  const vw = useCamera((s) => s.vw);
  const W = useCamera((s) => s.W);
  const hl = (W - vw) / 2;
  const at = (p: number, f: number) => p * vw + (1 - f) * hl;
  const targets = useOpenFinds();
  const intro = tour === 0;
  const dust = activeEvents(game, 'dust').length > 0;
  const storm = stormDose(game) > 0;
  const p = power(game);
  const lit = p.sunlight > 0.6;
  const placed = game.modules.filter((m) => LAYER[m.kind] !== 'yard');
  const yard = game.modules.filter((m) => LAYER[m.kind] === 'yard');
  const kinds = [...new Set(game.blueprints)].filter((k) => LAYER[k] !== 'yard');
  const spots = [...new Set(kinds.flatMap((k) => buildableCells(game, k)))];
  const partying = Date.now() - party < 3200;
  const dead = game.crew.filter((c) => c.out);
  // Perfect power: every block in use, none wasted. The whole base hums cyan.
  const tuned = !intro && p.free === 0 && p.supply >= 4 && !dust && !storm;
  const justTuned = Date.now() - tunedAt < 1500;

  // The Sun is the thing to watch. It swells as a solar storm or flare closes in.
  const solar = game.events.filter((e) => e.kind !== 'dust' && e.phase === 'warned').sort((a, b) => a.startAt - b.startAt)[0];
  const swell = storm ? 1 : solar ? nearness(solar, game.time) : 0;
  const dustComing = game.events.find((e) => e.kind === 'dust' && e.phase === 'warned');
  const wall = dust ? 1 : dustComing ? nearness(dustComing, game.time) : 0;

  // The camera: measure the screen, follow the camera without re-rendering, and listen for drags.
  useEffect(() => useCamera.subscribe((c) => {
    const w = worldRef.current;
    if (!w) return;
    w.style.transform = `translate3d(${-c.x}px,0,0)`;
    w.style.setProperty('--cam', String(c.x));
  }), []);
  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setView(el.clientWidth));
    ro.observe(el);
    setView(el.clientWidth);
    jumpHome();
    const detach = attachDrag(el, () => useGame.getState().tour !== null);
    return () => { ro.disconnect(); detach(); };
  }, []);
  useEffect(() => { jumpHome(); }, [game.seed]);
  // When a warning comes in, the camera flies home so the commander can act.
  const warned = game.events.filter((e) => e.phase !== 'pending').length;
  useEffect(() => { if (warned) glideTo(homeX()); }, [warned]);
  // A lander arriving, or a lesson about building, also brings the camera home.
  const homeCue = `${game.landers}-${!!game.offer}-${coachTarget === 'spot' || coachTarget === 'site'}`;
  useEffect(() => { if (game.landers || game.offer || coachTarget === 'spot' || coachTarget === 'site') glideTo(homeX()); }, [homeCue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shake the base when a storm lands or the power trips.
  const bump = game.pulse.hit + game.pulse.brownout;
  useEffect(() => {
    if (!bump || !ref.current) return;
    const el = ref.current;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }, [bump]);

  const landing = moment?.type === 'lander';
  const landerNo = game.offer?.number ?? game.landers;

  return (
    <div ref={ref} className={`scene ${dust ? 'dusty' : ''} ${storm ? 'stormy' : ''} ${slowmo ? 'slowmo' : ''} ${tuned ? 'tuned' : ''} ${swell > 0 ? 'sun-angry' : ''} ${intro ? 'locked' : ''} ${night ? 'night' : ''}`}
      style={{ '--swell': swell, '--wall': wall, '--W': `${W}px`, '--vw': `${vw}px`, '--hl': `${hl}px` } as CSSProperties}>
      <div ref={worldRef} className="world">
        <div className="sky" aria-hidden="true">
          <div className="sky-top px" style={px(0.9)} />
          <div className="sky-stars px" style={px(0.9)}>{STARS.map(([x, y], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.37}s` }} />)}</div>
          {/* Mars has two small moons, Phobos and Deimos. */}
          <i className="moon phobos px" style={px(0.9, { left: at(0.3, 0.9) })} />
          <i className="moon deimos px" style={px(0.9, { left: at(0.56, 0.9) })} />
          <div className="sun-wrap px" style={px(0.9, { left: at(0.76, 0.9), right: 'auto' })}>
            <svg className="sun-spikes" viewBox="-50 -50 100 100">
              {Array.from({ length: 12 }, (_, i) => <path key={i} d="M-6 -24L0 -48L6 -24Z" transform={`rotate(${i * 30})`} />)}
            </svg>
            <div className="sun" />
          </div>
          <div className="hills hills-back px" style={px(0.6)} />
          <div className="night-shade" />
        </div>
        <div className="sky sky-front">
          <div className="hills hills-far px" style={px(0.4)} aria-hidden="true" />
          <MountSharp factor={0.5} />
          <div className="rover-lane px" style={px(0.4)} aria-hidden="true"><div className="far-rover"><Rover size={54} /><i className="rover-dust" /><i className="rover-dust d2" /></div></div>
          <div className="hills hills-near px" style={px(0.2)} aria-hidden="true" />
          <div className="rays" aria-hidden="true" />
          <div className="dust-wall px" style={px(1, { width: vw * 0.7 })} aria-hidden="true" />
        </div>
        <div className="dirt" aria-hidden="true">
          <i className="strata s1" /><i className="strata s2" /><i className="strata s3" />
          {ROCKS.map(([x, y], i) => <i key={i} className={`rock r${i % 3}`} style={{ left: `${x}%`, top: `${y}%` }} />)}
          {ICE.map(([x, y], i) => (
            <svg key={i} className="ice" viewBox="0 0 60 40" style={{ left: `${x}%`, top: `${y}%` }}>
              <path d="M6 36l8-22l8 22zM20 36l10-32l10 32zM38 36l8-18l8 18z" fill="#9fdcf5" stroke="#5e1d22" strokeWidth="4" strokeLinejoin="round" />
              <path d="M30 12l-4 16M14 22l-2 8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ))}
        </div>
        <Finds />
        <Deposits game={game} />
        <Walkers game={game} />
        {/* Night falls over the whole crater; the base keeps its lights on. */}
        <div className="night-shade world-shade" aria-hidden="true" />

        <div className="home">
          <LayoutGroup>
            <div className="yard">
              <Pod game={game} intro={intro} />
              {!intro && yard.filter((m) => m.kind !== 'pod').map((m, i) => <YardProp key={m.id} m={m} game={game} lit={lit} index={i} fresh={tour === 1} />)}
              {/* The crew remember the friends they lost. */}
              {dead.map((c) => (
                <motion.div key={`rip-${c.id}`} className="memorial" title={`${c.name} did not survive`} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                  <svg viewBox="0 0 44 56" aria-hidden="true">
                    <path d="M22 4v14" stroke="#1d1033" strokeWidth="3" /><path d="M22 5h14l-4 4l4 4H22z" fill={c.suit} stroke="#1d1033" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M6 54V30a16 16 0 0 1 32 0v24z" fill="#cfc6e6" stroke="#1d1033" strokeWidth="3.5" strokeLinejoin="round" />
                    <circle cx="22" cy="32" r="7" fill={c.suit} stroke="#1d1033" strokeWidth="2.5" />
                  </svg>
                  <span>{c.name}</span>
                </motion.div>
              ))}
              <div className={`pad ${landing ? 'landing' : ''}`}>
                {/* The shadow grows as the lander comes down. */}
                <motion.i key={`sh-${landerNo}`} className="pad-shadow" initial={{ scaleX: 0.15, opacity: 0.2 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: landing ? 2.05 : 0.9, ease: 'easeIn' }} />
                <motion.div key={landerNo} initial={{ y: -420, rotate: -7 }} animate={{ y: 0, rotate: 0 }}
                  transition={landing ? { duration: 2.1, ease: [0.2, 0.6, 0.35, 1] } : { type: 'spring', stiffness: 60, damping: 9 }}>
                  <Lander size={74} burn={landing} />
                </motion.div>
                {landing && <i className="pad-blast" />}
              </div>
            </div>

            <div className="base">
              <motion.div className="dome-glow" aria-hidden="true" animate={{ opacity: game.shield / 100 }} />
              {/* Each dome's protection zone. Only crew inside a blue zone are shielded. */}
              {(editing || warnedNow || storm) && game.modules.filter((m) => m.kind === 'dome' && m.buildLeft <= 0).map((m) => {
                const [a, b] = domeZone(m);
                return <i key={`zone-${m.id}`} className={`cover-zone ${m.on ? 'on' : 'off'}`} style={{ gridColumn: `${a + 1} / ${b + 2}`, gridRow: '1 / 3' }} aria-hidden="true" />;
              })}
              {editing && moving && moveTargets(game, moving).map((cell) => (
                <motion.button key={`slot-${cell}`} className="slot" data-cell={cell} style={place(cell)} onClick={() => move(moving, cell)}
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} aria-label="Move it here"><Move /> Move here</motion.button>
              ))}
              {!intro && placed.map((m) => <Module key={m.id} m={m} game={game} fresh={tour === 1} partying={partying} />)}
              {!intro && !editing && spots.map((cell) => (
                <motion.button key={`spot-${cell}`} className={`spot ready ${coachTarget === 'spot' ? 'coach-target' : ''}`} style={place(cell)} whileTap={{ scale: 0.92 }}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                  onClick={() => open({ type: 'build', cell })} aria-label={cell < GRID_COLS ? 'Build on the surface here' : 'Dig a room here'}>
                  <Plus /><span>{cell < GRID_COLS ? 'Build' : 'Dig a room'}</span>
                </motion.button>
              ))}
            </div>
          </LayoutGroup>
        </div>
      </div>
      <div className="dust-layer" aria-hidden="true" />
      <div className="wind" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ top: `${(i * 37) % 96}%`, animationDelay: `${-(i * 0.23)}s`, animationDuration: `${0.9 + (i % 5) * 0.22}s`, width: `${60 + (i % 4) * 50}px` }} />)}</div>
      {justTuned && <div className="tuned-flash" aria-hidden="true">Perfect power!</div>}
      <i key={game.pulse.hit} className={game.pulse.hit ? 'hit-flash' : ''} aria-hidden="true" />
      <div className="letterbox" aria-hidden="true" />
      <div className={coachTarget === 'explore' ? 'coach-explore' : ''}><EdgeArrows targets={targets} hidden={tour !== null} /></div>
      <MiniMap targets={targets} hidden={tour !== null} />
      {tour === null && (
        <motion.button className={`edit-btn no-drag ${editing ? 'on' : ''} ${coachTarget === 'edit' ? 'coach-target' : ''}`} onClick={() => setEditing(!editing)} whileTap={{ scale: 0.9 }}
          aria-pressed={editing}>{editing ? <><Check /> Done</> : <><LayoutGrid /> Edit layout</>}</motion.button>
      )}
      {editing && <div className="edit-banner" role="status">Layout editor: drag a module to a glowing spot (or tap it, then a spot). The clock is stopped. Blue zones show where Shield Domes protect.</div>}
    </div>
  );
}
