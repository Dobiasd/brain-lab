import { characters } from '../data/characters';
import { tourById, tours } from '../sim/tours';

/** Questions grouped by theme, so the home page reads as a few short shelves instead of one wall of cards. */
const shelves: { id: string; title: string; blurb: string; tours: string[] }[] = [
  { id: 'everyday', title: 'Everyday life', blurb: 'Coffee, drinks, sleep and a good day.', tours: ['coffee', 'tolerance', 'hangxiety', 'sleep_aid', 'healthy'] },
  { id: 'stress', title: 'Stress and different brains', blurb: 'Why the same day feels different to different people.', tours: ['stress', 'chronic', 'sensory'] },
  { id: 'meds', title: 'Medication', blurb: 'What it changes, and why some take weeks.', tours: ['adhd', 'ssri', 'ketamine', 'ozempic'] },
  { id: 'drugs', title: 'Drugs and cannabis', blurb: 'Highs, dips, tolerance, withdrawal, and what cannabis and CBD do.', tours: ['opioids', 'mdma', 'thc_busy', 'cbd'] },
];
// a question that is not on a shelf yet still shows up, on the last one
const shelved = new Set(shelves.flatMap((s) => s.tours));
shelves[shelves.length - 1].tours.push(...tours.map((t) => t.id).filter((id) => !shelved.has(id)));

const floaters = ['dopamine', 'serotonin', 'noradrenaline', 'cortisol', 'adenosine', 'melatonin', 'oxytocin', 'endorphin'];
const chemGroup: Record<string, string> = {
  dopamine: 'dopamine', serotonin: 'serotonin', noradrenaline: 'noradrenaline', cortisol: 'stress',
  adenosine: 'acetylcholine', melatonin: 'melatonin', oxytocin: 'stress', endorphin: 'other',
};

/** The hero picture: the chemical characters circling a brain. Decorative only. */
function HeroArt() {
  const cs = floaters.map((id) => characters.find((c) => c.id === id)).filter((c): c is (typeof characters)[number] => !!c);
  return (
    <div className="hero-art" aria-hidden>
      <div className="hero-brain">🧠</div>
      {cs.map((c, i) => {
        const a = (i / cs.length) * 2 * Math.PI - Math.PI / 2;
        return (
          <span key={c.id} className="floater" style={{
            left: `${50 + 40 * Math.cos(a)}%`, top: `${50 + 40 * Math.sin(a)}%`,
            ['--c' as string]: `var(--chem-${chemGroup[c.id] ?? 'other'})`, animationDelay: `${-i * 0.7}s`,
          }} title={c.name}>
            <span className="fl-icon">{c.icon}</span><span className="fl-name">{c.name}</span>
          </span>
        );
      })}
    </div>
  );
}

export function Home({ onTour, onPlayground, onChemicals }: {
  onTour: (id: string) => void; onPlayground: () => void; onChemicals: () => void;
}) {
  return (
    <div className="col home" style={{ gap: 28 }}>
      <section className="hero hero-split">
        <div className="hero-copy">
          <span className="eyebrow">An interactive brain simulator</span>
          <h1 className="hero-title" tabIndex={-1}>What's going on in your head?</h1>
          <p className="big" style={{ color: 'var(--text-secondary)', maxWidth: 620 }}>
            Pick a question. Each one is a short guided story through a simulated brain, showing what coffee, stress, alcohol or
            medication actually do, step by step and in plain words. No biology background needed.
          </p>
          <div className="hero-cta">
            <button className="btn primary big-btn" onClick={() => onTour('coffee')}>☕ Start with coffee</button>
            <button className="btn big-btn" onClick={onPlayground}>🧪 Design your own day</button>
          </div>
        </div>
        <HeroArt />
      </section>

      {shelves.map((sh) => (
        <section key={sh.id} className={`shelf t-${sh.id}`} aria-labelledby={`shelf-${sh.id}`}>
          <div className="shelf-head">
            <h2 id={`shelf-${sh.id}`}>{sh.title}</h2>
            <span className="muted">{sh.blurb}</span>
          </div>
          <div className="qgrid">
            {sh.tours.map((id) => tourById[id]).filter(Boolean).map((t) => (
              <button key={t.id} className="qcard" onClick={() => onTour(t.id)}>
                <span className="qicon" aria-hidden>{t.icon}</span>
                <span className="qtext">{t.question}</span>
                <span className="muted">{t.teaser}</span>
                <span className="qmeta">{t.steps.length} steps · ~2 min <span aria-hidden>→</span></span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <div className="row two">
        <button className="card action" onClick={onPlayground}>
          <span className="qicon" aria-hidden>🧪</span>
          <span className="col" style={{ gap: 4, textAlign: 'left' }}>
            <b>Design your own day</b>
            <span className="muted">Drop coffee, a run, a meal, stress or a glass of wine onto a timeline and see what happens.</span>
          </span>
        </button>
        <button className="card action" onClick={onChemicals}>
          <span className="qicon" aria-hidden>{characters.slice(0, 3).map((c) => c.icon).join('')}</span>
          <span className="col" style={{ gap: 4, textAlign: 'left' }}>
            <b>Meet the chemicals</b>
            <span className="muted">Dopamine, serotonin, cortisol and friends: who they are and common myths.</span>
          </span>
        </button>
      </div>
    </div>
  );
}

export function Chemicals({ onTour }: { onTour: (id: string) => void }) {
  return (
    <div className="col" style={{ gap: 16 }}>
      <section className="hero">
        <h1 className="hero-title" tabIndex={-1}>Meet the chemicals</h1>
        <p className="big" style={{ color: 'var(--text-secondary)', maxWidth: 760 }}>
          Your brain runs on dozens of chemical messengers. These {characters.length} do most of the work you can feel.
        </p>
      </section>
      <div className="chargrid">
        {characters.map((c) => (
          <article key={c.id} className="card charcard">
            <div className="row" style={{ alignItems: 'center', flexWrap: 'nowrap' }}>
              <span className="qicon" aria-hidden style={{ flex: '0 0 auto' }}>{c.icon}</span>
              <div className="col" style={{ gap: 0, flex: '1 1 auto' }}>
                <h2>{c.name}</h2>
                <span className="muted">{c.nickname}</span>
              </div>
            </div>
            <p>{c.intro.split('*').map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))}</p>
            <p className="small"><b>You feel it when:</b> {c.feelIt}</p>
            <div className="updown small">
              <div><b>▲ More with</b><ul>{c.boostedBy.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><b>▼ Less with</b><ul>{c.loweredBy.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            {c.myth && (
              <div className="myth small">
                <span><b>Myth:</b> {c.myth.myth}</span>
                <span><b>Actually:</b> {c.myth.fact}</span>
              </div>
            )}
            {c.tour && <button className="linkbtn small" onClick={() => onTour(c.tour!)}>See it in action →</button>}
          </article>
        ))}
      </div>
    </div>
  );
}
