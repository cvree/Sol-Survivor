import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { HYDRO_MAKES, OXYGEN_MAKES, SCIENCE_PER_SOL, SOLAR_OUTPUT } from '../engine/constants';
import { staffing, sunlight, workersIn } from '../engine/engine';
import type { GameState } from '../engine/types';
import { sfx } from '../lib/sound';
import { useGame } from '../store/game';

/**
 * Number pops. Every working module shows what it is making, and the number flies
 * to the bar it fills, so each second shows a choice paying off.
 * A module with nobody inside gives a smaller grey pop.
 */
interface Pop { id: number; text: string; tone: 'air' | 'food' | 'science' | 'power' | 'shield' | 'dull'; from: [number, number]; to: [number, number] | null; bar: string | null }
interface Maker { mod: string; text: string; tone: Pop['tone']; bar: string | null }

const EVERY_MS = 2300;

function makers(game: GameState): Maker[] {
  const out: Maker[] = [];
  const light = sunlight(game);
  for (const m of game.modules) {
    if (m.buildLeft > 0) continue;
    if (m.kind === 'solar' && light > 0.25) out.push({ mod: m.id, text: `+${Math.max(1, Math.floor(SOLAR_OUTPUT * light))} power`, tone: 'power', bar: 'power' });
    if (!m.on) continue;
    const work = staffing(game, m);
    const dull = work < 1;
    if (m.kind === 'oxygen') out.push({ mod: m.id, text: `+${Math.round(OXYGEN_MAKES * work)} air`, tone: dull ? 'dull' : 'air', bar: 'life' });
    if (m.kind === 'hydro') out.push({ mod: m.id, text: `+${Math.round(HYDRO_MAKES * work)} food`, tone: dull ? 'dull' : 'food', bar: 'life' });
    if (m.kind === 'lab' && workersIn(game, m.id).length) out.push({ mod: m.id, text: `+${Math.round(SCIENCE_PER_SOL * work)} science`, tone: 'science', bar: 'cargo' });
    if (m.kind === 'dome' && game.shield < 99) out.push({ mod: m.id, text: '+shield', tone: 'shield', bar: 'shield' });
    if (m.kind === 'medbay' && workersIn(game, m.id).some((c) => c.health < 95)) out.push({ mod: m.id, text: '+health', tone: 'food', bar: null });
  }
  return out;
}

const centre = (el: Element, top = false): [number, number] => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, top ? r.top + r.height * 0.18 : r.top + r.height / 2];
};

export function Pops() {
  const [pops, setPops] = useState<Pop[]>([]);
  const last = useRef(new Map<string, number>());
  const next = useRef(1);

  useEffect(() => {
    const timer = setInterval(() => {
      const { game, paused, panel, tour, moment, speed } = useGame.getState();
      if (!game || game.status !== 'playing' || paused || panel || tour !== null || moment || document.hidden) return;
      const now = performance.now();
      const due = makers(game).filter((k) => now - (last.current.get(k.mod) ?? 0) > EVERY_MS / speed);
      // One at a time, oldest first, so pops arrive as a steady patter instead of a burst.
      const k = due.sort((a, b) => (last.current.get(a.mod) ?? 0) - (last.current.get(b.mod) ?? 0))[0];
      if (!k) return;
      last.current.set(k.mod, now + Math.random() * 300);
      const src = document.querySelector(`[data-mod="${k.mod}"]`);
      const dst = k.bar ? document.querySelector(`[data-bar="${k.bar}"]`) : null;
      if (!src) return;
      setPops((p) => [...p.slice(-14), { id: next.current++, text: k.text, tone: k.tone, from: centre(src, true), to: dst ? centre(dst) : null, bar: k.bar }]);
    }, 260);
    return () => clearInterval(timer);
  }, []);

  const land = (pop: Pop) => {
    setPops((p) => p.filter((x) => x.id !== pop.id));
    if (!pop.bar) return;
    sfx.pop(pop.tone === 'dull' ? 'dull' : 'good');
    document.querySelector(`[data-bar="${pop.bar}"]`)?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
  };

  return (
    <div className="pops" aria-hidden="true">
      {pops.map((p) => {
        const [x, y] = p.from;
        const [tx, ty] = p.to ?? [x, y - 90];
        return (
          <motion.span key={p.id} className={`pop pop-${p.tone}`}
            initial={{ x, y, scale: 0.2, opacity: 0 }}
            animate={{ x: [x, x, tx], y: [y, y - 44, ty], scale: [0.2, 1.12, p.to ? 0.5 : 0.9], opacity: [0, 1, p.to ? 0.9 : 0] }}
            transition={{ duration: p.tone === 'dull' ? 1.5 : 1.25, times: [0, 0.34, 1], ease: ['backOut', 'easeIn'] }}
            onAnimationComplete={() => land(p)}>
            {p.text}
          </motion.span>
        );
      })}
    </div>
  );
}
