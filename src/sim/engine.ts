// The simulator: a fixed-step (1 minute) dynamical system driven entirely by
// the data in src/data. It is a qualitative cartoon. Directions, shapes and
// time scales are meant to be right; absolute numbers are not.

import { nuclei, pools, receptors } from '../data/chemistry';
import { drugById, drugs } from '../data/drugs';
import { profileById } from '../data/profiles';
import type { Action, Drug, InputId, Personality, Profile } from '../data/types';
import { applyPersonality } from '../data/personality';
import { readout, readoutDefs } from './readouts';

export const MIN_PER_DAY = 1440;

export interface Dose { drug: string; at: number; amount: number }
export interface InputEvent { input: InputId; at: number; duration: number; intensity: number }
/** Overrides the sleep window for the night that starts on `night` (day index). Hours are relative to that day's midnight. bed === wake means no sleep. */
export interface SleepOverride { night: number; bed: number; wake: number }

export interface SimConfig {
  profile: string;
  days: number;
  doses: Dose[];
  events: InputEvent[];
  sleepOverrides?: SleepOverride[];
  sampleEvery?: number;
  personality?: Personality;
  /** meal start times (minutes since the start, 30 min each); undefined = the usual three meals every day */
  meals?: number[];
}

export interface SimResult {
  t: Float64Array; // minutes since start (day 0, 00:00)
  series: Record<string, Float32Array>;
  keys: string[];
}

// ---------- constants ----------
const EMAX = 3; // signal of a full agonist at full occupancy, relative to baseline endogenous
const K_DRAIN = 0.0006; // store depletion per unit releaser boost per minute
const A_MAX = 2.4, A_MIN = 0.15, TAU_WAKE = 1100, TAU_SLEEP = 300;
const TAU_PLAST = 14 * MIN_PER_DAY;
/** The typical brain's average cortisol (GR) signal once receptor adaptation runs (references are measured without it). */
const GR_TYPICAL = 1.52;
const INPUT_IDS: InputId[] = ['stress', 'exercise', 'sunlight', 'social', 'food', 'sensory', 'pain'];

/** Fraction of a target a drug occupies at brain level `c` (Hill equation). */
export const occupancy = (c: number, ec50: number, hill = 1) =>
  hill === 1 ? c / (c + ec50) : 1 / (1 + Math.pow(ec50 / c, hill));

// ---------- PK ----------
// Per drug: gut → blood (a fast-leaving and a slow-leaving share) → brain (effect site, lagging behind blood),
// plus acute tolerance. Concentrations are in units of one standard dose's peak at the effect site.
interface PK { ka: number; ke: number; keFast: number; fFast: number; ke0: number; scale: number; ec50: number }
const pkCache: Record<string, PK> = {};

