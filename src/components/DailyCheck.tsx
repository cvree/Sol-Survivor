import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Brain, Copy, CornerDownLeft, Delete, Dices, Lock, RotateCcw, Sparkles, Star } from 'lucide-react';
import {
  ALL_WORDS, BANK, LEVELS, addToLog, hintFor, loadDaily, loadLog, loadPractice, loadStats, newPractice, rankOf, recordGame,
  saveDaily, savePractice, score, wordFor, type DailyState, type Level, type PracticeState,
} from '../lib/daily';
import { sfx } from '../lib/sound';
import { useGame } from '../store/game';
import { Modal } from './Panels';

const ROWS = 6;
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
type Tab = 'today' | 'practice' | 'log';

/**
 * The Daily Sol Check: guess today's five-letter space word in six tries.
 * Green = right letter, right place. Yellow = in the word, wrong place. Grey = not in it.
 * After today's word there is always more: practice words in three sizes, and a Word Log
 * that collects every space word you solve, with ranks to climb. No streaks, so a missed day costs nothing.
 */
export function DailyCheck() {
  const open = useGame((s) => s.open);
  const [daily, setDaily] = useState<DailyState>(loadDaily);
  const [practice, setPractice] = useState<PracticeState>(() => loadPractice() ?? newPractice(5));
  const [tab, setTab] = useState<Tab>(() => (loadDaily().done ? 'practice' : 'today'));
  const [log, setLog] = useState<string[]>(loadLog);
  /** A just-solved word that was new to the log, and whether it moved the player up a rank. */
  const [fresh, setFresh] = useState<{ word: string; rankUp: string | null } | null>(null);

  const solved = (word: string, won: boolean, guesses: number) => {
    recordGame(won, guesses);
    if (!won) return;
    const before = rankOf(loadLog().length).rank.name;
    if (addToLog(word)) {
      const now = loadLog();
      setLog(now);
      const after = rankOf(now.length).rank.name;
      setFresh({ word, rankUp: after !== before ? after : null });
      setTimeout(() => sfx.discover(), 700);
    } else setFresh(null);
  };

  const guessDaily = (typed: string) => {
    const answer = wordFor(daily.key).word;
    const guesses = [...daily.guesses, typed];
    const won = typed === answer;
    const next = { ...daily, guesses, won, done: won || guesses.length >= ROWS };
    setDaily(next);
    saveDaily(next);
    if (next.done) solved(answer, won, guesses.length);
    return next;
  };
  const guessPractice = (typed: string) => {
    const guesses = [...practice.guesses, typed];
    const won = typed === practice.word;
    const next = { ...practice, guesses, won, done: won || guesses.length >= ROWS };
    setPractice(next);
    savePractice(next);
    if (next.done) solved(practice.word, won, guesses.length);
    return next;
  };
  const nextWord = (len: Level = practice.len) => {
    const p = newPractice(len, practice.word);
    setPractice(p);
    savePractice(p);
    setFresh(null);
    setTab('practice');
    sfx.build();
  };
  const pickTab = (t: Tab) => { if (t !== tab) { sfx.build(); setFresh(null); setTab(t); } };
  const { rank } = rankOf(log.length);

  return (
    <Modal title="Daily Sol Check" onClose={() => open(null)}>
      <nav className="word-tabs" role="tablist" aria-label="Word games">
        {([['today', 'Today', <Brain key="b" />], ['practice', 'Practice', <Dices key="d" />], ['log', `Word Log ${log.length}/${ALL_WORDS.length}`, <BookOpen key="o" />]] as const).map(([id, name, icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`word-tab ${tab === id ? 'on' : ''}`} onClick={() => pickTab(id)}>
            {tab === id && <motion.span layoutId="word-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
            <span className="tab-label">{icon}{name}{id === 'today' && !daily.done && <i className="dot-new" aria-label="not played yet" />}</span>
          </button>
        ))}
      </nav>

      {tab === 'today' && (
        <>
          <p className="lede daily-lede"><Brain /> Real astronauts take quick brain tests to check they are sharp. Guess today's five-letter space word in six tries!</p>
          <Board key={`d-${daily.key}`} answer={wordFor(daily.key).word} guesses={daily.guesses} done={daily.done} onGuess={guessDaily} />
          {daily.done && <TodayDone daily={daily} fresh={fresh} onPractice={nextWord} />}
        </>
      )}

      {tab === 'practice' && (
        <>
          <div className="level-pick" role="radiogroup" aria-label="Word size">
            {LEVELS.map((l) => (
              <motion.button key={l.len} role="radio" aria-checked={practice.len === l.len} className={`level-opt ${practice.len === l.len ? 'on' : ''}`} whileTap={{ scale: 0.93 }}
                onClick={() => { if (practice.len !== l.len) nextWord(l.len); }}>
                <b>{l.name}</b><small>{l.blurb}</small>
              </motion.button>
            ))}
          </div>
          <Board key={`p-${practice.word}`} answer={practice.word} guesses={practice.guesses} done={practice.done} onGuess={guessPractice} />
          {practice.done && (
            <div className="daily-done">
              <Result won={practice.won} word={practice.word} tries={practice.guesses.length} fresh={fresh} />
              <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} onClick={() => nextWord()} autoFocus><Dices /> Next word</motion.button>
            </div>
          )}
          {!practice.done && practice.guesses.length === 0 && <p className="aside">Practice words are just for fun and for your Word Log. Today's head start only comes from today's word.</p>}
        </>
      )}

      {tab === 'log' && <WordLog log={log} rankName={rank.name} onPlay={() => nextWord()} />}
    </Modal>
  );
}

