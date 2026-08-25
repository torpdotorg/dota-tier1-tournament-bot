import test from 'node:test';
import assert from 'node:assert/strict';
import { tournamentHasEnded } from '../src/tournaments/lifecycleAlignment.js';

test('tournament is not complete during its final UTC date', () => {
  assert.equal(tournamentHasEnded({ startDate:'2026-08-13', endDate:'2026-08-23' }, Date.parse('2026-08-23T12:00:00Z')), false);
});

test('tournament is complete after final UTC date', () => {
  assert.equal(tournamentHasEnded({ startDate:'2026-08-13', endDate:'2026-08-23' }, Date.parse('2026-08-24T00:00:00Z')), true);
});

test('missing dates do not falsely complete a tournament', () => {
  assert.equal(tournamentHasEnded({}, Date.now()), false);
});
