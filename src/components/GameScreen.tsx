import { useEffect } from 'react';
import { useGame } from '../store/game';
import { Alerts } from './Alerts';
import { Crew } from './Crew';
import { Debrief } from './Debrief';
import { Hud } from './Hud';
import { Outpost } from './Outpost';
import { BriefPanel, BuildPanel, DataPanel } from './Panels';

export function GameScreen() {
  const game = useGame((s) => s.game);
  const panel = useGame((s) => s.panel);
  const paused = useGame((s) => s.paused);
  const notice = useGame((s) => s.notice);
  const tick = useGame((s) => s.tick);
  const setPaused = useGame((s) => s.setPaused);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      tick((now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code === 'KeyP' && !el.closest('input, dialog')) setPaused(!useGame.getState().paused);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaused]);

  if (!game) return null;
  const over = game.status !== 'playing';
  const critical = game.crew.some((c) => c.spo2 < 86 || c.health < 30);

  return (
    <div className={`game ${critical && !over ? 'critical' : ''}`}>
      <Hud game={game} />
      <main className="play">
        <div className="stage">
          <Outpost game={game} />
          <Alerts game={game} />
          {paused && !over && <div className="paused-tag">Paused. You can still switch things on and off. Press P to play.</div>}
          {notice && <div key={notice.at} className="notice" role="status">{notice.text}</div>}
        </div>
        <Crew game={game} />
      </main>
      {over && !panel && <Debrief game={game} />}
      {panel?.type === 'brief' && <BriefPanel game={game} eventId={panel.eventId} />}
      {panel?.type === 'build' && <BuildPanel game={game} slot={panel.slot} />}
      {panel?.type === 'data' && <DataPanel recordId={panel.recordId} />}
    </div>
  );
}
