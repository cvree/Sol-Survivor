import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Brain, Copy, Delete, CornerDownLeft } from 'lucide-react';
import { loadDaily, saveDaily, score, wordFor, type DailyState } from '../lib/daily';
import { sfx } from '../lib/sound';
import { useGame } from '../store/game';
import { Modal } from './Panels';

const ROWS = 6;
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/**
 * The Daily Sol Check: guess today's five-letter space word in six tries.
 * Green = right letter, right place. Yellow = in the word, wrong place. Grey = not in it.
 */
export function DailyCheck() {
  const open = useGame((s) => s.open);
  const [d, setD] = useState<DailyState>(loadDaily);
  const [typed, setTyped] = useState('');
  const [shake, setShake] = useState(0);
  const [copied, setCopied] = useState(false);
  const answer = wordFor(d.key);

  const submit = () => {
    if (d.done) return;
    if (typed.length < 5) { setShake((n) => n + 1); sfx.denied(); return; }
    const guesses = [...d.guesses, typed];
    const won = typed === answer.word;
    const next = { ...d, guesses, won, done: won || guesses.length >= ROWS };
    setD(next);
    saveDaily(next);
    setTyped('');
    if (won) sfx.win(); else if (next.done) sfx.lose(); else sfx.pop();
  };
  const press = (k: string) => {
    if (d.done) return;
    if (k === 'ENTER') return submit();
    if (k === 'BACK') return setTyped((t) => t.slice(0, -1));
    if (typed.length < 5) { sfx.on(); setTyped((t) => t + k); }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Handle typing here, so Enter guesses a word instead of pressing whichever button has focus.
      if (e.key === 'Enter') { e.preventDefault(); press('ENTER'); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('BACK'); }
      else if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); press(e.key.toUpperCase()); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // Colour each keyboard key by the best result seen for that letter.
  const keyState: Record<string, string> = {};
  d.guesses.forEach((g) => score(g, answer.word).forEach((r, i) => {
    const prev = keyState[g[i]];
    if (r === 'hit' || (r === 'near' && prev !== 'hit') || (!prev)) keyState[g[i]] = r;
  }));
  const share = `Sol Survivor · Daily Sol Check ${d.key} · ${d.won ? d.guesses.length : 'X'}/6\n` + d.guesses.map((g) => score(g, answer.word).map((r) => (r === 'hit' ? '🟩' : r === 'near' ? '🟨' : '⬛')).join('')).join('\n');

  return (
    <Modal title="Daily Sol Check" onClose={() => open(null)}>
      <p className="lede daily-lede"><Brain /> Real astronauts take quick brain tests to check they are sharp. Guess today's five-letter space word in six tries!</p>
      <div className="daily-grid">
        {Array.from({ length: ROWS }, (_, r) => {
          const g = d.guesses[r];
          const row = g ?? (r === d.guesses.length ? typed.padEnd(5) : '     ');
          const marks = g ? score(g, answer.word) : null;
          return (
            <motion.div key={r} className="daily-row" animate={r === d.guesses.length && shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.35 }}>
              {row.split('').map((ch, i) => (
                <motion.span key={i} className={`tile ${marks ? marks[i] : ch.trim() ? 'typed' : ''}`}
                  initial={marks ? { rotateX: 90 } : false} animate={{ rotateX: 0 }} transition={{ delay: marks ? i * 0.12 : 0 }}>{ch.trim()}</motion.span>
              ))}
            </motion.div>
          );
        })}
      </div>
      {d.done ? (
        <div className="daily-done">
          <p className="lede">{d.won ? `Sharp as a tack! You got it in ${d.guesses.length}.` : `Today's word was ${answer.word}. Try again tomorrow!`}</p>
          <p className="daily-hint"><b>{answer.word}:</b> {answer.hint}</p>
          {d.won && <p className="aside">{d.bonusUsed ? 'Today\'s head start has been used.' : 'Head start unlocked: your next mission today starts with +10 bricks and +1 spare part.'}</p>}
          <button className="btn" onClick={() => { void navigator.clipboard?.writeText(share).then(() => setCopied(true)); }}><Copy /> {copied ? 'Copied!' : 'Copy my result'}</button>
        </div>
      ) : (
        <>
          <p className="aside">{d.guesses.length >= 3 ? `Hint: ${answer.hint}` : `A hint appears after 3 guesses.`}</p>
          <div className="daily-keys">
            {KEYS.map((row, i) => (
              <div key={row} className="key-row">
                {i === 2 && <button className="key wide" onClick={() => press('ENTER')} aria-label="Enter"><CornerDownLeft /></button>}
                {row.split('').map((k) => <button key={k} className={`key ${keyState[k] ?? ''}`} onClick={() => press(k)}>{k}</button>)}
                {i === 2 && <button className="key wide" onClick={() => press('BACK')} aria-label="Delete"><Delete /></button>}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
