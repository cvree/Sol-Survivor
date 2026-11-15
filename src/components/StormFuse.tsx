import { AnimatePresence, motion } from 'motion/react';
import { Home, Sun, Wind, Zap } from 'lucide-react';
import { recordById } from '../data/records';
import { power, shieldBlock } from '../engine/engine';
import type { EventKind, GameEvent, GameState } from '../engine/types';
import { useGame } from '../store/game';

const NAME: Record<EventKind, string> = { cme: 'Solar storm', flare: 'Solar flare', dust: 'Dust storm' };
const ICON = { cme: Sun, flare: Zap, dust: Wind };

/** 0-1: how close a warned event is to landing. */
export const nearness = (e: GameEvent, time: number) => Math.max(0, Math.min(1, 1 - (e.startAt - time) / Math.max(0.2, e.startAt - e.warnAt)));

/**
 * The storm as a fuse. One tense object everyone watches: a spark crawls along
 * a rope toward the base, slowly at first, then faster. When it arrives, the storm hits.
 */
export function StormFuse({ game }: { game: GameState }) {
  const open = useGame((s) => s.open);
  const live = game.events.filter((e) => e.phase === 'warned' || e.phase === 'active').sort((a, b) => a.startAt - b.startAt).slice(0, 2);
  return (
    <div className="fuses" role="alert">
      <AnimatePresence>
        {live.map((e) => {
          const Icon = ICON[e.kind];
          const rec = recordById(e.recordId);
          const real = e.recordId.startsWith('no-snapshot') ? 'Practice storm · see the data' : `Real event · ${rec?.date}`;
          const common = {
            onClick: () => open({ type: 'data', recordId: e.recordId }),
            initial: { y: -70, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -70, opacity: 0 },
            transition: { type: 'spring', stiffness: 300, damping: 20 } as const,
          };
          if (e.phase === 'warned') {
            const near = nearness(e, game.time);
            // Crawl, then rush: the last third of the rope burns in a fraction of the time.
            const at = Math.pow(near, 1.9) * 100;
            const left = Math.max(0, e.startAt - game.time);
            return (
              <motion.button key={e.id} className={`fuse incoming k-${e.kind} ${near > 0.72 ? 'urgent' : ''}`} {...common}
                aria-label={`${NAME[e.kind]} hits in ${left.toFixed(1)} sols. Open the NASA record.`}>
                <span className="fuse-badge"><Icon /></span>
                <span className="fuse-text"><strong>{NAME[e.kind]} in <b>{left.toFixed(1)}</b> sols</strong><small>{real}</small></span>
                <span className="fuse-track" aria-hidden="true">
                  <i className="fuse-ash" style={{ width: `${at}%` }} />
                  <i className="fuse-rope" style={{ left: `${at}%` }} />
                  <i className="fuse-spark" style={{ left: `${at}%` }}><b /><b /><b /><b /><b /></i>
                </span>
                <span className="fuse-target" aria-hidden="true"><Home /></span>
              </motion.button>
            );
          }
          const span = e.endAt - e.startAt;
          const left = Math.max(0, Math.min(1, (e.endAt - game.time) / span));
          const note = e.kind === 'dust'
            ? `Sunlight down to ${Math.round(power(game).sunlight * 100)}%`
            : `Shield is blocking ${Math.round(shieldBlock(game) * 100)}%`;
          return (
            <motion.button key={e.id} className={`fuse active k-${e.kind}`} {...common} aria-label={`${NAME[e.kind]} is here. ${note}. Open the NASA record.`}>
              <span className="fuse-badge"><Icon /></span>
              <span className="fuse-text"><strong>{NAME[e.kind]} is here! Hold on!</strong><small>{note} · {real}</small></span>
              <span className="fuse-track drain" aria-hidden="true"><i className="fuse-left" style={{ width: `${left * 100}%` }} /></span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
