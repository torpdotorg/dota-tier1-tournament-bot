import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
test('platform receives preparation readiness',()=>{assert.match(source,/preparationSummary/);assert.match(source,/preparation:preparationSummary\(\)/);});
test('generic runtime remains intact',()=>{assert.match(source,/ValveTournamentAdapter/);assert.doesNotMatch(source,/ConfiguredTournamentAdapter|startScheduler|tiLeagueId/);});
