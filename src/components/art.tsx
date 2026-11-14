import type { ModuleKind, Triage } from '../engine/types';

/** Small hand-drawn illustrations. `on` lights them up. */
export function ModuleArt({ kind, on }: { kind: ModuleKind; on: boolean }) {
  const glow = on ? 1 : 0.25;
  switch (kind) {
    case 'solar':
      return (
        <svg viewBox="0 0 120 70" className="art" aria-hidden="true">
          <rect x="57" y="40" width="6" height="26" rx="2" fill="#5b4a57" />
          <rect x="44" y="62" width="32" height="6" rx="3" fill="#463744" />
          <g transform="rotate(-14 60 30)">
            <rect x="12" y="12" width="96" height="34" rx="4" fill="#27407a" stroke="#cfe0ff" strokeWidth="2.5" />
            {[36, 60, 84].map((x) => <line key={x} x1={x} y1="13" x2={x} y2="45" stroke="#cfe0ff" strokeWidth="1.5" opacity=".7" />)}
            <line x1="13" y1="29" x2="107" y2="29" stroke="#cfe0ff" strokeWidth="1.5" opacity=".7" />
            <rect x="14" y="14" width="92" height="30" rx="3" fill="#8fc0ff" opacity={0.12 + 0.3 * glow} />
          </g>
        </svg>
      );
    case 'oxygen':
      return (
        <svg viewBox="0 0 120 70" className="art" aria-hidden="true">
          <rect x="22" y="14" width="30" height="50" rx="14" fill="#2f7f79" stroke="#bff5e4" strokeWidth="2.5" />
          <rect x="68" y="14" width="30" height="50" rx="14" fill="#2f7f79" stroke="#bff5e4" strokeWidth="2.5" />
          <path d="M52 30h16M52 48h16" stroke="#bff5e4" strokeWidth="3" />
          <circle cx="37" cy="34" r="7" fill="#12332f" stroke="#bff5e4" strokeWidth="2" />
          <path d="M37 34l4-4" stroke="#ffcf40" strokeWidth="2" strokeLinecap="round" />
          <text x="83" y="45" textAnchor="middle" fontSize="13" fontWeight="800" fill="#bff5e4" fontFamily="inherit">O₂</text>
          {on && [0, 1, 2].map((i) => <circle key={i} className="bubble" style={{ animationDelay: `${i * 0.7}s` }} cx={56 + i * 4} cy="12" r="2.5" fill="#bff5e4" />)}
        </svg>
      );
    case 'greenhouse':
      return (
        <svg viewBox="0 0 120 70" className="art" aria-hidden="true">
          <rect x="14" y="8" width="92" height="6" rx="3" fill={on ? '#ff9ad5' : '#5b4a57'} />
          {on && <path d="M18 14l-6 40h96l-6-40z" fill="#ff9ad5" opacity=".13" />}
          <rect x="12" y="54" width="96" height="10" rx="4" fill="#6a4630" stroke="#e7c9a0" strokeWidth="2" />
          {[26, 48, 70, 92].map((x, i) => (
            <g key={x} transform={`translate(${x} 54)`} opacity={0.45 + 0.55 * glow}>
              <path d={`M0 0v-${16 + (i % 2) * 8}`} stroke="#3f9b52" strokeWidth="3" strokeLinecap="round" />
              <path d={`M0 -${10 + (i % 2) * 6}c-9-1-11-8-10-11c7 0 10 5 10 11zM0 -${14 + (i % 2) * 8}c9-1 11-8 10-11c-7 0-10 5-10 11z`} fill="#62d07a" />
            </g>
          ))}
        </svg>
      );
    case 'heater':
      return (
        <svg viewBox="0 0 120 70" className="art" aria-hidden="true">
          <rect x="24" y="30" width="72" height="32" rx="6" fill="#6b3a2c" stroke="#ffd9b0" strokeWidth="2.5" />
          {[36, 48, 60, 72, 84].map((x) => <rect key={x} x={x - 3} y="35" width="6" height="22" rx="3" fill={on ? '#ff8a3d' : '#4a2a22'} />)}
          {on && [42, 60, 78].map((x, i) => (
            <path key={x} className="heat" style={{ animationDelay: `${i * 0.4}s` }} d={`M${x} 26c-5-5 5-8 0-14`} stroke="#ffb46b" strokeWidth="3" fill="none" strokeLinecap="round" />
          ))}
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 120 70" className="art" aria-hidden="true">
          <rect x="44" y="50" width="32" height="14" rx="4" fill="#3b3f73" stroke="#cdd9ff" strokeWidth="2.5" />
          <path d="M60 10l18 10v12c0 10-8 16-18 20c-10-4-18-10-18-20V20z" fill="#3b4a9a" stroke="#cdd9ff" strokeWidth="2.5" />
          <path d="M60 18l10 6v8c0 6-4 10-10 13" fill="#8fb0ff" opacity={0.2 + 0.7 * glow} />
          {on && <circle className="ring" cx="60" cy="30" r="22" fill="none" stroke="#8fb0ff" strokeWidth="2" />}
        </svg>
      );
    case 'medbay':
      return (
        <svg viewBox="0 0 120 70" className="art" aria-hidden="true">
          <rect x="16" y="42" width="66" height="10" rx="4" fill="#f4f0ff" stroke="#5b4a57" strokeWidth="2" />
          <rect x="16" y="34" width="16" height="10" rx="4" fill="#ffd1dc" stroke="#5b4a57" strokeWidth="2" />
          <path d="M20 52v12M78 52v12" stroke="#5b4a57" strokeWidth="3" strokeLinecap="round" />
          <rect x="88" y="14" width="22" height="18" rx="3" fill="#12332f" stroke="#f4f0ff" strokeWidth="2" />
          <path d="M91 24h4l2-5l3 9l2-4h5" stroke={on ? '#5fe0ae' : '#3c5a54'} strokeWidth="1.8" fill="none" />
          <path d="M99 32v32" stroke="#5b4a57" strokeWidth="2.5" />
          <g opacity={0.4 + 0.6 * glow}><rect x="42" y="10" width="20" height="20" rx="5" fill="#ff5d4f" /><path d="M52 14v12M46 20h12" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></g>
        </svg>
      );
  }
}