/** ka for a one-compartment model that peaks at tmax with elimination rate ke. */
function solveKa(ke: number, tmax: number) {
  let lo = ke * 1.0001, hi = 50;
  for (let i = 0; i < 100; i++) {
    const mid = Math.sqrt(lo * hi);
    const tm = Math.log(mid / ke) / (mid - ke);
    if (tm > tmax) lo = mid; else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

interface DrugPkState { gut: number; c1: number; c2: number; ce: number; tol: number }

/** One step of absorption, elimination, brain equilibration and acute tolerance for one drug. */
function pkStep(d: Drug, k: PK, x: DrugPkState, dt = 1) {
  const absorbed = x.gut * (1 - Math.exp(-k.ka * dt));
  x.gut -= absorbed;
  if (x.gut < 1e-9) x.gut = 0;
  const inp = absorbed * k.scale;
  x.c1 = x.c1 * Math.exp(-k.keFast * dt) + inp * k.fFast;
  if (d.saturable) {
    const { vmax, km } = d.saturable;
    x.c2 = Math.max(0, x.c2 - ((vmax * x.c2) / (km + x.c2)) * dt) + inp * (1 - k.fFast);
  } else x.c2 = x.c2 * Math.exp(-k.ke * dt) + inp * (1 - k.fFast);
  const c = x.c1 + x.c2;
  x.ce += (c - x.ce) * (1 - Math.exp(-k.ke0 * dt));
  if (d.acuteTolerance) {
    // desensitisation follows how much of the main target is occupied
    const { on, off } = d.acuteTolerance;
    const tgt = x.ce / (x.ce + k.ec50);
    x.tol += (tgt - x.tol) * (1 - Math.exp(-(Math.LN2 / (tgt > x.tol ? on : off)) * dt));
  }
}
/** How much of the response is left after acute tolerance (1 = none). */
const tolFactor = (d: Drug, tol: number) => (d.acuteTolerance ? 1 - d.acuteTolerance.strength * Math.min(1, tol) : 1);

export function pkFor(drugId: string): PK {
  if (pkCache[drugId]) return pkCache[drugId];
  const d = drugById[drugId];
  const ke = d.saturable ? d.saturable.vmax / d.saturable.km : Math.LN2 / d.halfLife;
  const fFast = d.fastPhase?.frac ?? 0;
  const keFast = d.fastPhase ? Math.LN2 / d.fastPhase.halfLife : ke;
  const ka = solveKa(fFast * keFast + (1 - fFast) * ke, d.tmax);
  const ec50 = Math.min(...d.targets.map((t) => t.ec50));
  const k: PK = { ka, ke, keFast, fFast, ke0: Math.LN2 / (d.effectDelay ?? 10), scale: 1, ec50 };
  // scale so that one dose peaks at 1 in the brain (found by simulation; saturable clearance makes it nonlinear)
  const peakFor = (scale: number) => {
    const x: DrugPkState = { gut: 1, c1: 0, c2: 0, ce: 0, tol: 0 };
    let pk = 0;
    const n = 4 * d.tmax + 6 * (d.effectDelay ?? 10) + 120;
    for (let t = 0; t < n; t++) { pkStep(d, { ...k, scale }, x); pk = Math.max(pk, x.ce); }
    return pk;
  };
  let lo = 0.01, hi = 100;
  for (let i = 0; i < 50; i++) { const mid = Math.sqrt(lo * hi); if (peakFor(mid) < 1) lo = mid; else hi = mid; }
  k.scale = Math.sqrt(lo * hi);
  return (pkCache[drugId] = k);
}

const levelCurve: Record<string, Float32Array> = {};
/** How much of one dose is acting `since` minutes after taking it, as a fraction of its peak (brain level, after acute tolerance). */
export function doseLevel(drugId: string, since: number) {
  if (since < 0) return 0;
  let c = levelCurve[drugId];
  if (!c) {
    const d = drugById[drugId], k = pkFor(drugId);
    const n = Math.min(60 * MIN_PER_DAY, Math.round(8 * Math.max(d.halfLife, d.tmax) + 600));
    c = levelCurve[drugId] = new Float32Array(n);
    const x: DrugPkState = { gut: 1, c1: 0, c2: 0, ce: 0, tol: 0 };
    for (let t = 0; t < n; t++) { c[t] = x.ce * tolFactor(d, x.tol); pkStep(d, k, x); }
  }
  const i = Math.round(since);
  return i < c.length ? c[i] : 0;
}

// ---------- index tables (built once) ----------
const poolIdx = Object.fromEntries(pools.map((p, i) => [p.id, i]));
const recIdx = Object.fromEntries(receptors.map((r, i) => [r.id, i]));
const nucIdx = Object.fromEntries(nuclei.map((n, i) => [n.id, i]));
const drugIdx = Object.fromEntries(drugs.map((d, i) => [d.id, i]));
const clearerIds = Array.from(new Set(pools.flatMap((p) => p.clearance.map((c) => c.by))));
const clrIdx = Object.fromEntries(clearerIds.map((c, i) => [c, i]));
const ADEN = poolIdx['adenosine'];
const MAO = clrIdx['mao'];
const MAO_STORE = 2;
const poolHasMao = pools.map((p) => p.clearance.some((c) => c.by === 'mao'));

type ModRef = { kind: 'rec' | 'pool' | 'input' | 'state'; idx: number; key: string; w: number; log?: boolean; above?: number };
const STATE_KEYS = ['asleep', 'circadian', 'hpa_rhythm', 'car', 'dark', 'satiety', 'meal', 'hangover', 'inertia', 'afterglow'] as const;
const ALCOHOL = drugs.findIndex((d) => d.id === 'alcohol');
/** Automatic meals (clock hours, 30 min each), eaten only while awake. */
export const MEALS = [7.5, 12.5, 19];
/** The usual meals as absolute start times for a run of `days` days. */
export const defaultMeals = (days: number) =>
  Array.from({ length: Math.ceil(days) }, (_, d) => MEALS.map((m) => d * MIN_PER_DAY + m * 60)).flat();
const nucMods: ModRef[][] = nuclei.map((n) =>
  n.modulators.map((m) => {
    const [kind, id] = m.ref.split(':');
    if (kind === 'receptor') return { kind: 'rec', idx: recIdx[id], key: id, w: m.w, log: m.form === 'log' };
    if (kind === 'pool') return { kind: 'pool', idx: poolIdx[id], key: id, w: m.w, log: m.form === 'log' };
    if (kind === 'input') return { kind: 'input', idx: INPUT_IDS.indexOf(id as InputId), key: id, w: m.w, above: m.above };
    return { kind: 'state', idx: STATE_KEYS.indexOf(id as (typeof STATE_KEYS)[number]), key: id, w: m.w };
  }),
);
const poolSource = pools.map((p) => (p.id === 'adenosine' ? -1 : nucIdx[p.source]));
const recPool = receptors.map((r) => poolIdx[r.pool]);

// Drug effects grouped by target, so each step is a flat loop.
interface Eff { id: number; drug: number; action: Action; ec50: number; hill: number; eff: number; endo: number; irr?: { kinact: number; ksyn: number } }
const allEffs: Eff[] = [];
const recEffs: Eff[][] = receptors.map(() => []);
const clrEffs: Eff[][] = clearerIds.map(() => []);
const poolEffs: Eff[][] = pools.map(() => []);
drugs.forEach((d, di) => {
  for (const t of d.targets) {
    const e: Eff = { id: allEffs.length, drug: di, action: t.action, ec50: t.ec50, hill: d.hill ?? 1, eff: t.efficacy ?? (t.action === 'releaser' ? 4 : 1), endo: t.endogenous ?? 1,
      irr: t.irreversible ? { kinact: t.irreversible.inactivation, ksyn: Math.LN2 / t.irreversible.recovery } : undefined };
    allEffs.push(e);
    if (t.target in recIdx) recEffs[recIdx[t.target]].push(e);
    else if (t.target in clrIdx) clrEffs[clrIdx[t.target]].push(e);
    else if (t.target in poolIdx) poolEffs[poolIdx[t.target]].push(e);
    else throw new Error(`Unknown target ${t.target} for drug ${d.id}`);
  }
});

// ---------- state ----------
export interface State {
  level: Float64Array; // per pool (raw)
  store: Float64Array; // per pool vesicular store 0..1
  density: Float64Array; // per receptor
  stimSlow: Float64Array; // slow average of stimulation per receptor
  plasticity: number;
  gut: Float64Array; // per drug
  c1: Float64Array; // per drug: blood, fast-leaving share
  c2: Float64Array; // per drug: blood, slow-leaving share
  ce: Float64Array; // per drug: brain (effect site)
  tol: Float64Array; // per drug: acute tolerance
  conc: Float64Array; // per drug: what receptors see (brain level after acute tolerance)
  enzyme: Float64Array; // per irreversible drug effect: fraction of enzyme left
  gluSlow: number;
  htSlow: number; // 3-day average of 5-HT1A (hippocampus) signalling
  grSlow: number; // 3-day average of cortisol (GR) signalling: chronic stress, not the daily rhythm
  satiety: number;
  hangover: number;
  afterglow: number; // post-exercise lift, builds while exercising and fades over a couple of hours
  lastWake: number;
  wasAsleep: boolean;
}

function freshState(): State {
  return {
    level: new Float64Array(pools.length).fill(1),
    store: new Float64Array(pools.length).fill(1),
    density: new Float64Array(receptors.length).fill(1),
    stimSlow: new Float64Array(receptors.length).fill(1),
    plasticity: 1,
    gut: new Float64Array(drugs.length),
    c1: new Float64Array(drugs.length),
    c2: new Float64Array(drugs.length),
    ce: new Float64Array(drugs.length),
    tol: new Float64Array(drugs.length),
    conc: new Float64Array(drugs.length),
    enzyme: new Float64Array(allEffs.length).fill(1),
    gluSlow: 1,
    grSlow: 1,
    htSlow: 1,
    satiety: 0.3,
    hangover: 0,
    afterglow: 0,
    lastWake: -10000,
    wasAsleep: false,
  };
}

function cloneState(s: State): State {
  return {
    level: s.level.slice(), store: s.store.slice(), density: s.density.slice(), stimSlow: s.stimSlow.slice(),
    plasticity: s.plasticity, gut: s.gut.slice(), c1: s.c1.slice(), c2: s.c2.slice(), ce: s.ce.slice(), tol: s.tol.slice(), conc: s.conc.slice(), enzyme: s.enzyme.slice(), gluSlow: s.gluSlow, grSlow: s.grSlow, htSlow: s.htSlow, satiety: s.satiety, hangover: s.hangover, afterglow: s.afterglow, lastWake: s.lastWake, wasAsleep: s.wasAsleep,
  };
}

/** Awake-time means (used for display and firing rules) and 24 h means (used by homeostasis). */
interface Refs { pool: Float64Array; rec: Float64Array; firing: Float64Array; rec24: Float64Array }

// ---------- schedule helpers ----------
export function isAsleep(t: number, p: Profile, overrides: SleepOverride[] | undefined): boolean {
  const day = Math.floor(t / MIN_PER_DAY);
  const def = p.sleep ?? { bed: 23, wake: 31 };
  for (let d = day - 1; d <= day; d++) {
    const o = overrides?.find((x) => x.night === d);
    const s = o ? o : def;
    const start = (d * 24 + s.bed) * 60;
    const end = (d * 24 + s.wake) * 60;
    if (t >= start && t < end) return true;
  }
  return false;
}

// ---------- one simulation pass ----------
interface Ctx {
  profile: Profile;
  refs: Refs;
  doses: Dose[];
  events: InputEvent[];
  sleepOverrides?: SleepOverride[];
  meals?: number[];
  adaptAccel: number;
  adapt: boolean;
}

/** Scratch values from the latest step, exposed for recording. */
interface Scratch {
  firing: Float64Array;
  stim: Float64Array; // per receptor: signal / density
  stimRaw: Float64Array; // per receptor: stimulation without acute tolerance (what slow adaptation sees)
  signal: Float64Array;
  occ: Float64Array; // per drug: generic occupancy-like level C/(C+1)
  tolf: Float64Array; // per drug: response left after acute tolerance
  inputs: Float64Array;
  states: Float64Array;
  agonHt2a: number;
  blockNmda: number;
  agonCb1: number;
  agonMu: number;
  blockA2a: number;
  sensoryLoad: number;
}

function newScratch(): Scratch {
  return {
    firing: new Float64Array(nuclei.length).fill(1),
    stim: new Float64Array(receptors.length).fill(1),
    stimRaw: new Float64Array(receptors.length).fill(1),
    signal: new Float64Array(receptors.length).fill(1),
    occ: new Float64Array(drugs.length),
    tolf: new Float64Array(drugs.length).fill(1),
    inputs: new Float64Array(INPUT_IDS.length),
    states: new Float64Array(STATE_KEYS.length),
    agonHt2a: 0, blockNmda: 0, agonCb1: 0, agonMu: 0, blockA2a: 0, sensoryLoad: 0,
  };
}

function step(s: State, t: number, ctx: Ctx, sc: Scratch) {
  const p = ctx.profile;
  const dt = 1;
  // --- doses entering the gut ---
  for (const d of ctx.doses) if (d.at === t) s.gut[drugIdx[d.drug]] += d.amount;
  // --- PK ---
  const x: DrugPkState = { gut: 0, c1: 0, c2: 0, ce: 0, tol: 0 };
  for (let i = 0; i < drugs.length; i++) {
    if (s.gut[i] === 0 && s.c1[i] + s.c2[i] < 1e-6 && s.ce[i] < 1e-6 && s.tol[i] < 1e-4) {
      s.c1[i] = s.c2[i] = s.ce[i] = s.conc[i] = s.tol[i] = 0; sc.occ[i] = 0; sc.tolf[i] = 1; continue;
    }
    x.gut = s.gut[i]; x.c1 = s.c1[i]; x.c2 = s.c2[i]; x.ce = s.ce[i]; x.tol = s.tol[i];
    pkStep(drugs[i], pkFor(drugs[i].id), x, dt);
    s.gut[i] = x.gut; s.c1[i] = x.c1; s.c2[i] = x.c2; s.ce[i] = x.ce; s.tol[i] = x.tol;
    s.conc[i] = x.ce;
    sc.tolf[i] = tolFactor(drugs[i], x.tol);
    sc.occ[i] = (s.conc[i] / (s.conc[i] + 1)) * sc.tolf[i];
  }
  // irreversible blockers destroy enzyme; it comes back only as new enzyme is made
  for (const e of allEffs) if (e.irr) {
    const E = s.enzyme[e.id];
    s.enzyme[e.id] = Math.max(0, Math.min(1, E + (e.irr.ksyn * (1 - E) - e.irr.kinact * s.conc[e.drug] * E) * dt));
  }
  const occRaw = (e: Eff) => {
    if (e.irr) return 1 - s.enzyme[e.id];
    const c = s.conc[e.drug];
    return c > 0 ? occupancy(c, e.ec50, e.hill) : 0;
  };
  const occOf = (e: Eff) => {
    if (e.irr) return 1 - s.enzyme[e.id];
    const c = s.conc[e.drug];
    return c > 0 ? occupancy(c, e.ec50, e.hill) * sc.tolf[e.drug] : 0;
  };

  // --- clock & states ---
  const h = ((t % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY / 60;
  const asleep = isAsleep(t, p, ctx.sleepOverrides);
  if (s.wasAsleep && !asleep) s.lastWake = t;
  s.wasAsleep = asleep;
  const sinceWake = t - s.lastWake;
  sc.states[0] = asleep ? 1 : 0;
  sc.states[1] = 0.5 + 0.5 * Math.cos((2 * Math.PI * (h - 17)) / 24);
  // stress-hormone day rhythm: rises from ~03:00, peaks ~08:00, falls slowly to a nadir around midnight
  const dh = ((h - 8 + 36) % 24) - 12;
  sc.states[2] = Math.exp(-((dh / (dh < 0 ? 3 : 7)) ** 2));
  sc.states[3] = asleep ? 0 : Math.exp(-(((sinceWake - 30) / 25) ** 2));
  // the body clock's night signal: from ~21:00, peaking ~03:00, gone by ~09:00 (drives melatonin; light suppresses it)
  sc.states[4] = Math.max(0, Math.cos((2 * Math.PI * (h - 3)) / 24)) ** 1.5;
  // sleep inertia: grogginess for the first hour after waking
  sc.states[8] = asleep ? 0 : Math.exp(-sinceWake / 40);

  // --- inputs ---
  sc.inputs.fill(0);
  for (let i = 0; i < INPUT_IDS.length; i++) sc.inputs[i] = p.inputs?.[INPUT_IDS[i]] ?? 0;
  for (const e of ctx.events) if (t >= e.at && t < e.at + e.duration) sc.inputs[INPUT_IDS.indexOf(e.input)] += e.intensity;
  if (asleep) { sc.inputs[INPUT_IDS.indexOf('sensory')] = 0; sc.inputs[INPUT_IDS.indexOf('sunlight')] = 0; }
  const gain = p.sensoryGain ?? 1;
  sc.inputs[INPUT_IDS.indexOf('sensory')] *= gain;
  if (p.inputGain) for (let i = 0; i < INPUT_IDS.length; i++) sc.inputs[i] *= p.inputGain[INPUT_IDS[i]] ?? 1;

  // --- meals & fullness ---
  const meal = !asleep && (ctx.meals ? ctx.meals.some((m) => t >= m && t < m + 30) : MEALS.some((m) => h >= m && h < m + 0.5)) ? 1 : 0;
  s.satiety += (0.03 * meal + 0.02 * sc.inputs[INPUT_IDS.indexOf('food')] - s.satiety / 200) * dt;
  sc.states[5] = s.satiety;
  sc.states[6] = meal;
  // hangover (dehydration, acetaldehyde, inflammation): builds with alcohol exposure, felt as the alcohol leaves
  const alc = s.conc[ALCOHOL];
  s.hangover += (0.0012 * alc - s.hangover / 600) * dt;
  sc.states[7] = s.hangover * Math.exp(-2 * alc);
  // exercise afterglow: the better mood and calm that outlast a workout by an hour or two
  s.afterglow += (0.012 * Math.min(1.6, sc.inputs[INPUT_IDS.indexOf('exercise')]) - s.afterglow / 100) * dt;
  sc.states[9] = s.afterglow;

  // --- receptor signals ---
  sc.agonHt2a = 0; sc.blockNmda = 0; sc.agonCb1 = 0; sc.agonMu = 0; sc.blockA2a = 0;
  for (let r = 0; r < receptors.length; r++) {
    const endo = s.level[recPool[r]];
    // acute tolerance weakens the response, not the binding; slow adaptation sees the full drug exposure
    let orth = 0, agon = 0, pam = 0, agonRaw = 0, pamRaw = 0, nam = 0, namRaw = 0;
    for (const e of recEffs[r]) {
      const o = occRaw(e), tf = sc.tolf[e.drug];
      if (e.action === 'agonist') { orth += o; agon += o * tf * e.eff; agonRaw += o * e.eff; }
      else if (e.action === 'antagonist') orth += o * e.endo;
      else if (e.action === 'pam') { pam += o * tf * e.eff; pamRaw += o * e.eff; }
      else if (e.action === 'nam') { nam += o * tf * e.eff; namRaw += o * e.eff; }
    }
    orth = Math.min(orth, 0.97);
    // a competitive antagonist displaces agonist drugs as well (that is how naloxone reverses an overdose)
    let ant = 0;
    for (const e of recEffs[r]) if (e.action === 'antagonist') ant += occOf(e);
    agon *= 1 - Math.min(ant, 0.97);
    agonRaw *= 1 - Math.min(ant, 0.97);
    // a negative allosteric modulator damps the response to both the body's own transmitter and agonist drugs
    const damp = 1 - Math.min(nam, 0.9);
    const stim = (endo * (1 - orth) * (1 + pam) + agon * EMAX) * damp;
    sc.stim[r] = stim;
    sc.stimRaw[r] = (endo * (1 - orth) * (1 + pamRaw) + agonRaw * EMAX) * (1 - Math.min(namRaw, 0.9));
    sc.signal[r] = stim * s.density[r];
    const id = receptors[r].id;
    if (id === 'ht2a') sc.agonHt2a = agon;
    if (id === 'nmda') sc.blockNmda = orth;
    if (id === 'a2a') sc.blockA2a = orth;
    if (id === 'cb1') sc.agonCb1 = agon * damp;
    if (id === 'mu') sc.agonMu = agon;
  }

  // --- nucleus firing ---
  for (let n = 0; n < nuclei.length; n++) {
    let z = 0;
    for (const m of nucMods[n]) {
      if (m.kind === 'rec' || m.kind === 'pool') {
        const x = m.kind === 'rec' ? sc.signal[m.idx] / ctx.refs.rec[m.idx] : s.level[m.idx] / ctx.refs.pool[m.idx];
        z += m.w * (m.log ? Math.log(Math.max(0.05, x)) : Math.min(x, 6) - 1);
      } else if (m.kind === 'input') z += m.w * (m.above != null ? Math.max(0, sc.inputs[m.idx] - m.above) : sc.inputs[m.idx]);
      else z += m.w * sc.states[m.idx];
    }
    const base = (nuclei[n].base ?? 1) * (p.firing?.[nuclei[n].id] ?? 1);
    sc.firing[n] = base * Math.exp(Math.max(-8, Math.min(4, z)));
  }

  // --- pools ---
  let sleepDisrupt = 0;
  for (let i = 0; i < drugs.length; i++) if (drugs[i].sleepDisruption) sleepDisrupt += sc.occ[i] * 2 * drugs[i].sleepDisruption!;
  sleepDisrupt = Math.min(0.8, sleepDisrupt);
  for (let i = 0; i < pools.length; i++) {
    if (i === ADEN) {
      const A = s.level[i];
      const ex = sc.inputs[INPUT_IDS.indexOf('exercise')];
      s.level[i] = asleep
        ? A - ((A - A_MIN) / TAU_SLEEP) * (1 - sleepDisrupt) * dt
        : A + ((A_MAX - A) / TAU_WAKE) * (1 + 0.8 * ex) * dt;
      continue;
    }
    const pool = pools[i];
    let boost = 0;
    for (const e of poolEffs[i]) if (e.action === 'releaser') boost += occOf(e) * e.eff;
    const fire = sc.firing[poolSource[i]];
    // with MAO blocked, less transmitter is destroyed inside the neuron, so more is packed and released
    let mao = 0;
    if (poolHasMao[i]) { for (const e of clrEffs[MAO]) mao += occOf(e); mao = Math.min(mao, 0.97); }
    // releasers push transmitter out through reversed transporters, independent of firing (so autoreceptor feedback cannot stop it)
    const rel = (s.store[i] * (fire * (1 + MAO_STORE * mao) + boost)) / pool.tau;
    let k = 0;
    for (const c of pool.clearance) {
      const ci = clrIdx[c.by];
      let block = 0;
      for (const e of clrEffs[ci]) block += occOf(e);
      block = Math.min(block, 0.97);
      k += c.frac * (p.clearers?.[c.by] ?? 1) * (1 - block);
    }
    k /= pool.tau;
    s.level[i] = (s.level[i] + dt * rel) / (1 + dt * k);
    s.store[i] += ((1 - s.store[i]) / pool.storeTau - K_DRAIN * s.store[i] * boost) * dt;
    s.store[i] = Math.max(0.02, Math.min(1, s.store[i]));
  }

  // --- sensory load (E/I cartoon) ---
  const glu = s.level[poolIdx['glu']] / ctx.refs.pool[poolIdx['glu']];
  const gaba = s.level[poolIdx['gaba']] / ctx.refs.pool[poolIdx['gaba']];
  // THC turns up sensory intensity (sounds, lights, touch feel stronger) once past a light dose
  const thcGain = 1 + Math.min(1, Math.max(0, sc.agonCb1 - 0.22));
  sc.sensoryLoad = Math.max(0, sc.inputs[INPUT_IDS.indexOf('sensory')] * thcGain * (glu / Math.max(gaba, 0.2)) - 0.3);

  // --- adaptation ---
  if (ctx.adapt) {
    for (let r = 0; r < receptors.length; r++) {
      const rc = receptors[r];
      const avgTau = Math.min(rc.adaptTau / 3, 8 * 60);
      s.stimSlow[r] += ((sc.stimRaw[r] - s.stimSlow[r]) / avgTau) * dt;
      if (rc.adaptStrength <= 0) continue;
      const rel = Math.max(0.05, s.stimSlow[r] / ctx.refs.rec24[r]);
      // some receptors only upregulate (e.g. adenosine receptors under caffeine; chronic sleep loss is not compensated)
      const target = (p.receptors?.[rc.id] ?? 1) * Math.pow(rc.adaptUpOnly ? Math.min(1, rel) : rel, -rc.adaptStrength);
      s.density[r] += ((target - s.density[r]) / rc.adaptTau) * ctx.adaptAccel * dt;
      s.density[r] = Math.max(0.1, Math.min(4, s.density[r]));
    }
    // --- plasticity (slow neurotrophic cartoon) ---
    // slow averages, so daily rhythms cancel and only sustained shifts count (3-day averages are plain time averages,
    // never sped up by the warm-up, or they would follow the daily rhythm)
    const slow = (id: string) => { const r = recIdx[id]; return (s.stimSlow[r] * s.density[r]) / ctx.refs.rec24[r]; };
    s.gluSlow += ((glu - s.gluSlow) / (3 * MIN_PER_DAY)) * dt;
    const htI = recIdx['ht1a_post'];
    s.htSlow += ((sc.signal[htI] / ctx.refs.rec24[htI] - s.htSlow) / (3 * MIN_PER_DAY)) * dt;
    const grI = recIdx['gr'];
    s.grSlow += ((sc.signal[grI] / ctx.refs.rec24[grI] - s.grSlow) / (3 * MIN_PER_DAY)) * dt;
    const drive =
      ht1aDrive(s.htSlow) +
      0.006 * Math.max(0, glu / s.gluSlow - 1.6) +
      0.0018 * sc.agonHt2a +
      0.0004 * sc.inputs[INPUT_IDS.indexOf('exercise')] +
      0.00008 * sc.inputs[INPUT_IDS.indexOf('sunlight')] +
      6e-5 * Math.max(0, slow('d2_str') - 1.15) -
      4e-5 * Math.max(0, s.grSlow / GR_TYPICAL - 1.1);
    const pBase = p.plasticity ?? 1;
    s.plasticity += (drive - (s.plasticity - pBase) / TAU_PLAST) * ctx.adaptAccel * dt;
    s.plasticity = Math.max(0.2, Math.min(2.5, s.plasticity));
  }
}

// Serotonin's push on plasticity has a dead zone: small acute rises do little,
// sustained large rises (after autoreceptor desensitisation) do a lot.
function ht1aDrive(x: number) {
  // (the dead zone spans the normal day–night swing on both sides, so a typical day is neutral)
  return x < 0.95 ? 5e-5 * (x - 0.95) : 6e-5 * Math.max(0, x - 1.4);
}

// ---------- references (typical brain) ----------
let refsCache: Refs | null = null;
export function typicalRefs(): Refs {
  if (refsCache) return refsCache;
  let refs: Refs = {
    pool: new Float64Array(pools.length).fill(1),
    rec: new Float64Array(receptors.length).fill(1),
    firing: new Float64Array(nuclei.length).fill(1),
    rec24: new Float64Array(receptors.length).fill(1),
  };
  const s = freshState();
  const sc = newScratch();
  const ctx: Ctx = { profile: profileById['typical'], refs, doses: [], events: [], adaptAccel: 1, adapt: false };
  for (let iter = 0; iter < 5; iter++) {
    const accP = new Float64Array(pools.length), accR = new Float64Array(receptors.length);
    const accF = new Float64Array(nuclei.length), acc24 = new Float64Array(receptors.length);
    let awake = 0;
    const start = iter * 2 * MIN_PER_DAY;
    for (let t = start; t < start + 2 * MIN_PER_DAY; t++) {
      step(s, t, ctx, sc);
      if (t < start + MIN_PER_DAY) continue;
      for (let i = 0; i < receptors.length; i++) acc24[i] += sc.signal[i];
      if (sc.states[0] > 0.5) continue;
      awake++;
      for (let i = 0; i < pools.length; i++) accP[i] += s.level[i];
      for (let i = 0; i < receptors.length; i++) accR[i] += sc.signal[i];
      for (let i = 0; i < nuclei.length; i++) accF[i] += sc.firing[i];
    }
    refs = {
      pool: accP.map((v) => v / awake),
      rec: accR.map((v) => v / awake),
      firing: accF.map((v) => v / awake),
      rec24: acc24.map((v) => v / MIN_PER_DAY),
    };
    ctx.refs = refs;
  }
  return (refsCache = refs);
}

// ---------- warm-up per profile ----------
const warmCache: Record<string, State> = {};
function warmState(profile: Profile, cacheKey: string): State {
  if (warmCache[cacheKey]) return cloneState(warmCache[cacheKey]);
  const refs = typicalRefs();
  const s = freshState();
  const sc = newScratch();
  const ctx: Ctx = { profile, refs, doses: [], events: [], adaptAccel: 12, adapt: true };
  let t = 0;
  for (; t < 20 * MIN_PER_DAY; t++) step(s, t, ctx, sc);
  ctx.adaptAccel = 1;
  for (; t < 24 * MIN_PER_DAY; t++) step(s, t, ctx, sc);
  s.lastWake -= t; // re-base to t = 0
  warmCache[cacheKey] = cloneState(s);
  return s;
}

// ---------- public run ----------
export function seriesKeys(): string[] {
  return [
    ...pools.map((p) => `pool:${p.id}`),
    ...pools.map((p) => `store:${p.id}`),
    ...receptors.map((r) => `rec:${r.id}`),
    ...receptors.map((r) => `dens:${r.id}`),
    ...nuclei.map((n) => `fire:${n.id}`),
    ...drugs.map((d) => `drug:${d.id}`),
    ...readoutDefs.map((r) => `read:${r.id}`),
    ...INPUT_IDS.map((i) => `input:${i}`),
    'state:asleep', 'state:circadian', 'state:sensory_load',
    'state:hpa_rhythm', 'state:car', 'state:dark', 'state:satiety', 'state:meal', 'state:hangover', 'state:inertia', 'state:afterglow',
    'agon:ht2a', 'block:nmda', 'agon:cb1', 'agon:mu', 'block:a2a', 'plasticity', 'ei:inhib',
  ];
}

export function runSim(cfg: SimConfig): SimResult {
  const refs = typicalRefs();
  const profile = applyPersonality(profileById[cfg.profile], cfg.personality);
  const pers = Object.entries(cfg.personality ?? {}).filter(([, v]) => v).sort(([a], [b]) => a.localeCompare(b));
  const s = warmState(profile, JSON.stringify([cfg.profile, pers]));
  const dens0 = s.density.slice();
  const sc = newScratch();
  const total = Math.round(cfg.days * MIN_PER_DAY);
  const every = cfg.sampleEvery ?? (cfg.days <= 3 ? 5 : cfg.days <= 14 ? 15 : 30);
  const n = Math.floor(total / every) + 1;
  const keys = seriesKeys();
  const series: Record<string, Float32Array> = {};
  for (const k of keys) series[k] = new Float32Array(n);
  const tArr = new Float64Array(n);
  const ctx: Ctx = {
    profile, refs, doses: cfg.doses.map((d) => ({ ...d, at: Math.round(d.at) })),
    events: cfg.events, sleepOverrides: cfg.sleepOverrides, meals: cfg.meals, adaptAccel: 1, adapt: true,
  };

  const vals: Record<string, number> = {};
  const get = (k: string) => vals[k] ?? 0;
  let si = 0;
  for (let t = 0; t <= total; t++) {
    step(s, t, ctx, sc);
    if (t % every !== 0) continue;
    pools.forEach((p, i) => { vals[`pool:${p.id}`] = s.level[i] / refs.pool[i]; vals[`store:${p.id}`] = s.store[i]; });
    // supplements add to the blood level of their hormone
    drugs.forEach((d, i) => { if (d.bloodLevel) vals[`pool:${d.bloodLevel.pool}`] += d.bloodLevel.scale * s.conc[i]; });
    receptors.forEach((r, i) => { vals[`rec:${r.id}`] = sc.signal[i] / refs.rec[i]; vals[`dens:${r.id}`] = s.density[i] / dens0[i]; });
    nuclei.forEach((nu, i) => { vals[`fire:${nu.id}`] = sc.firing[i] / refs.firing[i]; });
    drugs.forEach((d, i) => { vals[`drug:${d.id}`] = s.conc[i]; });
    INPUT_IDS.forEach((id, i) => { vals[`input:${id}`] = sc.inputs[i]; });
    vals['state:asleep'] = sc.states[0];
    vals['state:circadian'] = sc.states[1];
    vals['state:sensory_load'] = sc.sensoryLoad;
    vals['state:hpa_rhythm'] = sc.states[2];
    vals['state:car'] = sc.states[3];
    vals['state:dark'] = sc.states[4];
    vals['state:inertia'] = sc.states[8];
    vals['state:satiety'] = sc.states[5];
    vals['state:meal'] = sc.states[6];
    vals['state:hangover'] = sc.states[7];
    vals['state:afterglow'] = sc.states[9];
    vals['agon:ht2a'] = sc.agonHt2a;
    vals['block:nmda'] = sc.blockNmda;
    vals['agon:cb1'] = sc.agonCb1;
    vals['agon:mu'] = sc.agonMu;
    vals['block:a2a'] = sc.blockA2a;
    // brakes relative to excitement: GABA that merely follows excitation (feedback inhibition) cancels out,
    // extra braking (alcohol, Valium) or missing braking (ketamine) does not
    vals['ei:inhib'] = (0.7 * vals['rec:gabaa'] + 0.3 * vals['rec:gabaa_ex']) / Math.pow(Math.max(0.2, vals['pool:glu']), 1.5);
    vals['plasticity'] = s.plasticity;
    for (const r of readoutDefs) vals[`read:${r.id}`] = readout(r.id, get);
    for (const k of keys) series[k][si] = vals[k];
    tArr[si] = t;
    si++;
  }
  return { t: tArr, series, keys };
}

/** Values of every series at sample index i, as a getter for readouts. */
export function getterAt(res: SimResult, i: number) {
  return (k: string) => (k === 'const' ? 1 : res.series[k]?.[i] ?? 0);
}
