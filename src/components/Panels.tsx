import { useEffect, useRef, type ReactNode } from 'react';
import { donki, hasDonki, osdrFetchedAt, osdrStudies, recordById, type RealRecord } from '../data/records';
import { BACKGROUND_DOSE, BUILD_LIFE_COST, BUILD_SOLS, CAREER_LIMIT, POWER_COST, SOL_SECONDS, SURFACE_SLOTS } from '../engine/constants';
import { MODULE_NAME, canBuild } from '../engine/engine';
import type { GameState, ModuleKind } from '../engine/types';
import { useGame } from '../store/game';
import { EVENT_TITLE } from './Alerts';
import { ModuleArt } from './art';
import { MODULE_JOB } from './Outpost';

function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="modal-body">
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-quiet" onClick={onClose}>Close</button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

function RecordCard({ r }: { r: RealRecord }) {
  return (
    <section className="record">
      <p className="record-kicker">This really happened: {r.date}</p>
      <h3>{r.title}</h3>
      <p>{r.story}</p>
      {r.facts.length > 0 && (
        <dl className="facts">
          {r.facts.map((f) => (<div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>))}
        </dl>
      )}
      <p className="record-use">
        In the game, this record sets the storm's strength to <b>{Math.round(r.strength * 100)} out of 100</b>.{' '}
        {r.kind === 'flare' && 'Bigger flare class, stronger storm.'}
        {r.kind === 'cme' && 'Faster cloud, stronger storm.'}
        {r.kind === 'dust' && 'Thicker dust, less sunlight.'}
      </p>
      <p className="record-source">Source: {r.source}. <a href={r.link} target="_blank" rel="noreferrer">Open the NASA record</a></p>
    </section>
  );
}

const WHAT_TO_DO: Record<'cme' | 'flare' | 'dust', string[]> = {
  cme: [
    'A cloud of radiation from the Sun is on its way. You have a little time, because the cloud is slower than light.',
    'Switch on the Storm Shield before it lands. The shield needs a lot of power, so something else has to go off.',
    'Radiation damage never heals. Every bit you block now is health your crew keeps for the whole mission.',
  ],
  flare: [
    'A flare travels at the speed of light. By the time you see it, it is almost here.',
    'Get the Storm Shield on as fast as you can. Even a half-charged shield helps.',
    'Flares are short. You can switch things back on soon.',
  ],
  dust: [
    'Dust is about to hide the Sun, and your solar arrays will make much less power.',
    'When power runs short, the newest machine you switched on trips off by itself. Better to choose yourself.',
    'A cold crew eats twice as much. A crew with no air is in danger fast. Which matters more right now?',
  ],
};

export function BriefPanel({ game, eventId }: { game: GameState; eventId: string }) {
  const open = useGame((s) => s.open);
  const e = game.events.find((x) => x.id === eventId);
  if (!e) return null;
  const rec = recordById(e.recordId);
  return (
    <Modal title={`${EVENT_TITLE[e.kind]} warning`} onClose={() => open(null)}>
      <p className="lede">The clock is stopped while you read. This is the first one, so here is what to know.</p>
      <ul className="steps">{WHAT_TO_DO[e.kind].map((t) => <li key={t}>{t}</li>)}</ul>
      <p className="aside">Earth cannot help in time. A radio message to Mission Control and back takes up to 48 minutes. On Mars, the commander decides. That is you.</p>
      {rec && <RecordCard r={rec} />}
      <div className="modal-actions"><button className="btn btn-go" onClick={() => open(null)} autoFocus>Back to the outpost</button></div>
    </Modal>
  );
}

const STRAIN: Record<ModuleKind, string> = {
  solar: 'More power. But arrays sit out on the surface, so every dust storm hits them all.',
  oxygen: 'More air each sol. But it is the hungriest life-support machine you have.',
  greenhouse: 'More food each sol. But one more room to keep running.',
  heater: 'Keeps bodies warm. Cheap to run, costly to forget.',
  shield: 'Blocks most storm radiation. But it needs more power than anything else you own.',
  medbay: 'Treats radiation sickness and speeds up healing. But it has one bed, and it needs power too.',
};

