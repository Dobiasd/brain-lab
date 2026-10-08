// Qualitative behaviour tests: they check directions and shapes, not numbers.
import { describe, expect, test } from 'vitest';
import { profiles } from '../data/profiles';
import { runSim, type SimResult } from './engine';
import { scenarioById } from './scenarios';

const run = (id: string, over: Partial<(typeof scenarioById)[string]['config']> = {}) =>
  runSim({ ...scenarioById[id].config, ...over });

function at(r: SimResult, key: string, day: number, hour: number) {
  const t = (day * 24 + hour) * 60;
  let i = 0;
  while (i < r.t.length - 1 && r.t[i] < t) i++;
  return r.series[key][i];
}

function mean(r: SimResult, key: string, day: number, h0: number, h1: number) {
  let s = 0, n = 0;
  for (let i = 0; i < r.t.length; i++) {
    const h = r.t[i] / 60 - day * 24;
    if (h >= h0 && h < h1) { s += r.series[key][i]; n++; }
  }
  return s / n;
}

describe('caffeine', () => {
  test('masks sleepiness while adenosine keeps rising', () => {
    const r = run('coffee_bad_night');
    const b = run('coffee_bad_night', { doses: [] });
    expect(at(r, 'read:sleepiness', 1, 12)).toBeLessThan(at(b, 'read:sleepiness', 1, 12) - 15);
    expect(at(r, 'pool:adenosine', 1, 15)).toBeGreaterThan(at(r, 'pool:adenosine', 1, 9));
    // sleepiness climbs back as caffeine fades
    expect(at(r, 'read:sleepiness', 1, 20)).toBeGreaterThan(at(r, 'read:sleepiness', 1, 13) + 10);
  });

  test('daily use upregulates receptors; stopping causes withdrawal sleepiness', () => {
    const r = run('caffeine_tolerance');
    const noCaf = run('caffeine_tolerance', { doses: [] });
    expect(at(r, 'dens:a2a', 11, 12)).toBeGreaterThan(1.2);
    // tolerance: same coffee, less effect on day 11 than day 0
    expect(at(r, 'read:sleepiness', 11, 12)).toBeGreaterThan(at(r, 'read:sleepiness', 0, 12));
    // withdrawal: sleepier than someone who never drank coffee
    expect(at(r, 'read:sleepiness', 13, 12)).toBeGreaterThan(at(noCaf, 'read:sleepiness', 13, 12) + 3);
    // and it fades as density returns
    expect(at(r, 'dens:a2a', 17, 12)).toBeLessThan(at(r, 'dens:a2a', 12, 12));
  });
});

describe('methylphenidate (inverted U)', () => {
  test('improves focus in ADHD', () => {
    const r = run('mph_adhd');
    const b = run('mph_adhd', { doses: [] });
    expect(mean(r, 'read:focus', 0, 9, 12)).toBeGreaterThan(mean(b, 'read:focus', 0, 9, 12) + 25);
  });
  test('helps a typical brain much less than an ADHD brain', () => {
    const gain = (profile: string) => mean(run('mph_adhd', { profile }), 'read:focus', 0, 9, 12) - mean(run('mph_adhd', { profile, doses: [] }), 'read:focus', 0, 9, 12);
    expect(gain('adhd')).toBeGreaterThan(gain('typical') + 15);
    const r = run('mph_adhd', { profile: 'typical' });
    const b = run('mph_adhd', { profile: 'typical', doses: [] });
    expect(mean(r, 'read:arousal', 0, 9, 12)).toBeGreaterThan(mean(b, 'read:arousal', 0, 9, 12));
  });
  test('raises PFC dopamine mostly via NET', () => {
    const r = run('mph_adhd');
    expect(at(r, 'rec:d1_pfc', 0, 10)).toBeGreaterThan(at(r, 'rec:d1_pfc', 0, 7.9) * 1.3);
  });
});

