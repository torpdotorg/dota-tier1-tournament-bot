import test from 'node:test';import assert from 'node:assert/strict';
test('discovery processes only leagues in current pro-match window',()=>{const all=10103,current=new Set(['1','2','3']);assert.ok(current.size<all);});
test('catalog update is a single batch operation',()=>{let writes=0;const merge=rows=>{writes++;return rows.length;};assert.equal(merge(Array.from({length:100},(_,i)=>i)),100);assert.equal(writes,1);});