const SKIN: Record<string, string> = { ada: '#8d5a3b', kofi: '#5c3a26', mei: '#f0c9a0', luis: '#c98f62' };
const SUIT: Record<string, string> = { ada: '#ffb347', kofi: '#62d07a', mei: '#ff8fa3', luis: '#8fb0ff' };

/** Crew portrait. The face shows what an EMT would look for: blue lips, flushed skin, closed eyes. */
export function Face({ id, triage, blueLips, flushed, fainted, shiver }: { id: string; triage: Triage; blueLips: boolean; flushed: boolean; fainted: boolean; shiver: boolean }) {
  const lip = blueLips ? '#5b7fd6' : '#7a2e2e';
  return (
    <svg viewBox="0 0 64 64" className={`face ${shiver ? 'shiver' : ''}`} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill={SUIT[id]} />
      <circle cx="32" cy="32" r="24" fill="#1b1320" />
      <circle cx="32" cy="34" r="19" fill={SKIN[id]} />
      {flushed && <circle cx="32" cy="34" r="19" fill="#ff3d2e" opacity=".38" />}
      {fainted ? (
        <path d="M21 31l6 3m-6 0l6-3M37 31l6 3m-6 0l6-3" stroke="#1b1320" strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="24.5" cy="32" r="2.8" fill="#1b1320" />
          <circle cx="39.5" cy="32" r="2.8" fill="#1b1320" />
          {triage !== 'green' && <path d="M20 26l8 2M44 26l-8 2" stroke="#1b1320" strokeWidth="2" strokeLinecap="round" />}
        </>
      )}
      {triage === 'green' && <path d="M25 41c4 5 10 5 14 0" stroke={lip} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
      {triage === 'yellow' && <path d="M26 43h12" stroke={lip} strokeWidth="2.6" strokeLinecap="round" />}
      {triage === 'red' && <ellipse cx="32" cy="43" rx="4" ry="3" fill={lip} />}
      <path d="M14 22a22 22 0 0 1 20-13" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".35" />
    </svg>
  );
}

export const EVENT_ICON = { cme: '☀️', flare: '⚡', dust: '🌪️' } as const;
