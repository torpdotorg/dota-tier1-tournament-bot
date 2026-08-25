import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLiquipediaStructure } from '../src/tournaments/workers/liquipediaStructureAdapter.js';

test('legacy compact infobox metadata remains supported', () => {
  const html = `<div class="fo-nttax-infobox"><div class="infobox-cell-2">Format : Double Elimination</div><div class="infobox-cell-2">Participants: 8</div></div>`;
  const result = parseLiquipediaStructure(html, { id:'x', name:'X', liquipediaPage:'X' });
  assert.equal(result.format, 'Double Elimination');
  assert.equal(result.participantCount, 8);
});

test('legacy team and matchlist fixture remains supported', () => {
  const html = `<div class="team-template"><a href="/dota2/Alpha">Alpha</a></div><div class="team-template"><a href="/dota2/Beta">Beta</a></div><div class="brkts-matchlist"><a href="/dota2/Alpha">Alpha</a><a href="/dota2/Beta">Beta</a></div>`;
  const result = parseLiquipediaStructure(html, { id:'event', name:'Event', liquipediaPage:'Event' });
  assert.deepEqual(result.teams.map(team => team.name), ['Alpha', 'Beta']);
  assert.deepEqual(result.bracket[0].teams, ['Alpha', 'Beta']);
});
