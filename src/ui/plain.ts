// Everyday names and icons, used everywhere outside "Show the science" mode.
import { seriesInfo } from './labels';

export const feelings: { id: string; icon: string; name: string; up: string; down: string }[] = [
  { id: 'arousal', icon: '⚡', name: 'Alert', up: 'more alert', down: 'less alert' },
  { id: 'focus', icon: '🎯', name: 'Focused', up: 'more focused', down: 'less focused' },
  { id: 'motivation', icon: '🚀', name: 'Motivated', up: 'more motivated', down: 'less motivated' },
  { id: 'anxiety', icon: '😰', name: 'Anxious', up: 'more anxious', down: 'calmer' },
  { id: 'mood', icon: '🙂', name: 'Mood', up: 'in a better mood', down: 'in a lower mood' },
  { id: 'sleepiness', icon: '😴', name: 'Sleepy', up: 'sleepier', down: 'less sleepy' },
  { id: 'hunger', icon: '🍽️', name: 'Hungry', up: 'hungrier', down: 'less hungry' },
  { id: 'bonding', icon: '🤗', name: 'Connected', up: 'more connected to others', down: 'less connected to others' },
  { id: 'analgesia', icon: '🩹', name: 'Pain relief', up: 'less sensitive to pain', down: 'more sensitive to pain' },
  { id: 'perception', icon: '🌀', name: 'Altered perception', up: 'like your perception is altered', down: 'like your perception is more normal' },
];
export const feelingById = Object.fromEntries(feelings.map((f) => [f.id, f]));

/** Plain names for the signals that appear in tours and simple mode. */
const plainNames: Record<string, string> = {
  'pool:adenosine': 'Tiredness chemical (adenosine)',
  'pool:cortisol': 'Stress hormone (cortisol)',
  'pool:crh': 'Stress alarm from the brain (CRH)',
  'pool:acth': 'Stress messenger in the blood (ACTH)',
  'pool:ne': 'Alarm chemical (noradrenaline)',
  'pool:ht': 'Serotonin',
  'pool:da_str': 'Reward chemical (dopamine)',
  'pool:da_pfc': 'Dopamine in the "planning" brain',
  'pool:oxytocin': 'Bonding hormone (oxytocin)',
  'pool:endorphin': "Body's own painkiller (endorphins)",
  'pool:anandamide': "Body's own cannabis (anandamide)",
  'pool:melatonin': 'Night-time hormone (melatonin)',
  'pool:ghrelin': 'Hunger hormone (ghrelin)',
  'pool:glp1': 'Fullness hormone (GLP-1)',
  'rec:glp1r': 'Fullness signal (GLP-1 receptors)',
  'state:satiety': 'How full your stomach is',
  'state:hangover': 'Hangover',
  'state:afterglow': 'Exercise afterglow',
  'ei:inhib': 'Brain brakes vs excitement',
  'pool:ach': 'Attention chemical (acetylcholine)',
  'pool:hist': 'Wake signal (histamine)',
  'rec:m1': 'Attention receptors (acetylcholine M1)',
  'rec:h1': 'Wake receptors (histamine H1)',
  'dens:h1': 'Number of wake receptors (H1)',
  'block:h1': 'Wake signal blocked (antihistamine)',
  'block:m1': 'Attention signal blocked (anticholinergic)',
  'pool:glu': 'Brain excitement (glutamate)',
  'pool:gaba': 'Brain brakes (GABA)',
  'store:ht': 'Serotonin reserves',
  'store:da_str': 'Dopamine reserves',
  'plasticity': 'Brain rewiring capacity',
  'state:sensory_load': 'Sensory overload',
  'dens:a2a': 'Number of caffeine-target receptors',
  'dens:a1': 'Number of tiredness receptors (A1)',
  'dens:gabaa': 'Number of "calm" receptors (GABA-A)',
  'dens:gr': 'Cortisol sensors (stress brake)',
  'dens:mu': 'Number of opioid receptors',
  'dens:ht1a_auto': 'Serotonin thermostat (autoreceptors)',
  'fire:raphe': 'Serotonin neurons firing',
  'fire:lc': 'Alarm centre activity (locus coeruleus)',
  'rec:a2a': 'Tiredness signal (A2A receptors)',
  'rec:gabaa': '"Calm" signal (GABA-A)',
  'rec:d1_pfc': 'Dopamine signal for focus',
  'rec:alpha2a_pfc': 'Noradrenaline signal for focus',
  'rec:ht1a_post': 'Calming serotonin signal',
  'rec:beta': 'Fight-or-flight receptors (β)',
  'rec:alpha1': 'Alertness receptors (α1)',
  'rec:gr': 'Cortisol sensors (stress brake)',
  'rec:a1': 'Tiredness receptors (A1)',
  'rec:ht2a': 'Serotonin 2A receptors',
  'rec:mu': 'Opioid receptors',
  'rec:oxtr': 'Oxytocin receptors',
  'rec:cb1': 'Cannabinoid receptors (CB1)',
  'rec:nmda': 'Learning receptors (NMDA)',
  'rec:nmda_int': 'Brake-neuron NMDA receptors',
  'rec:d1_str': 'Reward receptors (dopamine D1)',
  'rec:d2_str': 'Reward receptors (dopamine D2)',
  'rec:ghsr': 'Hunger receptors (ghrelin)',
  'rec:nachr': 'Nicotine receptors',
  'rec:mt1': 'Night-signal receptors (melatonin)',
  'rec:gabaa_ex': '"Calm" signal, background (GABA-A)',
  'rec:ht1a_auto': 'Serotonin thermostat',
  'rec:alpha2_auto': 'Alarm-centre brake (α2)',
  'rec:d2_auto': 'Dopamine thermostat (D2)',
};

