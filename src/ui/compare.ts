import type { SimConfig } from '../sim/engine';

export type CompareMode = 'nodrugs' | 'plain' | 'typical' | 'avgpers' | 'off';

export function compareConfig(cfg: SimConfig, mode: CompareMode): SimConfig | null {
  if (mode === 'off') return null;
  if (mode === 'nodrugs') return { ...cfg, doses: [] };
  if (mode === 'plain') return { ...cfg, doses: [], events: [], sleepOverrides: [], meals: undefined };
  if (mode === 'avgpers') return { ...cfg, personality: undefined };
  return { ...cfg, profile: 'typical', personality: undefined };
}

/** Sample index closest to a time in minutes. */
export function indexAt(t: Float64Array, minutes: number) {
  let lo = 0, hi = t.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (t[mid] < minutes) lo = mid + 1; else hi = mid; }
  return lo;
}
