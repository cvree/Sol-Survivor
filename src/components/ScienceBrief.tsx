import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, ExternalLink, GraduationCap, X } from 'lucide-react';
import { BRIEFS, markLearned, type ArtId } from '../data/spaceWeather';
import type { EventKind } from '../engine/types';
import { sfx } from '../lib/sound';
import { INK, Marv } from './art';

/**
 * Space weather school. The first time a flare, solar storm or dust storm is on its way,
 * M.A.R.V. stops the clock and teaches it: one idea per card with a picture, then one quick question.
 * It can be replayed any time from the warning card and the Science Log.
 */
export function ScienceBrief({ kind, onDone, doneLabel = 'I am ready!' }: { kind: EventKind; onDone: () => void; doneLabel?: string }) {
  const brief = BRIEFS[kind];
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const quiz = i === brief.cards.length;
  const right = pick === brief.quiz.answer;
  const card = brief.cards[i];
  const steps = brief.cards.length + 1;

  const next = () => { sfx.build(); setI((n) => n + 1); };
  const answer = (n: number) => {
    if (right) return;
    setPick(n);
    setTries((t) => t + 1);
    if (n === brief.quiz.answer) { sfx.learn(); markLearned(kind); } else sfx.nope();
  };

  return (
    <section className={`wx wx-${kind}`} aria-label={`Space weather school: ${brief.name}`}>
      <header className="wx-head">
        <span className="wx-kicker"><GraduationCap /> Space weather school</span>
        <span className="wx-dots" aria-label={`Card ${i + 1} of ${steps}`}>
          {Array.from({ length: steps }, (_, n) => <i key={n} className={n < i ? 'done' : n === i ? 'now' : ''} />)}
        </span>
      </header>

      <AnimatePresence mode="wait">
        {!quiz ? (
          <motion.div key={i} className="wx-card" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 28 }}>
            <div className="wx-art"><WeatherArt id={card.art} /></div>
            <div className="wx-text">
              <h3>{card.title}</h3>
              <p>{card.say}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="quiz" className="wx-card quiz" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 20 }}>
            <div className="quiz-q"><Marv mood={right ? 'party' : 'happy'} size={64} /><h3>Quick check! {brief.quiz.q}</h3></div>
            <div className="quiz-options">
              {brief.quiz.options.map((o, n) => (
                <motion.button key={o} className={`quiz-opt ${pick === n ? (right ? 'right' : 'wrong') : ''} ${right && n === brief.quiz.answer ? 'right' : ''}`}
                  onClick={() => answer(n)} disabled={right} whileTap={{ scale: 0.95 }}
                  animate={pick === n && !right ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.35 }}>
                  {right && n === brief.quiz.answer ? <Check /> : pick === n && !right ? <X /> : <span className="quiz-letter">{'ABC'[n]}</span>}
                  {o}
                </motion.button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {pick !== null && (
                <motion.p key={right ? 'r' : `w${tries}`} className={`quiz-why ${right ? 'right' : 'wrong'}`} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                  {right ? <><b>Yes!</b> {brief.quiz.why}</> : 'Not quite. Have another go!'}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="wx-foot">
        {!quiz && <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} onClick={next} autoFocus>Next <ArrowRight /></motion.button>}
        {quiz && <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} disabled={!right} onClick={() => { sfx.build(); onDone(); }}>{right ? doneLabel : 'Answer to go on'}</motion.button>}
        {i > 0 && !right && <button className="link-btn" onClick={() => { setI((n) => n - 1); setPick(null); }}>Back</button>}
      </footer>
      <p className="wx-source"><BookOpen /> Learn more: {brief.sources.map((s, n) => (
        <span key={s.link}>{n > 0 && ' · '}<a href={s.link} target="_blank" rel="noreferrer">{s.name} <ExternalLink /></a></span>
      ))}</p>
    </section>
  );
}

// ---------- the pictures ----------

const O = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const thin = { ...O, strokeWidth: 3 };
const SUN = '#ffd23f';
const MARS = '#c2512a';

