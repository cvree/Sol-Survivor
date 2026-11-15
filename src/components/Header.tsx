import { motion } from 'motion/react';
import { FlaskConical, Rocket, ShieldHalf, Wind, Zap } from 'lucide-react';
import { CARGO_SOLS, DOME_COVERS, MISSION_SOLS } from '../engine/constants';
import { alive, isOn, lifeFlow, power, shieldBlock, stormDose } from '../engine/engine';
import type { GameState } from '../engine/types';
import { useGame } from '../store/game';
import { Term } from './Term';

const spring = { type: 'spring', stiffness: 120, damping: 20 } as const;

export function Header({ game }: { game: GameState }) {
  const tour = useGame((s) => s.tour);
  const sol = Math.min(MISSION_SOLS, Math.floor(game.time));
  const p = power(game);
  const flow = lifeFlow(game);
  const domes = game.modules.filter((m) => m.kind === 'dome' && m.buildLeft <= 0);
  const domesOn = domes.filter((m) => m.on).length;
  const crew = alive(game).length;
  const covered = Math.min(crew, domesOn * DOME_COVERS);
  const storm = stormDose(game) > 0;
  const block = Math.round((shieldBlock(game) / 0.92) * 100);
  const lowLife = game.life < 20;
  const eta = (1 - game.cargoProgress) * CARGO_SOLS;

  return (
    <header className="header">
      <div className="sol-badge" aria-label={`Sol ${sol} of ${MISSION_SOLS}`}>
        <span className="sol-word"><Term k="sol">Sol</Term></span>
        <span className="sol-num">{sol}<small>/{MISSION_SOLS}</small></span>
        <span className="sol-track"><motion.i animate={{ width: `${(game.time - Math.floor(game.time)) * 100}%` }} transition={{ duration: 0.1 }} /></span>
      </div>

      <div className={`res res-power ${tour === 1 ? 'tour-target' : ''}`}>
        <span className="res-icon"><Zap /></span>
        <div className="res-body">
          <div className="res-head"><span>Power</span><b>{p.used}/{p.supply}</b></div>
          <div className="pips" role="img" aria-label={`${p.used} of ${p.supply} power in use`}>
            {Array.from({ length: p.most }, (_, i) => <span key={i} className={`pip ${i < p.used ? 'used' : i < p.supply ? 'free' : 'lost'}`} />)}
          </div>
          <div className="res-note">{p.sunlight < 0.99 ? `Dust is blocking ${Math.round((1 - p.sunlight) * 100)}% of the sun` : p.free > 0 ? `${p.free} spare` : 'All in use'}</div>
        </div>
      </div>

      <div className={`res res-life ${lowLife ? 'alarm' : ''} ${tour === 3 ? 'tour-target' : ''}`}>
        <span className="res-icon"><Wind /></span>
        <div className="res-body">
          <div className="res-head"><span><Term k="lifesupport">Life support</Term></span><b>{Math.round(game.life)}%</b></div>
          <div className="bar"><motion.i animate={{ width: `${game.life}%` }} transition={spring} /></div>
          <div className="res-note">{flow.net >= 0 ? '▲ Filling up' : `▼ Draining${flow.net < -4 ? ' fast' : ''}`} for {crew} crew</div>
        </div>
      </div>

      <div className={`res res-shield ${storm && block < 50 ? 'alarm' : ''}`}>
        <span className="res-icon"><ShieldHalf /></span>
        <div className="res-body">
          <div className="res-head"><span>Shield</span><b>{block}%</b></div>
          <div className="bar"><motion.i animate={{ width: `${block}%` }} transition={spring} /></div>
          <div className="res-note">
            {storm ? 'Radiation storm! ' : ''}
            {!domes.length ? 'No Shield Dome yet' : !isOn(game, 'dome') ? (game.shield > 1 ? 'Fading' : 'Domes are off') : `Covers ${covered} of ${crew} crew`}
          </div>
        </div>
      </div>

      <div className={`cargo-chip ${tour === 5 ? 'tour-target' : ''}`} aria-label={`Next cargo lander in ${eta.toFixed(1)} sols`}>
        <Rocket />
        <span>Next lander</span>
        <span className="sol-track"><motion.i animate={{ width: `${game.cargoProgress * 100}%` }} transition={{ duration: 0.2 }} /></span>
        {game.modules.some((m) => m.kind === 'lab') && <small><FlaskConical /> {Math.floor(game.science)}</small>}
      </div>
    </header>
  );
}
