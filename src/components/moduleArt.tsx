import type { ReactNode } from 'react';
import type { ModuleKind } from '../engine/types';
import { INK } from './art';

/**
 * The base, drawn as a cutaway. Surface modules are glass domes, underground
 * modules are dug-in rooms, yard modules are free-standing gear.
 * `on` switches the lights: lit and colourful, or dark with a red emergency lamp.
 * Crew stand in the open floor space each drawing leaves (centre of a dome, left half of a room).
 */

const DARK = '#2a1d49';
const O = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const thin = { ...O, strokeWidth: 3 };
const fine = { ...O, strokeWidth: 2.2 };
const DOME = 'M22 132A98 112 0 0 1 218 132Z';

function Dome({ on, tint, floor = '#e9dcc4', children }: { on: boolean; tint: string; floor?: string; children: ReactNode }) {
  return (
    <>
      <path d={DOME} fill={on ? tint : DARK} {...O} />
      <clipPath id="dome-clip"><path d={DOME} /></clipPath>
      <g clipPath="url(#dome-clip)">
        {on && <path d="M22 132A98 112 0 0 1 120 20V132Z" fill="#fff" opacity=".22" />}
        <rect x="22" y="116" width="196" height="18" fill={on ? floor : '#3a2d5c'} />
        <path d="M22 116h196" stroke={INK} strokeWidth="3" />
        <g className={on ? '' : 'unlit'}>{children}</g>
      </g>
      {/* Glass ribs and shine */}
      <path d="M120 20V40M70 36c-22 22-30 60-30 96M170 36c22 22 30 60 30 96" fill="none" stroke={INK} strokeWidth="2.5" opacity=".28" />
      <path d={DOME} fill="none" {...O} />
      <path d="M46 98A76 88 0 0 1 100 34" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" opacity={on ? 0.9 : 0.2} />
      <path d="M112 29l8-2" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity={on ? 0.9 : 0.2} />
      {/* Foundation ring with bolts and a status light */}
      <rect x="6" y="128" width="228" height="20" rx="10" fill="#f7f4ec" {...O} />
      <path d="M14 141h212" stroke="#cfc6b4" strokeWidth="4" strokeLinecap="round" />
      {[60, 100, 140, 180, 214].map((x) => <circle key={x} cx={x} cy="135" r="2.6" fill={INK} />)}
      <rect x="18" y="132" width="26" height="8" rx="4" fill={on ? '#5ee6a0' : '#ff2e4d'} stroke={INK} strokeWidth="2.5" className={on ? 'glow-led' : 'blink'} />
    </>
  );
}

function Room({ on, wall, trim = '#c2512a', children }: { on: boolean; wall: string; trim?: string; children: ReactNode }) {
  return (
    <>
      {/* Thick bunker frame cut into the rock */}
      <rect x="2" y="4" width="236" height="142" rx="24" fill="#3b2140" {...O} />
      <rect x="12" y="14" width="216" height="122" rx="15" fill={on ? wall : DARK} {...thin} />
      <clipPath id="room-clip"><rect x="12" y="14" width="216" height="122" rx="15" /></clipPath>
      <g clipPath="url(#room-clip)">
        {on && <path d="M12 14h216v20H12z" fill="#fff" opacity=".3" />}
        <rect x="12" y="116" width="216" height="22" fill={on ? '#8a7fa6' : '#3a2d5c'} />
        <path d="M12 116h216" stroke={INK} strokeWidth="3" />
        {[40, 90, 140, 190].map((x) => <path key={x} d={`M${x} 120v14`} stroke={INK} strokeWidth="2" opacity=".35" />)}
        <g className={on ? '' : 'unlit'}>{children}</g>
      </g>
      {/* Ceiling lamp, corner rivets, status light */}
      <rect x="86" y="10" width="68" height="9" rx="4.5" fill={on ? '#fff7c9' : '#5a4a86'} {...fine} />
      {[[10, 12], [230, 12], [10, 138], [230, 138]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill={trim} stroke={INK} strokeWidth="2" />)}
      <circle cx="30" cy="30" r="6.5" fill={on ? '#5ee6a0' : '#ff2e4d'} stroke={INK} strokeWidth="3" className={on ? 'glow-led' : 'blink'} />
    </>
  );
}