export function BuildPanel({ game, slot }: { game: GameState; slot: number }) {
  const { open, build } = useGame();
  const surface = SURFACE_SLOTS.includes(slot);
  const kinds: ModuleKind[] = surface ? ['solar'] : ['shield', 'medbay', 'oxygen', 'greenhouse', 'heater'];
  return (
    <Modal title={surface ? 'Build on the surface' : 'Build a room'} onClose={() => open(null)}>
      <p className="lede">
        Building takes {BUILD_SOLS} sols and uses {BUILD_LIFE_COST} life support, because working in a spacesuit is hard.
        Nothing here is free.
      </p>
      <div className="build-list">
        {kinds.map((k) => {
          const why = canBuild(game, k, slot);
          return (
            <button key={k} className="build-item" disabled={!!why} onClick={() => build(k, slot)}>
              <ModuleArt kind={k} on />
              <span className="build-text">
                <strong>{MODULE_NAME[k]}</strong>
                <span>{MODULE_JOB[k]}. {k === 'solar' ? '' : `Needs ${POWER_COST[k]} power.`}</span>
                <span className="strain">{why ?? STRAIN[k]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function DataPanel({ recordId }: { recordId?: string }) {
  const { open, sun } = useGame();
  const rec = recordId ? recordById(recordId) : undefined;
  const when = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <Modal title="The real NASA data in this game" onClose={() => open(null)} wide>
      {rec && <RecordCard r={rec} />}

      <section className="source">
        <h3>Storms: NASA DONKI</h3>
        <p>
          DONKI is NASA's space weather database. Flight controllers use it to track solar flares and solar storms.
          Every flare and solar storm in this game is a real one from DONKI.
        </p>
        {hasDonki && donki ? (
          <p className="stamp">
            Saved copy: {donki.flares.length} flares and {donki.cmes.length} solar storms, downloaded on {when(donki.fetchedAt)}. These are archived records, not live ones.
          </p>
        ) : (
          <p className="stamp warn">The DONKI archive has not been downloaded into this copy yet, so storms are practice ones for now.</p>
        )}
        <p className="stamp">
          {sun.status === 'live' && `Live check, ${sun.from} to ${sun.to}: the real Sun fired ${sun.mFlares} M-class and ${sun.xFlares} X-class flares${sun.biggest ? ` (biggest: ${sun.biggest})` : ''}. The Sun is ${sun.level}, so storms in your next mission are ${sun.activity > 1 ? 'a bit stronger' : sun.activity < 1 ? 'a bit weaker' : 'normal strength'}.`}
          {sun.status === 'offline' && 'Live check: could not reach NASA just now, so storm strength is set to normal.'}
          {sun.status === 'loading' && 'Live check: asking NASA about the last 30 days of solar flares...'}
        </p>
        <p><a href="https://kauai.ccmc.gsfc.nasa.gov/DONKI/" target="_blank" rel="noreferrer">Visit DONKI</a></p>
      </section>

      <section className="source">
        <h3>Crew health: NASA Open Science Data Repository</h3>
        <p>OSDR holds the results of real space biology experiments. These studies are behind the health rules in the game. Saved on {when(osdrFetchedAt)}.</p>
        <ul className="studies">
          {osdrStudies.map((s) => (
            <li key={s.id}>
              <a href={s.link} target="_blank" rel="noreferrer">{s.id}</a> <span className="study-title">{s.title}</span>
              <p>{s.teaches}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="source">
        <h3>Mars itself</h3>
        <ul className="plain">
          <li>Everyday radiation: {BACKGROUND_DOSE} mSv each sol, measured by the Curiosity rover's RAD detector at Gale Crater, where your outpost sits.</li>
          <li>Health limit: {CAREER_LIMIT} mSv is NASA's real career radiation limit for astronauts. Reach it in the game and health hits zero.</li>
          <li>Dust storms: from NASA/JPL rover and lander reports. These three were typed in by hand, not downloaded.</li>
        </ul>
      </section>

      <section className="source honest">
        <h3>What we changed to make it a game</h3>
        <ul className="plain">
          <li>Time is squeezed. One sol passes in {SOL_SECONDS} seconds. Running out of air really harms a person in minutes, not sols.</li>
          <li>Storm radiation is turned up. On the real Mars surface, one solar storm adds far less dose than it does here. We scaled it so each storm matters in a 30-sol mission.</li>
          <li>The Storm Shield is make-believe technology. Real plans use thick walls, water tanks and Mars dirt.</li>
          <li>Crew vitals follow an EMT's field notes for low oxygen, cold and radiation sickness, simplified for young players.</li>
        </ul>
      </section>
    </Modal>
  );
}
