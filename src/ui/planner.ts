// Shared state and actions for editing "your day": used by the editing card
// (palette, nights, notes) and by the timeline you play and edit on.
import { useState } from 'react';
import type { Drug, InputId } from '../data/types';
import { defaultMeals, type SimConfig } from '../sim/engine';

export interface PaletteItem {
  key: string;
  group: string;
  icon: string;
  label: string;
  drug?: string;
  amount?: number;
  input?: InputId;
  hours?: number;
  intensity?: number;
  meal?: boolean;
  hint: string;
}

export const palette: PaletteItem[] = [
  { group: 'Everyday', key: 'coffee', icon: '☕', label: 'Coffee', drug: 'caffeine', amount: 1, hint: 'Hides tiredness for a few hours.' },
  { group: 'Everyday', key: 'tea', icon: '🍵', label: 'L-theanine', drug: 'theanine', amount: 1, hint: 'From tea: maybe slightly calming.' },
  { group: 'Everyday', key: 'wine', icon: '🍷', label: '2 drinks', drug: 'alcohol', amount: 1, hint: 'Relaxes, then rebounds; lighter sleep.' },
  { group: 'Everyday', key: 'cig', icon: '🚬', label: 'Cigarette', drug: 'nicotine', amount: 1, hint: 'A quick dopamine and alertness hit.' },
  { group: 'Everyday', key: 'joint', icon: '🌿', label: 'Joint (THC)', drug: 'thc', amount: 1, hint: 'Cannabis: relaxed, hungry, altered perception.' },
  { group: 'Everyday', key: 'cbd', icon: '🧴', label: 'CBD oil', drug: 'cbd', amount: 1, hint: 'Non-intoxicating. The 25 mg shop dose does almost nothing; click it on the timeline to try the 400 mg study dose.' },
  { group: 'Medication', key: 'ritalin', icon: '💊', label: 'Ritalin', drug: 'methylphenidate', amount: 1.5, hint: 'ADHD medication (20 mg).' },
  { group: 'Medication', key: 'ssri', icon: '💊', label: 'Antidepressant', drug: 'sertraline', amount: 1, hint: 'An SSRI. Takes weeks, so tick "every day".' },
  { group: 'Medication', key: 'valium', icon: '💊', label: 'Valium', drug: 'diazepam', amount: 1, hint: 'Calming medication; lasts days. Never combine with opioids or alcohol.' },
  { group: 'Medication', key: 'melatonin', icon: '🌙', label: 'Melatonin pill', drug: 'melatonin_supp', amount: 1, hint: 'A "night time" signal.' },
  { group: 'Medication', key: 'sleepaid', icon: '💤', label: 'Sleep aid (antihistamine)', drug: 'diphenhydramine', amount: 1, hint: 'Diphenhydramine, as in ZzzQuil or Vivinox (50 mg). Drowsy, foggy next morning, stops working after a few nights.' },
  { group: 'Medication', key: 'donepezil', icon: '💊', label: 'Donepezil', drug: 'donepezil', amount: 1, hint: 'Alzheimer medication: more acetylcholine. Builds up over two weeks; does little in a healthy brain.' },
  { group: 'Medication', key: 'ozempic', icon: '💉', label: 'Ozempic', drug: 'semaglutide', amount: 1, hint: 'Weekly injection; reduces appetite. Use 7+ days.' },
  { group: 'Medication', key: 'painkiller', icon: '💉', label: 'Opioid painkiller', drug: 'morphine', amount: 1, hint: 'Morphine / oxycodone. Never combine with alcohol or sedatives.' },
  { group: 'Illegal drugs', key: 'cocaine', icon: '❄️', label: 'Cocaine', drug: 'cocaine', amount: 1, hint: 'Short, intense; blocks dopamine pumps.' },
  { group: 'Illegal drugs', key: 'meth', icon: '🧊', label: 'Meth', drug: 'methamphetamine', amount: 1, hint: 'Long, strong dopamine release; drains reserves; strains the heart.' },
  { group: 'Illegal drugs', key: 'mdma', icon: '💜', label: 'MDMA', drug: 'mdma', amount: 1, hint: 'Serotonin and oxytocin flood; mid-week dip.' },
  { group: 'Illegal drugs', key: 'heroin', icon: '💉', label: 'Heroin', drug: 'heroin', amount: 1, hint: 'Fast, strong opioid. Deadly with alcohol or sedatives, and after a break.' },
  { group: 'Illegal drugs', key: 'lsd', icon: '🌈', label: 'LSD', drug: 'lsd', amount: 1, hint: 'Psychedelic, 8–12 h.' },
  { group: 'Illegal drugs', key: 'shrooms', icon: '🍄', label: 'Magic mushrooms', drug: 'psilocybin', amount: 1, hint: 'Psychedelic, ~4–6 h.' },
  { group: 'Activities', key: 'stress', icon: '😰', label: 'Stress (1 h)', input: 'stress', hours: 1, intensity: 1, hint: 'An exam, conflict or deadline.' },
  { group: 'Activities', key: 'walk', icon: '🚶', label: 'Walk (1 h)', input: 'exercise', hours: 1, intensity: 0.4, hint: 'Light exercise: calming, a small lift, no stress hormones.' },
  { group: 'Activities', key: 'run', icon: '🏃', label: 'Run (1 h)', input: 'exercise', hours: 1, intensity: 1, hint: 'Moderate exercise: the "runner\'s high", better sleep.' },
  { group: 'Activities', key: 'hiit', icon: '🏋️', label: 'Hard workout (45 min)', input: 'exercise', hours: 0.75, intensity: 1.6, hint: 'Intervals or a hard game: tough while it lasts, endorphins and a cortisol spike.' },
  { group: 'Activities', key: 'sun', icon: '☀️', label: 'Sunlight (1 h)', input: 'sunlight', hours: 1, intensity: 1, hint: 'Sets your body clock, lifts serotonin.' },
  { group: 'Activities', key: 'friends', icon: '🫂', label: 'Friends (2 h)', input: 'social', hours: 2, intensity: 1, hint: 'Oxytocin and dopamine.' },
  { group: 'Activities', key: 'meal', icon: '🍲', label: 'Meal', meal: true, hint: 'A normal meal. Three come automatically: drag them on the timeline or remove one to skip it.' },
  { group: 'Activities', key: 'treat', icon: '🍰', label: 'Treat', input: 'food', hours: 0.5, intensity: 1, hint: 'A tasty snack or dessert: a small dopamine reward.' },
  { group: 'Activities', key: 'busy', icon: '🔊', label: 'Busy place (2 h)', input: 'sensory', hours: 2, intensity: 1, hint: 'Noise, light, crowds.' },
  { group: 'Activities', key: 'pain', icon: '🤕', label: 'Pain (2 h)', input: 'pain', hours: 2, intensity: 1, hint: 'An injury or headache.' },
];
/** The dose sizes the planner offers for a drug. */
export const doseOptions = (d: Drug) => d.doseOptions ?? [
  { amount: 0.5, label: 'half dose' }, { amount: 1, label: `usual (${d.standardDose})` }, { amount: 2, label: 'double dose' },
];
/** A placed dose in words, e.g. "400 mg (study dose)" or "2× 10 mg". */
export function doseLabel(d: Drug, amount: number) {
  const o = doseOptions(d).find((x) => Math.abs(x.amount - amount) < 1e-9);
  if (o) return o.label.replace(/^usual \((.*)\)$/, '$1');
  return `${+amount.toFixed(2)}× ${d.standardDose}`;
}
export const paletteByKey = Object.fromEntries(palette.map((p) => [p.key, p]));
export const paletteGroups = Array.from(new Set(palette.map((p) => p.group)));

