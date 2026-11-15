import { MODULE_NAME } from '../engine/engine';
import { useDrag } from '../lib/crewDrag';
import { useGame } from '../store/game';
import { Astronaut } from './art';
import { lookOf } from './crewLook';

/** The astronaut you are carrying, following the pointer, with where they would go. */
export function CrewGhost() {
  const { id, x, y, over, ok } = useDrag();
  const game = useGame((s) => s.game);
  const c = game?.crew.find((m) => m.id === id);
  if (!c || !game) return null;
  const mod = game.modules.find((m) => m.id === over);
  const label = !mod ? `Drop ${c.name} on a module` : !ok ? `No room for ${c.name} there`
    : mod.kind === 'pod' ? `${c.name} will rest in the capsule`
    : mod.buildLeft > 0 ? `${c.name} will build the ${MODULE_NAME[mod.kind]}`
    : mod.kind === 'hab' ? `${c.name} will sleep in the Hab` : `${c.name} will work in the ${MODULE_NAME[mod.kind]}`;
  return (
    <div className={`ghost ${mod ? (ok ? 'ok' : 'no') : ''}`} style={{ left: x, top: y }} aria-hidden="true">
      <Astronaut who={c} look={lookOf(c)} size={44} act="wave" />
      <span className="ghost-label">{label}</span>
    </div>
  );
}
