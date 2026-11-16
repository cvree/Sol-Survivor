import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Ear, FastForward, Gamepad2, Hammer, HelpCircle, Home, Keyboard, Lightbulb, Music, Play, RotateCcw, Settings as Gear, Sparkles, Type,
  Vibrate, Volume2, VolumeX, Wand2, Wind, X, Zap,
} from 'lucide-react';
import { MISSION_SOLS } from '../engine/constants';
import { alive } from '../engine/engine';
import { DEFAULTS, useSettings, type Settings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { useDrag } from '../lib/crewDrag';
import { useGame } from '../store/game';
import { Marv } from './art';

/**
 * The Esc menu: settings and options, open from anywhere with Esc or the gear button.
 * The clock stops and the music goes soft while it is open. Everything is kept on this device.
 */

type Tab = 'sound' | 'play' | 'look' | 'help';
const TABS: { id: Tab; name: string; icon: ReactNode }[] = [
  { id: 'sound', name: 'Sound', icon: <Volume2 /> },
  { id: 'play', name: 'Play', icon: <Gamepad2 /> },
  { id: 'look', name: 'Look', icon: <Sparkles /> },
  { id: 'help', name: 'Help', icon: <HelpCircle /> },
];
const TAB_KEY = 'sol-survivor:settings-tab';

/** Stars for the night sky behind the menu: position, size and twinkle delay. */
const STARS = Array.from({ length: 34 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  s: 6 + ((i * 7) % 4) * 3,
  d: ((i * 0.41) % 2.6).toFixed(2),
}));

/** The gear button. Same as pressing Esc. */
export function SettingsButton({ className = '' }: { className?: string }) {
  const setOpen = useGame((s) => s.setSettingsOpen);
  return (
    <motion.button className={`icon-btn gear-btn ${className}`} whileTap={{ scale: 0.88 }} whileHover={{ rotate: 45 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      onClick={() => setOpen(true)} aria-label="Settings (Esc)" title="Settings (Esc)"><Gear /></motion.button>
  );
}

/** Listens for Esc everywhere and shows the menu. Mounted once, at the top of the app. */
export function SettingsHost() {
  const open = useGame((s) => s.settingsOpen);
  const setOpen = useGame((s) => s.setSettingsOpen);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat) return;
      if (useGame.getState().settingsOpen) return; // the menu's own dialog closes itself
      // Esc first closes whatever is in the way: an open card, or an astronaut you are holding.
      if (document.querySelector('dialog[open]')) return;
      if (useDrag.getState().sel || useDrag.getState().id || useGame.getState().picked) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
  return <AnimatePresence>{open && <SettingsMenu key="menu" onClose={() => setOpen(false)} />}</AnimatePresence>;
}

function SettingsMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>(() => { try { return (localStorage.getItem(TAB_KEY) as Tab) || 'sound'; } catch { return 'sound'; } });
  const game = useGame((s) => s.game);
  const screen = useGame((s) => s.screen);
  const inMission = screen === 'game' && !!game && game.status === 'playing';
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // Start on the big "back to the game" button, so Enter or Space resumes at once.
    d?.querySelector<HTMLButtonElement>('.settings-foot .btn-go')?.focus();
  }, []);
  const pickTab = (t: Tab) => {
    sfx.build();
    setTab(t);
    try { localStorage.setItem(TAB_KEY, t); } catch { /* fine */ }
  };
  return (
    <dialog ref={ref} className="settings" aria-labelledby="settings-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <motion.div className="settings-card" initial={{ scale: 0.6, y: 40, rotate: -3, opacity: 0 }} animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.7, y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
        <div className="settings-sky" aria-hidden="true">
          {STARS.map((st, i) => <i key={i} className="twinkle" style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }} />)}
          <i className="shooting" />
          <i className="shooting s2" />
          <span className="settings-planet" />
        </div>

        <header className="settings-head">
          <div className="settings-marv">
            <Marv mood="happy" size={74} />
            <span className="orbit" aria-hidden="true"><i /></span>
          </div>
          <div>
            <h2 id="settings-title">{inMission ? 'Mission paused' : 'Settings'}</h2>
            <p>{inMission ? <>The clock is stopped. Sol {Math.min(MISSION_SOLS, Math.floor(game!.time))} of {MISSION_SOLS}, {alive(game!).length} crew safe and sound.</> : 'Make Sol Survivor just right for you.'}</p>
          </div>
          <motion.button className="settings-x" onClick={onClose} whileTap={{ scale: 0.85 }} whileHover={{ rotate: 90 }} aria-label="Close settings"><X /></motion.button>
        </header>

        <nav className="settings-tabs" role="tablist" aria-label="Settings pages">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`settings-tab ${tab === t.id ? 'on' : ''}`} onClick={() => pickTab(t.id)}>
              {tab === t.id && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
              <span className="tab-label">{t.icon}{t.name}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.section key={tab} className="settings-page" role="tabpanel"
            initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
            {tab === 'sound' && <SoundPage />}
            {tab === 'play' && <PlayPage inMission={inMission} />}
            {tab === 'look' && <LookPage />}
            {tab === 'help' && <HelpPage />}
          </motion.section>
        </AnimatePresence>

        <MissionActions inMission={inMission} onClose={onClose} />
      </motion.div>
    </dialog>
  );
}

