import { listTournaments, updateTournament } from './catalog.js';
import { activationDecision } from './activationRules.js';

let inFlight = null;
let lastRun = { at: null, activated: 0, completed: 0, pending: 0, blocked: 0, unchanged: 0, lastActivatedTournament: null, lastActivatedAt: null };

function equivalent(event, decision) {
  return event.activationState === decision.state && event.activationReason === decision.reason;
}

export async function evaluateTournamentActivations({ force = false, now = Date.now() } = {}) {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const events = listTournaments();
    const counts = { activated: 0, completed: 0, pending: 0, blocked: 0, unchanged: 0 };
    let lastActivatedTournament = lastRun.lastActivatedTournament;
    let lastActivatedAt = lastRun.lastActivatedAt;

    for (const event of events) {
      const decision = activationDecision(event, now);
      if (!force && equivalent(event, decision)) {
        counts.unchanged++;
        continue;
      }

      const patch = {
        activationState: decision.state,
        activationReason: decision.reason,
        activationCheckedAt: new Date(now).toISOString(),
        activationAt: decision.activationAt || event.activationAt || null
      };

      if (decision.state === 'active-coverage') {
        patch.coverageActivated = true;
        patch.activatedAt = event.activatedAt || decision.activatedAt || new Date(now).toISOString();
        patch.completedAt = null;
        counts.activated++;
        lastActivatedTournament = event.name;
        lastActivatedAt = patch.activatedAt;
      } else if (decision.state === 'completed') {
        patch.coverageActivated = false;
        patch.completedAt = event.completedAt || new Date(now).toISOString();
        counts.completed++;
      } else if (decision.state.startsWith('blocked')) {
        patch.coverageActivated = false;
        counts.blocked++;
      } else {
        patch.coverageActivated = false;
        counts.pending++;
      }
      updateTournament(event.id, patch);
    }

    lastRun = {
      at: new Date(now).toISOString(),
      ...counts,
      lastActivatedTournament,
      lastActivatedAt
    };

    if (counts.activated || counts.completed || force) {
      console.log(`[Activation] ${counts.activated} activated, ${counts.completed} completed, ${counts.pending} pending, ${counts.blocked} blocked.`);
    } else if (counts.unchanged) {
      console.log(`[Activation] No changes detected; ${counts.unchanged} tournament states unchanged.`);
    }
    return lastRun;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function activationSummary() {
  const events = listTournaments();
  const count = state => events.filter(event => event.activationState === state).length;
  const latest = events
    .filter(event => event.activatedAt)
    .sort((a, b) => Date.parse(b.activatedAt) - Date.parse(a.activatedAt))[0] || null;
  return {
    ...lastRun,
    activeCoverage: count('active-coverage'),
    readyOutsideWindow: count('ready-outside-window'),
    waitingPreparation: count('waiting-preparation'),
    blocked: events.filter(event => String(event.activationState || '').startsWith('blocked')).length,
    completedCoverage: count('completed'),
    lastActivatedTournament: lastRun.lastActivatedTournament || latest?.name || null,
    lastActivatedAt: lastRun.lastActivatedAt || latest?.activatedAt || null
  };
}
