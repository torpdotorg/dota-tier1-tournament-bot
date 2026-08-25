import test from 'node:test';import assert from 'node:assert/strict';
const complete=(x,w=2)=>Boolean(x)&&Math.max(x.sa,x.sb)>=w;
const select=(local,base,w=2)=>complete(local,w)?local:complete(base,w)?base:local||base||null;
test('completed baseline beats partial local score',()=>assert.deepEqual(select({sa:0,sb:1},{sa:0,sb:2}),{sa:0,sb:2}));
test('completed local score beats baseline',()=>assert.deepEqual(select({sa:2,sb:0},{sa:1,sb:2}),{sa:2,sb:0}));
test('lower bracket topology crosses upper semifinal losers',()=>{const slots={ubSemi1Loser:'Team Spirit',ubSemi2Loser:'Nigma Galaxy',lbR1aWinner:'BoomBoys',lbR1bWinner:'Team Liquid'};assert.deepEqual([slots.ubSemi2Loser,slots.lbR1aWinner],['Nigma Galaxy','BoomBoys']);assert.deepEqual([slots.ubSemi1Loser,slots.lbR1bWinner],['Team Spirit','Team Liquid']);});
