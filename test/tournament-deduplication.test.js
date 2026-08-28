import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizedTournamentName
} from '../src/tournaments/catalog.js';

import {
  tournamentDiscoveryText
} from '../src/tournaments/presentation.js';

test('normalizes TI aliases', () => {
  assert.equal(
    normalizedTournamentName('The International 2026'),
    normalizedTournamentName('TI 2026')
  );
});

test('presentation groups states without legacy configured source', () => {
  const text = tournamentDiscoveryText({
    active: [
      {
        name: 'The International 2026',
        eventType: 'main',
        score: 100,
        startDate: '2026-08-13',
        sources: ['opendota', 'liquipedia']
      }
    ],
    upcoming: [],
    monitoring: [],
    completed: []
  });

  assert.match(text, /ACTIVE MAIN EVENTS/);
  assert.match(text, /OpenDota \+ Liquipedia/);
  assert.doesNotMatch(text, /Configured/i);
});