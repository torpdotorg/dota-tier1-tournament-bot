import { simulateTournamentLifecycle } from '../src/tournaments/simulationEngine.js';

try {
  const result = await simulateTournamentLifecycle();
  console.log('Tournament simulation passed.');
  console.log(`Tournament: ${result.tournament}`);
  for (const row of result.stages) console.log(`- ${row.stage}`);
  console.log(`Public messages: ${result.publicMessages}`);
  console.log(`Final worker state: ${result.finalWorkerState}`);
} catch (error) {
  console.error(`Tournament simulation failed: ${error.message}`);
  process.exitCode = 1;
}
