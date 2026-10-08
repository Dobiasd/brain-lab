// Calibrates readout weights (how signals become feelings) against the reference tables.
// Only runs with FIT=<output.json>. Two thirds of the entries are used for fitting, one third is held out.
// Weights stay near their hand-set values (log-space prior) and never change sign.
import { test } from 'vitest';
// @ts-ignore node types are not installed
import { writeFileSync, appendFileSync } from 'node:fs';
import { check, type Expectation } from './expectations';
import { focusParams, readoutDefs } from './readouts';

declare const process: { env: Record<string, string | undefined> };
const tables = import.meta.glob<Expectation[]>('./expectations/*.json', { eager: true, import: 'default' });

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

test.skipIf(!process.env.FIT)('fit readouts', () => {
  const log = (m: string) => appendFileSync(process.env.FIT + '.log', m + '\n');
  const all: Expectation[] = [];
  for (const [f, es] of Object.entries(tables)) if (!f.endsWith('known-gaps.json')) all.push(...es);
  const train = all.filter((e) => hash(JSON.stringify(e)) % 3 !== 0), val = all.filter((e) => hash(JSON.stringify(e)) % 3 === 0);
  const W = { high: 1.5, medium: 1, low: 0.3 };

  // parameters: θ per term weight (multiplicative), per readout scale, and focus params
  type P = { get: () => number; set: (v: number) => void; mult: boolean; v0: number; name: string };
  const ps: P[] = [];
  for (const r of readoutDefs) {
    ps.push({ name: `${r.id}.scale`, get: () => r.scale, set: (v) => { r.scale = v; }, mult: true, v0: r.scale });
    for (const t of r.terms) {
      if (t.key === 'state:asleep') continue;
      ps.push({ name: `${r.id}.${t.key}${t.mode ? '/' + t.mode : ''}`, get: () => t.w, set: (v) => { t.w = v; }, mult: t.key !== 'const', v0: t.w });
    }
  }
  for (const k of Object.keys(focusParams) as (keyof typeof focusParams)[]) {
    if (k === 'anxietyFrom') continue;
    ps.push({ name: `focus.${k}`, get: () => focusParams[k], set: (v) => { focusParams[k] = v; }, mult: k !== 'peak', v0: focusParams[k] });
  }
  const theta = ps.map(() => 0);
  const apply = () => ps.forEach((p, i) => p.set(p.mult ? p.v0 * Math.exp(theta[i]) : p.v0 + theta[i]));
  const score = (es: Expectation[]) => {
    let loss = 0, pass = 0, n = 0;
    for (const e of es) {
      const o = check(e);
      if (o.skipped) continue;
      n++; if (o.ok) pass++;
      const m = o.miss ?? (o.ok ? 0 : 10);
      loss += W[e.confidence] * (m / (m + 4));
    }
    return { loss, pass, n };
  };
  const LAMBDA = 0.15;
  const objective = () => { apply(); return score(train).loss + LAMBDA * theta.reduce((a, t) => a + t * t, 0); };

  apply();
  const t0 = score(train), v0 = score(val);
  log(`before: train ${t0.pass}/${t0.n} val ${v0.pass}/${v0.n}`);
  let best = objective();
  for (const step of [0.4, 0.2, 0.1]) {
    for (let round = 0; round < 2; round++) {
      let improved = 0;
      for (let i = 0; i < ps.length; i++) {
        for (const d of [step, -step]) {
          const old = theta[i];
          theta[i] = Math.max(-1.2, Math.min(1.2, old + d));
          const o = objective();
          if (o < best - 1e-6) { best = o; improved++; break; }
          theta[i] = old;
        }
      }
      apply();
      const tr = score(train), va = score(val);
      log(`step ${step} round ${round}: objective ${best.toFixed(2)}, improved ${improved}, train ${tr.pass}/${tr.n}, val ${va.pass}/${va.n}`);
      if (!improved) break;
    }
  }
  apply();
  const out = ps.map((p, i) => ({ name: p.name, from: p.v0, to: +p.get().toFixed(3), theta: +theta[i].toFixed(2) })).filter((x) => x.theta !== 0);
  writeFileSync(process.env.FIT!, JSON.stringify(out, null, 1));
}, 4 * 3600 * 1000);
