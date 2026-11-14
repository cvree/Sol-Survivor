import { motion } from 'motion/react';
import { FlaskConical, ShieldHalf, Wind, Zap } from 'lucide-react';
import { BATTERY_OUTPUT, MISSION_SOLS, SOLAR_OUTPUT } from '../engine/constants';
import { isOn, lifeFlow, power, stormDose } from '../engine/engine';
import type { GameState } from '../engine/types';
import { useGame } from '../store/game';
import { Term } from './Term';

const spring = { type: 'spring', stiffness: 120, damping: 20 } as const;

export function Header({ game }: { game: GameState }) {
  const tour = useGame((s) => s.tour);
  const sol = Math.min(MISSION_SOLS, Math.floor(game.time));
  const p = power(game);
  const most = game.modules.filter((m) => m.kind === 'solar').length * SOLAR_OUTPUT + game.loadout.battery * BATTERY_OUTPUT;
  const flow = lifeFlow(game);
  const hasShield = game.modules.some((m) => m.kind === 'shield');
  const storm = stormDose(game) > 0;
  const lowLife = game.life < 20;
  const target = tour === 1 ? 'power' : tour === 3 ? 'life' : null;

  return (
    <header className="header">
      <div className="sol-badge" aria-label={`Sol ${sol} of ${MISSION_SOLS}`}>
        <span className="sol-word"><Term k="sol">Sol</Term></span>
        <span className="sol-num">{sol}<small>/{MISSION_SOLS}</small></span>
        <span className="sol-track"><motion.i animate={{ width: `${(game.time - Math.floor(game.time)) * 100}%` }} transition={{ duration: 0.1 }} /></span>
      </div>

      <div className={`res res-power ${target === 'power' ? 'tour-target' : ''}`}>
        <span className="res-icon"><Zap /></span>
        <div className="res-body">
          <div className="res-head"><span>Power</span><b>{p.used}/{p.supply}</b></div>
          <div className="pips" role="img" aria-label={`${p.used} of ${p.supply} power in use`}>
            {Array.from({ length: most }, (_, i) => <span key={i} className={`pip ${i < p.used ? 'used' : i < p.supply ? 'free' : 'lost'}`} />)}
          </div>
          <div className="res-note">{p.sunlight < 0.99 ? `Dust is blocking ${Math.round((1 - p.sunlight) * 100)}% of the sun` : p.free > 0 ? `${p.free} spare` : 'All in use'}</div>
        </div>
      </div>

      <div className={`res res-life ${lowLife ? 'alarm' : ''} ${target === 'life' ? 'tour-target' : ''}`}>
        <span className="res-icon"><Wind /></span>
        <div className="res-body">
          <div className="res-head"><span><Term k="lifesupport">Life support</Term></span><b>{Math.round(game.life)}%</b></div>
          <div className="bar"><motion.i animate={{ width: `${game.life}%` }} transition={spring} /></div>
          <div className="res-note">{flow.net >= 0 ? `▲ Filling up` : `▼ Draining${flow.net < -4 ? ' fast' : ''}`}</div>
        </div>
      </div>

      <div className={`res res-shield ${storm && game.shield < 50 ? 'alarm' : ''}`}>
        <span className="res-icon"><ShieldHalf /></span>
        <div className="res-body">
          <div className="res-head"><span>Shield</span><b>{Math.round(game.shield)}%</b></div>
          <div className="bar"><motion.i animate={{ width: `${game.shield}%` }} transition={spring} /></div>
          <div className="res-note">
            {storm ? 'Radiation storm outside!' : !hasShield ? 'Not packed' : isOn(game, 'shield') ? (game.shield >= 99 ? 'Fully charged' : 'Charging') : game.shield > 1 ? 'Fading' : 'Off'}
          </div>
        </div>
      </div>

      {game.loadout.lab > 0 && (
        <div className="science" aria-label={`${Math.floor(game.science)} science points`}>
          <FlaskConical /><b>{Math.floor(game.science)}</b><span>science</span>
        </div>
      )}
    </header>
  );
}
