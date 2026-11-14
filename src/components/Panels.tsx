import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { donki, hasDonki, osdrFetchedAt, osdrStudies, recordById, type RealRecord } from '../data/records';
import { BACKGROUND_DOSE, CAREER_LIMIT, SOL_SECONDS } from '../engine/constants';
import type { EventKind, GameState } from '../engine/types';
import { useGame } from '../store/game';
import { Marv } from './art';

export const EVENT_TITLE: Record<EventKind, string> = { cme: 'Solar storm', flare: 'Solar flare', dust: 'Dust storm' };

function Modal({ title, children, onClose, wide, tone }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; tone?: 'alarm' }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <motion.div className={`modal-body ${tone ?? ''}`} initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </header>
        {children}
      </motion.div>
    </dialog>
  );
}

function RecordCard({ r }: { r: RealRecord }) {
  return (
    <section className="record">
      <p className="record-kicker">{r.id.startsWith('no-snapshot') ? 'Practice storm: NASA record not downloaded yet' : `NASA record: this really happened, ${r.date}`}</p>
      <h3>{r.title}</h3>
      <p>{r.story}</p>
      {r.facts.length > 0 && (
        <dl className="facts">
          {r.facts.map((f) => (<div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>))}
        </dl>
      )}
      <p className="record-use">
        In the game this record sets the strength to <b>{Math.round(r.strength * 100)}/100</b>.{' '}
        {r.kind === 'flare' && 'Bigger flare class, stronger hit.'}
        {r.kind === 'cme' && 'Faster cloud, stronger storm.'}
        {r.kind === 'dust' && 'Thicker dust, less sunlight.'}
        {' '}Source: {r.source}. <a href={r.link} target="_blank" rel="noreferrer">Open the NASA record</a>
      </p>
    </section>
  );
}

const HEADLINE: Record<EventKind, string> = {
  cme: 'A cloud of radiation is flying at us from the Sun!',
  flare: 'The Sun just flashed! Radiation arrives at the speed of light!',
  dust: 'A wall of dust is about to hide the Sun!',
};
const FIRST_TIME: Record<EventKind, string[]> = {
  cme: ['Radiation damage never heals, so block as much as you can.', 'Earth cannot help. A radio call there and back takes up to 48 minutes. You are the commander.'],
  flare: ['Flares are short. You can switch rooms back on soon.', 'Even a half-charged shield helps.'],
  dust: ['If power runs short, the last room you switched on trips off by itself. Better to choose yourself.', 'A cold crew eats twice as much food.'],
};

export function EventCard({ game, eventId }: { game: GameState; eventId: string }) {
  const { open, seenKinds } = useGame();
  const e = game.events.find((x) => x.id === eventId);
  if (!e) return null;
  const rec = recordById(e.recordId);
  const hasShield = game.loadout.shield > 0;
  const todo = e.kind === 'dust'
    ? 'Solar power is about to drop. Decide which rooms you can live without.'
    : hasShield
      ? 'Switch on the Storm Shield. It needs 6 power, so switch other rooms off first.'
      : 'You have no Storm Shield. Keep the crew warm and breathing, and use the Med Bay after.';
  return (
    <Modal title={`${EVENT_TITLE[e.kind]} warning!`} onClose={() => open(null)} tone="alarm">
      <div className="event-top">
        <Marv mood="alert" size={92} />
        <div>
          <p className="lede">{HEADLINE[e.kind]}</p>
          <p className="todo">{todo}</p>
        </div>
      </div>
      {!seenKinds.includes(e.kind) && <ul className="plain">{FIRST_TIME[e.kind].map((t) => <li key={t}>{t}</li>)}</ul>}
      {rec && <RecordCard r={rec} />}
      <div className="modal-actions">
        <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} onClick={() => open(null)} autoFocus>I am ready</motion.button>
        <span className="aside">The clock is stopped while you read.</span>
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
        <p>DONKI is NASA's space weather database. Flight controllers use it to track solar flares and solar storms. Every flare and solar storm in this game is a real one from DONKI.</p>
        {hasDonki && donki ? (
          <p className="stamp">Saved copy: {donki.flares.length} flares and {donki.cmes.length} solar storms, downloaded {when(donki.fetchedAt)}. These are archived records, not live ones.</p>
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
        <p>OSDR holds the results of real space biology experiments. These studies are behind the health rules in the game. Saved {when(osdrFetchedAt)}.</p>
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
          <li>Storm radiation is turned up. On the real Mars surface one solar storm adds far less dose than it does here. We scaled it so each storm matters in a 30-sol mission.</li>
          <li>The Storm Shield is make-believe technology. Real plans use thick walls, water tanks and Mars dirt.</li>
          <li>Payload masses are game numbers. The lesson is real: every kilogram costs fuel, so you cannot bring everything.</li>
          <li>Crew vitals follow an EMT's field notes for low oxygen, cold and radiation sickness, simplified for young players.</li>
        </ul>
      </section>
    </Modal>
  );
}