function Leaf({ x, y, s = 1, flip, fill = '#5ee6a0' }: { x: number; y: number; s?: number; flip?: boolean; fill?: string }) {
  return <path d="M0 0c-14-3-19-15-17-22c12 1 18 10 17 22z" fill={fill} {...fine} transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} />;
}

export function ModuleArt({ kind, on, building }: { kind: ModuleKind; on: boolean; building?: boolean }) {
  if (building) {
    return (
      <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
        <path d="M30 132h180M50 132V70h140v62M50 100h140M96 70v62M144 70v62" fill="none" stroke="#f7f4ec" strokeWidth="5" strokeDasharray="12 8" strokeLinecap="round" />
        <g className="crane">
          <path d="M120 18v44" stroke="#f7f4ec" strokeWidth="4" strokeLinecap="round" />
          <rect x="100" y="60" width="40" height="26" rx="6" fill="#ffd23f" {...O} />
          <path d="M108 68l8 10M124 68l8 10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
    );
  }
  switch (kind) {
    case 'hab':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Dome on={on} tint="#ffe9c9">
            {/* Bunk beds */}
            <path d="M40 58v60M88 58v60" {...thin} />
            <rect x="40" y="68" width="48" height="12" rx="4" fill="#4fd8ff" {...thin} />
            <rect x="40" y="96" width="48" height="12" rx="4" fill="#ff9a4d" {...thin} />
            <rect x="43" y="62" width="14" height="8" rx="4" fill="#fff" {...fine} />
            <rect x="43" y="90" width="14" height="8" rx="4" fill="#fff" {...fine} />
            <path d="M78 80v16M70 84h8M70 92h8" {...fine} />
            {/* A picture of home, a window to the stars */}
            <rect x="100" y="50" width="26" height="20" rx="4" fill="#1d3a8a" {...fine} />
            <circle cx="113" cy="60" r="6" fill="#4fd8ff" {...fine} /><path d="M109 59c2-2 4 1 6-1" fill="none" stroke="#5ee6a0" strokeWidth="2.4" strokeLinecap="round" />
            {/* Screen with a climbing chart */}
            <rect x="138" y="58" width="44" height="30" rx="6" fill={INK} {...thin} />
            <path d="M144 80l9-9l7 5l12-12" fill="none" stroke="#5ee6a0" strokeWidth="3" className={on ? 'flicker' : ''} />
            {/* Sofa and a plant */}
            <rect x="140" y="100" width="46" height="16" rx="7" fill="#5ee6a0" {...thin} />
            <rect x="136" y="94" width="12" height="22" rx="5" fill="#3fc27f" {...thin} /><rect x="178" y="94" width="12" height="22" rx="5" fill="#3fc27f" {...thin} />
            <g className={on ? 'sway' : ''} style={{ transformOrigin: '200px 104px' }}><Leaf x={200} y={104} s={0.7} /><Leaf x={200} y={104} s={0.7} flip /><Leaf x={200} y={96} s={0.55} fill="#3fc27f" /></g>
            <path d="M193 104h14l-2 12h-10z" fill="#c2512a" {...fine} />
            {/* Ceiling lamp */}
            <path d="M120 20v14" {...thin} /><path d="M108 44a12 10 0 0 1 24 0z" fill="#ffd23f" {...thin} />
            {on && <path d="M106 48l-14 44h56l-14-44z" fill="#ffd23f" opacity=".16" />}
          </Dome>
        </svg>
      );
    case 'hydro':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Dome on={on} tint="#d8f7d0" floor="#8a5a3c">
            {/* Pink grow lights */}
            <rect x="64" y="30" width="112" height="10" rx="5" fill="#ff5fc4" {...thin} />
            {on && <path d="M70 40L44 116h152l-26-76z" fill="#ff8fd8" opacity=".2" />}
            <path d="M92 30V22M148 30V22" {...fine} />
            {/* Water pipe with drips */}
            <path d="M30 100h20v-22h140v22h20" fill="none" stroke="#4fd8ff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
            {/* Planter */}
            <rect x="34" y="104" width="172" height="16" rx="6" fill="#6f4530" {...thin} />
            <path d="M44 110h152" stroke="#8a5a3c" strokeWidth="4" strokeLinecap="round" />
            {/* A jungle of crops, each a different shape so it reads as a garden */}
            <g className={on ? 'sway' : ''} style={{ transformOrigin: '56px 106px' }}>
              <path d="M56 106V74" stroke="#2f9e57" strokeWidth="5" strokeLinecap="round" />
              <Leaf x={56} y={96} /><Leaf x={56} y={86} flip /><Leaf x={56} y={76} s={0.8} fill="#8be36a" />
            </g>
            <g className={on ? 'sway' : ''} style={{ transformOrigin: '88px 106px', animationDelay: '.4s' }}>
              <path d="M88 106c0-18-4-30 2-44" fill="none" stroke="#2f9e57" strokeWidth="5" strokeLinecap="round" />
              <Leaf x={88} y={92} flip fill="#3fc27f" /><Leaf x={89} y={78} fill="#3fc27f" />
              <circle cx="96" cy="88" r="6" fill="#ff2e4d" {...fine} /><circle cx="82" cy="74" r="5" fill="#ff2e4d" {...fine} /><circle cx="97" cy="68" r="4.5" fill="#ff9a4d" {...fine} />
            </g>
            <g className={on ? 'sway' : ''} style={{ transformOrigin: '120px 106px', animationDelay: '.9s' }}>
              <path d="M120 106V60" stroke="#2f9e57" strokeWidth="5" strokeLinecap="round" />
              <Leaf x={120} y={94} s={0.9} /><Leaf x={120} y={84} s={0.9} flip />
              {[0, 60, 120, 180, 240, 300].map((r) => <ellipse key={r} cx="120" cy="47" rx="5" ry="9" fill="#c9a6ff" {...fine} transform={`rotate(${r} 120 56)`} />)}
              <circle cx="120" cy="56" r="6" fill="#ffd23f" {...fine} />
            </g>
            <g className={on ? 'sway' : ''} style={{ transformOrigin: '152px 106px', animationDelay: '.2s' }}>
              <path d="M152 106V82" stroke="#2f9e57" strokeWidth="5" strokeLinecap="round" />
              <path d="M152 86c-22-4-24-22-20-30c14 2 22 14 20 30zM152 86c22-4 24-22 20-30c-14 2-22 14-20 30z" fill="#8be36a" {...fine} />
              <path d="M152 84c-6-12-4-24 0-30c4 6 6 18 0 30z" fill="#5ee6a0" {...fine} />
            </g>
            <g className={on ? 'sway' : ''} style={{ transformOrigin: '184px 106px', animationDelay: '.6s' }}>
              <path d="M184 106V80" stroke="#2f9e57" strokeWidth="5" strokeLinecap="round" />
              <Leaf x={184} y={98} s={0.8} fill="#3fc27f" /><Leaf x={184} y={90} s={0.8} flip fill="#3fc27f" />
              <path d="M184 82c-9-2-11-12-6-18c3 4 6 4 6-2c0 6 3 6 6 2c5 6 3 16-6 18z" fill="#ff8fb1" {...fine} />
            </g>
            {on && [70, 104, 136, 168].map((x, i) => <circle key={x} className="drip-fall" style={{ animationDelay: `${i * 0.5}s` }} cx={x} cy="80" r="2.4" fill="#4fd8ff" />)}
          </Dome>
        </svg>
      );
    case 'dome':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          {on && <circle cx="120" cy="30" r="30" fill="none" stroke="#4fd8ff" strokeWidth="5" className="ping" />}
          {/* A shelter buried under Mars dirt (regolith), the real plan for blocking radiation */}
          <path d="M22 132A98 96 0 0 1 218 132Z" fill={on ? '#c2512a' : '#4a3a5c'} {...O} />
          <clipPath id="mound-clip"><path d="M22 132A98 96 0 0 1 218 132Z" /></clipPath>
          <g clipPath="url(#mound-clip)">
            <path d="M22 132A98 96 0 0 1 120 36V132Z" fill="#fff" opacity={on ? 0.14 : 0.05} />
            <path d="M20 112c40-10 80 8 120-2s60-4 80 2v24H20z" fill={on ? '#a23f26' : '#3d2f52'} />
            {[[62, 104, 9, 6], [158, 92, 11, 7], [104, 70, 8, 5], [182, 116, 7, 4], [138, 56, 6, 4], [78, 78, 6, 4]].map(([x, y, rx, ry]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx={rx} ry={ry} fill={on ? '#8f2f2a' : '#35275a'} stroke={INK} strokeWidth="2" opacity=".85" />)}
          </g>
          {/* Airlock door */}
          <rect x="96" y="92" width="48" height="40" rx="10" fill="#f7f4ec" {...O} />
          <rect x="104" y="100" width="32" height="32" rx="6" fill={on ? '#4fd8ff' : DARK} {...thin} />
          <path d="M120 100v32" {...fine} /><circle cx="130" cy="117" r="2.6" fill={INK} />
          <path d="M100 88h40" stroke="#ffd23f" strokeWidth="5" strokeLinecap="round" strokeDasharray="8 6" />
          {/* Shield emitter */}
          <path d="M120 38V16" {...O} />
          <path d="M106 16h28l-6 10h-16z" fill="#f7f4ec" {...thin} />
          <circle cx="120" cy="30" r="11" fill={on ? '#4fd8ff' : '#5a4a86'} {...O} className={on ? 'glow-led' : ''} />
          <path d="M115 27a6 6 0 0 1 6-3" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity={on ? 0.9 : 0.2} />
          <rect x="6" y="128" width="228" height="20" rx="10" fill="#f7f4ec" {...O} />
          <path d="M14 141h212" stroke="#cfc6b4" strokeWidth="4" strokeLinecap="round" />
          <rect x="18" y="132" width="26" height="8" rx="4" fill={on ? '#5ee6a0' : '#ff2e4d'} stroke={INK} strokeWidth="2.5" className={on ? 'glow-led' : 'blink'} />
        </svg>
      );
    case 'oxygen':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Room on={on} wall="#bff5e4" trim="#3fc27f">
            {/* Pipes along the ceiling */}
            <path d="M12 44h96v-14h120" fill="none" stroke="#8a7fa6" strokeWidth="7" strokeLinejoin="round" />
            <path d="M12 44h96v-14h120" fill="none" stroke={INK} strokeWidth="11" strokeLinejoin="round" opacity=".0" />
            <path d="M60 39v10M84 39v10" stroke={INK} strokeWidth="3" />
            {/* Three tanks: Mars air goes in, oxygen comes out */}
            {[118, 154, 190].map((x, i) => (
              <g key={x}>
                <rect x={x} y={i === 1 ? 40 : 50} width="30" height={i === 1 ? 76 : 66} rx="13" fill="#e8fbff" {...thin} />
                <rect x={x + 3} y={i === 1 ? 68 : 76} width="24" height={i === 1 ? 45 : 37} rx="10" fill={i === 1 ? '#5ee6a0' : '#4fd8ff'} />
                <path d={`M${x + 3} ${i === 1 ? 70 : 78}q6-5 12 0t12 0`} fill="none" stroke="#fff" strokeWidth="2.5" opacity=".8" className={on ? 'slosh' : ''} />
                {on && [0, 1, 2].map((b) => <circle key={b} className="bubble" style={{ animationDelay: `${b * 0.7 + i * 0.3}s` }} cx={x + 9 + b * 6} cy="108" r={2 + (b % 2)} fill="#fff" opacity=".9" />)}
                <rect x={x + 8} y={i === 1 ? 34 : 44} width="14" height="8" rx="3" fill="#8a7fa6" {...fine} />
              </g>
            ))}
            <path d="M148 86h6M184 86h6" {...thin} />
            <text x="169" y="62" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK} fontFamily="inherit">O₂</text>
            {/* Pressure gauge */}
            <circle cx="96" cy="76" r="13" fill="#fff" {...thin} />
            <path d="M96 76l7-7" stroke="#ff2e4d" strokeWidth="3.5" strokeLinecap="round" className={on ? 'needle' : ''} style={{ transformOrigin: '96px 76px' }} />
            <path d="M87 82a11 11 0 0 1 2-14" fill="none" stroke="#5ee6a0" strokeWidth="3" strokeLinecap="round" />
            {on && [0, 1, 2].map((i) => <circle key={i} className="puff" style={{ animationDelay: `${i * 0.8}s` }} cx={132 + i * 34} cy="34" r="6" fill="#fff" stroke={INK} strokeWidth="2.2" />)}
          </Room>
        </svg>
      );
    case 'medbay':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Room on={on} wall="#ffe1ea" trim="#ff8fb1">
            {/* Medicine cabinet */}
            <rect x="118" y="30" width="34" height="34" rx="8" fill="#fff" {...thin} />
            <path d="M135 37v20M125 47h20" stroke="#ff2e4d" strokeWidth="7" strokeLinecap="round" />
            {/* Heart monitor */}
            <rect x="164" y="30" width="54" height="38" rx="8" fill={INK} {...thin} />
            <path d="M170 50h9l4-10l7 19l5-9h17" fill="none" stroke="#5ee6a0" strokeWidth="3" strokeLinejoin="round" className={on ? 'beat' : ''} />
            <circle cx="210" cy="38" r="3" fill="#ff2e4d" className={on ? 'blink' : ''} />
            <path d="M191 68v10" {...thin} />
            {/* Bed with pillow and blanket */}
            <path d="M124 98v18M214 98v18" {...O} />
            <rect x="118" y="88" width="102" height="16" rx="7" fill="#fff" {...O} />
            <rect x="150" y="84" width="70" height="16" rx="7" fill="#4fd8ff" {...thin} />
            <rect x="121" y="78" width="26" height="14" rx="6" fill="#ff8fb1" {...thin} />
            {/* Drip stand */}
            <path d="M104 116V46M96 46h16" {...thin} />
            <path d="M99 50h10v16a5 5 0 0 1-10 0z" fill="#bfeeff" {...fine} />
            <path d="M104 71c0 12 14 12 16 20" fill="none" stroke={INK} strokeWidth="1.8" />
          </Room>
        </svg>
      );
    case 'lab':
      return (
        <svg viewBox="0 0 240 150" className="mod-art" aria-hidden="true">
          <Room on={on} wall="#d9ecff" trim="#4fd8ff">
            {/* A wall of screens */}
            {[[112, 30, 38, 28], [156, 26, 34, 24], [196, 30, 26, 28], [156, 54, 34, 20]].map(([x, y, w, h], i) => (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} rx="5" fill={INK} {...fine} />
                {i === 0 && <path d={`M${x + 5} ${y + 20}l7-9l6 5l8-11l6 6`} fill="none" stroke="#5ee6a0" strokeWidth="2.5" strokeLinejoin="round" className={on ? 'flicker' : ''} />}
                {i === 1 && <><circle cx={x + 17} cy={y + 12} r="7" fill="none" stroke="#4fd8ff" strokeWidth="2.5" /><path d={`M${x + 17} ${y + 12}l5-4`} stroke="#4fd8ff" strokeWidth="2.5" strokeLinecap="round" className={on ? 'radar' : ''} style={{ transformOrigin: `${x + 17}px ${y + 12}px` }} /></>}
                {i === 2 && <path d={`M${x + 5} ${y + 8}h16M${x + 5} ${y + 14}h10M${x + 5} ${y + 20}h14`} stroke="#ffd23f" strokeWidth="2.5" strokeLinecap="round" className={on ? 'flicker' : ''} />}
                {i === 3 && [0, 1, 2, 3].map((b) => <rect key={b} x={x + 5 + b * 7} y={y + 14 - b * 3} width="4" height={3 + b * 3} fill="#ff8fb1" />)}
              </g>
            ))}
            {/* Desk, keyboard, microscope, bubbling flask */}
            <rect x="108" y="88" width="116" height="12" rx="5" fill="#f7f4ec" {...thin} />
            <path d="M116 100v16M216 100v16" {...thin} />
            <rect x="120" y="82" width="34" height="6" rx="3" fill="#8a7fa6" {...fine} />
            <path d="M172 88h20M182 88V74l-6-10" fill="none" {...thin} /><circle cx="175" cy="62" r="5" fill="#c9a6ff" {...fine} />
            <path d="M204 64v8l-8 16h22l-8-16v-8z" fill="#5ee6a0" {...fine} /><path d="M201 64h12" {...fine} />
            {on && [0, 1].map((b) => <circle key={b} className="bubble" style={{ animationDelay: `${b * 0.9}s` }} cx={205 + b * 4} cy="84" r="2" fill="#fff" />)}
          </Room>
        </svg>
      );
    case 'solar':
      return (
        <svg viewBox="0 0 120 84" className="yard-art" aria-hidden="true">
          <rect x="55" y="46" width="10" height="30" fill="#8a7fa6" stroke={INK} strokeWidth="3.5" />
          <rect x="40" y="72" width="40" height="10" rx="5" fill="#8a7fa6" stroke={INK} strokeWidth="3.5" />
          <g transform="rotate(-12 60 32)">
            <rect x="6" y="8" width="108" height="46" rx="7" fill="#f7f4ec" stroke={INK} strokeWidth="4" />
            <rect x="11" y="13" width="98" height="36" rx="4" fill={on ? '#2f6bd9' : '#4a4070'} stroke={INK} strokeWidth="2.5" />
            <path d="M35.5 13v36M60 13v36M84.5 13v36M11 31h98" stroke={INK} strokeWidth="2.5" />
            {on && <><path d="M15 17h16v10H15zM64 35h16v10H64zM88.5 17h16v10h-16z" fill="#7fb0ff" /><path className="shine" d="M0 13l14 0l-12 36l-14 0z" fill="#fff" opacity=".55" /></>}
          </g>
        </svg>
      );
    case 'battery':
      return (
        <svg viewBox="0 0 120 84" className="yard-art" aria-hidden="true">
          <rect x="46" y="6" width="28" height="12" rx="3" fill="#8a7fa6" stroke={INK} strokeWidth="3.5" />
          <rect x="26" y="16" width="68" height="64" rx="11" fill="#f7f4ec" stroke={INK} strokeWidth="4" />
          {[0, 1, 2].map((i) => <rect key={i} x="34" y={58 - i * 16} width="52" height="12" rx="4" fill="#5ee6a0" stroke={INK} strokeWidth="2.5" className={on ? 'charge' : ''} style={{ animationDelay: `${i * 0.35}s` }} />)}
          <path d="M64 24L48 48h12l-5 18l18-22H61z" fill="#ffd23f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
    case 'comms':
      return (
        <svg viewBox="0 0 120 84" className="yard-art" aria-hidden="true">
          {on && <path d="M84 8a26 26 0 0 1 20 22M84 18a15 15 0 0 1 11 12" fill="none" stroke="#4fd8ff" strokeWidth="4" strokeLinecap="round" className="ping-soft" />}
          <path d="M60 50v24" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <path d="M40 80h40l-8-10H48z" fill="#8a7fa6" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M24 30a38 38 0 0 0 62 30z" fill={on ? '#f7f4ec' : '#5a4a86'} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M34 36a26 26 0 0 0 40 20" fill="none" stroke={on ? '#cfc6b4' : '#463a70'} strokeWidth="4" strokeLinecap="round" />
          <path d="M56 44l20-18" stroke={INK} strokeWidth="4" strokeLinecap="round" /><circle cx="78" cy="24" r="6" fill={on ? '#ff2e4d' : '#3a2d5c'} stroke={INK} strokeWidth="3" className={on ? 'blink' : ''} />
        </svg>
      );
  }
}
