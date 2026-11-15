import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ScrollText } from 'lucide-react';
import { tickerLine, type Line } from '../data/chatter';
import { useGame } from '../store/game';

const EVERY_MS = 5200;

/** The Mission Log ticker: M.A.R.V. and the crew, reacting to how the base is doing right now. */
export function Ticker() {
  const open = useGame((s) => s.open);
  const sol = useGame((s) => (s.game ? Math.floor(s.game.time) : 1));
  const [line, setLine] = useState<Line>({ who: 'M.A.R.V.', text: 'Mission log open. Standing by, Commander.', tone: 'calm' });
  const n = useRef(0);

  useEffect(() => {
    const say = () => {
      const { game, paused, panel, tour, moment } = useGame.getState();
      if (!game || game.status !== 'playing' || paused || panel || tour !== null || moment || document.hidden) return;
      const next = tickerLine(game, n.current++);
      setLine(next);
      if (next.crewId) useGame.setState({ bubble: { crewId: next.crewId, text: next.text, until: Date.now() + 3600 } });
    };
    const first = setTimeout(say, 1400);
    const timer = setInterval(say, EVERY_MS);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);

  return (
    <button className={`ticker tone-${line.tone}`} onClick={() => open({ type: 'log' })} aria-label="Mission log. Press to read it all.">
      <span className="ticker-tag"><ScrollText /> Mission log <b>Sol {String(sol).padStart(2, '0')}</b></span>
      <AnimatePresence mode="wait">
        <motion.span key={line.text} className="ticker-line" role="status"
          initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} transition={{ duration: 0.22 }}>
          <b>{line.who}:</b> {line.text}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
