// Readouts turn low-level signals into the things you'd feel. Each readout is a
// documented weighted sum, so the "why" panel can list exactly which terms
// pushed it up or down. Receptor/pool values are relative to the typical
// baseline (1 = typical); states are 0..1.

export interface Term {
  key: string; // series key, e.g. 'rec:gabaa'
  w: number;
  label: string;
  /** 'rel' terms contribute w·(x−1); 'abs' terms contribute w·x; 'neg' only counts drops below 1; 'above' only counts x beyond `above`. */
  mode?: 'rel' | 'abs' | 'neg' | 'above';
  above?: number;
}

export interface ReadoutDef {
  id: string;
  name: string;
  summary: string;
  terms: Term[];
  /** Divides the raw sum before tanh: bigger = less sensitive. */
  scale: number;
}

export const readoutDefs: ReadoutDef[] = [
  { id: 'arousal', name: 'Arousal / alertness', scale: 1.79,
    summary: 'How awake and energised. Noradrenaline and the circadian wake drive push it up; adenosine, GABA and melatonin pull it down.',
    terms: [
      { key: 'rec:alpha1', w: 0.81, label: 'noradrenaline (α1)' },
      { key: 'rec:beta', w: 0.27, label: 'noradrenaline (β)' },
      { key: 'rec:d1_str', w: 0.2, label: 'dopamine (D1)' },
      { key: 'rec:nachr', w: 0.2, label: 'nicotinic ACh' },
      { key: 'rec:a1', w: -0.34, label: 'adenosine (A1)' },
      { key: 'rec:a2a', w: -0.3, label: 'adenosine (A2A)' },
      { key: 'ei:inhib', w: -0.47, label: 'brain brakes vs excitement (GABA)' },
      { key: 'rec:mt1', w: -0.14, label: 'melatonin' },
      { key: 'state:circadian', w: 0.73, label: 'circadian wake drive', mode: 'abs' },
      { key: 'input:sunlight', w: 0.4, label: 'bright light', mode: 'abs' },
      { key: 'state:inertia', w: -0.8, label: 'just woke up (sleep inertia)', mode: 'abs' },
      { key: 'state:asleep', w: -2.0, label: 'asleep', mode: 'abs' },
      { key: 'const', w: 0.05, label: 'offset', mode: 'abs' },
    ] },
  { id: 'focus', name: 'Focus / working memory', scale: 1,
    summary: 'An inverted U over prefrontal dopamine (D1) and noradrenaline (α2A): too little is distractible, too much is rigid or scattered. Sleepiness and anxiety reduce it further.',
    terms: [] },
  { id: 'motivation', name: 'Motivation / reward drive', scale: 0.67,
    summary: '"Wanting": dopamine in the striatum, plus opioid and cannabinoid boosts.',
    terms: [
      { key: 'rec:d1_str', w: 0.6, label: 'dopamine (D1, "go")' },
      { key: 'rec:d2_str', w: 0.49, label: 'dopamine (D2)' },
      { key: 'rec:a2a', w: -0.2, label: 'adenosine A2A (opposes D2)' },
      { key: 'rec:mu', w: 0.2, label: 'opioids' },
      { key: 'rec:cb1', w: 0.1, label: 'endocannabinoids' },
      { key: 'state:asleep', w: -1.0, label: 'asleep', mode: 'abs' },
    ] },
  { id: 'anxiety', name: 'Anxiety / threat', scale: 1.49,
    summary: 'Amygdala alarm: noradrenaline, CRH and glutamate push it up; GABA, 5-HT1A, oxytocin and endocannabinoids calm it.',
    terms: [
      { key: 'rec:beta', w: 0.22, label: 'noradrenaline (β, fight-or-flight)', mode: 'above', above: 1.15 },
      { key: 'rec:alpha1', w: 0.07, label: 'noradrenaline (α1)' },
      { key: 'pool:crh', w: 0.06, label: 'CRH' },
      { key: 'rec:nmda', w: 0.3, label: 'glutamate (NMDA)' },
      { key: 'rec:ht2a', w: 0.73, label: 'serotonin 2A' },
      { key: 'block:a2a', w: 0.8, label: 'caffeine blocking adenosine (jitters)', mode: 'above', above: 0.15 },
      { key: 'rec:a1', w: 0.86, label: 'sleep loss' },
      { key: 'rec:nachr', w: -0.9, label: 'nicotine withdrawal (low nicotinic signal)', mode: 'neg' },
      { key: 'input:exercise', w: -1.0, label: 'exercise', mode: 'abs' },
      { key: 'input:pain', w: 0.4, label: 'pain', mode: 'abs' },
      { key: 'state:hangover', w: 0.6, label: 'hangover', mode: 'abs' },
      { key: 'rec:mu', w: -1.5, label: 'opioid withdrawal (low opioid signal)', mode: 'neg' },
      { key: 'plasticity', w: -0.61, label: 'low resilience (rewiring capacity)', mode: 'neg' },
      { key: 'ei:inhib', w: -0.59, label: 'brain brakes vs excitement (GABA)' },
      { key: 'rec:ht1a_post', w: -0.49, label: 'serotonin 1A' },
      { key: 'rec:cb1', w: -0.6, label: 'endocannabinoids (amygdala buffer)' },
      { key: 'agon:cb1', w: 6.71, label: 'too much THC (anxiety, paranoia)', mode: 'above', above: 0.3 },
      { key: 'rec:oxtr', w: -0.23, label: 'oxytocin' },
      { key: 'state:sensory_load', w: 1.04, label: 'sensory overload', mode: 'abs' },
      { key: 'state:asleep', w: -0.8, label: 'asleep', mode: 'abs' },
    ] },
  { id: 'mood', name: 'Mood', scale: 1.49,
    summary: 'Overall emotional tone. Plasticity (slow) and serotonin 1A carry most of it; tonic dopamine, endorphins and oxytocin help; chronic cortisol and sleepiness hurt.',
    terms: [
      { key: 'input:exercise', w: -3, label: 'hard effort (strenuous while it lasts)', mode: 'above', above: 1.1 },
      { key: 'plasticity', w: 1.79, label: 'neuroplasticity (slow)', mode: 'neg' },
      { key: 'plasticity', w: 0.12, label: 'neuroplasticity above normal', mode: 'above', above: 1 },
      { key: 'rec:d2_str', w: 0.8, label: 'dopamine shortfall (anhedonia)', mode: 'neg' },
      { key: 'state:hangover', w: -1.33, label: 'hangover', mode: 'abs' },
      { key: 'rec:ht1a_post', w: 0.11, label: 'serotonin 1A' },
      { key: 'rec:ht1a_post', w: 0.43, label: 'serotonin shortfall', mode: 'neg' },
      { key: 'rec:d2_str', w: 0.16, label: 'tonic dopamine' },
      { key: 'rec:mu', w: 0.37, label: 'endorphins / opioids', mode: 'above', above: 1 },
      { key: 'pool:da_str', w: 0.8, label: 'dopamine surge (the "high")', mode: 'above', above: 1.3 },
      { key: 'pool:ht', w: 0.1, label: 'serotonin flood (MDMA)', mode: 'above', above: 2 },
      { key: 'agon:ht2a', w: 0.3, label: 'psychedelic awe / euphoria', mode: 'abs' },
      { key: 'ei:inhib', w: 0.15, label: 'relaxed, disinhibited (alcohol, sedatives)', mode: 'above', above: 1 },
      { key: 'agon:cb1', w: 0.67, label: 'THC high', mode: 'abs' },
      { key: 'rec:mu', w: 0.3, label: 'opioid withdrawal (dysphoria)', mode: 'neg' },
      { key: 'rec:nachr', w: 0.5, label: 'nicotine withdrawal (craving, low mood)', mode: 'neg' },
      { key: 'rec:oxtr', w: 0.2, label: 'oxytocin' },
      { key: 'input:pain', w: -1.0, label: 'pain', mode: 'abs' },
      { key: 'input:food', w: 0.4, label: 'tasty food', mode: 'abs' },
      { key: 'rec:a2a', w: -0.2, label: 'tiredness signal' },
      { key: 'rec:cb1', w: 0.08, label: 'endocannabinoids' },
      { key: 'rec:gr', w: -0.25, label: 'cortisol (GR)' },
      { key: 'rec:a1', w: -0.15, label: 'sleep pressure' },
    ] },
  { id: 'sleepiness', name: 'Sleepiness', scale: 1.49,
    summary: 'Felt sleep pressure: adenosine (A1/A2A), melatonin and GABA, against noradrenaline and the wake drive.',
    terms: [
      { key: 'rec:a1', w: 0.5, label: 'adenosine (A1)' },
      { key: 'rec:a2a', w: 0.5, label: 'adenosine (A2A)' },
      { key: 'rec:mt1', w: 0.16, label: 'melatonin' },
      { key: 'agon:mu', w: 0.3, label: 'opioid sedation ("nodding")', mode: 'above', above: 0.2 },
      { key: 'ei:inhib', w: 0.23, label: 'brain brakes vs excitement (GABA)' },
      { key: 'rec:alpha1', w: -0.35, label: 'noradrenaline (α1)' },
      { key: 'rec:nachr', w: -0.11, label: 'nicotinic ACh' },
      { key: 'rec:d2_str', w: -0.25, label: 'dopamine (wake-promoting)' },
      { key: 'rec:d2_str', w: -1.2, label: 'dopamine shortfall (exhaustion)', mode: 'neg' },
      { key: 'state:circadian', w: -0.7, label: 'circadian wake drive', mode: 'abs' },
      { key: 'input:sunlight', w: -0.3, label: 'bright light', mode: 'abs' },
      { key: 'const', w: 0.7, label: 'offset', mode: 'abs' },
    ] },
  { id: 'breathing', name: 'Breathing drive (safety)', scale: 0.66,
    summary: 'How strongly the brainstem drives breathing. Opioids, alcohol and sedatives each dampen it, and together their effects multiply. That is why combining them causes most overdose deaths.',
    terms: [
      { key: 'rec:mu', w: -0.21, label: 'opioid drugs', mode: 'above', above: 1.5 },
      { key: 'agon:mu', w: -0.26, label: 'opioid on the breathing centre (tolerance builds slowly here)', mode: 'above', above: 0.3 },
      { key: 'ei:inhib', w: -0.45, label: 'sedatives / alcohol (GABA)', mode: 'above', above: 1.8 },
      { key: 'rec:alpha1', w: 0.14, label: 'alertness (noradrenaline)' },
      { key: 'state:asleep', w: -0.3, label: 'asleep', mode: 'abs' },
      { key: 'const', w: 0.5, label: 'offset', mode: 'abs' },
    ] },
  { id: 'hunger', name: 'Hunger / appetite', scale: 1,
    summary: 'The drive to eat: the hunger hormone ghrelin and an empty stomach push it up; fullness and GLP-1 (the hormone Ozempic copies) pull it down. Cannabis gives "the munchies".',
    terms: [
      { key: 'rec:ghsr', w: 0.4, label: 'hunger hormone (ghrelin)' },
      { key: 'rec:glp1r', w: -0.57, label: 'fullness hormone (GLP-1)' },
      { key: 'state:satiety', w: -0.73, label: 'full stomach', mode: 'abs' },
      { key: 'agon:cb1', w: 0.6, label: 'THC ("munchies")', mode: 'abs' },
      { key: 'rec:d1_str', w: 0.08, label: 'reward drive' },
      { key: 'pool:ne', w: -0.55, label: 'noradrenaline (stimulants suppress appetite)' },
      { key: 'pool:da_str', w: -0.15, label: 'dopamine surge (stimulants)', mode: 'above', above: 1.3 },
      { key: 'pool:ht', w: -0.2, label: 'serotonin (satiety)' },
      { key: 'rec:nachr', w: -0.66, label: 'nicotine' },
      { key: 'input:exercise', w: -0.8, label: 'exercise', mode: 'abs' },
      { key: 'rec:a1', w: 0.22, label: 'sleep loss' },
      { key: 'state:circadian', w: 0.73, label: 'body clock (appetite peaks in the evening)', mode: 'abs' },
      { key: 'rec:cb1', w: 0.74, label: 'endocannabinoids (appetite)' },
      { key: 'state:asleep', w: -1.2, label: 'asleep', mode: 'abs' },
      { key: 'const', w: 0.8, label: 'offset', mode: 'abs' },
    ] },
  { id: 'bonding', name: 'Social warmth', scale: 1.65,
    summary: 'Feeling close and trusting: oxytocin with help from endorphins and serotonin.',
    terms: [
      { key: 'rec:oxtr', w: 0.7, label: 'oxytocin' },
      { key: 'rec:mu', w: 0.25, label: 'endorphins' },
      { key: 'rec:ht1a_post', w: 0.18, label: 'serotonin 1A' },
      { key: 'rec:beta', w: -0.22, label: 'fight-or-flight' },
    ] },
  { id: 'analgesia', name: 'Pain relief', scale: 1.35,
    summary: 'Opioid and cannabinoid signalling dampen pain.',
    terms: [
      { key: 'rec:mu', w: 0.8, label: 'μ-opioid' },
      { key: 'rec:cb1', w: 0.2, label: 'CB1' },
      { key: 'block:nmda', w: 0.72, label: 'NMDA blockade (ketamine)', mode: 'abs' },
      { key: 'ei:inhib', w: 0.15, label: 'sedation (GABA)' },
    ] },
  { id: 'perception', name: 'Altered perception', scale: 1,
    summary: 'Departure from ordinary perception: 5-HT2A agonism (psychedelics), NMDA blockade (dissociatives) and strong CB1 activation.',
    terms: [
      { key: 'agon:ht2a', w: 2.46, label: '5-HT2A agonist', mode: 'above', above: 0.2 },
      { key: 'block:nmda', w: 2.4, label: 'NMDA blockade', mode: 'above', above: 0.3 },
      { key: 'agon:cb1', w: 1.22, label: 'CB1 agonist', mode: 'above', above: 0.1 },
      { key: 'ei:inhib', w: 0.3, label: 'heavy sedation / drunkenness', mode: 'above', above: 1.5 },
      { key: 'pool:ht', w: 0.05, label: 'serotonin flood (MDMA)', mode: 'above', above: 4 },
      { key: 'const', w: -0.6, label: 'offset', mode: 'abs' },
    ] },
];

