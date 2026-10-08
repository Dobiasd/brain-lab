import { useState } from 'react';
import { drugById } from '../data/drugs';
import { profileById } from '../data/profiles';
import { defaultMeals, type SimConfig } from '../sim/engine';
import { drugPlainName } from './plain';
import { hhmm, palette, paletteByKey, paletteGroups, type Planner } from './planner';

const nightOptions = [
  { label: 'normal sleep', hours: null as number | null },
  { label: 'long sleep (10 h)', hours: 10 },
  { label: 'short (5 h)', hours: 5 },
  { label: 'very short (3 h)', hours: 3 },
  { label: 'all-nighter', hours: 0 },
];

/** The editing card of "Your day": what to add, the nights, and what is not modelled. The timeline itself is in Timeline.tsx. */
export function DayPlanner({ cfg, setCfg, planner }: { cfg: SimConfig; setCfg: (c: SimConfig) => void; planner: Planner }) {
  const [addDay, setAddDay] = useState(0);
  const [addMin, setAddMin] = useState(8 * 60);
  const { armed, setArmed, everyDay, setEveryDay } = planner;
  const profile = profileById[cfg.profile];
  const days = cfg.days;
  const setDays = (d: number) => setCfg({ ...cfg, days: d, doses: cfg.doses.filter((x) => x.at < d * 1440), events: cfg.events.filter((x) => x.at < d * 1440), sleepOverrides: cfg.sleepOverrides?.filter((o) => o.night < d),
    meals: cfg.meals && [...cfg.meals.filter((x) => x < d * 1440), ...defaultMeals(d).filter((x) => x >= cfg.days * 1440)] });

  /** -1 = a custom night (e.g. from a scenario) that matches no option */
  const nightOf = (d: number) => {
    const o = cfg.sleepOverrides?.find((x) => x.night === d);
    if (!o) return 0;
    const defBed = profile.sleep?.bed ?? 23;
    const i = nightOptions.findIndex((n) => n.hours === o.wake - o.bed);
    return i < 0 || o.bed !== defBed ? -1 : i;
  };
  const customLabel = (d: number) => {
    const o = cfg.sleepOverrides?.find((x) => x.night === d);
    if (!o) return '';
    const hm = (h: number) => `${String(Math.floor(h % 24)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
    return o.bed === o.wake ? 'custom: no sleep' : `custom: ${hm(o.bed)}–${hm(o.wake)}`;
  };
  const setNight = (d: number, optIdx: number) => {
    if (optIdx < 0) return;
    const rest = (cfg.sleepOverrides ?? []).filter((o) => o.night !== d);
    const h = nightOptions[optIdx].hours;
    const bed = profile.sleep?.bed ?? 23;
    setCfg({ ...cfg, sleepOverrides: h == null ? rest : [...rest, { night: d, bed, wake: bed + h }] });
  };

  // important real-world effects of placed things that the model does not show
  const notModelled = Array.from(new Set([
    ...(cfg.doses.some((x) => x.drug === 'caffeine' && x.at % 1440 >= 14 * 60) ? ['Caffeine after ~14:00 can make it harder to fall asleep and reduce deep sleep; the model only hides tiredness and does not delay sleep.'] : []),
    ...cfg.doses.map((x) => drugById[x.drug].notModelled ? `${drugPlainName(x.drug)}: ${drugById[x.drug].notModelled}` : null).filter((x): x is string => !!x),
  ]));

  return (
    <div className="card planner">
      <div className="row" style={{ alignItems: 'center' }}>
        <h1 tabIndex={-1} style={{ flex: '1 1 160px', fontSize: 18 }}>🗓️ Your day</h1>
        <label className="field" style={{ flex: '0 0 120px' }}>Length
          <select value={days <= 7 ? days : ''} onChange={(e) => setDays(+e.target.value)}>
            {days > 7 && <option value="">{days} days</option>}
            {[1, 2, 3, 7].map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <button className="btn ghost" style={{ flex: '0 0 auto' }} onClick={() => setCfg({ ...cfg, doses: [], events: [], sleepOverrides: [], meals: undefined })}>Clear all</button>
      </div>
      <p className="muted">Pick something, then click on the timeline below (it stays at the top of the screen) or drag it there.
        Drag placed icons to move them; click one to move it by buttons or remove it.</p>
      {paletteGroups.map((g) => (
        <div key={g} className="palgroup">
          <span className="palhead">{g}</span>
          <div className="palette" role="toolbar" aria-label={g}>
            {palette.filter((p) => p.group === g).map((p) => (
              <button key={p.key} className={`pal${armed === p.key ? ' on' : ''}`} title={p.hint} draggable aria-pressed={armed === p.key}
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.key); setArmed(p.key); }}
                onClick={() => setArmed(armed === p.key ? null : p.key)}>
                <span aria-hidden>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="row addrow" style={{ alignItems: 'center' }}>
        <label className="toggle small" style={{ flex: '0 0 auto' }}><input type="checkbox" checked={everyDay} onChange={(e) => setEveryDay(e.target.checked)} /> Add it every day</label>
        {armed && (
          <span className="row" style={{ alignItems: 'center', flex: '1 1 320px', gap: 6 }}>
            <span className="small" style={{ flex: '0 0 auto' }}>or add <b>{paletteByKey[armed].icon} {paletteByKey[armed].label}</b> on</span>
            {days > 1 && (
              <select value={Math.min(addDay, days - 1)} onChange={(e) => setAddDay(+e.target.value)} aria-label="Day" style={{ flex: '0 0 auto', width: 'auto' }}>
                {Array.from({ length: days }, (_, i) => <option key={i} value={i}>day {i + 1}</option>)}
              </select>
            )}
            <span className="small" style={{ flex: '0 0 auto' }}>at</span>
            <select value={addMin} onChange={(e) => setAddMin(+e.target.value)} aria-label="Time" style={{ flex: '0 0 auto', width: 'auto' }}>
              {Array.from({ length: 96 }, (_, i) => i * 15).map((m) => <option key={m} value={m}>{hhmm(m)}</option>)}
            </select>
            <button className="btn primary" style={{ flex: '0 0 auto' }} onClick={() => planner.place(armed, Math.min(addDay, days - 1) * 1440 + addMin)}>Add</button>
          </span>
        )}
      </div>
      {days <= 7 && (
        <div className="nights" role="group" aria-label="Nights">
          <span className="palhead">Nights</span>
          {Array.from({ length: days }, (_, d) => (
            <label key={d} className="night">
              <span className="small">after day {d + 1}</span>
              <select value={nightOf(d)} onChange={(e) => setNight(d, +e.target.value)} aria-label={`Night after day ${d + 1}`}>
                {nightOf(d) === -1 && <option value={-1}>🌙 {customLabel(d)}</option>}
                {nightOptions.map((n, i) => <option key={i} value={i}>🌙 {n.label}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      {notModelled.length > 0 && (
        <details className="notmodelled">
          <summary>ℹ️ Not modelled here ({notModelled.length})</summary>
          <ul>{notModelled.map((n) => <li key={n}>{n}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
