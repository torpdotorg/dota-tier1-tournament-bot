import test from 'node:test';
import assert from 'node:assert/strict';

function shouldSkip(event,{force=false}={}){
  const participantCount=Array.isArray(event.participants)?event.participants.filter(team=>team?.teamId&&team?.name).length:0;
  const preparedTeamCount=Number(event.preparedTeamCount||0);
  return !force&&event.preparationState==='ready'&&preparedTeamCount>0&&(participantCount===0||preparedTeamCount>=participantCount);
}

test('skips ready event without catalog participants',()=>assert.equal(shouldSkip({preparationState:'ready',preparedTeamCount:16}),true));
test('skips matching participant set',()=>assert.equal(shouldSkip({preparationState:'ready',preparedTeamCount:16,participants:Array.from({length:16},(_,i)=>({teamId:String(i),name:`Team ${i}`}))}),true));
test('re-prepares expanded participant set',()=>assert.equal(shouldSkip({preparationState:'ready',preparedTeamCount:16,participants:Array.from({length:18},(_,i)=>({teamId:String(i),name:`Team ${i}`}))}),false));
test('force bypasses skip',()=>assert.equal(shouldSkip({preparationState:'ready',preparedTeamCount:16},{force:true}),false));