/** One game board: the grid of tiles, the keyboard, and typing. */
function Board({ answer, guesses, done, onGuess }: { answer: string; guesses: string[]; done: boolean; onGuess: (typed: string) => { done: boolean; won: boolean } }) {
  const len = answer.length;
  const [typed, setTyped] = useState('');
  const [shake, setShake] = useState(0);
  const submit = () => {
    if (done) return;
    if (typed.length < len) { setShake((n) => n + 1); sfx.denied(); return; }
    const next = onGuess(typed);
    setTyped('');
    if (next.won) sfx.win(); else if (next.done) sfx.lose(); else sfx.pop();
  };
  const press = (k: string) => {
    if (done) return;
    if (k === 'ENTER') return submit();
    if (k === 'BACK') return setTyped((t) => t.slice(0, -1));
    if (typed.length < len) { sfx.on(); setTyped((t) => t + k); }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Handle typing here, so Enter guesses a word instead of pressing whichever button has focus.
      if (done) return;
      if (e.key === 'Enter') { e.preventDefault(); press('ENTER'); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('BACK'); }
      else if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); press(e.key.toUpperCase()); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // Colour each keyboard key by the best result seen for that letter.
  const keyState: Record<string, string> = {};
  guesses.forEach((g) => score(g, answer).forEach((r, i) => {
    const prev = keyState[g[i]];
    if (r === 'hit' || (r === 'near' && prev !== 'hit') || (!prev)) keyState[g[i]] = r;
  }));
  const blank = ' '.repeat(len);
  return (
    <>
      <div className={`daily-grid len-${len}`}>
        {Array.from({ length: ROWS }, (_, r) => {
          const g = guesses[r];
          const row = g ?? (r === guesses.length && !done ? typed.padEnd(len) : blank);
          const marks = g ? score(g, answer) : null;
          return (
            <motion.div key={r} className="daily-row" animate={r === guesses.length && shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.35 }}>
              {row.split('').map((ch, i) => (
                <motion.span key={i} className={`tile ${marks ? marks[i] : ch.trim() ? 'typed' : ''}`}
                  initial={marks ? { rotateX: 90 } : false} animate={{ rotateX: 0 }} transition={{ delay: marks ? i * 0.12 : 0 }}>{ch.trim()}</motion.span>
              ))}
            </motion.div>
          );
        })}
      </div>
      {!done && (
        <>
          <p className="aside">{guesses.length >= 3 ? `Hint: ${hintFor(answer)}` : 'A hint appears after 3 guesses.'}</p>
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
    </>
  );
}

/** Won or lost, the word's fact, and a cheer if it went into the Word Log for the first time. */
function Result({ won, word, tries, fresh }: { won: boolean; word: string; tries: number; fresh: { word: string; rankUp: string | null } | null }) {
  return (
    <>
      <p className="lede">{won ? `Sharp as a tack! You got it in ${tries}.` : `The word was ${word}. Good try!`}</p>
      <p className="daily-hint"><b>{word}:</b> {hintFor(word)}</p>
      <AnimatePresence>
        {fresh?.word === word && (
          <motion.div className="log-cheer" initial={{ scale: 0, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 13, delay: 0.7 }}>
            <BookOpen /> <span>New in your Word Log!{fresh.rankUp && <> You are now a <b>{fresh.rankUp}</b>!</>}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TodayDone({ daily, fresh, onPractice }: { daily: DailyState; fresh: { word: string; rankUp: string | null } | null; onPractice: (len: Level) => void }) {
  const [copied, setCopied] = useState(false);
  const answer = wordFor(daily.key).word;
  const share = `Sol Survivor · Daily Sol Check ${daily.key} · ${daily.won ? daily.guesses.length : 'X'}/6\n` + daily.guesses.map((g) => score(g, answer).map((r) => (r === 'hit' ? '🟩' : r === 'near' ? '🟨' : '⬛')).join('')).join('\n');
  return (
    <div className="daily-done">
      <Result won={daily.won} word={answer} tries={daily.guesses.length} fresh={fresh} />
      {daily.won && <p className="aside">{daily.bonusUsed ? 'Today\'s head start has been used.' : 'Head start unlocked: your next mission today starts with +10 bricks and +1 spare part.'}</p>}
      {!daily.won && <p className="aside">A new word arrives tomorrow. Missing a day never costs you anything.</p>}
      <button className="btn" onClick={() => { void navigator.clipboard?.writeText(share).then(() => setCopied(true)); }}><Copy /> {copied ? 'Copied!' : 'Copy my result'}</button>
      <div className="keep-playing">
        <h3><Sparkles /> Keep playing! Find more space words for your Word Log</h3>
        <div className="level-pick">
          {LEVELS.map((l) => (
            <motion.button key={l.len} className="level-opt" whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.04 }} onClick={() => onPractice(l.len)}>
              <b>{l.name}</b><small>{l.blurb}</small>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Every space word there is, found or still hidden, with a rank to climb. */
function WordLog({ log, rankName, onPlay }: { log: string[]; rankName: string; onPlay: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const st = loadStats();
  const { rank, next } = rankOf(log.length);
  const into = next ? (log.length - rank.at) / (next.at - rank.at) : 1;
  const best = st.dist.reduce((b, n, i) => (n > 0 && b === 0 ? i + 1 : b), 0);
  return (
    <div className="word-log">
      <section className="rank-card">
        <span className="rank-badge" aria-hidden="true"><Star /></span>
        <div>
          <b>{rankName}</b>
          <span className="rank-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(4, into * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></span>
          <small>{next ? `${next.at - log.length} more word${next.at - log.length === 1 ? '' : 's'} to become a ${next.name}` : 'You found every space word. Amazing!'}</small>
        </div>
      </section>
      <dl className="word-stats">
        <div><dt>Played</dt><dd>{st.played}</dd></div>
        <div><dt>Solved</dt><dd>{st.won}</dd></div>
        <div><dt>Found</dt><dd>{log.length}/{ALL_WORDS.length}</dd></div>
        <div><dt>Best</dt><dd>{best ? `${best} tries` : '–'}</dd></div>
      </dl>
      {LEVELS.map((l) => {
        const words = BANK[l.len];
        const got = words.filter((w) => log.includes(w.word));
        return (
          <section key={l.len} className="log-group">
            <h3>{l.name} words <small>{got.length}/{words.length}</small></h3>
            <div className="log-chips">
              {words.map((w) => log.includes(w.word)
                ? <button key={w.word} className={`log-chip ${open === w.word ? 'on' : ''}`} onClick={() => { sfx.ping(); setOpen(open === w.word ? null : w.word); }} aria-expanded={open === w.word}>{w.word}</button>
                : <span key={w.word} className="log-chip hidden" aria-label="Not found yet"><Lock /></span>)}
            </div>
            <AnimatePresence>
              {open && got.some((w) => w.word === open) && (
                <motion.p key={open} className="daily-hint" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}><b>{open}:</b> {hintFor(open)}</motion.p>
              )}
            </AnimatePresence>
          </section>
        );
      })}
      <motion.button className="btn btn-go" whileTap={{ scale: 0.95 }} onClick={onPlay}><RotateCcw /> Find another word</motion.button>
    </div>
  );
}
