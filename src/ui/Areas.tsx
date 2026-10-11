import { useState } from 'react';
import { areas } from '../data/areas';
import { regionById } from '../data/anatomy';
import { characters } from '../data/characters';
import { BrainMap } from './BrainMap';

const charById = Object.fromEntries(characters.map((c) => [c.id, c]));
const calm = () => 1;

/** Scroll to an element by id and move focus there, for keyboard and screen-reader users too. */
export function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
}

export function Areas({ onTour, onChemical }: { onTour: (id: string) => void; onChemical: (id: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const pick = (id: string) => { setSel(id); jumpTo(`area-${id}`); };
  return (
    <div className="col" style={{ gap: 16 }}>
      <section className="hero">
        <h1 className="hero-title" tabIndex={-1}>Meet the brain areas</h1>
        <p className="big" style={{ color: 'var(--text-secondary)', maxWidth: 760 }}>
          The places the chemicals come from and act on. Tap an area on the map, or a name below it, to jump to its card.
        </p>
      </section>
      <div className="card" style={{ maxWidth: 820, width: '100%', alignSelf: 'center' }}>
        <BrainMap get={calm} asleep={false} plainLabels selected={sel} onSelect={pick}
          caption="Side view of the brain, front on the left, with the adrenal glands and gut below. The coloured lines are the main chemical pathways." />
        <nav className="chips" aria-label="Jump to a brain area" style={{ marginTop: 8 }}>
          {areas.map((a) => (
            <button key={a.id} className={`chip${sel === a.id ? ' on' : ''}`} onClick={() => pick(a.id)}>
              <span aria-hidden>{a.icon}</span> {regionById[a.id].name.replace(/ \(.*\)$/, '')}
            </button>
          ))}
        </nav>
      </div>
      <div className="chargrid">
        {areas.map((a) => {
          const r = regionById[a.id];
          return (
            <article key={a.id} id={`area-${a.id}`} tabIndex={-1} className={`card charcard${sel === a.id ? ' picked' : ''}`}>
              <div className="row" style={{ alignItems: 'center', flexWrap: 'nowrap' }}>
                <span className="qicon" aria-hidden style={{ flex: '0 0 auto' }}>{a.icon}</span>
                <div className="col" style={{ gap: 0, flex: '1 1 auto' }}>
                  <h2>{r.name}</h2>
                  <span className="muted">{a.nickname}</span>
                </div>
              </div>
              <p>{a.intro.split('*').map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))}</p>
              <p className="small"><b>You notice it when:</b> {a.feelIt}</p>
              <div className="small">
                <b>Key chemicals here:</b>
                <div className="chips">
                  {a.chemicals.map((id) => charById[id]).map((c) => (
                    <button key={c.id} className="chip" onClick={() => onChemical(c.id)}>
                      <span aria-hidden>{c.icon}</span> {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {a.myth && (
                <div className="myth small">
                  <span><b>Myth:</b> {a.myth.myth}</span>
                  <span><b>Actually:</b> {a.myth.fact}</span>
                </div>
              )}
              {a.tour && <button className="linkbtn small" onClick={() => onTour(a.tour!)}>See it in action →</button>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
