import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import { useMemo, useRef, useState } from 'react';
import { buildGraph, type GNode, type NodeType } from '../data/graph';
import { NodeDetail } from './NodeDetail';

type SimNode = GNode & SimulationNodeDatum;

const typeInfo: Record<NodeType, { label: string; color: string; r: number; x: number }> = {
  drug: { label: 'Drugs', color: 'var(--chem-noradrenaline)', r: 6, x: -520 },
  clearer: { label: 'Transporters & enzymes', color: 'var(--chem-acetylcholine)', r: 5, x: -260 },
  chemical: { label: 'Chemicals', color: 'var(--chem-dopamine)', r: 8, x: 0 },
  receptor: { label: 'Receptors', color: 'var(--chem-serotonin)', r: 5, x: 260 },
  region: { label: 'Brain regions', color: 'var(--chem-melatonin)', r: 9, x: 520 },
};

function layout() {
  const { nodes, edges } = buildGraph();
  const sn: SimNode[] = nodes.map((n, i) => ({ ...n, x: typeInfo[n.type].x, y: (i % 17) * 30 - 250 }));
  const links = edges.map((e) => ({ ...e }));
  const sim = forceSimulation(sn)
    .force('link', forceLink<SimNode, (typeof links)[number]>(links).id((d) => d.id).distance(70).strength(0.25))
    .force('charge', forceManyBody().strength(-90))
    .force('x', forceX<SimNode>((d) => typeInfo[d.type].x).strength(0.35))
    .force('y', forceY(0).strength(0.04))
    .force('collide', forceCollide(16))
    .stop();
  for (let i = 0; i < 400; i++) sim.tick();
  const pos = Object.fromEntries(sn.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
  const xs = sn.map((n) => n.x ?? 0), ys = sn.map((n) => n.y ?? 0);
  const fit = { x: Math.min(...xs) - 40, y: Math.min(...ys) - 30, w: Math.max(...xs) - Math.min(...xs) + 220, h: Math.max(...ys) - Math.min(...ys) + 60 };
  return { nodes, edges, pos, fit };
}

export function GraphView({ initial }: { initial?: string }) {
  const { nodes, edges, pos, fit } = useMemo(layout, []);
  const [sel, setSel] = useState<string>(initial ?? 'chemical:dopamine');
  const [types, setTypes] = useState<Record<NodeType, boolean>>({ drug: true, clearer: true, chemical: true, receptor: true, region: true });
  const [q, setQ] = useState('');
  const [view, setView] = useState(fit);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const neighbors = useMemo(() => {
    const s = new Set<string>([sel]);
    for (const e of edges) { if (e.source === sel) s.add(e.target); if (e.target === sel) s.add(e.source); }
    return s;
  }, [sel, edges]);
  const visible = (id: string) => types[id.split(':')[0] as NodeType];
  const ql = q.trim().toLowerCase();
  const match = (n: GNode) => !ql || n.name.toLowerCase().includes(ql);

  const focusNode = (id: string) => {
    setSel(id);
    const p = pos[id];
    if (p) setView((v) => ({ ...v, x: p.x - v.w / 2, y: p.y - v.h / 2 }));
  };

  const onWheel = (e: React.WheelEvent) => {
    const k = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    const r = svgRef.current!.getBoundingClientRect();
    const mx = view.x + ((e.clientX - r.left) / r.width) * view.w;
    const my = view.y + ((e.clientY - r.top) / r.height) * view.h;
    setView({ x: mx - (mx - view.x) * k, y: my - (my - view.y) * k, w: view.w * k, h: view.h * k });
  };

  return (
    <div className="graphlayout">
      <div className="card graph">
        <div className="row" style={{ alignItems: 'center' }}>
          <input type="text" placeholder="Search (e.g. caffeine, GABA, amygdala)…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '2 1 220px' }} />
          <div className="chips" style={{ flex: '3 1 300px' }}>
            {(Object.keys(typeInfo) as NodeType[]).map((t) => (
              <button key={t} className={`chip${types[t] ? '' : ' off'}`} onClick={() => setTypes({ ...types, [t]: !types[t] })} aria-pressed={types[t]}>
                <span className="dot" style={{ width: 9, height: 9, borderRadius: '50%', background: typeInfo[t].color, display: 'inline-block' }} />{typeInfo[t].label}
              </button>
            ))}
          </div>
        </div>
        {ql && (
          <div className="chips">
            {nodes.filter((n) => match(n) && visible(n.id)).slice(0, 12).map((n) => (
              <button key={n.id} className="chip" onClick={() => focusNode(n.id)}>{n.name}</button>
            ))}
          </div>
        )}
        <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} onWheel={onWheel}
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const r = svgRef.current!.getBoundingClientRect();
            setView({ ...view, x: drag.current.vx - ((e.clientX - drag.current.x) / r.width) * view.w, y: drag.current.vy - ((e.clientY - drag.current.y) / r.height) * view.h });
          }}
          onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}
          role="img" aria-label="Knowledge graph of brain regions, chemicals, receptors, enzymes and drugs">
          {edges.map((e, i) => {
            if (!visible(e.source) || !visible(e.target)) return null;
            const a = pos[e.source], b = pos[e.target];
            const hi = e.source === sel || e.target === sel;
            return <line key={i} className={`gedge${hi ? ' hi' : ''}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} opacity={hi ? 1 : 0.5}
              stroke={hi && e.sign ? (e.sign > 0 ? 'var(--up)' : 'var(--down)') : undefined} />;
          })}
          {nodes.map((n) => {
            if (!visible(n.id)) return null;
            const p = pos[n.id];
            const ti = typeInfo[n.type];
            const dim = (sel && !neighbors.has(n.id)) || !match(n);
            return (
              <g key={n.id} className="gnode" transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.3 : 1}
                onClick={(e) => { e.stopPropagation(); setSel(n.id); }}>
                <circle r={n.id === sel ? ti.r + 4 : ti.r} fill={ti.color} stroke={n.id === sel ? 'var(--text-primary)' : 'var(--surface-1)'} strokeWidth={1.5} />
                {(!dim || n.type === 'chemical' || n.type === 'region') && <text x={ti.r + 4} y={3}>{n.name}</text>}
              </g>
            );
          })}
        </svg>
        <div className="row"><button className="btn ghost" style={{ flex: '0 0 auto' }} onClick={() => setView(fit)}>Reset view</button></div>
        <p className="muted">Click a node to see what it connects to. Scroll to zoom, drag to pan. Red/blue links = excites/inhibits.</p>
      </div>
      <div className="card">
        <NodeDetail nodeId={sel} onNavigate={focusNode} />
      </div>
    </div>
  );
}
