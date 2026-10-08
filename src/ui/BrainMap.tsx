import { regions, regionById } from '../data/anatomy';
import { nuclei, pools } from '../data/chemistry';
import { regionKeys } from '../data/graph';

type Get = (key: string) => number;

const nucleusRegion = Object.fromEntries(nuclei.map((n) => [n.id, n.region]));

export const chemGroup = (chemical: string) => {
  if (chemical === 'dopamine') return 'dopamine';
  if (chemical === 'noradrenaline') return 'noradrenaline';
  if (chemical === 'serotonin') return 'serotonin';
  if (chemical === 'acetylcholine') return 'acetylcholine';
  if (['crh', 'acth', 'cortisol'].includes(chemical)) return 'stress';
  if (chemical === 'melatonin') return 'melatonin';
  return 'other';
};

export const chemLegend = [
  ['dopamine', 'Dopamine'], ['noradrenaline', 'Noradrenaline'], ['serotonin', 'Serotonin'],
  ['acetylcholine', 'Acetylcholine'], ['stress', 'Stress axis (CRH → ACTH → cortisol)'], ['melatonin', 'Melatonin'],
  ['other', 'Peptides & others'],
] as const;

interface Pathway { id: string; from: string; to: string; group: string; fireKey: string; bend: number }

// Pathways come from the data: a pool's source nucleus region → the region it acts in.
const pathways: Pathway[] = [];
for (const p of pools) {
  const from = nucleusRegion[p.source];
  if (!from || from === p.region) continue;
  pathways.push({ id: p.id, from, to: p.region, group: chemGroup(p.chemical), fireKey: `fire:${p.source}`, bend: 0.25 });
}
// Cortisol feeds back from the adrenal glands to the brain via the blood.
pathways.push({ id: 'cortisol_fb', from: 'adrenal', to: 'hypothalamus', group: 'stress', fireKey: 'pool:cortisol', bend: -0.2 });
// Melatonin acts on the body clock in the hypothalamus.
pathways.push({ id: 'melatonin_scn', from: 'pineal', to: 'hypothalamus', group: 'melatonin', fireKey: 'pool:melatonin', bend: 0.3 });
// Endocannabinoids / oxytocin made in hypothalamus/hippocampus act locally — not drawn.

function curve(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const cx = mx - dy * bend, cy = my + dx * bend;
  return `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`;
}

export function regionActivity(regionId: string, get: Get) {
  const keys = regionKeys(regionId);
  if (!keys.length) return 0;
  let s = 0;
  for (const k of keys) s += Math.log2(Math.max(0.05, get(k)));
  return s / keys.length;
}

function glow(a: number, modelled: boolean) {
  if (!modelled || Math.abs(a) < 0.04) return { color: 'var(--neutral)', opacity: 0.9 };
  const t = Math.min(1, Math.abs(a) / 1.2);
  const c = a >= 0 ? 'var(--up)' : 'var(--down)';
  return { color: c, opacity: 0.3 + 0.6 * t };
}

const shortName: Record<string, string> = {
  pfc: 'Prefrontal', cortex: 'Cortex', striatum: 'Striatum', thalamus: 'Thalamus', basal_forebrain: 'Basal forebrain',
  amygdala: 'Amygdala', hippocampus: 'Hippocampus', hypothalamus: 'Hypothalamus', pituitary: 'Pituitary',
  pineal: 'Pineal', vta: 'VTA', raphe: 'Raphe', lc: 'Locus coeruleus', cerebellum: 'Cerebellum', adrenal: 'Adrenals', gut: 'Stomach & gut',
};
// Very short names for phones.
const tinyName: Record<string, string> = {
  pfc: 'Planning', striatum: 'Reward', cortex: 'Cortex', thalamus: 'Thalamus', basal_forebrain: 'Wake', amygdala: 'Threat',
  hippocampus: 'Memory', hypothalamus: 'Body ctrl', pituitary: 'Pituitary', pineal: 'Night', vta: 'Dopamine', raphe: 'Serotonin',
  lc: 'Alarm', cerebellum: 'Cerebellum', adrenal: 'Adrenals', gut: 'Gut',
};

// Everyday nicknames shown in simple mode.
const plainShort: Record<string, string> = {
  pfc: 'Planning (prefrontal)', striatum: 'Reward (striatum)', basal_forebrain: 'Wake centre', amygdala: 'Threat detector',
  hippocampus: 'Memory', hypothalamus: 'Body control', pituitary: 'Pituitary', vta: 'Dopamine source', raphe: 'Serotonin source',
  lc: 'Alarm centre', adrenal: 'Adrenal glands', pineal: 'Night clock', gut: 'Stomach & gut',
};
const labelOffset: Record<string, [number, number, 'start' | 'middle' | 'end']> = {
  pfc: [0, 4, 'middle'], cortex: [0, 4, 'middle'], striatum: [0, 4, 'middle'], thalamus: [0, 4, 'middle'],
  basal_forebrain: [-16, 4, 'end'], amygdala: [-20, 4, 'end'], hippocampus: [0, 34, 'middle'], hypothalamus: [0, -22, 'middle'],
  pituitary: [4, 24, 'start'], pineal: [14, -6, 'start'], vta: [16, -8, 'start'], raphe: [16, 4, 'start'], lc: [-14, 16, 'end'],
  cerebellum: [0, 4, 'middle'], adrenal: [28, 5, 'start'], gut: [26, 5, 'start'],
};

