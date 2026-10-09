// Core types for the knowledge graph. Everything the simulator does is driven
// by these records, so adding a system means adding data, not code.

export type Evidence = 'strong' | 'moderate' | 'mixed' | 'contested';

export interface Region {
  id: string;
  name: string;
  /** Position on the sagittal brain map (viewBox 0..800 x 0..560). */
  x: number;
  y: number;
  r: number;
  role: string;
  /** Body organs (adrenal glands) are drawn outside the brain outline. */
  body?: boolean;
}

export type ChemicalKind = 'neurotransmitter' | 'neuromodulator' | 'hormone' | 'neuropeptide' | 'endocannabinoid';

export interface Chemical {
  id: string;
  name: string;
  kind: ChemicalKind;
  summary: string;
}

/** A clearance route: a transporter (reuptake) or enzyme (degradation). */
export interface Clearer {
  id: string;
  name: string;
  kind: 'transporter' | 'enzyme' | 'other';
  summary: string;
}

/** Something whose level changes over time: a chemical in one place. */
export interface Pool {
  id: string;
  chemical: string;
  name: string;
  /** Nucleus / gland whose firing drives release into this pool. */
  source: string;
  /** Where the pool lives (for map glow + graph edges). */
  region: string;
  /** Clearance time constant at baseline, in minutes. */
  tau: number;
  /** Fraction of clearance per route; must sum to 1. */
  clearance: { by: string; frac: number }[];
  /** Vesicular store recovery time constant (minutes). Releasers drain the store. */
  storeTau: number;
}

export interface Receptor {
  id: string;
  name: string;
  pool: string;
  region: string;
  /** How the signal enters downstream maths: 'post' = normal, 'auto' = feedback on source. */
  role: 'post' | 'auto';
  /**
   * Homeostatic adaptation: density moves toward signal^(-strength) with time
   * constant `adaptTau` minutes. strength 0 = no adaptation, 1 = full compensation.
   */
  adaptTau: number;
  adaptStrength: number;
  /** only upregulates when under-stimulated, never downregulates */
  adaptUpOnly?: boolean;
  /** adapts only to the signal while awake (for transmitters that fall silent in every sleep) */
  adaptAwake?: boolean;
  summary: string;
}

/** A term in a log-linear firing rule: firing = base * exp(sum w * (x - 1)). */
export interface Modulator {
  /** 'receptor:<id>' | 'input:<id>' | 'pool:<id>' | 'state:<id>' */
  ref: string;
  w: number;
  /** 'log': firing scales as x^w (a power law, used for hormone cascades); default: exp(w·(x−1)). Receptor/pool refs only. */
  form?: 'log';
  /** input refs only: count only the part of the input above this level (an effort threshold) */
  above?: number;
  note: string;
}

export interface Nucleus {
  id: string;
  region: string;
  name: string;
  modulators: Modulator[];
}

export type Action =
  | 'agonist' // occupies receptor, activates it with `efficacy` (1 = full agonist)
  | 'antagonist' // occupies receptor, blocks endogenous signal
  | 'pam' // positive allosteric modulator: amplifies endogenous signal
  | 'nam' // negative allosteric modulator: damps the receptor's response to anything that binds it (`efficacy` = fraction removed)
  | 'reuptake_inhibitor' // blocks a transporter
  | 'enzyme_inhibitor' // blocks an enzyme
  | 'releaser'; // reverses transport / dumps vesicles into a pool

export interface DrugTarget {
  target: string; // receptor, clearer or pool id
  action: Action;
  /** Concentration (in units of one standard dose's peak) giving half effect. */
  ec50: number;
  efficacy?: number;
  /** for antagonists: share of the body's own signal it blocks (default 1). Naloxone barely touches resting endorphin tone. */
  endogenous?: number;
  /** irreversible enzyme block: the drug destroys enzyme at `inactivation`·C per minute; new enzyme is made with half-time `recovery` (minutes). ec50 is then unused. */
  irreversible?: { inactivation: number; recovery: number };
  note?: string;
}

export interface Drug {
  id: string;
  name: string;
  category: string;
  standardDose: string;
  /** Steepness of the response to falling levels (Hill coefficient, default 1). Above 1 the felt effect
   * switches off more sharply as the level drops, as for drugs whose effect fades well before the drug is gone. */
  hill?: number;
  /** Dose sizes offered in the day planner, as multiples of the standard dose (default: half, usual, double). */
  doseOptions?: { amount: number; label: string }[];
  /** Time to peak (minutes) and elimination half-life (minutes). */
  tmax: number;
  halfLife: number;
  targets: DrugTarget[];
  summary: string;
  /** Effects outside the modelled pools, kept as text. */
  notModelled?: string;
  /** Extra effect on sleep quality: 0..1 fraction of restorative sleep lost at peak. */
  sleepDisruption?: number;
  /** A hormone taken as a supplement adds to its blood level (`scale` × the typical daytime level at the dose's peak). Shown in the pool's chart; its receptor effect is in `targets`. */
  bloodLevel?: { pool: string; scale: number };
  /** Half-time (minutes) for blood and brain to equilibrate: the effect lags behind blood levels (default 10). */
  effectDelay?: number;
  /** Part of the dose that leaves the blood fast (redistribution into fat/muscle), with its own half-life (minutes). */
  fastPhase?: { frac: number; halfLife: number };
  /** Saturable (zero-order-like) elimination: −vmax·C/(km+C) per minute, in units of one dose's peak. Replaces halfLife for clearance. */
  saturable?: { vmax: number; km: number };
  /** Acute tolerance within a session (receptor desensitisation, the "rush" fading): up to `strength` of the effect is lost; builds with half-time `on`, recovers with `off` (minutes). */
  acuteTolerance?: { strength: number; on: number; off: number };
}

export interface Profile {
  id: string;
  name: string;
  evidence: Evidence;
  summary: string;
  /** Multipliers on nucleus base firing. */
  firing?: Record<string, number>;
  /** Multipliers on clearer activity (e.g. DAT density). */
  clearers?: Record<string, number>;
  /** Multipliers on receptor density. */
  receptors?: Record<string, number>;
  /** Constant background inputs (0..1). */
  inputs?: Partial<Record<InputId, number>>;
  /** Sleep schedule in clock hours. */
  sleep?: { bed: number; wake: number };
  /** Baseline of the slow plasticity variable (1 = typical). */
  plasticity?: number;
  /** Gain on sensory input (E/I balance cartoon). */
  sensoryGain?: number;
  /** Multipliers on how strongly each input hits this brain. */
  inputGain?: Partial<Record<InputId, number>>;
}

export type InputId = 'stress' | 'exercise' | 'sunlight' | 'social' | 'food' | 'sensory' | 'pain';

export type Trait = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';
/** Big Five scores from −1 (low) to +1 (high); 0 = average. */
export type Personality = Partial<Record<Trait, number>>;

export interface InputDef {
  id: InputId;
  name: string;
  summary: string;
}

export type EdgeType =
  | 'projects_to'
  | 'releases'
  | 'binds'
  | 'clears'
  | 'modulates'
  | 'targets'
  | 'located_in';

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
}
