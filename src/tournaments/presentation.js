function line(t) {
  const preparation = t.preparationState && t.preparationState !== 'not-applicable' ? `\nPreparation: ${t.preparationState}` : '';
  const activation = t.activationState ? `\nActivation: ${t.activationState}` : '';
  const sources = (t.sources || [t.provider]).filter(Boolean).map(x => x === 'opendota' ? 'OpenDota' : x === 'configured' ? 'Configured' : x === 'liquipedia' ? 'Liquipedia' : x).join(' + ');
  return `**${t.name}** — ${t.score}/100${t.startDate ? ` • ${t.startDate}` : ''}${preparation}${activation}${sources ? `\nSources: ${sources}` : ''}`;
}
export function tournamentDiscoveryText(summary) {
  const sections = [];
  for (const [key, title] of [['active','ACTIVE'],['upcoming','UPCOMING'],['monitoring','MONITORING'],['completed','RECENTLY COMPLETED']]) {
    const rows = summary[key] || [];
    if (rows.length) sections.push(`**${title}**\n${rows.slice(0,5).map(line).join('\n\n')}`);
  }
  if (!sections.length) sections.push('No relevant tournaments discovered yet.');
  return sections.join('\n\n');
}
export function tournamentCatalogCounts(summary) {
  return `${summary.total} total\n${summary.active.length} active\n${summary.upcoming.length} upcoming\n${summary.monitoring.length} monitoring\n${summary.completed.length} recently completed`;
}
