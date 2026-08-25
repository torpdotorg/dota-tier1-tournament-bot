import { listTournaments, updateTournament } from '../catalog.js';
import { resolveTournamentAdapter } from './adapterRegistry.js';
import { CoverageWorker } from './coverageWorker.js';

const workers = new Map();
let lastReconcile = { at: null, started: 0, stopped: 0, observing: 0, running: 0, degraded: 0, waitingAdapter: 0 };

export async function reconcileCoverageWorkers({ publish = false } = {}) {
  const events = listTournaments();
  const activated = new Map(events.filter(event => event.activationState === 'active-coverage').map(event => [event.id, event]));
  let started = 0, stopped = 0, waitingAdapter = 0;

  for (const [id, worker] of workers) {
    if (!activated.has(id)) { worker.stop(); workers.delete(id); stopped++; }
  }

  for (const event of activated.values()) {
    if (workers.has(event.id)) continue;
    const adapter = resolveTournamentAdapter(event);
    if (!adapter) {
      waitingAdapter++;
      updateTournament(event.id, { workerState: 'waiting-adapter', workerUpdatedAt: new Date().toISOString() });
      continue;
    }
    const worker = new CoverageWorker({ context: event, adapter, publish });
    try {
      await worker.start();
      workers.set(event.id, worker);
      started++;
      updateTournament(event.id, { workerState: worker.state, workerAdapter: adapter.name, workerUpdatedAt: new Date().toISOString() });
    } catch (error) {
      updateTournament(event.id, { workerState: 'degraded', workerAdapter: adapter.name, workerError: error.message, workerUpdatedAt: new Date().toISOString() });
    }
  }

  for (const worker of workers.values()) {
    if (worker.state === 'observing') await worker.poll();
  }
  const values = [...workers.values()].map(worker => worker.status());
  lastReconcile = {
    at: new Date().toISOString(), started, stopped, waitingAdapter,
    observing: values.filter(row => row.state === 'observing').length,
    running: values.filter(row => row.state === 'running').length,
    degraded: values.filter(row => row.state === 'degraded').length
  };
  return lastReconcile;
}

export function coverageWorkerSummary() {
  return { ...lastReconcile, workers: [...workers.values()].map(worker => worker.status()) };
}
