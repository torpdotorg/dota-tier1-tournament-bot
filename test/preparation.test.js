import test from'node:test';import assert from'node:assert/strict';import{preparationDecision}from'../src/tournaments/preparationRules.js';
const now=Date.parse('2026-08-23T12:00:00Z');
test('far future event is scheduled',()=>assert.equal(preparationDecision({state:'upcoming',startDate:'2026-11-17',score:100},now).state,'scheduled'));
test('upcoming event without provider ID waits',()=>assert.equal(preparationDecision({state:'upcoming',startDate:'2026-09-17',score:65},now).state,'awaiting-provider-id'));
test('event with provider but no teams waits',()=>assert.equal(preparationDecision({state:'upcoming',startDate:'2026-09-17',score:80,leagueId:'1'},now).state,'awaiting-teams'));
test('event with identity and teams is prepared',()=>assert.equal(preparationDecision({state:'upcoming',startDate:'2026-09-17',score:80,leagueId:'1',participants:[{teamId:'1',name:'A'},{teamId:'2',name:'B'}]},now).eligible,true));
