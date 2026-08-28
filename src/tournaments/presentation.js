function line(t) {
  const preparation = t.preparationState && t.preparationState !== 'not-applicable' ? `\nPreparation: ${t.preparationState}` : '';
  const activation = t.activationState ? `\nActivation: ${t.activationState}` : '';
  const sources = (t.sources || [t.provider]).filter(Boolean).map(x => x === 'opendota' ? 'OpenDota' : x === 'liquipedia' ? 'Liquipedia' : x).join(' + ');
  return `**${t.name}** — ${t.score}/100${t.startDate ? ` • ${t.startDate}` : ''}${preparation}${activation}${sources ? `\nSources: ${sources}` : ''}`;
}
function section(title, rows) {
  return rows.length ? `**${title}**\n${rows.slice(0, 8).map(line).join('\n\n')}` : null;
}
export function tournamentDiscoveryText(summary) {
  const sections = [];
  const active = summary.active || [];
  const upcoming = summary.upcoming || [];
  const activeMain = active.filter(row => (row.eventType || 'main') === 'main');
  const activeChildren = active.filter(row => (row.eventType || 'main') !== 'main');
  const upcomingMain = upcoming.filter(row => (row.eventType || 'main') === 'main');
  const upcomingChildren = upcoming.filter(row => (row.eventType || 'main') !== 'main');
  for (const value of [
    section('ACTIVE MAIN EVENTS', activeMain),
    section('ACTIVE QUALIFIERS & PLAY-INS', activeChildren),
    section('UPCOMING MAIN EVENTS', upcomingMain),
    section('UPCOMING QUALIFIERS & PLAY-INS', upcomingChildren),
    section('MONITORING', summary.monitoring || []),
    section('RECENTLY COMPLETED', summary.completed || [])
  ]) if (value) sections.push(value);
  if (!sections.length) sections.push('No relevant tournaments discovered yet.');
  return sections.join('\n\n');
}
export function tournamentCatalogCounts(summary) {
  const upcoming = summary.upcoming || [];
  const main = upcoming.filter(row => (row.eventType || 'main') === 'main').length;
  const children = upcoming.length - main;
  return `${summary.total} total\n${summary.active.length} active\n${main} upcoming main events\n${children} upcoming qualifiers/play-ins\n${summary.monitoring.length} monitoring\n${summary.completed.length} recently completed`;
}
