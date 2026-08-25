import test from 'node:test';
import assert from 'node:assert/strict';
import { participantSignature, shouldSkipPreparedTournament } from '../src/tournaments/preparationSkip.js';

const teams = count => Array.from({ length: count }, (_, index) => ({ teamId: String(index + 1), name: `Team ${index + 1}` }));

test('ready tournament with the same participant identities is skipped', () => {
  const participants = teams(16);
  const event = { preparationState: 'ready', participants, preparedTeamCount: 16, preparedParticipantSignature: participantSignature(participants) };
  assert.equal(shouldSkipPreparedTournament(event), true);
});

test('ready tournament with missing participant data is re-evaluated', () => {
  const event = { preparationState: 'ready', preparedTeamCount: 16, preparedParticipantSignature: '1|2', participants: [] };
  assert.equal(shouldSkipPreparedTournament(event), false);
});

test('same participant count with a replaced team triggers preparation', () => {
  const original = teams(16);
  const changed = [...original.slice(0, 15), { teamId: '99', name: 'Replacement' }];
  const event = { preparationState: 'ready', participants: changed, preparedTeamCount: 16, preparedParticipantSignature: participantSignature(original) };
  assert.equal(shouldSkipPreparedTournament(event), false);
});

test('participant order does not trigger unnecessary preparation', () => {
  const participants = teams(4);
  const event = { preparationState: 'ready', participants: [...participants].reverse(), preparedParticipantSignature: participantSignature(participants) };
  assert.equal(shouldSkipPreparedTournament(event), true);
});

test('legacy ready record without participant signature is prepared once', () => {
  const event = { preparationState: 'ready', participants: teams(16), preparedTeamCount: 16 };
  assert.equal(shouldSkipPreparedTournament(event), false);
});

test('force mode always re-evaluates preparation', () => {
  const participants = teams(2);
  const event = { preparationState: 'ready', participants, preparedParticipantSignature: participantSignature(participants) };
  assert.equal(shouldSkipPreparedTournament(event, { force: true }), false);
});
