import { useEffect, useRef } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { BatteryCharging } from 'lucide-react';
import { POWER_COST } from '../engine/constants';
import { MODULE_NAME, activeEvents, power, stormDose } from '../engine/engine';
import type { GameState, ModuleKind, ModuleState } from '../engine/types';
import { useGame } from '../store/game';
import { Astronaut, MODULE_ICON, SolarArt } from './art';
import { lookOf, roomOf } from './crewLook';

export const MODULE_JOB: Record<ModuleKind, string> = {
  solar: 'Makes power',
  oxygen: 'Makes air',
  greenhouse: 'Grows food',
  heater: 'Keeps crew warm',
  shield: 'Blocks radiation',
  medbay: 'Heals one person',
  lab: 'Does science',
};

function Room({ m, game, index }: { m: ModuleState; game: GameState; index: number }) {
  const { toggle, pick, picked, tour } = useGame();
  const Icon = MODULE_ICON[m.kind];
  const here = game.crew.filter((c) => !c.out && roomOf(game, c.id) === m.id);
  const pointed = (tour === 2 || tour === 3) && m.kind === 'greenhouse' || tour === 5 && m.kind === 'shield';
  const cost = POWER_COST[m.kind];
  return (
    <motion.div
      className={`room k-${m.kind} ${m.on ? 'on' : 'off'} ${pointed ? 'tour-target' : ''}`}
      initial={{ scale: 0.4, opacity: 0, y: 40 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 + index * 0.09 }}
    >
      <motion.button
        className="room-toggle"
        whileTap={{ scale: 0.97 }}
        onClick={() => toggle(m.id)}
        aria-pressed={m.on}
        aria-label={`${MODULE_NAME[m.kind]}. ${m.on ? 'On' : 'Off'}. ${MODULE_JOB[m.kind]}. Uses ${cost} power. Press to switch ${m.on ? 'off' : 'on'}.`}
      >
        <span className="room-head">
          <span className="badge"><Icon /></span>
          <span className="room-title">
            <span className="room-name">{MODULE_NAME[m.kind]}</span>
            <span className="room-job">{MODULE_JOB[m.kind]}</span>
          </span>
          <span className="switch" aria-hidden="true"><motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 28 }} /></span>
        </span>
        <span className="room-cost" aria-hidden="true">{Array.from({ length: cost }, (_, i) => <i key={i} />)}</span>
      </motion.button>
      <div className="room-floor">
        {here.map((c) => (
          <motion.button
            key={c.id}
            layoutId={`crew-${c.id}`}
            className={`sprite ${picked === c.id ? 'picked' : ''} ${tour === 4 ? 'tour-target' : ''}`}
            onClick={() => pick(picked === c.id ? null : c.id)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            aria-label={`${c.name}. Check vitals.`}
          >
            <AnimatePresence>
              {c.say && (
                <motion.span className={`say ${c.say.mood}`} initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }} role="status">
                  {c.say.text}
                </motion.span>
              )}
            </AnimatePresence>
            <Astronaut id={c.id} look={lookOf(c)} size={44} />
            <span className={`sprite-dot t-${lookOf(c).triage}`} />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export function Scene({ game }: { game: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  const tour = useGame((s) => s.tour);
  const dust = activeEvents(game, 'dust').length > 0;
  const storm = stormDose(game) > 0;
  const lit = power(game).sunlight > 0.6;
  const solar = game.modules.filter((m) => m.kind === 'solar');
  const rooms = game.modules.filter((m) => m.kind !== 'solar');

  // Shake the outpost when a storm lands or the power trips.
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
        <motion.div className="dome" animate={{ opacity: game.shield / 100, scale: 0.9 + 0.1 * (game.shield / 100) }} transition={{ type: 'spring', stiffness: 80, damping: 14 }} />
        <div className="dust-layer" />
      </div>
      <div className="surface" aria-label={`${solar.length} solar arrays${game.loadout.battery ? ` and ${game.loadout.battery} batteries` : ''}`}>
        {solar.map((m, i) => (
          <motion.div key={m.id} className="array" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14, delay: i * 0.1 }}>
            <SolarArt lit={lit} />
          </motion.div>
        ))}
        {Array.from({ length: game.loadout.battery }, (_, i) => (
          <motion.div key={i} className="battery" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 + i * 0.1 }}><BatteryCharging /></motion.div>
        ))}
      </div>
      <LayoutGroup>
        <div className={`rooms n${rooms.length} ${tour === 0 ? 'tour-target' : ''}`}>
          {rooms.map((m, i) => <Room key={m.id} m={m} game={game} index={i} />)}
        </div>
      </LayoutGroup>
    </div>
  );
}
