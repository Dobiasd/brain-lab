type Get = (k: string) => number;

/**
 * Serotonin's "thermostat": 5-HT1A autoreceptors on the raphe neurons. Many receptors = strict
 * (extra serotonin quickly turns firing down). The SSRI tour shows it relaxing over weeks.
 */
export function Thermostat({ get, getBase }: { get: Get; getBase: Get | null }) {
  const dens = get('dens:ht1a_auto');
  const fire = get('fire:raphe');
  const sero = get('pool:ht');
  // dial: 0.4 (relaxed) … 1.2 (strict)
  const lo = 0.4, hi = 1.2;
  const f = Math.max(0, Math.min(1, (dens - lo) / (hi - lo)));
  const angle = Math.PI * (1 - f); // left = relaxed, right = strict
  const cx = 100, cy = 92, r = 70;
  const nx = cx + r * 0.85 * Math.cos(angle), ny = cy - r * 0.85 * Math.sin(angle);
  const arc = (a0: number, a1: number) => `M${cx + r * Math.cos(a0)},${cy - r * Math.sin(a0)} A${r},${r} 0 0 1 ${cx + r * Math.cos(a1)},${cy - r * Math.sin(a1)}`;
  const state = f > 0.7 ? 'strict' : f > 0.4 ? 'loosening' : 'relaxed';
  const bar = (label: string, v: number, base: number | null) => (
    <div className="th-bar">
      <span className="th-label"><span className="small">{label}</span><b className="small">{Math.round(v * 100)}%</b></span>
      <span className="th-track" aria-hidden>
        <span className="th-fill" style={{ width: `${Math.min(100, (v / 2.5) * 100)}%` }} />
        <span className="th-normal" style={{ left: `${(1 / 2.5) * 100}%` }} />
        {base != null && <span className="th-base" style={{ left: `${Math.min(100, (base / 2.5) * 100)}%` }} />}
      </span>
    </div>
  );
  return (
    <figure className="thermostat">
      <h3>Serotonin's thermostat</h3>
      <div className="th-row">
        <svg viewBox="0 0 200 110" role="img" aria-label={`Thermostat dial: ${state}. Thermostat receptors at ${Math.round(dens * 100)}% of normal.`}>
          <path d={arc(Math.PI, Math.PI / 2)} fill="none" stroke="var(--chem-serotonin)" strokeWidth={12} strokeLinecap="round" opacity={0.55} />
          <path d={arc(Math.PI / 2, 0)} fill="none" stroke="var(--compare)" strokeWidth={12} strokeLinecap="round" opacity={0.55} />
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text-primary)" strokeWidth={4} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={6} fill="var(--text-primary)" />
          <text x={20} y={108} fontSize={11} fill="var(--text-muted)">relaxed</text>
          <text x={180} y={108} fontSize={11} fill="var(--text-muted)" textAnchor="end">strict</text>
        </svg>
        <div className="col" style={{ gap: 6, flex: '1 1 160px' }}>
          {bar('Serotonin neurons firing', fire, getBase ? getBase('fire:raphe') : null)}
          {bar('Serotonin level', sero, getBase ? getBase('pool:ht') : null)}
        </div>
      </div>
      <figcaption className="muted">
        The thermostat is {state} ({Math.round(dens * 100)}% of its usual receptors). When it is strict, extra serotonin makes the neurons fire less.
        Over weeks on an SSRI it relaxes, firing recovers and serotonin rises. The thin line marks normal (100%), the dashed mark the comparison.
      </figcaption>
    </figure>
  );
}
