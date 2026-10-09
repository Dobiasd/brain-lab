// Checks the model against independent reference tables (written from the literature
// without looking at the model; see src/sim/expectations/*.json and SPEC in the README there).
// Kinds: effect (direction + size), timecourse (onset/peak/offset), level (brain chemistry fold change),
// daily (24 h rhythm), profile (brain profile vs typical), rank (one effect clearly bigger than another).
import { drugById } from '../data/drugs';
import type { InputId } from '../data/types';
import { getterAt, runSim, type Dose, type InputEvent, type SimConfig, type SimResult } from './engine';
import { readout } from './readouts';

type Context = 'quiet' | 'busy' | 'stress' | 'evening' | 'next_morning' | 'chronic' | 'withdrawal';
type Size = 'small' | 'medium' | 'large';
type Range = [number, number];

export interface Setup { what: string; amount?: number; context: Context; profile?: string; when_h?: number; compare?: string }

interface Base { confidence: 'high' | 'medium' | 'low'; why?: string; source?: string }
export interface EffectE extends Base, Setup { kind?: 'effect'; feeling: string; direction: 'up' | 'down' | 'none'; size?: Size }
export interface TimecourseE extends Base { kind: 'timecourse'; what: string; amount?: number; profile?: string; context?: 'quiet' | 'evening'; feeling: string; direction: 'up' | 'down'; onset_h?: Range; peak_h?: Range; offset_h?: Range }
export interface LevelE extends Base, Setup { kind: 'level'; measure: string; fold: Range }
export interface DailyE extends Base { kind: 'daily'; profile?: string; measure?: string; feeling?: string; peak_clock?: Range; trough_clock?: Range; ratio?: Range }
export interface ProfileE extends Base { kind: 'profile'; profile: string; context: 'quiet' | 'busy' | 'stress'; clock: number; feeling: string; direction: 'up' | 'down' | 'none'; size?: Size }
export interface RankE extends Base { kind: 'rank'; feeling: string; bigger: Setup; smaller: Setup }
export type Expectation = EffectE | TimecourseE | LevelE | DailyE | ProfileE | RankE;

/** `miss`: how far the model is from passing (roughly in 0–100 points; 0 = pass), used for calibration. */
export interface Outcome { e: Expectation; ok: boolean; skipped?: string; detail: string; miss?: number }

const H = 60, D = 1440;
const ACTIVITIES: Record<string, { input?: InputId; hours: number }> = {
  stress: { input: 'stress', hours: 1 }, exercise: { input: 'exercise', hours: 1 }, sunlight: { input: 'sunlight', hours: 1.5 },
  social: { input: 'social', hours: 2 }, food: { input: 'food', hours: 0.5 }, sensory: { input: 'sensory', hours: 3 },
  pain: { input: 'pain', hours: 2 }, short_sleep: { hours: 0 },
};
/** Daily use pattern of regular users (clock hours), for the chronic and withdrawal contexts. */
const HABITS: Record<string, number[]> = {
  caffeine: [8, 13], nicotine: [8, 9.5, 11, 12.5, 14, 15.5, 17, 18.5, 20, 21.5], alcohol: [19], heroin: [9, 15, 21],
  morphine: [9, 15, 21], methylphenidate: [8, 12], thc: [17, 21], cocaine: [21], methamphetamine: [9], amphetamine: [9], diphenhydramine: [22.5], donepezil: [21],
};
const ALIASES: Record<string, string> = { melatonin: 'melatonin_supp', oxycodone: 'morphine', ozempic: 'semaglutide', dexamphetamine: 'amphetamine' };
export const MEASURES: Record<string, string> = {
  dopamine_striatum: 'pool:da_str', dopamine_pfc: 'pool:da_pfc', noradrenaline: 'pool:ne', serotonin: 'pool:ht',
  acetylcholine: 'pool:ach', glutamate: 'pool:glu', gaba: 'pool:gaba', adenosine: 'pool:adenosine', cortisol: 'pool:cortisol',
  acth: 'pool:acth', melatonin: 'pool:melatonin', oxytocin: 'pool:oxytocin', endorphin: 'pool:endorphin',
  anandamide: 'pool:anandamide', ghrelin: 'pool:ghrelin', glp1: 'pool:glp1', histamine: 'pool:hist',
};

/** Effect sizes on the 0–100 scale (the reference tables think of them like VAS points), with some slack. */
export const SIZE_BANDS: Record<Size, Range> = { small: [2.5, 22], medium: [10, 42], large: [20, 200] };
const NONE_MAX = 4;

type Built = { main: SimConfig; base: SimConfig; judge: number; doseAt: number };

