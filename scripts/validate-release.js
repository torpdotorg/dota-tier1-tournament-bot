import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));

const required = [
  'src/index.js',
  'src/config.js',
  'src/db.js',
  'src/diagnostics.js',
  'src/providers/steam.js',
  'src/providers/valveLeague.js',
  'src/tournaments/catalog.js',
  'src/tournaments/discoveryService.js',
  'src/tournaments/liquipediaRequestCoordinator.js',
  'src/tournaments/liquipediaTierOneProvider.js',
  'src/tournaments/providerIdDiscovery.js',
  'src/tournaments/providerResolution.js',
  'src/tournaments/platformView.js',
  'src/tournaments/workers/valveTournamentAdapter.js',
  'src/tournaments/workers/openDotaTournamentAdapter.js',
  'src/tournaments/workers/liquipediaStructureAdapter.js',
  'src/tournaments/workers/coverageWorker.js',
  'src/tournaments/workers/workerManager.js',
  'src/tournaments/commandContext.js',
  'src/tournaments/contextCommandViews.js',
  'scripts/check-syntax.js'
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing release file: ${file}`);
}

if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
  throw new Error('package-lock version does not match package.json');
}

const source = [...walk(path.join(root, 'src'))]
  .filter(file => file.endsWith('.js'))
  .map(readAbsolute)
  .join('\n');

for (const forbidden of [
  'tiLeagueId',
  'TI_LEAGUE_ID',
  'ACTIVE_TOURNAMENT',
  'getTiLiveGames',
  'getRecentTiMatches',
  'ConfiguredTournamentAdapter',
  'pandascore'
]) {
  if (source.includes(forbidden)) throw new Error(`Retired runtime token remains: ${forbidden}`);
}

for (const token of [
  'ValveTournamentAdapter',
  'contextualTeamEmbed',
  'contextualHeroStatsEmbed',
  'tournamentNotificationKey',
  'Catalog-driven tournament runtime initialized in observation mode',
  'coordinatedLiquipediaFetch',
  'liquipediaRequestState',
  'providerResolutionDiagnostics',
  'candidatePool',
  'latestResolution',
  'version:6'
]) {
  if (!source.includes(token)) throw new Error(`Missing platform token: ${token}`);
}

for (const forbiddenFile of [
  'src/providers/pandascore.js',
  'src/scheduler.js',
  'src/tournaments/workers/configuredAdapter.js'
]) {
  if (fs.existsSync(path.join(root, forbiddenFile))) throw new Error(`Retired runtime file remains: ${forbiddenFile}`);
}

console.log(`Release validation passed for v${pkg.version}`);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else yield file;
  }
}

function readAbsolute(file) {
  return fs.readFileSync(file, 'utf8');
}
