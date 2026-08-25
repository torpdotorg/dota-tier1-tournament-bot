import { listTournaments, updateTournament } from './catalog.js';

export function tournamentHasEnded(event, now = Date.now()) {
  const end = Date.parse(`${event?.endDate || event?.startDate || ''}T23:59:59Z`);
  return Number.isFinite(end) && end < now;
}

export function alignCompletedTournamentStates(now = Date.now()) {
  let aligned = 0;
  for (const event of listTournaments()) {
    if (!tournamentHasEnded(event, now)) continue;
    const alreadyAligned = event.state === 'completed'
      && event.preparationState === 'not-applicable'
      && event.activationState === 'completed'
      && event.coverageActivated === false
      && event.runtimeState === 'stopped';
    if (alreadyAligned) continue;
    updateTournament(event.id, {
      state: 'completed',
      eligible: false,
      preparationState: 'not-applicable',
      preparationReason: 'Tournament date range has ended',
      nextPreparationAt: null,
      activationState: 'completed',
      activationReason: 'Tournament date range has ended',
      coverageActivated: false,
      runtimeState: 'stopped',
      lifecycleAlignedAt: new Date(now).toISOString()
    });
    aligned++;
  }
  if (aligned) console.log(`[Lifecycle] Aligned ${aligned} completed tournament${aligned === 1 ? '' : 's'} and stopped scheduled coverage.`);
  return aligned;
}
