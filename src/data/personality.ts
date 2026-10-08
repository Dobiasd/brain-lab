// Big Five personality as gentle adjustments to a brain profile. These links
// are loose: personality is shaped by many genes, experiences and habits, and
// brain-chemistry correlates explain only a small part of it.
import type { Evidence, Personality, Profile, Trait } from './types';

export interface TraitDef {
  id: Trait;
  name: string;
  low: string;
  high: string;
  evidence: Evidence;
  /** What the slider changes in the model, in plain words. */
  model: string;
}

export const traits: TraitDef[] = [
  { id: 'neuroticism', name: 'Emotional sensitivity (neuroticism)', low: 'calm, steady', high: 'sensitive, worries easily', evidence: 'moderate',
    model: 'Stress hits harder: a more reactive alarm centre and amygdala, and a slightly weaker cortisol brake.' },
  { id: 'extraversion', name: 'Extraversion', low: 'reserved, quiet', high: 'outgoing, energetic', evidence: 'moderate',
    model: 'Stronger reward response (dopamine), social contact feels more rewarding, and busy places are less tiring.' },
  { id: 'openness', name: 'Openness', low: 'practical, routine', high: 'curious, imaginative', evidence: 'contested',
    model: 'Speculative: slightly more serotonin 2A signalling and reward-driven exploration.' },
  { id: 'conscientiousness', name: 'Conscientiousness', low: 'spontaneous', high: 'organised, disciplined', evidence: 'contested',
    model: 'Speculative: stress hits a little less hard (being organised buffers stress). Focus itself is not modelled as a trait.' },
  { id: 'agreeableness', name: 'Agreeableness', low: 'competitive, blunt', high: 'warm, cooperative', evidence: 'contested',
    model: 'Speculative: slightly stronger oxytocin signalling.' },
];

const mul = (rec: Record<string, number> | undefined, key: string, f: number) => ({ ...rec, [key]: (rec?.[key] ?? 1) * f });

export function applyPersonality(p: Profile, pers: Personality | undefined): Profile {
  if (!pers) return p;
  const n = pers.neuroticism ?? 0, e = pers.extraversion ?? 0, o = pers.openness ?? 0;
  const c = pers.conscientiousness ?? 0, a = pers.agreeableness ?? 0;
  if (!n && !e && !o && !c && !a) return p;
  let firing = { ...p.firing }, receptors = { ...p.receptors };
  const inputGain = { ...p.inputGain };
  // neuroticism
  firing = mul(firing, 'lc', 1 + 0.12 * n);
  receptors = mul(receptors, 'beta', 1 + 0.15 * n);
  receptors = mul(receptors, 'gr', 1 - 0.12 * n);
  inputGain.stress = (inputGain.stress ?? 1) * (1 + 0.12 * n);
  // extraversion
  firing = mul(firing, 'vta', 1 + 0.08 * e);
  inputGain.social = (inputGain.social ?? 1) * (1 + 0.2 * e);
  inputGain.sensory = (inputGain.sensory ?? 1) * (1 - 0.25 * e);
  // openness, conscientiousness, agreeableness (speculative, kept small)
  // (kept away from planning-brain dopamine: raising it overshoots the focus sweet spot)
  receptors = mul(receptors, 'ht2a', 1 + 0.1 * o);
  firing = mul(firing, 'vta', 1 + 0.04 * o);
  inputGain.stress = (inputGain.stress ?? 1) * (1 - 0.08 * c);
  receptors = mul(receptors, 'oxtr', 1 + 0.12 * a);
  return { ...p, firing, receptors, inputGain };
}
