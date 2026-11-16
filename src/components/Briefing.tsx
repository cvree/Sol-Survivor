import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BedDouble, Rocket, ShieldHalf, Sparkles, Sun, Wind, Zap, Home } from 'lucide-react';
import { COMMANDERS } from '../engine/engine';
import { useGame } from '../store/game';
import { isTrained } from './coach';
import { Astronaut, Lander, Marv, Rover } from './art';
import { HAPPY } from './crewLook';

/**
 * The mission briefing: four short cards, one idea each, read out by M.A.R.V.
 * Then the game teaches the rest by doing. A first-time player reads every card;
 * someone who has finished the training before can start straight away.
 */
export function Briefing() {
  const { start, commander } = useGame();
  const [n, setN] = useState(0);
  const [trained] = useState(isTrained);
  const lead = COMMANDERS.find((c) => c.id === commander) ?? COMMANDERS[0];
  const cards = [
    {
      kicker: 'Mission briefing 1 of 4', title: `Welcome to Mars, Commander ${lead.name}!`,
      art: <div className="brief-art"><Lander size={90} /><Astronaut who={lead} look={HAPPY} size={56} act="wave" /></div>,
      lines: ['You are landing in Gale Crater, a real place on Mars, with nothing but a small capsule. Its air will not last.', 'Earth sends cargo landers with building plans and new crew, but you have to earn them: explore, finish missions, survive storms.', 'Keep everyone alive for 30 sols. A sol is one day on Mars.'],
    },
    {
      kicker: 'Mission briefing 2 of 4', title: 'Look after your astronauts',
      art: <div className="brief-art icons"><span className="bi volt"><Zap /></span><span className="bi go"><Wind /></span><span className="bi orange"><Home /></span><span className="bi cyan"><BedDouble /></span></div>,
      lines: ['Nothing builds itself: drag an astronaut onto a building site to build it. Then tap a module to switch it on.', 'Drag astronauts into the Oxygen Maker or Hydroponics to make air and food. The Hab gives heat and proper beds.', 'Work makes astronauts tired. Tired ones work slower, get grumpy, and can collapse. Drag them to the Hab to sleep.'],
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
              {trained && !last && <button className="btn btn-ghost" onClick={() => start()}>I have flown before: start</button>}
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