/** Builds the "with" and "without" setups for one effect, and the time to judge it. */
export function setupFor(e0: Setup): Built | { skip: string } {
  const e = { ...e0, what: e0.what.split('+').map((x) => ALIASES[x] ?? x).join('+') };
  const profile = e.profile ?? 'typical';
  const amount = e.amount ?? 1;
  // combinations like "heroin+alcohol" (compared with the first one alone)
  const parts = e.what.split('+');
  const isDrug = parts.every((x) => !!drugById[x]);
  const act = ACTIVITIES[e.what];
  if (!isDrug && !act) return { skip: `unknown substance/activity "${e.what}"` };
  if (!isDrug && e.context === 'withdrawal') return { skip: 'withdrawal only for substances' };

  const events: InputEvent[] = [];
  let days = 1, doseAt = 10 * H, judge = 0;
  const ev = (input: InputId, at: number, hours: number) => events.push({ input, at, duration: Math.round(hours * H), intensity: 1 });
  switch (e.context) {
    case 'quiet': doseAt = 10 * H; judge = doseAt + (e.when_h ?? 1.5) * H; break;
    case 'busy': ev('sensory', 11 * H, 3); doseAt = 10.75 * H; judge = doseAt + (e.when_h ?? 1.5) * H; break;
    case 'stress': ev('stress', 14 * H, 1); doseAt = 13.5 * H; judge = doseAt + (e.when_h ?? 1) * H; break;
    case 'evening': doseAt = 21 * H; judge = doseAt + (e.when_h ?? 1.25) * H; break;
    case 'next_morning': days = 2; doseAt = 21 * H; judge = D + 10 * H; break;
    case 'chronic': days = 29; doseAt = 9 * H; judge = 28 * D + 13 * H; break;
    case 'withdrawal': days = 17; doseAt = 9 * H; judge = 14 * D + 13 * H + Math.max(0, (e.when_h ?? 24) - 24) * H; break;
    default: return { skip: `unknown context "${e.context}"` };
  }

  const doses: Dose[] = [];
  const sleepOverrides: SimConfig['sleepOverrides'] = [];
  if (isDrug) {
    if (e.context === 'chronic' || e.context === 'withdrawal') {
      if (parts.length > 1) return { skip: 'combinations only acute' };
      // how regular users actually take it (clock hours); amount scales each use
      const times = HABITS[e.what] ?? [9];
      const weekly = e.what === 'semaglutide';
      const n = e.context === 'chronic' ? days : 14;
      for (let d = 0; d < n; d += weekly ? 7 : 1) for (const h of times) doses.push({ drug: e.what, at: d * D + h * H, amount });
    } else for (const x of parts) doses.push({ drug: x, at: doseAt, amount });
  } else if (e.context === 'chronic') {
    // a daily habit for four weeks, judged on a normal afternoon (not during the activity)
    for (let d = 0; d < 28; d++) ev(act.input!, d * D + 8 * H, act.hours);
    judge = 28 * D + 15 * H; days = 29;
  } else if (e.what === 'short_sleep') {
    days = 2; sleepOverrides.push({ night: 0, bed: 27, wake: 31 }); // 4 h sleep, judged the next day
    judge = D + 11 * H;
  } else {
    // the activity itself is the thing tested; in its own context ('stress', 'busy') it replaces the default
    const start = e.context === 'evening' ? 20 * H : e.context === 'busy' ? 11 * H : e.context === 'stress' ? 14 * H : 10 * H;
    if (!(e.what === 'sensory' && e.context === 'busy') && !(e.what === 'stress' && e.context === 'stress')) ev(act.input!, start, act.hours);
    doseAt = start;
    judge = start + (e.when_h ?? Math.min(act.hours / 2, 1)) * H;
    if (e.context === 'next_morning') { days = 2; judge = D + 10 * H; }
  }

  // effects judged hours or days later need a long enough run
  days = Math.max(days, Math.ceil((judge + 60) / D));

  // background shared by both runs: an opioid already taken (naloxone tests), or ongoing pain (painkiller tests)
  const cmp = e.compare ?? '';
  const background: Dose[] = [];
  const opioid = cmp.match(/heroin|morphine/i)?.[0].toLowerCase();
  if (opioid && e.what === 'naloxone') background.push({ drug: opioid, at: doseAt - 20, amount: 1 });
  if (/pain/i.test(cmp) && e.what !== 'pain') ev('pain', doseAt - 15, 4);
  if (parts.length > 1 && /alone/i.test(cmp)) background.push({ drug: parts[0], at: doseAt, amount });
  const comboDoses = parts.length > 1 && /alone/i.test(cmp) ? doses.filter((d) => d.drug !== parts[0]) : doses;

  const main: SimConfig = { profile, days, doses: [...background, ...comboDoses], events, sleepOverrides };
  // the comparison: same situation without the thing being tested — or, for profile questions, a typical brain
  const profileCompare = /typical/i.test(e.compare ?? '') && profile !== 'typical';
  let base: SimConfig;
  if (profileCompare) base = { ...main, profile: 'typical' };
  else if (isDrug) base = { ...main, doses: background };
  else if (e.what === 'short_sleep') base = { ...main, sleepOverrides: [] };
  else base = { ...main, events: events.filter((x) => x.input !== act.input) };
  return { main, base, judge, doseAt };
}