// ---------- pages ----------

function SoundPage() {
  const s = useSettings();
  const muted = useGame((g) => g.muted);
  const toggleMute = useGame((g) => g.toggleMute);
  return (
    <>
      <Row icon={muted ? <VolumeX /> : <Volume2 />} name="All sound" note={muted ? 'Everything is quiet.' : 'Sound is on.'}>
        <Toggle on={!muted} onChange={() => toggleMute()} label="All sound" />
      </Row>
      <Slider icon={<Volume2 />} name="Everything" value={s.master} onChange={(v) => s.set('master', v)} />
      <Slider icon={<Music />} name="Music" value={s.music} onChange={(v) => s.set('music', v)} note={s.music < 0.05 ? 'No music.' : s.music < 0.4 ? 'Very quiet, far away.' : s.music < 0.7 ? 'Soft, in the background.' : 'Loud and proud.'} />
      <Slider icon={<Zap />} name="Sound effects" value={s.effects} onChange={(v) => s.set('effects', v)} onDone={() => sfx.on()} />
      <Slider icon={<Wind />} name="Mars wind" value={s.ambience} onChange={(v) => s.set('ambience', v)} note="The thin Martian wind, and the rumble of storms." />
      <Row icon={<Ear />} name="Music style" note={s.softMusic ? 'Warm and muffled, like music in the next room.' : 'Bright and clear, every instrument.'}>
        <Choice value={s.softMusic ? 'soft' : 'full'} onChange={(v) => s.set('softMusic', v === 'soft')}
          options={[['soft', 'Soft and dreamy'], ['full', 'Full and bright']]} />
      </Row>
    </>
  );
}

