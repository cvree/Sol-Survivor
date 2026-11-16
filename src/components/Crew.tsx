import { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CloudLightning, Droplet, Heart, MessageCircle, Package, Star } from 'lucide-react';
import type { CrewState, GameState } from '../engine/types';
import { startCrewDrag, tapCrew, useDrag, wasDragged } from '../lib/crewDrag';
import { bind, bindTrail, startMovement, stopMovement } from '../lib/movement';
import { useFollow } from '../lib/camera';
import { useGame } from '../store/game';
import { Astronaut, Rover, type Act } from './art';
import { restingAct } from './crewAct';
import { lookOf } from './crewLook';
import { stepOf } from './coach';
import { tripWords } from './World';

/**
 * Every astronaut, drawn once, for the whole mission: in a room, walking, climbing, out in the
 * crater, or carried by hand. Where each one stands is owned by `lib/movement.ts`, which moves
 * this one element every frame. Only the pose changes, never which element draws them.
 */
export function CrewLayer({ game }: { game: GameState }) {
  useEffect(() => { startMovement(); return () => stopMovement(); }, []);
  const party = useGame((s) => s.party);
  const partying = Date.now() - party < 3200;
  return (
    <div className="crew-layer">
      {game.crew.filter((c) => !c.out).map((c) => <CrewBody key={c.id} c={c} game={game} partying={partying} />)}
      {game.rover && <RoverBody game={game} />}
    </div>
  );
}

/** What they are doing, as a pose. Walking and climbing are added on top by the movement. */
function poseOf(c: CrewState, game: GameState, partying: boolean, carried: boolean, selected: boolean): Act {
  if (carried) return 'jump';
  if (c.exhausted) return c.at === 'hab' && !c.trip ? 'sleep' : 'collapse';
  if (selected) return 'wave';
  const t = c.trip;
  if (t) {
    if (t.phase === 'work' && c.arriving <= 0) return t.job.kind === 'mine' ? 'wrench' : t.job.kind === 'go' ? 'wave' : 'check';
    return 'idle';
  }
  if (c.arriving > 0) return 'idle';
  return restingAct(c, game, partying);
}

function CrewBody({ c, game, partying }: { c: CrewState; game: GameState; partying: boolean }) {
  const picked = useGame((s) => s.picked);
  const coach = useGame((s) => (stepOf(s.coach)?.target === 'crew' ? s.coach?.subject : null));
  const carried = useDrag((d) => d.id === c.id);
  const selected = useDrag((d) => d.sel === c.id);
  const line = useDrag((d) => (d.sel === c.id ? d.line : ''));
  const bubble = useGame((s) => s.bubble);
  const followed = useFollow((f) => f.id === c.id);
  const ref = useCallback((el: HTMLDivElement | null) => bind(c.id, el), [c.id]);
  const trail = useCallback((el: HTMLElement | null) => bindTrail(c.id, el), [c.id]);
  const look = lookOf(c);
  const chat = bubble && bubble.crewId === c.id && bubble.until > Date.now() ? bubble.text : null;
  const say = carried ? null : selected ? { text: line || 'Where to?', mood: 'chat' } : c.say ?? (chat ? { text: chat, mood: 'chat' } : null);
  const act = poseOf(c, game, partying, carried, selected);
  const out = !!c.trip && c.arriving <= 0;
  const t = c.trip;
  const label = `${c.name}, ${c.role}${c.commander ? ', your commander' : ''}. ${out && t ? `Out in the crater: ${tripWords(t)}. ` : ''}Energy ${Math.round(c.energy)}%${c.mood < 35 ? ', unhappy' : ''}${c.exhausted ? ', collapsed asleep' : ''}. ${selected ? 'Picked: now tap a glowing place, or tap again for their card.' : 'Tap to pick, then tap a place. Or drag them there.'}`;
  return (
    <>
      <div ref={ref} className={`body ${out ? 'walker' : ''} ${t ? t.phase : ''} ${followed ? 'followed' : ''}`} data-crew={c.id}>
        <button
          data-crew={c.id}
          className={`sprite no-drag ${picked === c.id ? 'picked' : ''} ${selected ? 'selected' : ''} ${coach === c.id ? 'coach-target' : ''} ${carried ? 'carried' : ''} ${c.energy < 30 && !c.exhausted ? 'tired' : ''}`}
          onPointerDown={(e) => startCrewDrag(e, c.id)}
          onClick={(e) => { e.stopPropagation(); if (!wasDragged()) tapCrew(c.id); }}
          aria-pressed={selected}
          aria-label={label}
        >
          <span className="land-dust" aria-hidden="true" />
          {c.commander && <span className="sprite-star" aria-hidden="true"><Star /></span>}
          <AnimatePresence>
            {say && (
              <motion.span key={say.text} className={`say ${say.mood}`} initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }} role="status">{say.text}</motion.span>
            )}
          </AnimatePresence>
          <span className="swing">
            <span className="shake">
              <span className="face">
                <span className={`gait ${selected ? 'hop' : ''}`}><Astronaut who={c} look={look} size={44} act={act} /></span>
              </span>
            </span>
          </span>
          <span className="step-dust" aria-hidden="true" />
          <span className={`sprite-dot t-${look.triage}`} />
          {c.mood < 35 && !c.emote && <span className="grump" aria-hidden="true"><CloudLightning /></span>}
          <AnimatePresence>
            {c.emote && (
              <motion.span key={c.emote.until} className={`emote e-${c.emote.kind}`} initial={{ scale: 0, y: 10 }} animate={{ scale: [0, 1.4, 1], y: -6 }} exit={{ scale: 0, opacity: 0 }} aria-hidden="true">
                {c.emote.kind === 'heart' ? <Heart /> : c.emote.kind === 'star' ? <Star /> : c.emote.kind === 'note' ? <MessageCircle /> : <Droplet />}
              </motion.span>
            )}
          </AnimatePresence>
          <span className={`energy ${c.energy < 30 ? 'low' : c.energy < 55 ? 'mid' : ''}`} aria-hidden="true"><i style={{ width: `${Math.max(4, c.energy)}%` }} /></span>
          {t && t.carry > 0 && <span className="carry"><Package /> {t.carry}</span>}
          {out && <span className="walker-name">{c.name}</span>}
        </button>
      </div>
      {t && <i ref={trail} className={`trip-path ${t.phase}`} aria-hidden="true" />}
    </>
  );
}

/** The rover: parked by its garage, or driving out in the crater. Moved by the same movement code. */
function RoverBody({ game }: { game: GameState }) {
  const ref = useCallback((el: HTMLDivElement | null) => bind('rover', el), []);
  const trail = useCallback((el: HTMLElement | null) => bindTrail('rover', el), []);
  const t = game.rover?.trip ?? null;
  return (
    <>
      <div ref={ref} className={`body rover-body ${t ? t.phase : 'parked'}`} aria-label={t ? 'The rover is out in the crater.' : 'The rover is parked by its garage.'}>
        <span className="rover-art"><span className="face"><Rover size={70} /></span></span>
        {t && t.carry > 0 && <span className="carry"><Package /> {t.carry}</span>}
      </div>
      {t && <i ref={trail} className={`trip-path ${t.phase}`} aria-hidden="true" />}
    </>
  );
}
