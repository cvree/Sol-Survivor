import { useEffect, useRef } from 'react';
import { FACTS } from '../data/facts';
import { BUILD_SOLS, POWER_COST, ROOM_SLOTS, SOLAR_OUTPUT, SURFACE_SLOTS } from '../engine/constants';
import { MODULE_NAME, activeEvents, power, stormDose } from '../engine/engine';
import type { GameState, ModuleKind, ModuleState } from '../engine/types';
import { useGame } from '../store/game';
import { ModuleArt } from './art';

export const MODULE_JOB: Record<ModuleKind, string> = {
  solar: `Makes ${SOLAR_OUTPUT} power from sunlight`,
  oxygen: 'Makes air to breathe',
  greenhouse: 'Grows food',
  heater: 'Keeps the crew warm',
  shield: 'Blocks storm radiation',
  medbay: 'Heals one crew member',
};

function Pips({ n }: { n: number }) {
  return (
    <span className="cost" aria-label={`Needs ${n} power`}>
      {Array.from({ length: n }, (_, i) => <i key={i} />)}
    </span>
  );
}

function Room({ m, game }: { m: ModuleState; game: GameState }) {
  const { toggle, remove } = useGame();
  const building = m.buildLeft > 0;
  const solar = m.kind === 'solar';
  const lit = solar ? !building && power(game).sunlight > 0.5 : m.on;
  const patient = m.kind === 'medbay' && m.on ? game.crew.find((c) => c.id === game.patient) : null;
  const state = building ? `Building ${Math.round((1 - m.buildLeft / BUILD_SOLS) * 100)}%` : solar ? (lit ? 'Making power' : 'Dusty') : m.on ? 'On' : 'Off';
  return (
    <div className={`room room-${m.kind} ${lit ? 'on' : 'off'} ${building ? 'building' : ''}`}>
      <button
        className="room-main"
        onClick={() => toggle(m.id)}
        disabled={solar || building}
        aria-pressed={solar ? undefined : m.on}
        aria-label={`${MODULE_NAME[m.kind]}. ${state}. ${MODULE_JOB[m.kind]}.${solar ? '' : ` Needs ${POWER_COST[m.kind]} power. Press to switch ${m.on ? 'off' : 'on'}.`}`}
      >
        <ModuleArt kind={m.kind} on={lit} />
        <span className="room-name">{MODULE_NAME[m.kind]}</span>
        <span className="room-job">{patient ? `Treating ${patient.name}` : m.kind === 'medbay' && m.on ? 'Bed is empty. Pick a patient.' : MODULE_JOB[m.kind]}</span>
        <span className="room-foot">
          {!solar && <Pips n={POWER_COST[m.kind]} />}
          <span className="room-state">{state}</span>
        </span>
        {building && <span className="build-bar"><i style={{ width: `${(1 - m.buildLeft / BUILD_SOLS) * 100}%` }} /></span>}
      </button>
      {!building && (
        <button className="room-remove" onClick={() => { if (confirm(`Take apart the ${MODULE_NAME[m.kind]}? You get nothing back.`)) remove(m.id); }} aria-label={`Take apart the ${MODULE_NAME[m.kind]}`} title="Take apart">×</button>
      )}
    </div>
  );
}

function Empty({ slot, surface }: { slot: number; surface: boolean }) {
  const open = useGame((s) => s.open);
  return (
    <button className={`room room-empty ${surface ? 'pad' : ''}`} onClick={() => open({ type: 'build', slot })}>
      <span className="plus" aria-hidden="true">+</span>
      <span>{surface ? 'Build solar array' : 'Build a room'}</span>
    </button>
  );
}

export function Outpost({ game }: { game: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  const at = (slot: number) => game.modules.find((m) => m.slot === slot);
  const dust = activeEvents(game, 'dust').length > 0;
  const storm = stormDose(game) > 0;
  const sol = Math.floor(game.time);
  const fact = FACTS[(sol + game.seed) % FACTS.length];

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
        <div className="sun" />
        <div className="storm-rays" />
        <div className="hills" />
        <div className="dome" style={{ opacity: game.shield / 100 }} />
        <div className="dust-layer" />
      </div>
      <div className="surface">
        {SURFACE_SLOTS.map((slot) => {
          const m = at(slot);
          return m ? <Room key={slot} m={m} game={game} /> : <Empty key={slot} slot={slot} surface />;
        })}
      </div>
      <div className="underground">
        <div className="rooms">
          {ROOM_SLOTS.map((slot) => {
            const m = at(slot);
            return m ? <Room key={slot} m={m} game={game} /> : <Empty key={slot} slot={slot} surface={false} />;
          })}
        </div>
        <p className="fact"><strong>Did you know?</strong> {fact}</p>
      </div>
    </div>
  );
}
