import { motion } from 'motion/react';
import { Lock, Package, Satellite, Wrench } from 'lucide-react';
import { FINDS } from '../data/discoveries';
import { useGame } from '../store/game';
import { FindArt } from './Finds';
import { Modal } from './Panels';

export const REWARD_TEXT = { science: { Icon: Satellite, text: 'Data for Earth: next lander comes sooner' }, part: { Icon: Wrench, text: 'A spare part' }, supplies: { Icon: Package, text: 'Extra supplies' } };

/** The album of real Mars discoveries. It keeps between missions, so there is always one more to find. */
export function AlbumPanel() {
  const { open, album } = useGame();
  return (
    <Modal title={`Discoveries: ${album.length} of ${FINDS.length}`} onClose={() => open(null)} wide>
      <p className="lede">Real things the Curiosity rover has seen in Gale Crater. Drag the ground during a mission to find more.</p>
      <div className="album">
        {FINDS.map((f, i) => {
          const got = album.includes(f.id);
          return (
            <motion.div key={f.id} className={`album-card ${got ? 'got' : 'missing'}`} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <div className="album-art">{got ? <FindArt id={f.id} /> : <Lock />}</div>
              <strong>{got ? f.title : 'Not found yet'}</strong>
              <p>{got ? f.fact : f.where}</p>
            </motion.div>
          );
        })}
      </div>
      <p className="aside">Facts typed in by hand from NASA mission pages. Where they sit next to your base is made up for the game.</p>
    </Modal>
  );
}
