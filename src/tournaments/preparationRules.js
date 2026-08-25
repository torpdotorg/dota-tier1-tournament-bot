const DAY=86_400_000;
function daysUntil(value,now=Date.now()){const time=Date.parse(`${value||''}T00:00:00Z`);return Number.isFinite(time)?Math.ceil((time-now)/DAY):null;}
export function preparationDecision(event,now=Date.now()){
  if(!['upcoming','active'].includes(event.state))return{eligible:false,state:'not-applicable',reason:'Tournament is not upcoming or active'};
  const until=daysUntil(event.startDate,now);
  if(event.state==='upcoming'&&(until===null||until>45))return{eligible:false,state:'scheduled',reason:'Preparation begins 45 days before start',daysUntil:until};
  if(Number(event.score||0)<60)return{eligible:false,state:'monitoring',reason:'Confidence below preparation threshold',daysUntil:until};
  if(!event.leagueId)return{eligible:false,state:'awaiting-provider-id',reason:'Waiting for Valve/OpenDota league ID',daysUntil:until};
  if(!Array.isArray(event.participants)||event.participants.length<2)return{eligible:false,state:'awaiting-teams',reason:'Waiting for participant data',daysUntil:until};
  return{eligible:true,state:'preparing',reason:'Provider identity and teams available',daysUntil:until};
}