/** Mean of a series over ±20 minutes around `t`. */
function around(r: SimResult, key: string, t: number) {
  let sum = 0, n = 0;
  for (let i = 0; i < r.t.length; i++) if (Math.abs(r.t[i] - t) <= 20) { sum += val(r, key, i); n++; }
  return n ? sum / n : NaN;
}

/** A series value; feelings are recomputed from the recorded signals, so readout weights can be tuned without re-running the simulation. */
function val(r: SimResult, key: string, i: number) {
  return key.startsWith('read:') ? readout(key.slice(5), getterAt(r, i)) : r.series[key][i];
}

const cache = new Map<string, SimResult>();
const run = (c: SimConfig) => {
  const k = JSON.stringify(c);
  if (!cache.has(k)) cache.set(k, runSim(c));
  return cache.get(k)!;
};
const readKey = (feeling: string) => `read:${feeling}`;
const clock = (t: number) => `${Math.floor(t / D) + 1}d ${String(Math.floor((t % D) / H)).padStart(2, '0')}:${String(Math.round(t % H)).padStart(2, '0')}`;
const inBand = (x: number, [lo, hi]: Range) => x >= lo && x <= hi;
const fmtR = (r: Range) => `[${r[0]}, ${r[1]}]`;
const label = (s: Setup) => `${s.what}×${s.amount ?? 1} [${s.context}, ${s.profile ?? 'typical'}${s.when_h != null && s.context !== 'chronic' ? `, +${s.when_h}h` : ''}]`;

/** The model's effect (with minus without) on a series for one setup. */
export function deltaFor(s: Setup, key: string): { delta: number; judge: number } | { skip: string } {
  const b = setupFor(s);
  if ('skip' in b) return b;
  const a = run(b.main), z = run(b.base);
  if (!a.series[key]) return { skip: `unknown series ${key}` };
  return { delta: around(a, key, b.judge) - around(z, key, b.judge), judge: b.judge };
}

function sizeMiss(delta: number, direction: 'up' | 'down' | 'none', size?: Size) {
  if (direction === 'none') return Math.max(0, Math.abs(delta) - (NONE_MAX - 0.01));
  const signed = direction === 'up' ? delta : -delta;
  const [lo, hi] = size ? SIZE_BANDS[size] : [2, Infinity];
  return signed < lo ? lo - signed : signed > hi ? signed - hi : 0;
}
const sizeOk = (delta: number, direction: 'up' | 'down' | 'none', size?: Size) => sizeMiss(delta, direction, size) === 0;

function checkEffect(e: EffectE): Outcome {
  const r = deltaFor(e, readKey(e.feeling));
  if ('skip' in r) return { e, ok: true, skipped: r.skip, detail: label(e) };
  const miss = sizeMiss(r.delta, e.direction, e.size);
  const ok = miss === 0;
  // direction alone (for reporting: wrong size vs wrong direction)
  const dirOk = sizeOk(r.delta, e.direction);
  return { e, ok, miss, detail: `${label(e)} ${e.feeling} expected ${e.direction}${e.size ? ` (${e.size})` : ''}, model Δ=${r.delta.toFixed(1)} at ${clock(r.judge)}${!ok && dirOk ? ' [size]' : ''}` };
}

