import { listTournaments, updateTournament } from './catalog.js';

const runtimes = new Map();
let lastReconcile = { at: null, started: 0, stopped: 0, running: 0, waitingAdapter: 0 };

export function tournamentMessageKey(tournamentId, scope, entityId = null) {
  return ['tournament', tournamentId, scope, entityId].filter(value => value !== null && value !== undefined && value !== '').join(':');
}

export function coverageRuntimeDescriptor(event) {
  const configured = event.coverage === 'configured';
  const activated = event.activationState === 'active-coverage';
  return {
    tournamentId: event.id,
    leagueId: event.leagueId ? String(event.leagueId) : null,
    name: event.name,
    shortName: event.shortName || event.name,
    state: activated ? (configured ? 'running' : 'waiting-adapter') : 'inactive',
    configured,
    activated,
    timezone: event.timezone || 'UTC',
    startedAt: null,
    messageNamespace: `tournament:${event.id}`
  };
}

export function reconcileCoverageRuntimes() {
  const events = listTournaments();
  const desired = new Map(events.map(event => [event.id, coverageRuntimeDescriptor(event)]));
  let started = 0;
  let stopped = 0;

  for (const [id, current] of runtimes) {
    const next = desired.get(id);
    if (!next || next.state === 'inactive') {
      runtimes.delete(id);
      stopped++;
      updateTournament(id, { runtimeState: 'stopped', runtimeUpdatedAt: new Date().toISOString() });
    }
  }

  for (const [id, descriptor] of desired) {
    if (descriptor.state === 'inactive') continue;
    const previous = runtimes.get(id);
    if (!previous) {
      descriptor.startedAt = new Date().toISOString();
      runtimes.set(id, descriptor);
      started++;
    } else {
      runtimes.set(id, { ...previous, ...descriptor, startedAt: previous.startedAt });
    }
    updateTournament(id, {
      runtimeState: descriptor.state,
      runtimeNamespace: descriptor.messageNamespace,
      runtimeUpdatedAt: new Date().toISOString()
    });
  }

  const values = [...runtimes.values()];
  lastReconcile = {
    at: new Date().toISOString(),
    started,
    stopped,
    running: values.filter(item => item.state === 'running').length,
    waitingAdapter: values.filter(item => item.state === 'waiting-adapter').length
  };
  if (started || stopped) {
    console.log(`[Coverage] ${started} runtime${started === 1 ? '' : 's'} started, ${stopped} stopped; ${lastReconcile.running} running, ${lastReconcile.waitingAdapter} awaiting generic provider adapter.`);
  }
  return lastReconcile;
}

export function coverageRuntimeSummary() {
  return { ...lastReconcile, runtimes: [...runtimes.values()] };
}

export function selectTournamentContext(query = null) {
  const rows = listTournaments();
  if (query) {
    const normalized = String(query).toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = rows.find(row => [row.id, row.name, row.shortName, row.leagueId]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalized)));
    if (match) return match;
  }
  return rows.find(row => row.runtimeState === 'running')
    || rows.find(row => row.activationState === 'active-coverage')
    || rows.find(row => row.coverage === 'configured')
    || null;
}
