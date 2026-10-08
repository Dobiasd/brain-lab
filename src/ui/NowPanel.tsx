import { useRef } from 'react';
import { inputById } from '../data/profiles';
import { doseLevel, type SimConfig, type SimResult } from '../sim/engine';
import { fmtTime } from './labels';
import { drugIcon, drugPlainName, inputIcon } from './plain';

const ago = (min: number) => (min < 60 ? `${Math.round(min)} min ago` : min < 48 * 60 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`);

/** How "active" each placed item is at `now` (0..1), for glowing. */
function activity(cfg: SimConfig, now: number) {
  const doses = cfg.doses.map((d) => Math.min(1, doseLevel(d.drug, now - d.at)));
  const events = cfg.events.map((e) => (now >= e.at && now < e.at + e.duration ? 1 : now >= e.at + e.duration ? Math.max(0, 1 - (now - e.at - e.duration) / 90) * 0.5 : 0));
  return { doses, events };
}

/** A time scrubber that shows what you placed on the day, with a "now" line. */
export function Scrubber({ main, cfg, cursor, onCursor }: { main: SimResult; cfg: SimConfig; cursor: number; onCursor: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const t0 = main.t[0], t1 = main.t[main.t.length - 1];
  const now = main.t[cursor];
  const pos = (t: number) => `${((t - t0) / (t1 - t0)) * 100}%`;
  const act = activity(cfg, now);
  const many = cfg.doses.length + cfg.events.length > 40;
  const asleep = main.series['state:asleep'];
  const bands: [number, number][] = [];
  let st = -1;
  for (let i = 0; i < asleep.length; i++) {
    if (asleep[i] > 0.5 && st < 0) st = main.t[i];
    if ((asleep[i] <= 0.5 || i === asleep.length - 1) && st >= 0) { bands.push([st, main.t[i]]); st = -1; }
  }
  const pick = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const tt = t0 + Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * (t1 - t0);
    onCursor(Math.max(0, Math.min(main.t.length - 1, Math.round(((tt - t0) / (t1 - t0)) * (main.t.length - 1)))));
  };
  const days = (t1 - t0) / 1440;
  const ticks: number[] = [];
  const every = days <= 1.01 ? 360 : days <= 3 ? 720 : days <= 10 ? 1440 : 7 * 1440;
  for (let t = Math.ceil(t0 / every) * every; t < t1 - every * 0.3; t += every) ticks.push(t);

  return (
    <div className="scrubber" ref={ref} role="slider" aria-label="Time" aria-valuemin={t0} aria-valuemax={t1} aria-valuenow={now}
      aria-valuetext={fmtTime(now)} tabIndex={0}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); pick(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) pick(e.clientX); }}
      onKeyDown={(e) => {
        const dt = main.t.length > 1 ? main.t[1] - main.t[0] : 5;
        const hour = Math.max(1, Math.round(60 / dt));
        const small = Math.max(1, Math.round(15 / dt));
        const last = main.t.length - 1;
        const go: Record<string, number> = {
          ArrowRight: cursor + small, ArrowUp: cursor + small, ArrowLeft: cursor - small, ArrowDown: cursor - small,
          PageUp: cursor + hour, PageDown: cursor - hour, Home: 0, End: last,
        };
        if (e.key in go) { e.preventDefault(); onCursor(Math.max(0, Math.min(last, go[e.key]))); }
      }}>
      {bands.map(([a, b]) => <div key={a} className="sc-sleep" style={{ left: pos(a), width: `calc(${pos(b)} - ${pos(a)})` }} />)}
      {ticks.map((t) => (
        <div key={t} className="sc-tick" style={{ left: pos(t) }}>
          <span>{days > 3 ? `day ${Math.round(t / 1440) + 1}` : t % 1440 === 0 ? `day ${t / 1440 + 1}` : fmtTime(t, false)}</span>
        </div>
      ))}
      {cfg.events.map((e, i) => (
        <div key={`e${i}`} className={`sc-ev${act.events[i] >= 1 ? ' on' : ''}`} style={{ left: pos(e.at), width: `calc(${pos(e.at + e.duration)} - ${pos(e.at)})`, opacity: 0.35 + 0.65 * act.events[i] }}
          title={`${inputById[e.input].name} · ${fmtTime(e.at)}`}>{!many && <span>{inputIcon[e.input]}</span>}</div>
      ))}
      {cfg.doses.map((d, i) => (
        <div key={`d${i}`} className={`sc-dose${act.doses[i] > 0.15 ? ' on' : ''}${many ? ' tiny' : ''}`}
          style={{ left: `calc(${pos(d.at)} + ${cfg.doses.slice(0, i).filter((o) => Math.abs(o.at - d.at) < 25).length * 18}px)`, ['--glow' as string]: act.doses[i] }}
          title={`${drugPlainName(d.drug)} · ${fmtTime(d.at)}`}>{!many && (drugIcon[d.drug] ?? '💊')}</div>
      ))}
      <div className="sc-now" style={{ left: pos(now) }}><span>{fmtTime(now)}</span></div>
    </div>
  );
}

/** "Active right now": drugs still in the body and activities happening (or just finished). */
export function ActiveNow({ cfg, get, now, live = true }: { cfg: SimConfig; get: (k: string) => number; now: number; live?: boolean }) {
  const drugIds = Array.from(new Set(cfg.doses.map((d) => d.drug)));
  const drugRows = drugIds.map((id) => {
    const level = get(`drug:${id}`);
    const last = cfg.doses.filter((d) => d.drug === id && d.at <= now).sort((a, b) => b.at - a.at)[0];
    const next = cfg.doses.filter((d) => d.drug === id && d.at > now).sort((a, b) => a.at - b.at)[0];
    return { id, level, last, next };
  }).filter((r) => r.level > 0.03 || (r.next && r.next.at - now < 90));
  const evRows = cfg.events
    .map((e) => ({ e, state: now >= e.at && now < e.at + e.duration ? 'now' : now >= e.at + e.duration && now - (e.at + e.duration) < 120 ? 'ended' : e.at > now && e.at - now < 90 ? 'soon' : null }))
    .filter((x) => x.state);
  const meal = get('state:meal') > 0.5;
  const asleep = get('state:asleep') > 0.5;
  const empty = !drugRows.length && !evRows.length && !meal;

  return (
    <div className="activenow" aria-live={live ? 'polite' : 'off'} tabIndex={0} aria-label="Active right now">
      <h3>Active right now</h3>
      {asleep && <div className="an-row"><span className="an-icon">😴</span><span className="grow">Asleep</span></div>}
      {meal && <div className="an-row"><span className="an-icon">🍽️</span><span className="grow">Eating a meal</span><span className="an-tag on">now</span></div>}
      {evRows.map(({ e, state }, i) => (
        <div key={i} className="an-row">
          <span className="an-icon">{inputIcon[e.input]}</span>
          <span className="grow">{inputById[e.input].name}</span>
          <span className={`an-tag${state === 'now' ? ' on' : ''}`}>{state === 'now' ? 'happening now' : state === 'soon' ? `in ${Math.round(e.at - now)} min` : `ended ${ago(now - e.at - e.duration)}`}</span>
        </div>
      ))}
      {drugRows.map((r) => (
        <div key={r.id} className="an-row">
          <span className="an-icon">{drugIcon[r.id] ?? '💊'}</span>
          <span className="grow col" style={{ gap: 2 }}>
            <span>{drugPlainName(r.id)} <span className="muted">{r.last ? `· taken ${ago(now - r.last.at)}` : r.next ? `· in ${Math.round(r.next.at - now)} min` : ''}</span></span>
            {r.level > 0.03 && <span className="an-bar"><span style={{ width: `${Math.min(100, (r.level / Math.max(1, r.level)) * 100)}%` }} /></span>}
          </span>
          <span className="an-tag">{r.level > 1.05 ? `${r.level.toFixed(1)}× one dose` : r.level > 0.03 ? `${Math.round(r.level * 100)}% of peak` : ''}</span>
        </div>
      ))}
      {empty && !asleep && <p className="muted">Nothing from your timeline is active at this moment.</p>}
    </div>
  );
}
