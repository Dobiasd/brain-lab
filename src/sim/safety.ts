// Safety warnings. The simulation is a cartoon, but some combinations are deadly
// in real life, and the page must say so plainly rather than show a pleasant high.
import type { SimConfig } from './engine';

export interface Warning { level: 'danger' | 'caution'; title: string; text: string }

const OPIOIDS = ['morphine', 'heroin'];
const SEDATIVES = ['alcohol', 'diazepam'];
const SEROTONERGIC = ['sertraline', 'phenelzine'];
const STIMULANTS = ['cocaine', 'methamphetamine', 'amphetamine', 'mdma', 'methylphenidate'];

/** Is drug b in the body while drug a is (doses within `window` minutes of each other)? */
function overlap(cfg: SimConfig, a: string[], b: string[], window: number) {
  return cfg.doses.some((x) => a.includes(x.drug) && cfg.doses.some((y) => b.includes(y.drug) && Math.abs(x.at - y.at) < window));
}

export const EMERGENCY = 'In real life: call emergency services (112 in Europe, 911 in the US). If opioids are involved, give naloxone if available, keep the person on their side and stay with them, because an overdose can return when naloxone wears off.';

/** Warnings about the plan itself, shown as soon as things are placed on the timeline. */
export function planWarnings(cfg: SimConfig): Warning[] {
  const w: Warning[] = [];
  if (overlap(cfg, OPIOIDS, SEDATIVES, 12 * 60)) w.push({ level: 'danger', title: 'Deadly combination: opioids + alcohol or sedatives',
    text: 'Each of these slows breathing, and together the effect multiplies. This combination causes most overdose deaths, even at doses that would be "fine" alone.' });
  if (cfg.doses.some((d) => OPIOIDS.includes(d.drug) && d.amount > 1)) w.push({ level: 'danger', title: 'High opioid dose',
    text: 'Higher opioid doses can stop breathing. Street opioids vary wildly in strength and are often mixed with fentanyl.' });
  // opioids again after a break of 3+ days, following repeated use: tolerance has dropped
  const op = cfg.doses.filter((d) => OPIOIDS.includes(d.drug)).sort((a, b) => a.at - b.at);
  for (let i = 1; i < op.length; i++) {
    const before = op.filter((d) => d.at < op[i].at && op[i].at - d.at < 14 * 1440).length;
    if (op[i].at - op[i - 1].at >= 3 * 1440 && before >= 3) {
      w.push({ level: 'danger', title: 'Using again after a break',
        text: 'Tolerance fades within days. After a break the old dose can be deadly, a common cause of overdose after detox or prison.' });
      break;
    }
  }
  if (overlap(cfg, ['mdma'], SEROTONERGIC, 3 * 1440) || overlap(cfg, ['phenelzine'], STIMULANTS, 14 * 1440)) w.push({ level: 'danger', title: 'Dangerous interaction',
    text: 'MDMA with antidepressants, and any stimulant with an MAO inhibitor, can cause serotonin syndrome or a hypertensive crisis: fever, agitation, seizures. This is a medical emergency.' });
  if (overlap(cfg, ['cocaine'], ['alcohol'], 6 * 60)) w.push({ level: 'caution', title: 'Cocaine + alcohol',
    text: 'Together they form cocaethylene, which strains the heart more than either drug alone.' });
  const daily = (drug: string) => cfg.doses.filter((d) => d.drug === drug).length >= 7;
  if (daily('diazepam') || daily('alcohol')) w.push({ level: 'caution', title: 'Regular alcohol or benzodiazepines',
    text: 'After regular heavy use, stopping suddenly can cause seizures and delirium, which can be life-threatening. Taper with a doctor.' });
  if (cfg.doses.some((d) => d.drug === 'sertraline')) w.push({ level: 'caution', title: 'About antidepressants',
    text: 'The first weeks can bring more anxiety, and under 25s have a higher risk of suicidal thoughts at the start, so talk to the prescriber. Never stop abruptly; reduce slowly with a doctor.' });
  return w;
}

/** Warnings about the current moment of the simulation. */
export function liveWarnings(get: (k: string) => number): Warning[] {
  const b = get('read:breathing');
  if (b < 12) return [{ level: 'danger', title: '🚨 Breathing drive critically low', text: `In this model, breathing is strongly suppressed. In a real person this could be a fatal overdose. ${EMERGENCY}` }];
  if (b < 25) return [{ level: 'danger', title: '⚠️ Breathing drive dangerously low', text: `Opioids and sedatives are suppressing the brainstem's breathing drive. ${EMERGENCY}` }];
  return [];
}
