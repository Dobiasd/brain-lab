import type { Warning } from '../sim/safety';

export function Warnings({ items }: { items: Warning[] }) {
  if (!items.length) return null;
  return (
    <div className="warnings" role="alert">
      {items.map((w) => (
        <div key={w.title} className={`warn ${w.level}`}>
          <b>{w.title}</b>
          <span>{w.text}</span>
        </div>
      ))}
    </div>
  );
}
