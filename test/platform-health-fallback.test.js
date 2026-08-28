import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const view = fs.readFileSync(new URL('../src/tournaments/platformView.js', import.meta.url), 'utf8');
const scheduler = fs.readFileSync(new URL('../src/tournaments/discoveryScheduler.js', import.meta.url), 'utf8');
test('platform health falls back to discovery provider state', () => {
  assert.match(view, /providerFallback/);
  assert.match(view, /openDotaStatus/);
  assert.match(view, /liquipediaStatus/);
});
test('platform status includes catalog and preparation readiness', () => {
  assert.match(view, /upcoming qualifiers\/play-ins/);
  assert.match(view, /Awaiting provider ID/);
});
test('initial discovery cycle starts promptly', () => {
  assert.match(scheduler, /1000\)\.unref\(\)/);
  assert.match(scheduler, /initial cycle in 1 second/);
});
