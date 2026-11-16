import type { KeyboardEvent } from 'react';
import type { CrewState, GameState } from '../engine/types';
import { placeVerb, sendTo, tapPlace, useDrag, useHolding } from '../lib/crewDrag';
import { useGame } from '../store/game';
import { Astronaut } from './art';
import { lookOf } from './crewLook';

/**
 * A glowing drop zone over a place an astronaut could go, with what they would do there.
 * Only shows while an astronaut is being carried or has been picked with a tap.
 */
export function DropZone({ id, game }: { id: string; game: GameState }) {
  const holding = useHolding();
  const over = useDrag((d) => (d.id ? d.over : null));
  if (!holding) return null;
  const verb = placeVerb(holding, id, game);
  if (!verb) return null;
  const go = () => tapPlace(id);
  return (
    <span role="button" tabIndex={0} className={`drop-zone no-drag ${over === id ? 'hot' : ''}`} data-mod={id}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); go(); }}
      onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go(); } }}
      aria-label={`${verb} here`}>
      <b className="drop-label">{verb}</b>
    </span>
  );
}

/** Light up the places an astronaut can go, and dim the ones they cannot. */
export function useDropClass(id: string, game: GameState): string {
  const holding = useHolding();
  if (!holding) return '';
  return placeVerb(holding, id, game) ? 'drop-can' : 'drop-dim';
}

/** A puff of dust and a ring where an astronaut was just sent. */
export function LandPuff({ id }: { id: string }) {
  const landed = useDrag((d) => (d.landed?.target === id ? d.landed.at : 0));
  const word = useDrag((d) => (d.landed?.target === id && d.cheer ? d.cheer.text : ''));
  if (!landed || Date.now() - landed > 1400) return null;
  return (
    <span key={landed} className="drop-puff" aria-hidden="true">
      <i /><i /><i /><i /><i />
      <s className="puff-star" /><s className="puff-star" /><s className="puff-star" /><s className="puff-star" />
      {word && <b className="puff-word">{word}!</b>}
    </span>
  );
}

/** The best astronaut to send to a building site: rested, free, and not already building. */
export function bestBuilder(game: GameState): CrewState | null {
  const free = game.crew.filter((c) => !c.out && !c.trip && !c.exhausted && c.energy > 25 && !game.modules.some((m) => m.id === c.at && m.buildLeft > 0));
  free.sort((a, b) => (a.at === 'hab' ? 0 : 1) - (b.at === 'hab' ? 0 : 1) || b.energy - a.energy);
  return free[0] ?? null;
}

/** One tap sends the best free astronaut to build this site. */
export function SendBuilder({ siteId, game }: { siteId: string; game: GameState }) {
  const who = bestBuilder(game);
  const holding = useHolding();
  if (!who || holding) return null;
  return (
    <button className="send-btn no-drag" onClick={(e) => { e.stopPropagation(); sendTo(who.id, siteId); }}
      aria-label={`Send ${who.name} to build it`}>
      <span className="send-face"><Astronaut who={who} look={lookOf(who)} bust size={26} /></span>
      Send {who.name}
    </button>
  );
}

/** Is this astronaut on their way somewhere inside the base right now (including out to the airlock)? */
export const walking = (c: CrewState) => !c.out && c.arriving > 0;

/** Is an astronaut picked with a tap? Show who, and what to do next. */
export function useSelected(game: GameState) {
  const sel = useDrag((d) => d.sel);
  return game.crew.find((c) => c.id === sel && !c.out) ?? null;
}

/** Keyboard: Escape puts a picked astronaut back down. */
export function cancelOnEscape(e: globalThis.KeyboardEvent) {
  if (e.key !== 'Escape') return;
  if (useDrag.getState().sel) { useDrag.setState({ sel: null }); useGame.getState().pick(null); }
  else if (useGame.getState().placing) useGame.getState().setPlacing(null);
}
