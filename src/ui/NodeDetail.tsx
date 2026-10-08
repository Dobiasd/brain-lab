import { regionById } from '../data/anatomy';
import { chemicalById, clearerById, receptorById } from '../data/chemistry';
import { drugById } from '../data/drugs';
import { buildGraph, type NodeType } from '../data/graph';

const graph = buildGraph();
const nameOf = Object.fromEntries(graph.nodes.map((n) => [n.id, n.name]));

export function NodeDetail({ nodeId, onNavigate }: { nodeId: string; onNavigate: (id: string) => void }) {
  const [type, id] = nodeId.split(':') as [NodeType, string];
  const out = graph.edges.filter((e) => e.source === nodeId);
  const inc = graph.edges.filter((e) => e.target === nodeId);

  let title = nameOf[nodeId] ?? id;
  let body: React.ReactNode = null;
  if (type === 'region') body = <p>{regionById[id].role}</p>;
  if (type === 'chemical') {
    const c = chemicalById[id];
    body = (
      <>
        <span className="badge">{c.kind}</span>
        <p>{c.summary}</p>
      </>
    );
  }
  if (type === 'receptor') {
    const r = receptorById[id];
    const days = r.adaptTau / 1440;
    body = (
      <>
        <span className="badge">{r.role === 'auto' ? 'autoreceptor' : 'receptor'}</span>
        <p>{r.summary}</p>
        <p className="muted">
          Adapts over ~{days >= 1 ? `${days.toFixed(0)} day${days >= 2 ? 's' : ''}` : `${(r.adaptTau / 60).toFixed(0)} h`},
          compensating {Math.round(r.adaptStrength * 100)}% of a sustained change.
        </p>
      </>
    );
  }
  if (type === 'clearer') {
    const c = clearerById[id];
    body = <><span className="badge">{c.kind}</span><p>{c.summary}</p></>;
  }
  if (type === 'drug') {
    const d = drugById[id];
    title = d.name;
    const fmt = (m: number) => (m >= 1440 ? `${(m / 1440).toFixed(1)} days` : `${(m / 60).toFixed(1)} h`);
    const hl = d.saturable ? 'cleared at about one drink per hour'
      : d.fastPhase ? `most leaves the blood with a half-life of ${fmt(d.fastPhase.halfLife)}, the rest lingers (${fmt(d.halfLife)})`
      : `half-life ${fmt(d.halfLife)}`;
    body = (
      <>
        <span className="badge">{d.category}</span>
        <p>{d.summary}</p>
        <p className="muted">Standard dose: {d.standardDose} · peak after ~{d.tmax >= 60 ? `${(d.tmax / 60).toFixed(1)} h` : `${d.tmax} min`} · {hl}</p>
        {d.notModelled && <p className="muted">Simplified / not modelled: {d.notModelled}</p>}
      </>
    );
  }

  const conn = (list: typeof out, dir: 'out' | 'in') => list.map((e, i) => {
    const other = dir === 'out' ? e.target : e.source;
    return (
      <span key={i}>
        {dir === 'out' ? <>{e.label} </> : null}
        <button className="linkbtn" onClick={() => onNavigate(other)}>{nameOf[other]}</button>
        {dir === 'in' ? <> {e.label} this</> : null}
      </span>
    );
  });

  return (
    <div className="col detail" style={{ gap: 8 }}>
      <h2>{title}</h2>
      {body}
      {out.length > 0 && <div className="conn"><h3>It…</h3>{conn(out, 'out')}</div>}
      {inc.length > 0 && <div className="conn"><h3>Influenced by</h3>{conn(inc, 'in')}</div>}
    </div>
  );
}
