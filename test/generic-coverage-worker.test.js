import test from 'node:test';
import assert from 'node:assert/strict';
import { clearTournamentAdapters, registerTournamentAdapter, resolveTournamentAdapter } from '../src/tournaments/workers/adapterRegistry.js';
import { FixtureTournamentAdapter } from '../src/tournaments/workers/fixtureAdapter.js';
import { CoverageWorker } from '../src/tournaments/workers/coverageWorker.js';

const event = { id:'fixture-cup', name:'Fixture Cup', activationState:'active-coverage' };
const fixture = { 'fixture-cup': { schedule:[{ id:'series-1' }], liveGames:[], results:[] } };

test('adapter registry resolves a tournament-specific provider', () => {
  clearTournamentAdapters();
  const adapter = registerTournamentAdapter(new FixtureTournamentAdapter(fixture));
  assert.equal(resolveTournamentAdapter(event), adapter);
});

test('generic worker starts in observation mode without public posting', async () => {
  const adapter = new FixtureTournamentAdapter(fixture);
  const worker = new CoverageWorker({ context:event, adapter, publish:false });
  const status = await worker.start();
  assert.equal(status.state, 'observing');
  assert.equal(status.publish, false);
});

test('generic worker uses tournament-scoped message keys', () => {
  const worker = new CoverageWorker({ context:event, adapter:new FixtureTournamentAdapter(fixture), publish:false });
  assert.equal(worker.key('series','series-1'), 'tournament:fixture-cup:series:series-1');
});

test('generic worker degrades safely on provider failure', async () => {
  const adapter = new FixtureTournamentAdapter(fixture);
  adapter.getLiveGames = async () => { throw new Error('provider timeout'); };
  const worker = new CoverageWorker({ context:event, adapter, publish:false });
  await worker.start();
  const status = await worker.poll();
  assert.equal(status.state, 'degraded');
  assert.equal(status.lastError, 'provider timeout');
});
