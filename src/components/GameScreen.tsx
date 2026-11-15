import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { recordById } from '../data/records';
import { MODULE_NAME } from '../engine/engine';
import { useGame } from '../store/game';
import { BottomBar } from './BottomBar';
import { Confetti } from './Confetti';
import { Debrief } from './Debrief';
import { Header } from './Header';
import { BuildPanel, CargoPanel, DataPanel, EventCard, EVENT_TITLE } from './Panels';
import { SiteMap } from './SiteMap';
import { TOUR } from './tour';

export function GameScreen() {
  const game = useGame((s) => s.game);
  const panel = useGame((s) => s.panel);
  const paused = useGame((s) => s.paused);
  const party = useGame((s) => s.party);
  const tick = useGame((s) => s.tick);
  const open = useGame((s) => s.open);
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

  // Training steps that wait for the player move on by themselves once the thing is done.
  const tour = useGame((s) => s.tour);
  const picked = useGame((s) => s.picked);
  const setTour = useGame((s) => s.setTour);
  const stepDone = !!game && tour !== null && !!TOUR[tour].done?.(game, picked);
  useEffect(() => {
    if (!stepDone || tour === null) return;
    const t = setTimeout(() => setTour(tour + 1), 900);
    return () => clearTimeout(t);
  }, [stepDone, tour, setTour]);

  if (!game) return null;
  const over = game.status !== 'playing';
  const critical = game.crew.some((c) => c.spo2 < 86 || c.health < 30);
  const live = game.events.filter((e) => e.phase === 'warned' || e.phase === 'active');

  return (
    <div className={`game ${critical && !over ? 'critical' : ''}`}>
      <Header game={game} />
      <main className="stage">
        <SiteMap game={game} />
        {game.blueprints.length > 0 && (
          <div className="blueprints">Blueprints ready: {game.blueprints.map((k, i) => <b key={i}>{MODULE_NAME[k]}</b>)}</div>
        )}
        <div className="alerts" role="alert">
          <AnimatePresence>
            {live.map((e) => {
              const warned = e.phase === 'warned';
              const left = warned ? e.startAt - game.time : e.endAt - game.time;
              const span = warned ? e.startAt - e.warnAt : e.endAt - e.startAt;
              return (
                <motion.button key={e.id} className={`alert ${warned ? 'incoming' : 'active'}`} onClick={() => open({ type: 'data', recordId: e.recordId })}
                  initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
                  <strong>{EVENT_TITLE[e.kind]} {warned ? 'incoming' : 'is here'}</strong>
                  <span className="alert-real">{e.recordId.startsWith('no-snapshot') ? 'See the data' : `Real event: ${recordById(e.recordId)?.date}`}</span>
                  <span className="alert-bar"><i style={{ width: `${Math.max(0, Math.min(1, left / span)) * 100}%` }} /></span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
        {paused && !over && <div className="paused-tag">Paused. You can still flip switches. Press P to play.</div>}
        <Confetti burst={party} />
      </main>
      <BottomBar game={game} />
      {over && !panel && <Debrief game={game} />}
      {panel?.type === 'event' && <EventCard game={game} eventId={panel.eventId} />}
      {panel?.type === 'cargo' && <CargoPanel game={game} />}
      {panel?.type === 'build' && <BuildPanel game={game} cell={panel.cell} />}
      {panel?.type === 'data' && <DataPanel recordId={panel.recordId} />}
    </div>
  );
}
