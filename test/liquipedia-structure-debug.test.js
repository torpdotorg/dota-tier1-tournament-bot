import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLiquipediaStructure } from '../src/tournaments/workers/liquipediaStructureAdapter.js';

const html = `<div class="fo-nttax-infobox"><div class="infobox-cell-2">Format : Double Elimination</div><div class="infobox-cell-2">Participants: 8</div></div><h2>Closed Qualifier</h2><div class="team-template"><a href="/dota2/Alpha">Alpha</a></div><div class="brkts-matchlist"><a href="/dota2/Alpha">Alpha</a><a href="/dota2/Beta">Beta</a></div>`;

test('cleans metadata and captures participant fallback', () => {
  const result=parseLiquipediaStructure(html,{id:'x',name:'X',liquipediaPage:'X'});
  assert.equal(result.format,'Double Elimination');
  assert.equal(result.participantCount,8);
  assert.equal(result.diagnostics.pageFound,true);
  assert.ok(result.diagnostics.htmlBytes>0);
});

test('reports extraction diagnostics', () => {
  const result=parseLiquipediaStructure('<h2>Playoffs</h2>',{id:'x'});
  assert.equal(result.diagnostics.teamsParsed,0);
  assert.equal(result.diagnostics.bracketMatchesParsed,0);
  assert.equal(result.capabilities.bracket,false);
});
