import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BedDouble, Check, ShieldHalf, Star, Users, Wind, Zap } from 'lucide-react';
import { donki, hasDonki, osdrFetchedAt, osdrStudies, recordById, type RealRecord } from '../data/records';
import { BACKGROUND_DOSE, BATTERY_OUTPUT, CAREER_LIMIT, CARGO_SPARE_PARTS, CARGO_SUPPLIES, SKIP_CREW_SUPPLIES, DOME_COVERS, POWER_COST, SOLAR_OUTPUT, SOL_SECONDS } from '../engine/constants';
import { MODULE_NAME, SPECIALIST, TRAITS, alive, plansFor, power, suggestCell } from '../engine/engine';
import { sfx } from '../lib/sound';
import type { EventKind, GameState, ModuleKind } from '../engine/types';
import { useGame } from '../store/game';
import { Astronaut, Lander, MODULE_ICON, Marv } from './art';
import { HAPPY } from './crewLook';
import { ScienceBrief, WeatherArt } from './ScienceBrief';
import { BRIEFS, learnedWeather } from '../data/spaceWeather';
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
  pod: { text: 'Landing capsules keep their crew alive for only a short time. They are a ride, not a home.' },
  miner: { text: 'Mars dirt is called regolith. NASA ran a 3D-Printed Habitat Challenge to test building shelters out of materials like it.' },
  rover: { text: 'NASA\'s Curiosity and Perseverance rovers are about the size of a car and can drive themselves around rocks.' },
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
  pod: '', miner: 'Needs 1 power. Its bin fills up: tap it to collect the bricks.', rover: 'Needs 1 power. The rover goes out instead of an astronaut: no tiring, no radiation worries.', hab: 'Needs 1 power. Warm beds for proper sleep, and heat for the whole base.', solar: 'More power, but dust storms block every Solar Field at once.',
  battery: 'Steady power in any weather, but only a little.',
  oxygen: `Needs ${POWER_COST.oxygen} power and someone to run it.`,
  hydro: `Needs ${POWER_COST.hydro} power and someone to run it. Fresh food keeps long-stay crew healthier.`,
  dome: `Needs ${POWER_COST.dome} power, more than anything else. It only protects crew in its blue zone: its own column and the ones beside it.`,
  medbay: `Needs ${POWER_COST.medbay} power. Astronauts inside cannot work.`,
  lab: `Needs ${POWER_COST.lab} power and a worker, and makes nothing you can breathe or eat.`,
  comms: `Needs ${POWER_COST.comms} power all the time to listen.`,
};

/** What M.A.R.V. says when you pick a plan. Each one says what the choice will change. */
const PICK_SAY: Record<ModuleKind, string> = {
  pod: '',
  hab: 'A real home! Warm beds, and heat for everyone.',
  oxygen: 'Air is life. Good call, Commander!',
  solar: `More power! +${SOLAR_OUTPUT} blocks on a sunny day.`,
  battery: `Steady power, +${BATTERY_OUTPUT}, even in a dust storm.`,
  hydro: 'Fresh food! The crew will love it.',
  dome: 'A Shield Dome. The Sun will not scare us now!',
  medbay: 'A doctor\'s room. Sick crew get better faster.',
  lab: 'Science! Earth will send landers sooner.',
  comms: 'Big ears! We will hear about storms sooner.',
  miner: 'Bricks! We can make every module better.',
  rover: 'A rover! It explores and never gets tired.',
};

