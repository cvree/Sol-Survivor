import { motion } from 'motion/react';
import { BatteryCharging, FlaskConical, HeartPulse, Home, SatelliteDish, ShieldHalf, Sprout, Sun, Wind, type LucideIcon } from 'lucide-react';
import type { ModuleKind, Triage } from '../engine/types';

export const INK = '#1d1033';

export const MODULE_ICON: Record<ModuleKind, LucideIcon> = {
  hab: Home, solar: Sun, battery: BatteryCharging, oxygen: Wind, hydro: Sprout, dome: ShieldHalf, medbay: HeartPulse, lab: FlaskConical, comms: SatelliteDish,
};

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

/** What an astronaut is busy doing. Drawn with their arms and a small prop, so the job is clear without words. */
export type Act = 'idle' | 'type' | 'water' | 'wrench' | 'check' | 'sleep' | 'wave' | 'jump' | 'cold' | 'sip';

/** A crew member. `bust` crops to the helmet for portraits. The face is the health display. */
export function Astronaut({ who, look, bust, size = 48, act = 'idle' }: { who: { skin: string; suit: string }; look: Look; bust?: boolean; size?: number; act?: Act }) {
  const lip = look.blueLips ? '#3f6fe0' : INK;
  const skin = look.blueLips ? '#b9a7c9' : who.skin;
  const doing: Act = bust || look.fainted ? 'idle' : look.shiver ? 'cold' : act;
  const asleep = doing === 'sleep';
  const down = look.fainted;
  return (
    <motion.svg
      viewBox={bust ? '2 0 44 40' : '-8 -6 64 68'}
      width={bust ? size : size * (64 / 48)}
      height={bust ? size * (40 / 44) : size * (68 / 48)}
      className={`astro act-${doing} ${look.shiver ? 'shiver' : ''}`}
      style={{ overflow: 'visible' }}
      animate={down && !bust ? { rotate: 90, y: 12 } : asleep ? { rotate: 7, y: 2 } : { rotate: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      aria-hidden="true"
    >
      {!bust && (
        <>
          {/* Life-support backpack */}
          <rect x="8" y="32" width="32" height="19" rx="6" fill="#b9b0d0" stroke={INK} strokeWidth="2.5" />
          <g className="leg leg-l"><rect x="14.5" y="48" width="8.5" height="10" rx="3" fill="#f7f4ec" stroke={INK} strokeWidth="2.5" /><rect x="12.5" y="55.5" width="11.5" height="6" rx="3" fill={who.suit} stroke={INK} strokeWidth="2.5" /></g>
          <g className="leg leg-r"><rect x="25" y="48" width="8.5" height="10" rx="3" fill="#f7f4ec" stroke={INK} strokeWidth="2.5" /><rect x="24" y="55.5" width="11.5" height="6" rx="3" fill={who.suit} stroke={INK} strokeWidth="2.5" /></g>
          <rect x="12" y="33" width="24" height="20" rx="8" fill="#f7f4ec" stroke={INK} strokeWidth="3" />
          <rect x="18" y="39" width="12" height="8" rx="2.5" fill={who.suit} stroke={INK} strokeWidth="2" />
          <circle cx="21.5" cy="43" r="1.5" fill="#f7f4ec" /><path d="M25 43h3" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <g className="arm arm-l">
            <rect x="6.5" y="35" width="8" height="15" rx="4" fill="#f7f4ec" stroke={INK} strokeWidth="2.5" />
            <circle cx="10.5" cy="50" r="4" fill={who.suit} stroke={INK} strokeWidth="2.5" />
          </g>
          <g className="arm arm-r">
            <rect x="33.5" y="35" width="8" height="15" rx="4" fill="#f7f4ec" stroke={INK} strokeWidth="2.5" />
            <circle cx="37.5" cy="50" r="4" fill={who.suit} stroke={INK} strokeWidth="2.5" />
            {doing === 'wrench' && <path d="M37.5 50v11m-3.5 3a4 4 0 1 0 7 0" fill="none" stroke="#8a7fa6" strokeWidth="3.4" strokeLinecap="round" />}
            {doing === 'water' && (
              <g>
                <path d="M33 51h10l-1.5 9h-7zM43 53l6-3" fill="#4fd8ff" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                <circle className="drip" cx="50" cy="52" r="1.6" fill="#4fd8ff" /><circle className="drip d2" cx="52" cy="50" r="1.4" fill="#4fd8ff" />
              </g>
            )}
            {doing === 'check' && <g><rect x="32" y="48" width="11" height="13" rx="2.5" fill={INK} /><path d="M34.5 55h2l1-3l1.5 5l1-2h1" fill="none" stroke="#5ee6a0" strokeWidth="1.4" strokeLinejoin="round" /></g>}
            {doing === 'sip' && <g><rect x="33.5" y="49" width="8" height="8" rx="2" fill="#f7f4ec" stroke={INK} strokeWidth="2.2" /><path d="M41.5 51h2.5v3h-2.5" fill="none" stroke={INK} strokeWidth="2" /><path className="steam" d="M36 46c1.5-2-1.5-3 0-5M39.5 46c1.5-2-1.5-3 0-5" fill="none" stroke="#f7f4ec" strokeWidth="1.6" strokeLinecap="round" /></g>}
          </g>
        </>
      )}
      <circle cx="24" cy="20" r="17" fill={who.suit} stroke={INK} strokeWidth="3" />
      {!bust && <><rect x="4" y="16" width="5" height="9" rx="2.5" fill="#f7f4ec" stroke={INK} strokeWidth="2" /><rect x="39" y="16" width="5" height="9" rx="2.5" fill="#f7f4ec" stroke={INK} strokeWidth="2" /></>}
      <circle cx="24" cy="21" r="12" fill={skin} stroke={INK} strokeWidth="2.5" />
      {look.flushed && <circle cx="24" cy="21" r="10.7" fill="#7ed957" opacity=".5" />}
      {look.fainted ? (
        <path d="M16.5 18l5 3m-5 0l5-3M26.5 18l5 3m-5 0l5-3" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      ) : asleep ? (
        <path d="M16.5 20c1.5 1.6 3.5 1.6 5 0M26.5 20c1.5 1.6 3.5 1.6 5 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : look.dizzy ? (
        <>
          <circle cx="19" cy="19.5" r="2.6" fill="none" stroke={INK} strokeWidth="1.8" />
          <circle cx="29" cy="19.5" r="2.6" fill="none" stroke={INK} strokeWidth="1.8" />
        </>
      ) : (
        <g className="eyes">
          <circle cx="19" cy="19.5" r="2.2" fill={INK} />
          <circle cx="29" cy="19.5" r="2.2" fill={INK} />
          <circle cx="19.8" cy="18.7" r=".7" fill="#fff" /><circle cx="29.8" cy="18.7" r=".7" fill="#fff" />
          {look.triage !== 'green' && <path d="M15.5 15l6 1.5M32.5 15l-6 1.5" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />}
        </g>
      )}
      {asleep ? <circle cx="24" cy="26.5" r="1.8" fill={INK} /> : (
        <>
          {look.triage === 'green' && (doing === 'jump' || doing === 'wave'
            ? <path d="M18.5 24.5c2 5.5 9 5.5 11 0z" fill={INK} />
            : <path d="M19 25.5c3 3.4 7 3.4 10 0" stroke={lip} strokeWidth="2.2" fill="none" strokeLinecap="round" />)}
          {look.triage === 'yellow' && <path d="M19.5 27c3-1.6 6-1.6 9 0" stroke={lip} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
          {look.triage === 'red' && <ellipse cx="24" cy="27" rx="3.2" ry="2.6" fill={lip} />}
        </>
      )}
      {look.triage === 'green' && !asleep && <><circle cx="15.5" cy="24" r="2" fill="#ff8fb1" opacity=".55" /><circle cx="32.5" cy="24" r="2" fill="#ff8fb1" opacity=".55" /></>}
      {(look.flushed || look.dizzy) && !look.fainted && <path d="M36 11c2 3 2 5 0 5.5c-2-.5-2-2.5 0-5.5z" fill="#4fd8ff" stroke={INK} strokeWidth="1.2" />}
      <path d="M11 13a15 15 0 0 1 9-8" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".7" />
      {asleep && !bust && <text className="zzz" x="36" y="2" fontSize="13" fontWeight="700" fill="#f7f4ec" stroke={INK} strokeWidth="2.6" paintOrder="stroke">z<tspan dy="-6" fontSize="10">z</tspan></text>}
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

/** The cargo lander that brings new crew and blueprints from Earth. `burn` lights the descent engine. */
export function Lander({ size = 120, burn }: { size?: number; burn?: boolean }) {
  return (
    <svg viewBox="0 0 120 130" width={size} height={size * (130 / 120)} aria-hidden="true" style={{ overflow: 'visible' }}>
      {burn && (
        <g className="flame">
          <path d="M44 98c0 24 8 40 16 54c8-14 16-30 16-54z" fill="#ff9a4d" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M52 98c0 14 4 24 8 32c4-8 8-18 8-32z" fill="#ffd23f" />
        </g>
      )}
      <path d="M38 96l-16 28M82 96l16 28M60 98v26" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M14 124h16M90 124h16M52 124h16" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M60 8c22 14 32 40 32 62v28H28V70C28 48 38 22 60 8z" fill="#f7f4ec" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M60 8c8 5 14 12 19 20H41c5-8 11-15 19-20z" fill="#ff9a4d" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M28 76h64v22H28z" fill="#c2512a" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M36 84h10M52 84h4M74 84h10" stroke="#ffd23f" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="52" r="13" fill="#4fd8ff" stroke={INK} strokeWidth="5" />
      <path d="M53 48a8 8 0 0 1 8-5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M86 40c5 9 6 18 6 28" stroke="#d9d3c5" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** A science rover out exploring, like Curiosity and Perseverance: six wheels, a mast with camera eyes, an arm. */
export function Rover({ size = 110 }: { size?: number }) {
  return (
    <svg viewBox="0 0 130 86" width={size} height={size * (86 / 130)} aria-hidden="true" style={{ overflow: 'visible' }}>
      <path d="M26 62l22-12h40l20 12M66 50v12" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {[24, 66, 108].map((x) => (
        <g key={x} className="wheel" style={{ transformOrigin: `${x}px 70px` }}>
          <circle cx={x} cy="70" r="13" fill="#46306f" stroke={INK} strokeWidth="4" />
          <path d={`M${x - 8} 70h16M${x} 62v16`} stroke="#8a7fa6" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx={x} cy="70" r="3.5" fill="#f7f4ec" stroke={INK} strokeWidth="2" />
        </g>
      ))}
      <rect x="30" y="30" width="74" height="24" rx="8" fill="#f7f4ec" stroke={INK} strokeWidth="4" />
      <rect x="38" y="36" width="26" height="12" rx="3" fill="#ff9a4d" stroke={INK} strokeWidth="3" />
      <path d="M72 42h22" stroke="#b9b0d0" strokeWidth="4" strokeLinecap="round" />
      <path d="M92 30V10" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="80" y="0" width="26" height="15" rx="5" fill="#f7f4ec" stroke={INK} strokeWidth="4" />
      <circle cx="88" cy="7.5" r="3" fill="#4fd8ff" stroke={INK} strokeWidth="2" /><circle cx="98" cy="7.5" r="3" fill="#4fd8ff" stroke={INK} strokeWidth="2" />
      <path d="M30 40l-16-12l-8 10" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 30l-8-18" stroke={INK} strokeWidth="4" strokeLinecap="round" /><circle cx="35" cy="10" r="5" fill="#ffd23f" stroke={INK} strokeWidth="3" />
    </svg>
  );
}
