import { useEffect } from 'react';
import { useGame } from '../store/game';
import { AlbumPanel } from './Album';
import { UpgradePanel } from './Upgrade';
import { BottomBar } from './BottomBar';
import { CrewGhost } from './CrewGhost';
import { Guide } from './Guide';
import { Confetti } from './Confetti';
import { Debrief } from './Debrief';
import { Diorama } from './Diorama';
import { GoalCard } from './GoalCard';
import { Header } from './Header';
import { Moments } from './Moments';
import { BuildPanel, CargoPanel, DataPanel, EventCard, LogPanel } from './Panels';
import { Pops } from './Pops';
import { StormFuse } from './StormFuse';

export function GameScreen() {
  const game = useGame((s) => s.game);
  const panel = useGame((s) => s.panel);
  const paused = useGame((s) => s.paused);
  const party = useGame((s) => s.party);
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
      if (e.code === 'KeyP' && !(e.target as HTMLElement).closest('dialog')) setPaused(!useGame.getState().paused);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaused]);

  const tour = useGame((s) => s.tour);

  if (!game) return null;
  const over = game.status !== 'playing';
  const critical = game.crew.some((c) => !c.out && (c.spo2 < 86 || c.health < 30));

  return (
    <div className={`game ${critical && !over ? 'critical' : ''} ${tour === 0 ? 'intro' : ''}`}>
      <Header game={game} />
      <main className="stage">
        <Diorama game={game} />
        {tour === null && !over && <StormFuse game={game} />}
        {tour === null && !over && <GoalCard />}
        {paused && !over && <div className="paused-tag">Paused. You can still flip switches. Press P to play.</div>}
        <Confetti burst={party} />
      </main>
      <BottomBar game={game} />
      <Pops />
      <Moments />
      <CrewGhost />
      <Guide />
      {over && !panel && <Debrief game={game} />}
      {panel?.type === 'event' && <EventCard game={game} eventId={panel.eventId} />}
      {panel?.type === 'cargo' && <CargoPanel game={game} />}
      {panel?.type === 'build' && <BuildPanel game={game} cell={panel.cell} />}
      {panel?.type === 'log' && <LogPanel game={game} />}
      {panel?.type === 'data' && <DataPanel recordId={panel.recordId} />}
      {panel?.type === 'finds' && <AlbumPanel />}
      {panel?.type === 'upgrade' && <UpgradePanel game={game} id={panel.id} />}
    </div>
  );
}
