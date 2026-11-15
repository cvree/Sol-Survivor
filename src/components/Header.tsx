import { motion } from 'motion/react';
import { FlaskConical, Moon, Rocket, Sun, ShieldHalf, Sparkles, Wind, Wrench, Zap } from 'lucide-react';
import { CARGO_SOLS, DOME_COVERS, MAX_SPARE_PARTS, MISSION_SOLS } from '../engine/constants';
import { alive, isNight, isOn, lifeFlow, power, shieldBlock, stormDose } from '../engine/engine';
import type { GameState } from '../engine/types';
import { Term } from './Term';

const spring = { type: 'spring', stiffness: 120, damping: 20 } as const;

export function Header({ game }: { game: GameState }) {
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
  const tuned = p.free === 0 && p.supply >= 4 && p.sunlight >= 0.99;

  return (
    <header className="header">
      <div className="sol-badge" aria-label={`Sol ${sol} of ${MISSION_SOLS}`}>
        <span className="sol-word"><Term k="sol">Sol</Term> {isNight(game) ? <Moon className="daynight night" aria-label="Night" /> : <Sun className="daynight" aria-label="Day" />}</span>
        <span className="sol-num">{sol}<small>/{MISSION_SOLS}</small></span>
        <span className="sol-track"><motion.i animate={{ width: `${(game.time - Math.floor(game.time)) * 100}%` }} transition={{ duration: 0.1 }} /></span>
      </div>

      <div className={`res res-power ${tuned ? 'tuned' : ''}`}>
        <span className="res-icon" data-bar="power"><Zap /></span>
        <div className="res-body">
          <div className="res-head"><span>Power</span><b>{p.used}/{p.supply}</b></div>
          <div className="pips" role="img" aria-label={`${p.used} of ${p.supply} power in use`}>
            {Array.from({ length: p.most }, (_, i) => <span key={i} className={`pip ${i < p.used ? 'used' : i < p.supply ? 'free' : 'lost'}`} />)}
          </div>
          <div className="res-note">{p.sunlight < 0.99 ? `Dust is blocking ${Math.round((1 - p.sunlight) * 100)}% of the sun` : p.free > 0 ? `${p.free} spare` : tuned ? <><Sparkles /> Perfect! Every block in use</> : 'All in use'}</div>
        </div>
      </div>

      <div className={`res res-life ${lowLife ? 'alarm' : ''}`}>
        <span className="res-icon" data-bar="life"><Wind /></span>
        <div className="res-body">
          <div className="res-head"><span><Term k="lifesupport">Life support</Term></span><b>{Math.round(game.life)}%</b></div>
          <div className="bar"><motion.i animate={{ width: `${game.life}%` }} transition={spring} /></div>
          <div className="res-note">{flow.net >= 0 ? '▲ Filling up' : `▼ Draining${flow.net < -4 ? ' fast' : ''}`} for {crew} crew</div>
        </div>
      </div>

      <div className={`res res-shield ${storm && block < 50 ? 'alarm' : ''}`}>
        <span className="res-icon" data-bar="shield"><ShieldHalf /></span>
        <div className="res-body">
          <div className="res-head"><span>Shield</span><b>{block}%</b></div>
          <div className="bar"><motion.i animate={{ width: `${block}%` }} transition={spring} /></div>
          <div className="res-note">
            {storm ? 'Radiation storm! ' : ''}
            {!domes.length ? 'No Shield Dome yet' : !isOn(game, 'dome') ? (game.shield > 1 ? 'Fading' : 'Domes are off') : `Covers ${covered} of ${crew} crew`}
          </div>
        </div>
      </div>

      <div className="parts-chip" aria-label={`${game.spareParts} spare parts. Use one to patch a module that has no power.`} title="Spare parts: patch a module that has no power, for 1 sol">
        <Wrench />
        <span>Spare parts</span>
        <span className="parts-pips">{Array.from({ length: MAX_SPARE_PARTS }, (_, i) => <i key={i} className={i < game.spareParts ? 'have' : ''} />)}</span>
      </div>

      <div className={`cargo-chip`} data-bar="cargo" aria-label={`Next cargo lander in ${eta.toFixed(1)} sols`}>
        <Rocket />
        <span>Next lander <b className="cargo-pct">{Math.round(game.cargoProgress * 100)}%</b></span>
        <span className="sol-track"><motion.i animate={{ width: `${game.cargoProgress * 100}%` }} transition={{ duration: 0.2 }} /></span>
        {game.modules.some((m) => m.kind === 'lab') && <small><FlaskConical /> {Math.floor(game.science)}</small>}
      </div>
    </header>
  );
}
