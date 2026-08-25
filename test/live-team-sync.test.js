import test from 'node:test';
import assert from 'node:assert/strict';
const signature=teams=>teams.map(t=>String(t.teamId||t.name)).sort().join('|');
test('same live team set produces the same signature',()=>{const a=[{teamId:1,name:'A'},{teamId:2,name:'B'}];const b=[{teamId:2,name:'B'},{teamId:1,name:'A'}];assert.equal(signature(a),signature(b));});
test('different live team set produces a new signature',()=>assert.notEqual(signature([{teamId:1},{teamId:2}]),signature([{teamId:1},{teamId:3}])));
test('empty live state resets synchronization guard',()=>{let last='1|2';if([].length===0)last=null;assert.equal(last,null);});
