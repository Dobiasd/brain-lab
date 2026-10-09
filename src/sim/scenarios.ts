import type { Dose, InputEvent, SimConfig, SleepOverride } from './engine';
import type { InputId } from '../data/types';

const at = (day: number, hour: number) => Math.round((day * 24 + hour) * 60);
const dose = (drug: string, day: number, hour: number, amount = 1): Dose => ({ drug, at: at(day, hour), amount });
const ev = (input: InputId, day: number, hour: number, hours: number, intensity = 1): InputEvent => ({
  input, at: at(day, hour), duration: Math.round(hours * 60), intensity,
});
const daily = (drug: string, fromDay: number, toDay: number, hour: number, amount = 1) =>
  Array.from({ length: toDay - fromDay }, (_, i) => dose(drug, fromDay + i, hour, amount));

export interface Scenario {
  id: string;
  name: string;
  /** What to look at, in order. */
  story: string[];
  config: SimConfig;
  /** Series the charts should open with. */
  focus: string[];
}

export const scenarios: Scenario[] = [
  { id: 'coffee_bad_night', name: 'Coffee after a bad night',
    story: [
      'In the night before day 2 you sleep only 3 h, so adenosine is still high in the morning.',
      'Two coffees on day 2 block A1/A2A receptors: sleepiness drops even though adenosine keeps climbing.',
      'In the afternoon caffeine fades while adenosine is at its highest. That is the crash.',
      'Compare the dashed line (same day, no coffee).',
    ],
    config: { profile: 'typical', days: 3, doses: [dose('caffeine', 1, 7.5), dose('caffeine', 1, 11)], events: [],
      sleepOverrides: [{ night: 0, bed: 27, wake: 30 } as SleepOverride] },
    focus: ['read:sleepiness', 'read:arousal', 'pool:adenosine', 'drug:caffeine', 'rec:a2a', 'read:focus'] },

  { id: 'caffeine_tolerance', name: 'Daily coffee → tolerance → withdrawal',
    story: [
      'Three coffees every day for 12 days, then you stop.',
      'A1/A2A receptor density creeps up (upregulation), so each coffee does less.',
      'After stopping, the extra receptors meet normal adenosine: withdrawal sleepiness for a few days until density returns.',
    ],
    config: { profile: 'typical', days: 18, events: [],
      doses: [...daily('caffeine', 0, 12, 7.5), ...daily('caffeine', 0, 12, 11), ...daily('caffeine', 0, 12, 14)] },
    focus: ['dens:a2a', 'dens:a1', 'read:sleepiness', 'read:arousal', 'drug:caffeine'] },

  { id: 'mph_adhd', name: 'Methylphenidate in ADHD',
    story: [
      'Switch the profile between ADHD and Typical to compare.',
      'In ADHD, PFC catecholamines start on the low side of the inverted U. 20 mg pushes them toward the peak, and focus rises.',
      'In a typical brain the same dose pushes past the peak: little or no real focus gain, while arousal and jitteriness rise.',
      'Note how PFC dopamine rises mostly through NET blockade, because the PFC has few DATs.',
    ],
    config: { profile: 'adhd', days: 1, events: [], doses: [dose('methylphenidate', 0, 8, 1.5)] },
    focus: ['read:focus', 'rec:d1_pfc', 'rec:alpha2a_pfc', 'pool:da_str', 'read:arousal', 'drug:methylphenidate'] },

  { id: 'ssri_6w', name: 'SSRI over 6 weeks (depression)',
    story: [
      'Sertraline daily from day 2 in the depression profile.',
      'Serotonin rises a little at first, but 5-HT1A autoreceptors throttle raphe firing (look at raphe firing drop).',
      'Over 2–4 weeks the autoreceptors desensitise (density ↓), firing recovers and serotonin signalling climbs.',
      'Mood follows plasticity slowly, over weeks. That is why antidepressants "take a month".',
      'Early on some people feel more anxious or restless (via other serotonin receptors), which usually settles.',
    ],
    config: { profile: 'depression', days: 45, events: [], doses: daily('sertraline', 1, 45, 8) },
    focus: ['read:mood', 'plasticity', 'pool:ht', 'fire:raphe', 'dens:ht1a_auto', 'read:anxiety'] },

  { id: 'acute_stress', name: 'Acute stress & the HPA axis',
    story: [
      'A 1-hour stressor at 14:00 (an exam, a conflict).',
      'CRH → ACTH → cortisol cascade, each step delayed. Cortisol peaks ~30–60 min after the stressor.',
      'Cortisol binds GR and shuts CRH/ACTH down: negative feedback ends the response.',
      'Noradrenaline and anxiety spike within minutes, and focus first sharpens, then breaks down as NE overshoots.',
    ],
    config: { profile: 'typical', days: 1, doses: [], events: [ev('stress', 0, 14, 1, 1.0)] },
    focus: ['pool:crh', 'pool:acth', 'pool:cortisol', 'pool:ne', 'read:anxiety', 'read:focus'] },

  { id: 'chronic_stress', name: 'Weeks of chronic stress',
    story: [
      'Constant work stress for 4 weeks, then relief.',
      'Cortisol stays high, so GR density slowly falls and the feedback brake weakens. Cortisol drifts even higher.',
      'Plasticity and mood sink. After the stress ends recovery takes weeks, not days.',
    ],
    config: { profile: 'typical', days: 42, doses: [],
      events: Array.from({ length: 28 }, (_, d) => ev('stress', d, 8, 12, 0.7)) },
    focus: ['pool:cortisol', 'dens:gr', 'plasticity', 'read:mood', 'read:anxiety'] },

  { id: 'alcohol_night', name: 'Alcohol evening → next morning',
    story: [
      'Four drinks between 20:00 and 22:00.',
      'GABA-A boosted and NMDA blocked: anxiety ↓, sleepiness ↑.',
      'The fast, alcohol-sensitive GABA-A receptors adapt within hours. Next morning the alcohol is gone but they have not recovered: a small rebound of anxiety ("hangxiety").',
      'Sleep is fragmented, so less adenosine is cleared and you wake up more tired.',
    ],
    config: { profile: 'typical', days: 2, events: [], doses: [dose('alcohol', 0, 20), dose('alcohol', 0, 21.5)] },
    focus: ['read:anxiety', 'rec:gabaa', 'dens:gabaa', 'read:sleepiness', 'pool:adenosine', 'drug:alcohol'] },

  { id: 'mdma', name: 'MDMA and the mid-week blues',
    story: [
      'One dose on Saturday at 22:00.',
      'Serotonin and oxytocin flood out: mood and social warmth peak.',
      'Serotonin stores are emptied and take days to refill, so mood dips mid-week.',
    ],
    config: { profile: 'typical', days: 6, events: [ev('social', 0, 22, 4, 0.5)], doses: [dose('mdma', 0, 22)],
      sleepOverrides: [{ night: 0, bed: 28, wake: 35 }] },
    focus: ['pool:ht', 'store:ht', 'pool:oxytocin', 'read:mood', 'read:bonding', 'drug:mdma'] },

  { id: 'opioid_tolerance', name: 'Opioids: tolerance & withdrawal',
    story: [
      'Morphine every 8 h for 10 days, then stop.',
      'μ receptors become less responsive: the same dose gives less pain relief (tolerance), while breathing suppression stays a risk.',
      'On stopping, the locus coeruleus is no longer suppressed and rebounds: anxiety, arousal and noradrenaline overshoot (withdrawal).',
    ],
    config: { profile: 'typical', days: 15, events: [],
      doses: [...daily('morphine', 0, 10, 8), ...daily('morphine', 0, 10, 16), ...daily('morphine', 0, 10, 23.5)] },
    focus: ['dens:mu', 'read:analgesia', 'fire:lc', 'read:anxiety', 'read:mood', 'drug:morphine'] },

  { id: 'ketamine', name: 'Ketamine: rapid antidepressant',
    story: [
      'One sub-anaesthetic infusion in the depression profile.',
      'NMDA blockade on interneurons, then disinhibition, then a glutamate surge.',
      'The surge kicks plasticity up within a day, and mood improves within ~24 h, fading over 1–2 weeks.',
      'Compare with the SSRI scenario\'s slow climb.',
    ],
    config: { profile: 'depression', days: 14, events: [], doses: [dose('ketamine', 1, 10)] },
    focus: ['read:mood', 'plasticity', 'pool:glu', 'read:perception', 'drug:ketamine'] },

  { id: 'sensory', name: 'Busy environment: typical vs autism (E/I)',
    story: [
      'A loud, bright shopping centre from 11:00 to 14:00.',
      'With higher sensory gain and E/I ratio (autism profile), the same input drives much more cortical excitation and anxiety.',
      'Switch to the typical profile to compare. A quiet hour afterwards lets it settle.',
    ],
    config: { profile: 'autism', days: 1, doses: [], events: [ev('sensory', 0, 11, 3, 1)] },
    focus: ['state:sensory_load', 'pool:glu', 'read:anxiety', 'fire:lc', 'read:focus'] },

  { id: 'thc_busy', name: 'Cannabis in a busy place (autism)',
    story: [
      'A joint at 10:45, then a loud, bright shopping centre from 11:00 to 14:00, with the autism profile.',
      'THC turns sensory input up and, at this dose, adds to anxiety while it peaks; it lifts mood and blurs focus.',
      'The high fades within about two hours; the overload from the place itself stays until you leave.',
      'Compare the dashed line (the same busy day without cannabis).',
    ],
    config: { profile: 'autism', days: 1, events: [ev('sensory', 0, 11, 3, 1)], doses: [dose('thc', 0, 10.75)] },
    focus: ['state:sensory_load', 'read:anxiety', 'read:perception', 'read:focus', 'drug:thc'] },

  { id: 'cbd', name: 'CBD: shop dose vs study dose',
    story: [
      'Day 1: 25 mg CBD oil at 9:00, the dose sold in shops. Day 2: about 400 mg at 9:00, the size used in anxiety studies.',
      'A stressful hour at 12:00 on both days.',
      'The shop dose does practically nothing. The large dose calms a little, without any high.',
    ],
    config: { profile: 'typical', days: 3, events: [ev('stress', 0, 12, 1), ev('stress', 1, 12, 1)],
      doses: [dose('cbd', 0, 9), dose('cbd', 1, 9, 16)] },
    focus: ['read:anxiety', 'read:perception', 'pool:anandamide', 'drug:cbd'] },

  { id: 'sleep_aid', name: 'An antihistamine sleep aid for five nights',
    story: [
      'A 50 mg diphenhydramine sleep aid (as in ZzzQuil or Vivinox) at 21:30 for five nights, then none.',
      'It blocks histamine, the brain\'s wake signal, so you get drowsy, and some is still there the next morning.',
      'Over a few days the brain makes more histamine receptors, so the pill does less each night.',
    ],
    config: { profile: 'typical', days: 7, events: [], doses: daily('diphenhydramine', 0, 5, 21.5) },
    focus: ['read:sleepiness', 'read:focus', 'drug:diphenhydramine', 'rec:h1', 'dens:h1'] },

  { id: 'ozempic', name: 'Ozempic over 6 weeks',
    story: [
      'A weekly semaglutide injection, every Monday morning.',
      'Meals still make you full, but the drug keeps the fullness signal (GLP-1 receptors) switched on between meals too.',
      'The drug builds up over the first weeks, so appetite drops step by step.',
      'Food "wanting" in the reward system is dampened a little as well.',
    ],
    config: { profile: 'typical', days: 42, events: [], doses: Array.from({ length: 6 }, (_, w) => dose('semaglutide', 1 + w * 7, 9)) },
    focus: ['read:hunger', 'rec:glp1r', 'drug:semaglutide', 'read:motivation'] },

  { id: 'healthy_day', name: 'A healthy day',
    story: [
      'Morning sunlight, a run at 17:00, dinner with friends.',
      'Sunlight boosts serotonin and anchors melatonin for the night.',
      'Exercise: endorphins, endocannabinoids, and more adenosine for deeper sleep.',
      'Social time: oxytocin and dopamine.',
    ],
    config: { profile: 'typical', days: 2, doses: [],
      events: [ev('sunlight', 0, 8, 1.5), ev('exercise', 0, 17, 1, 1.2), ev('social', 0, 19.5, 3), ev('food', 0, 19.5, 1)] },
    focus: ['read:mood', 'pool:endorphin', 'pool:anandamide', 'pool:oxytocin', 'pool:melatonin', 'pool:adenosine'] },
];

export const scenarioById = Object.fromEntries(scenarios.map((s) => [s.id, s]));
