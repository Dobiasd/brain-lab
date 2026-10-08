// Derives the explorable knowledge graph from the same records the simulator uses.
import { regions } from './anatomy';
import { chemicals, clearers, nuclei, pools, receptors } from './chemistry';
import { drugs } from './drugs';
import type { Action } from './types';

export type NodeType = 'region' | 'chemical' | 'receptor' | 'clearer' | 'drug';

export interface GNode { id: string; type: NodeType; name: string }
export interface GEdge { source: string; target: string; label: string; sign?: 1 | -1 }

const nucleusRegion = Object.fromEntries(nuclei.map((n) => [n.id, n.region]));
const poolChem = Object.fromEntries(pools.map((p) => [p.id, p.chemical]));
const recIds = new Set(receptors.map((r) => r.id));
const clrIds = new Set(clearers.map((c) => c.id));

const actionLabel: Record<Action, string> = {
  agonist: 'activates',
  antagonist: 'blocks',
  pam: 'amplifies',
  nam: 'dampens',
  reuptake_inhibitor: 'blocks reuptake by',
  enzyme_inhibitor: 'inhibits',
  releaser: 'forces release of',
};
export const actionText = actionLabel;

export function buildGraph() {
  const nodes: GNode[] = [
    ...regions.map((r) => ({ id: `region:${r.id}`, type: 'region' as const, name: r.name })),
    ...chemicals.map((c) => ({ id: `chemical:${c.id}`, type: 'chemical' as const, name: c.name })),
    ...receptors.map((r) => ({ id: `receptor:${r.id}`, type: 'receptor' as const, name: r.name })),
    ...clearers.map((c) => ({ id: `clearer:${c.id}`, type: 'clearer' as const, name: c.name })),
    ...drugs.map((d) => ({ id: `drug:${d.id}`, type: 'drug' as const, name: d.name })),
  ];
  const edges: GEdge[] = [];
  const seen = new Set<string>();
  const add = (e: GEdge) => {
    const k = `${e.source}|${e.target}|${e.label}`;
    if (seen.has(k) || e.source === e.target) return;
    seen.add(k);
    edges.push(e);
  };

  for (const p of pools) {
    const src = p.source === 'wake' ? 'basal_forebrain' : nucleusRegion[p.source];
    if (src) add({ source: `region:${src}`, target: `chemical:${p.chemical}`, label: 'releases' });
    add({ source: `chemical:${p.chemical}`, target: `region:${p.region}`, label: 'acts in' });
    for (const c of p.clearance) add({ source: `clearer:${c.by}`, target: `chemical:${p.chemical}`, label: 'clears' });
  }
  for (const r of receptors) {
    add({ source: `chemical:${poolChem[r.pool]}`, target: `receptor:${r.id}`, label: 'binds' });
    add({ source: `receptor:${r.id}`, target: `region:${r.region}`, label: 'located in' });
  }
  for (const n of nuclei) {
    for (const m of n.modulators) {
      const [kind, id] = m.ref.split(':');
      const sign = m.w > 0 ? 1 : -1;
      if (kind === 'receptor') add({ source: `receptor:${id}`, target: `region:${n.region}`, label: sign > 0 ? 'excites' : 'inhibits', sign });
      if (kind === 'pool') add({ source: `chemical:${poolChem[id]}`, target: `region:${n.region}`, label: sign > 0 ? 'excites' : 'inhibits', sign });
    }
  }
  for (const d of drugs) {
    for (const t of d.targets) {
      const target = recIds.has(t.target) ? `receptor:${t.target}` : clrIds.has(t.target) ? `clearer:${t.target}` : `chemical:${poolChem[t.target]}`;
      add({ source: `drug:${d.id}`, target, label: actionLabel[t.action] });
    }
  }
  return { nodes, edges };
}

/** Series keys that make up a region's activity on the brain map. */
export function regionKeys(regionId: string): string[] {
  const keys: string[] = [];
  for (const n of nuclei) if (n.region === regionId) keys.push(`fire:${n.id}`);
  for (const p of pools) if (p.region === regionId) keys.push(`pool:${p.id}`);
  return keys;
}
