import { useEffect, useRef, useState } from 'react';
import type { SimConfig, SimResult } from '../sim/engine';
import SimWorker from '../sim/worker?worker&inline';

/** A result together with the exact configs that produced it. */
export interface SimPair { main: SimResult; base: SimResult | null; config: SimConfig; compare: SimConfig | null }

/** Runs the simulation in a Web Worker, so long runs don't freeze the page. */
export function useSim(config: SimConfig, compare: SimConfig | null) {
  const worker = useRef<Worker | null>(null);
  const reqId = useRef(0);
  const [data, setData] = useState<SimPair | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const w = new SimWorker();
    worker.current = w;
    w.onmessage = (e: MessageEvent<{ id: number; error?: string } & Partial<SimPair>>) => {
      if (e.data.id !== reqId.current) return;
      setBusy(false);
      if (e.data.error) { setError(e.data.error); return; }
      setError(null);
      setData({ main: e.data.main!, base: e.data.base ?? null, config: e.data.config!, compare: e.data.compare ?? null });
    };
    w.onerror = (e) => { setBusy(false); setError(e.message || 'The simulation failed.'); };
    return () => w.terminate();
  }, []);

  const key = JSON.stringify([config, compare]);
  useEffect(() => {
    const id = ++reqId.current;
    setBusy(true);
    const h = setTimeout(() => worker.current?.postMessage({ id, config, compare }), 120);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, busy, error };
}
