// Turns the model state at one moment into a few plain-language sentences.
import { pools, receptors } from '../data/chemistry';
import { drugs } from '../data/drugs';
import type { Drug } from '../data/types';
import { feelingById, drugPlainName } from '../ui/plain';
import { contributions, readoutDefs } from './readouts';

type Get = (k: string) => number;

// What each modelled term "is", in everyday words.
const termNoun: Record<string, string> = {
  'rec:alpha1': 'the alarm chemical noradrenaline',
  'rec:beta': 'the fight-or-flight signal',
  'rec:d1_str': 'the reward chemical dopamine',
  'rec:d2_str': 'background dopamine',
  'rec:nachr': 'the nicotine/acetylcholine signal',
  'rec:a1': 'the tiredness signal (adenosine)',
  'rec:a2a': 'the tiredness signal (adenosine)',
  'rec:gabaa': "GABA, the brain's brake signal,",
  'ei:inhib': "the brain's braking compared with its excitement",
  'rec:mt1': 'the night-time hormone melatonin',
  'state:circadian': "your body clock's wake-up push",
  'state:asleep': 'sleep',
  'rec:mu': 'opioid signalling (endorphins)',
  'rec:cb1': 'cannabinoid signalling',
  'pool:crh': 'the stress alarm (CRH)',
  'rec:nmda': 'brain excitement (glutamate)',
  'rec:ht2a': 'serotonin 2A signalling',
  'rec:ht1a_post': 'calming serotonin signalling',
  'rec:oxtr': 'the bonding hormone oxytocin',
  'state:sensory_load': 'sensory overload',
  plasticity: "the brain's rewiring capacity",
  'rec:gr': 'the stress hormone cortisol',
  catechol: 'dopamine and noradrenaline in the planning brain',
  'rec:glp1r': 'the fullness signal (GLP-1)',
  'rec:ghsr': 'the hunger hormone ghrelin',
  'state:satiety': 'how full your stomach is',
  'read:sleepiness': 'sleepiness',
  'read:anxiety': 'anxiety',
};

// Terms that read better as a whole phrase than as "<noun> is higher/lower".
const fullPhrase: Record<string, string> = {
  'agon:ht2a': 'a psychedelic is acting on serotonin 2A receptors',
  'block:nmda': 'NMDA (learning) receptors are blocked',
  'agon:cb1': 'THC is acting on cannabinoid receptors',
  'state:sensory_load': 'the surroundings are overloading your senses',
  'state:hangover': 'you have a hangover',
  'input:pain': 'you are in pain',
  'input:exercise': 'you are exercising',
  'input:food': 'you are enjoying tasty food',
  'input:sunlight': 'you are in bright light',
  'state:asleep': 'you are asleep',
};

// Brand-like names keep their capital letter mid-sentence.
const keepCase = new Set(['methylphenidate', 'diazepam', 'mdma', 'thc', 'naloxone']);
const midSentence = (id: string) => {
  const name = drugPlainName(id);
  return keepCase.has(id) ? name : name.charAt(0).toLowerCase() + name.slice(1);
};

/** "caffeine is blocking …" when a drug acts on this receptor in the observed direction. */
function drugCause(key: string, higher: boolean, get: Get): string | null {
  if (!key.startsWith('rec:')) return null;
  const rec = key.slice(4);
  for (const d of drugs) {
    if (get(`drug:${d.id}`) < 0.05) continue;
    for (const t of d.targets) {
      if (t.target !== rec) continue;
      if (!higher && t.action === 'antagonist') return `${midSentence(d.id)} is blocking ${termNoun[key].replace(/,$/, '')}`;
      if (higher && (t.action === 'agonist' || t.action === 'pam')) return `${midSentence(d.id)} is boosting ${termNoun[key].replace(/,$/, '')}`;
    }
  }
  return null;
}

function describe(key: string, higher: boolean, get: Get): string {
  if (fullPhrase[key]) return fullPhrase[key];
  return drugCause(key, higher, get) ?? `${termNoun[key]} is ${higher ? 'higher' : 'lower'}`;
}

