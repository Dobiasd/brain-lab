import { useEffect, useMemo, useRef, useState } from 'react';
import { regionById } from './data/anatomy';
import { glossary } from './data/glossary';
import { regionKeys } from './data/graph';
import { profileById, profiles } from './data/profiles';
import type { SimConfig } from './sim/engine';
import { getterAt } from './sim/engine';
import { scenarioById } from './sim/scenarios';
import { tourById } from './sim/tours';
import { BrainMap, chemLegend } from './ui/BrainMap';
import { Charts } from './ui/Charts';
import { compareConfig, type CompareMode } from './ui/compare';
import { compareLabels, ScenarioPanel, SetupPanel } from './ui/Controls';
import { DayPlanner } from './ui/DayPlanner';
import { ChainView } from './ui/ChainView';
import { ActiveNow } from './ui/NowPanel';
import { Timeline } from './ui/Timeline';
import { usePlanner } from './ui/planner';
import { PersonalityPanel, personalityNote } from './ui/PersonalityPanel';
import { Challenges } from './ui/Challenges';
import { Explain, Tiles } from './ui/Explain';
import { GraphView } from './ui/GraphView';
import { Chemicals, Home } from './ui/Home';
import { fmtValue, seriesInfo } from './ui/labels';
import { NodeDetail } from './ui/NodeDetail';
import { drugIcon, plainLabel } from './ui/plain';
import { FeelingTiles, Narration } from './ui/Simple';
import { Story } from './ui/Story';
import { useSim } from './ui/useSim';
import { planWarnings } from './sim/safety';
import { Warnings } from './ui/Warnings';

type View = 'home' | 'tour' | 'day' | 'chemicals' | 'glossary' | 'graph';

function readPref(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function writePref(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* storage unavailable */ }
}

const starterDay: SimConfig = {
  profile: 'typical', days: 1,
  doses: [{ drug: 'caffeine', at: 8 * 60, amount: 1 }],
  events: [{ input: 'exercise', at: 18 * 60, duration: 60, intensity: 1 }],
};

const compareWords: Record<CompareMode, string> = {
  nodrugs: 'the same day without drugs',
  plain: 'a day with nothing added',
  typical: 'a typical brain on the same day',
  avgpers: 'the same day with an average personality',
  off: '',
};
const tileBase: Record<CompareMode, string> = { nodrugs: 'no drugs', typical: 'typical brain', avgpers: 'average personality', plain: 'nothing added', off: '' };

