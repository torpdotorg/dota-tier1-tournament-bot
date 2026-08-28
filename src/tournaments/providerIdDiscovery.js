import fs from 'node:fs';
import path from 'node:path';
import { coordinatedLiquipediaFetch, liquipediaRequestState } from './liquipediaRequestCoordinator.js';

const LIQUIPEDIA_API='https://liquipedia.net/dota2/api.php';
const STEAM_LEAGUES='https://api.steampowered.com/IDOTA2Match_570/GetLeagueListing/v1/';
const cacheFile=path.join(process.cwd(),'data','catalog','provider-id-liquipedia.json');
const MIN_REQUEST_GAP_MS=2500;
const MAX_LIVE_PAGES_PER_CYCLE=3;
const CACHE_MAX_AGE_MS=24*60*60*1000;
let liquipediaCooldownUntil=0;

function pageName(event){return String(event?.liquipediaPage||'').replace(/^\/+/, '').replace(/^dota2\//i,'');}
function readCache(){try{return JSON.parse(fs.readFileSync(cacheFile,'utf8'));}catch{return{version:1,pages:{}};}}
function writeCache(cache){fs.mkdirSync(path.dirname(cacheFile),{recursive:true});const temp=`${cacheFile}.tmp`;fs.writeFileSync(temp,JSON.stringify(cache,null,2));fs.renameSync(temp,cacheFile);}
async function fetchJson(url,options={},timeoutMs=20000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const response=await fetch(url,{...options,signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);return response.json();}finally{clearTimeout(timer);}}
export function extractLeagueHints(links=[],event={}){const patterns=[/opendota\.com\/leagues\/(\d+)/i,/api\.opendota\.com\/api\/leagues\/(\d+)/i,/[?&](?:league_id|leagueid)=(\d+)/i,/\/league\/(\d+)(?:\/|$)/i],rows=[];for(const link of links){for(const pattern of patterns){const id=String(link).match(pattern)?.[1];if(!id)continue;rows.push({id:`liquipedia-link-${id}`,leagueId:id,name:event.name,startDate:event.startDate,endDate:event.endDate,provider:'liquipedia-link',providerIdAuthoritative:true,providerIdEvidence:String(link)});break;}}return[...new Map(rows.map(row=>[row.leagueId,row])).values()];}
export async function discoverLiquipediaLeagueHints(events,config,{maxPages=10}={}){
  if(!config?.liquipediaUserAgent)return{status:'disabled',candidates:[],checked:0,cached:0,reason:'LIQUIPEDIA_USER_AGENT not configured',cooldownUntil:null};
  const cache=readCache(),candidates=[];let checked=0,cached=0,liveChecks=0;
  const targets=events.filter(row=>!row.leagueId&&pageName(row)).slice(0,maxPages);
  for(const event of targets){
    const page=pageName(event),entry=cache.pages?.[page],age=entry?.fetchedAt?Date.now()-Date.parse(entry.fetchedAt):Infinity;
    if(entry&&age<CACHE_MAX_AGE_MS){cached++;candidates.push(...extractLeagueHints(entry.links||[],event));continue;}
    const shared=liquipediaRequestState();liquipediaCooldownUntil=Date.parse(shared.cooldownUntil||'')||0;
    if(shared.cooldownActive||liveChecks>=MAX_LIVE_PAGES_PER_CYCLE){if(entry){cached++;candidates.push(...extractLeagueHints(entry.links||[],event));}continue;}
    const url=`${LIQUIPEDIA_API}?action=parse&page=${encodeURIComponent(page)}&prop=externallinks&format=json&formatversion=2`;
    try{
      const data=await coordinatedLiquipediaFetch(url,{headers:{'User-Agent':config.liquipediaUserAgent,Accept:'application/json'}},30000);
      const links=data?.parse?.externallinks||[];checked++;liveChecks++;
      cache.pages={...(cache.pages||{}),[page]:{fetchedAt:new Date().toISOString(),links}};
      candidates.push(...extractLeagueHints(links,event));
    }catch(error){
      const state=liquipediaRequestState();liquipediaCooldownUntil=Date.parse(state.cooldownUntil||'')||0;
      if(entry){cached++;candidates.push(...extractLeagueHints(entry.links||[],event));}
      writeCache(cache);
      return{status:entry?'stale-cache':state.cooldownActive?'cooldown':'failed',candidates,checked,cached,reason:error.message,cooldownUntil:state.cooldownUntil||null};
    }
  }
  writeCache(cache);const state=liquipediaRequestState();
  return{status:state.cooldownActive?'cooldown':'complete',candidates:[...new Map(candidates.map(row=>[row.leagueId,row])).values()],checked,cached,reason:null,cooldownUntil:state.cooldownUntil||null};
}
export async function discoverSteamLeagueCandidates(config){if(!config?.steamApiKey)return{status:'disabled',candidates:[],reason:'STEAM_API_KEY not configured'};const url=new URL(STEAM_LEAGUES);url.searchParams.set('key',config.steamApiKey);try{const data=await fetchJson(url,{},20000),leagues=data?.result?.leagues||[];return{status:'complete',candidates:leagues.map(league=>({id:`steam-league-${league.leagueid}`,leagueId:String(league.leagueid),name:String(league.name||league.description||`Dota League ${league.leagueid}`),provider:'steam-league-listing',providerIdEvidence:league.tournament_url||null}))};}catch(error){return{status:'failed',candidates:[],reason:error.message};}}
export async function discoverProviderIdCandidates(events,config){const liquipedia=await discoverLiquipediaLeagueHints(events,config);const steam=await discoverSteamLeagueCandidates(config);return{candidates:[...liquipedia.candidates,...steam.candidates],diagnostics:{liquipediaStatus:liquipedia.status,liquipediaPagesChecked:liquipedia.checked||0,liquipediaCachedPagesUsed:liquipedia.cached||0,liquipediaIdsFound:liquipedia.candidates.length,liquipediaReason:liquipedia.reason||null,liquipediaCooldownUntil:liquipedia.cooldownUntil||null,steamStatus:steam.status,steamLeaguesFound:steam.candidates.length,steamReason:steam.reason||null}};}