export const readoutById = Object.fromEntries(readoutDefs.map((r) => [r.id, r]));

export type Getter = (key: string) => number;

/** Focus: an asymmetric inverted U over PFC catecholamines, times penalties. Past the peak focus falls off
 * more slowly: too much helps little, but rarely ruins focus. */
export const focusParams = {
  peak: 1.15, width: 0.5, widthHigh: 1.22,
  nicotine: 0.12, sleepy: 1.64, sleepyFrom: 0.2, anxiety: 0.5, anxietyFrom: 55,
  sensory: 0.25, thc: 0.75, nmda: 0.8, plasticity: 0.4,
};
export const focusCurve = (c: number) => {
  const f = focusParams;
  return Math.exp(-(((c - f.peak) / (c < f.peak ? f.width : f.widthHigh)) ** 2));
};
const u = focusCurve;

export function catecholIndex(get: Getter) {
  return 0.55 * get('rec:d1_pfc') + 0.45 * get('rec:alpha2a_pfc');
}

export interface Contribution {
  label: string;
  value: number;
  key?: string;
}

export function contributions(id: string, get: Getter): Contribution[] {
  const def = readoutById[id];
  if (id === 'focus') {
    const f = focusParams;
    const c = catecholIndex(get);
    const sleepy = readout('sleepiness', get) / 100;
    const anx = readout('anxiety', get);
    return [
      { label: `PFC catecholamines ${c.toFixed(2)}× (peak ${f.peak}×)`, value: u(c) - 0.73, key: 'catechol' },
      { label: 'nicotine (attention)', value: f.nicotine * Math.max(-0.5, Math.min(1, get('rec:nachr') - 1)), key: 'rec:nachr' },
      { label: 'sleepiness', value: -f.sleepy * Math.max(0, sleepy - f.sleepyFrom), key: 'read:sleepiness' },
      { label: 'anxiety', value: -f.anxiety * Math.max(0, anx - f.anxietyFrom) / (100 - f.anxietyFrom), key: 'read:anxiety' },
      { label: 'sensory overload', value: -f.sensory * Math.min(1, get('state:sensory_load')), key: 'state:sensory_load' },
      { label: 'THC (impairs working memory)', value: -f.thc * Math.min(1, get('agon:cb1')), key: 'agon:cb1' },
      { label: 'dissociation (NMDA blockade)', value: -f.nmda * Math.min(1, 1.5 * get('block:nmda')), key: 'block:nmda' },
      { label: 'low resilience (chronic stress, depression)', value: -f.plasticity * Math.max(0, 1 - get('plasticity')), key: 'plasticity' },
      { label: 'asleep', value: -get('state:asleep'), key: 'state:asleep' },
    ];
  }
  const out = def.terms.map((t) => {
    const x = t.key === 'const' ? 1 : get(t.key);
    const value = t.mode === 'abs' ? t.w * x : t.mode === 'neg' ? t.w * Math.min(0, x - 1)
      : t.mode === 'above' ? t.w * Math.max(0, x - (t.above ?? 1)) : t.w * (x - 1);
    return { label: t.label, value, key: t.key };
  });
  if (id === 'breathing') {
    // opioids and sedatives amplify each other's breathing suppression
    out.push({ label: 'opioids × sedatives together', value: -1.8 * Math.max(0, get('rec:mu') - 1.5) * Math.max(0, get('ei:inhib') - 1), key: 'synergy' });
  }
  return out;
}

export function readout(id: string, get: Getter): number {
  if (id === 'focus') {
    if (get('state:asleep') > 0.5) return 0;
    const f = focusParams;
    const c = catecholIndex(get);
    const sleepy = readout('sleepiness', get) / 100;
    const anx = readout('anxiety', get);
    const v = u(c) * (1 + f.nicotine * Math.max(-0.5, Math.min(1, get('rec:nachr') - 1)))
      * (1 - f.sleepy * Math.max(0, sleepy - f.sleepyFrom))
      * (1 - f.anxiety * Math.max(0, anx - f.anxietyFrom) / (100 - f.anxietyFrom))
      * (1 - f.sensory * Math.min(1, get('state:sensory_load')))
      * (1 - f.thc * Math.min(1, get('agon:cb1')))
      * (1 - f.nmda * Math.min(1, 1.5 * get('block:nmda')))
      * (1 - f.plasticity * Math.max(0, 1 - get('plasticity')));
    return 100 * Math.max(0, Math.min(1, v));
  }
  const def = readoutById[id];
  let raw = 0;
  for (const c of contributions(id, get)) raw += c.value;
  return 50 + 50 * Math.tanh(raw / def.scale);
}
