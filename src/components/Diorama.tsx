import { useEffect, useRef } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Hammer, Plus } from 'lucide-react';
import { BATTERY_OUTPUT, BUILD_SOLS, GRID_COLS, HAB_CELL, LAYER, POWER_COST, SOLAR_OUTPUT, WORK_SLOTS } from '../engine/constants';
import { MODULE_NAME, SPECIALIST, activeEvents, buildableCells, power, staffing, stormDose, workersIn } from '../engine/engine';
import type { CrewState, GameState, ModuleKind, ModuleState } from '../engine/types';
import { useGame } from '../store/game';
import { Astronaut, Lander, MODULE_ICON } from './art';
import { lookOf } from './crewLook';
import { ModuleArt } from './moduleArt';

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

const place = (cell: number) => ({ gridColumn: (cell % GRID_COLS) + 1, gridRow: cell < GRID_COLS ? 1 : 2 });

function Sprite({ c, index }: { c: CrewState; index: number }) {
  const { pick, picked } = useGame();
  const look = lookOf(c);
  return (
    <motion.button
      layoutId={`crew-${c.id}`}
      className={`sprite ${picked === c.id ? 'picked' : ''}`}
      onClick={() => pick(picked === c.id ? null : c.id)}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      aria-label={`${c.name}, ${c.role}. Open vitals.`}
    >
      <AnimatePresence>
        {c.say && (
          <motion.span className={`say ${c.say.mood}`} initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }} role="status">{c.say.text}</motion.span>
        )}
      </AnimatePresence>
      {/* Healthy crew wander about. Sick or fainted crew stay put. */}
      <span className={look.fainted ? '' : `pace pace-${index % 3}`}>
        <span className={look.fainted || look.shiver ? '' : 'waddle'}><Astronaut who={c} look={look} size={34} /></span>
      </span>
      <span className={`sprite-dot t-${look.triage}`} />
    </motion.button>
  );
}

function Module({ m, game, fresh }: { m: ModuleState; game: GameState; fresh: boolean }) {
  const toggle = useGame((s) => s.toggle);
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
  const status = building ? `Building, ${Math.round((1 - m.buildLeft / BUILD_SOLS) * 100)}% done` : m.on ? 'On' : 'Off';
  return (
    <motion.div
      className={`mod ${row ? 'under' : 'surface'} k-${m.kind} ${m.on ? 'on' : 'off'} ${building ? 'building' : ''} ${leftTaken ? 'link-left' : ''} ${below ? 'shaft' : ''}`}
      style={place(m.cell)}
      initial={{ scale: 0.2, y: row ? 0 : 60, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 13, delay: fresh ? 0.15 + (m.cell % 3) * 0.12 : 0 }}
    >
      <span className="thump" aria-hidden="true" />
      <motion.button
        className="mod-hit"
        whileTap={building ? undefined : { scale: 0.95 }}
        whileHover={building ? undefined : { scale: 1.03 }}
        transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        onClick={() => toggle(m.id)}
        disabled={building}
        aria-pressed={m.on}
        aria-label={`${MODULE_NAME[m.kind]}. ${status}. ${MODULE_JOB[m.kind]}.${building ? '' : ` Uses ${cost} power. Press to switch ${m.on ? 'off' : 'on'}.`}`}
      >
        <ModuleArt kind={m.kind} on={m.on} building={building} />
      </motion.button>
      <div className="mod-floor">{here.map((c, i) => <Sprite key={c.id} c={c} index={game.crew.indexOf(c) + i} />)}</div>
      <div className="plate" aria-hidden="true">
        <span className="plate-icon">{building ? <Hammer /> : <Icon />}</span>
        <span className="plate-name">{MODULE_NAME[m.kind]}</span>
        {building ? (
          <span className="build-bar"><i style={{ width: `${(1 - m.buildLeft / BUILD_SOLS) * 100}%` }} /></span>
        ) : (
          <>
            <span className="plate-cost">{Array.from({ length: cost }, (_, i) => <i key={i} />)}</span>
            <span className="switch"><motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 28 }} /></span>
          </>
        )}
      </div>
      {!building && (empty || boosted) && <span className={`tag ${boosted ? 'good' : ''}`}>{boosted ? `${SPECIALIST[m.kind]} boost!` : 'Needs a worker'}</span>}
    </motion.div>
  );
}

