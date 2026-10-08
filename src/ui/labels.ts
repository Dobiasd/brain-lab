import { nucleusById, poolById, receptorById } from '../data/chemistry';
import { drugById } from '../data/drugs';
import { inputById } from '../data/profiles';
import { readoutById } from '../sim/readouts';

export interface SeriesInfo { label: string; unit: 'score' | 'rel' | 'conc' | 'frac'; group: string; help: string }

export function seriesInfo(key: string): SeriesInfo {
  const [kind, id] = key.split(':');
  switch (kind) {
    case 'read': return { label: readoutById[id].name, unit: 'score', group: 'How it feels (0–100)', help: readoutById[id].summary };
    case 'pool': return { label: poolById[id].name, unit: 'rel', group: 'Chemical levels', help: 'Level relative to a typical awake brain (1× = typical).' };
    case 'store': return { label: `${poolById[id].name}: stores`, unit: 'frac', group: 'Stores', help: 'How full the vesicle stores are (1 = full). Releasers drain them.' };
    case 'rec': return { label: `${receptorById[id].name} signal`, unit: 'rel', group: 'Receptor signal', help: `How strongly ${receptorById[id].name} is being activated, relative to typical. ${receptorById[id].summary}` };
    case 'dens': return { label: `${receptorById[id].name} density`, unit: 'rel', group: 'Receptor density (adaptation)', help: 'How many receptors there are, relative to typical. Rises with too little stimulation and falls with too much.' };
    case 'fire': return { label: `${nucleusById[id].name}: firing`, unit: 'rel', group: 'Neuron firing', help: 'Firing rate relative to typical awake.' };
    case 'drug': return { label: `${drugById[id].name} in body`, unit: 'conc', group: 'Drug levels', help: 'Drug concentration, in units of the peak after one standard dose.' };
    case 'input': return { label: inputById[id as keyof typeof inputById]?.name ?? id, unit: 'frac', group: 'Inputs', help: 'Input intensity.' };
    case 'ei': return { label: 'Brakes vs excitement (GABA balance)', unit: 'rel', group: 'Slow variables', help: 'Inhibition relative to excitation. Sedatives raise it; it stays put when brakes merely follow excitement.' };
    case 'plasticity': return { label: 'Neuroplasticity', unit: 'rel', group: 'Slow variables', help: 'A slow "rewiring capacity" variable (think BDNF). It builds over days and much of long-term mood depends on it.' };
    case 'state':
      if (id === 'sensory_load') return { label: 'Sensory overload', unit: 'frac', group: 'Slow variables', help: 'Sensory input × gain × excitation/inhibition ratio.' };
      if (id === 'asleep') return { label: 'Asleep', unit: 'frac', group: 'Slow variables', help: '1 while asleep.' };
      if (id === 'hpa_rhythm') return { label: 'Stress-hormone day rhythm', unit: 'frac', group: 'Slow variables', help: 'The daily rhythm that raises cortisol in the morning.' };
      if (id === 'car') return { label: 'Wake-up cortisol burst', unit: 'frac', group: 'Slow variables', help: 'The cortisol awakening response, about 30 min after waking.' };
      if (id === 'dark') return { label: 'Body-clock night signal', unit: 'frac', group: 'Slow variables', help: 'The body clock\'s night signal (from about 21:00, peaking around 03:00). It drives melatonin; bright light suppresses it.' };
      if (id === 'inertia') return { label: 'Sleep inertia', unit: 'frac', group: 'Slow variables', help: 'Grogginess in the first hour after waking.' };
      if (id === 'satiety') return { label: 'Stomach fullness', unit: 'frac', group: 'Slow variables', help: 'Rises with meals, falls over ~4 hours.' };
      if (id === 'hangover') return { label: 'Hangover', unit: 'frac', group: 'Slow variables', help: 'Builds up with heavy drinking and is felt once the alcohol is gone.' };
      if (id === 'afterglow') return { label: 'Exercise afterglow', unit: 'frac', group: 'Slow variables', help: 'Builds up while you exercise and fades over the next two to three hours: the better mood and calm after a workout.' };
      if (id === 'meal') return { label: 'Eating a meal', unit: 'frac', group: 'Slow variables', help: '1 while eating a meal (three a day unless you move or remove them).' };
      return { label: 'Circadian wake drive', unit: 'frac', group: 'Slow variables', help: 'The body clock\'s push to stay awake (peaks late afternoon).' };
    default: return { label: key, unit: 'rel', group: 'Other', help: '' };
  }
}

export function fmtValue(key: string, v: number) {
  const u = seriesInfo(key).unit;
  if (u === 'score') return v.toFixed(0);
  if (u === 'rel') return `${v.toFixed(2)}×`;
  return v.toFixed(2);
}

export function fmtTime(min: number, withDay = true) {
  const day = Math.floor(min / 1440);
  const m = Math.round(min - day * 1440);
  const hh = String(Math.floor(m / 60) % 24).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return withDay ? `Day ${day + 1} · ${hh}:${mm}` : `${hh}:${mm}`;
}