export default function App() {
  const [view, setView] = useState<View>('home');
  const [science, setScience] = useState(() => readPref('brainlab.science', '0') === '1');
  const [tourId, setTourId] = useState('coffee');
  useEffect(() => writePref('brainlab.science', science ? '1' : '0'), [science]);
  useEffect(() => { if (!science && view === 'graph') setView('home'); }, [science, view]);
  // a new view: scroll to the top and move focus to it, so keyboard and screen-reader users land in the right place
  const mainRef = useRef<HTMLElement>(null);
  const firstView = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (firstView.current) { firstView.current = false; return; }
    (mainRef.current?.querySelector('h1, h2') as HTMLElement | null)?.focus?.();
    if (document.activeElement === document.body) mainRef.current?.focus();
  }, [view, tourId]);

  // the playground's state lives here so a tour can hand over to it
  const [cfg, setCfg] = useState<SimConfig>(starterDay);
  const [compare, setCompare] = useState<CompareMode>('plain');
  const [scenarioId, setScenarioId] = useState('custom');
  const [chartKeys, setChartKeys] = useState<string[]>(['read:sleepiness', 'read:arousal', 'read:mood', 'drug:caffeine']);

  const openTour = (id: string) => { setTourId(id); setView('tour'); };
  const tryTour = () => {
    const t = tourById[tourId];
    const sc = scenarioById[t.scenario];
    const last = t.steps[t.steps.length - 1];
    setCfg({ ...sc.config, profile: last.profile ?? sc.config.profile });
    setCompare(t.compare);
    setScenarioId(t.scenario);
    setChartKeys(Array.from(new Set(t.steps.flatMap((s) => s.charts))).slice(0, 6));
    setView('day');
  };

  const nav: { v: View; label: string }[] = [
    { v: 'home', label: 'Questions' },
    { v: 'day', label: 'Your day' },
    { v: 'chemicals', label: 'Meet the chemicals' },
    { v: 'glossary', label: 'Glossary' },
    ...(science ? [{ v: 'graph' as View, label: 'Connections map' }] : []),
  ];

  return (
    <div className="app">
      <header className="top">
        <button className="brand" onClick={() => setView('home')} aria-label="Brain Lab, back to the questions"><span className="brand-name"><span className="mark" aria-hidden>🧠</span>Brain Lab</span></button>
        <nav className="tabs" aria-label="Sections">
          {nav.map((n) => (
            <button key={n.v} className={view === n.v || (view === 'tour' && n.v === 'home') ? 'on' : ''} onClick={() => setView(n.v)}
              aria-current={view === n.v || (view === 'tour' && n.v === 'home') ? 'page' : undefined}>{n.label}</button>
          ))}
        </nav>
        <label className="toggle" title="Show receptors, densities, the full controls and the connections map">
          <input type="checkbox" checked={science} onChange={(e) => setScience(e.target.checked)} /> Show the science
        </label>
      </header>

      <main ref={mainRef} tabIndex={-1} className="col" style={{ gap: 16, outline: 'none' }}>
      {view === 'home' && <Home onTour={openTour} onPlayground={() => setView('day')} onChemicals={() => setView('chemicals')} />}
      {view === 'tour' && <Story key={tourId} tour={tourById[tourId]} onExit={() => setView('home')} onTryIt={tryTour} onTour={openTour} />}
      {view === 'day' && (
        <Playground science={science} cfg={cfg} setCfg={(c) => { setCfg(c); setScenarioId('custom'); }}
          compare={compare} setCompare={setCompare} chartKeys={chartKeys} setChartKeys={setChartKeys}
          scenarioId={scenarioId} onScenario={(id) => {
            const s = scenarioById[id];
            setScenarioId(id); setCfg(s.config); setChartKeys(s.focus);
            setCompare(s.config.doses.length ? 'nodrugs' : 'plain');
          }} />
      )}
      {view === 'chemicals' && <Chemicals onTour={openTour} />}
      {view === 'graph' && <GraphView />}
      {view === 'glossary' && (
        <div className="card">
          <h1 tabIndex={-1} style={{ fontSize: 20 }}>Glossary</h1>
          <dl className="gloss">
            {glossary.map((g) => <div key={g.term}><dt>{g.term}</dt><dd>{g.text.split('*').map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))}</dd></div>)}
          </dl>
          <div className="howitworks">
            <h3>How does this simulation work?</h3>
            <p>Each brain area has a firing rate that goes up or down depending on the signals it receives. Each chemical is released by its source area and cleared away by pumps and enzymes. Drugs are absorbed, peak and are cleared at their real-world pace, and act on specific receptors, pumps or stores.</p>
            <p>The key ingredient is <b>adaptation</b>: receptors slowly add or remove themselves when they are over- or under-stimulated for hours to weeks. Tolerance, withdrawal, the SSRI delay and the post-MDMA dip are not scripted. They emerge from that one rule.</p>
          </div>
        </div>
      )}

      </main>
      <footer className="disclaimer">
        <b>Educational cartoon, not medical advice.</b> The model gets directions, shapes and time scales of well-known effects right, but its numbers are made up and real brains vary enormously. Never use it to decide on doses or medication.
      </footer>
    </div>
  );
}

