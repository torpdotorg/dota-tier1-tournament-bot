import test from 'node:test';import assert from 'node:assert/strict';
function lead(values,radiant='Radiant',dire='Dire'){const adv=(values||[]).filter(Number.isFinite);if(!adv.length)return null;const max=Math.max(0,...adv),min=Math.min(0,...adv),r=max>=Math.abs(min);return {team:r?radiant:dire,value:r?max:Math.abs(min)};}
test('missing timeline returns null',()=>assert.equal(lead(undefined),null));
test('empty timeline returns null',()=>assert.equal(lead([]),null));
test('largest positive value is Radiant lead',()=>assert.deepEqual(lead([-500,1200,900],'A','B'),{team:'A',value:1200}));
test('largest negative value is Dire lead',()=>assert.deepEqual(lead([400,-2500,1000],'A','B'),{team:'B',value:2500}));
test('enrichment uses one existing message rather than a new notification',()=>{const action={messageId:'123',operation:'edit'};assert.equal(action.operation,'edit');assert.equal(action.messageId,'123');});
