import { traits } from '../data/personality';
import type { Personality } from '../data/types';

const steps = [-1, -0.5, 0, 0.5, 1];

/** e.g. "high emotional sensitivity, low extraversion", for chain labels. */
export function personalityNote(p?: Personality) {
  if (!p) return undefined;
  const short: Record<string, string> = { neuroticism: 'emotional sensitivity', extraversion: 'extraversion', openness: 'openness', conscientiousness: 'conscientiousness', agreeableness: 'agreeableness' };
  const parts = traits.filter((t) => p[t.id]).map((t) => `${(p[t.id] ?? 0) > 0 ? 'high' : 'low'} ${short[t.id]}`);
  return parts.length ? parts.join(', ') : undefined;
}
const stepLabel = ['very low', 'low', 'average', 'high', 'very high'];

export function PersonalityPanel({ value, onChange }: { value?: Personality; onChange: (p: Personality | undefined) => void }) {
  const set = Object.values(value ?? {}).some((v) => v);
  return (
    <details className="personality" open={set || undefined}>
      <summary>Personality (Big Five){set ? ' · adjusted' : ''}</summary>
      <p className="muted" style={{ margin: '6px 0' }}>
        Traits are stable over years and are shaped by many genes and experiences, so these sliders only nudge the brain model.
        The brain links for neuroticism and extraversion are best supported; the others are speculative.
      </p>
      <div className="col" style={{ gap: 10 }}>
        {traits.map((t) => {
          const v = value?.[t.id] ?? 0;
          const i = steps.indexOf(v) >= 0 ? steps.indexOf(v) : 2;
          return (
            <label key={t.id} className="trait">
              <span className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <b style={{ flex: '1 1 auto' }}>{t.name}</b>
                <span className="badge">evidence: {t.evidence}</span>
              </span>
              <span className="row" style={{ alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
                <span className="muted" style={{ flex: '0 0 90px' }}>{t.low}</span>
                <input type="range" min={0} max={4} step={1} value={i} aria-valuetext={stepLabel[i]}
                  onChange={(e) => { const nv = { ...value, [t.id]: steps[+e.target.value] }; onChange(Object.values(nv).some((x) => x) ? nv : undefined); }} />
                <span className="muted" style={{ flex: '0 0 90px', textAlign: 'right' }}>{t.high}</span>
              </span>
              <span className="muted">{t.model}</span>
            </label>
          );
        })}
        {set && <button className="btn ghost" onClick={() => onChange(undefined)}>Reset to average</button>}
      </div>
    </details>
  );
}
