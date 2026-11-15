import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Rocket, ShieldHalf, Sparkles, Sun, Wind, Zap, Home } from 'lucide-react';
import { COMMANDERS } from '../engine/engine';
import { useGame } from '../store/game';
import { Astronaut, Lander, Marv, Rover } from './art';
import { HAPPY } from './crewLook';

/**
 * The mission briefing: four short cards, one idea each, read out by M.A.R.V.
 * Then the game teaches the rest by doing. Every card can be skipped.
 */
export function Briefing() {
  const { start, commander } = useGame();
  const [n, setN] = useState(0);
  const lead = COMMANDERS.find((c) => c.id === commander) ?? COMMANDERS[0];
  const cards = [
    {
      kicker: 'Mission briefing 1 of 4', title: `Welcome to Mars, Commander ${lead.name}!`,
      art: <div className="brief-art"><Lander size={90} /><Astronaut who={lead} look={HAPPY} size={56} act="wave" /></div>,
      lines: ['You and one crewmate just landed in Gale Crater, a real place on Mars.', 'Your job: keep your crew alive for 30 sols. A sol is one day on Mars.', 'Earth is so far away that a message takes up to 24 minutes. You make the calls.'],
    },
    {
      kicker: 'Mission briefing 2 of 4', title: 'Three things keep you alive',
      art: <div className="brief-art icons"><span className="bi volt"><Zap /></span><span className="bi go"><Wind /></span><span className="bi orange"><Home /></span></div>,
      lines: ['Power runs everything, and there is never quite enough. Tap a module to switch it on or off.', 'Air and food come from the Oxygen Maker and Hydroponics. They work best with an astronaut inside.', 'Heat comes from the Hab. If it is off, the crew get cold.'],
    },
    {
      kicker: 'Mission briefing 3 of 4', title: 'Watch the Sun',
      art: <div className="brief-art icons"><span className="bi sun"><Sun /></span><span className="brief-fuse"><i /></span><span className="bi cyan"><ShieldHalf /></span></div>,
      lines: ['When a storm is coming, a fuse burns across the top of the screen.', 'Before it reaches the base, switch on the Shield Dome to block the radiation.', 'This is real danger. Astronauts can die. If your commander dies, the mission is over.'],
    },
    {
      kicker: 'Mission briefing 4 of 4', title: 'Explore and discover',
      art: <div className="brief-art"><Rover size={120} /><span className="bi volt small"><Sparkles /></span></div>,
      lines: ['Drag the ground sideways to look around your crater.', 'Sparkles mark real things the Curiosity rover found. Tap them to collect them in your album.', 'Cargo landers bring new crew and new modules. Grow your base!'],
    },
  ];
  const card = cards[n];
  const last = n === cards.length - 1;
  return (
    <div className="title brief">
      <div className="sky" aria-hidden="true"><div className="sun" /><div className="hills hills-far" /><div className="hills hills-near" /></div>
      <div className="title-ground" aria-hidden="true" />
      <div className="brief-wrap">
        <AnimatePresence mode="wait">
          <motion.section key={n} className="brief-card" initial={{ x: 80, opacity: 0, rotate: 2 }} animate={{ x: 0, opacity: 1, rotate: 0 }} exit={{ x: -80, opacity: 0, rotate: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
            <p className="brief-kicker">{card.kicker}</p>
            <h1>{card.title}</h1>
            {card.art}
            <ol className="brief-lines">
              {card.lines.map((l, i) => <motion.li key={l} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.12 }}><b>{i + 1}</b>{l}</motion.li>)}
            </ol>
            <div className="brief-foot">
              <span className="brief-dots">{cards.map((_, i) => <i key={i} className={i === n ? 'on' : ''} />)}</span>
              <button className="btn btn-ghost" onClick={() => start()}>Skip</button>
              <motion.button className="btn btn-go btn-big" onClick={() => (last ? start() : setN(n + 1))} whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.04 }} autoFocus>
                {last ? <><Rocket /> Start the mission</> : <>Next <ArrowRight /></>}
              </motion.button>
            </div>
          </motion.section>
        </AnimatePresence>
        <div className="brief-marv" aria-hidden="true"><Marv mood={n === 2 ? 'alert' : 'happy'} size={96} /></div>
      </div>
    </div>
  );
}
