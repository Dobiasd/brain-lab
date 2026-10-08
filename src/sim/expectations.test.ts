// Runs the independent reference tables against the model.
// The model is a cartoon and does not pass every entry, so this is a ratchet: each table must keep at least
// the number of passes recorded in expectations/baseline.json (raise it when the model improves), and every
// safety entry (breathing) must pass. Known, documented limitations are in expectations/known-gaps.json.
// REPORT=<file> writes a full pass/fail report (including low-confidence entries) for model work.
// @ts-ignore node types are not installed (tests run in node)
import { appendFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { check, describeOutcome, type Expectation } from './expectations';
import baseline from './expectations/baseline.json';
import gaps from './expectations/known-gaps.json';

declare const process: { env: Record<string, string | undefined> };

const tables = import.meta.glob<Expectation[]>('./expectations/*.json', { eager: true, import: 'default' });
const isGap = (line: string) => (gaps as { match: string; reason: string }[]).find((g) => line.startsWith(g.match));
const SKIP = ['known-gaps.json', 'baseline.json'];

describe('model matches the independent reference tables', () => {
  for (const [file, entries] of Object.entries(tables)) {
    const name = file.split('/').pop()!;
    if (SKIP.includes(name)) continue;
    test(name, () => {
      const unsafe: string[] = [];
      const report: string[] = [];
      let pass = 0, n = 0;
      for (const e of entries) {
        const o = check(e);
        if (o.skipped) { report.push(`SKIP ${file} ${o.skipped}`); continue; }
        n++; if (o.ok) pass++;
        const line = describeOutcome(o);
        const gap = isGap(line);
        if (!o.ok) report.push(`FAIL ${file} ${line}${gap ? ' {gap}' : ''} | ${e.why ?? ''}`);
        const safety = 'feeling' in e && e.feeling === 'breathing' && e.kind !== 'rank';
        if (!o.ok && safety && e.confidence !== 'low' && !gap) unsafe.push(line);
      }
      report.push(`SUM ${file} ${pass}/${n} pass`);
      if (process.env.REPORT) appendFileSync(process.env.REPORT, report.join('\n') + '\n');
      expect(unsafe).toEqual([]);
      const min = (baseline as Record<string, { pass: number }>)[name]?.pass ?? 0;
      expect(pass, `${name}: ${pass}/${n} passing, baseline ${min}`).toBeGreaterThanOrEqual(min);
    }, 900000);
  }
});
