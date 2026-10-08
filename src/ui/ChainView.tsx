import { useState } from 'react';
import type { Personality } from '../data/types';
import { profilesFor, traceFeeling, typicalGetter, type History } from '../sim/chains';
import { feelings } from './plain';

type Get = (k: string) => number;

/** "How did this happen?": the chain from a cause to a feeling, at the current moment. */
export function ChainView({ get, getBase, profileId, compareProfileId, personality, comparePersonality, history, preferred, baseLabel, selected, onSelect, science = false }: {
  get: Get; getBase: Get | null; profileId: string; compareProfileId: string; personality?: Personality; comparePersonality?: Personality;
  history: History; preferred?: string; baseLabel: string;
  /** Optional controlled selection, so other parts of the page can open a feeling's chain. */
  selected?: string | null; onSelect?: (id: string) => void;
  /** show the extra "also pushing" detail */
  science?: boolean;
}) {
  const b = getBase ?? typicalGetter(get);
  const deltas = feelings.map((f) => ({ id: f.id, d: get(`read:${f.id}`) - b(`read:${f.id}`) }));
  const biggest = [...deltas].sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0]?.id ?? 'mood';
  const [own, setOwn] = useState<string | null>(null);
  const chosen = selected !== undefined ? selected : own;
  const setChosen = (x: string) => (onSelect ? onSelect(x) : setOwn(x));
  const id = chosen ?? preferred ?? biggest;
  const [pa, pb] = profilesFor(profileId, personality, getBase ? compareProfileId : 'typical', getBase ? comparePersonality : undefined);
  const chain = traceFeeling(id, get, b, pa, pb, history);
  const flat = chain.nodes.length <= 1;

  return (
    <div className="chain col" id="chain">
      <div className="row" style={{ alignItems: 'center' }}>
        <h3 style={{ flex: '1 1 auto' }}>🔗 How did this happen?</h3>
      </div>
      <div className="chips" role="group" aria-label="Pick a feeling to trace">
        {feelings.map((f) => {
          const d = deltas.find((x) => x.id === f.id)!.d;
          return (
            <button key={f.id} aria-pressed={id === f.id} className={`chip${id === f.id ? ' on' : ''}`} onClick={() => setChosen(f.id)}
              title={`${f.name}: ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(0)} vs ${baseLabel}`}>
              {f.icon} {f.name}<span className="chip-mark" aria-hidden>{Math.abs(d) >= 2 ? (d > 0 ? '▲' : '▼') : ''}</span>
            </button>
          );
        })}
      </div>
      <div className="flow-area" tabIndex={0} aria-label="Cause chain">
      {flat ? (
        <p className="muted">Right now this feeling is about the same as {baseLabel}, so there is no chain to show. Pick a feeling marked ▲ or ▼.</p>
      ) : (
        <>
          <ol className="flow" aria-label="Chain from cause to feeling">
            {chain.nodes.map((n, i) => (
              <li key={i} className={`fnode k-${n.kind}`}>
                <span className="ficon" aria-hidden>{n.icon}</span>
                <span className="col" style={{ gap: 0 }}>
                  <span className="flabel">{n.label}{n.change && <b className="fchange"> {n.change}</b>}</span>
                  {n.note && <span className="fnote">{n.note}</span>}
                </span>
              </li>
            ))}
          </ol>
          <p className="muted chain-note">Read from left to right: each step causes the next, compared with {baseLabel}.
            {' '}+40% means 40% more than there; ×3 means three times as much; feelings change in points out of 100.
            {science && chain.also.length > 0 && <> Also pushing in the same direction: {chain.also.join(', ')}.</>}</p>
        </>
      )}
      </div>
    </div>
  );
}
