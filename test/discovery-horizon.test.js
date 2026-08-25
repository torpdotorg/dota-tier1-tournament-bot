import test from 'node:test';import assert from 'node:assert/strict';import {withinDiscoveryHorizon,classifyTournament} from '../src/tournaments/eligibility.js';
const now=Date.parse('2026-08-23T12:00:00Z');
test('historical tournament is outside horizon',()=>assert.equal(withinDiscoveryHorizon({startDate:'2014-01-01',endDate:'2014-01-05'},now),false));
test('current tournament is inside horizon',()=>assert.equal(withinDiscoveryHorizon({startDate:'2026-08-13',endDate:'2026-08-23'},now),true));
test('current event is active rather than upcoming',()=>assert.equal(classifyTournament({name:'Major',leagueId:'1',startDate:'2026-08-13',endDate:'2026-08-23'},{knownTeams:8,proMatches:20,hasSchedule:true,providerAgreement:2},now).state,'active'));
test('expired event is completed',()=>assert.equal(classifyTournament({name:'Major',leagueId:'1',startDate:'2026-07-01',endDate:'2026-07-05'},{knownTeams:8,proMatches:20,hasSchedule:true,providerAgreement:2},now).state,'completed'));
