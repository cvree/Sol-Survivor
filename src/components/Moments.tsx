import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, HeartCrack, Rocket, ShieldHalf, Sparkles, Star } from 'lucide-react';
import { findById, FINDS } from '../data/discoveries';
import { CAUSE_LINE, causeOf } from '../engine/engine';
import type { Cause } from '../engine/types';
import { REWARD_TEXT } from './Album';
import { FindArt } from './Finds';
import { Astronaut } from './art';
import { lookOf } from './crewLook';
import { recordById } from '../data/records';
import { sfx } from '../lib/sound';
import { HOLD_SURVIVED, useGame } from '../store/game';
import { Marv } from './art';

const KIND = { cme: 'Solar storm', flare: 'Solar flare' };
/** What could have saved them, said kindly, so the loss teaches something. */
const SAVE: Record<Cause, string> = {
  air: 'Next time: keep the Oxygen Maker on, with someone working inside.',
  cold: 'Next time: keep the Hab switched on. It only needs 1 power.',
  radiation: 'Next time: switch on the Shield Dome before the storm fuse runs out, and send the sick to the Med Bay.',
};

/** What to try next time, in growing-up words: the player is always one step from better. */
function nextStep(blocked: number, stars: number): string {
  if (stars === 3) return 'Textbook shielding. Mission Control is taking notes.';
  if (stars === 2) return 'So close to perfect. Switch the dome on a little sooner next time.';
  if (stars === 1) return 'You blocked some of it. A full shield needs the dome on before the storm lands.';
  return blocked > 5 ? 'The shield was only just starting. Next time, dome on as soon as the warning shows.' : 'Nothing blocked that one. A Shield Dome is the fix. You will get it next time.';
}

/**
 * Held moments. Quick actions stay quick, but the big events hold the whole
 * screen for a couple of seconds so they can be felt.
 */
export function Moments() {
  const moment = useGame((s) => s.moment);
  const end = useGame((s) => s.endMoment);
  const survived = moment?.type === 'survived' ? moment : null;

  useEffect(() => {
    if (!survived) return;
    const timers = Array.from({ length: survived.stars }, (_, i) => setTimeout(() => sfx.star(i), 520 + i * 300));
    return () => timers.forEach(clearTimeout);
  }, [survived]);

  const game = useGame((s) => s.game);
  const album = useGame((s) => s.album.length);
  const find = moment?.type === 'find' ? moment : null;
  const def = find ? findById(find.id) : null;
  const died = moment?.type === 'died' ? moment : null;
  const who = died ? game?.crew.find((c) => c.id === died.crewId) : null;
  const rec = survived ? recordById(survived.recordId) : null;
  const practice = survived?.recordId.startsWith('no-snapshot');

  return (
    <AnimatePresence>
      {survived && (
        <motion.button key={survived.at} className={`held ${survived.stars ? 'won' : 'meh'}`} onClick={end}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} aria-label="Storm report. Press to continue.">
          <span className="held-rays" aria-hidden="true" />
          <motion.span className="held-card" initial={{ scale: 0.3, rotate: -8, y: 60 }} animate={{ scale: 1, rotate: 0, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
            <span className="held-kicker"><ShieldHalf /> {KIND[survived.kind]} report</span>
            <strong className="held-title">{survived.stars ? 'Storm survived!' : 'Storm is over'}</strong>
            <span className="held-stars" aria-label={`${survived.stars} of 3 stars`}>
              {[0, 1, 2].map((i) => (
                <motion.span key={i} initial={{ scale: 0, rotate: -120, y: 30 }} animate={{ scale: 1, rotate: 0, y: i === 1 ? -10 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 11, delay: 0.5 + i * 0.3 }}>
                  <Star className={i < survived.stars ? 'lit' : ''} />
                </motion.span>
              ))}
            </span>
            <span className="held-stat">Your shield blocked <b>{survived.blocked}%</b></span>
            <span className="held-next">{nextStep(survived.blocked, survived.stars)}</span>
            <span className="held-real">{practice || !rec ? 'Practice storm' : `This storm was real: ${rec.title}, ${rec.date}`}</span>
            <span className="held-marv" aria-hidden="true"><Marv mood={survived.stars ? 'party' : 'happy'} size={70} /></span>
            <i className="held-timer" style={{ animationDuration: `${HOLD_SURVIVED}ms` }} aria-hidden="true" />
          </motion.span>
        </motion.button>
      )}
      {find && def && (
        <motion.button key={`find-${find.at}`} className="held find-held" onClick={end} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} aria-label="Discovery. Press to continue.">
          <span className="held-rays" aria-hidden="true" />
          <motion.span className="held-card find-card" initial={{ scale: 0.3, rotate: 10, y: 80 }} animate={{ scale: 1, rotate: 0, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
            <span className="held-kicker"><Sparkles /> Discovery!</span>
            {find.isNew && <motion.span className="find-new" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: -8 }} transition={{ delay: 0.45, type: 'spring', stiffness: 400, damping: 10 }}>New for your album! {album} of {FINDS.length}</motion.span>}
            <span className="find-card-art"><FindArt id={def.id} /></span>
            <strong className="held-title find-title">{def.title}</strong>
            <span className="held-next">{def.fact}</span>
            <span className="find-reward">{(() => { const R = REWARD_TEXT[def.reward]; return <><R.Icon /> {R.text}</>; })()}</span>
            <span className="held-real"><BookOpen /> Real Mars science, typed in by hand from NASA pages</span>
            <span className="find-ok">Awesome!</span>
          </motion.span>
        </motion.button>
      )}
      {died && who && (
        <motion.button key={`died-${died.at}`} className="held died-held" onClick={end} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} aria-label="A crewmate was lost. Press to continue.">
          <motion.span className="held-card died-card" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.2 }}>
            <span className="held-kicker"><HeartCrack /> Crew lost</span>
            <span className="died-portrait"><Astronaut who={who} look={lookOf(who)} bust size={84} /></span>
            <strong className="held-title died-title">{who.name} did not survive</strong>
            <span className="held-next">{CAUSE_LINE[causeOf(who)]} {SAVE[causeOf(who)]}</span>
            <span className="died-note">The crew will remember {who.name}. Everyone works a little slower while they are sad. The mission goes on, Commander.</span>
            <span className="find-ok">Keep going</span>
          </motion.span>
        </motion.button>
      )}
      {moment?.type === 'lander' && (
        <motion.div key={`lander-${moment.number}`} className="held-banner" role="status"
          initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
          <Rocket /> Cargo lander {moment.number} is coming in to land!
        </motion.div>
      )}
    </AnimatePresence>
  );
}
