import { AnimatePresence, motion } from 'motion/react';
import { Check, Package, Target, Wrench } from 'lucide-react';
import { GOALS } from '../engine/goals';
import { useGame } from '../store/game';

const REWARD = { part: { Icon: Wrench, text: 'Spare part' }, supplies: { Icon: Package, text: 'Supply crate' } };

/** One small mission is always on screen, so there is always a next thing to do. */
export function GoalCard() {
  const goal = useGame((s) => s.goal);
  const done = useGame((s) => s.goalsDone.length);
  const flash = useGame((s) => s.goalFlash);
  const fresh = flash && Date.now() - flash.at < 2200;
  const def = goal && GOALS.find((g) => g.id === goal.id);
  return (
    <div className="goal-slot">
      <AnimatePresence mode="wait">
        {fresh ? (
          <motion.div key={`done-${flash.at}`} className="goal done" role="status"
            initial={{ scale: 0.6, rotate: -4 }} animate={{ scale: [0.6, 1.12, 1], rotate: [-4, 2, 0] }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.45 }}>
            <span className="goal-icon"><Check /></span>
            <span className="goal-body">
              <small>Mission complete!</small>
              <strong>{flash.text}</strong>
              <span className="goal-reward">{(() => { const R = REWARD[flash.reward]; return <><R.Icon /> +1 {R.text} from Earth</>; })()}</span>
            </span>
            {Array.from({ length: 10 }, (_, i) => <i key={i} className="goal-spark" style={{ '--a': `${i * 36}deg`, '--d': `${60 + (i % 3) * 22}px` } as React.CSSProperties} />)}
          </motion.div>
        ) : def && goal ? (
          <motion.div key={def.id} className="goal" role="status"
            initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
            <span className="goal-icon"><Target /></span>
            <span className="goal-body">
              <small>Mission {done + 1}</small>
              <strong>{def.text}</strong>
              <span className="goal-bar"><motion.i animate={{ width: `${Math.max(4, goal.value * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></span>
              <span className="goal-reward">{(() => { const R = REWARD[def.reward]; return <>Reward: <R.Icon /> {R.text}</>; })()}</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
