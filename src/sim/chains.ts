// Traces *why* a feeling differs from the comparison, step by step back to its
// source: feeling ← receptor ← chemical ← neurons ← (input | drug | sleep | …).
// At every step it follows the factor that explains most of the difference.
import { nucleusById, poolById, receptorById } from '../data/chemistry';
import { drugs } from '../data/drugs';
import { inputById, profileById } from '../data/profiles';
import type { Profile } from '../data/types';
import { applyPersonality } from '../data/personality';
import { contributions, readout } from './readouts';
import type { Dose, InputEvent } from './engine';
import { drugIcon, drugPlainName, feelingById, inputIcon, plainLabel } from '../ui/plain';

type Get = (k: string) => number;

export type NodeKind = 'feeling' | 'receptor' | 'chemical' | 'neurons' | 'input' | 'drug' | 'state' | 'adaptation' | 'store' | 'profile' | 'slow';

export interface ChainNode {
  kind: NodeKind;
  icon: string;
  label: string;
  /** e.g. "×2.4", "−40%", "+18" */
  change: string;
  /** a short plain explanation of this link */
  note?: string;
}

export interface Chain {
  /** source first, feeling last */
  nodes: ChainNode[];
  /** other things pushing the same feeling in the same direction */
  also: string[];
}

const nucleusPlain: Record<string, string> = {
  vta: 'Dopamine neurons (reward)', vta_meso: 'Dopamine neurons (to the planning brain)', lc: 'Alarm centre neurons',
  raphe: 'Serotonin neurons', basal_forebrain: 'Wake-centre neurons', interneurons: 'Brake neurons (GABA)',
  pyramidal: 'Excitatory neurons (glutamate)', pvn: 'Stress neurons (hypothalamus)', pituitary: 'Pituitary gland',
  adrenal: 'Adrenal glands', pineal: 'Night clock (pineal gland)', pomc: 'Endorphin neurons', pvn_oxt: 'Oxytocin neurons',
  ecb: 'Anandamide production', stomach: 'Stomach', gut_l: 'Gut (GLP-1 cells)',
};

const statePlain: Record<string, { icon: string; up: string; down: string }> = {
  asleep: { icon: '😴', up: 'Being asleep', down: 'Being awake' },
  circadian: { icon: '🕰️', up: "Body clock: time to be awake", down: 'Body clock: winding down' },
  hpa_rhythm: { icon: '🌅', up: 'Morning hormone rhythm', down: 'Evening hormone rhythm' },
  car: { icon: '⏰', up: 'Just woke up', down: 'Later in the day' },
  dark: { icon: '🌙', up: 'Darkness', down: 'Daylight' },
  satiety: { icon: '🍽️', up: 'A recent meal', down: 'Empty stomach' },
  hangover: { icon: '🤢', up: 'Hangover', down: 'No hangover' },
  afterglow: { icon: '🌤️', up: 'Exercise afterglow', down: 'No afterglow' },
};

const pumpPlain: Record<string, string> = {
  dat: 'dopamine pumps', net: 'noradrenaline pumps', sert: 'serotonin pumps', mao: 'breakdown enzyme (MAO)',
  comt: 'breakdown enzyme (COMT)', faah: 'breakdown enzyme (FAAH)', gat: 'GABA pumps', eaat: 'glutamate pumps',
};

function receptorLabel(key: string) {
  const plain = plainLabel(key);
  if (plain !== `${receptorById[key.slice(4)].name} signal`) return plain;
  const name = receptorById[key.slice(4)].name;
  return /receptor|autoreceptor/i.test(name) ? name : `${name} receptors`;
}

