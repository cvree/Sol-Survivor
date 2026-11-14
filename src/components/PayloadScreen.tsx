import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Minus, Plus, Rocket } from 'lucide-react';
import { PAYLOAD, PAYLOAD_LIMIT, PAYLOAD_SECONDS } from '../engine/constants';
import { payloadMass } from '../engine/engine';
import type { Loadout, PayloadId } from '../engine/types';
import { useGame } from '../store/game';
import { Marv, PAYLOAD_ICON, type Mood } from './art';

const ITEMS: { id: PayloadId; name: string; does: string }[] = [
  { id: 'shield', name: 'Storm Shield', does: 'Blocks most storm radiation. Needs lots of power.' },
  { id: 'medbay', name: 'Med Bay', does: 'Heals a sick astronaut. One bed.' },
  { id: 'solar', name: 'Extra Solar Array', does: '3 more power. Dust storms still block it.' },
  { id: 'battery', name: 'Battery', does: '1 more power that dust cannot block.' },
  { id: 'tank', name: 'Oxygen Tank', does: 'Start with more life support.' },
  { id: 'lab', name: 'Science Lab', does: 'Earns science points. That is why we came.' },
];

function marvSays(l: Loadout, left: number, secs: number): { text: string; mood: Mood } {
  if (secs <= 10) return { text: 'Countdown! Whatever is on board flies!', mood: 'alert' };
  if (left === PAYLOAD_LIMIT) return { text: 'The lander can lift 1,000 kg. You cannot bring it all, so choose what matters most.', mood: 'happy' };
  if (!l.shield && left < PAYLOAD.shield.mass) return { text: 'No Storm Shield? Solar storms will hit the crew hard. Brave choice.', mood: 'worried' };
  if (l.shield && !l.solar && !l.battery) return { text: 'The shield is hungry. With no extra power you will have to switch nearly everything off to use it.', mood: 'worried' };
  if (left < 100) return { text: 'Packed tight! Ready when you are.', mood: 'party' };
  return { text: `${left} kg of space left. What else do you need to stay alive?`, mood: 'happy' };
}

export function PayloadScreen() {
  const { loadout, pack, launch, notice, quit } = useGame();
  const [secs, setSecs] = useState(PAYLOAD_SECONDS);
  const used = payloadMass(loadout);
  const left = PAYLOAD_LIMIT - used;

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (secs <= 0) launch(); }, [secs, launch]);

  const talk = notice && Date.now() - notice.at < 2200 ? { text: notice.text, mood: 'worried' as Mood } : marvSays(loadout, left, secs);

  return (
    <div className="payload">
      <header className="payload-head">
        <div>
          <h1>Pack the lander</h1>
          <p>Already on board: 2 Solar Arrays, Oxygen Maker, Greenhouse, Heater and 4 astronauts.</p>
        </div>
        <div className={`timer ${secs <= 10 ? 'hurry' : ''}`} role="timer" aria-label={`${secs} seconds until launch`}>
          <span>Launch in</span><b>0:{String(Math.max(0, secs)).padStart(2, '0')}</b>
        </div>
      </header>

      <div className="mass">
        <div className="mass-head"><span>Payload</span><b>{used.toLocaleString('en-US')} / {PAYLOAD_LIMIT.toLocaleString('en-US')} kg</b></div>
        <div className="bar tall"><motion.i animate={{ width: `${(used / PAYLOAD_LIMIT) * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} /></div>
      </div>

      <div className="items">
        {ITEMS.map((it, i) => {
          const Icon = PAYLOAD_ICON[it.id];
          const n = loadout[it.id];
          const { mass, max } = PAYLOAD[it.id];
          const fits = mass <= left && n < max;
          return (
            <motion.div key={it.id} className={`item ${n > 0 ? 'packed' : ''} ${!fits && n === 0 ? 'nofit' : ''}`}
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: i * 0.05 }}>
              <span className="badge"><Icon /></span>
              <div className="item-text">
                <h2>{it.name}</h2>
                <p>{it.does}</p>
                <span className="kg">{mass} kg{max > 1 ? ` each, up to ${max}` : ''}</span>
              </div>
              {max === 1 ? (
                <motion.button className={`btn ${n ? 'btn-ghost' : 'btn-go'}`} whileTap={{ scale: 0.92 }} onClick={() => pack(it.id, n ? -1 : 1)} aria-pressed={n > 0} aria-label={`${n ? 'Take out' : 'Pack'} ${it.name}, ${mass} kilograms`}>
                  {n ? 'Take out' : 'Pack it'}
                </motion.button>
              ) : (
                <div className="stepper">
                  <motion.button className="icon-btn" whileTap={{ scale: 0.9 }} onClick={() => pack(it.id, -1)} disabled={n === 0} aria-label={`One less ${it.name}`}><Minus /></motion.button>
                  <b aria-label={`${n} packed`}>{n}</b>
                  <motion.button className="icon-btn" whileTap={{ scale: 0.9 }} onClick={() => pack(it.id, 1)} disabled={n >= max} aria-label={`One more ${it.name}, ${mass} kilograms`}><Plus /></motion.button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <footer className="payload-foot">
        <div className={`marv mood-${talk.mood}`}>
          <Marv mood={talk.mood} size={78} />
          <div className="marv-say" role="status"><p>{talk.text}</p></div>
        </div>
        <button className="btn btn-ghost" onClick={quit}>Back</button>
        <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} onClick={() => launch()}><Rocket /> Launch to Mars</motion.button>
      </footer>
    </div>
  );
}
