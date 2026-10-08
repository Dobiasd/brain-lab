import { useRef, useState } from 'react';
import { drugById } from '../data/drugs';
import { inputById } from '../data/profiles';
import { doseLevel, type SimConfig, type SimResult } from '../sim/engine';
import { fmtTime } from './labels';
import { drugIcon, drugPlainName, inputIcon } from './plain';
import { doseLabel, doseOptions, palette, paletteByKey, snap, type Planner } from './planner';

type Kind = 'dose' | 'event' | 'meal';
type Drag = { kind: Kind; index: number; startX: number; dx: number; width: number };

/**
 * The one timeline of "Your day": play and scrub through time on it, and edit on it.
 * Click (or drop) to place the item picked above; drag an item to move it; click one to select it.
 */
export function Timeline({ main, cursor, onCursor, planner }: {
  main: SimResult;
  cursor: number;
  onCursor: (i: number) => void;
  planner: Planner;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const scrubbing = useRef(false);
  const cfg = planner.cfg; // what is being edited (may be newer than `main`)
  const t0 = main.t[0], t1 = main.t[main.t.length - 1];
  const span = Math.max(1, t1 - t0);
  const now = main.t[cursor];
  const pct = (t: number) => ((t - t0) / span) * 100;
  const days = span / 1440;
  const many = cfg.doses.length + cfg.events.length > 40;
  const { armed, sel } = planner;

  const timeAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return t0 + Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * span;
  };
  const indexAt = (t: number) => Math.max(0, Math.min(main.t.length - 1, Math.round(((t - t0) / span) * (main.t.length - 1))));

  // sleep shading from the simulated result
  const asleep = main.series['state:asleep'];
  const bands: [number, number][] = [];
  let st = -1;
  for (let i = 0; i < asleep.length; i++) {
    if (asleep[i] > 0.5 && st < 0) st = main.t[i];
    if ((asleep[i] <= 0.5 || i === asleep.length - 1) && st >= 0) { bands.push([st, main.t[i]]); st = -1; }
  }
  const ticks: number[] = [];
  const every = days <= 1.01 ? 360 : days <= 3 ? 360 : days <= 10 ? 1440 : 7 * 1440;
  for (let t = Math.ceil(t0 / every) * every; t < t1 - every * 0.3; t += every) if (t > t0) ticks.push(t);
  const dayStarts = days <= 10 ? Array.from({ length: Math.ceil(days) }, (_, d) => d * 1440).filter((t) => t > t0 && t < t1) : [];

  const onTrackDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const t = timeAt(e.clientX);
    if (armed) { planner.place(armed, t); return; }
    scrubbing.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    onCursor(indexAt(t));
  };
  const onTrackMove = (e: React.PointerEvent) => {
    if (drag) { setDrag({ ...drag, dx: e.clientX - drag.startX }); return; }
    if (scrubbing.current) onCursor(indexAt(timeAt(e.clientX)));
  };
  const onTrackUp = () => {
    scrubbing.current = false;
    if (!drag) return;
    const dm = snap((drag.dx / drag.width) * span);
    if (Math.abs(drag.dx) > 4) planner.shift({ kind: drag.kind, index: drag.index }, dm);
    else planner.setSel(sel?.kind === drag.kind && sel.index === drag.index ? null : { kind: drag.kind, index: drag.index });
    setDrag(null);
  };
  const itemDown = (kind: Kind, index: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    track.current!.setPointerCapture?.(e.pointerId);
    setDrag({ kind, index, startX: e.clientX, dx: 0, width: track.current!.getBoundingClientRect().width });
  };
  const itemKey = (kind: Kind, index: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); planner.remove({ kind, index }); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); planner.setSel({ kind, index }); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    const dt = main.t.length > 1 ? main.t[1] - main.t[0] : 5;
    const hour = Math.max(1, Math.round(60 / dt)), small = Math.max(1, Math.round(15 / dt));
    const lastI = main.t.length - 1;
    const go: Record<string, number> = {
      ArrowRight: cursor + small, ArrowUp: cursor + small, ArrowLeft: cursor - small, ArrowDown: cursor - small,
      PageUp: cursor + hour, PageDown: cursor - hour, Home: 0, End: lastI,
    };
    if (e.key in go) { e.preventDefault(); onCursor(Math.max(0, Math.min(lastI, go[e.key]))); }
  };

  const selItem = sel && (sel.kind === 'dose' ? cfg.doses[sel.index] : sel.kind === 'meal' ? { at: planner.meals[sel.index] } : cfg.events[sel.index]);
  const dragOff = (kind: Kind, i: number) => (drag && drag.kind === kind && drag.index === i ? drag.dx : 0);

  return (
    <div className="tl-wrap">
      {armed && (
        <p className="tl-hint" role="status">
          Click on the timeline to place <b>{paletteByKey[armed].icon} {paletteByKey[armed].label}</b>
          {planner.everyDay ? ' (every day)' : ''}.{' '}
          <button className="linkbtn" onClick={() => planner.setArmed(null)}>Cancel</button>
        </p>
      )}
      <div ref={track} className={`tl${armed ? ' armed' : ''}`} role="group" aria-label="Timeline of your day"
        onPointerDown={onTrackDown} onPointerMove={onTrackMove} onPointerUp={onTrackUp} onPointerCancel={onTrackUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const k = e.dataTransfer.getData('text/plain'); if (k) planner.place(k, timeAt(e.clientX)); planner.setArmed(null); }}>
        {bands.map(([a, b]) => <div key={a} className="tl-sleep" style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }} />)}
        {dayStarts.map((t) => <div key={`day${t}`} className="tl-day" style={{ left: `${pct(t)}%` }}><span>day {t / 1440 + 1}</span></div>)}
        {ticks.filter((t) => !dayStarts.includes(t)).map((t) => (
          <div key={t} className="tl-tick" style={{ left: `${pct(t)}%` }}><span>{days > 3 ? `day ${Math.round(t / 1440) + 1}` : fmtTime(t, false)}</span></div>
        ))}
        {days <= 7 && planner.meals.map((m, i) => {
          if (m >= t1) return null;
          const eaten = main.series['state:meal'][indexAt(m + 10)] > 0.5;
          return (
            <button key={`m${i}`} type="button" className={`tl-meal${eaten ? '' : ' skipped'}${sel?.kind === 'meal' && sel.index === i ? ' sel' : ''}`}
              style={{ left: `calc(${pct(m)}% + ${dragOff('meal', i)}px)` }}
              aria-label={`Meal, ${fmtTime(m)}${eaten ? '' : ' (asleep, so not eaten)'}. Enter to select, Delete to remove.`}
              title={`Meal · ${fmtTime(m)}${eaten ? '' : ' (asleep: skipped)'}`}
              onPointerDown={itemDown('meal', i)} onKeyDown={itemKey('meal', i)}>🍲</button>
          );
        })}
        {cfg.events.map((e, i) => {
          const live = now >= e.at && now < e.at + e.duration;
          return (
            <button key={`e${i}`} type="button" className={`tl-ev${live ? ' live' : ''}${sel?.kind === 'event' && sel.index === i ? ' sel' : ''}`}
              style={{ left: `calc(${pct(e.at)}% + ${dragOff('event', i)}px)`, width: `${Math.max(1.2, pct(e.at + e.duration) - pct(e.at))}%` }}
              aria-label={`${inputById[e.input].name}, ${fmtTime(e.at)}, ${e.duration / 60} h. Enter to select, Delete to remove.`}
              title={`${inputById[e.input].name} · ${fmtTime(e.at)}`}
              onPointerDown={itemDown('event', i)} onKeyDown={itemKey('event', i)}>
              {!many && inputIcon[e.input]}
            </button>
          );
        })}
        {cfg.doses.map((d, i) => {
          const level = Math.min(1, doseLevel(d.drug, now - d.at));
          const stack = cfg.doses.slice(0, i).filter((o) => Math.abs(o.at - d.at) < span / 60).length;
          return (
            <button key={`d${i}`} type="button" className={`tl-dose${level > 0.15 ? ' live' : ''}${many ? ' tiny' : ''}${sel?.kind === 'dose' && sel.index === i ? ' sel' : ''}`}
              style={{ left: `calc(${pct(d.at)}% + ${dragOff('dose', i) + stack * 20}px)`, ['--glow' as string]: level }}
              aria-label={`${drugPlainName(d.drug)}, ${doseLabel(drugById[d.drug], d.amount)}, ${fmtTime(d.at)}. Enter to select, Delete to remove.`}
              title={`${drugPlainName(d.drug)} (${doseLabel(drugById[d.drug], d.amount)}) · ${fmtTime(d.at)}`}
              onPointerDown={itemDown('dose', i)} onKeyDown={itemKey('dose', i)}>
              {!many && (drugIcon[d.drug] ?? '💊')}
              {!many && (() => {
                // a small badge when the dose differs from what the palette places
                const k = d.amount / (palette.find((p) => p.drug === d.drug)?.amount ?? 1);
                return Math.abs(k - 1) > 1e-9 && <span className="tl-amt" aria-hidden>{Math.abs(k - 0.5) < 1e-9 ? '½' : `×${+k.toFixed(1)}`}</span>;
              })()}
            </button>
          );
        })}
        <div className="tl-now" style={{ left: `${pct(now)}%` }}>
          <span className="tl-handle" role="slider" tabIndex={0} aria-label="Time" aria-valuemin={t0} aria-valuemax={t1}
            aria-valuenow={now} aria-valuetext={fmtTime(now)} onKeyDown={handleKey}
            onPointerDown={(e) => { e.stopPropagation(); scrubbing.current = true; track.current!.setPointerCapture?.(e.pointerId); }}>
            {fmtTime(now)}
          </span>
        </div>
      </div>

      {sel && selItem && (
        <div className="selbar">
          {sel.kind === 'meal'
            ? <span>🍲 <b>Meal</b> · {fmtTime(selItem.at)}</span>
            : sel.kind === 'dose'
            ? <span>{drugIcon[(selItem as SimConfig['doses'][number]).drug]} <b>{drugPlainName((selItem as SimConfig['doses'][number]).drug)}</b> · {doseLabel(drugById[(selItem as SimConfig['doses'][number]).drug], (selItem as SimConfig['doses'][number]).amount)} · {fmtTime(selItem.at)}</span>
            : <span>{inputIcon[(selItem as SimConfig['events'][number]).input]} <b>{inputById[(selItem as SimConfig['events'][number]).input].name}</b> · {fmtTime(selItem.at)}</span>}
          {sel.kind === 'dose' && (() => {
            const dz = selItem as SimConfig['doses'][number];
            return (
              <span className="row dose-pick" role="group" aria-label="Dose size">
                {doseOptions(drugById[dz.drug]).map((o) => (
                  <button key={o.amount} className={`btn${Math.abs(o.amount - dz.amount) < 1e-9 ? ' primary' : ''}`}
                    aria-pressed={Math.abs(o.amount - dz.amount) < 1e-9} onClick={() => planner.setAmount(sel.index, o.amount)}>
                    {o.label}
                  </button>
                ))}
              </span>
            );
          })()}
          <span className="row" style={{ gap: 4, flex: '0 0 auto' }} role="group" aria-label="Move">
            {[-60, -15, 15, 60].map((dm) => (
              <button key={dm} className="btn" onClick={() => planner.shift(sel, dm)} aria-label={`Move ${dm < 0 ? 'earlier' : 'later'} by ${Math.abs(dm)} minutes`}>
                {dm < 0 ? '−' : '+'}{Math.abs(dm) >= 60 ? '1 h' : '15 min'}
              </button>
            ))}
          </span>
          <button className="btn" onClick={() => planner.remove(sel)}>Remove</button>
          <button className="btn ghost" onClick={() => planner.setSel(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