const fmtRatio = (r: number) => {
  if (!Number.isFinite(r) || r <= 0) return '';
  if (r >= 2) return `×${r.toFixed(1)}`;
  const pct = Math.round((r - 1) * 100);
  return pct === 0 ? '±0%' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`;
};
const ratio = (a: number, b: number) => (Math.max(a, 1e-3)) / Math.max(b, 1e-3);
const occ = (conc: number, ec50: number) => (conc > 0 ? conc / (conc + ec50) : 0);

/** A getter describing a typical brain at the same moment, used when there's no dashed-line comparison. */
export function typicalGetter(a: Get): Get {
  const g: Get = (k) => {
    if (k === 'const') return 1;
    if (k.startsWith('input:') || k.startsWith('drug:') || k.startsWith('agon:') || k.startsWith('block:')) return 0;
    if (k.startsWith('state:')) return k === 'state:sensory_load' ? 0 : a(k);
    if (k === 'plasticity') return 1;
    if (k.startsWith('read:')) return readout(k.slice(5), g);
    return 1;
  };
  return g;
}

/** What happened earlier in the day, so lingering effects can be traced to their cause. */
export interface History { now: number; doses: Dose[]; events: InputEvent[]; /** set when the only difference is personality */ personalityNote?: string }

const hoursAgo = (min: number) => {
  const h = min / 60;
  return h < 1 ? `${Math.max(1, Math.round(min))} min ago` : h < 36 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
};

export function traceFeeling(feelingId: string, a: Get, b: Get, profileA: Profile, profileB: Profile, history?: History): Chain {
  const pers = history?.personalityNote;
  const profileNode = (label: string, note: string, change = ''): ChainNode =>
    pers ? { kind: 'profile', icon: '🧬', label: `Your personality (${pers})`, change, note: note.replace('part of this brain profile', 'from the personality sliders') }
      : { kind: 'profile', icon: '🧬', label, change, note };
  /** Most recent past event of one of these inputs, within `withinMin`. */
  const recentEvent = (inputs: string[], withinMin: number) => history?.events
    .filter((e) => inputs.includes(e.input) && e.at <= history.now && history.now - (e.at + e.duration) < withinMin)
    .sort((x, y) => y.at - x.at)[0];
  const ongoing = (e: InputEvent) => !!history && e.at <= history.now && history.now < e.at + e.duration;
  const recentDose = (drugIds: string[], withinMin: number) => history?.doses
    .filter((d) => drugIds.includes(d.drug) && d.at <= history.now && history.now - d.at < withinMin)
    .sort((x, y) => y.at - x.at)[0];
  const nodes: ChainNode[] = [];
  const visited = new Set<string>();
  const d = a(`read:${feelingId}`) - b(`read:${feelingId}`);
  const f = feelingById[feelingId];
  nodes.push({ kind: 'feeling', icon: f.icon, label: f.name, change: `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(0)}` });

  const termsFor = (id: string, sign: number) => {
    const ca = contributions(id, (k) => (k === 'const' ? 1 : a(k)));
    const cb = contributions(id, (k) => (k === 'const' ? 1 : b(k)));
    return ca.map((c, i) => ({ key: c.key, label: c.label, diff: (c.value - cb[i].value) * sign }))
      .filter((x) => x.key && x.key !== 'const' && x.diff > 0.005)
      .sort((x, y) => y.diff - x.diff);
  };

  const sign0 = Math.sign(d) || 1;
  const first = termsFor(feelingId, sign0);
  const also = first.slice(1, 4).filter((x) => x.diff > first[0]?.diff * 0.25).map((x) => x.label);
  if (!first.length || Math.abs(d) < 2) return { nodes: nodes.reverse(), also: [] };

  // walk back from a key, pushing nodes (feeling end first; reversed at the end)
  const walk = (key: string, depth: number) => {
    if (depth > 10 || visited.has(key)) return;
    visited.add(key);
    const [kind, id] = key.split(':');

    if (kind === 'read') {
      const s = Math.sign(a(key) - b(key)) || 1;
      const ff = feelingById[id];
      nodes.push({ kind: 'feeling', icon: ff.icon, label: ff.name, change: `${s > 0 ? '+' : '−'}${Math.abs(a(key) - b(key)).toFixed(0)}` });
      const t = termsFor(id, s)[0];
      if (t) walk(t.key!, depth + 1);
      return;
    }

    if (key === 'catechol') {
      const r1 = ratio(a('rec:d1_pfc'), b('rec:d1_pfc')), r2 = ratio(a('rec:alpha2a_pfc'), b('rec:alpha2a_pfc'));
      const ca = 0.55 * a('rec:d1_pfc') + 0.45 * a('rec:alpha2a_pfc');
      nodes.push({ kind: 'slow', icon: '🎯', label: 'Planning-brain chemistry', change: fmtRatio(ratio(ca, 0.55 * b('rec:d1_pfc') + 0.45 * b('rec:alpha2a_pfc'))),
        note: ca > 1.7 ? 'past its sweet spot: more than needed' : ca < 0.85 ? 'below its sweet spot: too little' : 'near its sweet spot' });
      walk(Math.abs(Math.log(r1)) >= Math.abs(Math.log(r2)) ? 'rec:d1_pfc' : 'rec:alpha2a_pfc', depth + 1);
      return;
    }

    if (kind === 'ei') {
      const rg = ratio(0.7 * a('rec:gabaa') + 0.3 * a('rec:gabaa_ex'), 0.7 * b('rec:gabaa') + 0.3 * b('rec:gabaa_ex'));
      const rx = ratio(a('pool:glu'), b('pool:glu'));
      nodes.push({ kind: 'slow', icon: '⚖️', label: 'Brakes vs excitement', change: fmtRatio(ratio(a(key), b(key))), note: 'braking compared with how excited the brain is' });
      if (Math.abs(Math.log(rg)) >= Math.abs(Math.log(rx)) * 1.5) walk('rec:gabaa', depth + 1);
      else walk('pool:glu', depth + 1);
      return;
    }

    if (kind === 'input') {
      const inp = inputById[id as keyof typeof inputById];
      nodes.push({ kind: 'input', icon: inputIcon[id] ?? '•', label: inp?.name ?? id, change: '' });
      return;
    }

    if (kind === 'plasticity') {
      nodes.push({ kind: 'slow', icon: '🌱', label: 'Brain rewiring capacity', change: fmtRatio(ratio(a(key), b(key))), note: 'builds up or wears down over days' });
      const cands = [
        { k: 'rec:ht1a_post', v: Math.log(ratio(a('rec:ht1a_post'), b('rec:ht1a_post'))) },
        { k: 'agon:ht2a', v: a('agon:ht2a') - b('agon:ht2a') },
        { k: 'pool:glu', v: Math.log(ratio(a('pool:glu'), b('pool:glu'))) * 0.5 },
        { k: 'rec:gr', v: -Math.log(ratio(a('rec:gr'), b('rec:gr'))) },
      ];
      const s = Math.sign(a(key) - b(key)) || 1;
      const best = cands.sort((x, y) => y.v * s - x.v * s)[0];
      const lingering = recentDose(['ketamine', 'psilocybin', 'lsd', 'mdma', 'sertraline'], 21 * 1440);
      if (lingering && s > 0 && !(best && best.v * s > 0.05 && a(`drug:${lingering.drug}`) > 0.05)) {
        nodes.push({ kind: 'drug', icon: drugIcon[lingering.drug] ?? '💊', label: `${drugPlainName(lingering.drug)}, ${hoursAgo(history!.now - lingering.at)}`, change: '',
          note: 'its push on rewiring lasts long after the drug itself is gone' });
      } else if (best && best.v * s > 0.05) walk(best.k, depth + 1);
      else {
        const stress = recentEvent(['stress'], 21 * 1440);
        nodes.push(stress && s < 0
          ? { kind: 'input', icon: inputIcon.stress, label: `Stress that ended ${hoursAgo(history!.now - (stress.at + stress.duration))}`, change: '', note: 'the damage to rewiring capacity heals slowly' }
          : { kind: 'slow', icon: '⏳', label: 'Signals over the past days', change: '', note: 'the effect lingers after the cause is gone' });
      }
      return;
    }

    if (kind === 'agon' || kind === 'block') {
      const rec = id;
      const drug = drugs.find((dd) => a(`drug:${dd.id}`) > 0.03 && dd.targets.some((t) => t.target === rec && (kind === 'agon' ? t.action === 'agonist' : t.action === 'antagonist')));
      if (drug) nodes.push({ kind: 'drug', icon: drugIcon[drug.id] ?? '💊', label: drugPlainName(drug.id), change: '', note: kind === 'agon' ? `activates ${receptorById[rec].name}` : `blocks ${receptorById[rec].name}` });
      return;
    }

    if (kind === 'state') {
      if (id === 'sensory_load') {
        nodes.push({ kind: 'state', icon: '🌪️', label: 'Sensory overload', change: '' });
        nodes.push({ kind: 'input', icon: inputIcon.sensory, label: inputById.sensory.name, change: '', note: (profileA.sensoryGain ?? 1) > 1 ? 'this brain turns sensory input up' : undefined });
        return;
      }
      const sp = statePlain[id];
      if (!sp) return;
      const up = a(key) >= b(key);
      nodes.push({ kind: 'state', icon: sp.icon, label: up ? sp.up : sp.down, change: '' });
      return;
    }

    if (kind === 'rec') {
      const rc = receptorById[id];
      const r = ratio(a(key), b(key));
      const dr = ratio(a(`dens:${id}`), b(`dens:${id}`));
      const sr = r / dr;
      nodes.push({ kind: 'receptor', icon: '🔑', label: receptorLabel(key), change: fmtRatio(r) });
      const pd = (profileA.receptors?.[id] ?? 1) / (profileB.receptors?.[id] ?? 1);
      if (Math.abs(Math.log(pd)) > 0.05 && Math.abs(Math.log(pd)) >= Math.abs(Math.log(r)) * 0.5 && Math.sign(Math.log(pd)) === Math.sign(Math.log(r))) {
        nodes.push(profileNode(pd > 1 ? 'This brain has more of these receptors' : 'This brain has fewer of these receptors',
          pd > 1 ? 'more of these receptors than average' : 'fewer of these receptors than average', fmtRatio(pd)));
        return;
      }
      // a drug acting directly on the receptor?
      const up = r >= 1;
      let best: { name: string; icon: string; note: string; o: number } | null = null;
      for (const dd of drugs) {
        const c = a(`drug:${dd.id}`);
        if (c < 0.03) continue;
        for (const t of dd.targets) {
          if (t.target !== id) continue;
          const o = occ(c, t.ec50);
          const fits = up ? t.action === 'agonist' || t.action === 'pam' : t.action === 'antagonist';
          if (fits && o > 0.05 && (!best || o > best.o)) {
            const verb = t.action === 'antagonist' ? 'blocks' : t.action === 'pam' ? 'amplifies' : 'switches on';
            best = { name: drugPlainName(dd.id), icon: drugIcon[dd.id] ?? '💊', note: `${verb} ${Math.round(o * 100)}% of these receptors`, o };
          }
        }
      }
      const poolFlat = Math.abs(Math.log(ratio(a(`pool:${rc.pool}`), b(`pool:${rc.pool}`)))) < 0.03;
      if (Math.abs(Math.log(dr)) > Math.max(Math.abs(Math.log(sr)), 0.08) || (poolFlat && !best && Math.abs(Math.log(dr)) >= Math.abs(Math.log(sr)) && Math.abs(Math.log(dr)) > 0.01)) {
        nodes.push({ kind: 'adaptation', icon: '🔧', label: dr > 1 ? 'More receptors than usual' : 'Fewer receptors than usual', change: fmtRatio(dr),
          note: dr > 1 ? 'the brain added them after they were under-used' : 'the brain removed them after over-use' });
        return;
      }
      if (best && Math.abs(Math.log(sr)) > 0.05) {
        nodes.push({ kind: 'drug', icon: best.icon, label: best.name, change: '', note: best.note });
        return;
      }
      walk(`pool:${rc.pool}`, depth + 1);
      return;
    }

    if (kind === 'pool') {
      const p = poolById[id];
      const r = ratio(a(key), b(key));
      nodes.push({ kind: 'chemical', icon: '🧪', label: plainLabel(key), change: fmtRatio(r) });
      if (Math.abs(Math.log(r)) < 0.03) return;
      const s = Math.sign(Math.log(r));
      if (id === 'adenosine') {
        const asleepA = a('state:asleep') > 0.5;
        const drink = recentDose(['alcohol'], 14 * 60);
        if (s > 0 && drink) {
          nodes.push({ kind: 'drug', icon: drugIcon.alcohol, label: `Alcohol, ${hoursAgo(history!.now - drink.at)}`, change: '', note: 'made sleep shallower, so less was cleared' });
          return;
        }
        const run = recentEvent(['exercise'], 12 * 60);
        if (s > 0 && run && !asleepA) {
          nodes.push({ kind: 'input', icon: inputIcon.exercise, label: `Exercise, ${hoursAgo(history!.now - (run.at + run.duration))}`, change: '', note: 'uses energy, so more builds up (good for deep sleep)' });
          return;
        }
        nodes.push({ kind: 'state', icon: asleepA ? '😴' : '⏱️', label: asleepA ? 'Sleep is clearing it' : s > 0 ? 'Less sleep / more hours awake' : 'More sleep / fewer hours awake', change: '',
          note: asleepA ? undefined : 'it builds up the whole time you are awake' });
        return;
      }
      // what explains the level change: firing, stores, releasers, or blocked clearance?
      const cands: { what: string; v: number; node?: ChainNode; next?: string }[] = [];
      const srcKey = `fire:${p.source}`;
      cands.push({ what: 'firing', v: Math.log(ratio(a(srcKey), b(srcKey))), next: srcKey });
      const drainer = recentDose(drugs.filter((dd) => dd.targets.some((t) => t.target === id && t.action === 'releaser')).map((dd) => dd.id), 10 * 1440);
      cands.push({ what: 'store', v: Math.log(ratio(a(`store:${id}`), b(`store:${id}`))),
        node: { kind: 'store', icon: '🪫', label: `${p.name.split(' (')[0]} reserves${drainer ? ` (emptied by ${drugPlainName(drainer.drug)}, ${hoursAgo(history!.now - drainer.at)})` : ''}`, change: fmtRatio(ratio(a(`store:${id}`), b(`store:${id}`))), note: 'reserves were drained and refill slowly' } });
      const boost = (g: Get) => drugs.reduce((acc, dd) => acc + dd.targets.filter((t) => t.target === id && t.action === 'releaser')
        .reduce((x, t) => x + occ(g(`drug:${dd.id}`), t.ec50) * (t.efficacy ?? 4), 0), 0);
      const rel = drugs.map((dd) => ({ dd, t: dd.targets.find((t) => t.target === id && t.action === 'releaser') })).filter((x) => x.t && a(`drug:${x.dd.id}`) > 0.03)
        .sort((x, y) => occ(a(`drug:${y.dd.id}`), y.t!.ec50) - occ(a(`drug:${x.dd.id}`), x.t!.ec50))[0];
      if (rel) cands.push({ what: 'releaser', v: Math.log((1 + boost(a)) / (1 + boost(b))),
        node: { kind: 'drug', icon: drugIcon[rel.dd.id] ?? '💊', label: drugPlainName(rel.dd.id), change: '', note: 'forces neurons to dump their stores' } });
      // clearance: k ∝ Σ frac · activity · (1 − block)
      const k = (g: Get, prof: Profile) => p.clearance.reduce((acc, c) => {
        let block = 0;
        for (const dd of drugs) for (const t of dd.targets) if (t.target === c.by && (t.action === 'reuptake_inhibitor' || t.action === 'enzyme_inhibitor')) block += occ(g(`drug:${dd.id}`), t.ec50);
        return acc + c.frac * (prof.clearers?.[c.by] ?? 1) * (1 - Math.min(block, 0.97));
      }, 0);
      const kr = k(a, profileA) / k(b, profileB);
      const blocker = drugs.flatMap((dd) => dd.targets.filter((t) => p.clearance.some((c) => c.by === t.target) && (t.action === 'reuptake_inhibitor' || t.action === 'enzyme_inhibitor'))
        .map((t) => ({ dd, t, o: occ(a(`drug:${dd.id}`), t.ec50) }))).sort((x, y) => y.o - x.o)[0];
      if (blocker && blocker.o > 0.05) cands.push({ what: 'clearance', v: -Math.log(kr),
        node: { kind: 'drug', icon: drugIcon[blocker.dd.id] ?? '💊', label: drugPlainName(blocker.dd.id), change: '',
          note: `blocks ${Math.round(blocker.o * 100)}% of the ${pumpPlain[blocker.t.target] ?? blocker.t.target} that ${blocker.t.action === 'reuptake_inhibitor' ? 'clears it away' : 'breaks it down'}` } });
      else if (Math.abs(Math.log(kr)) > 0.05) cands.push({ what: 'clearance', v: -Math.log(kr),
        node: { kind: 'profile', icon: '🧬', label: 'This brain clears it faster than usual', change: '', note: 'more transporter pumps (part of this brain profile)' } });
      const best = cands.filter((c) => c.v * s > 0).sort((x, y) => y.v * s - x.v * s)[0];
      if (!best || best.v * s < Math.abs(Math.log(r)) * 0.3) {
        // the level is still changed although its source has calmed down: name what happened shortly before
        const n = nucleusById[p.source];
        const inputs = n?.modulators.filter((m) => m.ref.startsWith('input:') && m.w * s > 0).map((m) => m.ref.slice(6)) ?? [];
        const ev = recentEvent(inputs, 4 * 60);
        const relDose = recentDose(drugs.filter((dd) => dd.targets.some((t) => t.target === id)).map((dd) => dd.id), 3 * 1440);
        if (ev) {
          nodes.push(ongoing(ev)
            ? { kind: 'input', icon: inputIcon[ev.input] ?? '•', label: `${inputById[ev.input].name} (happening now)`, change: '' }
            : { kind: 'input', icon: inputIcon[ev.input] ?? '•', label: `${inputById[ev.input].name}, ended ${hoursAgo(history!.now - (ev.at + ev.duration))}`, change: '', note: 'its effect is still fading out' });
          return;
        }
        if (relDose && s < 0) {
          nodes.push({ kind: 'drug', icon: drugIcon[relDose.drug] ?? '💊', label: `${drugPlainName(relDose.drug)}, ${hoursAgo(history!.now - relDose.at)}`, change: '', note: 'used up the reserves' });
          return;
        }
        if (!best) return;
      }
      if (best.node) { nodes.push(best.node); return; }
      walk(best.next!, depth + 1);
      return;
    }

    if (kind === 'fire') {
      const n = nucleusById[id];
      const r = ratio(a(key), b(key));
      nodes.push({ kind: 'neurons', icon: '⚡', label: nucleusPlain[id] ?? n.name, change: fmtRatio(r) });
      if (Math.abs(Math.log(r)) < 0.03) return;
      const s = Math.sign(Math.log(r));
      const terms = n.modulators.map((m) => {
        const [mk, mid] = m.ref.split(':');
        const k2 = mk === 'receptor' ? `rec:${mid}` : mk === 'pool' ? `pool:${mid}` : `${mk}:${mid}`;
        const cut = (x: number) => (m.above != null ? Math.max(0, x - m.above) : x);
        const xa = cut(Math.min(a(k2), 6)), xb = cut(Math.min(b(k2), 6));
        const v = m.form === 'log' ? m.w * Math.log(Math.max(0.05, xa) / Math.max(0.05, xb)) : m.w * (xa - xb);
        return { k2, mk, mid, v };
      });
      const baseA = profileA.firing?.[id] ?? 1, baseB = profileB.firing?.[id] ?? 1;
      const profV = Math.log(baseA / baseB);
      const FEEDBACK = new Set(['rec:gr', 'rec:ht1a_auto', 'rec:alpha2_auto', 'rec:d2_auto']);
      let best = terms.filter((x) => x.v * s > 0.01).sort((x, y) => y.v * s - x.v * s)[0];
      const input = terms.filter((x) => x.mk === 'input' && Math.abs(x.v) > 0.05).sort((x, y) => Math.abs(y.v) - Math.abs(x.v))[0];
      if (best && FEEDBACK.has(best.k2) && input) {
        // the brake is reacting to the input's effect; the input is the real story
        nodes.push({ kind: 'state', icon: '🔁', label: 'The body\'s own brake reacts', change: '', note: 'cortisol and other feedback signals push back after the first surge' });
        best = input;
      }
      if (Math.abs(profV) > 0.02 && profV * s > 0 && (!best || Math.abs(profV) > Math.abs(best.v))) {
        nodes.push(profileNode('This brain profile', profV > 0 ? 'these neurons are naturally more active' : 'these neurons are naturally less active'));
        return;
      }
      if (!best) return;
      if (best.mk === 'input') {
        const inp = inputById[best.mid as keyof typeof inputById];
        const ia = a(best.k2), ib = b(best.k2);
        // the same event hits harder (or softer) in this brain: name the reason too
        if (ia > 0 && ib > 0 && Math.abs(ia / ib - 1) > 0.04) {
          nodes.push(profileNode('This brain profile', ia > ib ? `${inp?.name ?? best.mid} hits this brain harder` : `${inp?.name ?? best.mid} hits this brain more softly`));
        }
        nodes.push({ kind: 'input', icon: inputIcon[best.mid] ?? '•', label: inp?.name ?? best.mid, change: '' });
        return;
      }
      walk(best.k2, depth + 1);
      return;
    }
  };

  walk(first[0].key!, 0);
  return { nodes: nodes.reverse(), also };
}

/** Convenience: the effective profiles for a config and its comparison. */
export function profilesFor(profileId: string, personality: Parameters<typeof applyPersonality>[1], compareProfileId: string,
  comparePersonality: Parameters<typeof applyPersonality>[1]): [Profile, Profile] {
  return [applyPersonality(profileById[profileId], personality), applyPersonality(profileById[compareProfileId], comparePersonality)];
}
