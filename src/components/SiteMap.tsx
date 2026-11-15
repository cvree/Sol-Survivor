import { useEffect, useRef } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Hammer, Plus } from 'lucide-react';
import { BATTERY_OUTPUT, BUILD_SOLS, GRID_COLS, GRID_ROWS, POWER_COST, SOLAR_OUTPUT, WORK_SLOTS } from '../engine/constants';
import { MODULE_NAME, SPECIALIST, activeEvents, buildableCells, power, staffing, stormDose, workersIn } from '../engine/engine';
import type { GameState, ModuleKind, ModuleState } from '../engine/types';
import { useGame } from '../store/game';
import { Astronaut, MODULE_ICON } from './art';
import { lookOf } from './crewLook';

export const MODULE_JOB: Record<ModuleKind, string> = {
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

const center = (cell: number) => ({ x: ((cell % GRID_COLS) + 0.5) * (100 / GRID_COLS), y: (Math.floor(cell / GRID_COLS) + 0.5) * (100 / GRID_ROWS) });
const place = (cell: number) => ({ gridColumn: (cell % GRID_COLS) + 1, gridRow: Math.floor(cell / GRID_COLS) + 1 });

function Tile({ m, game }: { m: ModuleState; game: GameState }) {
  const { toggle, pick, picked, tour } = useGame();
  const Icon = MODULE_ICON[m.kind];
  const gen = m.kind === 'solar' || m.kind === 'battery';
  const building = m.buildLeft > 0;
  const lit = building ? false : gen ? (m.kind === 'battery' || power(game).sunlight > 0.6) : m.on;
  const here = game.crew.filter((c) => !c.out && c.at === m.id);
  const cost = POWER_COST[m.kind];
  const pointed = (tour === 2 || tour === 3) && m.kind === 'oxygen';
  const slots = WORK_SLOTS[m.kind];
  const boosted = !!slots && m.on && staffing(game, m) > 1;
  const empty = !!slots && m.kind !== 'medbay' && m.on && workersIn(game, m.id).length === 0;
  const status = building ? `Building ${Math.round((1 - m.buildLeft / BUILD_SOLS) * 100)}%` : gen ? (lit ? 'Making power' : 'Blocked by dust') : m.on ? 'On' : 'Off';
  return (
    <motion.div
      className={`tile k-${m.kind} ${lit ? 'on' : 'off'} ${building ? 'building' : ''} ${gen ? 'gen' : ''} ${pointed ? 'tour-target' : ''}`}
      style={place(m.cell)}
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 16 }}
    >
      <motion.button
        className="tile-toggle"
        whileTap={gen || building ? undefined : { scale: 0.96 }}
        onClick={() => toggle(m.id)}
        disabled={gen || building}
        aria-pressed={gen ? undefined : m.on}
        aria-label={`${MODULE_NAME[m.kind]}. ${status}. ${MODULE_JOB[m.kind]}.${gen || building ? '' : ` Uses ${cost} power. Press to switch ${m.on ? 'off' : 'on'}.`}`}
      >
        <span className="tile-head">
          <span className="badge">{building ? <Hammer /> : <Icon />}</span>
          <span className="tile-title">
            <span className="tile-name">{MODULE_NAME[m.kind]}</span>
            <span className="tile-job">{building ? status : empty ? 'Nobody working here' : boosted ? `${SPECIALIST[m.kind]} boost!` : MODULE_JOB[m.kind]}</span>
          </span>
          {!gen && !building && <span className="switch" aria-hidden="true"><motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 28 }} /></span>}
        </span>
        {!gen && !building && <span className="tile-cost" aria-hidden="true">{Array.from({ length: cost }, (_, i) => <i key={i} />)}</span>}
        {!gen && !building && !m.on && <span className="warn-light" aria-hidden="true" />}
        {building && <span className="build-bar"><i style={{ width: `${(1 - m.buildLeft / BUILD_SOLS) * 100}%` }} /></span>}
      </motion.button>
      <div className="tile-floor">
        {here.map((c) => (
          <motion.button
            key={c.id}
            layoutId={`crew-${c.id}`}
            className={`sprite ${picked === c.id ? 'picked' : ''} ${tour === 4 ? 'tour-target' : ''}`}
            onClick={() => pick(picked === c.id ? null : c.id)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            aria-label={`${c.name}, ${c.role}. Open vitals.`}
          >
            <AnimatePresence>
              {c.say && (
                <motion.span className={`say ${c.say.mood}`} initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }} role="status">{c.say.text}</motion.span>
              )}
            </AnimatePresence>
            <Astronaut who={c} look={lookOf(c)} size={36} />
            <span className={`sprite-dot t-${lookOf(c).triage}`} />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export function SiteMap({ game }: { game: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  const { tour, open } = useGame();
  const dust = activeEvents(game, 'dust').length > 0;
  const storm = stormDose(game) > 0;
  const spots = buildableCells(game);
  const canBuild = game.blueprints.length > 0;
  const byId = new Map(game.modules.map((m) => [m.id, m]));

  // Shake the base when a storm lands or the power trips.
  const bump = game.pulse.hit + game.pulse.brownout;
  useEffect(() => {
    if (!bump || !ref.current) return;
    const el = ref.current;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }, [bump]);

  return (
    <div ref={ref} className={`scene ${dust ? 'dusty' : ''} ${storm ? 'stormy' : ''}`}>
      <div className="sky" aria-hidden="true">
        <div className="sky-band" />
        <div className="sun" />
        <div className="hills hills-far" />
        <div className="hills hills-near" />
        <div className="rays" />
        <div className="dust-layer" />
      </div>
      <div className={`site ${tour === 0 ? 'tour-target' : ''}`}>
        <div className="ground-rays" aria-hidden="true" />
        <motion.div className="dome-glow" aria-hidden="true" animate={{ opacity: game.shield / 100 }} />
        <svg className="cables" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {game.modules.filter((m) => m.parent).map((m) => {
            const a = center(byId.get(m.parent!)!.cell);
            const b = center(m.cell);
            const live = m.buildLeft <= 0 && (m.on || m.kind === 'solar' || m.kind === 'battery');
            return (
              <g key={m.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="cable-out" />
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`cable-in ${live ? 'live' : ''}`} />
              </g>
            );
          })}
        </svg>
        <LayoutGroup>
          <div className="grid">
            {game.modules.map((m) => <Tile key={m.id} m={m} game={game} />)}
            {spots.map((cell) => (
              <motion.button
                key={`spot-${cell}`}
                className={`spot ${canBuild ? 'ready' : ''}`}
                style={place(cell)}
                disabled={!canBuild}
                whileTap={{ scale: 0.94 }}
                onClick={() => open({ type: 'build', cell })}
                aria-label={canBuild ? 'Build here' : 'Empty ground. A cargo lander will bring more blueprints.'}
              >
                {canBuild && <><Plus /><span>Build here</span></>}
              </motion.button>
            ))}
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}
