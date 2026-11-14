import { recordById } from '../data/records';
import { isOn, power } from '../engine/engine';
import type { GameEvent, GameState } from '../engine/types';
import { useGame } from '../store/game';
import { Term } from './Term';

export const EVENT_TITLE = { cme: 'Solar storm', flare: 'Solar flare', dust: 'Dust storm' } as const;

function advice(e: GameEvent, game: GameState): string {
  const hasShield = game.modules.some((m) => m.kind === 'shield' && m.buildLeft <= 0);
  if (e.kind === 'dust') {
    return e.phase === 'warned'
      ? 'Sunlight is about to drop. Decide now what you can live without.'
      : `Only ${Math.round(power(game).sunlight * 100)}% of the sunlight is getting through.`;
  }
  if (!hasShield) return 'You have no working Storm Shield. Build one in an empty room.';
  if (!isOn(game, 'shield')) return 'Switch on the Storm Shield. You will need to switch something else off first.';
  return game.shield >= 99 ? 'Shield is up. Hold on until it passes.' : 'Shield is charging. Keep it on.';
}

export function Alerts({ game }: { game: GameState }) {
  const open = useGame((s) => s.open);
  const live = game.events.filter((e) => e.phase === 'warned' || e.phase === 'active');
  if (!live.length) return null;
  return (
    <div className="alerts" role="alert">
      {live.map((e) => {
        const rec = recordById(e.recordId);
        const warned = e.phase === 'warned';
        const left = warned ? e.startAt - game.time : e.endAt - game.time;
        const span = warned ? e.startAt - e.warnAt : e.endAt - e.startAt;
        return (
          <div key={e.id} className={`alert alert-${e.kind} ${warned ? 'incoming' : 'active'}`}>
            <div className="alert-text">
              <strong>
                <Term k={e.kind}>{EVENT_TITLE[e.kind]}</Term> {warned ? `arrives in ${left.toFixed(1)} sols` : `is here for ${left.toFixed(1)} more sols`}
              </strong>
              <span>{advice(e, game)}</span>
            </div>
            <button className="btn btn-nasa btn-small" onClick={() => open({ type: 'data', recordId: e.recordId })}>
              Real event: {rec?.date ?? 'see data'}
            </button>
            <span className="alert-bar"><i style={{ width: `${Math.max(0, Math.min(1, left / span)) * 100}%` }} /></span>
          </div>
        );
      })}
    </div>
  );
}
