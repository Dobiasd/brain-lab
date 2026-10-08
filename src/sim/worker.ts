import { runSim, type SimConfig } from './engine';

type Job = { id: number; config: SimConfig; compare: SimConfig | null };

// Only the newest request matters: if several arrive while one is running,
// the older waiting ones are dropped.
let pending: Job | null = null;
let scheduled = false;

function work() {
  scheduled = false;
  const job = pending;
  pending = null;
  if (!job) return;
  try {
    const main = runSim(job.config);
    const base = job.compare ? runSim(job.compare) : null;
    const transfer: Transferable[] = [main.t.buffer, ...Object.values(main.series).map((s) => s.buffer)];
    if (base) transfer.push(base.t.buffer, ...Object.values(base.series).map((s) => s.buffer));
    (self as unknown as Worker).postMessage({ id: job.id, main, base, config: job.config, compare: job.compare }, transfer);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: job.id, error: String(err) });
  }
  if (pending && !scheduled) { scheduled = true; setTimeout(work, 0); }
}

self.onmessage = (e: MessageEvent<Job>) => {
  pending = e.data;
  if (!scheduled) { scheduled = true; setTimeout(work, 0); }
};
