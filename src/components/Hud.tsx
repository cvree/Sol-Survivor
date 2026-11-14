import { MISSION_SOLS, SOLAR_OUTPUT } from '../engine/constants';
import { isOn, lifeFlow, power, stormDose } from '../engine/engine';
import type { GameState } from '../engine/types';
import { useGame } from '../store/game';
import { Term } from './Term';

export function Hud({ game }: { game: GameState }) {
  const { paused, speed, muted, setPaused, setSpeed, toggleMute, open, quit } = useGame();
  const sol = Math.min(MISSION_SOLS, Math.floor(game.time));
  const part = game.time - Math.floor(game.time);
  const p = power(game);
  const arrays = game.modules.filter((m) => m.kind === 'solar' && m.buildLeft <= 0).length;
  const flow = lifeFlow(game);
  const shieldOn = isOn(game, 'shield');
  const hasShield = game.modules.some((m) => m.kind === 'shield');
  const storm = stormDose(game) > 0;
  const lowLife = game.life < 20;

  return (
    <header className="hud">
      <div className="hud-sol" aria-label={`Sol ${sol} of ${MISSION_SOLS}`}>
        <svg viewBox="0 0 44 44" className="sol-dial" aria-hidden="true">
          <circle cx="22" cy="22" r="18" className="dial-track" />
          <circle cx="22" cy="22" r="18" className="dial-fill" strokeDasharray={`${part * 113.1} 113.1`} transform="rotate(-90 22 22)" />
        </svg>
        <div>
          <div className="hud-big"><Term k="sol">Sol</Term> {sol}</div>
          <div className="hud-small">of {MISSION_SOLS}</div>
        </div>
      </div>

      <div className="meter meter-power">
        <div className="meter-head">
          <span className="meter-name">Power</span>
          <span className="meter-value">{p.used} of {p.supply} in use</span>
        </div>
        <div className="pips" role="img" aria-label={`${p.used} of ${p.supply} power in use`}>
          {Array.from({ length: arrays * SOLAR_OUTPUT }, (_, i) => (
            <span key={i} className={`pip ${i < p.used ? 'used' : i < p.supply ? 'free' : 'lost'}`} />
          ))}
        </div>
        <div className="meter-note">{p.sunlight < 0.99 ? `Dust is blocking ${Math.round((1 - p.sunlight) * 100)}% of the sunlight` : p.free > 0 ? `${p.free} spare` : 'Nothing spare'}</div>
      </div>

      <div className={`meter meter-life ${lowLife ? 'alarm' : ''}`}>
        <div className="meter-head">
          <span className="meter-name"><Term k="lifesupport">Life support</Term></span>
          <span className="meter-value">{Math.round(game.life)}%</span>
        </div>
        <div className="bar"><span style={{ width: `${game.life}%` }} /></div>
        <div className="meter-note">
          {flow.net >= 0 ? `▲ Filling by ${flow.net.toFixed(1)} each sol` : `▼ Draining by ${(-flow.net).toFixed(1)} each sol`}
        </div>
      </div>

      <div className={`meter meter-shield ${storm && game.shield < 50 ? 'alarm' : ''}`}>
        <div className="meter-head">
          <span className="meter-name">Shield</span>
          <span className="meter-value">{Math.round(game.shield)}%</span>
        </div>
        <div className="bar"><span style={{ width: `${game.shield}%` }} /></div>
        <div className="meter-note">
          {!hasShield ? 'Not built yet' : shieldOn ? (game.shield >= 99 ? 'Fully charged' : 'Charging up') : game.shield > 1 ? 'Fading' : 'Switched off'}
          {storm ? '. Radiation storm outside!' : ''}
        </div>
      </div>

      <div className="hud-controls">
        <button className="btn" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? 'Play' : 'Pause'}</button>
        <button className="btn" onClick={() => setSpeed(speed === 1 ? 2 : 1)} aria-label={`Speed ${speed} times. Change speed`}>Speed {speed}×</button>
        <button className="btn" onClick={toggleMute} aria-pressed={muted}>{muted ? 'Sound off' : 'Sound'}</button>
        <button className="btn btn-nasa" onClick={() => open({ type: 'data' })}>NASA data</button>
        <button className="btn btn-quiet" onClick={quit}>Quit</button>
      </div>
    </header>
  );
}
