import { fetchJson } from '../utils.js';
import { normalizeSeriesFormat, seriesProgress } from '../seriesFormat.js';
const base='https://api.opendota.com/api';
let heroCache={expires:0,value:{}};
export async function getOpenDotaMatch(matchId){return await fetchJson(`${base}/matches/${matchId}`,{},20000);}
export async function heroNames(){
 if(heroCache.expires>Date.now())return heroCache.value;
 const data=await fetchJson(`${base}/constants/heroes`,{},15000);
 const map={}; for(const [id,h] of Object.entries(data||{})) map[String(id)]=h.localized_name||h.name||`Hero ${id}`;
 heroCache={value:map,expires:Date.now()+86400000}; return map;
}
function playerName(p){return p.name||p.personaname||`Player ${p.player_slot??''}`.trim();}
export async function normalizeOpenDotaMatch(data){
 const heroes=await heroNames();
 const radiant=data.radiant_team?.name||data.radiant_name||'Radiant';
 const dire=data.dire_team?.name||data.dire_name||'Dire';
 const players=Array.isArray(data.players)?data.players:[];
 const top=players.slice().sort((a,b)=>{
  const score=x=>(Number(x.kills||0)*2)+Number(x.assists||0)-Number(x.deaths||0)+(Number(x.gold_per_min||0)/100);
  return score(b)-score(a);
 })[0]||null;
 const picks=(side)=>{
  const fromDraft=(data.picks_bans||[]).filter(x=>x.is_pick&&Number(x.team)===side).sort((a,b)=>a.order-b.order).map(x=>heroes[String(x.hero_id)]||`Hero ${x.hero_id}`);
  if(fromDraft.length)return fromDraft;
  return players.filter(p=>side===0?Number(p.player_slot)<128:Number(p.player_slot)>=128).map(p=>heroes[String(p.hero_id)]||`Hero ${p.hero_id}`).slice(0,5);
 };
 const adv=Array.isArray(data.radiant_gold_adv)?data.radiant_gold_adv.filter(Number.isFinite):[];
 const hasGoldTimeline=adv.length>0;
 const max=hasGoldTimeline?Math.max(0,...adv):0,min=hasGoldTimeline?Math.min(0,...adv):0;
 const radiantLead=max>=Math.abs(min);
 const largestLead=hasGoldTimeline?{team:radiantLead?radiant:dire,value:radiantLead?max:Math.abs(min)}:null;
 return {
  matchId:String(data.match_id),leagueId:String(data.leagueid||''),seriesId:data.series_id?String(data.series_id):null,seriesType:data.series_type,seriesFormat:normalizeSeriesFormat({seriesType:data.series_type}),
  radiant,dire,radiantWin:Boolean(data.radiant_win),radiantScore:data.radiant_score??0,direScore:data.dire_score??0,duration:data.duration??0,
  top:top?{name:playerName(top),kills:top.kills??0,deaths:top.deaths??0,assists:top.assists??0,gpm:top.gold_per_min??0,xpm:top.xp_per_min??0}:null,
  radiantDraft:picks(0),direDraft:picks(1),largestLead,replayParsed:hasGoldTimeline,missingData:hasGoldTimeline?[]:['radiant_gold_adv']
 };
}

export async function getVerifiedSeriesContext(current) {
  if (!current?.seriesId) return null;
  const proMatches = await fetchJson(`${base}/proMatches`, {}, 20000);
  const sameSeries = (Array.isArray(proMatches) ? proMatches : []).filter((match) =>
    String(match.series_id || '') === String(current.seriesId) &&
    String(match.leagueid || '') === String(current.leagueId || match.leagueid || '')
  );

  // OpenDota's proMatches feed may lag briefly. Always merge the just-finished
  // game, while de-duplicating by match ID.
  const games = new Map(sameSeries.map((match) => [String(match.match_id), match]));
  games.set(String(current.matchId), {
    match_id: current.matchId,
    radiant_name: current.radiant,
    dire_name: current.dire,
    radiant_win: current.radiantWin,
    series_id: current.seriesId,
    series_type: current.seriesType,
    leagueid: current.leagueId
  });

  const clean = (name) => String(name || '').replace(/\s+/g, ' ').trim();
  const teamA = clean(current.radiant);
  const teamB = clean(current.dire);
  const score = { [teamA]: 0, [teamB]: 0 };
  const ordered = [...games.values()].sort((a, b) => Number(a.match_id) - Number(b.match_id));

  for (const game of ordered) {
    const radiant = clean(game.radiant_name || game.radiant_team?.name);
    const dire = clean(game.dire_name || game.dire_team?.name);
    if (!radiant || !dire || ![radiant, dire].every((name) => name === teamA || name === teamB)) continue;
    const winner = game.radiant_win ? radiant : dire;
    if (score[winner] !== undefined) score[winner] += 1;
  }

  const seriesType = Number(current.seriesType ?? ordered[0]?.series_type ?? 1);
  const format = normalizeSeriesFormat({ bestOf: current.seriesFormat?.bestOf, seriesType });
  const gameNumber = score[teamA] + score[teamB];
  const progress = seriesProgress({ scoreA: score[teamA], scoreB: score[teamB], gameNumber, format });
  const complete = progress.complete;
  const winner = complete && score[teamA] !== score[teamB] ? (score[teamA] > score[teamB] ? teamA : teamB) : null;
  return { teamA, teamB, scoreA: score[teamA], scoreB: score[teamB], gameNumber, winsNeeded: format.winsNeeded, complete, winner, verifiedGames: gameNumber, format, progress };
}

let proPlayerCache={expires:0,value:{}};
export async function proPlayerNames(){
 if(proPlayerCache.expires>Date.now())return proPlayerCache.value;
 const data=await fetchJson(`${base}/proPlayers`,{},20000);
 const map={};
 for(const player of Array.isArray(data)?data:[]){
  if(player?.account_id===undefined||player?.account_id===null)continue;
  const name=String(player.name||player.personaname||'').trim();
  if(name)map[String(player.account_id)]=name;
 }
 proPlayerCache={value:map,expires:Date.now()+6*60*60*1000};
 return map;
}
