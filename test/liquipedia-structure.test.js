import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLiquipediaStructure, LiquipediaStructureAdapter } from '../src/tournaments/workers/liquipediaStructureAdapter.js';

const html = `<div class="infobox-cell-2">Format Double Elimination</div><h2>Playoffs</h2><div class="team-template"><a href="/dota2/Alpha">Alpha</a></div><div class="team-template"><a href="/dota2/Beta">Beta</a></div><div class="brkts-matchlist"><a href="/dota2/Alpha">Alpha</a><a href="/dota2/Beta">Beta</a></div>`;

test('parses verified teams and bracket pairs from structure HTML', () => {
  const result = parseLiquipediaStructure(html,{id:'event',name:'Event',liquipediaPage:'Event'});
  assert.deepEqual(result.teams.map(x=>x.name),['Alpha','Beta']);
  assert.deepEqual(result.bracket[0].teams,['Alpha','Beta']);
  assert.equal(result.capabilities.bracket,true);
});

test('adapter supports catalog rows with Liquipedia page identifiers', () => {
  const adapter = new LiquipediaStructureAdapter({liquipediaUserAgent:'test'});
  assert.equal(adapter.supports({liquipediaPage:'BLAST/SLAM/8/China'}),true);
  assert.equal(adapter.supports({}),false);
});
