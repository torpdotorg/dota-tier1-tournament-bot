import { EmbedBuilder } from 'discord.js';

function title(event, suffix) {
  return `${event?.shortName || event?.name || 'Tournament'} • ${suffix}`;
}

function dateLine(value) {
  if (!value) return 'Time not available';
  const unix = Math.floor(Date.parse(value) / 1000);
  return Number.isFinite(unix) ? `<t:${unix}:F> • <t:${unix}:R>` : 'Time not available';
}

export function contextualScheduleEmbed(event, rows = [], { todayOnly = false } = {}) {
  const timezone = event?.timezone || 'UTC';
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  const filtered = todayOnly
    ? rows.filter(row => row.beginAt && new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(row.beginAt)) === date)
    : rows;
  const future = filtered.filter(row => !row.beginAt || Date.parse(row.beginAt) >= Date.now()).slice(0, 10);
  const description = future.length
    ? future.map(row => `**${row.teams?.[0] || 'TBD'} vs ${row.teams?.[1] || 'TBD'}**\n${row.stage || row.name || 'Tournament series'}${row.bestOf ? ` • Bo${row.bestOf}` : ''}\n${dateLine(row.beginAt)}`).join('\n\n')
    : todayOnly ? 'No tournament series are scheduled for today.' : 'No upcoming tournament series are currently available.';
  return new EmbedBuilder().setColor(0x5865F2).setTitle(title(event, todayOnly ? 'TODAY' : 'SCHEDULE')).setDescription(description).setTimestamp();
}

export function contextualNextEmbed(event, row) {
  if (!row) {
    const description = event?.state === 'completed'
      ? 'The tournament is complete. No upcoming series are scheduled.'
      : event?.leagueId
        ? 'The schedule has not yet been published by the available tournament providers.'
        : 'The tournament is known, but a compatible league ID and schedule are not available yet.';
    return new EmbedBuilder().setColor(0x5865F2).setTitle(title(event, 'NEXT SERIES')).setDescription(description).setTimestamp();
  }
  return new EmbedBuilder().setColor(0x5865F2).setTitle(title(event, 'NEXT SERIES')).setDescription(`**${row.teams?.[0] || 'TBD'} vs ${row.teams?.[1] || 'TBD'}**\n${row.stage || row.name || 'Tournament series'}${row.bestOf ? ` • Bo${row.bestOf}` : ''}\n${dateLine(row.beginAt)}`).setTimestamp();
}

export function contextualResultsEmbed(event, rows = []) {
  const completed = rows.filter(row => row.status === 'completed').slice(-10).reverse();
  const description = completed.length
    ? completed.map(row => {
      const winner = row.radiantWin === null ? row.winner : row.radiantWin ? row.radiant : row.dire;
      return `**${row.teams?.[0] || row.radiant || 'TBD'} vs ${row.teams?.[1] || row.dire || 'TBD'}**\nWinner: ${winner || 'Result available'}${row.duration ? ` • ${Math.floor(row.duration / 60)}:${String(row.duration % 60).padStart(2, '0')}` : ''}`;
    }).join('\n\n')
    : 'No completed games are currently available from the selected provider.';
  return new EmbedBuilder().setColor(0x5865F2).setTitle(title(event, 'RECENT RESULTS')).setDescription(description).setTimestamp();
}

export function unavailableContextEmbed(event, feature, reason) {
  return new EmbedBuilder()
    .setColor(0x747F8D)
    .setTitle(title(event, String(feature || 'Information').toUpperCase()))
    .setDescription(`${feature || 'Tournament'} data is not available yet.\n\n${reason || 'No tournament context is currently available. Run /tournaments to review the catalog.'}`)
    .setTimestamp();
}
export function contextualTeamEmbed(event, teamName, standing, next) {
  const rows = [];

  if (standing) {
    rows.push(
      `Standing: #${standing.rank || '?'}${
        standing.seriesWins !== undefined
          ? ` • ${standing.seriesWins}-${standing.seriesLosses} series`
          : ''
      }`
    );
  }

  rows.push(
    next
      ? `Next series: ${next.teams?.join(' vs ') || 'TBD'}\n${dateLine(next.beginAt)}`
      : 'No upcoming series is currently available.'
  );

  return new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(title(event, `TEAM • ${teamName}`))
    .setDescription(rows.join('\n\n'))
    .setTimestamp();
}

export function contextualHeroStatsEmbed(event, rows = []) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(title(event, 'HERO STATISTICS'))
    .setTimestamp();

  if (!rows.length) {
    return embed.setDescription(
      'No processed draft data is available for this tournament yet.'
    );
  }

  const mostPicked = rows
    .slice()
    .sort((a, b) => b.picks - a.picks || b.wins - a.wins)
    .slice(0, 10);

  return embed.setDescription(
    mostPicked
      .map(
        (row, index) =>
          `${index + 1}. **${row.hero}** — ${row.picks} picks • ` +
          `${row.wins} wins • ${row.winRate}%`
      )
      .join('\n')
  );
}