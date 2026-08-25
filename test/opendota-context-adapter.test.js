import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOpenDotaSeries, OpenDotaTournamentAdapter } from '../src/tournaments/workers/openDotaTournamentAdapter.js';

test('normalizes OpenDota professional match into tournament context', () => {
  const result = normalizeOpenDotaSeries({ match_id:123, leagueid:77, start_time:1787600000, radiant_team_id:1, dire_team_id:2, radiant_name:'Alpha', dire_name:'Beta', radiant_win:true, duration:2400 });
  assert.equal(result.id, '123');
  assert.equal(result.leagueId, '77');
  assert.deepEqual(result.teams, ['Alpha','Beta']);
  assert.equal(result.status, 'completed');
});

test('contextual adapter supports non-configured events with a league ID', () => {
  const adapter = new OpenDotaTournamentAdapter();
  assert.equal(adapter.supports({ leagueId:'77', coverage:'automatic' }), true);
  assert.equal(adapter.supports({ leagueId:'77', coverage:'configured' }), false);
  assert.equal(adapter.supports({ coverage:'automatic' }), false);
});
