import { motion } from 'motion/react';
import { ArrowUpCircle, Hammer, Package } from 'lucide-react';
import { BATTERY_BY_LEVEL, DOME_RADIUS, LEVEL_BOOST, MAX_LEVEL, SOLAR_BY_LEVEL, UPGRADE_SOLS } from '../engine/constants';
import { MODULE_NAME, cannotUpgrade, habLevel, upgradeCost } from '../engine/engine';
import type { GameState, ModuleState } from '../engine/types';
import { useGame } from '../store/game';
import { MODULE_ICON } from './art';
import { LevelStars } from './LevelDeco';
import { Modal } from './Panels';

/** What one more level does for this module, in a child's words. */
function gain(m: ModuleState): string {
  const n = m.level + 1;
  const pct = (k: number) => `${Math.round((LEVEL_BOOST[k] - 1) * 100)}%`;
  switch (m.kind) {
    case 'solar': return `Makes ${SOLAR_BY_LEVEL[n]} power instead of ${SOLAR_BY_LEVEL[m.level]}.`;
    case 'battery': return `Gives ${BATTERY_BY_LEVEL[n]} steady power instead of ${BATTERY_BY_LEVEL[m.level]}.`;
    case 'dome': return DOME_RADIUS[n] > DOME_RADIUS[m.level] ? 'Its blue protection zone gets wider, and it blocks more radiation.' : 'It blocks more of the radiation inside its zone.';
    case 'hab': return `Crew sleep ${pct(n)} better, and every other module can now reach level ${n}.`;
    case 'miner': return 'Digs faster and its bin holds more bricks.';
    case 'rover': return 'A tougher rover garage. (More rover upgrades are coming.)';
    default: return `Works ${pct(n)} better than a level-1 one.`;
  }
}

export function UpgradePanel({ game, id }: { game: GameState; id: string }) {
  const { open, upgrade } = useGame();
  const m = game.modules.find((x) => x.id === id);
  if (!m) return null;
  const Icon = MODULE_ICON[m.kind];
  const why = cannotUpgrade(game, m);
  const top = m.level >= MAX_LEVEL;
  return (
    <Modal title={`${MODULE_NAME[m.kind]}`} onClose={() => open(null)}>
      <div className="up-head">
        <span className="badge big"><Icon /></span>
        <div>
          <p className="up-level">Level {m.level} <LevelStars level={m.level} /></p>
          {!top && <p className="lede">Level {m.level + 1}: {gain(m)}</p>}
          {top && <p className="lede">Top level! This is as good as it gets.</p>}
        </div>
      </div>
      {!top && (
        <ul className="up-facts">
          <li><Package /> Costs <b>{upgradeCost(m)}</b> bricks (you have {game.materials})</li>
          <li><Hammer /> A builder must work on it for about {Math.round((UPGRADE_SOLS[m.level] ?? 2) * 10) / 10} sols</li>
          <li className="warn"><ArrowUpCircle /> It switches OFF until the upgrade is done. Pick a calm moment!</li>
          {m.kind !== 'hab' && <li>Hab level {habLevel(game)}: nothing can be upgraded past your Hab.</li>}
        </ul>
      )}
      <div className="modal-actions">
        {!top && <motion.button className="btn btn-go btn-big" whileTap={{ scale: 0.95 }} disabled={!!why} onClick={() => upgrade(m.id)}><ArrowUpCircle /> Upgrade to level {m.level + 1}</motion.button>}
        {why && !top && <span className="aside">{why}</span>}
      </div>
    </Modal>
  );
}
