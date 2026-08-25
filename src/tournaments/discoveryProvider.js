import { fetchJson } from '../utils.js';
const API = 'https://api.opendota.com/api';
const day = value => { const n=Number(value); return Number.isFinite(n)&&n>0 ? new Date(n*1000).toISOString().slice(0,10) : null; };
export async function discoverOpenDotaLeagues(){
  const [leagues,matches]=await Promise.all([fetchJson(`${API}/leagues`,{},20000),fetchJson(`${API}/proMatches`,{},20000)]);
  const names=new Map((Array.isArray(leagues)?leagues:[]).map(x=>[String(x.leagueid||x.league_id||x.id||''),x]));
  const stats=new Map();
  for(const match of Array.isArray(matches)?matches:[]){
    const id=String(match.leagueid||'');if(!id)continue;
    const row=stats.get(id)||{times:[],teams:new Map(),matches:0};row.matches++;
    if(match.start_time)row.times.push(Number(match.start_time));
    if(match.radiant_team_id)row.teams.set(String(match.radiant_team_id),{teamId:String(match.radiant_team_id),name:match.radiant_name||`Team ${match.radiant_team_id}`});
    if(match.dire_team_id)row.teams.set(String(match.dire_team_id),{teamId:String(match.dire_team_id),name:match.dire_name||`Team ${match.dire_team_id}`});
    stats.set(id,row);
  }
  return [...stats.entries()].map(([leagueId,row])=>{row.times.sort((a,b)=>a-b);const league=names.get(leagueId)||{};return{id:`opendota-${leagueId}`,leagueId,name:String(league.name||`Dota League ${leagueId}`),tier:Number(league.tier||0)||null,startDate:day(row.times[0]),endDate:day(row.times.at(-1)),knownTeams:row.teams.size,participants:[...row.teams.values()],proMatches:row.matches,hasSchedule:false,providerAgreement:1,provider:'opendota',recentProfessionalActivity:true};});
}
