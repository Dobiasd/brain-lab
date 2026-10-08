import { narrate } from '../sim/narrate';
import { liveWarnings } from '../sim/safety';
import { feelingById, feelings } from './plain';

type Get = (k: string) => number;

export function FeelingTiles({ ids, get, getBase, baseLabel, selected, onSelect }: {
  ids?: string[]; get: Get; getBase: Get | null; baseLabel: string; selected?: string; onSelect?: (id: string) => void;
}) {
  const list = ids ? ids.map((id) => feelingById[id]) : feelings;
  return (
    <div className="tiles">
      {list.map((f) => {
        const v = get(`read:${f.id}`);
        const b = getBase?.(`read:${f.id}`);
        const d = b == null ? null : v - b;
        return (
          <button key={f.id} className={`tile${selected === f.id ? ' on' : ''}`} onClick={() => onSelect?.(f.id)}
            style={{ cursor: onSelect ? 'pointer' : 'default' }} title={onSelect ? `See how "${f.name}" came about` : undefined}>
            <span className="name"><span aria-hidden>{f.icon}</span> {f.name}</span>
            <span className="val">{v.toFixed(0)}<span className="muted" style={{ fontSize: 12, fontWeight: 400 }}> / 100</span></span>
            <div className="meter"><div style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></div>
            {d != null && (
              <span className="delta">
                {Math.abs(d) < 3 ? `≈ same as ${baseLabel}` : `${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)} vs ${baseLabel}`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Narration({ get, getBase, getPrev, profileId, baseLabel, focusIds, onExplain, history, live = true }: {
  get: Get; getBase: Get | null; getPrev: Get | null; profileId: string; baseLabel: string; focusIds?: string[];
  history?: { now: number; doses: { drug: string; at: number }[] };
  /** false while time is playing, so screen readers are not flooded */
  live?: boolean;
  /** Called with the main feeling of the sentence, to open its chain. */
  onExplain?: (feelingId: string) => void;
}) {
  const n = narrate(get, getBase, getPrev, profileId, baseLabel, focusIds, history);
  const alarm = liveWarnings(get)[0];
  return (
    <div className={`narration${alarm ? ' alarm' : ''}`} aria-live={live ? 'polite' : 'off'} aria-atomic="true">
      <span className="narr-icon" aria-hidden>💬</span>
      <div className="col" style={{ gap: 4 }}>
        {alarm && <p className="narr-alarm" role="alert"><b>{alarm.title}.</b> {alarm.text}</p>}
        <p className="narr-head">{n.headline}</p>
        {onExplain && <button className="linkbtn small" style={{ alignSelf: 'flex-start', visibility: n.feeling ? 'visible' : 'hidden' }}
          onClick={() => n.feeling && onExplain(n.feeling)} tabIndex={n.feeling ? 0 : -1}>🔗 See how this happened →</button>}
        {n.details.slice(0, 2).map((d, i) => <p key={i} className="small" style={{ color: 'var(--text-secondary)' }}>{d}</p>)}
      </div>
    </div>
  );
}
