import { runTournamentDiscovery } from './discoveryService.js';
import { prepareUpcomingTournaments } from './preparationService.js';
import { evaluateTournamentActivations } from './activationService.js';
import { reconcileCoverageRuntimes } from './coverageRuntime.js';
import { alignCompletedTournamentStates } from './lifecycleAlignment.js';
import { reconcileCoverageWorkers } from './workers/workerManager.js';
async function cycle(client,{force=false}={}){
  try { await runTournamentDiscovery({force}); }
  catch (error) { console.warn(`[Discovery] Scan failed; continuing with existing catalog: ${error.message}`); }
  try { alignCompletedTournamentStates(); }
  catch (error) { console.warn(`[Lifecycle] Alignment failed: ${error.message}`); }
  try { await prepareUpcomingTournaments(client,{force}); }
  catch (error) { console.warn(`[Preparation] Cycle failed: ${error.message}`); }
  try { await evaluateTournamentActivations({force}); }
  catch (error) { console.warn(`[Activation] Cycle failed: ${error.message}`); }
  try { reconcileCoverageRuntimes(); }
  catch (error) { console.warn(`[Coverage] Runtime reconciliation failed: ${error.message}`); }
  try { await reconcileCoverageWorkers({ publish: false }); }
  catch (error) { console.warn(`[Coverage] Worker reconciliation failed: ${error.message}`); }
}
export function startTournamentDiscovery(client){setTimeout(()=>cycle(client).catch(error=>console.warn(`[Discovery] Initial cycle failed: ${error.message}`)),1000).unref();setInterval(()=>cycle(client).catch(error=>console.warn(`[Discovery] Cycle failed: ${error.message}`)),6*60*60*1000).unref();console.log('[Discovery] Tournament discovery, preparation, activation and coverage runtime started in observation mode (initial cycle in 1 second; 6-hour cadence).');}
export { cycle as runDiscoveryPreparationCycle };