export function Diorama({ game }: { game: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  const { tour, setTour, open, toggle } = useGame();
  const intro = tour === 0;
  const dust = activeEvents(game, 'dust').length > 0;
  const storm = stormDose(game) > 0;
  const lit = power(game).sunlight > 0.6;
  const placed = game.modules.filter((m) => LAYER[m.kind] !== 'yard');
  const yard = game.modules.filter((m) => LAYER[m.kind] === 'yard');
  const kinds = [...new Set(game.blueprints)].filter((k) => LAYER[k] !== 'yard');
  const spots = [...new Set(kinds.flatMap((k) => buildableCells(game, k)))];

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
        <div className="sun" />
        <div className="hills hills-far" />
        <div className="hills hills-near" />
        <div className="rays" />
      </div>
      <div className="dirt" aria-hidden="true">
        {[[6, 30], [16, 72], [31, 18], [47, 84], [63, 24], [78, 70], [92, 36], [38, 58], [86, 12]].map(([x, y], i) => <i key={i} className={`rock r${i % 3}`} style={{ left: `${x}%`, top: `${y}%` }} />)}
      </div>

      <LayoutGroup>
        <div className="yard">
          {!intro && yard.map((m, i) => {
            const on = m.buildLeft > 0 ? false : m.kind === 'solar' ? lit : m.kind === 'battery' ? true : m.on;
            const label = `${MODULE_NAME[m.kind]}. ${m.buildLeft > 0 ? 'Being built' : m.kind === 'comms' ? (m.on ? 'On' : 'Off') : on ? 'Making power' : 'Blocked by dust'}. ${MODULE_JOB[m.kind]}.`;
            return (
              <motion.button key={m.id} className={`prop k-${m.kind} ${on ? 'on' : 'off'} ${m.buildLeft > 0 ? 'building' : ''}`}
                disabled={m.kind !== 'comms' || m.buildLeft > 0} onClick={() => toggle(m.id)} aria-label={label} aria-pressed={m.kind === 'comms' ? m.on : undefined} title={MODULE_NAME[m.kind]}
                initial={{ y: -90, opacity: 0 }} animate={{ y: 0, opacity: m.buildLeft > 0 ? 0.55 : 1 }} whileTap={m.kind === 'comms' ? { scale: 0.9 } : undefined}
                transition={{ type: 'spring', stiffness: 260, damping: 12, delay: tour === 1 ? 0.5 + i * 0.1 : 0 }}>
                <ModuleArt kind={m.kind} on={on} />
                {m.kind === 'comms' && m.buildLeft <= 0 && <span className="prop-switch"><span className="switch"><i /></span></span>}
              </motion.button>
            );
          })}
          <div className="pad">
            <motion.div key={game.landers} initial={{ y: -340, rotate: -8 }} animate={{ y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 60, damping: 9 }}><Lander size={74} /></motion.div>
            {intro && <div className="pad-crew">{game.crew.map((c, i) => <Sprite key={c.id} c={c} index={i} />)}</div>}
          </div>
        </div>

        <div className="base">
          <motion.div className="dome-glow" aria-hidden="true" animate={{ opacity: game.shield / 100 }} />
          {!intro && placed.map((m) => <Module key={m.id} m={m} game={game} fresh={tour === 1} />)}
          {intro && (
            <motion.button className="spot ready first" style={place(HAB_CELL)} onClick={() => setTour(1)} autoFocus
              animate={{ y: [0, -10, 0] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} aria-label="Build your first dome">
              <span className="big-build">BUILD</span>
            </motion.button>
          )}
          {!intro && spots.map((cell) => (
            <motion.button key={`spot-${cell}`} className="spot ready" style={place(cell)} whileTap={{ scale: 0.92 }}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              onClick={() => open({ type: 'build', cell })} aria-label={cell < GRID_COLS ? 'Build on the surface here' : 'Dig a room here'}>
              <Plus /><span>Build</span>
            </motion.button>
          ))}
        </div>
      </LayoutGroup>
      <div className="dust-layer" aria-hidden="true" />
    </div>
  );
}
