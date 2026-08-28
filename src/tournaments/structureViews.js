import { EmbedBuilder } from 'discord.js';

function eventTitle(event, suffix) {
  return `${event?.shortName || event?.name || 'Tournament'} • ${suffix}`;
}

function participantSummary(structure) {
  const slots = structure?.participantSlots || [];
  const invited = slots.filter(slot => /invited/i.test(slot.status || '')).length;
  const qualified = slots.filter(slot => /qualified/i.test(slot.status || '')).length;
  const named = slots.filter(slot => slot.name).length;
  const parts = [];
  if (slots.length) parts.push(`${slots.length} slots`);
  if (invited) parts.push(`${invited} invited`);
  if (qualified) parts.push(`${qualified} qualifier slots`);
  if (named) parts.push(`${named} named`);
  return parts.length ? parts.join(' • ') : String(structure?.participantCount || 'Not published');
}

function capabilityLines(structure) {
  const capabilities = structure?.capabilities || {};
  const slots = structure?.participantSlots?.length || 0;
  const named = structure?.teams?.length || 0;
  return [
    'Available • Tournament info',
    slots ? `Available • Participant slots (${slots})` : 'Not available • Participant slots',
    named ? `Available • Team names (${named})` : 'Awaiting publication • Team names',
    capabilities.bracket ? 'Available • Bracket structure' : 'Not available • Bracket structure',
    capabilities.bracketNamed ? 'Available • Named bracket pairings' : 'Awaiting publication • Named bracket pairings',
    capabilities.schedule ? 'Available • Schedule' : 'Not available • Schedule',
    capabilities.standings ? 'Available • Standings' : 'Not available • Standings',
    capabilities.liveGames ? 'Available • Live games' : 'Not available • Live games',
    capabilities.results ? 'Available • Results' : 'Not available • Results'
  ].join('\n');
}

function groupedBracketDescription(matches) {
  const groups = new Map();
  for (const match of matches || []) {
    const round = match.round || 'Bracket';
    if (!groups.has(round)) groups.set(round, []);
    groups.get(round).push(match);
  }
  return [...groups.entries()].map(([round, rows]) => {
    const body = rows.map((match, index) => `**Match ${index + 1}${match.bestOf ? ` • ${match.bestOf}` : ''}**\n${match.teams?.[0] || 'TBD'} vs ${match.teams?.[1] || 'TBD'}`).join('\n\n');
    return `__**${round.toUpperCase()}**__\n\n${body}`;
  }).join('\n\n\n').slice(0, 4000);
}

export function tournamentInfoEmbed(event, structure) {
  const capabilities = structure?.capabilities || {};
  const capabilityText = capabilityLines(structure);
  const fields = [
    { name: 'Status', value: String(event?.state || 'unknown'), inline: true },
    { name: 'Type', value: String(event?.eventType || 'main'), inline: true },
    { name: 'Dates', value: `${event?.startDate || 'TBD'} to ${event?.endDate || event?.startDate || 'TBD'}`, inline: false },
    { name: 'Format', value: structure?.format || 'Not published', inline: true },
    { name: 'Format details', value: structure?.formatDetails?.length ? structure.formatDetails.join('\n').slice(0,1024) : 'Not published', inline: false },
    { name: 'Participants', value: participantSummary(structure), inline: false },
    { name: 'Stages', value: structure?.stages?.length ? structure.stages.join('\n').slice(0, 1024) : 'Not published', inline: false },
    { name: 'Capabilities', value: capabilityText, inline: false },
    { name: 'Source', value: `${structure?.source || 'Liquipedia'} • ${structure?.cacheStatus || 'unknown cache state'}\nPage: ${structure?.liquipediaPage || 'not available'}`, inline: false }
  ];
  return new EmbedBuilder().setColor(0x5865F2).setTitle(eventTitle(event, 'TOURNAMENT INFO')).addFields(fields).setTimestamp();
}

