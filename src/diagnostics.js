import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EmbedBuilder } from 'discord.js';
import { config } from './config.js';
import { tournament, tournamentConfigFile, configuredTournamentIsComplete } from './tournamentConfig.js';
import { getTrackedMatches, getSetting } from './db.js';
import { discoverySummary } from './tournaments/discoveryService.js';
import { preparationSummary } from './tournaments/preparationService.js';
import { activationSummary } from './tournaments/activationService.js';
import { providerHealthSummary } from './tournaments/providerHealth.js';
import { listTournamentAdapters } from './tournaments/workers/adapterRegistry.js';
import { coverageRuntimeSummary } from './tournaments/coverageRuntime.js';
import { coverageWorkerSummary } from './tournaments/workers/workerManager.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function formatPreparationAge(value, now = Date.now()) {
  const preparedAt = Date.parse(value || '');
  if (!Number.isFinite(preparedAt)) return 'not available';
  const elapsedMinutes = Math.max(0, Math.floor((now - preparedAt) / 60000));
  const days = Math.floor(elapsedMinutes / 1440);
  const hours = Math.floor((elapsedMinutes % 1440) / 60);
  const minutes = elapsedMinutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export async function diagnosticsEmbed() {
  let registry = { teams: {} };
  try {
    registry = JSON.parse(await fs.readFile(path.join(root, 'data', 'teams.json'), 'utf8'));
  } catch {}

  const teams = Object.values(registry.teams || {});
  const tracked = getTrackedMatches();
  const active = tracked.filter(match => match.status === 'active');
  const results = tracked.filter(match => match.status === 'result-unavailable');
  const enrichment = tracked.filter(match => ['pending', 'delayed'].includes(match.enrichmentStatus));
  const discovery = discoverySummary();
  const last = discovery.lastDiscovery || {};
  const prep = preparationSummary();
  const configurationComplete = configuredTournamentIsComplete();
  const activation = activationSummary();
  const providers = providerHealthSummary();
  const structureAdapter = listTournamentAdapters().some(adapter => adapter.name === 'liquipedia-structure');
  const coverage = coverageRuntimeSummary();
  const workers = coverageWorkerSummary();
  const providerText = providers.length ? providers.map(p => `${p.name}: ${p.status}${p.detail ? ` (${p.detail})` : ''}`).join('\n') : 'No discovery provider checks completed';

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('Bot Diagnostics')
    .addFields(
      { name: 'Configured tournament', value: `${tournament.name}\nLeague ${config.tiLeagueId}\n${tournament.startDate} to ${tournament.endDate}\nRuntime: ${configurationComplete ? 'archived' : 'active'}` },
      { name: 'Team identity', value: `${teams.length} teams\n${teams.filter(team => team.logoFile).length} cached logos\n${teams.filter(team => team.emojiId).length} application emojis` },
      { name: 'Processing', value: `${active.length} active games\n${results.length} unavailable results\n${enrichment.length} replay enrichments pending` },
      { name: 'Discovery', value: `Mode: observation • Tier 1 ecosystem\nCatalog: ${discovery.total}\nActive: ${discovery.active.length} • Upcoming: ${discovery.upcoming.length}\nLiquipedia: ${last.liquipediaStatus || 'not run'}` },
      { name: 'Discovery providers', value: providerText },
      { name: 'Structure provider', value: `Liquipedia structure: ${structureAdapter ? 'registered' : 'not registered'}` },
      { name: 'Preparation', value: `Ready: ${prep.ready}\nAwaiting provider ID: ${prep.awaitingProviderId}\nAwaiting teams: ${prep.awaitingTeams}\nScheduled: ${prep.scheduled}\nRetry: ${prep.retry}\nSkipped unchanged: ${prep.skipped || 0}\nLast prepared: ${prep.lastPreparedTournament || 'none'}\nPrepared at: ${prep.lastPreparedAt || 'not available'}\nPreparation age: ${formatPreparationAge(prep.lastPreparedAt)}\nLast cycle: ${prep.at || 'not completed'}` },
      { name: 'Activation', value: `Mode: automatic\nActive coverage: ${activation.activeCoverage}\nReady outside window: ${activation.readyOutsideWindow}\nWaiting preparation: ${activation.waitingPreparation}\nBlocked: ${activation.blocked}\nCompleted: ${activation.completedCoverage}\nLast activated: ${activation.lastActivatedTournament || 'none'}\nActivated at: ${activation.lastActivatedAt || 'not available'}\nLast cycle: ${activation.at || 'not completed'}` },
      { name: 'Coverage runtime', value: `Running: ${coverage.running}\nAwaiting generic adapter: ${coverage.waitingAdapter}\nStarted this cycle: ${coverage.started}\nStopped this cycle: ${coverage.stopped}\nLast reconcile: ${coverage.at || 'not completed'}` },
      { name: 'Generic workers', value: `Observing: ${workers.observing}\nPublishing: ${workers.running}\nDegraded: ${workers.degraded || 0}\nAwaiting adapter: ${workers.waitingAdapter}\nLast reconcile: ${workers.at || 'not completed'}` },
      { name: 'Persistent messages', value: `Bracket: ${getSetting('bracket_message_id') ? (configurationComplete ? 'archived' : 'configured') : 'not created'}\nSeries: ${getSetting('series_overview_message_id') ? (configurationComplete ? 'archived' : 'configured') : 'not created'}` },
      { name: 'Configuration', value: path.relative(root, tournamentConfigFile) }
    )
    .setTimestamp();
}
