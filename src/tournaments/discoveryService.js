import { discoverOpenDotaLeagues } from './discoveryProvider.js';
import { discoverLiquipediaTierOne } from './liquipediaTierOneProvider.js';
import { classifyTournament } from './eligibility.js';
import { linkTierOneChildren } from './relationships.js';
import { listTournaments, mergeAndPruneTournaments, normalizedTournamentName } from './catalog.js';
import { tournament } from '../tournamentConfig.js';
import { config } from '../config.js';
import { setProviderHealth } from './providerHealth.js';

let inFlight = null;
let lastRun = 0;
let lastDiscovery = { at: null, durationMs: 0, openDota: 0, liquipedia: 0, liquipediaStatus: 'not-run', liquipediaDiagnostics: {} };

function configuredTournament(now = Date.now()) {
  const start = Date.parse(`${tournament.startDate}T00:00:00Z`), end = Date.parse(`${tournament.endDate}T23:59:59Z`);
  const state = now > end ? 'completed' : now >= start ? 'active' : 'upcoming';
  return { id:`configured-${tournament.id}`,leagueId:String(tournament.leagueId),name:tournament.name,shortName:tournament.shortName,tier:1,startDate:tournament.startDate,endDate:tournament.endDate,hasSchedule:true,providerAgreement:2,provider:'configured',sources:['configured'],verifiedTierOne:true,eventType:'main',score:100,state,eligible:state!=='completed',inHorizon:true,mode:'observation',coverage:'configured' };
}
function enrichAgreement(rows) {
  const groups = new Map();
  for (const row of rows) { const key=normalizedTournamentName(row.name), list=groups.get(key)||[]; list.push(row); groups.set(key,list); }
  return rows.map(row => { const matches=groups.get(normalizedTournamentName(row.name))||[], sources=[...new Set(matches.flatMap(x=>x.sources||[x.provider]).filter(Boolean))]; return {...row,sources,providerAgreement:sources.length}; });
}
export async function runTournamentDiscovery({ force = false } = {}) {
  if (inFlight) return inFlight;
  if (!force && Date.now()-lastRun < 3600000) return { status:'throttled', catalog:listTournaments() };
  inFlight = (async()=>{
    const started=Date.now();
    const [openDotaResult, liquipedia] = await Promise.all([
      discoverOpenDotaLeagues()
        .then(tournaments => ({ status: 'healthy', tournaments }))
        .catch(error => ({ status: 'failed', tournaments: [], reason: error.message })),
      discoverLiquipediaTierOne(config,{force})
        .catch(error=>({status:'failed',tournaments:[],reason:error.message,diagnostics:{}}))
    ]);
    const openDota = openDotaResult.tournaments;
    setProviderHealth('OpenDota', openDotaResult.status, openDotaResult.reason || null);
    setProviderHealth('Liquipedia', ['live','cached','stale-cache'].includes(liquipedia.status) ? 'healthy' : liquipedia.status, liquipedia.reason || null);
    const linked=linkTierOneChildren(enrichAgreement([...openDota,...liquipedia.tournaments,configuredTournament()]));
    const decisions=linked.filter(row=>row.verifiedTierOne||row.verifiedTierOneChild||row.coverage==='configured').map(row=>({...row,...classifyTournament(row,row),mode:'observation',coveragePolicy:row.eventType==='main'?'full':'limited'}));
    const before=new Map(listTournaments().map(x=>[String(x.leagueId||normalizedTournamentName(x.name)),x]));
    const {catalog,removed}=mergeAndPruneTournaments(decisions,{protectedLeagueIds:[tournament.leagueId]});
    const after=Object.values(catalog.tournaments||{});let changed=0;
    for(const item of after){const old=before.get(String(item.leagueId||normalizedTournamentName(item.name)));if(!old||old.score!==item.score||old.state!==item.state||old.parentTournamentId!==item.parentTournamentId)changed++;}
    lastRun=Date.now();
    lastDiscovery={at:new Date().toISOString(),durationMs:Date.now()-started,openDota:openDota.length,openDotaStatus:openDotaResult.status,openDotaReason:openDotaResult.reason||null,liquipedia:liquipedia.tournaments.length,liquipediaStatus:liquipedia.status,liquipediaReason:liquipedia.reason||null,liquipediaDiagnostics:liquipedia.diagnostics||{}};
    const d=lastDiscovery.liquipediaDiagnostics;
    console.log(`[Discovery] Liquipedia ${liquipedia.status}: ${d.rawTableRows??0} table rows, ${d.tierOneRows??0} Tier 1 rows, ${d.parsedRows??liquipedia.tournaments.length} parsed. Catalog: ${decisions.filter(x=>x.eventType==='main').length} main, ${decisions.filter(x=>x.eventType!=='main').length} linked child events.`);
    return {status:'complete',changed,removed,catalog:after,details:lastDiscovery};
  })();
  try{return await inFlight;}finally{inFlight=null;}
}
export function discoverySummary(){const rank={active:0,upcoming:1,monitoring:2,completed:3,rejected:4},rows=listTournaments().filter(x=>(x.verifiedTierOne||x.verifiedTierOneChild||x.coverage==='configured')&&(x.inHorizon!==false||x.coverage==='configured')).sort((a,b)=>(rank[a.state]??9)-(rank[b.state]??9)||String(a.startDate||'9999').localeCompare(String(b.startDate||'9999'))),group=key=>rows.filter(x=>x.state===key);return{total:rows.length,active:group('active'),upcoming:group('upcoming'),monitoring:group('monitoring'),completed:group('completed'),rejected:group('rejected'),lastDiscovery};}
export function discoveryHealth(){return lastDiscovery;}