export type Sel = { kind: 'dose' | 'event' | 'meal'; index: number } | null;
export const snap = (min: number) => Math.round(min / 15) * 15;
export const hhmm = (min: number) => `${String(Math.floor((((min % 1440) + 1440) % 1440) / 60)).padStart(2, '0')}:${String(((min % 60) + 60) % 60).padStart(2, '0')}`;

export function usePlanner(cfg: SimConfig, setCfg: (c: SimConfig) => void) {
  const [armed, setArmed] = useState<string | null>(null);
  const [everyDay, setEveryDay] = useState(false);
  const [sel, setSel] = useState<Sel>(null);
  const last = cfg.days * 1440 - 15;
  const clamp = (t: number) => Math.max(0, Math.min(last, t));

  /** add a palette item at an absolute time (minutes since the start) */
  const place = (key: string, at: number) => {
    const p = paletteByKey[key];
    const t = clamp(snap(at));
    const day = Math.floor(t / 1440), minute = t - day * 1440;
    const dayList = everyDay ? Array.from({ length: cfg.days }, (_, d) => d) : [day];
    const meals = cfg.meals ?? defaultMeals(cfg.days);
    if (p.meal) {
      setCfg({ ...cfg, meals: [...meals, ...dayList.map((d) => d * 1440 + minute)].sort((a, b) => a - b) });
    } else if (p.drug) {
      const add = dayList.map((d) => ({ drug: p.drug!, amount: p.amount ?? 1, at: d * 1440 + minute }));
      setCfg({ ...cfg, doses: [...cfg.doses, ...add].sort((a, b) => a.at - b.at) });
    } else {
      const add = dayList.map((d) => ({ input: p.input!, at: d * 1440 + minute, duration: (p.hours ?? 1) * 60, intensity: p.intensity ?? 1 }));
      setCfg({ ...cfg, events: [...cfg.events, ...add].sort((a, b) => a.at - b.at) });
    }
    setSel(null);
  };

  const remove = (s: NonNullable<Sel>) => {
    if (s.kind === 'meal') setCfg({ ...cfg, meals: (cfg.meals ?? defaultMeals(cfg.days)).filter((_, i) => i !== s.index) });
    else if (s.kind === 'dose') setCfg({ ...cfg, doses: cfg.doses.filter((_, i) => i !== s.index) });
    else setCfg({ ...cfg, events: cfg.events.filter((_, i) => i !== s.index) });
    setSel(null);
  };

  /** move a placed item by `dm` minutes; keeps it selected (its index can change after sorting) */
  const shift = (s: NonNullable<Sel>, dm: number) => {
    if (dm === 0) return;
    if (s.kind === 'meal') {
      const list = cfg.meals ?? defaultMeals(cfg.days);
      const moved = clamp(list[s.index] + dm);
      const meals = list.map((x, i) => (i === s.index ? moved : x)).sort((a, b) => a - b);
      setCfg({ ...cfg, meals });
      if (sel) setSel({ kind: 'meal', index: meals.indexOf(moved) });
    } else if (s.kind === 'dose') {
      const moved = { ...cfg.doses[s.index], at: clamp(cfg.doses[s.index].at + dm) };
      const doses = cfg.doses.map((x, i) => (i === s.index ? moved : x)).sort((a, b) => a.at - b.at);
      setCfg({ ...cfg, doses });
      if (sel) setSel({ kind: 'dose', index: doses.indexOf(moved) });
    } else {
      const moved = { ...cfg.events[s.index], at: clamp(cfg.events[s.index].at + dm) };
      const events = cfg.events.map((x, i) => (i === s.index ? moved : x)).sort((a, b) => a.at - b.at);
      setCfg({ ...cfg, events });
      if (sel) setSel({ kind: 'event', index: events.indexOf(moved) });
    }
  };

  /** change the size of a placed dose */
  const setAmount = (index: number, amount: number) =>
    setCfg({ ...cfg, doses: cfg.doses.map((x, i) => (i === index ? { ...x, amount } : x)) });

  const meals = cfg.meals ?? defaultMeals(cfg.days);

  return { cfg, meals, armed, setArmed, everyDay, setEveryDay, sel, setSel, place, remove, shift, setAmount };
}

export type Planner = ReturnType<typeof usePlanner>;