const receptorPlain: Record<string, string> = {
  a2a: 'caffeine-target (A2A) receptors', a1: 'tiredness (A1) receptors', gabaa: 'calming GABA-A receptors',
  mu: 'opioid receptors', ht1a_auto: 'serotonin "thermostat" receptors', gr: 'cortisol sensors (the stress brake)',
  ht2a: 'serotonin 2A receptors', nachr: 'nicotine receptors', cb1: 'cannabinoid receptors', d2_str: 'dopamine D2 receptors',
  d1_str: 'dopamine D1 receptors', nmda: 'NMDA (glutamate) receptors', nmda_int: 'NMDA receptors on brake neurons',
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fmtHalfLife = (min: number) => (min >= 1440 ? plural(Math.round(min / 1440), 'day') : min >= 60 ? plural(Math.round(min / 60), 'hour') : `${min} minutes`);
/** How long the effect really lasts: fast redistribution or saturable clearance can end it well before the half-life says. */
const actingHalfLife = (d: Drug) => d.fastPhase?.halfLife ?? (d.saturable ? 90 : d.halfLife);
function wearingOff(d: Drug, name: string) {
  if (d.saturable) return `${name} is wearing off. The liver clears about one drink per hour, whatever the amount.`;
  if (d.fastPhase) return `${name} is wearing off as it spreads from the blood into body tissues. A small rest lingers for ${fmtHalfLife(d.halfLife)} or more.`;
  return `${name} is wearing off. Half of it is gone every ${fmtHalfLife(d.halfLife)}.`;
}

export interface Narration { headline: string; details: string[]; /** the feeling the headline is mainly about */ feeling?: string }

/** focusIds: the feelings this moment is about; they are mentioned first and even when the change is small. */
export interface DoseHistory { now: number; doses: { drug: string; at: number }[] }

export function narrate(get: Get, getBase: Get | null, getPrev: Get | null, _profileId: string, compareWhat: string, focusIds: string[] = [], history?: DoseHistory): Narration {
  const details: string[] = [];
  let headline = '';
  let mainFeeling: string | undefined;

  if (get('state:asleep') > 0.5) {
    headline = 'You are asleep. Sleep is draining the tiredness chemical (adenosine) that built up during the day.';
    if (get('drug:alcohol') > 0.1) details.push('Alcohol makes sleep shallower, so less of it drains tonight.');
  } else if (getBase) {
    const all = readoutDefs.filter((r) => feelingById[r.id]).map((r) => ({ id: r.id, d: get(`read:${r.id}`) - getBase(`read:${r.id}`) }));
    const focused = all.filter((x) => focusIds.includes(x.id) && Math.abs(x.d) >= 3).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const others = all.filter((x) => !focusIds.includes(x.id) && Math.abs(x.d) >= 4).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const deltas = [...focused, ...others];
    if (!deltas.length) headline = `Right now there is little difference compared with ${compareWhat}.`;
    else {
      const parts = deltas.slice(0, 2).map(({ id, d }) => {
        const f = feelingById[id];
        return `${d > 0 ? f.up : f.down} (${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(0)})`;
      });
      const top = deltas[0];
      mainFeeling = top.id;
      const driver = mainDriver(top.id, get, getBase, Math.sign(top.d));
      headline = `Compared with ${compareWhat}, you feel ${parts.join(' and ')}${driver ? `, mainly because ${driver}` : ''}.`;
    }
  } else {
    // no comparison: describe against a typical awake brain
    const c = readoutDefs.filter((r) => feelingById[r.id]).flatMap((r) => contributions(r.id, (k) => (k === 'const' ? 1 : get(k)))
      .filter((x) => x.key && (termNoun[x.key] || fullPhrase[x.key]) && x.key !== 'state:circadian' && x.key !== 'const')
      .map((x) => ({ ...x, r: r.id })))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
    if (!c || Math.abs(c.value) < 0.15) headline = 'Nothing unusual is going on right now.';
    else {
      const f = feelingById[c.r];
      headline = `You feel ${c.value > 0 ? f.up : f.down} than usual, mainly because ${describe(c.key!, isHigher(c.key!, get, null), get)}.`;
    }
  }

  // drugs
  for (const d of drugs) {
    const c = get(`drug:${d.id}`);
    if (c < 0.05) continue;
    const name = drugPlainName(d.id);
    const past = history?.doses.filter((x) => x.drug === d.id && x.at <= history.now).sort((a, b) => b.at - a.at) ?? [];
    if (history && past.length) {
      const since = history.now - past[0].at;
      const repeated = past.filter((x) => history.now - x.at < 4 * actingHalfLife(d)).length >= 3;
      details.push(repeated ? `${name} is at a steady level from repeated doses.`
        : since < d.tmax ? `${name} is still kicking in.`
        : since < d.tmax + 0.5 * actingHalfLife(d) ? `${name} is near its peak.`
        : wearingOff(d, name));
    } else {
      const prev = getPrev?.(`drug:${d.id}`) ?? c;
      details.push(c > prev * 1.01 ? `${name} is still kicking in.` : wearingOff(d, name));
    }
  }

  // adaptations (densities are relative to this brain's own normal)
  const adapt = receptors
    .filter((r) => (getBase || r.adaptTau >= 1440) && (r.id !== 'nachr' || get('drug:nicotine') > 0.05))
    .map((r) => ({ r, d: get(`dens:${r.id}`) / (getBase ? getBase(`dens:${r.id}`) : 1) }))
    .filter((x) => receptorPlain[x.r.id] && Math.abs(x.d - 1) > 0.12)
    .sort((a, b) => Math.abs(b.d - 1) - Math.abs(a.d - 1))[0];
  if (adapt) {
    const pct = Math.round(Math.abs(adapt.d - 1) * 100);
    details.push(adapt.d > 1
      ? `Your brain has adapted: it has built ${pct}% more ${receptorPlain[adapt.r.id]} because they were under-used lately. This is how tolerance and withdrawal start.`
      : `Your brain has adapted: it has removed ${pct}% of its ${receptorPlain[adapt.r.id]} because they were over-stimulated lately.`);
  }

  // depleted stores
  for (const p of pools) {
    const s = get(`store:${p.id}`);
    if (p.storeTau > 0 && s < 0.6) {
      details.push(`Your ${p.name.split(' (')[0].toLowerCase()} reserves are only ${Math.round(s * 100)}% full, and they refill slowly.`);
      break;
    }
  }
  return { headline, details, feeling: mainFeeling };
}

function isHigher(key: string, get: Get, getBase: Get | null) {
  if (key === 'catechol') {
    const v = (g: Get) => 0.55 * g('rec:d1_pfc') + 0.45 * g('rec:alpha2a_pfc');
    return getBase ? v(get) > v(getBase) : v(get) > 1;
  }
  return getBase ? get(key) > getBase(key) : get(key) > 1;
}

/** The term whose change (vs the comparison) pushed this readout the most in the observed direction. */
function mainDriver(id: string, get: Get, getBase: Get, sign: number): string | null {
  const a = contributions(id, (k) => (k === 'const' ? 1 : get(k)));
  const b = contributions(id, (k) => (k === 'const' ? 1 : getBase(k)));
  let best: { key: string; diff: number } | null = null;
  a.forEach((c, i) => {
    if (!c.key || !(termNoun[c.key] || fullPhrase[c.key])) return;
    const diff = (c.value - b[i].value) * sign;
    if (diff > 0 && (!best || diff > best.diff)) best = { key: c.key, diff };
  });
  if (!best) return null;
  const { key } = best as { key: string; diff: number };
  if (key.startsWith('read:')) {
    // e.g. focus is down "because anxiety is up": name what is behind the anxiety instead
    const inner = key.slice(5);
    const innerSign = Math.sign(get(key) - getBase(key));
    const why = mainDriver(inner, get, getBase, innerSign);
    const f = feelingById[inner];
    return why ? `you are ${innerSign > 0 ? f.up : f.down}: ${why}` : null;
  }
  if (key === 'catechol') {
    const v = (g: Get) => 0.55 * g('rec:d1_pfc') + 0.45 * g('rec:alpha2a_pfc');
    const now = v(get), then = v(getBase);
    if (id === 'focus' && now > then && now > 1.7) return 'dopamine and noradrenaline in the planning brain went past their sweet spot';
    return `${termNoun[key]} ${now > then ? 'moved toward' : 'moved away from'} their sweet spot`;
  }
  return describe(key, isHigher(key, get, getBase), get);
}
