import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('legacy scheduler startup is guarded by tournament completion', () => {
  const source = fs.readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  assert.match(source, /if\(configuredTournamentIsComplete\(\)\)/);
  assert.match(source, /Legacy configured-tournament scheduler not started/);
});

test('platform status no longer identifies itself as TI Match Insights', () => {
  const source = fs.readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  assert.match(source, /Dota Tier 1 Tournament Platform is online/);
  assert.doesNotMatch(source, /TI Match Insights is online/);
});

test('legacy scheduler console wording is tournament-generic', () => {
  const source = fs.readFileSync(new URL('../src/scheduler.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Shanghai-session recaps/);
  assert.match(source, /Configured tournament scheduler started/);
});
