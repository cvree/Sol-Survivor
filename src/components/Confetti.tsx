import { motion } from 'motion/react';

const COLORS = ['#5ee6a0', '#4fd8ff', '#ffd23f', '#ff8fb1', '#f7f4ec'];

/** A burst of paper when the crew makes it through a storm. The relief should feel earned. */
export function Confetti({ burst }: { burst: number }) {
  if (!burst || Date.now() - burst > 4000) return null;
  return (
    <div className="confetti" aria-hidden="true" key={burst}>
      {Array.from({ length: 44 }, (_, i) => {
        const angle = (i / 44) * Math.PI * 2;
        const far = 180 + ((i * 53) % 220);
        return (
          <motion.i
            key={i}
            style={{ background: COLORS[i % COLORS.length], borderRadius: i % 3 === 0 ? '50%' : 3 }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: Math.cos(angle) * far, y: Math.sin(angle) * far * 0.7 + 260, opacity: 0, rotate: 300 + i * 20, scale: 0.6 }}
            transition={{ duration: 1.6 + (i % 5) * 0.15, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
