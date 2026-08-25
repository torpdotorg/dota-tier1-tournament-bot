import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readCatalog,
  writeCatalog,
  normalizedTournamentName,
  mergeAndPruneTournaments,
  listTournaments
} from '../src/tournaments/catalog.js';

test('exports complete catalog API', () => {
  assert.equal(typeof readCatalog, 'function');
  assert.equal(typeof writeCatalog, 'function');
  assert.equal(typeof normalizedTournamentName, 'function');
  assert.equal(typeof mergeAndPruneTournaments, 'function');
  assert.equal(typeof listTournaments, 'function');
});

test('normalizes TI aliases', () => {
  assert.equal(normalizedTournamentName('The International 2026'), normalizedTournamentName('TI 2026'));
});
