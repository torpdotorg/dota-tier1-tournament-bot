import test from 'node:test';
import assert from 'node:assert/strict';
import { setProviderHealth, providerHealthSummary } from '../src/tournaments/providerHealth.js';

test('provider health tracks independent provider states', () => {
  setProviderHealth('OpenDota', 'failed', 'timeout');
  setProviderHealth('Liquipedia', 'healthy');
  const map = new Map(providerHealthSummary().map(x => [x.name, x]));
  assert.equal(map.get('OpenDota').status, 'failed');
  assert.equal(map.get('Liquipedia').status, 'healthy');
});

test('provider recovery replaces failed state', () => {
  setProviderHealth('OpenDota', 'healthy');
  const state = providerHealthSummary().find(x => x.name === 'OpenDota');
  assert.equal(state.status, 'healthy');
});