function Sun({ x = 54, y = 70, r = 38, spots = true }: { x?: number; y?: number; r?: number; spots?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 10} fill="#ffb347" opacity=".35" className="art-pulse" />
      <circle cx={x} cy={y} r={r} fill={SUN} {...O} />
      {spots && <><circle cx={x - 10} cy={y - 6} r="5" fill="#b8601c" {...thin} strokeWidth={2.5} /><circle cx={x + 8} cy={y + 10} r="3.5" fill="#b8601c" {...thin} strokeWidth={2} /></>}
    </g>
  );
}
function Planet({ x, y, r, fill, children }: { x: number; y: number; r: number; fill: string; children?: ReactNode }) {
  return <g><circle cx={x} cy={y} r={r} fill={fill} {...O} />{children}</g>;
}
const Dots = ({ n, cls, color = '#ff8fb1' }: { n: number; cls: string; color?: string }) => (
  <>{Array.from({ length: n }, (_, i) => <circle key={i} className={cls} style={{ animationDelay: `${i * 0.28}s` }} cx="0" cy={44 + (i * 23) % 56} r="4.5" fill={color} stroke={INK} strokeWidth="2" />)}</>
);

export function WeatherArt({ id }: { id: ArtId }) {
  return <svg viewBox="0 0 300 140" className={`weather-art art-${id}`} aria-hidden="true">{ART[id]}</svg>;
}

