import { useEffect, useMemo, useRef, useState } from 'react';
import type { SimResult } from '../sim/engine';
import { fmtTime, fmtValue, seriesInfo } from './labels';

const H = 120;
const PAD = { l: 34, r: 8, t: 8, b: 18 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(300);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Min/max downsampling to ~2 points per pixel column. */
function path(t: Float64Array, v: Float32Array, x: (t: number) => number, y: (v: number) => number, cols: number) {
  const n = v.length;
  const step = Math.max(1, Math.floor(n / (cols * 2)));
  let d = '';
  for (let i = 0; i < n; i += step) {
    let lo = i, hi = i;
    for (let j = i; j < Math.min(n, i + step); j++) { if (v[j] < v[lo]) lo = j; if (v[j] > v[hi]) hi = j; }
    const [a, b] = lo < hi ? [lo, hi] : [hi, lo];
    d += `${d ? 'L' : 'M'}${x(t[a]).toFixed(1)},${y(v[a]).toFixed(1)}`;
    if (b !== a) d += `L${x(t[b]).toFixed(1)},${y(v[b]).toFixed(1)}`;
  }
  return d;
}

function niceTicks(lo: number, hi: number) {
  const span = hi - lo || 1;
  const raw = span / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

function Chart({ k, main, base, cursor, onCursor, sleepBands, doseTimes, doseIcons, onRemove, labelFor, plainValues }: {
  k: string; main: SimResult; base: SimResult | null; cursor: number; onCursor: (i: number) => void;
  sleepBands: [number, number][]; doseTimes: number[]; doseIcons?: string[]; onRemove?: () => void; labelFor?: (k: string) => string;
  plainValues?: boolean;
}) {
  const fmt = (val: number) => (plainValues && seriesInfo(k).unit === 'rel' ? `${Math.round(val * 100)}%` : fmtValue(k, val));
  const [ref, w] = useWidth<HTMLDivElement>();
  const info = seriesInfo(k);
  const v = main.series[k];
  const bv = base?.series[k];
  const [hover, setHover] = useState<number | null>(null);
  const { lo, hi } = useMemo(() => {
    if (info.unit === 'score') return { lo: 0, hi: 100 };
    let lo = Infinity, hi = -Infinity;
    for (const arr of [v, bv]) if (arr) for (let i = 0; i < arr.length; i++) { lo = Math.min(lo, arr[i]); hi = Math.max(hi, arr[i]); }
    if (info.unit === 'rel') { lo = Math.min(lo, 1); hi = Math.max(hi, 1); }
    lo = Math.min(lo, 0);
    if (hi - lo < 0.2) hi = lo + 0.2;
    return { lo, hi: hi * 1.05 };
  }, [v, bv, info.unit]);
  const t0 = main.t[0], t1 = main.t[main.t.length - 1];
  const iw = w - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * iw;
  const y = (val: number) => PAD.t + ih - ((val - lo) / (hi - lo)) * ih;
  const days = (t1 - t0) / 1440;
  const xticks: number[] = [];
  const tickEvery = days <= 1.01 ? 360 : days <= 3 ? 720 : days <= 10 ? 1440 : days <= 30 ? 7 * 1440 : 14 * 1440;
  for (let t = Math.ceil(t0 / tickEvery) * tickEvery; t <= t1; t += tickEvery) xticks.push(t);
  const tickLabel = (tt: number) => {
    if (days > 3) return `day ${Math.round(tt / 1440) + 1}`;
    const m = tt % 1440;
    if (m === 0) return days > 1.01 ? `day ${tt / 1440 + 1}` : '00:00';
    return fmtTime(tt, false);
  };
  const yt = niceTicks(lo, hi);
  // Long runs: daily rhythms swamp the trend, so draw the daytime average per day on top.
  const long = days > 6;
  const daily = useMemo(() => {
    if (!long) return null;
    const asleep = main.series['state:asleep'];
    const mk = (arr: Float32Array) => {
      const pts: [number, number][] = [];
      for (let d = 0; d < Math.ceil(days); d++) {
        let s = 0, n = 0;
        for (let i = 0; i < arr.length; i++) {
          const tt = main.t[i];
          if (tt >= d * 1440 && tt < (d + 1) * 1440 && asleep[i] < 0.5) { s += arr[i]; n++; }
        }
        if (n) pts.push([d * 1440 + 14 * 60, s / n]);
      }
      return pts;
    };
    return { main: mk(v), base: bv ? mk(bv) : null };
  }, [long, main, v, bv, days]);
  // the line paths only depend on data and size, not on the cursor: compute them once per change
  const mainPath = useMemo(() => path(main.t, v, x, y, iw), [main, v, w, lo, hi]);
  const basePath = useMemo(() => (bv ? path(main.t, bv, x, y, iw) : ''), [main, bv, w, lo, hi]);
  const poly = (pts: [number, number][]) => pts.map(([tt, val], i) => `${i ? 'L' : 'M'}${x(tt).toFixed(1)},${y(val).toFixed(1)}`).join('');
  const idx = hover ?? cursor;
  const ci = Math.min(idx, v.length - 1);

  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * w;
    const tt = t0 + ((px - PAD.l) / iw) * (t1 - t0);
    const i = Math.round(((tt - t0) / (t1 - t0)) * (main.t.length - 1));
    return Math.max(0, Math.min(main.t.length - 1, i));
  };

  return (
    <div className="chart">
      <div className="head">
        <span className="title" title={info.help}>{labelFor ? labelFor(k) : info.label}</span>
        <span className="now">
          {fmt(v[ci])}
          {bv && <span className="muted"> vs {fmt(bv[ci])}</span>}
          {onRemove && <button className="x" onClick={onRemove} aria-label={`Remove ${info.label} chart`}>×</button>}
        </span>
      </div>
      <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${H}`} preserveAspectRatio="none"
        onPointerMove={(e) => setHover(pick(e.clientX, e.currentTarget))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => onCursor(pick(e.clientX, e.currentTarget))}
        role="img" aria-label={`${labelFor ? labelFor(k) : info.label} over time: now ${fmt(v[ci])}, highest ${fmt(Math.max(...v))}, lowest ${fmt(Math.min(...v))}`}>
        {!long && sleepBands.map(([a, b], i) => (
          <rect key={i} x={x(Math.max(a, t0))} y={PAD.t} width={Math.max(0, x(Math.min(b, t1)) - x(Math.max(a, t0)))} height={ih} fill="var(--sleep)" />
        ))}
        <g className="grid">{yt.map((tv) => <line key={tv} x1={PAD.l} x2={w - PAD.r} y1={y(tv)} y2={y(tv)} />)}</g>
        <g className="axis">
          {yt.map((tv) => <text key={tv} x={PAD.l - 4} y={y(tv) + 3} textAnchor="end">{info.unit === 'score' ? tv : tv.toFixed(tv < 10 ? 1 : 0)}</text>)}
          {xticks.map((tt) => <text key={tt} x={x(tt)} y={H - 4} textAnchor="middle">{tickLabel(tt)}</text>)}
        </g>
        {info.unit === 'rel' && <line x1={PAD.l} x2={w - PAD.r} y1={y(1)} y2={y(1)} stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="1 3" />}
        {doseTimes.length <= 15 ? doseTimes.map((dt, i) => dt >= t0 && dt <= t1 && (doseIcons?.[i]
          ? <text key={i} x={x(dt)} y={PAD.t + ih - 3} textAnchor="middle" fontSize={11}>{doseIcons[i]}</text>
          : <path key={i} d={`M${x(dt)},${PAD.t + ih} l-4,7 h8 z`} fill="var(--text-secondary)" />
        )) : (
          <rect x={x(Math.min(...doseTimes))} y={PAD.t + ih + 1} height={3} rx={1.5}
            width={Math.max(2, x(Math.max(...doseTimes)) - x(Math.min(...doseTimes)))} fill="var(--text-secondary)" />
        )}
        {bv && <path d={basePath} fill="none" stroke="var(--compare)" strokeWidth={long ? 1 : 1.5} strokeDasharray={long ? undefined : '4 3'} opacity={long ? 0.3 : 1} vectorEffect="non-scaling-stroke" />}
        <path d={mainPath} fill="none" stroke="var(--series-1)" strokeWidth={long ? 1 : 2} opacity={long ? 0.22 : 1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {daily?.base && <path d={poly(daily.base)} fill="none" stroke="var(--compare)" strokeWidth={2} strokeDasharray="4 3" />}
        {daily && <path d={poly(daily.main)} fill="none" stroke="var(--series-1)" strokeWidth={2.5} strokeLinejoin="round" />}
        <line x1={x(main.t[ci])} x2={x(main.t[ci])} y1={PAD.t} y2={PAD.t + ih} stroke="var(--text-primary)" strokeWidth={1} opacity={hover != null ? 0.6 : 0.35} />
        <circle cx={x(main.t[ci])} cy={y(v[ci])} r={4} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
      </svg>
      </div>
      {hover != null && (
        <div className="tip" style={{ left: Math.min(w - 120, Math.max(0, x(main.t[ci]) - 40)), top: 26 }}>
          {fmtTime(main.t[ci])} · <b>{fmt(v[ci])}</b>{bv && <> · <span className="muted">{fmt(bv[ci])}</span></>}
        </div>
      )}
    </div>
  );
}

export function Charts({ keys, main, base, cursor, onCursor, doseTimes, doseIcons, onRemove, labelFor, plainValues }: {
  keys: string[]; main: SimResult; base: SimResult | null; cursor: number; onCursor: (i: number) => void;
  doseTimes: number[]; doseIcons?: string[]; onRemove?: (k: string) => void; labelFor?: (k: string) => string; plainValues?: boolean;
}) {
  const sleepBands = useMemo(() => {
    const s = main.series['state:asleep'];
    const out: [number, number][] = [];
    let start = -1;
    for (let i = 0; i < s.length; i++) {
      if (s[i] > 0.5 && start < 0) start = main.t[i];
      if ((s[i] <= 0.5 || i === s.length - 1) && start >= 0) { out.push([start, main.t[i]]); start = -1; }
    }
    return out;
  }, [main]);
  return (
    <div className="charts">
      {keys.map((k) => main.series[k] && (
        <Chart key={k} k={k} main={main} base={base} cursor={cursor} onCursor={onCursor}
          sleepBands={sleepBands} doseTimes={doseTimes} doseIcons={doseIcons} onRemove={onRemove && (() => onRemove(k))} labelFor={labelFor} plainValues={plainValues} />
      ))}
    </div>
  );
}
