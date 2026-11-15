import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { donki, hasDonki, osdrFetchedAt, osdrStudies, recordById, type RealRecord } from '../data/records';
import { BACKGROUND_DOSE, CAREER_LIMIT, CARGO_SPARE_PARTS, CARGO_SUPPLIES, DOME_COVERS, POWER_COST, SOL_SECONDS } from '../engine/constants';
import { MODULE_NAME, SPECIALIST, alive, buildableCells } from '../engine/engine';
import type { EventKind, GameState, ModuleKind } from '../engine/types';
import { useGame } from '../store/game';
import { Astronaut, Lander, MODULE_ICON, Marv } from './art';
import { HAPPY } from './crewLook';
import { MODULE_JOB } from './Diorama';

export const EVENT_TITLE: Record<EventKind, string> = { cme: 'Solar storm', flare: 'Solar flare', dust: 'Dust storm' };

export function Modal({ title, children, onClose, wide, tone, locked }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; tone?: 'alarm' | 'good'; locked?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={(e) => { if (locked) e.preventDefault(); }} onClose={onClose}
      onClick={(e) => { if (!locked && e.target === ref.current) onClose(); }}>
      <motion.div className={`modal-body ${tone ?? ''}`} initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
        <header className="modal-head">
          <h2>{title}</h2>
          {!locked && <button className="btn btn-ghost" onClick={onClose}>Close</button>}
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

/** The real science behind each module, shown when it is offered and in the Science Log. */
export const MODULE_SCIENCE: Record<ModuleKind, { text: string; study?: string }> = {
  hab: { text: 'Mars averages about minus 80°F. A habitat has to make its own warmth.' },
  solar: { text: 'Mars gets less than half the sunlight Earth does, and dust can block most of it. In 2018 the Opportunity rover\'s solar power fell from 645 to 22 watt-hours a day.' },
  battery: { text: 'Rovers and landers on Mars store power in batteries to get through nights and dust storms.' },
  oxygen: { text: 'NASA\'s MOXIE machine on the Perseverance rover made 122 grams of real oxygen out of Mars air.' },
  hydro: { text: 'Astronauts have grown and eaten lettuce on the Space Station, and scientists have grown grass in pretend Mars dirt.', study: 'OSD-581' },
  dome: { text: 'Mars has no magnetic shield and very thin air, so radiation reaches the ground. Piling Mars dirt (regolith) over a shelter is a real plan for blocking it.', study: 'OSD-720' },
  medbay: { text: 'Doctors tracked the blood of the Inspiration4 astronauts before, during and after flight to catch problems early.', study: 'OSD-569' },
  lab: { text: 'Science is why we go. Every experiment on Mars teaches Earth something new.' },
  comms: { text: 'A radio message between Mars and Earth takes 4 to 24 minutes each way. A better antenna means NASA\'s storm forecasts reach you sooner.' },
};
const STRAIN: Record<ModuleKind, string> = {
  hab: '', solar: 'More power, but dust storms block every Solar Field at once.',
  battery: 'Steady power in any weather, but only a little.',
  oxygen: `Needs ${POWER_COST.oxygen} power and someone to run it.`,
  hydro: `Needs ${POWER_COST.hydro} power and someone to run it. Fresh food keeps long-stay crew healthier.`,
  dome: `Needs ${POWER_COST.dome} power, more than anything else. One dome covers ${DOME_COVERS} astronauts.`,
  medbay: `Needs ${POWER_COST.medbay} power. Astronauts inside cannot work.`,
  lab: `Needs ${POWER_COST.lab} power and a worker, and makes nothing you can breathe or eat.`,
  comms: `Needs ${POWER_COST.comms} power all the time to listen.`,
};

export function CargoPanel({ game }: { game: GameState }) {
  const unpack = useGame((s) => s.unpack);
  const offer = game.offer;
  const [picks, setPicks] = useState<ModuleKind[]>([]);
  if (!offer) return null;
  const flip = (k: ModuleKind) => setPicks((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length < offer.picks ? [...p, k] : p));
  const crewAfter = alive(game).length + (offer.crew ? 1 : 0);
  return (
    <Modal title={`Cargo lander ${offer.number} has landed!`} onClose={() => undefined} wide tone="good" locked>
      <div className="cargo-top">
        <motion.div initial={{ y: -220, rotate: -6 }} animate={{ y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 90, damping: 11 }}><Lander size={72} /></motion.div>
        {offer.crew ? (
          <motion.div className="recruit" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.5 }}>
            <Astronaut who={offer.crew} look={HAPPY} size={52} />
            <div>
              <p className="record-kicker">New crew member</p>
              <h3>{offer.crew.name} the {offer.crew.role}</h3>
              <p>{offer.crew.role === 'Engineer' && 'Best in the Oxygen Maker.'}{offer.crew.role === 'Botanist' && 'Best in Hydroponics.'}{offer.crew.role === 'Scientist' && 'Best in the Science Lab.'}{offer.crew.role === 'Medic' && 'Makes the Med Bay heal faster.'}</p>
              <p className="quirk">"{offer.crew.quirk}"</p>
              <p className="strain">One more mouth to feed: {crewAfter} astronauts now share your air and food.</p>
            </div>
          </motion.div>
        ) : (
          <div className="recruit"><p>The base is full, so this lander brought only supplies and blueprints.</p></div>
        )}
      </div>
      <p className="lede">The lander could only carry so much. Pick {offer.picks} blueprints to unpack.</p>
      <div className="offer-list">
        {offer.options.map((k, i) => {
          const Icon = MODULE_ICON[k];
          const on = picks.includes(k);
          return (
            <motion.button key={k} className={`offer k-${k} ${on ? 'picked' : ''}`} onClick={() => flip(k)} aria-pressed={on} whileTap={{ scale: 0.96 }}
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.7 + i * 0.07 }}>
              <span className="badge"><Icon /></span>
              <span className="offer-text">
                <strong>{MODULE_NAME[k]}</strong>
                <span>{MODULE_JOB[k]}{SPECIALIST[k] ? `. Best with a ${SPECIALIST[k]}` : ''}.</span>
                <span className="strain">{STRAIN[k]}</span>
                <span className="real">Real science: {MODULE_SCIENCE[k].text}{MODULE_SCIENCE[k].study ? ` (NASA OSDR ${MODULE_SCIENCE[k].study})` : ''}</span>
              </span>
              <span className="tick" aria-hidden="true">{on && <Check />}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="modal-actions">
        <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} disabled={picks.length < offer.picks} onClick={() => unpack(picks)}>
          {picks.length < offer.picks ? `Pick ${offer.picks - picks.length} more` : 'Unpack the lander'}
        </motion.button>
        <span className="aside">Also on board: {CARGO_SUPPLIES} life support and {CARGO_SPARE_PARTS} spare part. The clock is stopped.</span>
      </div>
    </Modal>
  );
}

