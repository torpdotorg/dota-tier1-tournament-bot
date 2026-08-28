import { discoverOpenDotaLeagues } from './discoveryProvider.js';
import { discoverLiquipediaTierOne } from './liquipediaTierOneProvider.js';
import { classifyTournament } from './eligibility.js';
import { linkTierOneChildren } from './relationships.js';
import { listTournaments, mergeAndPruneTournaments, normalizedTournamentName } from './catalog.js';
import { config } from '../config.js';
import { setProviderHealth } from './providerHealth.js';
import { annotateProviderResolution } from './providerResolution.js';
import { discoverProviderIdCandidates } from './providerIdDiscovery.js';

let inFlight = null;
let lastRun = 0;
let lastDiscovery = { at: null, durationMs: 0, openDota: 0, liquipedia: 0, liquipediaStatus: 'not-run', liquipediaDiagnostics: {}, providerIdDiagnostics: {} };

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
    const providerIds = await discoverProviderIdCandidates(liquipedia.tournaments, config);
    const candidatePool = [...openDota, ...providerIds.candidates];
    const resolvedLiquipedia = annotateProviderResolution(liquipedia.tournaments, candidatePool);
    const linked=linkTierOneChildren(enrichAgreement([...openDota,...resolvedLiquipedia]));
    const decisions=linked.filter(row=>row.verifiedTierOne||row.verifiedTierOneChild).map(row=>({...row,...classifyTournament(row,row),mode:'observation',coveragePolicy:row.eventType==='main'?'full':'limited'}));
    const before=new Map(listTournaments().map(x=>[String(x.leagueId||normalizedTournamentName(x.name)),x]));
    const {catalog,removed}=mergeAndPruneTournaments(decisions,{protectedLeagueIds:[]});
    const after=Object.values(catalog.tournaments||{});let changed=0;
    for(const item of after){const old=before.get(String(item.leagueId||normalizedTournamentName(item.name)));if(!old||old.score!==item.score||old.state!==item.state||old.parentTournamentId!==item.parentTournamentId||old.providerIdState!==item.providerIdState||old.providerIdCandidate!==item.providerIdCandidate||old.providerIdConfidence!==item.providerIdConfidence||old.providerIdReason!==item.providerIdReason)changed++;}
    lastRun=Date.now();
    lastDiscovery={at:new Date().toISOString(),durationMs:Date.now()-started,openDota:openDota.length,openDotaStatus:openDotaResult.status,openDotaReason:openDotaResult.reason||null,liquipedia:liquipedia.tournaments.length,liquipediaStatus:liquipedia.status,liquipediaReason:liquipedia.reason||null,liquipediaDiagnostics:liquipedia.diagnostics||{},providerIdDiagnostics:{...(providerIds.diagnostics||{}),candidatePool:candidatePool.length,resolvedCandidates:resolvedLiquipedia.filter(row=>row.providerIdState==='candidate').length,unresolvedCandidates:resolvedLiquipedia.filter(row=>row.providerIdState==='unresolved').length}};
    const d=lastDiscovery.liquipediaDiagnostics;
    const catalogMain = after.filter(row => (row.eventType || 'main') === 'main').length;
    const catalogChildren = after.length - catalogMain;
    const catalogLabel = ['failed', 'cooldown'].includes(liquipedia.status) ? 'Existing catalog preserved' : 'Catalog';
    console.log(`[Discovery] Liquipedia ${liquipedia.status}: ${d.rawTableRows ?? 0} table rows, ${d.tierOneRows ?? 0} Tier 1 rows, ${d.parsedRows ?? liquipedia.tournaments.length} parsed. ${catalogLabel}: ${catalogMain} main, ${catalogChildren} linked child events.`);
    return {status:'complete',changed,removed,catalog:after,details:lastDiscovery};
  })();
  try{return await inFlight;}finally{inFlight=null;}
}
export function discoverySummary(){const rank={active:0,upcoming:1,monitoring:2,completed:3,rejected:4},rows=listTournaments().filter(x=>(x.verifiedTierOne||x.verifiedTierOneChild)&&(x.inHorizon!==false)).sort((a,b)=>(rank[a.state]??9)-(rank[b.state]??9)||String(a.startDate||'9999').localeCompare(String(b.startDate||'9999'))),group=key=>rows.filter(x=>x.state===key);return{total:rows.length,active:group('active'),upcoming:group('upcoming'),monitoring:group('monitoring'),completed:group('completed'),rejected:group('rejected'),lastDiscovery};}
export function discoveryHealth(){return lastDiscovery;}
