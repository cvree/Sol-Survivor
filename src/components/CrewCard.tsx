import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BatteryMedium, ChevronDown, Hand, Heart, HeartPulse, Megaphone, MessageCircle, Radiation, Smile, Star, Thermometer, Wind, X } from 'lucide-react';
import { CHAT } from '../data/characters';
import { CAREER_LIMIT, CHEER_COOLDOWN, WORK_SLOTS } from '../engine/constants';
import { LIKE_TEXT, MODULE_NAME, SPECIALIST, TRAITS, enjoying, habReady, workRate, workersIn } from '../engine/engine';
import type { CrewState, GameState } from '../engine/types';
import { TRIAGE_LABEL, maxHealth, triage } from '../engine/vitals';
import { useGame } from '../store/game';
import { Astronaut } from './art';
import { feeling, lookOf } from './crewLook';
import { Term } from './Term';

const moodWord = (m: number) => (m >= 70 ? 'Happy' : m >= 40 ? 'OK' : m >= 15 ? 'Grumpy' : 'Upset');
const energyWord = (c: CrewState) => (c.exhausted ? 'Collapsed' : c.energy >= 70 ? 'Rested' : c.energy >= 50 ? 'OK' : c.energy >= 30 ? 'Tired' : 'Worn out');

function Bar({ icon, label, value, word, tone }: { icon: React.ReactNode; label: string; value: number; word: string; tone: string }) {
  return (
    <div className={`cc-bar ${tone}`}>
      {icon}<span className="cc-bar-label">{label}</span>
      <span className="cc-bar-track"><motion.i animate={{ width: `${Math.max(3, value)}%` }} /></span>
      <b>{word}</b>
    </div>
  );
}

