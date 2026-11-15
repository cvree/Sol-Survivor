import { AnimatePresence, motion } from 'motion/react';
import { useGame } from '../store/game';

let last = { x: 0, y: 0 };
if (typeof window !== 'undefined') window.addEventListener('pointerdown', (e) => { last = { x: e.clientX, y: e.clientY }; }, true);
const COLORS = ['#5ee6a0', '#4fd8ff', '#ffd23f', '#ff8fd8', '#ff9a4d'];

/** Quick good moves in a row: the combo shows up right where you clicked. */
export function ComboPop() {
  const pop = useGame((s) => s.comboPop);
  const fresh = pop && Date.now() - pop.at < 1200;
  return (
    <AnimatePresence>
      {fresh && (
        <motion.span key={pop.at} className="combo-pop" style={{ left: last.x, top: last.y, background: COLORS[pop.n % COLORS.length], fontSize: `${1 + Math.min(pop.n, 6) * 0.14}rem` }}
          initial={{ scale: 0.2, y: 0, rotate: -12, opacity: 1 }} animate={{ scale: [0.2, 1.25, 1], y: -70, rotate: [-12, 6, 0], opacity: [1, 1, 0] }} transition={{ duration: 1, times: [0, 0.25, 1] }}
          aria-hidden="true">
          Combo x{pop.n}!
        </motion.span>
      )}
    </AnimatePresence>
  );
}
