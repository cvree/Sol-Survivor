import type { ModuleKind } from '../engine/types';
import { INK } from './art';

/**
 * The base, drawn as a cutaway. Surface modules are glass domes, underground
 * modules are dug-in rooms, yard modules are free-standing gear.
 * `on` switches the lights: lit and colourful, or dark with a red emergency lamp.
 */

const GLASS_ON = '#bfeeff';
const DARK = '#2a1d49';
const O = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const thin = { ...O, strokeWidth: 3 };

function Dome({ on, tint, children }: { on: boolean; tint?: string; children: React.ReactNode }) {
  return (
    <>
      <path d="M22 132A98 112 0 0 1 218 132Z" fill={on ? tint ?? GLASS_ON : DARK} {...O} />
      <g className={on ? '' : 'unlit'}>{children}</g>
      <path d="M22 132A98 112 0 0 1 218 132Z" fill="none" {...O} />
      <path d="M48 96A74 86 0 0 1 104 34" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity={on ? 0.85 : 0.2} />
      <rect x="8" y="128" width="224" height="18" rx="9" fill="#f7f4ec" {...O} />
      <rect x="20" y="134" width="22" height="6" rx="3" fill={on ? '#5ee6a0' : '#ff2e4d'} className={on ? '' : 'blink'} />
    </>
  );
}

function Room({ on, wall, children }: { on: boolean; wall: string; children: React.ReactNode }) {
  return (
    <>
      <rect x="6" y="8" width="228" height="134" rx="22" fill={on ? wall : DARK} {...O} />
      <rect x="6" y="118" width="228" height="24" rx="12" fill={on ? '#8a7fa6' : '#3a2d5c'} {...O} />
      <g className={on ? '' : 'unlit'}>{children}</g>
      <circle cx="26" cy="26" r="6" fill={on ? '#5ee6a0' : '#ff2e4d'} stroke={INK} strokeWidth="3" className={on ? '' : 'blink'} />
    </>
  );
}