export function BuildPanel({ game, cell }: { game: GameState; cell?: number }) {
  const { open, build } = useGame();
  const kinds = [...new Set(game.blueprints)].filter((k) => cell === undefined || buildableCells(game, k).includes(cell));
  return (
    <Modal title="Build" onClose={() => open(null)}>
      <p className="lede">Pick a blueprint to put up. Building takes 1 sol.</p>
      <div className="offer-list one">
        {kinds.map((k) => {
          const Icon = MODULE_ICON[k];
          return (
            <motion.button key={k} className={`offer k-${k}`} onClick={() => build(k, cell)} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
              <span className="badge"><Icon /></span>
              <span className="offer-text"><strong>{MODULE_NAME[k]}</strong><span>{MODULE_JOB[k]}.</span><span className="strain">{STRAIN[k]}</span></span>
            </motion.button>
          );
        })}
      </div>
    </Modal>
  );
}

export function LogPanel({ game }: { game: GameState }) {
  const open = useGame((s) => s.open);
  return (
    <Modal title="Mission log" onClose={() => open(null)}>
      <ol className="terminal">
        {game.log.slice().reverse().map((l, i) => (<li key={i} className={`log-${l.tone}`}><span>SOL {String(Math.floor(l.t)).padStart(2, '0')}</span>{l.text}</li>))}
      </ol>
    </Modal>
  );
}

const HEADLINE: Record<EventKind, string> = {
  cme: 'A cloud of radiation is flying at us from the Sun! Time to science our way out of this, Commander!',
  flare: 'The Sun just flashed! Radiation arrives at the speed of light!',
  dust: 'A wall of dust is about to hide the Sun!',
};
const FIRST_TIME: Record<EventKind, string[]> = {
  cme: ['Radiation damage never heals, so block as much as you can.', 'Earth cannot help. A radio call there and back takes up to 48 minutes. You are the commander.'],
  flare: ['Flares are short. You can switch modules back on soon.', 'Even a half-charged shield helps.'],
  dust: ['If power runs short, the last module you switched on trips off by itself. Better to choose yourself.', 'Batteries keep working in the dust. Solar Fields do not.'],
};

