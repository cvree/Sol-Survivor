import { motion } from 'motion/react';
import { BedSingle, FlaskConical, Flame, HeartPulse, ShieldHalf, Sprout, Sun, Wind, BatteryCharging, Cylinder, type LucideIcon } from 'lucide-react';
import type { ModuleKind, PayloadId, Triage } from '../engine/types';

export const INK = '#1d1033';

export const MODULE_ICON: Record<ModuleKind, LucideIcon> = {
  solar: Sun, oxygen: Wind, greenhouse: Sprout, heater: Flame, shield: ShieldHalf, medbay: HeartPulse, lab: FlaskConical,
};
export const PAYLOAD_ICON: Record<PayloadId, LucideIcon> = {
  shield: ShieldHalf, medbay: BedSingle, solar: Sun, lab: FlaskConical, battery: BatteryCharging, tank: Cylinder,
};

const SKIN: Record<string, string> = { ada: '#9a6240', kofi: '#6a432c', mei: '#f3cfa6', luis: '#cf9668' };
const SUIT: Record<string, string> = { ada: '#ffd23f', kofi: '#5ee6a0', mei: '#ff8fb1', luis: '#4fd8ff' };

export interface Look {
  triage: Triage;
  /** Cyanosis: lips turn blue in late hypoxia. */
  blueLips: boolean;
  /** Radiation burn and nausea. */
  flushed: boolean;
  fainted: boolean;
  shiver: boolean;
  dizzy: boolean;
}

