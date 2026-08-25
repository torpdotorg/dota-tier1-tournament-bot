import { activationDecision } from './activationRules.js';
import { participantSignature } from './preparationSkip.js';
import { coverageRuntimeDescriptor, tournamentMessageKey } from './coverageRuntime.js';
import { FixtureTournamentAdapter } from './workers/fixtureAdapter.js';
import { CoverageWorker } from './workers/coverageWorker.js';

export const simulationStages = [
  'discovered',
  'provider-identified',
  'teams-ready',
  'prepared',
  'activated',
  'worker-observing',
  'series-live',
  'series-completed',
  'tournament-completed'
];

export function buildSimulationFixture(now = Date.now()) {
  const start = new Date(now + 24 * 60 * 60 * 1000);
  const end = new Date(now + 3 * 24 * 60 * 60 * 1000);
  const isoDay = value => value.toISOString().slice(0, 10);
  const participants = Array.from({ length: 8 }, (_, index) => ({
    teamId: String(9000 + index),
    name: `Simulation Team ${index + 1}`
  }));
  const event = {
    id: 'simulation-tier1-cup',
    name: 'Simulation Tier 1 Cup',
    shortName: 'Simulation Cup',
    eventType: 'main',
    verifiedTierOne: true,
    coverage: 'automatic',
    state: 'upcoming',
    score: 95,
    leagueId: '99999',
    hasSchedule: true,
    startDate: isoDay(start),
    endDate: isoDay(end),
    participants,
    preparedTeamCount: participants.length,
    preparedParticipantSignature: participantSignature(participants),
    preparationState: 'ready'
  };
  const schedule = [{
    id: 'simulation-series-1',
    leagueId: event.leagueId,
    beginAt: new Date(now + 60 * 60 * 1000).toISOString(),
    teams: [participants[0].name, participants[1].name],
    teamIds: [participants[0].teamId, participants[1].teamId],
    bestOf: 3,
    stage: 'Upper Bracket Quarterfinal',
    status: 'scheduled'
  }];
  return { event, schedule, standings: [], liveGames: [], results: [] };
}

export async function simulateTournamentLifecycle({ now = Date.now() } = {}) {
  const fixture = buildSimulationFixture(now);
  const timeline = [];
  const push = (stage, details = {}) => timeline.push({ stage, at: new Date(now).toISOString(), ...details });

  push('discovered', { tournament: fixture.event.name });
  push('provider-identified', { leagueId: fixture.event.leagueId });
  push('teams-ready', { teams: fixture.event.participants.length });
  push('prepared', { participantSignature: fixture.event.preparedParticipantSignature });

  const activation = activationDecision(fixture.event, now);
  if (activation.state !== 'active-coverage') throw new Error(`Simulation activation failed: ${activation.state}`);
  fixture.event.activationState = activation.state;
  fixture.event.coverageActivated = true;
  push('activated', { activationState: activation.state });

  const runtime = coverageRuntimeDescriptor(fixture.event);
  push('worker-observing', { runtimeState: runtime.state, namespace: runtime.messageNamespace });

  const adapter = new FixtureTournamentAdapter({ [fixture.event.id]: fixture });
  const worker = new CoverageWorker({ context: fixture.event, adapter, publish: false });
  await worker.start();
  await worker.poll();

  fixture.liveGames = [{ ...fixture.schedule[0], matchId: 'simulation-game-1', status: 'live', gameNumber: 1 }];
  await worker.poll();
  push('series-live', { seriesId: fixture.schedule[0].id, publish: worker.publish });

  fixture.liveGames = [];
  fixture.results = [{ ...fixture.schedule[0], matchId: 'simulation-game-1', status: 'completed', winner: fixture.event.participants[0].name }];
  await worker.poll();
  push('series-completed', { resultKey: tournamentMessageKey(fixture.event.id, 'result', 'simulation-game-1') });

  worker.stop();
  fixture.event.state = 'completed';
  fixture.event.activationState = 'completed';
  push('tournament-completed', { workerState: worker.state });

  return {
    status: 'passed',
    tournament: fixture.event.name,
    stages: timeline,
    publicMessages: 0,
    finalWorkerState: worker.state
  };
}
