# Reference tables

Independent expectations that the simulation is tested against. Each table was written by a separate
reviewer from the literature, **without looking at the model**, following [SPEC.md](SPEC.md).

| Kind | What is checked |
|---|---|
| `effect` | what a drug or activity does to a feeling, including its rough size |
| `timecourse` | when an effect starts, peaks and fades |
| `level` | brain chemistry and hormones, as a fold change |
| `daily` | the 24-hour rhythm of a hormone or feeling |
| `profile` | how a brain profile differs from a typical brain |
| `rank` | which of two effects is bigger (dose, potency, tolerance, combinations) |

The checker is `../expectations.ts` and the test is `../expectations.test.ts`. The model is a cartoon and does not
pass everything, so the test is a ratchet. Each table must keep at least the passes in `baseline.json`
(raise it when the model improves), and every breathing (safety) entry must pass. Mismatches the model
knowingly cannot reproduce are explained in `known-gaps.json`. Run `REPORT=/tmp/r.txt npx vitest run
src/sim/expectations.test.ts` for a full list of passes and misses.

`holdout_a.json` and `holdout_b.json` were written last. The model was not tuned against them before they were
first scored: the original model passed 83/120 and the reworked model 102/120.

Readout weights (how signals become feelings) were calibrated with `../fit.test.ts`. It fits on two thirds
of the entries and checks against the other third, keeping weights near their hand-set values and never
flipping a sign. Run it with `FIT=/tmp/fit.json npx vitest run src/sim/fit.test.ts`.
