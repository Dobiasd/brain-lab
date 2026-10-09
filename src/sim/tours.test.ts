import { describe, expect, test } from 'vitest';
import { regionById } from '../data/anatomy';
import { characters } from '../data/characters';
import { profileById } from '../data/profiles';
import { compareConfig, indexAt } from '../ui/compare';
import { feelingById, plainLabel } from '../ui/plain';
import { seriesInfo } from '../ui/labels';
import { getterAt, runSim, seriesKeys } from './engine';
import { narrate } from './narrate';
import { profilesFor, traceFeeling } from './chains';
import { scenarioById } from './scenarios';
import { tourById, tours } from './tours';

const keys = new Set(seriesKeys());

describe('tours', () => {
  test('every step points at a real moment, real charts, feelings and regions', () => {
    for (const t of tours) {
      const sc = scenarioById[t.scenario];
      expect(sc, t.id).toBeDefined();
      for (const s of t.steps) {
        expect(s.day * 24 + s.hour, `${t.id}: ${s.title}`).toBeLessThan(sc.config.days * 24);
        for (const k of s.charts) expect(keys.has(k), `${t.id}: chart ${k}`).toBe(true);
        for (const f of s.feelings) expect(feelingById[f], `${t.id}: feeling ${f}`).toBeDefined();
        for (const r of s.highlight ?? []) expect(regionById[r], `${t.id}: region ${r}`).toBeDefined();
        if (s.profile) expect(profileById[s.profile]).toBeDefined();
      }
    }
    for (const c of characters) if (c.tour) expect(tourById[c.tour], c.id).toBeDefined();
  });
});

function narrationAt(tourId: string, stepIdx: number) {
  const t = tourById[tourId];
  const s = t.steps[stepIdx];
  const cfg = { ...scenarioById[t.scenario].config, profile: s.profile ?? scenarioById[t.scenario].config.profile };
  const main = runSim(cfg);
  const base = runSim(compareConfig(cfg, t.compare)!);
  const i = indexAt(main.t, (s.day * 24 + s.hour) * 60);
  return narrate(getterAt(main, i), getterAt(base, i), getterAt(main, Math.max(0, i - 6)), cfg.profile, t.dashed, s.feelings);
}

describe('narration', () => {
  test('coffee: less sleepy because the tiredness signal is blocked', () => {
    const n = narrationAt('coffee', 1);
    expect(n.headline).toMatch(/less sleepy/);
    expect(n.headline).toMatch(/tiredness signal/);
    expect(n.details.join(' ')).toMatch(/Caffeine/);
  });
  test('ADHD: more focused; typical brain: overshoot', () => {
    expect(narrationAt('adhd', 1).headline).toMatch(/more focused/);
    expect(narrationAt('adhd', 3).headline).toMatch(/more alert|more focused/);
  });
  test('tolerance: mentions adapted receptors', () => {
    expect(narrationAt('tolerance', 3).details.join(' ')).toMatch(/adapted/);
  });
  test('asleep is described as sleep', () => {
    expect(narrationAt('coffee', 4).headline).toMatch(/asleep/);
  });
});

describe('chains', () => {
  const chainAt = (tourId: string, stepIdx: number) => {
    const t = tourById[tourId];
    const s = t.steps[stepIdx];
    const cfg = { ...scenarioById[t.scenario].config, profile: s.profile ?? scenarioById[t.scenario].config.profile };
    const cmp = compareConfig(cfg, t.compare)!;
    const main = runSim(cfg), base = runSim(cmp);
    const i = indexAt(main.t, (s.day * 24 + s.hour) * 60);
    const [pa, pb] = profilesFor(cfg.profile, undefined, cmp.profile, undefined);
    return traceFeeling(s.feelings[0], getterAt(main, i), getterAt(base, i), pa, pb, { now: main.t[i], doses: cfg.doses, events: cfg.events })
      .nodes.map((n) => n.label).join(' → ');
  };
  test('chains start at the real cause', () => {
    expect(chainAt('coffee', 1)).toMatch(/^Caffeine/);
    expect(chainAt('healthy', 1)).toMatch(/^Exercise/);
    expect(chainAt('healthy', 2)).toMatch(/^Social connection/);
    expect(chainAt('mdma', 2)).toMatch(/reserves/);
    expect(chainAt('tolerance', 3)).toMatch(/^More receptors/);
    expect(chainAt('ketamine', 1)).toMatch(/^Ketamine/);
    expect(chainAt('hangxiety', 2)).toMatch(/^Alcohol/);
  });
});

// What each step's text claims, checked against the model. 'same' = within ±5 points.
const claims: Record<string, Record<number, [string, 'up' | 'down' | 'same']>> = {
  coffee: { 1: ['sleepiness', 'down'], 2: ['sleepiness', 'down'] },
  tolerance: { 0: ['sleepiness', 'down'], 3: ['sleepiness', 'up'] },
  hangxiety: { 0: ['anxiety', 'down'], 3: ['anxiety', 'up'] },
  stress: { 1: ['anxiety', 'up'], 3: ['anxiety', 'same'] },
  chronic: { 1: ['anxiety', 'up'], 2: ['mood', 'down'] },
  adhd: { 1: ['focus', 'up'], 3: ['arousal', 'up'] },
  ssri: { 1: ['mood', 'same'], 3: ['mood', 'up'], 4: ['mood', 'up'] },
  mdma: { 0: ['mood', 'up'], 2: ['mood', 'down'] },
  healthy: { 1: ['mood', 'up'], 2: ['bonding', 'up'] },
  sensory: { 1: ['anxiety', 'up'] },
  opioids: { 0: ['analgesia', 'up'], 2: ['anxiety', 'up'] },
  ozempic: { 0: ['hunger', 'same'], 1: ['hunger', 'down'] },
  ketamine: { 1: ['mood', 'up'] },
};