export function tournamentTeamsEmbed(event, structure) {
  const teams = structure?.teams || [];
  const slots = structure?.participantSlots || [];
  const namedSlots = slots.filter(slot => slot.name);
  const invited = slots.filter(slot => /invited/i.test(slot.status || '')).length;
  const qualified = slots.filter(slot => /qualified/i.test(slot.status || '')).length;
  let description;
  if (teams.length) description = teams.map((team, index) => `${index + 1}. **${team.name}**`).join('\n').slice(0, 4000);
  else if (namedSlots.length) description = namedSlots.map(slot => `**${slot.slot}. ${slot.name}**${slot.status ? ` — ${slot.status}` : ''}${slot.qualifier ? ` (${slot.qualifier})` : ''}`).join('\n').slice(0, 4000);
  else if (slots.length) {
    const summary = [invited ? `${invited} invited slot${invited === 1 ? '' : 's'}` : null, qualified ? `${qualified} qualifier slot${qualified === 1 ? '' : 's'}` : null].filter(Boolean).join(' • ');
    description = `**${slots.length} participant slots are available**${summary ? `\n${summary}` : ''}\n\nTeam names have not yet been published by Liquipedia.`;
  } else if (structure?.participantCount) description = `**${structure.participantCount} participants are expected**\n\nTeam names have not yet been published by Liquipedia.`;
  else description = 'Participating teams have not yet been published in a structure the bot can verify.';
  return new EmbedBuilder().setColor(0x5865F2).setTitle(eventTitle(event, 'TEAMS')).setDescription(description).setFooter({ text: `Source: ${structure?.source || 'Liquipedia'}` }).setTimestamp();
}

export function tournamentStructureBracketEmbed(event, structure) {
  const matches = structure?.bracket || [];
  const namedMatches = matches.filter(match => (match.teams || []).some(name => name && name !== 'TBD'));
  let description;
  if (matches.length && namedMatches.length) description = groupedBracketDescription(matches);
  else if (matches.length) {
    const rounds = [...new Set(matches.map(match => match.round || 'Bracket'))];
    description = `**Bracket structure is available**\n\n${rounds.map(round => `• ${round}`).join('\n')}\n\nTeams, seeding and named pairings have not yet been published.`;
  } else description = `Bracket structure has not yet been published or cannot currently be verified.\n\nLiquipedia page: ${structure?.liquipediaPage || 'available but unnamed'}\nTournament page detected: ${structure?.diagnostics?.pageFound ? 'yes' : 'no'}`;
  return new EmbedBuilder().setColor(0x5865F2).setTitle(eventTitle(event, 'BRACKET')).setDescription(description.slice(0, 4000)).setFooter({ text: `Source: ${structure?.source || 'Liquipedia'}` }).setTimestamp();
}

export function tournamentStructureDebugEmbed(event, debug) {
  const capabilities = debug?.capabilities || {};
  return new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle(eventTitle(event, 'STRUCTURE DEBUG'))
    .addFields(
      { name: 'Page', value: debug?.page || 'not available' },
      { name: 'Fetch', value: `Cache: ${debug?.cacheStatus || 'unknown'}
Fetched: ${debug?.fetchedAt || 'not available'}
Raw: ${debug?.rawCapturePath || 'not captured'}` },
      { name: 'Parser', value: `Page found: ${debug?.pageFound ? 'yes' : 'no'}
HTML bytes: ${debug?.htmlBytes || 0}
Infobox: ${debug?.infoboxDetected ? 'yes' : 'no'}
Headings: ${debug?.headingsFound || 0}` },
      { name: 'Extraction', value: `Participant count: ${debug?.participantCount || 'not found'}
Participant cards: ${debug?.participantCardsFound || 0}
Named slots: ${debug?.participantSlotsNamed || 0}
TBD slots: ${debug?.participantSlotsTbd || 0}
Bracket headers: ${debug?.bracketHeadersFound || 0}
Bracket matches: ${debug?.bracketMatchNodesFound || 0}
Named bracket matches: ${debug?.bracketMatchesNamed || 0}` },
      { name: 'Capabilities', value: `Teams: ${capabilities.teams ? 'available' : 'unavailable'}
Bracket: ${capabilities.bracket ? 'available' : 'unavailable'}
Tournament info: ${capabilities.tournamentInfo ? 'available' : 'unavailable'}` }
    )
    .setTimestamp();
}