function Playground({ science, cfg, setCfg, compare, setCompare, chartKeys, setChartKeys, scenarioId, onScenario }: {
  science: boolean; cfg: SimConfig; setCfg: (c: SimConfig) => void; compare: CompareMode; setCompare: (m: CompareMode) => void;
  chartKeys: string[]; setChartKeys: (k: string[]) => void; scenarioId: string; onScenario: (id: string) => void;
}) {
  // with no dashed line, explanations still compare against a typical day with nothing added (just not drawn)
  const compareCfg = useMemo(() => compareConfig(cfg, compare) ?? { profile: 'typical', days: cfg.days, doses: [], events: [] }, [cfg, compare]);
  const { data, busy } = useSim(cfg, compareCfg);
  const shownBase = compare === 'off' ? null : data?.base ?? null;
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [explainId, setExplainId] = useState('sleepiness');
  const [region, setRegion] = useState<string | null>(null);
  const [chainFeeling, setChainFeeling] = useState<string | null>(null);
  const planner = usePlanner(cfg, setCfg);
  // Escape cancels "click to place"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { planner.setArmed(null); planner.setSel(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [planner.setArmed, planner.setSel]);
  const n = data?.main.t.length ?? 1;
  const openChain = (id: string) => {
    setChainFeeling(id);
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => document.getElementById('chain')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }));
  };
  // personality changes are invisible against a comparison that has the same personality
  const setPersonality = (p: SimConfig['personality']) => {
    setCfg({ ...cfg, personality: p });
    if (p && compare !== 'avgpers') setCompare('avgpers');
    if (!p && compare === 'avgpers') setCompare('plain');
  };
  const baseWords = compareWords[compare] || 'a typical day with nothing added';
  const profile = profileById[cfg.profile];

  // start at an interesting moment (shortly after the first thing that happens),
  // but keep the clock where it is when only details change
  const lastLen = useRef(0);
  useEffect(() => {
    if (!data) return;
    if (lastLen.current === data.main.t.length) return;
    lastLen.current = data.main.t.length;
    const first = Math.min(...data.config.doses.map((d) => d.at), ...data.config.events.map((e) => e.at), Infinity);
    const t = Number.isFinite(first) ? first + 90 : 12 * 60;
    let i = 0;
    while (i < data.main.t.length - 1 && data.main.t[i] < t) i++;
    setCursor(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.main]);

  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => setCursor((c) => {
      const step = Math.max(1, Math.round((n / 600) * speed));
      if (c + step >= n - 1) { setPlaying(false); return n - 1; }
      return c + step;
    }), 50);
    return () => clearInterval(h);
  }, [playing, n, speed]);

  const ci = Math.min(cursor, n - 1);
  const get = data ? getterAt(data.main, ci) : () => 1;
  const getBase = data?.base ? getterAt(data.base, ci) : null;
  // use the setup that produced the current result, so markers and explanations always match the numbers
  const run = data?.config ?? cfg;
  const prevIdx = data && data.main.t.length > 1 ? Math.max(0, ci - Math.max(1, Math.round(30 / (data.main.t[1] - data.main.t[0])))) : 0;
  const getPrev = data ? getterAt(data.main, prevIdx) : null;
  const doseTimes = run.doses.map((d) => d.at);
  const doseIcons = run.doses.map((d) => drugIcon[d.drug] ?? '💊');
  const now = data ? data.main.t[ci] : 0;
  const history = { now, doses: run.doses, events: run.events };
  const cmpRun = data?.compare;
  const chainView = data && (
    <ChainView get={get} getBase={getBase} profileId={run.profile} compareProfileId={cmpRun?.profile ?? 'typical'}
      personality={run.personality} comparePersonality={cmpRun?.personality}
      history={{ ...history, personalityNote: compare === 'avgpers' ? personalityNote(run.personality) : undefined }}
      baseLabel={baseWords} selected={chainFeeling} onSelect={setChainFeeling} science={science} />
  );

  const seriesOptions = useMemo(() => {
    if (!data) return [];
    const groups: Record<string, { k: string; label: string }[]> = {};
    for (const k of data.main.keys) {
      if (k.startsWith('input:') || k.startsWith('agon:') || k.startsWith('block:')) continue;
      if (k.startsWith('drug:') && !cfg.doses.some((d) => `drug:${d.drug}` === k)) continue;
      const simpleOk = k.startsWith('read:') || k.startsWith('drug:') || (plainLabel(k) !== seriesInfo(k).label);
      if (!science && !simpleOk) continue;
      const info = seriesInfo(k);
      const group = science ? info.group : k.startsWith('read:') ? 'How you feel' : k.startsWith('drug:') ? 'Drugs in your body' : 'Inside the brain';
      (groups[group] ??= []).push({ k, label: science ? info.label : plainLabel(k) });
    }
    return Object.entries(groups);
  }, [data, cfg.doses, science]);

  const timeline = (
    <div className="timeline">
      <button className="btn primary" onClick={() => { if (ci >= n - 1) setCursor(0); setPlaying(!playing); }} disabled={!data}>
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>
      <select value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Speed" style={{ width: 'auto' }}>
        <option value={0.5}>slow</option><option value={1}>normal</option><option value={3}>fast</option>
      </select>
      {busy && <span className="busy">updating…</span>}
      {data && <Timeline main={data.main} cursor={ci} onCursor={(i) => { setPlaying(false); setCursor(i); }} planner={planner} />}
    </div>
  );

  const charts = (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <h2 style={{ flex: '1 1 200px' }}>Over time</h2>
        <div className="legend" style={{ flex: '2 1 300px' }}>
          <span><span className="sw" style={{ background: 'var(--series-1)' }} />your day{cfg.days > 6 ? ' (bold = daytime average)' : ''}</span>
          {compare !== 'off' && <span><span className="sw" style={{ background: 'var(--compare)' }} />dashed: {science ? compareLabels[compare] : baseWords}</span>}
          <span>▲ dose</span>
          {cfg.days <= 6 && <span><span className="dot" style={{ background: 'var(--sleep)', border: '1px solid var(--border)', borderRadius: 2 }} />asleep</span>}
        </div>
        <select value="" onChange={(e) => e.target.value && !chartKeys.includes(e.target.value) && setChartKeys([...chartKeys, e.target.value])} aria-label="Add a chart" style={{ flex: '1 1 220px' }}>
          <option value="">+ Add a chart…</option>
          {seriesOptions.map(([g, items]) => (
            <optgroup key={g} label={g}>{items.map((it) => <option key={it.k} value={it.k}>{it.label}</option>)}</optgroup>
          ))}
        </select>
      </div>
      {data && <Charts keys={chartKeys} main={data.main} base={shownBase} cursor={ci} onCursor={(i) => { setPlaying(false); setCursor(i); }}
        doseTimes={doseTimes} doseIcons={doseIcons} onRemove={(k) => setChartKeys(chartKeys.filter((x) => x !== k))} labelFor={science ? undefined : plainLabel} plainValues={!science} />}
      <p className="muted">Click a chart to move the time cursor. Feelings go from 0 to 100 points; chemical levels are shown {science ? 'as ×, where 1× is normal' : 'in %, where 100% is the normal level'}.</p>
    </div>
  );

  if (!science) {
    return (
      <div className="col" style={{ gap: 16 }}>
        <Challenges onPick={(c) => { setCfg({ ...c.config, personality: cfg.personality }); setChartKeys(c.charts); setCompare('plain'); }} />
        <Warnings items={planWarnings(cfg)} />
        <DayPlanner cfg={cfg} setCfg={setCfg} planner={planner} />
        <div className="card">
          <div className="row" style={{ alignItems: 'end' }}>
            <label className="field" style={{ flex: '1 1 200px' }}>Whose brain?
              <select value={cfg.profile} onChange={(e) => setCfg({ ...cfg, profile: e.target.value })}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: '1 1 200px' }}>Compare with (dashed line)
              <select value={compare} onChange={(e) => setCompare(e.target.value as CompareMode)}>
                <option value="plain">a day with nothing added</option>
                <option value="nodrugs">the same day without drugs</option>
                <option value="typical">a typical brain, same day</option>
                <option value="avgpers">the same day, average personality</option>
                <option value="off">nothing</option>
              </select>
            </label>
          </div>
          {cfg.profile !== 'typical' && <p className="small" style={{ color: 'var(--text-secondary)' }}><span className="badge">evidence: {profile.evidence}</span> {profile.summary}</p>}
          <PersonalityPanel value={cfg.personality} onChange={setPersonality} />
        </div>
        <div className="card sticky-time">{timeline}</div>
        <div className="simple-grid">
          <div className="card">
            {data && <Narration get={get} getBase={getBase} getPrev={getPrev} profileId={run.profile} baseLabel={baseWords} onExplain={openChain} history={history} live={!playing} />}
            {data && <ActiveNow cfg={run} get={get} now={now} live={!playing} />}
            <FeelingTiles get={get} getBase={compare === 'off' ? null : getBase} baseLabel={tileBase[compare]}
              selected={chainFeeling ?? undefined} onSelect={openChain} />
            <p className="muted">Click a feeling to see the chain of causes behind it.</p>
          </div>
          <div className="card">
            <BrainMap get={get} asleep={get('state:asleep') > 0.5} plainLabels />
            <p className="muted">Red = more active than usual, blue = less. Moving dashes are messages travelling between areas.</p>
          </div>
        </div>
        <div className="card">{chainView}</div>
        {charts}
      </div>
    );
  }

  return (
    <div className="layout">
      <div style={{ gridColumn: '1 / -1' }}><Warnings items={planWarnings(cfg)} /></div>
      <div className="col">
        <ScenarioPanel scenarioId={scenarioId} onScenario={onScenario} />
        <SetupPanel cfg={cfg} setCfg={setCfg} compare={compare} setCompare={setCompare} />
        <div className="card"><PersonalityPanel value={cfg.personality} onChange={setPersonality} /></div>
      </div>
      <div className="col">
        <div className="card">
          {timeline}
          <BrainMap get={get} selected={region} onSelect={(r) => setRegion(region === r ? null : r)} asleep={get('state:asleep') > 0.5} />
          <div className="legend">
            <span><span className="dot" style={{ background: 'var(--up)' }} />more active than typical</span>
            <span><span className="dot" style={{ background: 'var(--down)' }} />less active</span>
            {chemLegend.map(([g, label]) => <span key={g}><span className="sw" style={{ background: `var(--chem-${g})` }} />{label}</span>)}
          </div>
          <p className="muted">Moving dashes are signalling pathways: faster and thicker means more firing. Click a region for details.</p>
        </div>
        <div className="card">
          <h2>How it feels right now</h2>
          {data && <Narration get={get} getBase={getBase} getPrev={getPrev} profileId={run.profile} baseLabel={baseWords} onExplain={openChain} history={history} live={!playing} />}
          {data && <ActiveNow cfg={run} get={get} now={now} live={!playing} />}
          <Tiles get={get} getBase={compare === 'off' ? null : getBase} selected={explainId} onSelect={setExplainId} compareLabel={compare === 'nodrugs' ? 'without drugs' : compare === 'typical' ? 'typical' : 'baseline'} />
        </div>
        <div className="card">{chainView}</div>
      </div>
      <div className="col right">
        <div className="card">
          {region ? (
            <>
              <NodeDetail nodeId={`region:${region}`} onNavigate={(id) => { if (id.startsWith('region:')) setRegion(id.slice(7)); }} />
              <div className="col" style={{ gap: 4 }}>
                <h3>Right now in {regionById[region].name}</h3>
                {regionKeys(region).map((k) => (
                  <div key={k} className="small" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <button className="linkbtn" onClick={() => !chartKeys.includes(k) && setChartKeys([...chartKeys, k])} title="Add chart">{seriesInfo(k).label}</button>
                    <span>{fmtValue(k, get(k))}</span>
                  </div>
                ))}
                {regionKeys(region).length === 0 && <p className="muted">Not modelled in detail. Shown for orientation.</p>}
              </div>
              <button className="btn ghost" onClick={() => setRegion(null)}>← Back to explanation</button>
            </>
          ) : data && <Explain readoutId={explainId} get={get} getBase={getBase} profileId={cfg.profile} />}
        </div>
      </div>
      {charts}
    </div>
  );
}

