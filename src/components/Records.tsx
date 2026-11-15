import { Trophy } from 'lucide-react';
import { loadRecords } from '../lib/records';
import { useGame } from '../store/game';
import { Modal } from './Panels';

/** The leaderboard: longest missions on this device. */
export function RecordsPanel() {
  const open = useGame((s) => s.open);
  const rows = loadRecords();
  return (
    <Modal title="Longest missions" onClose={() => open(null)}>
      <p className="lede">Your best runs on this device. How many sols can you survive?</p>
      {rows.length === 0 ? <p className="aside">No missions yet. Land one and you will be on the board!</p> : (
        <ol className="records">
          {rows.map((r, i) => (
            <li key={i} className={i === 0 ? 'top' : ''}>
              <span className="rec-rank">{i === 0 ? <Trophy /> : i + 1}</span>
              <span className="rec-main"><b>{r.sols} sols</b> {r.won ? 'Mission complete' : 'survived'}</span>
              <span className="rec-meta">Commander {r.commander} · {r.difficulty} · {r.crew} crew · {r.modules} modules · {r.finds} finds · {r.date}</span>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
