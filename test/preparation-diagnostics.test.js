import test from 'node:test';
import assert from 'node:assert/strict';
import { latestPreparedTournament } from '../src/tournaments/preparationService.js';
import { formatPreparationAge } from '../src/diagnostics.js';

test('latest prepared tournament is derived from persisted catalog metadata', () => {
  const latest = latestPreparedTournament([
    { name: 'Older Event', preparationState: 'ready', lastPreparedAt: '2026-08-20T10:00:00.000Z' },
    { name: 'Current Event', preparationState: 'ready', lastPreparedAt: '2026-08-24T10:00:00.000Z' },
    { name: 'Waiting Event', preparationState: 'awaiting-teams', lastPreparedAt: '2026-08-25T10:00:00.000Z' }
  ]);
  assert.equal(latest.name, 'Current Event');
});

test('preparation age is formatted for diagnostics', () => {
  const now = Date.parse('2026-08-24T12:15:00.000Z');
  assert.equal(formatPreparationAge('2026-08-24T10:00:00.000Z', now), '2h 15m');
  assert.equal(formatPreparationAge(null, now), 'not available');
});
