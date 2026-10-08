# Brain Lab

An interactive, simplified simulation of brain chemistry. It shows in plain words what coffee, stress, exercise,
alcohol, cannabis or medication do: guided tours answer everyday questions, and a day planner lets you drop
substances and activities onto a timeline and watch the feelings and chemicals change.

**Live:** https://daiw.de/brain/

> This is an educational cartoon of the brain, not medical advice. It does not give doses and cannot predict
> what a substance will do to a real person.

## How it works

- `src/data/`: the knowledge base. It holds brain regions, chemicals, receptors, enzymes, drugs (targets and
  pharmacokinetics) and brain profiles (ADHD, autism, depression, chronic stress, …).
- `src/sim/engine.ts`: a 1-minute-step simulation driven by that data. It covers firing of brain-cell groups,
  transmitter release and clearance, drug absorption and elimination, receptor adaptation (tolerance and
  withdrawal), sleep, body clock and meals.
- `src/sim/readouts.ts`: turns signals into feelings (mood, anxiety, focus, sleepiness, …).
- `src/sim/expectations/`: reference tables written from the research literature, independently of the model.
  The model is tested against them as a ratchet: the number of passing entries may not drop. See its
  [README](src/sim/expectations/README.md).
- `src/ui/`: React UI with the guided tours, the day planner and the chemical characters.

## Development

```sh
npm install
npm run dev     # local dev server
npm test        # behaviour tests and reference tables
npm run build   # single-file build in dist/index.html
```
