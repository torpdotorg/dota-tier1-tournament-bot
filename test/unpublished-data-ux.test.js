import test from 'node:test';import assert from'node:assert/strict';import fs from'node:fs';
const structure=fs.readFileSync(new URL('../src/tournaments/structureViews.js',import.meta.url),'utf8');
const context=fs.readFileSync(new URL('../src/tournaments/contextCommandViews.js',import.meta.url),'utf8');
test('teams view summarizes unpublished participant slots',()=>{assert.match(structure,/participant slots are available/);assert.match(structure,/Team names have not yet been published/);});
test('bracket view summarizes all-TBD topology',()=>{assert.match(structure,/Bracket structure is available/);assert.match(structure,/Teams, seeding and named pairings have not yet been published/);});
test('next view distinguishes missing schedule publication',()=>{assert.match(context,/schedule has not yet been published/);assert.match(context,/compatible league ID and schedule/);});