function checkTimecourse(e: TimecourseE): Outcome {
  const hiH = Math.max(e.offset_h?.[1] ?? 0, e.peak_h?.[1] ?? 0, 12) * 1.6 + 2;
  const what = ALIASES[e.what] ?? e.what;
  const act = ACTIVITIES[what];
  if (!drugById[what] && !act?.input) return { e, ok: true, skipped: `unknown ${e.what}`, detail: e.what };
  const start = e.context === 'evening' ? 21 * H : 10 * H;
  const days = Math.ceil((start + hiH * H) / D) + 0;
  const cfg: SimConfig = { profile: e.profile ?? 'typical', days, doses: [], events: [], sampleEvery: 5 };
  const main: SimConfig = drugById[what]
    ? { ...cfg, doses: [{ drug: what, at: start, amount: e.amount ?? 1 }] }
    : { ...cfg, events: [{ input: act.input!, at: start, duration: Math.round(act.hours * H), intensity: 1 }] };
  const a = run(main), z = run(cfg);
  const key = readKey(e.feeling);
  if (!a.series[key]) return { e, ok: true, skipped: `unknown feeling ${e.feeling}`, detail: e.what };
  const sign = e.direction === 'up' ? 1 : -1;
  const ts: number[] = [], ds: number[] = [];
  for (let i = 0; i < a.t.length; i++) {
    if (a.t[i] < start || a.t[i] > start + hiH * H) continue;
    ts.push((a.t[i] - start) / H); ds.push(sign * (val(a, key, i) - val(z, key, i)));
  }
  // smooth over a window that scales with the time course (meals make hunger spiky)
  const win = Math.min(3, 0.08 * Math.max(e.offset_h?.[1] ?? 0, e.peak_h?.[1] ?? 0, 1));
  const raw = ds.slice();
  for (let i = 0; i < ds.length; i++) {
    let sum = 0, n = 0;
    for (let j = i; j >= 0 && ts[i] - ts[j] <= win / 2; j--) { sum += raw[j]; n++; }
    for (let j = i + 1; j < ds.length && ts[j] - ts[i] <= win / 2; j++) { sum += raw[j]; n++; }
    ds[i] = sum / n;
  }
  let pi = 0;
  ds.forEach((d, i) => { if (d > ds[pi]) pi = i; });
  const peak = ds[pi];
  if (!(peak >= 2)) return { e, ok: false, miss: 15, detail: `${e.what}×${e.amount ?? 1} ${e.feeling} timecourse: no ${e.direction} effect (peak Δ=${peak.toFixed(1)})` };
  const onset = ts[ds.findIndex((d) => d >= peak / 2)];
  let offI = ds.findIndex((d, i) => i > pi && d <= peak / 4);
  const offset = offI < 0 ? Infinity : ts[offI];
  const slack = 0.1; // sampling
  const bad: string[] = [];
  let miss = 0;
  const chk = (name: string, v: number, r?: Range) => {
    if (!r || (v >= r[0] - slack && v <= r[1] + slack)) return;
    bad.push(`${name} ${v.toFixed(2)}h ∉ ${fmtR(r)}`);
    // relative timing error, in "points"
    miss += Math.min(15, 10 * Math.abs(Math.log(Math.max(0.05, Math.min(v, 1e4)) / Math.max(0.05, v < r[0] ? r[0] : r[1]))));
  };
  chk('onset', onset, e.onset_h); chk('peak', ts[pi], e.peak_h); chk('offset', offset, e.offset_h);
  return { e, ok: bad.length === 0, miss, detail: `${e.what}×${e.amount ?? 1} [${e.profile ?? 'typical'}] ${e.feeling} timecourse: onset ${onset.toFixed(2)}h, peak ${ts[pi].toFixed(2)}h (Δ=${peak.toFixed(0)}), offset ${offset.toFixed(2)}h${bad.length ? ' — ' + bad.join('; ') : ''}` };
}

function checkLevel(e: LevelE): Outcome {
  const key = MEASURES[e.measure];
  if (!key) return { e, ok: true, skipped: `unknown measure ${e.measure}`, detail: e.measure };
  const b = setupFor(e);
  if ('skip' in b) return { e, ok: true, skipped: b.skip, detail: label(e) };
  const fold = around(run(b.main), key, b.judge) / around(run(b.base), key, b.judge);
  const lm = inBand(fold, e.fold) ? 0 : 20 * Math.abs(Math.log(fold / (fold < e.fold[0] ? e.fold[0] : e.fold[1])));
  return { e, ok: lm === 0, miss: lm, detail: `${label(e)} ${e.measure} expected ×${fmtR(e.fold)}, model ×${fold.toFixed(2)} at ${clock(b.judge)}` };
}

