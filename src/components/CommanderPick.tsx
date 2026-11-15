import { motion } from 'motion/react';
import { ArrowLeft, Star } from 'lucide-react';
import { COMMANDERS, SPECIALIST, TRAITS } from '../engine/engine';
import { MODULE_NAME } from '../engine/engine';
import type { ModuleKind } from '../engine/types';
import { useGame } from '../store/game';
import { Astronaut } from './art';
import { HAPPY } from './crewLook';

const BEST = (role: string) => {
  const k = (Object.keys(SPECIALIST) as ModuleKind[]).find((m) => SPECIALIST[m] === role);
  return k ? MODULE_NAME[k] : '';
};
const ACT = { Engineer: 'wrench', Medic: 'check', Botanist: 'water', Scientist: 'type' } as const;

/** Choose who you are. Your commander is your life: if they die, the mission is over. */
export function CommanderPick() {
  const { chooseCommander, quit } = useGame();
  return (
    <div className="title pick">
      <div className="sky" aria-hidden="true"><div className="sun" /><div className="hills hills-far" /><div className="hills hills-near" /></div>
      <div className="title-ground" aria-hidden="true" />
      <div className="pick-wrap">
        <motion.header className="pick-head" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <button className="btn btn-ghost" onClick={quit}><ArrowLeft /> Back</button>
          <div>
            <h1>Choose your commander</h1>
            <p>This astronaut is you, and the only thing you get for free. You land alone with a capsule. Everything else, you earn. If your commander dies, the mission is over.</p>
          </div>
        </motion.header>
        <div className="pick-grid">
          {COMMANDERS.map((c, i) => (
            <motion.button key={c.id} className={`pick-card role-${c.role.toLowerCase()}`} onClick={() => chooseCommander(c.id)}
              initial={{ y: 60, opacity: 0, rotate: i % 2 ? 3 : -3 }} animate={{ y: 0, opacity: 1, rotate: 0 }} whileHover={{ y: -10, rotate: i % 2 ? 1.5 : -1.5 }} whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 + i * 0.08 }}>
              <span className="pick-portrait"><Astronaut who={c} look={HAPPY} size={86} act={ACT[c.role]} /></span>
              <strong>{c.name}</strong>
              <span className="pick-role">{c.role}</span>
              <span className="pick-best">Best in the {BEST(c.role)}</span>
              <span className="trait-chip">{TRAITS[c.trait].name}: {TRAITS[c.trait].text}</span>
              <span className="pick-perk"><Star /> As commander: {c.perk}</span>
              <span className="pick-quirk">"{c.quirk}"</span>
              <span className="pick-go">Be {c.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
