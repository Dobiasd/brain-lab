import { useEffect, useMemo, useRef, useState } from 'react';
import { getterAt } from '../sim/engine';
import { scenarioById } from '../sim/scenarios';
import { tours, type Tour } from '../sim/tours';
import { BrainMap } from './BrainMap';
import { ChainView } from './ChainView';
import { Charts } from './Charts';
import { compareConfig, indexAt } from './compare';
import { fmtTime } from './labels';
import { Scrubber } from './NowPanel';
import { drugIcon, plainLabel } from './plain';
import { FeelingTiles, Narration } from './Simple';
import { SweetSpot } from './SweetSpot';
import { Thermostat } from './Thermostat';
import { useSim } from './useSim';

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Story({ tour, onExit, onTryIt, onTour }: { tour: Tour; onExit: () => void; onTryIt: () => void; onTour: (id: string) => void }) {
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [chainFeeling, setChainFeeling] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const openChain = (id: string) => {
    setChainFeeling(id);
    requestAnimationFrame(() => document.getElementById('chain')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' }));
  };
  const s = tour.steps[step];
  const done = step >= tour.steps.length;
  const scenario = scenarioById[tour.scenario];
  const profile = (done ? tour.steps[tour.steps.length - 1] : s).profile ?? scenario.config.profile;
  const cfg = useMemo(() => ({ ...scenario.config, profile }), [scenario, profile]);
  const cmp = useMemo(() => compareConfig(cfg, tour.compare), [cfg, tour.compare]);
  const { data, busy } = useSim(cfg, cmp);
  const run = data?.config ?? cfg;

  // each step jumps the clock to its moment, and focus moves to the new step for keyboard and screen-reader users
  useEffect(() => {
    setCursor(null);
    setChainFeeling(null);
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [step]);
  const stepIdx = data && !done ? indexAt(data.main.t, (s.day * 24 + s.hour) * 60) : 0;
  const ci = cursor ?? stepIdx;
  const get = data ? getterAt(data.main, ci) : () => 1;
  const getBase = data?.base ? getterAt(data.base, ci) : null;
  const prevIdx = data ? Math.max(0, ci - Math.max(1, Math.round(30 / (data.main.t[1] - data.main.t[0])))) : 0;
  const getPrev = data ? getterAt(data.main, prevIdx) : null;
  const profileNote = run.profile !== scenario.config.profile ? ' · now: a typical brain' : '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // leave arrow keys to whatever control has focus
      if ((e.target as HTMLElement).closest('input, select, textarea, button, a, [role="slider"]')) return;
      if (e.key === 'ArrowRight') setStep((x) => Math.min(tour.steps.length, x + 1));
      if (e.key === 'ArrowLeft') setStep((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour.steps.length]);

  const nextTour = tours[(tours.findIndex((t) => t.id === tour.id) + 1) % tours.length];

  return (
    <div className="col story-view">
      <div className="story-top">
        <button className="btn ghost" onClick={onExit}>← All questions</button>
        <h1 className="story-q"><span aria-hidden>{tour.icon}</span> {tour.question}</h1>
        <div className="dots" role="group" aria-label={`Step ${Math.min(step + 1, tour.steps.length)} of ${tour.steps.length}`}>
          {tour.steps.map((st, i) => (
            <button key={i} className={`dot-btn${i === step ? ' on' : i < step ? ' past' : ''}`} onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}: ${st.title}`} aria-current={i === step ? 'step' : undefined} />
          ))}
        </div>
      </div>

      {done ? (
        <div className="card takeaway">
          <h2 ref={headingRef} tabIndex={-1}>💡 The takeaway</h2>
          <p className="big">{tour.takeaway}</p>
          <ol className="recap">
            {tour.steps.map((st, i) => (
              <li key={i}><button className="linkbtn" onClick={() => setStep(i)}>{st.title}</button></li>
            ))}
          </ol>
          <div className="row" style={{ maxWidth: 760 }}>
            <button className="btn" onClick={() => setStep(tour.steps.length - 1)}>← Back</button>
            <button className="btn primary" onClick={onTryIt}>Try it yourself: change the day →</button>
            <button className="btn" onClick={() => onTour(nextTour.id)}>Next question: {nextTour.icon} {nextTour.question}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="story-grid">
            <div className="col" style={{ gap: 16 }}>
              <div className="card story-text">
                <span className="muted">Step {step + 1} of {tour.steps.length} · {data ? fmtTime(data.main.t[ci]) : ''}{profileNote}</span>
                <h2 className="step-title" ref={headingRef} tabIndex={-1}>{s.title}</h2>
                <p className="big">{s.text.split('*').map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))}</p>
                {data && <Narration get={get} getBase={getBase} getPrev={getPrev} profileId={run.profile} baseLabel={tour.dashed}
                  focusIds={s.feelings} onExplain={openChain} history={{ now: data.main.t[ci], doses: run.doses }} />}
                <div className="row nav">
                  <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
                  <button className="btn primary" onClick={() => setStep(step + 1)}>{step === tour.steps.length - 1 ? 'Finish' : 'Next →'}</button>
                </div>
              </div>
              <div className="card">
                <h3>What to watch</h3>
                <FeelingTiles ids={s.feelings} get={get} getBase={getBase} baseLabel={tour.dashed} selected={chainFeeling ?? undefined} onSelect={openChain} />
                {data && <Scrubber main={data.main} cfg={run} cursor={ci} onCursor={setCursor} />}
                <div className="legend" style={{ marginTop: 4 }}>
                  <span><span className="sw" style={{ background: 'var(--series-1)' }} />this story</span>
                  <span><span className="sw sw-dash" />dashed: {tour.dashed}</span>
                  {run.days <= 6 && <span><span className="dot" style={{ background: 'var(--sleep-strong)', borderRadius: 2 }} />asleep</span>}
                  {busy && <span className="busy">updating…</span>}
                </div>
                {data && (
                  <Charts keys={s.charts} main={data.main} base={data.base} cursor={ci} onCursor={setCursor}
                    doseTimes={run.doses.map((d) => d.at)} doseIcons={run.doses.map((d) => drugIcon[d.drug] ?? '💊')} labelFor={plainLabel} plainValues />
                )}
                <p className="muted">The vertical line marks this moment; drag the strip above or click a chart to look at another time. 100% = the normal level.</p>
              </div>
            </div>
            <div className="col" style={{ gap: 16 }}>
              <div className="card">
                <BrainMap get={get} asleep={get('state:asleep') > 0.5} highlight={s.highlight} plainLabels />
                <p className="muted">Red with ▲ = more active than usual, blue with ▼ = less. Circled: the parts this step is about.</p>
              </div>
              {tour.id === 'adhd' && data && <div className="card"><SweetSpot get={get} getBase={getBase} /></div>}
              {tour.id === 'ssri' && data && <div className="card"><Thermostat get={get} getBase={getBase} /></div>}
            </div>
          </div>
          <div className="card">
            {data && <ChainView key={step} get={get} getBase={getBase} profileId={run.profile}
              compareProfileId={data.compare?.profile ?? run.profile} comparePersonality={data.compare?.personality}
              history={{ now: data.main.t[ci], doses: run.doses, events: run.events }}
              preferred={s.feelings[0]} baseLabel={tour.dashed} selected={chainFeeling} onSelect={setChainFeeling} />}
          </div>
        </>
      )}
    </div>
  );
}
