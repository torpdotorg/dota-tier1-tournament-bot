import test from 'node:test';
import assert from 'node:assert/strict';
import { coverageRuntimeDescriptor, tournamentMessageKey } from '../src/tournaments/coverageRuntime.js';

test('configured activated event receives a running runtime', () => {
  const result = coverageRuntimeDescriptor({ id:'ti-2026', name:'TI 2026', coverage:'configured', activationState:'active-coverage', leagueId:'19719' });
  assert.equal(result.state, 'running');
  assert.equal(result.messageNamespace, 'tournament:ti-2026');
});

test('non-configured activated event waits for generic provider adapter', () => {
  const result = coverageRuntimeDescriptor({ id:'pgl-s9', name:'PGL S9', activationState:'active-coverage', leagueId:'20000' });
  assert.equal(result.state, 'waiting-adapter');
});

test('inactive event does not receive a runtime', () => {
  const result = coverageRuntimeDescriptor({ id:'blast', name:'BLAST', activationState:'ready-outside-window' });
  assert.equal(result.state, 'inactive');
});

test('message keys are tournament scoped', () => {
  assert.equal(tournamentMessageKey('pgl-s9','series','42'), 'tournament:pgl-s9:series:42');
});