const ART: Record<ArtId, ReactNode> = {
  'flare-flash': (
    <>
      <Sun x={110} y={78} r={52} />
      {/* A magnetic loop snapping open, and the flash */}
      <path d="M128 34c10-26 44-26 50 2" fill="none" stroke="#ff2e4d" strokeWidth="5" strokeLinecap="round" className="art-snap" />
      <path d="M184 30l14-14M190 44l22-4M176 18l2-16" stroke={INK} strokeWidth="4" strokeLinecap="round" className="art-flash" />
      <path d="M184 34l6-14l6 14l14 6l-14 6l-6 14l-6-14l-14-6z" fill="#fff" {...thin} className="art-flash" />
      <text x="232" y="98" className="art-label">FLASH!</text>
    </>
  ),
  'flare-race': (
    <>
      <Sun />
      <Planet x={258} y={70} r={20} fill={MARS} />
      <path d="M96 70H232" stroke={SUN} strokeWidth="10" strokeLinecap="round" className="art-beam" />
      <path d="M96 70H232" stroke={INK} strokeWidth="2" strokeDasharray="4 10" />
      <rect x="128" y="96" width="76" height="28" rx="10" fill="#f7f4ec" {...thin} />
      <text x="166" y="115" textAnchor="middle" className="art-mono">13 min</text>
      <text x="258" y="114" textAnchor="middle" className="art-small">Mars</text>
    </>
  ),
  'flare-scale': (
    <>
      {['A', 'B', 'C', 'M', 'X'].map((l, i) => {
        const h = [10, 20, 34, 56, 92][i];
        return (
          <g key={l}>
            <rect x={30 + i * 52} y={118 - h} width="38" height={h} rx="6" fill={i === 4 ? '#ff2e4d' : i === 3 ? '#ff9a4d' : SUN} {...thin} className="art-grow" style={{ animationDelay: `${i * 0.15}s` }} />
            <text x={49 + i * 52} y="136" textAnchor="middle" className="art-mono">{l}</text>
            {i > 0 && <text x={23 + i * 52} y={112 - h} className="art-tiny">×10</text>}
          </g>
        );
      })}
    </>
  ),
  'shield-compare': (
    <>
      {/* Earth with its magnetic bubble */}
      <ellipse cx="74" cy="70" rx="58" ry="46" fill="none" stroke="#4fd8ff" strokeWidth="4" strokeDasharray="8 7" className="art-spin" />
      <Planet x={74} y={70} r={24} fill="#2f6bd9"><path d="M60 62c8-6 14 2 20-2M66 80c6 2 10-4 16 0" stroke="#5ee6a0" strokeWidth="5" strokeLinecap="round" fill="none" /></Planet>
      <text x="74" y="134" textAnchor="middle" className="art-small">Earth</text>
      {/* Mars with none */}
      <Planet x={226} y={70} r={20} fill={MARS} />
      <text x="226" y="134" textAnchor="middle" className="art-small">Mars</text>
      <g className="art-rain">{[0, 1, 2].map((i) => <path key={i} d={`M${200 + i * 20} ${8 + i * 4}l10 26`} stroke="#ff2e4d" strokeWidth="4" strokeLinecap="round" style={{ animationDelay: `${i * 0.25}s` }} />)}</g>
      <g className="art-bounce">{[0, 1].map((i) => <path key={i} d={`M${40 + i * 30} 6l8 12`} stroke="#ff2e4d" strokeWidth="4" strokeLinecap="round" />)}</g>
    </>
  ),
  shelter: (
    <>
      <path d="M10 124h280" {...O} />
      <path d="M70 124a80 80 0 0 1 160 0z" fill="#4fd8ff" opacity=".35" />
      <path d="M70 124a80 80 0 0 1 160 0" fill="none" stroke="#4fd8ff" strokeWidth="8" className="art-pulse" />
      <path d="M70 124a80 80 0 0 1 160 0" fill="none" {...O} />
      {/* A little astronaut, safe inside */}
      <circle cx="150" cy="96" r="12" fill="#f7f4ec" {...thin} /><rect x="142" y="92" width="16" height="8" rx="4" fill="#4fd8ff" stroke={INK} strokeWidth="2" />
      <rect x="138" y="106" width="24" height="18" rx="6" fill="#ffd23f" {...thin} />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${86 + i * 40} 4l8 20`} stroke="#ff2e4d" strokeWidth="4" strokeLinecap="round" className="art-deflect" style={{ animationDelay: `${i * 0.3}s` }} />)}
    </>
  ),
  'cme-burst': (
    <>
      <Sun x={70} y={70} r={44} />
      <g className="art-swell" style={{ transformOrigin: '114px 70px' }}>
        <path d="M118 40c22-18 60-10 66 14c22 0 30 30 10 40c-4 22-40 26-56 12c-14 6-26-4-22-16z" fill="#f2a65a" {...O} />
        <circle cx="150" cy="62" r="5" fill="#ff8fb1" stroke={INK} strokeWidth="2" /><circle cx="168" cy="82" r="4" fill="#ff8fb1" stroke={INK} strokeWidth="2" />
      </g>
      <text x="238" y="74" className="art-small">billions</text>
      <text x="238" y="92" className="art-small">of tons!</text>
    </>
  ),
  'cme-travel': (
    <>
      <Sun x={40} y={70} r={30} spots={false} />
      <Planet x={170} y={70} r={14} fill="#2f6bd9" />
      <text x="170" y="104" textAnchor="middle" className="art-small">Earth</text>
      <Planet x={262} y={70} r={12} fill={MARS} />
      <text x="262" y="104" textAnchor="middle" className="art-small">Mars</text>
      <path d="M86 70c10-14 26-14 30 0c6 12-20 18-30 0z" fill="#f2a65a" {...thin} className="art-drift" />
      <rect x="112" y="114" width="118" height="24" rx="10" fill="#f7f4ec" {...thin} />
      <text x="171" y="131" textAnchor="middle" className="art-mono">1-3 days</text>
    </>
  ),
  particles: (
    <>
      {/* Cells, like bubbles, and tiny fast particles zipping through */}
      {[[70, 70, 30], [130, 50, 24], [130, 100, 22], [190, 72, 30], [246, 52, 20], [246, 100, 24]].map(([x, y, r], i) => (
        <g key={i}><circle cx={x} cy={y} r={r} fill="#ff8fb1" opacity=".55" {...thin} /><circle cx={x + 4} cy={y - 2} r={r / 3} fill="#c2356b" stroke={INK} strokeWidth="2" /></g>
      ))}
      <g className="art-zip"><Dots n={4} cls="art-zipdot" color={SUN} /></g>
    </>
  ),
  'rad-detector': (
    <>
      {/* Curiosity, and a chart that jumps when a storm arrives */}
      <path d="M10 126h130" {...O} />
      <rect x="30" y="78" width="80" height="30" rx="8" fill="#f7f4ec" {...O} />
      <path d="M96 78V52M86 52h22" {...O} /><rect x="88" y="40" width="20" height="14" rx="4" fill="#cfc6e6" {...thin} />
      {[44, 70, 96].map((x) => <circle key={x} cx={x} cy="116" r="10" fill="#46306f" {...thin} />)}
      <rect x="54" y="84" width="22" height="14" rx="3" fill="#ffd23f" stroke={INK} strokeWidth="2.5" />
      <text x="65" y="95" textAnchor="middle" className="art-tiny">RAD</text>
      <rect x="158" y="18" width="130" height="104" rx="12" fill="#1d1033" {...thin} />
      <path d="M168 104h18l10-2l10 2l10-60l10 30l10 10l10 4l20 2" fill="none" stroke="#5ee6a0" strokeWidth="4" strokeLinejoin="round" className="art-chart" />
      <text x="222" y="36" textAnchor="middle" className="art-tiny light">storm!</text>
    </>
  ),
  aurora: (
    <>
      <path d="M0 126h300" {...O} />
      <path d="M0 126V90c40-10 80 6 120-4s80-14 180 0v40z" fill={MARS} {...O} />
      {[0, 1, 2].map((i) => <path key={i} d={`M${20 + i * 90} ${30 + i * 6}c30-20 60 20 90 0`} fill="none" stroke="#5ee6a0" strokeWidth="8" strokeLinecap="round" opacity=".8" className="art-wave" style={{ animationDelay: `${i * 0.4}s` }} />)}
      <circle cx="250" cy="22" r="6" fill="#f7f4ec" stroke={INK} strokeWidth="2" />
    </>
  ),
  'dust-lift': (
    <>
      <path d="M0 124h300" {...O} />
      <path d="M0 124c30-10 60-10 90 0s60 10 90 0s60-10 120 0v16H0z" fill={MARS} {...O} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${40 + i * 90} 112c-12-10 6-24 18-16c4-14 26-12 26 2c14 0 14 18 0 18z`} fill="#e7b08a" {...thin} className="art-rise" style={{ animationDelay: `${i * 0.5}s` }} />
      ))}
      <path d="M20 40h50M60 56h70M150 30h60" stroke="#f7f4ec" strokeWidth="4" strokeLinecap="round" className="art-wind" />
    </>
  ),
  'dust-panel': (
    <>
      <Sun x={50} y={42} r={26} spots={false} />
      <rect x="0" y="0" width="300" height="140" fill="#c98a5b" className="art-dim" />
      <path d="M150 124V96" {...O} />
      <g transform="rotate(-10 180 80)"><rect x="120" y="58" width="120" height="44" rx="6" fill="#2f6bd9" {...O} /><path d="M160 58v44M200 58v44M120 80h120" stroke={INK} strokeWidth="2.5" /></g>
      <rect x="248" y="40" width="34" height="84" rx="8" fill="#1d1033" {...thin} />
      <rect x="254" y="46" width="22" height="72" rx="4" fill="#5ee6a0" className="art-drain" />
    </>
  ),
  'dust-breeze': (
    <>
      <path d="M0 124h300" {...O} />
      <path d="M150 124V40" {...O} />
      <path d="M150 42h50l-8 12l8 12h-50" fill="#ff8fb1" {...thin} className="art-flag" />
      <circle cx="96" cy="88" r="14" fill="#f7f4ec" {...thin} /><rect x="88" y="84" width="16" height="8" rx="4" fill="#4fd8ff" stroke={INK} strokeWidth="2" />
      <rect x="84" y="102" width="24" height="22" rx="6" fill="#ffd23f" {...thin} />
      <path d="M210 70h60M220 90h50M200 110h40" stroke="#f7f4ec" strokeWidth="4" strokeLinecap="round" className="art-wind" />
      <text x="240" y="40" textAnchor="middle" className="art-small">just a</text>
      <text x="240" y="56" textAnchor="middle" className="art-small">breeze</text>
    </>
  ),
  'dust-nuclear': (
    <>
      <path d="M0 124h300" {...O} />
      <rect x="0" y="0" width="300" height="140" fill="#c98a5b" opacity=".3" />
      {/* A rover with its nuclear power pack glowing */}
      <rect x="40" y="70" width="110" height="34" rx="8" fill="#f7f4ec" {...O} />
      {[58, 95, 132].map((x) => <circle key={x} cx={x} cy="114" r="11" fill="#46306f" {...thin} />)}
      <rect x="148" y="74" width="26" height="26" rx="6" fill="#5ee6a0" {...thin} className="art-pulse" />
      <circle cx="161" cy="87" r="4" fill={INK} />
      {/* A battery, still full */}
      <rect x="212" y="54" width="54" height="70" rx="10" fill="#f7f4ec" {...O} />
      {[0, 1, 2].map((i) => <rect key={i} x="220" y={104 - i * 18} width="38" height="12" rx="3" fill="#5ee6a0" stroke={INK} strokeWidth="2.5" />)}
    </>
  ),
  'dust-switch': (
    <>
      {['Air', 'Heat', 'Food', 'Lab', 'Radio'].map((name, i) => {
        const on = i < 2;
        return (
          <g key={name} transform={`translate(${16 + i * 56} 34)`}>
            <rect width="46" height="70" rx="10" fill={on ? '#5ee6a0' : '#6b5b98'} {...thin} />
            <rect x="11" y={on ? 12 : 36} width="24" height="22" rx="6" fill="#f7f4ec" stroke={INK} strokeWidth="2.5" />
            <text x="23" y="92" textAnchor="middle" className="art-tiny light">{name}</text>
          </g>
        );
      })}
    </>
  ),
};
