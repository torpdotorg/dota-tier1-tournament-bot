import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSimulationFixture, simulateTournamentLifecycle, simulationStages } from '../src/tournaments/simulationEngine.js';

test('simulation fixture is a prepared Tier 1 event inside activation window', () => {
  const fixture = buildSimulationFixture(Date.parse('2026-08-24T12:00:00Z'));
  assert.equal(fixture.event.verifiedTierOne, true);
  assert.equal(fixture.event.preparationState, 'ready');
  assert.equal(fixture.event.participants.length, 8);
});

test('full tournament lifecycle completes without public messages', async () => {
  const result = await simulateTournamentLifecycle({ now: Date.parse('2026-08-24T12:00:00Z') });
  assert.equal(result.status, 'passed');
  assert.equal(result.publicMessages, 0);
  assert.equal(result.finalWorkerState, 'stopped');
  assert.deepEqual(result.stages.map(row => row.stage), simulationStages);
});

test('simulation produces tournament-scoped result state', async () => {
  const result = await simulateTournamentLifecycle({ now: Date.parse('2026-08-24T12:00:00Z') });
  const completed = result.stages.find(row => row.stage === 'series-completed');
  assert.equal(completed.resultKey, 'tournament:simulation-tier1-cup:result:simulation-game-1');
});