describe('SSRI', () => {
  test('mood improves only over weeks, tracking autoreceptor desensitisation', () => {
    const r = run('ssri_6w');
    const m0 = at(r, 'read:mood', 0, 12);
    expect(at(r, 'read:mood', 3, 12) - m0).toBeLessThan(8);
    expect(at(r, 'read:mood', 35, 12) - m0).toBeGreaterThan(20);
    expect(at(r, 'fire:raphe', 2, 12)).toBeLessThan(at(r, 'fire:raphe', 0, 12) * 0.7);
    expect(at(r, 'dens:ht1a_auto', 30, 12)).toBeLessThan(at(r, 'dens:ht1a_auto', 1, 12) * 0.8);
    expect(at(r, 'fire:raphe', 40, 12)).toBeGreaterThan(at(r, 'fire:raphe', 3, 12));
  });
});

describe('stress', () => {
  test('HPA cascade peaks in order and negative feedback ends it', () => {
    const r = run('acute_stress');
    // time of the peak within the 3 h after the stressor
    const peakT = (k: string) => {
      let best = -1, bt = 0;
      for (let i = 0; i < r.t.length; i++) {
        if (r.t[i] < 14 * 60 || r.t[i] > 17 * 60) continue;
        if (r.series[k][i] > best) { best = r.series[k][i]; bt = r.t[i]; }
      }
      return bt;
    };
    expect(peakT('pool:crh')).toBeLessThan(peakT('pool:acth'));
    expect(peakT('pool:acth')).toBeLessThan(peakT('pool:cortisol'));
    expect(at(r, 'pool:cortisol', 0, 14.75)).toBeGreaterThan(at(r, 'pool:cortisol', 0, 13.9) * 1.5); // TSST-like stressors: ~1.5–4×
    expect(at(r, 'pool:cortisol', 0, 19)).toBeLessThan(at(r, 'pool:cortisol', 0, 14.75) * 0.5);
    expect(at(r, 'read:anxiety', 0, 14.2)).toBeGreaterThan(at(r, 'read:anxiety', 0, 13.5) + 20);
  });
  test('chronic stress weakens GR feedback and lowers mood; recovery is slow', () => {
    const r = run('chronic_stress');
    expect(at(r, 'dens:gr', 27, 12)).toBeLessThan(at(r, 'dens:gr', 0, 12) * 0.9);
    expect(mean(r, 'pool:cortisol', 27, 8, 20)).toBeGreaterThan(mean(r, 'pool:cortisol', 1, 8, 20));
    expect(at(r, 'read:mood', 27, 12)).toBeLessThan(at(r, 'read:mood', 0, 12) - 4);
    expect(at(r, 'plasticity', 32, 12)).toBeLessThan(at(r, 'plasticity', 41, 12));
  });
});

describe('alcohol', () => {
  test('acute calm, then next-morning rebound and worse sleep recovery', () => {
    const r = run('alcohol_night');
    const b = run('alcohol_night', { doses: [] });
    expect(at(r, 'read:anxiety', 0, 22)).toBeLessThan(at(b, 'read:anxiety', 0, 22) - 15);
    expect(at(r, 'dens:gabaa', 1, 9)).toBeLessThan(at(b, 'dens:gabaa', 1, 9));
    expect(mean(r, 'read:anxiety', 1, 9, 13)).toBeGreaterThan(mean(b, 'read:anxiety', 1, 9, 13));
    expect(at(r, 'pool:adenosine', 1, 7.5)).toBeGreaterThan(at(b, 'pool:adenosine', 1, 7.5));
  });
});

describe('releasers and opioids', () => {
  test('MDMA depletes serotonin stores; mood dips below baseline days later', () => {
    const r = run('mdma');
    const b = run('mdma', { doses: [], events: [] });
    expect(at(r, 'pool:ht', 0, 23.5)).toBeGreaterThan(1.5);
    expect(at(r, 'store:ht', 2, 14)).toBeLessThan(0.5);
    expect(at(r, 'read:mood', 2, 14)).toBeLessThan(at(b, 'read:mood', 2, 14));
  });
  test('opioid tolerance and LC rebound in withdrawal', () => {
    const r = run('opioid_tolerance');
    expect(at(r, 'read:analgesia', 9, 9)).toBeLessThan(at(r, 'read:analgesia', 0, 9) - 15);
    expect(mean(r, 'fire:lc', 11, 9, 20)).toBeGreaterThan(mean(r, 'fire:lc', 9, 9, 20) * 1.2);
  });
  test('ketamine lifts mood within a day', () => {
    const r = run('ketamine');
    expect(at(r, 'read:mood', 2, 12)).toBeGreaterThan(at(r, 'read:mood', 0, 12) + 6);
    expect(at(r, 'read:mood', 13, 12)).toBeLessThan(at(r, 'read:mood', 2, 12));
  });
});