/** A crew member. `bust` crops to the helmet for portraits. The face is the health display. */
export function Astronaut({ id, look, bust, size = 48 }: { id: string; look: Look; bust?: boolean; size?: number }) {
  const lip = look.blueLips ? '#3f6fe0' : INK;
  const skin = look.blueLips ? '#b9a7c9' : SKIN[id];
  return (
    <motion.svg
      viewBox={bust ? '2 0 44 40' : '0 0 48 62'}
      width={size}
      height={bust ? size * (40 / 44) : size * (62 / 48)}
      className={look.shiver ? 'shiver' : ''}
      animate={look.fainted && !bust ? { rotate: 90, y: 14 } : { rotate: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      aria-hidden="true"
    >
      {!bust && (
        <>
          <rect x="12" y="34" width="24" height="22" rx="8" fill="#f7f4ec" stroke={INK} strokeWidth="3" />
          <rect x="18" y="40" width="12" height="8" rx="2" fill={SUIT[id]} stroke={INK} strokeWidth="2" />
          <path d="M17 56v4M31 56v4" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        </>
      )}
      <circle cx="24" cy="20" r="17" fill={SUIT[id]} stroke={INK} strokeWidth="3" />
      <circle cx="24" cy="21" r="12" fill={skin} stroke={INK} strokeWidth="2.5" />
      {look.flushed && <circle cx="24" cy="21" r="10.7" fill="#ff2e4d" opacity=".45" />}
      {look.fainted ? (
        <path d="M16.5 18l5 3m-5 0l5-3M26.5 18l5 3m-5 0l5-3" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      ) : look.dizzy ? (
        <>
          <circle cx="19" cy="19.5" r="2.6" fill="none" stroke={INK} strokeWidth="1.8" />
          <circle cx="29" cy="19.5" r="2.6" fill="none" stroke={INK} strokeWidth="1.8" />
        </>
      ) : (
        <>
          <circle cx="19" cy="19.5" r="2.2" fill={INK} />
          <circle cx="29" cy="19.5" r="2.2" fill={INK} />
          {look.triage !== 'green' && <path d="M15.5 15l6 1.5M32.5 15l-6 1.5" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />}
        </>
      )}
      {look.triage === 'green' && <path d="M19 25.5c3 3.4 7 3.4 10 0" stroke={lip} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {look.triage === 'yellow' && <path d="M19.5 27c3-1.6 6-1.6 9 0" stroke={lip} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {look.triage === 'red' && <ellipse cx="24" cy="27" rx="3.2" ry="2.6" fill={lip} />}
      {(look.flushed || look.dizzy) && !look.fainted && <path d="M36 11c2 3 2 5 0 5.5c-2-.5-2-2.5 0-5.5z" fill="#4fd8ff" stroke={INK} strokeWidth="1.2" />}
      <path d="M11 13a15 15 0 0 1 9-8" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".7" />
    </motion.svg>
  );
}

export type Mood = 'happy' | 'alert' | 'worried' | 'party';

/** M.A.R.V., the Mars Assistant Robot Voice. A little hovering drone that guides the commander. */
export function Marv({ mood, size = 84 }: { mood: Mood; size?: number }) {
  const eye = mood === 'alert' ? '#ff2e4d' : '#4fd8ff';
  return (
    <motion.svg
      viewBox="0 0 80 80" width={size} height={size} aria-hidden="true"
      animate={mood === 'alert' ? { rotate: [-6, 6, -6] } : mood === 'party' ? { y: [0, -10, 0], rotate: [0, 8, -8, 0] } : { y: [0, -5, 0] }}
      transition={{ duration: mood === 'alert' ? 0.35 : mood === 'party' ? 0.7 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d="M40 12V4" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="40" cy="4" r="4" fill={mood === 'alert' ? '#ff2e4d' : '#ffd23f'} stroke={INK} strokeWidth="2.5" />
      <rect x="4" y="30" width="10" height="18" rx="5" fill="#c2512a" stroke={INK} strokeWidth="3" />
      <rect x="66" y="30" width="10" height="18" rx="5" fill="#c2512a" stroke={INK} strokeWidth="3" />
      <rect x="11" y="12" width="58" height="50" rx="18" fill="#f7f4ec" stroke={INK} strokeWidth="3.5" />
      <rect x="18" y="20" width="44" height="28" rx="11" fill={INK} />
      {mood === 'happy' && (<><path d="M26 36c2-5 8-5 10 0M44 36c2-5 8-5 10 0" stroke={eye} strokeWidth="3.5" fill="none" strokeLinecap="round" /></>)}
      {mood === 'party' && (<><path d="M25 37l5.5-7l5.5 7M44 37l5.5-7l5.5 7" stroke="#ffd23f" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>)}
      {mood === 'alert' && (<><circle cx="31" cy="34" r="6" fill={eye} /><circle cx="49" cy="34" r="6" fill={eye} /></>)}
      {mood === 'worried' && (<><circle cx="31" cy="35" r="4.5" fill={eye} /><circle cx="49" cy="35" r="4.5" fill={eye} /><path d="M24 27l10 2M56 27l-10 2" stroke={eye} strokeWidth="2.5" strokeLinecap="round" /></>)}
      <path d={mood === 'worried' || mood === 'alert' ? 'M34 56c4-3 8-3 12 0' : 'M33 54c4 4 10 4 14 0'} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M30 66l-4 9M50 66l4 9M40 66v10" stroke="#4fd8ff" strokeWidth="3.5" strokeLinecap="round" opacity=".9" />
    </motion.svg>
  );
}

export function SolarArt({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 120 84" className="solar-art" aria-hidden="true">
      <rect x="55" y="46" width="10" height="30" fill="#8a7fa6" stroke={INK} strokeWidth="3.5" />
      <rect x="40" y="72" width="40" height="10" rx="5" fill="#8a7fa6" stroke={INK} strokeWidth="3.5" />
      <g transform="rotate(-12 60 32)">
        <rect x="8" y="10" width="104" height="42" rx="6" fill={lit ? '#2f6bd9' : '#4a4070'} stroke={INK} strokeWidth="4" />
        <path d="M34 10v42M60 10v42M86 10v42M8 31h104" stroke={INK} strokeWidth="2.5" />
        {lit && <path d="M14 16h14v9H14z M66 37h14v9H66z" fill="#9cc4ff" />}
      </g>
    </svg>
  );
}
