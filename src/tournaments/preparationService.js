import { listTournaments, updateTournament } from './catalog.js';
import { preparationDecision } from './preparationRules.js';
import { syncTeamRegistry } from '../teamRegistry.js';
import { syncApplicationTeamEmojis } from '../teamEmojiService.js';

let inFlight = null;
let lastRun = {
  at: null,
  durationMs: 0,
  prepared: 0,
  waiting: 0,
  failed: 0,
  skipped: 0,
  lastPreparedTournament: null,
  lastPreparedAt: null
};

export { shouldSkipPreparedTournament } from './preparationSkip.js';
import { shouldSkipPreparedTournament, participantSignature, validParticipants } from './preparationSkip.js';

export async function prepareUpcomingTournaments(client, { force = false } = {}) {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const started = Date.now();
    const events = listTournaments();
    let prepared = 0;
    let waiting = 0;
    let failed = 0;
    let skipped = 0;
    let lastPreparedTournament = lastRun.lastPreparedTournament;
    let lastPreparedAt = lastRun.lastPreparedAt;

    for (const event of events) {
      if (shouldSkipPreparedTournament(event, { force })) {
        skipped++;
        continue;
      }

      const effectiveEvent = event;
      const decision = preparationDecision(effectiveEvent);
      if (!decision.eligible) {
        waiting++;
        const terminal = decision.state === 'not-applicable';
        updateTournament(event.id, {
          preparationState: decision.state,
          preparationReason: decision.reason,
          nextPreparationAt: terminal ? null : new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          lastPreparationCheck: new Date().toISOString()
        });
        continue;
      }

      try {
        const teams = validParticipants(effectiveEvent.participants);
        await syncTeamRegistry(teams);
        if (client) await syncApplicationTeamEmojis(client);

        prepared++;
        lastPreparedTournament = event.name;
        lastPreparedAt = new Date().toISOString();
        updateTournament(event.id, {
          preparationState: 'ready',
          preparationReason: 'Teams synchronized and branding prepared',
          participants: teams,
          preparedTeamCount: teams.length,
          preparedParticipantSignature: participantSignature(teams),
          lastPreparedAt,
          lastPreparationCheck: lastPreparedAt,
          nextPreparationAt: null
        });
        console.log(`[Preparation] Ready: ${event.name} (${teams.length} teams).`);
      } catch (error) {
        failed++;
        updateTournament(event.id, {
          preparationState: 'retry',
          preparationReason: error.message,
          lastPreparationCheck: new Date().toISOString(),
          nextPreparationAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        });
        console.warn(`[Preparation] ${event.name} deferred: ${error.message}`);
      }
    }

    lastRun = {
      at: new Date().toISOString(),
      durationMs: Date.now() - started,
      prepared,
      waiting,
      failed,
      skipped,
      lastPreparedTournament,
      lastPreparedAt
    };

    if (prepared || failed || force) {
      console.log(`[Preparation] ${prepared} prepared, ${waiting} waiting, ${skipped} unchanged, ${failed} failed. No public coverage enabled.`);
    } else if (skipped) {
      console.log(`[Preparation] No changes detected; ${skipped} ready tournament${skipped === 1 ? '' : 's'} skipped.`);
    }

    return lastRun;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function latestPreparedTournament(events = listTournaments()) {
  return events
    .filter(event => event.preparationState === 'ready' && event.lastPreparedAt)
    .sort((a, b) => Date.parse(b.lastPreparedAt) - Date.parse(a.lastPreparedAt))[0] || null;
}

export function preparationSummary() {
  const events = listTournaments();
  const latestPrepared = latestPreparedTournament(events);
  const count = state => events.filter(event => event.preparationState === state).length;
  return {
    ...lastRun,
    lastPreparedTournament: lastRun.lastPreparedTournament || latestPrepared?.name || null,
    lastPreparedAt: lastRun.lastPreparedAt || latestPrepared?.lastPreparedAt || null,
    total: events.length,
    ready: count('ready'),
    awaitingProviderId: count('awaiting-provider-id'),
    awaitingTeams: count('awaiting-teams'),
    scheduled: count('scheduled'),
    retry: count('retry')
  };
}