export function BrainMap({ get, selected = null, onSelect, asleep, highlight, plainLabels }: {
  get: Get; selected?: string | null; onSelect?: (regionId: string) => void; asleep: boolean;
  /** Regions to point at; others are dimmed. */
  highlight?: string[];
  plainLabels?: boolean;
}) {
  const hasHi = !!highlight && highlight.length > 0;
  // a text summary for screen readers (and anyone who can't tell red from blue)
  const changed = regions.filter((r) => regionKeys(r.id).length)
    .map((r) => ({ r, a: regionActivity(r.id, get) })).filter((x) => Math.abs(x.a) > 0.15)
    .sort((x, y) => Math.abs(y.a) - Math.abs(x.a)).slice(0, 5);
  const summary = changed.length
    ? `Most changed: ${changed.map((x) => `${(plainLabels && plainShort[x.r.id]) || x.r.name} ${x.a > 0 ? 'more active' : 'less active'}`).join(', ')}.`
    : 'No brain area is much more or less active than usual.';
  // on narrow screens only these keep their label
  const important = new Set([...(highlight ?? []), ...changed.slice(0, 4).map((x) => x.r.id), 'pfc', 'cortex', 'striatum']);
  return (
    <div className="mapwrap">
      <svg viewBox="60 30 700 520" role="img" aria-label={`Side view of the brain. ${summary}`}>
        <desc>{summary}</desc>
        {/* outline: cerebrum, cerebellum, brainstem */}
        <g fill="var(--brain-fill)" stroke="var(--brain-stroke)" strokeWidth={2}>
          <ellipse cx={610} cy={368} rx={78} ry={50} />
          <path d="M430,315 C446,370 456,430 468,520 L512,520 C502,440 502,380 508,326 Z" />
          <path d="M120,250 C95,170 150,80 270,58 C390,36 560,50 650,125 C705,172 712,245 672,295 C640,330 585,332 545,318 C520,345 470,350 430,335 C390,375 300,382 250,352 C200,330 140,310 120,250 Z" />
        </g>
        <path d="M245,205 C320,150 470,150 535,215" fill="none" stroke="var(--brain-stroke)" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
        <text x={80} y={548} fontSize={11} fill="var(--text-muted)">↑ front of head (left)   ·   body ↓</text>
        <path d="M335,345 C300,420 220,470 175,500" fill="none" stroke="var(--border)" strokeWidth={1.5} strokeDasharray="2 4" />
        <text x={210} y={445} fontSize={10} fill="var(--text-muted)" transform="rotate(-38 210 445)">bloodstream</text>

        {/* pathways */}
        {pathways.map((p) => {
          const a = regionById[p.from], b = regionById[p.to];
          const rate = Math.max(0.05, get(p.fireKey));
          const dur = Math.min(12, 1.6 / rate);
          const width = 1.2 + Math.min(3, rate) * 0.9;
          return (
            <path key={p.id} className="path" d={curve(a, b, p.bend)} stroke={`var(--chem-${p.group})`} strokeWidth={width}
              style={{ animationDuration: `${dur}s`, opacity: asleep ? 0.45 : 0.85 }} />
          );
        })}

        {/* regions */}
        {regions.map((r) => {
          const a = regionActivity(r.id, get);
          const g = glow(a, regionKeys(r.id).length > 0);
          const [dx, dy, anchor] = labelOffset[r.id] ?? [0, 4, 'middle'];
          const bigLabel = r.r >= 22;
          return (
            <g key={r.id} className={`region${selected === r.id ? ' sel' : ''}${onSelect ? ' clickable' : ''}`}
              opacity={hasHi && !highlight!.includes(r.id) ? 0.45 : 1}
              {...(onSelect ? {
                onClick: () => onSelect(r.id), role: 'button', tabIndex: 0,
                'aria-label': `${r.name}: ${Math.abs(a) < 0.04 ? 'about as active as usual' : a > 0 ? 'more active than usual' : 'less active than usual'}`,
                onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.id); } },
              } : {})}>
              <circle cx={r.x} cy={r.y} r={r.r + 6} fill={g.color} opacity={g.opacity * 0.35} />
              <circle className="ring" cx={r.x} cy={r.y} r={r.r} fill={g.color} fillOpacity={g.opacity} stroke="var(--surface-1)" strokeWidth={1.5} />
              {hasHi && highlight!.includes(r.id) && <circle className="pulse" cx={r.x} cy={r.y} r={r.r + 10} />}
              {Math.abs(a) > 0.15 && regionKeys(r.id).length > 0 && (
                <text className="glyph" x={r.x + r.r * 0.7} y={r.y - r.r * 0.55} textAnchor="middle">{a > 0 ? '▲' : '▼'}</text>
              )}
              <title>{r.name}</title>
              <text className={`lbl lbl-long${important.has(r.id) ? '' : ' lbl-minor'}`} x={r.x + (bigLabel ? 0 : dx)} y={r.y + (bigLabel ? 4 : dy)} textAnchor={bigLabel ? 'middle' : anchor}>{(plainLabels && plainShort[r.id]) || shortName[r.id]}</text>
              <text className={`lbl lbl-short${important.has(r.id) ? '' : ' lbl-minor'}`} x={r.x + (bigLabel ? 0 : dx)} y={r.y + (bigLabel ? 8 : dy)} textAnchor={bigLabel ? 'middle' : anchor}>{(plainLabels && tinyName[r.id]) || shortName[r.id]}</text>
            </g>
          );
        })}
        {asleep && <text x={700} y={70} fontSize={13} textAnchor="end" fill="var(--text-secondary)">☾ asleep</text>}
      </svg>
      <p className="muted map-summary">{summary}</p>
    </div>
  );
}