describe('tour texts match the model', () => {
  test('each claimed direction holds at its step', () => {
    const problems: string[] = [];
    for (const [tourId, steps] of Object.entries(claims)) {
      const t = tourById[tourId];
      for (const [idx, [feeling, dir]] of Object.entries(steps)) {
        const s = t.steps[+idx];
        const cfg = { ...scenarioById[t.scenario].config, profile: s.profile ?? scenarioById[t.scenario].config.profile };
        const main = runSim(cfg), base = runSim(compareConfig(cfg, t.compare)!);
        const i = indexAt(main.t, (s.day * 24 + s.hour) * 60);
        const d = main.series[`read:${feeling}`][i] - base.series[`read:${feeling}`][i];
        const ok = dir === 'up' ? d > 2 : dir === 'down' ? d < -2 : Math.abs(d) <= 5;
        if (!ok) problems.push(`${tourId} step ${+idx + 1} "${s.title}": ${feeling} ${dir}, but Δ = ${d.toFixed(1)}`);
      }
    }
    expect(problems).toEqual([]);
  }, 60000);
  test('the stress hormone chain step traces back through cortisol', () => {
    const t = tourById.stress, s = t.steps[2];
    const cfg = scenarioById[t.scenario].config;
    const cmp = compareConfig(cfg, t.compare)!;
    const main = runSim(cfg), base = runSim(cmp);
    const i = indexAt(main.t, (s.day * 24 + s.hour) * 60);
    const [pa, pb] = profilesFor(cfg.profile, undefined, cmp.profile, undefined);
    const chain = traceFeeling(s.feelings[0], getterAt(main, i), getterAt(base, i), pa, pb, { now: main.t[i], doses: cfg.doses, events: cfg.events });
    expect(chain.nodes.map((n) => n.label).join(' → ')).toMatch(/cortisol/i);
  });
});

describe('labels', () => {
  test('every recorded signal has a plain and a technical label', () => {
    for (const k of seriesKeys()) {
      expect(() => plainLabel(k), k).not.toThrow();
      expect(plainLabel(k).length, k).toBeGreaterThan(0);
      expect(seriesInfo(k).label.length, k).toBeGreaterThan(0);
    }
  });
});

describe('cannabis tours tell the model\'s story', () => {
  const deltaAt = (tourId: string, stepIdx: number, feeling: string) => {
    const t = tourById[tourId], s = t.steps[stepIdx];
    const cfg = scenarioById[t.scenario].config;
    const main = runSim(cfg), base = runSim(compareConfig(cfg, t.compare)!);
    const i = indexAt(main.t, (s.day * 24 + s.hour) * 60);
    return main.series[`read:${feeling}`][i] - base.series[`read:${feeling}`][i];
  };
  test('THC in a busy place: more anxious at the peak, about the same later', () => {
    expect(deltaAt('thc_busy', 0, 'anxiety')).toBeGreaterThan(3);
    expect(Math.abs(deltaAt('thc_busy', 1, 'anxiety'))).toBeLessThan(3);
  });
  test('CBD: a shop dose does nothing, a study dose calms a little without a high', () => {
    expect(Math.abs(deltaAt('cbd', 0, 'anxiety'))).toBeLessThan(2);
    expect(deltaAt('cbd', 1, 'anxiety')).toBeLessThan(-3);
    expect(Math.abs(deltaAt('cbd', 1, 'perception'))).toBeLessThan(1);
  });
});

describe('sleep aid tour tells the model\'s story', () => {
  const deltaAt = (stepIdx: number, feeling: string) => {
    const t = tourById.sleep_aid, s = t.steps[stepIdx];
    const cfg = scenarioById[t.scenario].config;
    const main = runSim(cfg), base = runSim(compareConfig(cfg, t.compare)!);
    const i = indexAt(main.t, (s.day * 24 + s.hour) * 60);
    return main.series[`read:${feeling}`][i] - base.series[`read:${feeling}`][i];
  };
  test('drowsy on the first night, foggy next morning, much less after a few nights', () => {
    expect(deltaAt(0, 'sleepiness')).toBeGreaterThan(5);
    expect(deltaAt(1, 'focus')).toBeLessThan(-10);
    expect(deltaAt(2, 'focus')).toBeGreaterThan(deltaAt(1, 'focus') / 3);
    expect(deltaAt(3, 'sleepiness')).toBeLessThan(deltaAt(0, 'sleepiness'));
  });
});

describe('shareable links', () => {
  test('every tour and page has its own address, and they do not clash', async () => {
    const { hashFor, pageViews, parseHash } = await import('../ui/route');
    for (const t of tours) {
      expect(pageViews as string[], t.id).not.toContain(t.id);
      expect(t.id, t.id).toMatch(/^[a-z0-9_]+$/);
      expect(parseHash(hashFor('tour', t.id))).toEqual({ view: 'tour', tourId: t.id });
    }
    for (const v of pageViews) expect(parseHash(hashFor(v, 'coffee')).view).toBe(v);
    expect(hashFor('home', 'coffee')).toBe('');
    expect(parseHash('').view).toBe('home');
    expect(parseHash('#no-such-thing').view).toBe('home');
  });
});
