import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseLiquipediaStructure } from '../src/tournaments/workers/liquipediaStructureAdapter.js';
const html=fs.readFileSync(new URL('./fixtures/blast-slam-viii-china.html',import.meta.url),'utf8');
const result=parseLiquipediaStructure(html,{id:'liquipedia-blast-slam-viii-china-closed-qualifier',name:'BLAST SLAM VIII China Closed Qualifier',liquipediaPage:'BLAST/SLAM/8/China'});
test('real BLAST page yields factual infobox metadata',()=>{assert.equal(result.format,'Single-elimination');assert.equal(result.participantCount,8);assert.equal(result.location,'China');assert.equal(result.cacheSchema,2);});
test('real BLAST page yields participant slots without inventing names',()=>{assert.equal(result.participantSlots.length,8);assert.equal(result.teams.length,0);assert.equal(result.participantSlots.every(x=>x.name===null),true);});
test('real BLAST page yields bracket topology with TBD pairings',()=>{assert.deepEqual(result.stages,['Quarterfinals','Semifinals','Grand Final','Qualified']);assert.equal(result.bracket.length,7);assert.equal(result.bracket.every(x=>x.teams[0]==='TBD'&&x.teams[1]==='TBD'),true);assert.equal(result.capabilities.bracket,true);assert.equal(result.capabilities.bracketNamed,false);});
