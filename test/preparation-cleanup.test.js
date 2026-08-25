import test from 'node:test';
import assert from 'node:assert/strict';
import { preparationDecision } from '../src/tournaments/preparationRules.js';

const now=Date.parse('2026-08-23T12:00:00Z');

test('configured active event with fallback participants is ready to prepare',()=>{
  const event={state:'active',startDate:'2026-08-13',score:100,leagueId:'19719',participants:[{teamId:'1',name:'A'},{teamId:'2',name:'B'}]};
  assert.equal(preparationDecision(event,now).eligible,true);
});

test('completed event is terminal not-applicable',()=>{
  assert.equal(preparationDecision({state:'completed',startDate:'2026-07-30',score:65},now).state,'not-applicable');
});