function PlayPage({ inMission }: { inMission: boolean }) {
  const s = useSettings();
  const speed = useGame((g) => g.speed);
  const setSpeed = useGame((g) => g.setSpeed);
  const difficulty = useGame((g) => g.difficulty);
  const setDifficulty = useGame((g) => g.setDifficulty);
  const replay = useGame((g) => g.replayTraining);
  const [replayed, setReplayed] = useState(false);
  return (
    <>
      {inMission && (
        <Row icon={<FastForward />} name="Game speed" note={speed === 2 ? 'Sols fly by twice as fast.' : 'Nice and steady.'}>
          <Choice value={String(speed)} onChange={(v) => setSpeed(v === '2' ? 2 : 1)} options={[['1', 'Normal'], ['2', 'Fast']]} />
        </Row>
      )}
      <Row icon={<Zap />} name="How tough is the Sun?" note={inMission ? 'This changes your next mission, not this one.' : 'Pick before you play.'}>
        <Choice value={difficulty} onChange={(v) => setDifficulty(v as typeof difficulty)} options={[['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']]} />
      </Row>
      <Row icon={<Hammer />} name="Builders keep going" note="When a builder finishes, they walk to the next building site by themselves.">
        <Toggle on={s.autoBuilders} onChange={(v) => s.set('autoBuilders', v)} label="Builders keep going" />
      </Row>
      <Row icon={<Lightbulb />} name="Tips from M.A.R.V." note={s.hints ? 'M.A.R.V. shows you new things when they first happen.' : 'Only the first training. You know what you are doing!'}>
        <Toggle on={s.hints} onChange={(v) => s.set('hints', v)} label="Tips from M.A.R.V." />
      </Row>
      <Row icon={<RotateCcw />} name="Training" note={replayed ? 'Done! Your next mission starts with the training.' : 'Play the training and the space weather lessons again in your next mission.'}>
        <motion.button className="btn btn-small" whileTap={{ scale: 0.92 }} disabled={replayed} onClick={() => { replay(); setReplayed(true); sfx.learn(); }}>
          {replayed ? 'Ready' : 'Train again'}
        </motion.button>
      </Row>
    </>
  );
}

function LookPage() {
  const s = useSettings();
  return (
    <>
      <Row icon={<Wand2 />} name="Calm motion" note={s.motion === 'calm' ? 'Less bouncing and spinning.' : 'Follows your device. Everything bounces!'}>
        <Choice value={s.motion} onChange={(v) => s.set('motion', v as Settings['motion'])} options={[['auto', 'Bouncy'], ['calm', 'Calm']]} />
      </Row>
      <Row icon={<Vibrate />} name="Screen shake" note="The base shakes when a storm hits.">
        <Toggle on={s.shake} onChange={(v) => s.set('shake', v)} label="Screen shake" />
      </Row>
      <Row icon={<Type />} name="Bigger words" note="Makes the writing easier to read.">
        <Toggle on={s.bigText} onChange={(v) => s.set('bigText', v)} label="Bigger words" />
      </Row>
    </>
  );
}

const KEYS: [string, string][] = [
  ['Esc', 'Open or close this menu'],
  ['P', 'Pause or play'],
  ['← →', 'Look around the crater'],
];
const HOW: string[] = [
  'Drag an astronaut onto a place to give them a job. Or tap them, then tap the place.',
  'Tap a module to switch it on or off. Everything uses power.',
  'A building site needs a builder. Tap Send, or drag someone onto it.',
  'Explore the sparkles and finish missions to bring the next lander sooner.',
];

function HelpPage() {
  return (
    <>
      <h3 className="settings-sub"><Keyboard /> Keys</h3>
      <ul className="keys">
        {KEYS.map(([k, what]) => <li key={k}><kbd>{k}</kbd><span>{what}</span></li>)}
      </ul>
      <h3 className="settings-sub"><Lightbulb /> How to play</h3>
      <ol className="how">
        {HOW.map((h) => <li key={h}>{h}</li>)}
      </ol>
    </>
  );
}

