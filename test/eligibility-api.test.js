import test from 'node:test';
import assert from 'node:assert/strict';
import { eventType, withinDiscoveryHorizon, scoreTournament, classifyTournament } from '../src/tournaments/eligibility.js';

test('exports complete eligibility API', () => {
  assert.equal(typeof eventType, 'function');
  assert.equal(typeof withinDiscoveryHorizon, 'function');
  assert.equal(typeof scoreTournament, 'function');
  assert.equal(typeof classifyTournament, 'function');
});

test('current Tier 1 event is active', () => {
  const now = Date.parse('2026-08-23T12:00:00Z');
  const result = classifyTournament({ name:'Major', startDate:'2026-08-13', endDate:'2026-08-23', verifiedTierOne:true }, { hasSchedule:true }, now);
  assert.equal(result.state, 'active');
});

test('linked qualifier is accepted as upcoming', () => {
  const now = Date.parse('2026-08-23T12:00:00Z');
  const result = classifyTournament({ name:'Major: Europe Qualifier', startDate:'2026-09-01', endDate:'2026-09-02', parentTournamentId:'main', verifiedTierOneChild:true }, { hasSchedule:true }, now);
  assert.equal(result.state, 'upcoming');
});