/** An astronaut's card: who they are, how they feel, a chat, and where to send them. */
export function CrewCard({ c, game }: { c: CrewState; game: GameState }) {
  const { pick, assign, cheerUp, said } = useGame();
  const [medical, setMedical] = useState(false);
  const t = triage(c);
  const cap = maxHealth(c.dose, CAREER_LIMIT);
  const trait = TRAITS[c.trait];
  const happyNow = enjoying(game, c);
  const ready = game.time - c.cheeredAt >= CHEER_COOLDOWN;
  const line = said && said.crewId === c.id && Date.now() - said.at < 6000 ? said.text : null;
  const greeting = CHAT[c.id]?.[Math.floor(game.time) % 4] ?? 'Reporting for duty, Commander!';
  const places = [
    { id: 'hab', label: habReady(game) ? 'Hab (sleep)' : 'Capsule (rest)', best: false, full: false },
    ...game.modules.filter((m) => m.buildLeft > 0).map((m) => ({ id: m.id, label: `Build: ${MODULE_NAME[m.kind]}`, best: false, full: c.at !== m.id && workersIn(game, m.id).length >= 2 })),
    ...game.modules.filter((m) => m.buildLeft <= 0 && WORK_SLOTS[m.kind]).map((m) => ({ id: m.id, label: MODULE_NAME[m.kind], best: SPECIALIST[m.kind] === c.role, full: c.at !== m.id && workersIn(game, m.id).length >= (WORK_SLOTS[m.kind] ?? 0) })),
  ];
  const status = c.trip ? (c.trip.phase === 'back' ? 'Walking home' : c.trip.phase === 'work' ? (c.trip.job.kind === 'mine' ? 'Digging bricks' : 'Investigating') : 'Walking out')
    : c.exhausted ? 'Collapsed, asleep' : c.at === 'hab' ? 'Resting' : `Working: ${MODULE_NAME[game.modules.find((m) => m.id === c.at)?.kind ?? 'hab']}`;
  return (
    <motion.section className={`crew-card t-${t}`} style={{ '--suit': c.suit } as React.CSSProperties}
      initial={{ y: 40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }} aria-label={`${c.name}'s card`}>
      <button className="cc-close" onClick={() => pick(null)} aria-label="Close"><X /></button>
      <div className="cc-top">
        <motion.div className="cc-portrait" key={c.emote?.until ?? 0} animate={c.emote ? { y: [0, -14, 0], rotate: [0, -6, 6, 0] } : {}} transition={{ duration: 0.5 }}>
          <Astronaut who={c} look={lookOf(c)} size={84} act={c.emote?.kind === 'star' ? 'jump' : 'wave'} />
        </motion.div>
        <div className="cc-who">
          <h3>{c.name}</h3>
          <p className="cc-role">{c.commander && <span className="cc-cmd"><Star /> Commander</span>}{c.role}</p>
          <p className="cc-status">{status}</p>
          <span className="trait-chip">{trait.name}: {trait.text}</span>
          <span className={`cc-likes ${happyNow ? 'now' : ''}`}><Heart /> Loves {LIKE_TEXT[c.likes]}{happyNow ? ' (doing it now!)' : ''}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={line ?? 'greet'} className="cc-say" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
          "{line ?? greeting}"
        </motion.p>
      </AnimatePresence>

      <div className="cc-actions">
        <motion.button className="cc-act chat" whileTap={{ scale: 0.9 }} disabled={!ready || !!c.trip} onClick={() => cheerUp(c.id, 'chat')}><MessageCircle /> Chat</motion.button>
        <motion.button className="cc-act five" whileTap={{ scale: 0.9 }} disabled={!ready || !!c.trip} onClick={() => cheerUp(c.id, 'highfive')}><Hand /> High five</motion.button>
        <motion.button className="cc-act pep" whileTap={{ scale: 0.9 }} disabled={!ready || !!c.trip} onClick={() => cheerUp(c.id, 'peptalk')}><Megaphone /> Pep talk</motion.button>
      </div>
      {!ready && !c.trip && <p className="cc-wait">{c.name} is cheered up. You can visit again in a little while.</p>}

      <div className="cc-bars">
        <Bar icon={<HeartPulse />} label="Health" value={c.health} word={`${TRIAGE_LABEL[t]}`} tone={t === 'red' ? 'bad' : t === 'yellow' ? 'warn' : 'good'} />
        <Bar icon={<BatteryMedium />} label="Energy" value={c.energy} word={energyWord(c)} tone={c.exhausted || c.energy < 30 ? 'bad' : c.energy < 50 ? 'warn' : 'good'} />
        <Bar icon={<Smile />} label="Mood" value={c.mood} word={moodWord(c.mood)} tone={c.mood < 15 ? 'bad' : c.mood < 40 ? 'warn' : 'mood'} />
      </div>
      <p className="cc-tip">{
        c.exhausted ? `${c.name} collapsed from overwork. Drag them home to sleep properly.`
          : c.energy < 50 && c.at !== 'hab' ? `Tired, so working ${Math.round((1 - workRate(c)) * 100)}% slower. Time for some sleep.`
          : c.mood < 40 ? `Unhappy. Try a chat, or let them do what they love: ${LIKE_TEXT[c.likes]}.`
          : feeling(c)
      }</p>

      <button className="cc-medical-toggle" onClick={() => setMedical(!medical)} aria-expanded={medical}><ChevronDown className={medical ? 'open' : ''} /> Health check</button>
      {medical && (
        <div className="tiles">
          <div className={`vt ${c.spo2 < 94 ? (c.spo2 < 86 ? 'bad' : 'warn') : ''}`}><Wind /><span><Term k="spo2">Oxygen</Term></span><b>{Math.round(c.spo2)}%</b></div>
          <div className={`vt ${c.hr > 105 || c.hr < 52 ? 'warn' : ''}`}><Heart /><span><Term k="bpm">Heart</Term></span><b>{Math.round(c.hr)}</b></div>
          <div className={`vt ${c.temp < 95 ? (c.temp < 93 ? 'bad' : 'warn') : ''}`}><Thermometer /><span>Body temp</span><b>{c.temp.toFixed(1)}°F</b></div>
          <div className="vt"><Radiation /><span><Term k="msv">Radiation</Term></span><b>{Math.round(c.dose)}</b></div>
          {cap < 100 && <p className="cc-tip small">Radiation has lowered {c.name}'s top health to {Math.round(cap)} for good.</p>}
        </div>
      )}

      {!c.trip && (
        <div className="assign">
          <span className="assign-label">Send {c.name} to <small>(or drag them)</small></span>
          <div className="assign-list">
            {places.map((pl) => {
              const here = c.at === pl.id;
              return (
                <motion.button key={pl.id} className={`btn assign-btn ${here ? 'here' : ''}`} whileTap={{ scale: 0.94 }} disabled={pl.full || here} onClick={() => assign(c.id, pl.id)}>
                  {pl.best && <Star />}{pl.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </motion.section>
  );
}
