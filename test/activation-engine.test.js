import test from 'node:test';
import assert from 'node:assert/strict';
import { activationDecision } from '../src/tournaments/activationRules.js';

const base = {
  name: 'Tier 1 Event', eventType: 'main', state: 'upcoming', preparationState: 'ready',
  score: 90, leagueId: '123', hasSchedule: true, preparedTeamCount: 16,
  startDate: '2026-09-10', endDate: '2026-09-20'
};

test('prepared tournament activates inside 48 hour window', () => {
  const now = Date.parse('2026-09-09T00:00:00Z');
  assert.equal(activationDecision(base, now).state, 'active-coverage');
});

test('prepared tournament waits outside activation window', () => {
  const now = Date.parse('2026-09-01T00:00:00Z');
  assert.equal(activationDecision(base, now).state, 'ready-outside-window');
});

test('unprepared tournament cannot activate', () => {
  const now = Date.parse('2026-09-09T00:00:00Z');
  assert.equal(activationDecision({ ...base, preparationState: 'awaiting-teams' }, now).state, 'waiting-preparation');
});

test('completed tournament becomes terminal', () => {
  const now = Date.parse('2026-09-21T00:00:00Z');
  assert.equal(activationDecision(base, now).state, 'completed');
});

test('low-confidence event remains blocked', () => {
  const now = Date.parse('2026-09-09T00:00:00Z');
  assert.equal(activationDecision({ ...base, score: 65 }, now).state, 'blocked-confidence');
});
