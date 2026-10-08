import type { InputDef, Profile } from './types';

export const inputs: InputDef[] = [
  { id: 'stress', name: 'Psychological stress', summary: 'A deadline, conflict or threat. Drives the HPA axis (CRH → ACTH → cortisol) and the locus coeruleus.' },
  { id: 'exercise', name: 'Exercise', summary: 'Endorphins, endocannabinoids, some dopamine and serotonin, a short cortisol bump, and more adenosine (better sleep).' },
  { id: 'sunlight', name: 'Bright light / sunlight', summary: 'Suppresses melatonin, supports serotonin, and anchors the body clock.' },
  { id: 'social', name: 'Social connection', summary: 'Touch, closeness, laughter: oxytocin, endorphins and dopamine.' },
  { id: 'food', name: 'Tasty food', summary: 'A reward signal: dopamine in the striatum.' },
  { id: 'sensory', name: 'Sensory load', summary: 'A noisy, bright, busy environment. How much it drives cortex and arousal depends on sensory gain.' },
  { id: 'pain', name: 'Pain', summary: 'Activates stress and arousal systems and recruits endorphins and endocannabinoids.' },
];

export const profiles: Profile[] = [
  { id: 'typical', name: 'Typical adult', evidence: 'strong',
    summary: 'Reference brain: sleeps 23:00–07:00, no chronic stress. All other profiles are expressed relative to this one.' },
  { id: 'adhd', name: 'ADHD', evidence: 'moderate',
    summary: 'Catecholamine hypothesis: lower dopamine and noradrenaline signalling in the PFC, possibly with altered dopamine transporters (brain-scan findings are inconsistent). That puts the PFC on the left side of the inverted U, and stimulants move it toward the peak. ADHD is heterogeneous, and this is one supported mechanism, not the whole story.',
    firing: { vta: 0.8, vta_meso: 0.75, lc: 0.75 }, clearers: { dat: 1.4, net: 1.3 } },
  { id: 'autism', name: 'Autism (E/I model)', evidence: 'contested',
    summary: 'One influential hypothesis: a shifted excitation/inhibition balance (more glutamate drive, weaker GABA), which raises sensory gain, so ordinary environments can become overwhelming. The model also slightly lowers oxytocin signalling, but evidence for that is weak (a large oxytocin trial in autism found no benefit). Autism is highly heterogeneous, and many autistic people and researchers prefer a difference-not-deficit framing. Treat this as a cartoon of one hypothesis.',
    firing: { interneurons: 0.82, pyramidal: 1.12 }, sensoryGain: 1.8, receptors: { oxtr: 0.85 } },
  { id: 'depression', name: 'Depression', evidence: 'mixed',
    summary: 'A cartoon of several overlapping findings: an overactive stress axis with weak cortisol feedback (lower GR sensitivity), reduced neuroplasticity and lower reward drive. It also slightly lowers serotonin firing, a weakly supported assumption. The "chemical imbalance" story alone is not supported, and the plasticity and stress models fit better.',
    firing: { raphe: 0.85, vta: 0.75 }, receptors: { gr: 0.7 }, plasticity: 0.7, inputs: { stress: 0.25 } },
  { id: 'anxiety', name: 'Generalised anxiety', evidence: 'mixed',
    summary: 'A hyper-reactive amygdala and locus coeruleus, weaker GABA tone and lower 5-HT1A signalling.',
    firing: { lc: 1.3, interneurons: 0.9 }, receptors: { ht1a_post: 0.8, beta: 1.2 } },
  { id: 'chronic_stress', name: 'Chronic stress', evidence: 'strong',
    summary: 'Constant background stress. Over weeks GR receptors downregulate, so the cortisol brake weakens, cortisol stays high, and plasticity and mood drop.',
    inputs: { stress: 0.5 } },
  { id: 'sleep_deprived', name: 'Chronically short sleep', evidence: 'strong',
    summary: 'Sleeps 01:00–06:00 every night. Adenosine is never fully cleared, so sleep pressure carries over day to day.',
    sleep: { bed: 25, wake: 30 } },
];

export const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));
export const inputById = Object.fromEntries(inputs.map((i) => [i.id, i]));