export function ModuleArt({ kind, on, building }: { kind: ModuleKind; on: boolean; building?: boolean }) {
  if (building) {
    return (
      <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
        <path d="M30 132h180M50 132V70h140v62M50 100h140M96 70v62M144 70v62" fill="none" stroke="#f7f4ec" strokeWidth="5" strokeDasharray="12 8" strokeLinecap="round" />
        <path d="M120 30v40M100 50h40" stroke="#ffd23f" strokeWidth="8" strokeLinecap="round" />
      </svg>
    );
  }
  switch (kind) {
    case 'hab':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Dome on={on} tint="#ffe9c9">
            <rect x="52" y="92" width="62" height="14" rx="5" fill="#ff9a4d" {...thin} />
            <rect x="52" y="66" width="62" height="14" rx="5" fill="#ff9a4d" {...thin} />
            <path d="M52 62v66M114 62v66" {...thin} />
            <rect x="56" y="60" width="16" height="9" rx="4" fill="#fff" {...thin} />
            <rect x="140" y="64" width="42" height="30" rx="5" fill="#4fd8ff" {...thin} />
            <path d="M146 86l10-10l8 6l12-12" fill="none" stroke={INK} strokeWidth="2.5" />
            <rect x="150" y="106" width="34" height="22" rx="5" fill="#5ee6a0" {...thin} />
            <path d="M120 22v16" {...thin} /><circle cx="120" cy="44" r="7" fill="#ffd23f" {...thin} />
          </Dome>
        </svg>
      );
    case 'hydro':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Dome on={on} tint="#ffd6f2">
            <rect x="70" y="30" width="100" height="9" rx="4" fill="#ff5fc4" {...thin} />
            <rect x="40" y="112" width="160" height="16" rx="6" fill="#8a5a3c" {...thin} />
            {[58, 88, 120, 152, 182].map((x, i) => (
              <g key={x} className={on ? 'sway' : ''} style={{ animationDelay: `${i * 0.3}s`, transformOrigin: `${x}px 112px` }}>
                <path d={`M${x} 112v-${22 + (i % 2) * 16}`} stroke="#2f9e57" strokeWidth="5" strokeLinecap="round" />
                <path d={`M${x} ${96 - (i % 2) * 12}c-15-2-18-13-16-18c11 0 16 8 16 18zM${x} ${88 - (i % 2) * 14}c15-2 18-13 16-18c-11 0-16 8-16 18z`} fill="#5ee6a0" {...thin} />
                {i % 2 === 0 && <circle cx={x + 8} cy={82} r="5" fill="#ff2e4d" {...thin} />}
              </g>
            ))}
          </Dome>
        </svg>
      );
    case 'dome':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          {on && <circle cx="120" cy="34" r="30" fill="none" stroke="#4fd8ff" strokeWidth="5" className="ping" />}
          <path d="M22 132A98 96 0 0 1 218 132Z" fill={on ? '#c2512a' : '#4a3a5c'} {...O} />
          <path d="M60 110a8 6 0 1 0 16 0a8 6 0 1 0-16 0M150 96a10 7 0 1 0 20 0a10 7 0 1 0-20 0M100 78a7 5 0 1 0 14 0a7 5 0 1 0-14 0M176 120a6 4 0 1 0 12 0a6 4 0 1 0-12 0" fill={on ? '#8f2f2a' : '#35275a'} />
          <rect x="98" y="96" width="44" height="36" rx="8" fill={on ? '#4fd8ff' : DARK} {...O} />
          <path d="M120 40V20" {...O} /><circle cx="120" cy="34" r="11" fill={on ? '#4fd8ff' : '#5a4a86'} {...O} />
          <rect x="8" y="128" width="224" height="18" rx="9" fill="#f7f4ec" {...O} />
          <rect x="20" y="134" width="22" height="6" rx="3" fill={on ? '#5ee6a0' : '#ff2e4d'} className={on ? '' : 'blink'} />
        </svg>
      );
    case 'oxygen':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Room on={on} wall="#bff5e4">
            <rect x="128" y="34" width="36" height="84" rx="16" fill="#5ee6a0" {...O} />
            <rect x="176" y="34" width="36" height="84" rx="16" fill="#5ee6a0" {...O} />
            <path d="M164 60h12M164 92h12" {...O} />
            <circle cx="146" cy="62" r="9" fill="#fff" {...thin} /><path d="M146 62l5-5" stroke="#ff2e4d" strokeWidth="3" strokeLinecap="round" />
            <text x="194" y="84" textAnchor="middle" fontSize="17" fontWeight="700" fill={INK} fontFamily="inherit">O₂</text>
            {on && [0, 1, 2].map((i) => <circle key={i} className="puff" style={{ animationDelay: `${i * 0.8}s` }} cx={170 + i * 6} cy="30" r="7" fill="#fff" stroke={INK} strokeWidth="2.5" />)}
          </Room>
        </svg>
      );
    case 'medbay':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Room on={on} wall="#ffe1ea">
            <rect x="126" y="92" width="86" height="16" rx="6" fill="#fff" {...O} />
            <rect x="126" y="80" width="24" height="16" rx="6" fill="#ff8fb1" {...thin} />
            <path d="M132 108v12M206 108v12" {...O} />
            <rect x="168" y="30" width="44" height="34" rx="7" fill={INK} {...thin} />
            <path d="M174 48h7l4-9l6 16l4-7h11" fill="none" stroke="#5ee6a0" strokeWidth="3" strokeLinejoin="round" className={on ? 'beat' : ''} />
            <rect x="126" y="28" width="30" height="30" rx="8" fill="#ff2e4d" {...thin} /><path d="M141 35v16M133 43h16" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          </Room>
        </svg>
      );
    case 'lab':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Room on={on} wall="#e6d9ff">
            <rect x="116" y="88" width="104" height="30" rx="7" fill="#f7f4ec" {...O} />
            {[122, 156, 190].map((x, i) => (
              <g key={x}>
                <rect x={x} y="40" width="28" height="36" rx="5" fill={INK} {...thin} />
                <path d={i === 1 ? `M${x + 5} 66l6-12l5 7l7-13` : `M${x + 5} 52h18M${x + 5} 60h12M${x + 5} 68h16`} fill="none" stroke={i === 1 ? '#ffd23f' : '#5ee6a0'} strokeWidth="2.5" strokeLinecap="round" className={on ? 'flicker' : ''} />
              </g>
            ))}
            <path d="M136 96h64" stroke="#c9a6ff" strokeWidth="6" strokeLinecap="round" />
          </Room>
        </svg>
      );
    case 'solar':
      return (
        <svg viewBox="0 0 120 84" className="yard-art" aria-hidden="true">
          <rect x="55" y="46" width="10" height="30" fill="#8a7fa6" stroke={INK} strokeWidth="3.5" />
          <rect x="40" y="72" width="40" height="10" rx="5" fill="#8a7fa6" stroke={INK} strokeWidth="3.5" />
          <g transform="rotate(-12 60 32)">
            <rect x="8" y="10" width="104" height="42" rx="6" fill={on ? '#2f6bd9' : '#4a4070'} stroke={INK} strokeWidth="4" />
            <path d="M34 10v42M60 10v42M86 10v42M8 31h104" stroke={INK} strokeWidth="2.5" />
            {on && <path d="M14 16h14v9H14zM66 37h14v9H66z" fill="#9cc4ff" />}
          </g>
        </svg>
      );
    case 'battery':
      return (
        <svg viewBox="0 0 120 84" className="yard-art" aria-hidden="true">
          <rect x="46" y="8" width="28" height="10" rx="3" fill="#8a7fa6" stroke={INK} strokeWidth="3.5" />
          <rect x="28" y="16" width="64" height="64" rx="10" fill="#5ee6a0" stroke={INK} strokeWidth="4" />
          <path d="M64 28L46 50h14l-6 20l20-24H60z" fill="#ffd23f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
    case 'comms':
      return (
        <svg viewBox="0 0 120 84" className="yard-art" aria-hidden="true">
          {on && <path d="M84 8a26 26 0 0 1 20 22M84 18a15 15 0 0 1 11 12" fill="none" stroke="#4fd8ff" strokeWidth="4" strokeLinecap="round" className="ping-soft" />}
          <path d="M60 50v24M44 80h32" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <path d="M24 30a38 38 0 0 0 62 30z" fill={on ? '#f7f4ec' : '#5a4a86'} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M56 44l20-18" stroke={INK} strokeWidth="4" strokeLinecap="round" /><circle cx="78" cy="24" r="6" fill={on ? '#ff2e4d' : '#3a2d5c'} stroke={INK} strokeWidth="3" />
        </svg>
      );
  }
}
