import type { SimConfig } from '../sim/engine';

const at = (day: number, hour: number) => Math.round((day * 24 + hour) * 60);

export interface Challenge {
  id: string;
  icon: string;
  title: string;
  task: string;
  config: SimConfig;
  charts: string[];
}

// Small experiments that turn the playground into questions with an answer.
export const challenges: Challenge[] = [
  { id: 'coffee', icon: '☕', title: 'When should I drink my coffee?',
    task: 'Drag the coffee to different times and press Play. When does the evening slump (the climb of Sleepy) come, and how big is it?',
    config: { profile: 'typical', days: 1, doses: [{ drug: 'caffeine', at: at(0, 8), amount: 1 }], events: [] },
    charts: ['read:sleepiness', 'drug:caffeine', 'pool:adenosine'] },
  { id: 'drinks', icon: '🍷', title: 'What does one evening of drinking do to tomorrow?',
    task: 'Look at Day 2 morning: compare Anxious and Sleepy with the dashed line (the same days without drinks). Then remove the drinks.',
    config: { profile: 'typical', days: 2, doses: [{ drug: 'alcohol', at: at(0, 20), amount: 1 }, { drug: 'alcohol', at: at(0, 21.5), amount: 1 }], events: [] },
    charts: ['read:anxiety', 'read:sleepiness', 'drug:alcohol'] },
  { id: 'stress', icon: '😰', title: 'Does personality change how stress feels?',
    task: 'Open "Personality" under "Whose brain?" and move "Emotional sensitivity". Watch Anxious during the stress hour at 14:00.',
    config: { profile: 'typical', days: 1, doses: [], events: [{ input: 'stress', at: at(0, 14), duration: 60, intensity: 1 }] },
    charts: ['read:anxiety', 'pool:cortisol', 'read:focus'] },
  { id: 'run', icon: '🏃', title: 'Why do I sleep better after exercise?',
    task: 'Watch the tiredness chemical (adenosine) after the run, then move the run to the morning or delete it.',
    config: { profile: 'typical', days: 1, doses: [], events: [{ input: 'exercise', at: at(0, 17), duration: 60, intensity: 1 }] },
    charts: ['pool:adenosine', 'read:mood', 'read:sleepiness'] },
];

export function Challenges({ onPick }: { onPick: (c: Challenge) => void }) {
  return (
    <div className="card">
      <h2>🧪 Try an experiment</h2>
      <div className="challenges">
        {challenges.map((c) => (
          <button key={c.id} className="qcard small-card" onClick={() => onPick(c)}>
            <span className="qtext"><span aria-hidden>{c.icon}</span> {c.title}</span>
            <span className="muted">{c.task}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
