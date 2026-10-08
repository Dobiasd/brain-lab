import type { Region } from './types';

// Positions are for a schematic mid-sagittal view, front of the head on the left.
// Lateral structures (amygdala, hippocampus) are projected onto the midline.
export const regions: Region[] = [
  { id: 'pfc', name: 'Prefrontal cortex', x: 175, y: 195, r: 40,
    role: 'Planning, working memory, impulse control. Runs best at a *moderate* level of dopamine and noradrenaline (an inverted U).' },
  { id: 'cortex', name: 'Cortex (general)', x: 395, y: 115, r: 42,
    role: 'The outer sheet of neurons. Pyramidal cells (glutamate) are balanced by interneurons (GABA). Serotonin 2A receptors here are the main target of psychedelics.' },
  { id: 'striatum', name: 'Striatum / nucleus accumbens', x: 290, y: 235, r: 26,
    role: 'Reward, motivation, habit and action selection. The nucleus accumbens is the "wanting" hub where most addictive drugs raise dopamine.' },
  { id: 'thalamus', name: 'Thalamus', x: 405, y: 235, r: 22,
    role: 'Relay station that gates sensory information to the cortex.' },
  { id: 'basal_forebrain', name: 'Basal forebrain', x: 262, y: 292, r: 12,
    role: 'Source of cortical acetylcholine (attention, alertness). Strongly inhibited by adenosine: one route of sleep pressure.' },
  { id: 'amygdala', name: 'Amygdala', x: 295, y: 340, r: 16,
    role: 'Threat detection, fear learning, emotional salience. Drives the stress response via the hypothalamus.' },
  { id: 'hippocampus', name: 'Hippocampus', x: 375, y: 350, r: 19,
    role: 'Memory formation and context. Dense in cortisol (glucocorticoid) and cannabinoid receptors; neuroplasticity hotspot.' },
  { id: 'hypothalamus', name: 'Hypothalamus', x: 345, y: 292, r: 16,
    role: 'Master regulator of the body: stress (CRH), sleep/circadian clock (SCN), hunger, oxytocin, endorphins.' },
  { id: 'pituitary', name: 'Pituitary gland', x: 330, y: 335, r: 9,
    role: 'Hormone gland under the hypothalamus. Releases ACTH into the blood in response to CRH.' },
  { id: 'pineal', name: 'Pineal gland', x: 470, y: 248, r: 9,
    role: 'Makes melatonin at night when the eyes report darkness. Suppressed by bright light.' },
  { id: 'vta', name: 'Ventral tegmental area (VTA)', x: 432, y: 300, r: 12,
    role: 'Dopamine neurons of the reward system. Fire in bursts when something turns out better than expected, and pause when it is worse. This is how the brain learns what is worth pursuing.' },
  { id: 'raphe', name: 'Raphe nuclei', x: 468, y: 352, r: 12,
    role: 'Source of almost all brain serotonin. Self-limited by 5-HT1A autoreceptors.' },
  { id: 'lc', name: 'Locus coeruleus', x: 492, y: 388, r: 10,
    role: 'Source of brain noradrenaline: arousal, vigilance, the "alarm" system. Silent in sleep, very active under stress.' },
  { id: 'cerebellum', name: 'Cerebellum', x: 620, y: 372, r: 48,
    role: 'Motor coordination and timing. Very sensitive to alcohol (the wobble).' },
  { id: 'gut', name: 'Stomach & gut (body)', x: 350, y: 512, r: 18, body: true,
    role: 'The gut talks to the brain with hormones: ghrelin when empty ("eat") and GLP-1 when full ("enough").' },
  { id: 'adrenal', name: 'Adrenal glands (body)', x: 150, y: 505, r: 20, body: true,
    role: 'On top of the kidneys. Release cortisol into the blood in response to ACTH; the end of the HPA stress axis.' },
];

export const regionById = Object.fromEntries(regions.map((r) => [r.id, r]));