describe('profiles', () => {
  test('higher sensory gain → more anxiety in a busy environment', () => {
    const a = run('sensory');
    const t = run('sensory', { profile: 'typical' });
    expect(at(a, 'read:anxiety', 0, 12.5)).toBeGreaterThan(at(t, 'read:anxiety', 0, 12.5) + 8);
  });
  test('every profile stays finite and non-negative over 60 days', () => {
    for (const p of profiles) {
      const r = runSim({ profile: p.id, days: 60, doses: [], events: [] });
      for (const k of r.keys) {
        const s = r.series[k];
        for (let i = 0; i < s.length; i++) {
          if (!Number.isFinite(s[i]) || s[i] < 0) throw new Error(`${p.id} ${k}[${i}] = ${s[i]}`);
        }
      }
    }
  });
});

describe('appetite', () => {
  test('hunger rises before meals and drops after', () => {
    const r = runSim({ profile: 'typical', days: 1, doses: [], events: [] });
    expect(at(r, 'read:hunger', 0, 12.4)).toBeGreaterThan(at(r, 'read:hunger', 0, 13.5) + 30);
  });
  test('Ozempic lowers appetite; cannabis raises it', () => {
    const oz = run('ozempic');
    const none = run('ozempic', { doses: [] });
    expect(mean(oz, 'read:hunger', 20, 8, 22)).toBeLessThan(mean(none, 'read:hunger', 20, 8, 22) - 15);
    const thc = runSim({ profile: 'typical', days: 1, doses: [{ drug: 'thc', at: 15 * 60, amount: 1 }], events: [] });
    const b = runSim({ profile: 'typical', days: 1, doses: [], events: [] });
    expect(at(thc, 'read:hunger', 0, 16)).toBeGreaterThan(at(b, 'read:hunger', 0, 16) + 4);
  });
});

describe('new substances and personality', () => {
  const one = (drug: string, hour = 20) => runSim({ profile: 'typical', days: 2, doses: [{ drug, at: hour * 60, amount: 1 }], events: [] });
  test('meth drains dopamine stores harder than amphetamine; heroin hits faster than morphine', () => {
    expect(at(one('methamphetamine'), 'store:da_str', 1, 14)).toBeLessThan(at(one('amphetamine'), 'store:da_str', 1, 14));
    expect(at(one('heroin'), 'read:analgesia', 0, 20.25)).toBeGreaterThan(at(one('morphine'), 'read:analgesia', 0, 20.25));
  });
  test('LSD lasts longer than psilocybin', () => {
    expect(at(one('lsd', 14), 'read:perception', 0, 21)).toBeGreaterThan(at(one('psilocybin', 14), 'read:perception', 0, 21) + 10);
  });
  test('higher neuroticism makes the same stress feel worse', () => {
    const ev = [{ input: 'stress' as const, at: 14 * 60, duration: 60, intensity: 1 }];
    const hi = runSim({ profile: 'typical', days: 1, doses: [], events: ev, personality: { neuroticism: 1 } });
    const lo = runSim({ profile: 'typical', days: 1, doses: [], events: ev, personality: { neuroticism: -1 } });
    expect(at(hi, 'read:anxiety', 0, 14.5)).toBeGreaterThan(at(lo, 'read:anxiety', 0, 14.5) + 5);
  });
});

