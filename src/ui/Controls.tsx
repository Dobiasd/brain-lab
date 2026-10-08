import { useState } from 'react';
import { drugById, drugs } from '../data/drugs';
import { inputById, inputs, profileById, profiles } from '../data/profiles';
import type { InputId } from '../data/types';
import type { SimConfig } from '../sim/engine';
import { scenarioById, scenarios } from '../sim/scenarios';
import { fmtTime } from './labels';

import type { CompareMode } from './compare';
export type { CompareMode };
export const compareLabels: Record<CompareMode, string> = {
  nodrugs: 'same, without drugs',
  plain: 'same profile, no drugs or events',
  typical: 'typical brain, same day',
  avgpers: 'same day, average personality',
  off: 'no comparison',
};

const hourOptions = Array.from({ length: 48 }, (_, i) => i / 2);
const hh = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;

function DayHour({ days, day, hour, setDay, setHour }: { days: number; day: number; hour: number; setDay: (d: number) => void; setHour: (h: number) => void }) {
  return (
    <>
      <label className="field">Day
        <select value={day} onChange={(e) => setDay(+e.target.value)}>
          {Array.from({ length: days }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}
        </select>
      </label>
      <label className="field">Time
        <select value={hour} onChange={(e) => setHour(+e.target.value)}>
          {hourOptions.map((h) => <option key={h} value={h}>{hh(h)}</option>)}
        </select>
      </label>
    </>
  );
}

export function ScenarioPanel({ scenarioId, onScenario }: { scenarioId: string; onScenario: (id: string) => void }) {
  const sc = scenarioById[scenarioId];
  return (
    <div className="card">
      <h2>Scenario</h2>
      <select value={scenarioId} onChange={(e) => onScenario(e.target.value)} aria-label="Scenario">
        {scenarioId === 'custom' && <option value="custom">Custom (edited)</option>}
        {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {sc && <ol className="story">{sc.story.map((s, i) => <li key={i}>{s}</li>)}</ol>}
      {!sc && <p className="muted">You changed the setup. Pick a scenario to reset.</p>}
    </div>
  );
}

export function SetupPanel({ cfg, setCfg, compare, setCompare }: {
  cfg: SimConfig; setCfg: (c: SimConfig) => void; compare: CompareMode; setCompare: (m: CompareMode) => void;
}) {
  const p = profileById[cfg.profile];
  const [drug, setDrug] = useState('caffeine');
  const [amount, setAmount] = useState(1);
  const [dDay, setDDay] = useState(0);
  const [dHour, setDHour] = useState(8);
  const [repeat, setRepeat] = useState(1);
  const [input, setInput] = useState<InputId>('stress');
  const [eDay, setEDay] = useState(0);
  const [eHour, setEHour] = useState(14);
  const [eDur, setEDur] = useState(1);
  const [eInt, setEInt] = useState(1);

  const addDose = () => {
    const extra = Array.from({ length: repeat }, (_, i) => ({ drug, amount, at: ((dDay + i) * 24 + dHour) * 60 }))
      .filter((d) => d.at < cfg.days * 1440);
    setCfg({ ...cfg, doses: [...cfg.doses, ...extra].sort((a, b) => a.at - b.at) });
  };
  const addEvent = () => {
    setCfg({ ...cfg, events: [...cfg.events, { input, at: (eDay * 24 + eHour) * 60, duration: eDur * 60, intensity: eInt }].sort((a, b) => a.at - b.at) });
  };

  return (
    <div className="card">
      <h2>Brain & setup</h2>
      <label className="field">Profile
        <select value={cfg.profile} onChange={(e) => setCfg({ ...cfg, profile: e.target.value })}>
          {profiles.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
        </select>
      </label>
      <p className="small" style={{ color: 'var(--text-secondary)' }}>
        <span className="badge">evidence: {p.evidence}</span> {p.summary}
      </p>
      <div className="row">
        <label className="field">Length
          <select value={cfg.days} onChange={(e) => setCfg({ ...cfg, days: +e.target.value })}>
            {[1, 2, 3, 6, 10, 15, 18, 30, 45, 60].map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <label className="field">Dashed line
          <select value={compare} onChange={(e) => setCompare(e.target.value as CompareMode)}>
            {(Object.keys(compareLabels) as CompareMode[]).map((m) => <option key={m} value={m}>{compareLabels[m]}</option>)}
          </select>
        </label>
      </div>

      <h3 style={{ marginTop: 6 }}>Drugs</h3>
      <div className="list">
        {cfg.doses.length === 0 && <span className="muted">No doses.</span>}
        {cfg.doses.length > 0 && (
          <DoseList cfg={cfg} setCfg={setCfg} />
        )}
      </div>
      <details>
        <summary>Add a dose</summary>
        <div className="col" style={{ gap: 8, marginTop: 8 }}>
          <label className="field">Drug
            <select value={drug} onChange={(e) => setDrug(e.target.value)}>
              {drugs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <p className="muted">1 dose = {drugById[drug].standardDose}</p>
          <div className="row">
            <label className="field">Amount
              <select value={amount} onChange={(e) => setAmount(+e.target.value)}>
                {[0.5, 1, 1.5, 2, 3].map((a) => <option key={a} value={a}>{a}×</option>)}
              </select>
            </label>
            <DayHour days={cfg.days} day={dDay} hour={dHour} setDay={setDDay} setHour={setDHour} />
            <label className="field">Repeat daily
              <select value={repeat} onChange={(e) => setRepeat(+e.target.value)}>
                {[1, 3, 7, 14, 30, 60].map((r) => <option key={r} value={r}>{r === 1 ? 'once' : `${r} days`}</option>)}
              </select>
            </label>
          </div>
          <button className="btn primary" onClick={addDose}>Add dose</button>
        </div>
      </details>

      <h3 style={{ marginTop: 6 }}>Life events</h3>
      <div className="list">
        {cfg.events.length === 0 && <span className="muted">No events.</span>}
        {cfg.events.length > 6 && <span className="muted">{cfg.events.length} events</span>}
        {cfg.events.length <= 6 && cfg.events.map((e, i) => (
          <div key={i} className="item">
            <span className="grow">{inputById[e.input].name} · {fmtTime(e.at)} · {(e.duration / 60).toFixed(1)} h{e.intensity !== 1 ? ` · ${e.intensity}×` : ''}</span>
            <button className="x" onClick={() => setCfg({ ...cfg, events: cfg.events.filter((_, j) => j !== i) })} aria-label="remove">×</button>
          </div>
        ))}
        {cfg.events.length > 6 && <button className="btn ghost small" onClick={() => setCfg({ ...cfg, events: [] })}>Remove all events</button>}
      </div>
      <details>
        <summary>Add an event</summary>
        <div className="col" style={{ gap: 8, marginTop: 8 }}>
          <label className="field">What
            <select value={input} onChange={(e) => setInput(e.target.value as InputId)}>
              {inputs.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          <p className="muted">{inputById[input].summary}</p>
          <div className="row">
            <DayHour days={cfg.days} day={eDay} hour={eHour} setDay={setEDay} setHour={setEHour} />
            <label className="field">Hours
              <select value={eDur} onChange={(e) => setEDur(+e.target.value)}>
                {[0.5, 1, 2, 3, 6, 12].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="field">Strength
              <select value={eInt} onChange={(e) => setEInt(+e.target.value)}>
                {[0.3, 0.6, 1, 1.5].map((d) => <option key={d} value={d}>{d === 0.3 ? 'mild' : d === 0.6 ? 'moderate' : d === 1 ? 'strong' : 'extreme'}</option>)}
              </select>
            </label>
          </div>
          <button className="btn primary" onClick={addEvent}>Add event</button>
        </div>
      </details>

      <h3 style={{ marginTop: 6 }}>Sleep</h3>
      <SleepEditor cfg={cfg} setCfg={setCfg} />
    </div>
  );
}

function DoseList({ cfg, setCfg }: { cfg: SimConfig; setCfg: (c: SimConfig) => void }) {
  // group repeated daily doses for a compact list
  const groups: { drug: string; amount: number; hour: number; days: number[]; idx: number[] }[] = [];
  cfg.doses.forEach((d, i) => {
    const hour = (d.at % 1440) / 60;
    const day = Math.floor(d.at / 1440);
    const g = groups.find((x) => x.drug === d.drug && x.amount === d.amount && x.hour === hour);
    if (g) { g.days.push(day); g.idx.push(i); } else groups.push({ drug: d.drug, amount: d.amount, hour, days: [day], idx: [i] });
  });
  return (
    <>
      {groups.map((g, gi) => (
        <div key={gi} className="item">
          <span className="grow">
            {drugById[g.drug].name}{g.amount !== 1 ? ` ${g.amount}×` : ''} · {hh(g.hour)} · {g.days.length === 1 ? `day ${g.days[0] + 1}` : `days ${g.days[0] + 1}–${g.days[g.days.length - 1] + 1}`}
          </span>
          <button className="x" onClick={() => setCfg({ ...cfg, doses: cfg.doses.filter((_, j) => !g.idx.includes(j)) })} aria-label="remove">×</button>
        </div>
      ))}
    </>
  );
}

function SleepEditor({ cfg, setCfg }: { cfg: SimConfig; setCfg: (c: SimConfig) => void }) {
  const p = profileById[cfg.profile];
  const def = p.sleep ?? { bed: 23, wake: 31 };
  const [night, setNight] = useState(0);
  const [bed, setBed] = useState(23);
  const [hours, setHours] = useState(4);
  const ov = cfg.sleepOverrides ?? [];
  return (
    <div className="col" style={{ gap: 6 }}>
      <p className="muted">Usual: {hh(def.bed % 24)}–{hh(def.wake % 24)}. Shaded bands in the charts are sleep.</p>
      <div className="list">
        {ov.map((o, i) => (
          <div key={i} className="item">
            <span className="grow">Night after day {o.night + 1}: {o.bed === o.wake ? 'no sleep' : `${hh(o.bed % 24)}–${hh(o.wake % 24)}`}</span>
            <button className="x" onClick={() => setCfg({ ...cfg, sleepOverrides: ov.filter((_, j) => j !== i) })} aria-label="remove">×</button>
          </div>
        ))}
      </div>
      <details>
        <summary>Change one night</summary>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="field">After day
            <select value={night} onChange={(e) => setNight(+e.target.value)}>
              {Array.from({ length: cfg.days }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}
            </select>
          </label>
          <label className="field">Bedtime
            <select value={bed} onChange={(e) => setBed(+e.target.value)}>
              {[21, 22, 23, 24, 25, 26, 27, 28].map((h) => <option key={h} value={h}>{hh(h % 24)}</option>)}
            </select>
          </label>
          <label className="field">Sleep
            <select value={hours} onChange={(e) => setHours(+e.target.value)}>
              {[0, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => <option key={h} value={h}>{h === 0 ? 'none' : `${h} h`}</option>)}
            </select>
          </label>
        </div>
        <button className="btn primary" style={{ marginTop: 8, width: '100%' }}
          onClick={() => setCfg({ ...cfg, sleepOverrides: [...ov.filter((o) => o.night !== night), { night, bed, wake: bed + hours }] })}>
          Set night
        </button>
      </details>
    </div>
  );
}
