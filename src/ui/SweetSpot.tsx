import { catecholIndex, focusCurve, focusParams } from '../sim/readouts';

type Get = (k: string) => number;

/** The inverted U: focus vs. dopamine/noradrenaline in the planning brain, with where this brain sits now. */
export function SweetSpot({ get, getBase }: { get: Get; getBase: Get | null }) {
  const W = 320, H = 150, P = { l: 30, r: 12, t: 14, b: 30 };
  const x0 = 0.3, x1 = 2.2;
  const u = focusCurve;
  const FOCUS_PEAK = focusParams.peak;
  const X = (c: number) => P.l + ((c - x0) / (x1 - x0)) * (W - P.l - P.r);
  const Y = (v: number) => P.t + (1 - v) * (H - P.t - P.b);
  let d = '';
  for (let c = x0; c <= x1 + 1e-9; c += 0.02) d += `${d ? 'L' : 'M'}${X(c).toFixed(1)},${Y(u(c)).toFixed(1)}`;
  const now = Math.min(x1, Math.max(x0, catecholIndex(get)));
  const base = getBase ? Math.min(x1, Math.max(x0, catecholIndex(getBase))) : null;
  const where = now < FOCUS_PEAK - 0.25 ? 'too little: easily distracted' : now > FOCUS_PEAK + 0.5 ? 'more than needed: wired, little extra focus' : 'near the sweet spot';
  return (
    <figure className="sweetspot">
      <h3>The "sweet spot" for focus</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Inverted U curve. This brain is ${where}.`}>
        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="var(--border)" />
        <path d={d} fill="none" stroke="var(--text-secondary)" strokeWidth={2} />
        <text x={P.l} y={H - 8} fontSize={11} fill="var(--text-muted)">too little</text>
        <text x={X(FOCUS_PEAK)} y={H - 8} fontSize={11} fill="var(--text-muted)" textAnchor="middle">just right</text>
        <text x={W - P.r} y={H - 8} fontSize={11} fill="var(--text-muted)" textAnchor="end">too much</text>
        <text x={8} y={P.t + 4} fontSize={11} fill="var(--text-muted)">focus</text>
        {base != null && <circle cx={X(base)} cy={Y(u(base))} r={6} fill="var(--surface-1)" stroke="var(--compare)" strokeWidth={2} strokeDasharray="3 2" />}
        <circle cx={X(now)} cy={Y(u(now))} r={7} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
      </svg>
      <figcaption className="muted">Dopamine and noradrenaline in the planning brain: the filled dot is now ({where}); the dashed dot is the comparison.</figcaption>
    </figure>
  );
}