describe('exercise intensity', () => {
  const day = (intensity: number, minutes = 60) =>
    runSim({ profile: 'typical', days: 1, doses: [], events: intensity ? [{ input: 'exercise', at: 17 * 60, duration: minutes, intensity }] : [] });
  const none = day(0), walk = day(0.4), runr = day(1), hard = day(1.6, 45);
  const peak = (r: SimResult, k: string) => Math.max(...Array.from(r.series[k]).filter((_, i) => r.t[i] >= 17 * 60 && r.t[i] <= 19 * 60));
  test('cortisol only rises clearly with hard effort', () => {
    const base = peak(none, 'pool:cortisol');
    expect(peak(walk, 'pool:cortisol')).toBeLessThan(base * 1.08);
    expect(peak(runr, 'pool:cortisol')).toBeGreaterThan(base * 1.15);
    expect(peak(hard, 'pool:cortisol')).toBeGreaterThan(peak(runr, 'pool:cortisol') * 1.3);
  });
  test('endorphins need intensity; endocannabinoids peak at moderate effort', () => {
    expect(peak(hard, 'pool:endorphin')).toBeGreaterThan(peak(runr, 'pool:endorphin') * 1.3);
    expect(peak(runr, 'pool:anandamide')).toBeGreaterThan(peak(hard, 'pool:anandamide'));
    expect(peak(runr, 'pool:anandamide')).toBeGreaterThan(peak(walk, 'pool:anandamide'));
  });
  test('a hard workout feels worse than a run at first', () => {
    expect(at(hard, 'read:mood', 0, 17.25)).toBeLessThan(at(runr, 'read:mood', 0, 17.25));
  });
  test('the mood lift outlasts the run (afterglow) but stays modest', () => {
    const lift = (h: number) => at(runr, 'read:mood', 0, h) - at(none, 'read:mood', 0, h);
    expect(lift(18)).toBeLessThan(30);
    expect(lift(18.5)).toBeGreaterThan(4);
    expect(lift(19)).toBeGreaterThan(2);
    expect(Math.abs(lift(23))).toBeLessThan(2);
  });
});

describe('meals', () => {
  test('skipping breakfast leaves you hungrier mid-morning', () => {
    const usual = runSim({ profile: 'typical', days: 1, doses: [], events: [] });
    const skip = runSim({ profile: 'typical', days: 1, doses: [], events: [], meals: [12.5 * 60, 19 * 60] });
    expect(at(skip, 'read:hunger', 0, 10.5)).toBeGreaterThan(at(usual, 'read:hunger', 0, 10.5) + 4);
    expect(at(skip, 'pool:ghrelin', 0, 10.5)).toBeGreaterThan(at(usual, 'pool:ghrelin', 0, 10.5));
  });
  test('an undefined meal plan equals the usual three meals', () => {
    const a = runSim({ profile: 'typical', days: 1, doses: [], events: [] });
    const b = runSim({ profile: 'typical', days: 1, doses: [], events: [], meals: [7.5 * 60, 12.5 * 60, 19 * 60] });
    expect(at(b, 'read:hunger', 0, 15)).toBeCloseTo(at(a, 'read:hunger', 0, 15), 5);
  });
});

describe('CBD', () => {
  const day = (doses: { drug: string; at: number; amount: number }[]) => runSim({ profile: 'typical', days: 1, doses, events: [] });
  const none = day([]);
  test('a clinical-sized dose calms a little without a motivation or appetite boost', () => {
    const big = day([{ drug: 'cbd', at: 10 * 60, amount: 20 }]);
    expect(at(big, 'read:anxiety', 0, 13)).toBeLessThan(at(none, 'read:anxiety', 0, 13) - 4);
    expect(at(big, 'read:motivation', 0, 13) - at(none, 'read:motivation', 0, 13)).toBeLessThan(8);
    expect(at(big, 'read:hunger', 0, 13) - at(none, 'read:hunger', 0, 13)).toBeLessThan(8);
  });
  test('takes the edge off THC anxiety', () => {
    const thc = day([{ drug: 'thc', at: 10.75 * 60, amount: 1 }]);
    const both = day([{ drug: 'thc', at: 10.75 * 60, amount: 1 }, { drug: 'cbd', at: 8 * 60, amount: 4 }]);
    expect(at(both, 'read:anxiety', 0, 11.5)).toBeLessThan(at(thc, 'read:anxiety', 0, 11.5) - 3);
  });
});

describe('THC and the senses', () => {
  const busy = [{ input: 'sensory' as const, at: 11 * 60, duration: 180, intensity: 1 }];
  const day = (amount: number) => runSim({ profile: 'autism', days: 1, events: busy, doses: amount ? [{ drug: 'thc', at: 10.75 * 60, amount }] : [] });
  test('a full joint turns up sensory overload in a busy place; a few puffs barely do', () => {
    const none = at(day(0), 'state:sensory_load', 0, 11.5);
    expect(at(day(1), 'state:sensory_load', 0, 11.5)).toBeGreaterThan(none * 1.1);
    expect(at(day(0.5), 'state:sensory_load', 0, 11.5)).toBeLessThan(none * 1.1);
  });
});