/** Your base before and after these plans, side by side, so a choice shows what it changes. */
function Preview({ game, picks, crewAfter }: { game: GameState; picks: ModuleKind[]; crewAfter: number }) {
  const has = (k: ModuleKind) => game.modules.some((m) => m.kind === k);
  const gets = (k: ModuleKind) => picks.includes(k);
  const supply = power(game).most;
  const extra = picks.reduce((n, k) => n + (k === 'solar' ? SOLAR_OUTPUT : k === 'battery' ? BATTERY_OUTPUT : 0), 0);
  const rows: { icon: ReactNode; name: string; now: string; after: string }[] = [
    { icon: <Zap />, name: 'Power', now: String(supply), after: String(supply + extra) },
    { icon: <Wind />, name: 'Makes air', now: has('oxygen') ? 'Yes' : 'No', after: has('oxygen') || gets('oxygen') ? 'Yes' : 'No' },
    { icon: <BedDouble />, name: 'Warm beds', now: has('hab') ? 'Yes' : 'No', after: has('hab') || gets('hab') ? 'Yes' : 'No' },
    { icon: <ShieldHalf />, name: 'Storm shield', now: has('dome') ? 'Yes' : 'No', after: has('dome') || gets('dome') ? 'Yes' : 'No' },
    { icon: <Users />, name: 'Crew', now: String(alive(game).length), after: String(crewAfter) },
  ];
  return (
    <section className="preview" aria-label="Your base after this lander">
      <h3>Your base after this lander</h3>
      <div className="preview-skyline" aria-hidden="true">
        {game.modules.filter((m) => m.kind !== 'pod').map((m) => { const Icon = MODULE_ICON[m.kind]; return <span key={m.id} className={`sky-mod k-${m.kind}`}><Icon /></span>; })}
        <AnimatePresence>
          {picks.map((k) => { const Icon = MODULE_ICON[k]; return (
            <motion.span key={k} className={`sky-mod new k-${k}`} initial={{ y: -40, scale: 0, rotate: -20 }} animate={{ y: 0, scale: 1, rotate: 0 }} exit={{ y: -30, scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14 }}><Icon /><b>New</b></motion.span>
          ); })}
        </AnimatePresence>
        {!picks.length && !game.modules.some((m) => m.kind !== 'pod') && <span className="sky-empty">Just the capsule so far. Pick your plans!</span>}
      </div>
      <dl className="preview-rows">
        {rows.map((r) => {
          const up = r.after !== r.now;
          return (
            <div key={r.name} className={up ? 'up' : ''}>
              <dt>{r.icon}{r.name}</dt>
              <dd><span>{r.now}</span>{up && <><ArrowRight /><motion.b key={r.after} initial={{ scale: 0.3 }} animate={{ scale: [1.5, 1] }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>{r.after}</motion.b></>}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export function CargoPanel({ game }: { game: GameState }) {
  const unpack = useGame((s) => s.unpack);
  const offer = game.offer;
  const [picks, setPicks] = useState<ModuleKind[]>([]);
  const [who, setWho] = useState<string | null | undefined>(undefined);
  const [say, setSay] = useState<string | null>(null);
  if (!offer) return null;
  const flip = (k: ModuleKind) => {
    if (picks.includes(k)) { sfx.off(); setSay(null); setPicks(picks.filter((x) => x !== k)); return; }
    sfx.on();
    setSay(PICK_SAY[k]);
    // Already full? The oldest pick makes room, so a change of mind is one tap.
    setPicks(picks.length >= offer.picks ? [...picks.slice(1), k] : [...picks, k]);
  };
  const choosing = offer.crewOptions.length > 0;
  const chosen = who === undefined ? undefined : who;
  const crewAfter = alive(game).length + (chosen ? 1 : 0);
  const ready = picks.length >= offer.picks && (!choosing || chosen !== undefined);
  return (
    <Modal title={`Cargo lander ${offer.number} has landed!`} onClose={() => undefined} wide tone="good" locked>
      <div className="cargo-top">
        <motion.div initial={{ y: -220, rotate: -6 }} animate={{ y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 90, damping: 11 }}><Lander size={72} /></motion.div>
        <p className="lede">{offer.number === 1
          ? 'You earned your first lander! It carries building plans, but only room for two. Air, warmth or power: what do you need most?'
          : choosing ? 'Earth sent help! Choose who joins your crew, then pick the building plans to unpack.' : 'The base is full, so this lander brought supplies and building plans.'}</p>
      </div>
      {choosing && (
        <>
          <h3 className="cargo-step">1. Who comes to Mars?</h3>
          <div className="recruits">
            {offer.crewOptions.map((r, i) => {
              const t = TRAITS[r.trait];
              const on = chosen === r.id;
              return (
                <motion.button key={r.id} className={`recruit-card ${on ? 'picked' : ''}`} onClick={() => setWho(r.id)} aria-pressed={on}
                  initial={{ scale: 0, rotate: i ? 4 : -4 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.3 + i * 0.12 }} whileTap={{ scale: 0.96 }}>
                  <span className="recruit-face"><Astronaut who={r} look={HAPPY} size={58} act="wave" /></span>
                  <span className="recruit-text">
                    <strong>{r.name} <small>the {r.role}</small></strong>
                    <span className="trait-chip">{t.name}: {t.text}</span>
                    <span className="recruit-quirk">"{r.quirk}"</span>
                    <span className="real">{r.role === 'Engineer' && 'Best in the Oxygen Maker.'}{r.role === 'Botanist' && 'Best in Hydroponics.'}{r.role === 'Scientist' && 'Best in the Science Lab.'}{r.role === 'Medic' && 'Best in the Med Bay.'}</span>
                  </span>
                  <span className="tick" aria-hidden="true">{on && <Check />}</span>
                </motion.button>
              );
            })}
            <motion.button className={`recruit-card nobody ${chosen === null ? 'picked' : ''}`} onClick={() => setWho(null)} aria-pressed={chosen === null}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.55 }} whileTap={{ scale: 0.96 }}>
              <span className="recruit-text">
                <strong>Nobody this time</strong>
                <span>Fill the seat with +{SKIP_CREW_SUPPLIES} extra life support instead.</span>
                <span className="real">Fewer mouths to feed, but fewer hands to build and work.</span>
              </span>
              <span className="tick" aria-hidden="true">{chosen === null && <Check />}</span>
            </motion.button>
          </div>
          {chosen && <p className="strain">One more mouth to feed: {crewAfter} astronauts will share your air and food.</p>}
        </>
      )}
      <h3 className="cargo-step">{choosing ? '2. ' : ''}Pick {offer.picks} building plans. You will build both!</h3>
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
                <span className="real">{MODULE_SCIENCE[k].text}</span>
              </span>
              <span className="tick" aria-hidden="true">{on && <Check />}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="cargo-marv">
        <Marv mood="happy" size={56} />
        <AnimatePresence mode="wait">
          <motion.p key={say ?? 'idle'} className="marv-pick" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
            {say ?? (picks.length ? 'Pick one more!' : 'Each plan changes your base. What do we need most?')}
          </motion.p>
        </AnimatePresence>
      </div>
      <Preview game={game} picks={picks} crewAfter={crewAfter} />
      <div className="modal-actions">
        <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} disabled={!ready} onClick={() => unpack(picks, chosen)}>
          {choosing && chosen === undefined ? 'Choose who comes' : picks.length < offer.picks ? `Pick ${offer.picks - picks.length} more` : `Unpack: ${picks.map((k) => MODULE_NAME[k]).join(' + ')}`}
        </motion.button>
        <span className="aside">After this, you choose where each plan is built: tap a glowing + spot. Also on board: {CARGO_SUPPLIES} life support and {CARGO_SPARE_PARTS} spare part. The clock is stopped.</span>
      </div>
    </Modal>
  );
}

/**
 * Choosing what to build. Opened from a glowing spot, it asks what goes there.
 * Opened from the Build button, you pick a plan first and then tap the spot for it.
 * M.A.R.V. marks a good choice, but the commander always decides.
 */
export function BuildPanel({ game, cell }: { game: GameState; cell?: number }) {
  const { open, build, setPlacing } = useGame();
  const here = cell !== undefined;
  const kinds = here ? plansFor(game, cell) : [...new Set(game.blueprints)].sort((a, b) => Number(b === 'hab') - Number(a === 'hab'));
  // M.A.R.V.'s tip: on a spot, the plan this spot suits best. From the dock, the plan to place first.
  const tip = here ? kinds.find((k) => suggestCell(game, k) === cell) : kinds[0];
  return (
    <Modal title={here ? 'What goes here?' : 'Your plans'} onClose={() => open(null)}>
      <p className="lede">{here ? 'Pick what to build on this spot. Then drag an astronaut onto it to build it.' : 'Pick a plan. Then tap a glowing spot to choose where it goes.'}</p>
      <div className="offer-list one">
        {kinds.map((k) => {
          const Icon = MODULE_ICON[k];
          return (
            <motion.button key={k} className={`offer k-${k} ${k === tip && kinds.length > 1 ? 'tipped' : ''}`} onClick={() => (here ? build(k, cell) : setPlacing(k))} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
              <span className="badge"><Icon /></span>
              <span className="offer-text">
                <strong>{MODULE_NAME[k]}{k === tip && kinds.length > 1 && <b className="tip-tag"><Star /> M.A.R.V.'s tip</b>}</strong>
                <span>{MODULE_JOB[k]}.</span><span className="strain">{STRAIN[k]}</span>
              </span>
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
  cme: ['Radiation dose adds up over a whole life, so block as much as you can.', 'Earth cannot help. A radio call there and back can take about 45 minutes. You are the commander.'],
  flare: ['Flares are short. You can switch modules back on soon.', 'Even a half-charged shield helps.'],
  dust: ['If power runs short, the last module you switched on trips off by itself. Better to choose yourself.', 'Batteries keep working in the dust. Solar Fields do not.'],
};

export function EventCard({ game, eventId }: { game: GameState; eventId: string }) {
  const { open, seenKinds } = useGame();
  const e = game.events.find((x) => x.id === eventId);
  // The first time each kind of event comes, M.A.R.V. teaches the real science before anything else.
  const [school, setSchool] = useState(() => !!e && !learnedWeather().includes(e.kind));
  const [first] = useState(school);
  if (!e) return null;
  if (school) {
    return (
      <Modal title={first ? `New danger: ${BRIEFS[e.kind].name.toLowerCase()}!` : BRIEFS[e.kind].name} onClose={() => setSchool(false)} tone="alarm" locked={first} wide>
        {first && <p className="lede wx-lede">Something new is coming, Commander. The clock is stopped. Let's learn what it is, so we can keep the crew safe.</p>}
        <ScienceBrief kind={e.kind} onDone={() => setSchool(false)} doneLabel={first ? 'What do we do?' : 'Back to the warning'} />
      </Modal>
    );
  }
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
        <button className="btn btn-small" onClick={() => { sfx.ping(); setSchool(true); }}>How does this work?</button>
        <span className="aside">The clock is stopped while you read.</span>
      </div>
    </Modal>
  );
}

/** The NASA Science Log: what real data is behind whatever is happening right now. */
export function DataPanel({ recordId }: { recordId?: string }) {
  const { open, sun, game } = useGame();
  const [lesson, setLesson] = useState<EventKind | null>(null);
  const learned = learnedWeather();
  if (lesson) {
    return (
      <Modal title={BRIEFS[lesson].name} onClose={() => setLesson(null)} wide>
        <ScienceBrief kind={lesson} onDone={() => setLesson(null)} doneLabel="Back to the Science Log" />
      </Modal>
    );
  }
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

      <section className="source school">
        <h3>Space weather school</h3>
        <p>M.A.R.V. teaches each of these the first time it happens. Play any of them again here.</p>
        <div className="school-list">
          {(['flare', 'cme', 'dust'] as EventKind[]).map((k) => (
            <motion.button key={k} className={`school-btn k-${k} ${learned.includes(k) ? 'learned' : ''}`} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }} onClick={() => { sfx.ping(); setLesson(k); }}>
              <span className="school-art"><WeatherArt id={BRIEFS[k].cards[0].art} /></span>
              <b>{BRIEFS[k].name}</b>
              <small>{learned.includes(k) ? <><Check /> Learned</> : 'Not met yet'}</small>
            </motion.button>
          ))}
        </div>
      </section>

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
          <li>Dust storms: from NASA/JPL rover and lander reports.</li>
        </ul>
      </section>

      <section className="source honest">
        <h3>What we changed to make it a game</h3>
        <ul className="plain">
          <li>Time is squeezed. A real sol is about 24 hours and 40 minutes. Here one passes in {SOL_SECONDS.easy} seconds on Easy, {SOL_SECONDS.normal} on Normal and {SOL_SECONDS.hard} on Hard. Running out of air really harms a person in minutes, not sols.</li>
          <li>Storm radiation is turned up. On the real Mars surface one solar storm adds far less dose than it does here.</li>
          <li>Long-stay wear is real, but how fast it happens here is a game number. The studies used mice, bed rest and the Space Station, not Mars.</li>
          <li>The Shield Dome is simplified. Real plans use thick walls, water tanks and Mars dirt, with no switch.</li>
          <li>Cargo landers every few sols are much faster than real life. A real trip from Earth takes about seven months.</li>
          <li>Spare parts and the Patch button are made up. Fixing things with what you have is very real: the Apollo 13 crew built an air filter from a plastic bag, a hose, cardboard and tape.</li>
          <li>The crew's names, jokes and habits are made up to make them feel like people.</li>
          <li>The discoveries around your base are real things the Curiosity rover has seen in Gale Crater. Where they sit next to your base is made up.</li>
          <li>Water ice under Gale Crater is a game choice. Most ice found under Mars so far is much farther from the equator.</li>
          <li>Energy, sleep and mood are made much simpler and faster than in real life. Real Space Station crews are scheduled for about eight and a half hours of sleep a day.</li>
          <li>Real Mars missions plan very hard so that nobody dies. In the game it can happen, so every choice matters.</li>
          <li>Crew vitals follow an EMT's field notes for low oxygen, cold and radiation sickness, simplified for young players.</li>
        </ul>
      </section>
    </Modal>
  );
}
