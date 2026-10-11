import { COMBINATION_NOTE, profileById, profileIdFor, profileParts, profiles } from '../data/profiles';

/** "Whose brain?": tick any number of conditions; none ticked is a typical adult. */
export function ProfilePicker({ value, onChange, label = 'Whose brain?' }: { value: string; onChange: (id: string) => void; label?: string }) {
  const parts = profileParts(value);
  const toggle = (id: string) => onChange(profileIdFor(parts.includes(id) ? parts.filter((p) => p !== id) : [...parts, id]));
  return (
    <div className="col" style={{ gap: 6 }}>
      <span className="field-label" id="profile-picker-label">{label} <span className="muted">(pick any that apply)</span></span>
      <div className="chips" role="group" aria-labelledby="profile-picker-label">
        <button className={`chip${parts.length === 0 ? ' on' : ''}`} aria-pressed={parts.length === 0} onClick={() => onChange('typical')}>
          {profileById.typical.name}
        </button>
        {profiles.filter((p) => p.id !== 'typical').map((p) => (
          <button key={p.id} className={`chip${parts.includes(p.id) ? ' on' : ''}`} aria-pressed={parts.includes(p.id)} onClick={() => toggle(p.id)}>
            <span className="chip-mark" aria-hidden>{parts.includes(p.id) ? '✓' : '+'}</span>{p.name}
          </button>
        ))}
      </div>
      {parts.map((id) => {
        const p = profileById[id];
        return (
          <p key={id} className="small" style={{ color: 'var(--text-secondary)' }}>
            <span className="badge">evidence: {p.evidence}</span> <b>{p.name}:</b> {p.summary}
          </p>
        );
      })}
      {parts.length > 1 && <p className="small muted">{COMBINATION_NOTE}</p>}
    </div>
  );
}
