import { EmbedBuilder } from 'discord.js';

function displayStatus(status) {
  if (['healthy', 'live', 'cached', 'stale-cache'].includes(status)) return 'Healthy';
  if (status === 'failed') return 'Unavailable';
  if (status === 'disabled') return 'Disabled';
  if (status === 'empty') return 'No data';
  return status || 'Pending';
}

function providerLine(provider) {
  return `**${provider.name}:** ${displayStatus(provider.status)}${provider.detail ? `\n${provider.detail}` : ''}`;
}

function relativeTime(value) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return 'Initial cycle pending';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function providerFallback(discovery) {
  const last = discovery.lastDiscovery || {};
  const rows = [];
  if (last.openDotaStatus && last.openDotaStatus !== 'not-run') {
    rows.push({ name: 'OpenDota', status: last.openDotaStatus, detail: last.openDotaReason || null });
  }
  if (last.liquipediaStatus && last.liquipediaStatus !== 'not-run') {
    rows.push({ name: 'Liquipedia', status: last.liquipediaStatus, detail: last.liquipediaReason || null });
  }
  return rows;
}

export function platformStatusEmbed({ discovery, providers = [], coverage, workers, preparation = null }) {
  const health = providers.length ? providers : providerFallback(discovery);
  const providerText = health.length
    ? health.map(providerLine).join('\n\n')
    : 'Initial provider checks are still pending.';
  const activeMain = (discovery.active || []).filter(row => (row.eventType || 'main') === 'main');
  const upcoming = discovery.upcoming || [];
  const upcomingMain = upcoming.filter(row => (row.eventType || 'main') === 'main');
  const upcomingChildren = upcoming.length - upcomingMain.length;
  const nextMain = upcomingMain[0];
  const catalogRows = [...(discovery.active || []), ...(discovery.upcoming || []), ...(discovery.monitoring || [])];
  const providerCandidates = catalogRows.filter(row => row.providerIdState === 'candidate');
  const unresolved = catalogRows.filter(row => !row.leagueId && row.providerIdState !== 'candidate');
  const degraded = health.some(provider => ['failed', 'empty'].includes(provider.status));
  const idDiag = discovery.lastDiscovery?.providerIdDiagnostics || {};
  const unresolvedText = unresolved.length ? unresolved.slice(0, 5).map(row => `**${row.name}**\n${row.providerIdBestRejectedName ? `${row.providerIdBestRejectedName} • ${row.providerIdBestRejectedConfidence}%` : 'No provider candidate available'}\nReason: ${row.providerIdReason || 'No diagnostic reason recorded'}`).join('\n\n') : 'No unresolved tournament provider IDs.';
  const readiness = preparation
    ? `Ready: ${preparation.ready}\nAwaiting provider ID: ${preparation.awaitingProviderId}\nAwaiting teams: ${preparation.awaitingTeams}\nScheduled: ${preparation.scheduled}`
    : 'Preparation details are not available yet.';

  return new EmbedBuilder()
    .setColor(degraded ? 0xFEE75C : 0x57F287)
    .setTitle('Dota Tier 1 Platform Status')
    .setDescription('Public operational overview of tournament discovery and coverage readiness.')
    .addFields(
      {
        name: 'Catalog',
        value: `${discovery.total} tournaments\n${activeMain.length} active main events\n${upcomingMain.length} upcoming main events\n${upcomingChildren} upcoming qualifiers/play-ins\n${(discovery.completed || []).length} recently completed`
      },
      {
        name: 'Discovery',
        value: `Last cycle: ${relativeTime(discovery.lastDiscovery?.at)}\nOpenDota rows: ${discovery.lastDiscovery?.openDota ?? 0}\nLiquipedia rows: ${discovery.lastDiscovery?.liquipedia ?? 0}`
      },
      { name: 'Providers', value: providerText.slice(0, 1024) },
      { name: 'Preparation', value: readiness },
      { name: 'Provider resolution', value: `Verified IDs: ${catalogRows.filter(row => row.leagueId).length}\nCandidate matches: ${providerCandidates.length}\nUnresolved: ${unresolved.length}${providerCandidates.length ? `\n\n${providerCandidates.slice(0,3).map(row => `**${row.name}**\n${row.providerIdCandidateName || row.providerIdCandidate} • ${row.providerIdConfidence}% confidence`).join('\n\n')}` : ''}`.slice(0,1024) },
      { name: 'ID discovery sources', value: `Total candidate pool: ${idDiag.candidatePool ?? 0}\nOpenDota candidates: ${discovery.lastDiscovery?.openDota ?? 0}\nLiquipedia pages checked: ${idDiag.liquipediaPagesChecked ?? 0}\nLiquipedia cached pages used: ${idDiag.liquipediaCachedPagesUsed ?? 0}\nLiquipedia IDs found: ${idDiag.liquipediaIdsFound ?? 0}\nLiquipedia cooldown: ${idDiag.liquipediaCooldownUntil ? 'active' : 'inactive'}\nSteam league listing: ${idDiag.steamStatus || 'pending'}\nSteam candidates: ${idDiag.steamLeaguesFound ?? 0}` },
      { name: 'Best unresolved matches', value: unresolvedText.slice(0, 1024) },
      {
        name: 'Coverage',
        value: `Runtimes: ${coverage.running}\nObserving workers: ${workers.observing}\nPublishing workers: ${workers.running}\nDegraded workers: ${workers.degraded || 0}\nAwaiting adapter: ${workers.waitingAdapter}`
      },
      {
        name: 'Next main event',
        value: nextMain
          ? `**${nextMain.name}**\nStarts: ${nextMain.startDate || 'TBD'}\nPreparation: ${nextMain.preparationState || 'not started'}`
          : 'No upcoming main event is currently known.'
      },
      { name: 'Mode', value: 'Observation mode\nAutomatic public publishing is not enabled.' }
    )
    .setFooter({ text: 'Detailed administrator diagnostics remain available through /diagnostics' })
    .setTimestamp();
}
