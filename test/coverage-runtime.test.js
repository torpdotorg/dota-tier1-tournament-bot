import test from'node:test';import assert from'node:assert/strict';import{coverageRuntimeDescriptor,tournamentMessageKey}from'../src/tournaments/coverageRuntime.js';
test('any activated tournament receives a generic running runtime',()=>{const result=coverageRuntimeDescriptor({id:'pgl-s9',name:'PGL S9',activationState:'active-coverage',leagueId:'20000'});assert.equal(result.state,'running');assert.equal(result.messageNamespace,'tournament:pgl-s9');});
test('inactive event receives no runtime',()=>assert.equal(coverageRuntimeDescriptor({id:'blast',name:'BLAST',activationState:'ready-outside-window'}).state,'inactive'));
test('message keys are tournament scoped',()=>assert.equal(tournamentMessageKey('pgl-s9','series','42'),'tournament:pgl-s9:series:42'));