const drugPlain: Record<string, string> = {
  caffeine: 'Caffeine', methylphenidate: 'Ritalin', amphetamine: 'Amphetamine', cocaine: 'Cocaine', nicotine: 'Nicotine',
  alcohol: 'Alcohol', diazepam: 'Valium', sertraline: 'Antidepressant (SSRI)', bupropion: 'Bupropion', phenelzine: 'MAO inhibitor',
  mdma: 'MDMA', thc: 'Cannabis (THC)', morphine: 'Opioid painkiller', naloxone: 'Naloxone', ketamine: 'Ketamine',
  psilocybin: 'Psilocybin', melatonin_supp: 'Melatonin pill', propranolol: 'Beta-blocker', guanfacine: 'Guanfacine', haloperidol: 'Antipsychotic',
  heroin: 'Heroin', methamphetamine: 'Meth', lsd: 'LSD', cbd: 'CBD', theanine: 'L-theanine', semaglutide: 'Ozempic',
  diphenhydramine: 'Sleep aid (antihistamine)', donepezil: 'Donepezil',
};
export const drugPlainName = (id: string) => drugPlain[id] ?? id;

export function plainLabel(key: string): string {
  if (key.startsWith('read:')) {
    const f = feelingById[key.slice(5)];
    if (key === 'read:breathing') return '🫁 Breathing drive (safety)';
    return f ? `${f.icon} ${f.name}` : seriesInfo(key).label;
  }
  if (key.startsWith('drug:')) return `${drugPlainName(key.slice(5))} in your body`;
  return plainNames[key] ?? seriesInfo(key).label;
}

// Icons for the day planner and lists.
export const drugIcon: Record<string, string> = {
  caffeine: '☕', alcohol: '🍷', nicotine: '🚬', methylphenidate: '💊', amphetamine: '💊', sertraline: '💊', bupropion: '💊',
  phenelzine: '💊', diazepam: '💊', guanfacine: '💊', haloperidol: '💊', propranolol: '💊', melatonin_supp: '🌙',
  thc: '🌿', mdma: '💜', cocaine: '❄️', morphine: '💉', naloxone: '🚑', ketamine: '⚡', psilocybin: '🍄',
  heroin: '💉', methamphetamine: '🧊', lsd: '🌈', cbd: '🧴', theanine: '🍵', semaglutide: '💉',
  diphenhydramine: '💤', donepezil: '💊',
};
export const inputIcon: Record<string, string> = {
  stress: '😰', exercise: '🏃', sunlight: '☀️', social: '🫂', food: '🍰', sensory: '🔊', pain: '🤕',
};