export function EventCard({ game, eventId }: { game: GameState; eventId: string }) {
  const { open, seenKinds } = useGame();
  const e = game.events.find((x) => x.id === eventId);
  if (!e) return null;
  const rec = recordById(e.recordId);
  const domes = game.modules.filter((m) => m.kind === 'dome' && m.buildLeft <= 0).length;
  const crew = alive(game).length;
  const todo = e.kind === 'dust'
    ? 'Solar power is about to drop. Decide which modules you can live without.'
    : !domes ? 'You have no Shield Dome. Keep the crew warm and breathing, and let the sick rest in the Hab or Med Bay after.'
      : domes * DOME_COVERS < crew ? `Switch on your Shield Dome (${POWER_COST.dome} power). It only covers ${DOME_COVERS} of your ${crew} crew, so some radiation will get through.`
        : `Switch on ${domes > 1 && crew > DOME_COVERS ? 'both Shield Domes' : 'the Shield Dome'}. Each needs ${POWER_COST.dome} power, so switch other modules off first.`;
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

/** The NASA Science Log: what real data is behind whatever is happening right now. */
export function DataPanel({ recordId }: { recordId?: string }) {
  const { open, sun, game } = useGame();
  const live = game?.events.find((e) => e.phase === 'active' || e.phase === 'warned');
  const rec = recordById(recordId ?? live?.recordId ?? '');
  const when = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const built = game ? [...new Set(game.modules.map((m) => m.kind))] : [];
  const oldest = game ? Math.max(...game.crew.map((c) => Math.floor(game.time - c.arrived))) : 0;
  const study = (id?: string) => osdrStudies.find((s) => s.id === id);
  return (
    <Modal title="NASA Science Log" onClose={() => open(null)} wide>
      {game && (
        <section className="source now">
          <h3>Right now on your base</h3>
          {rec && <RecordCard r={rec} />}
          <ul className="studies">
            <li>
              <b>Your longest-serving astronaut has been on Mars for {oldest} sols.</b>
              <p>Long stays wear the body down, so long-stay crew need more food. That rule comes from these NASA studies:</p>
              {osdrStudies.filter((s) => s.system === 'tenure').map((s) => (
                <p key={s.id}><a href={s.link} target="_blank" rel="noreferrer">{s.id}</a> {s.teaches}</p>
              ))}
            </li>
            {built.map((k) => (
              <li key={k}>
                <b>{MODULE_NAME[k]}</b>
                <p>{MODULE_SCIENCE[k].text}{study(MODULE_SCIENCE[k].study) && <> <a href={study(MODULE_SCIENCE[k].study)!.link} target="_blank" rel="noreferrer">{MODULE_SCIENCE[k].study}</a></>}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

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
          <li>Everyday radiation: {BACKGROUND_DOSE} mSv each sol, measured by the Curiosity rover's RAD detector at Gale Crater, where your base sits.</li>
          <li>Health limit: {CAREER_LIMIT} mSv is NASA's real career radiation limit for astronauts. Reach it in the game and health hits zero.</li>
          <li>Dust storms: from NASA/JPL rover and lander reports. These three were typed in by hand, not downloaded.</li>
        </ul>
      </section>

      <section className="source honest">
        <h3>What we changed to make it a game</h3>
        <ul className="plain">
          <li>Time is squeezed. One sol passes in {SOL_SECONDS} seconds. Running out of air really harms a person in minutes, not sols.</li>
          <li>Storm radiation is turned up. On the real Mars surface one solar storm adds far less dose than it does here.</li>
          <li>Long-stay wear is real, but how fast it happens here is a game number. The studies used mice, bed rest and the Space Station, not Mars.</li>
          <li>The Shield Dome is simplified. Real plans use thick walls, water tanks and Mars dirt, with no switch.</li>
          <li>Cargo landers every few sols are much faster than real life. A real trip from Earth takes about seven months.</li>
          <li>Spare parts and the Patch button are made up. Fixing things with what you have is very real: the Apollo 13 crew built an air filter from a plastic bag, a hose, cardboard and tape.</li>
          <li>The crew's names, jokes and habits are made up to make them feel like people.</li>
          <li>The discoveries around your base are real things the Curiosity rover has seen in Gale Crater, typed in by hand from NASA pages. Where they sit next to your base is made up.</li>
          <li>Water ice under Gale Crater is a game choice. Most ice found under Mars so far is much farther from the equator.</li>
          <li>Real Mars missions plan very hard so that nobody dies. In the game it can happen, so every choice matters.</li>
          <li>Crew vitals follow an EMT's field notes for low oxygen, cold and radiation sickness, simplified for young players.</li>
        </ul>
      </section>
    </Modal>
  );
}
