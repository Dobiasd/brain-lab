# Reference table for a brain simulation, version 2

You are writing what the scientific literature says about drugs, activities and brain profiles. Use the literature and your own expert knowledge, and look things up on the web where useful.

**Do not look at any project code, model or existing tables.** The point is an independent reference to test a simulation against. Only write claims you would defend to a pharmacologist or psychiatrist. Give each claim an honest confidence and a real source.

The simulation is a teaching cartoon for lay people. It must get **directions, rough sizes, time courses and relative orderings** right. Exact numbers are not expected, so give ranges wide enough to be true across typical studies.

## Shared vocabulary

### Feelings
Each feeling is a 0–100 score. Think of it like a visual-analogue scale (VAS), where a person's normal daytime level is around the middle.

| feeling | what it means |
|---|---|
| `arousal` | alertness, energy, wakefulness |
| `focus` | sustained attention / working-memory performance |
| `motivation` | drive, "wanting", reward seeking |
| `anxiety` | anxiety, threat feeling, nervousness |
| `mood` | overall emotional tone, well-being, euphoria at the top |
| `sleepiness` | felt sleep pressure / drowsiness |
| `hunger` | appetite, drive to eat |
| `bonding` | social warmth, feeling connected and trusting |
| `analgesia` | pain relief (up = less pain) |
| `perception` | altered perception (psychedelic, dissociative or strongly intoxicated perception) |
| `breathing` | respiratory drive (down = suppressed breathing) |

**Sizes**, on that 0–100 VAS-like scale:
- `small`: noticeable, about 5–15 points
- `medium`: clear, about 15–30 points
- `large`: strong, obvious, more than 30 points

### Brain chemistry measures
Use these with `level` and `daily`. Each is an extracellular or blood level.

| measure | what it is |
|---|---|
| `dopamine_striatum` | extracellular dopamine in striatum / nucleus accumbens |
| `dopamine_pfc` | extracellular dopamine in prefrontal cortex |
| `noradrenaline` | extracellular noradrenaline in cortex |
| `serotonin` | extracellular serotonin in cortex/forebrain |
| `acetylcholine` | cortical acetylcholine |
| `glutamate` | cortical glutamate release/drive |
| `gaba` | cortical GABA release/tone |
| `adenosine` | basal-forebrain adenosine (sleep pressure) |
| `cortisol` | blood cortisol |
| `acth` | blood ACTH |
| `melatonin` | blood melatonin |
| `oxytocin` | oxytocin release |
| `endorphin` | β-endorphin release |
| `anandamide` | brain anandamide |
| `ghrelin` | blood ghrelin |
| `glp1` | blood GLP-1 |

### Substances and standard doses ("amount": 1 = one standard dose)

| id | standard dose |
|---|---|
| `caffeine` | 1 coffee (~100 mg) |
| `methylphenidate` | 10–20 mg immediate release |
| `amphetamine` | 10 mg dexamphetamine |
| `methamphetamine` | typical recreational dose |
| `cocaine` | typical recreational dose (intranasal) |
| `nicotine` | 1 cigarette |
| `alcohol` | 2 standard drinks |
| `diazepam` | 5 mg |
| `sertraline` | 50 mg daily |
| `bupropion` | 150 mg |
| `phenelzine` | 15 mg |
| `mdma` | 100 mg |
| `thc` | 1 moderate joint (0.5 = a few puffs, 3 = heavy) |
| `cbd` | 25 mg oil |
| `morphine` | 10 mg oral (also stands for oxycodone) |
| `heroin` | 1 typical dose, injected or smoked |
| `naloxone` | 0.4 mg (only with an opioid) |
| `ketamine` | 0.5 mg/kg sub-anaesthetic infusion over 40 min |
| `psilocybin` | 15–25 mg |
| `lsd` | 100 µg |
| `theanine` | 200 mg |
| `melatonin` | 0.5–1 mg |
| `propranolol` | 40 mg |
| `guanfacine` | 1 mg immediate release |
| `haloperidol` | 2 mg |
| `semaglutide` | weekly injection, maintenance dose |

Combinations are written `a+b`, for example `heroin+alcohol`.

### Activities
Activities use amount 1 and default durations:

| id | what | default duration |
|---|---|---|
| `stress` | an acute psychological stressor | 1 h |
| `exercise` | moderate–vigorous exercise | 1 h |
| `sunlight` | bright daylight outdoors | 1.5 h |
| `social` | warm time with friends, touch | 2 h |
| `food` | a tasty meal | 0.5 h |
| `sensory` | a loud, bright, crowded place | 3 h |
| `pain` | moderate ongoing pain | 2 h |
| `short_sleep` | only 4 h sleep the night before | — |

### Situations ("context")

