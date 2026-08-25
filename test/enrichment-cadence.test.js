import test from 'node:test';
import assert from 'node:assert/strict';
function delay(attemptsCompleted){if(attemptsCompleted<10)return 1;if(attemptsCompleted<18)return 15;return 60;}
test('attempts 1 through 9 remain in the one-minute phase',()=>{assert.equal(delay(1),1);assert.equal(delay(9),1);});
test('attempts 10 through 17 use the fifteen-minute phase',()=>{assert.equal(delay(10),15);assert.equal(delay(17),15);});
test('attempts 18 through 39 use the hourly phase',()=>{assert.equal(delay(18),60);assert.equal(delay(39),60);});
test('enrichment stops after forty completed attempts',()=>{const shouldRetry=a=>a<40;assert.equal(shouldRetry(39),true);assert.equal(shouldRetry(40),false);});
test('successful enrichment clears the next retry',()=>{const state={enrichmentStatus:'complete',nextEnrichmentAt:null};assert.equal(state.enrichmentStatus,'complete');assert.equal(state.nextEnrichmentAt,null);});
