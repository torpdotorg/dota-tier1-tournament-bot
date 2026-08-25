import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/tournaments/structureViews.js',import.meta.url),'utf8');
test('bracket presentation groups matches by round',()=>{assert.match(source,/groupedBracketDescription/);assert.match(source,/round\.toUpperCase\(\)/);assert.match(source,/Match \$\{index \+ 1\}/);});
test('capabilities distinguish participant slots from named teams',()=>{assert.match(source,/Participant slots/);assert.match(source,/Awaiting publication • Team names/);assert.match(source,/Named bracket pairings/);});
test('participant summary reports invited and qualifier slots',()=>{assert.match(source,/invited/);assert.match(source,/qualifier slots/);});
