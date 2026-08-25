import { config } from '../config.js';
import { fetchJson } from '../utils.js';
import { getOpenDotaMatch, getVerifiedSeriesContext, normalizeOpenDotaMatch } from './opendota.js';
import { normalizeSeriesFormat, seriesProgress } from '../seriesFormat.js';
export async function getTiLiveGames() {
  if (!config.steamApiKey) return [];
  const url = new URL('https://api.steampowered.com/IDOTA2Match_570/GetLiveLeagueGames/v1/');
  url.searchParams.set('key', config.steamApiKey);
  url.searchParams.set('league_id', config.tiLeagueId);
  const data = await fetchJson(url);
  return (data?.result?.games || []).filter((game) => String(game.league_id) === config.tiLeagueId);
}
export async function getMatchDetails(matchId) {
  const url = new URL('https://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/v1/');
  url.searchParams.set('key', config.steamApiKey);
  url.searchParams.set('match_id', String(matchId));
  const data = await fetchJson(url);
  return data?.result || null;
}
export function simplifyLiveGame(game) {
  const board=game.scoreboard||{};
  const radiantPlayers=board.radiant?.players||[];
  const direPlayers=board.dire?.players||[];
  const worth=(players)=>players.reduce((sum,p)=>sum+Number(p.net_worth??p.gold??0),0);
  const topFarmers=[
    ...radiantPlayers.map(p=>({...p,side:'Radiant'})),
    ...direPlayers.map(p=>({...p,side:'Dire'}))
  ].sort((a,b)=>Number(b.net_worth??b.gold??0)-Number(a.net_worth??a.gold??0)).slice(0,3).map(p=>({
    name:p.name||p.personaname||null,
    accountId:p.account_id!==undefined&&p.account_id!==null?String(p.account_id):null,
    heroId:p.hero_id??null,
    netWorth:Number(p.net_worth??p.gold??0),
    side:p.side
  }));
  const lineup=(players)=>players.map(p=>({
    name:p.name||p.personaname||null,
    accountId:p.account_id!==undefined&&p.account_id!==null?String(p.account_id):null,
    heroId:p.hero_id??null,
    netWorth:Number(p.net_worth??p.gold??0)
  }));
  return {
    matchId:String(game.match_id),leagueId:String(game.league_id||''),
    radiant:game.team_name_radiant||game.radiant_team?.team_name||'Radiant',
    dire:game.team_name_dire||game.dire_team?.team_name||'Dire',
    seriesId:game.series_id?String(game.series_id):null,seriesType:game.series_type??null,
    seriesFormat:normalizeSeriesFormat({seriesType:game.series_type}),
    radiantSeriesWins:Number(game.radiant_series_wins??game.series_score_radiant??0),
    direSeriesWins:Number(game.dire_series_wins??game.series_score_dire??0),
    radiantScore:board.radiant?.score??0,direScore:board.dire?.score??0,
    gameTime:Number(board.duration??game.delay??0),
    radiantNetWorth:worth(radiantPlayers),direNetWorth:worth(direPlayers),topFarmers,
    radiantLineup:lineup(radiantPlayers),direLineup:lineup(direPlayers),
    seriesProgress:seriesProgress({scoreA:Number(game.radiant_series_wins??game.series_score_radiant??0),scoreB:Number(game.dire_series_wins??game.series_score_dire??0),format:normalizeSeriesFormat({seriesType:game.series_type})}),
    lastSeenAt:Date.now(),missingPolls:0,status:'active'
  };
}

export async function getRichMatchDetails(matchId) {
  try {
    const valve = await getMatchDetails(matchId);
    if (valve && typeof valve.radiant_win === 'boolean') {
      try { return await normalizeOpenDotaMatch(await getOpenDotaMatch(matchId)); }
      catch { return {
        matchId:String(matchId), radiant:valve.radiant_name||'Radiant', dire:valve.dire_name||'Dire', radiantWin:Boolean(valve.radiant_win),
        radiantScore:valve.radiant_score??0,direScore:valve.dire_score??0,duration:valve.duration??0,seriesId:valve.series_id?String(valve.series_id):null,
        top:null,radiantDraft:[],direDraft:[],largestLead:null
      }; }
    }
  } catch (error) {
    if (!String(error.message).includes('HTTP 500')) console.warn(`Valve details failed for ${matchId}: ${error.message}`);
  }
  return await normalizeOpenDotaMatch(await getOpenDotaMatch(matchId));
}
export async function getRecentTiMatches(limit = 5) {
  if (!config.steamApiKey) return [];
  const url=new URL('https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/v1/');
  url.searchParams.set('key',config.steamApiKey);url.searchParams.set('league_id',config.tiLeagueId);url.searchParams.set('matches_requested',String(Math.max(limit,10)));
  const data=await fetchJson(url);const result=[];
  for(const item of (data?.result?.matches||[]).slice(0,limit)){
    try{result.push(await getRichMatchDetails(item.match_id));}
    catch(error){console.warn(`Match ${item.match_id} is not ready from Valve or OpenDota: ${error.message}`);}
  }
  return result;
}

export async function getVerifiedMatchAndSeries(matchId) {
  const match = await getRichMatchDetails(matchId);
  let series = null;
  try { series = await getVerifiedSeriesContext(match); }
  catch (error) { console.warn(`Series ${match.seriesId || 'unknown'} is not fully available from OpenDota yet: ${error.message}`); }
  return { match, series };
}
