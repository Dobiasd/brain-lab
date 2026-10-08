import { receptors } from '../data/chemistry';
import { drugs } from '../data/drugs';
import { contributions, readoutById, readoutDefs } from '../sim/readouts';
import { occupancy } from '../sim/engine';
import { actionText } from '../data/graph';
import { clearerById, poolById, receptorById } from '../data/chemistry';

type Get = (k: string) => number;

export function Tiles({ get, getBase, selected, onSelect, compareLabel }: {
  get: Get; getBase: Get | null; selected: string; onSelect: (id: string) => void; compareLabel: string;
}) {
  return (
    <div className="tiles">
      {readoutDefs.map((r) => {
        const v = get(`read:${r.id}`);
        const b = getBase?.(`read:${r.id}`);
        const d = b == null ? null : v - b;
        return (
          <button key={r.id} className={`tile${selected === r.id ? ' on' : ''}`} onClick={() => onSelect(r.id)} title={r.summary}>
            <span className="name">{r.name}</span>
            <span className="val">{v.toFixed(0)}</span>
            <div className="meter"><div style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></div>
            {d != null && <span className="delta">{Math.abs(d) < 0.5 ? '±0' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(0)}`} vs {compareLabel}</span>}
          </button>
        );
      })}
    </div>
  );
}

const targetName = (id: string) => receptorById[id]?.name ?? clearerById[id]?.name ?? poolById[id]?.name ?? id;

export function Explain({ readoutId, get, getBase, profileId }: { readoutId: string; get: Get; getBase?: Get | null; profileId: string }) {
  const def = readoutById[readoutId];
  const contrib = contributions(readoutId, (k) => (k === 'const' ? 1 : get(k)))
    .filter((c) => c.label !== 'offset')
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 7);
  const maxAbs = Math.max(0.3, ...contrib.map((c) => Math.abs(c.value)));

  const activeDrugs = drugs.filter((d) => get(`drug:${d.id}`) > 0.03);
  void profileId;
  const adaptations = receptors
    .filter((r) => getBase || r.adaptTau >= 1440)
    .map((r) => ({ r, d: get(`dens:${r.id}`) / (getBase ? getBase(`dens:${r.id}`) : 1) }))
    .filter((x) => Math.abs(x.d - 1) > 0.1)
    .sort((a, b) => Math.abs(b.d - 1) - Math.abs(a.d - 1))
    .slice(0, 6);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="col" style={{ gap: 6 }}>
        <h2>Why is “{def.name}” at {get(`read:${readoutId}`).toFixed(0)}?</h2>
        <p className="small" style={{ color: 'var(--text-secondary)' }}>{def.summary}</p>
      </div>
      <div className="contrib" role="table" aria-label="What is pushing this up or down">
        {contrib.map((c) => {
          const w = (Math.abs(c.value) / maxAbs) * 50;
          return (
            <div key={c.label} style={{ display: 'contents' }} role="row">
              <span role="cell">{c.label}</span>
              <div className="bar" role="cell">
                <div style={{ left: c.value >= 0 ? '50%' : `${50 - w}%`, width: `${w}%`, background: c.value >= 0 ? 'var(--up)' : 'var(--down)' }} />
              </div>
              <span className="num" role="cell">{c.value >= 0 ? '+' : '−'}{Math.abs(c.value).toFixed(2)}</span>
            </div>
          );
        })}
      </div>
      <p className="muted">Red pushes up, blue pushes down, measured against a typical awake brain.</p>

      <div className="col" style={{ gap: 6 }}>
        <h3>Drugs active now</h3>
        {activeDrugs.length === 0 && <p className="muted">None.</p>}
        {activeDrugs.map((d) => {
          const c = get(`drug:${d.id}`);
          return (
            <div key={d.id} className="small">
              <b>{d.name}</b> <span className="muted">({c.toFixed(2)}× peak of one dose)</span>
              <ul className="story" style={{ marginTop: 2 }}>
                {d.targets.map((t) => (
                  <li key={t.target}>{actionText[t.action]} {targetName(t.target)}: <b>{Math.round(100 * occupancy(c, t.ec50, d.hill))}%</b></li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="col" style={{ gap: 6 }}>
        <h3>Adaptations (receptor density)</h3>
        {adaptations.length === 0 && <p className="muted">Nothing has adapted noticeably yet.</p>}
        {adaptations.map(({ r, d }) => (
          <div key={r.id} className="small">
            <b>{r.name}</b>: {d > 1 ? '+' : '−'}{Math.abs((d - 1) * 100).toFixed(0)}% <span className="muted">{d > 1 ? 'upregulated (under-stimulated lately)' : 'downregulated (over-stimulated lately)'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