function MissionActions({ inMission, onClose }: { inMission: boolean; onClose: () => void }) {
  const retry = useGame((s) => s.retry);
  const quit = useGame((s) => s.quit);
  const reset = useSettings((s) => s.reset);
  const [sure, setSure] = useState<'restart' | 'quit' | null>(null);
  const changed = useSettings((s) => (Object.keys(DEFAULTS) as (keyof Settings)[]).some((k) => s[k] !== DEFAULTS[k]));
  const ask = (what: 'restart' | 'quit') => {
    if (sure !== what) { sfx.ping(); setSure(what); return; }
    onClose();
    if (what === 'restart') retry(); else quit();
  };
  return (
    <footer className="settings-foot">
      <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.03 }} onClick={onClose}>
        <Play /> {inMission ? 'Back to Mars' : 'Done'}
      </motion.button>
      {inMission && (
        <>
          <motion.button className={`btn btn-small ${sure === 'restart' ? 'btn-warn' : ''}`} whileTap={{ scale: 0.94 }} onClick={() => ask('restart')}>
            <RotateCcw /> {sure === 'restart' ? 'Tap again to start over' : 'Start over'}
          </motion.button>
          <motion.button className={`btn btn-small ${sure === 'quit' ? 'btn-warn' : ''}`} whileTap={{ scale: 0.94 }} onClick={() => ask('quit')}>
            <Home /> {sure === 'quit' ? 'Tap again to leave' : 'Title screen'}
          </motion.button>
        </>
      )}
      {changed && <button className="link-btn" onClick={() => { reset(); sfx.build(); }}>Reset settings</button>}
    </footer>
  );
}

// ---------- controls ----------

function Row({ icon, name, note, children }: { icon: ReactNode; name: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="set-row">
      <span className="set-icon" aria-hidden="true">{icon}</span>
      <div className="set-text"><b>{name}</b>{note && <small>{note}</small>}</div>
      <div className="set-control">{children}</div>
    </div>
  );
}

/** A chunky slider with a little planet for a knob. Plays a soft note as it moves. */
function Slider({ icon, name, value, onChange, onDone, note }: { icon: ReactNode; name: string; value: number; onChange: (v: number) => void; onDone?: () => void; note?: string }) {
  const last = useRef(Math.round(value * 10));
  const pct = Math.round(value * 100);
  return (
    <div className="set-row slider-row">
      <span className="set-icon" aria-hidden="true">{icon}</span>
      <div className="set-text"><b>{name}</b>{note && <small>{note}</small>}</div>
      <div className="set-control">
        <label className="planet-slider" style={{ '--v': value } as React.CSSProperties}>
          <span className="sr-only">{name}</span>
          <input type="range" min={0} max={100} step={5} value={pct}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              onChange(v);
              const step = Math.round(v * 10);
              if (step !== last.current) { last.current = step; sfx.slide(v); }
            }}
            onPointerUp={() => onDone?.()} onKeyUp={() => onDone?.()}
            aria-valuetext={`${pct} percent`} />
          <span className="slider-num" aria-hidden="true">{pct}</span>
        </label>
      </div>
    </div>
  );
}

/** An on/off switch that throws sparkles when it turns on. */
function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  const [burst, setBurst] = useState(0);
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`magic-switch ${on ? 'on' : ''}`}
      onClick={() => { const next = !on; onChange(next); if (next) { setBurst(Date.now()); sfx.on(); } else sfx.off(); }}>
      <motion.i layout transition={{ type: 'spring', stiffness: 600, damping: 26 }}>{on ? <Sparkles /> : null}</motion.i>
      <span className="switch-word">{on ? 'On' : 'Off'}</span>
      <AnimatePresence>
        {burst > 0 && on && Array.from({ length: 6 }, (_, i) => (
          <motion.b key={`${burst}-${i}`} className="burst-star" aria-hidden="true"
            initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
            animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 34, y: Math.sin((i / 6) * Math.PI * 2) * 24, scale: 1, opacity: 0, rotate: 120 }}
            transition={{ duration: 0.6, ease: 'easeOut' }} onAnimationComplete={() => i === 5 && setBurst(0)} />
        ))}
      </AnimatePresence>
    </button>
  );
}

/** Two or three chunky options side by side. */
function Choice({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="choice" role="radiogroup">
      {options.map(([id, name]) => (
        <motion.button key={id} role="radio" aria-checked={value === id} className={`choice-opt ${value === id ? 'on' : ''}`} whileTap={{ scale: 0.92 }}
          onClick={() => { if (value !== id) { sfx.build(); onChange(id); } }}>{name}</motion.button>
      ))}
    </div>
  );
}