| context | what happens |
|---|---|
| `quiet` | an ordinary awake day at home; dose or activity start at 10:00 |
| `busy` | a loud, crowded place 11:00–14:00; dose at 10:45 |
| `stress` | a 1 h stressor at 14:00; dose at 13:30 |
| `evening` | dose at 21:00 |
| `next_morning` | dose at 21:00 the evening before; judged the next morning at 10:00 |
| `chronic` | daily use for 4 weeks, judged ~4 h after the day's first dose and compared with a never-user. Short-acting drugs are taken as regular users take them, several times a day. |
| `withdrawal` | 1–3 days after stopping 2 weeks of regular use, compared with a never-user |

### Profiles
- `typical`: sleeps 23:00–07:00
- `adhd`
- `autism` (one influential model: higher sensory sensitivity and an excitation/inhibition shift)
- `depression` (major depression)
- `anxiety` (generalised anxiety disorder)
- `chronic_stress`
- `sleep_deprived` (sleeps 01:00–06:00 every night)

## Entry kinds
Write the entries your task asks for. Every entry has `kind`, `confidence` (`high` = textbook or meta-analytic; `medium` = several studies; `low` = mixed or plausible), `why` (one plain sentence) and `source`. Low-confidence entries are reported but not enforced.

### 1. `effect`: what something does to a feeling
Compared with the same situation without it.

```json
{"kind":"effect","what":"caffeine","amount":1,"context":"quiet","profile":"typical","when_h":1,
 "feeling":"arousal","direction":"up","size":"small","confidence":"high","why":"…","source":"…"}
```

- `when_h` is hours after the dose or start. It is ignored for chronic and withdrawal.
- `direction` is `up`, `down` or `none`.
- `size` is required unless the direction is `none`.

### 2. `timecourse`: how an effect unfolds after one dose
The dose is at 10:00 in the quiet context (or 21:00 if you set `"context":"evening"`). Let Δ(t) be the effect, with dose minus without, in the given direction. Times are in hours after the dose:
- `onset_h`: when Δ first reaches half of its peak
- `peak_h`: when Δ is largest
- `offset_h`: when Δ, after the peak, has fallen to a quarter of its peak

Give each one as a `[lo, hi]` range. Ranges can be broad, but they should exclude clearly wrong answers. You may omit any of the three.

```json
{"kind":"timecourse","what":"cocaine","amount":1,"profile":"typical","feeling":"mood","direction":"up",
 "onset_h":[0.05,0.5],"peak_h":[0.2,1],"offset_h":[0.75,2.5],"confidence":"high","why":"…","source":"…"}
```

### 3. `level`: what a drug or activity does to a brain-chemistry measure
`fold` is the level relative to the same moment without it (1 = unchanged), as a `[lo, hi]` range. Think in terms of human PET / blood studies at the given dose. Where you must use animal microdialysis, scale it to this dose and widen the range.

```json
{"kind":"level","what":"methylphenidate","amount":1,"context":"quiet","profile":"typical","when_h":1.5,
 "measure":"dopamine_striatum","fold":[1.3,4],"confidence":"medium","why":"…","source":"…"}
```

### 4. `daily`: the normal 24-hour rhythm of a measure or feeling
This is for a profile with nothing taken. Give:
- `peak_clock` and/or `trough_clock` as `[lo, hi]` clock hours. 0–24, and use values above 24 (e.g. 26 = 02:00) for ranges spanning midnight.
- Optionally `ratio` = peak/trough as `[lo, hi]`, for measures only.

```json
{"kind":"daily","profile":"typical","measure":"cortisol","peak_clock":[7,9.5],"trough_clock":[22,26],"ratio":[3,20],
 "confidence":"high","why":"…","source":"…"}
```

### 5. `profile`: how a brain profile differs from a typical brain
This is with nothing taken, in a given context, at a clock time.

```json
{"kind":"profile","profile":"adhd","context":"quiet","clock":11,"feeling":"focus","direction":"down","size":"medium",
 "confidence":"high","why":"…","source":"…"}
```

### 6. `rank`: one effect is clearly bigger than another
Both `bigger` and `smaller` are effect setups ({what, amount, context, profile, when_h}) on the same `feeling`. The size of an effect is |Δ| against its own "without" comparison. Use this for:
- dose–response
- potency comparisons between drugs
- profile differences in drug response
- tolerance (quiet vs chronic)
- combination vs single drug

```json
{"kind":"rank","feeling":"focus",
 "bigger":{"what":"methylphenidate","amount":1,"context":"quiet","profile":"adhd","when_h":1.5},
 "smaller":{"what":"methylphenidate","amount":1,"context":"quiet","profile":"typical","when_h":1.5},
 "confidence":"high","why":"…","source":"…"}
```

## Rules
- Write valid JSON only: a single array, no comments.
- Write the number of entries your task asks for. Prefer entries that matter to a curious lay person and that a simulation could plausibly get wrong, such as:
  - non-obvious directions
  - dose-dependence
  - rebounds
  - tolerance
  - profile differences
  - context differences
  - safety-relevant interactions
- Use `"none"` only when you are confident an effect is absent or negligible.
- Every entry must be checkable with the vocabulary above. Do not invent ids.
