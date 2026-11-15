import { INK } from './art';

/**
 * Upgrades you can see. Level 2 adds gold trim and lights; level 3 adds a glowing
 * shell, a beacon and a flag. The base visibly grows from plain to proud.
 */
export function LevelDeco({ level, under }: { level: number; under: boolean }) {
  if (level < 2) return null;
  return (
    <svg viewBox="0 0 240 150" className={`level-deco lvl-${level}`} aria-hidden="true">
      {under ? (
        <>
          {[[6, 8], [222, 8], [6, 130], [222, 130]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="12" height="12" rx="3" fill="#ffd23f" stroke={INK} strokeWidth="2.5" />)}
          <rect x="60" y="4" width="120" height="7" rx="3.5" fill="#ffd23f" stroke={INK} strokeWidth="2.5" />
          {level >= 3 && <><rect x="14" y="142" width="212" height="6" rx="3" fill="#4fd8ff" className="neon" /><circle cx="214" cy="30" r="6" fill="#ff2e4d" stroke={INK} strokeWidth="2.5" className="blink" /></>}
        </>
      ) : (
        <>
          <rect x="6" y="125" width="228" height="8" rx="4" fill="#ffd23f" stroke={INK} strokeWidth="2.5" />
          <circle cx="40" cy="118" r="5" fill="#ffd23f" stroke={INK} strokeWidth="2.5" className="glow-led" />
          <circle cx="200" cy="118" r="5" fill="#ffd23f" stroke={INK} strokeWidth="2.5" className="glow-led" />
          {level >= 3 && (
            <>
              <path d="M14 132A106 120 0 0 1 226 132" fill="none" stroke="#4fd8ff" strokeWidth="6" opacity=".7" className="neon" />
              <path d="M172 34V6" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
              <path d="M172 7l22 7l-22 7z" fill="#ff2e4d" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" className="flag" />
            </>
          )}
        </>
      )}
    </svg>
  );
}

/** Little stars on the name plate: one per level. */
export function LevelStars({ level }: { level: number }) {
  return <span className="lvl-stars" aria-label={`Level ${level}`}>{Array.from({ length: level }, (_, i) => <i key={i} />)}</span>;
}