function checkDaily(e: DailyE): Outcome {
  const key = e.measure ? MEASURES[e.measure] : e.feeling ? readKey(e.feeling) : undefined;
  if (!key) return { e, ok: true, skipped: `unknown measure ${e.measure ?? e.feeling}`, detail: '' };
  const r = run({ profile: e.profile ?? 'typical', days: 3, doses: [], events: [], sampleEvery: 5 });
  let pk = -Infinity, tr = Infinity, pkT = 0, trT = 0;
  const pts: { c: number; v: number }[] = [];
  for (let i = 0; i < r.t.length; i++) {
    if (r.t[i] < D || r.t[i] >= 2 * D) continue;
    const v = val(r, key, i), c = (r.t[i] - D) / H;
    pts.push({ c, v });
    if (v > pk) { pk = v; pkT = c; }
    if (v < tr) { tr = v; trT = c; }
  }
  const clockIn = (c: number, rg: Range) => inBand(c, rg) || inBand(c + 24, rg) || inBand(c - 24, rg);
  // flat extremes (e.g. melatonin all day) pass if the expected window comes within 3% of the extreme
  const tol = 0.03 * (pk - tr);
  const near = (rg: Range, best: number, sign: 1 | -1) => pts.some((q) => clockIn(q.c, rg) && sign * (best - q.v) <= tol);
  const bad: string[] = [];
  if (e.peak_clock && !near(e.peak_clock, pk, 1)) bad.push(`peak ${pkT.toFixed(1)}h ∉ ${fmtR(e.peak_clock)}`);
  if (e.trough_clock && !near(e.trough_clock, tr, -1)) bad.push(`trough ${trT.toFixed(1)}h ∉ ${fmtR(e.trough_clock)}`);
  const ratio = pk / Math.max(1e-6, tr);
  if (e.ratio && e.measure && !inBand(ratio, e.ratio)) bad.push(`ratio ${ratio.toFixed(1)} ∉ ${fmtR(e.ratio)}`);
  return { e, ok: bad.length === 0, miss: 6 * bad.length, detail: `daily ${e.measure ?? e.feeling} [${e.profile ?? 'typical'}]: peak ${pkT.toFixed(1)}h, trough ${trT.toFixed(1)}h${e.measure ? `, ratio ${ratio.toFixed(1)}` : ''}${bad.length ? ' — ' + bad.join('; ') : ''}` };
}

function checkProfile(e: ProfileE): Outcome {
  const events: InputEvent[] = e.context === 'busy' ? [{ input: 'sensory', at: 11 * H, duration: 3 * H, intensity: 1 }]
    : e.context === 'stress' ? [{ input: 'stress', at: 14 * H, duration: H, intensity: 1 }] : [];
  const judge = D + e.clock * H; // day 2, after a night in the profile's own rhythm
  const cfg = (profile: string): SimConfig => ({ profile, days: 3, doses: [], events: events.map((x) => ({ ...x, at: x.at + D })) });
  const key = readKey(e.feeling);
  const a = run(cfg(e.profile)), z = run(cfg('typical'));
  if (!a.series[key]) return { e, ok: true, skipped: `unknown feeling ${e.feeling}`, detail: '' };
  const delta = around(a, key, judge) - around(z, key, judge);
  const miss = sizeMiss(delta, e.direction, e.size);
  const ok = miss === 0;
  return { e, ok, miss, detail: `profile ${e.profile} vs typical [${e.context}, ${e.clock}:00] ${e.feeling} expected ${e.direction}${e.size ? ` (${e.size})` : ''}, model Δ=${delta.toFixed(1)}${!ok && sizeOk(delta, e.direction) ? ' [size]' : ''}` };
}

function checkRank(e: RankE): Outcome {
  const key = readKey(e.feeling);
  const a = deltaFor(e.bigger, key), b = deltaFor(e.smaller, key);
  if ('skip' in a) return { e, ok: true, skipped: a.skip, detail: '' };
  if ('skip' in b) return { e, ok: true, skipped: b.skip, detail: '' };
  const miss = Math.max(0, 2 - (Math.abs(a.delta) - Math.abs(b.delta)));
  return { e, ok: miss === 0, miss, detail: `rank ${e.feeling}: ${label(e.bigger)} |Δ|=${Math.abs(a.delta).toFixed(1)} should exceed ${label(e.smaller)} |Δ|=${Math.abs(b.delta).toFixed(1)}` };
}

export function check(e: Expectation): Outcome {
  switch (e.kind ?? 'effect') {
    case 'effect': return checkEffect(e as EffectE);
    case 'timecourse': return checkTimecourse(e as TimecourseE);
    case 'level': return checkLevel(e as LevelE);
    case 'daily': return checkDaily(e as DailyE);
    case 'profile': return checkProfile(e as ProfileE);
    case 'rank': return checkRank(e as RankE);
  }
  return { e, ok: true, skipped: `unknown kind ${(e as { kind: string }).kind}`, detail: '' };
}

export const describeOutcome = (o: Outcome) => `${o.detail} (${o.e.confidence})`;
