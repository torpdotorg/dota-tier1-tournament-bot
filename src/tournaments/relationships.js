import { normalizedTournamentName } from './catalog.js';
import { eventType } from './eligibility.js';

function baseName(name = '') {
  return normalizedTournamentName(String(name)
    .replace(/:\s*.*?(qualifier|play[- ]?in|showmatch).*$/i, '')
    .replace(/\b(open|closed|regional)?\s*(qualifier|play[- ]?in|showmatch)\b.*$/i, ''));
}

export function linkTierOneChildren(rows) {
  const typed = rows.map(row => ({ ...row, eventType: row.eventType || eventType(row.name) }));
  const mains = typed.filter(row => (row.verifiedTierOne || row.coverage === 'configured') && row.eventType === 'main');

  return typed.map(row => {
    if (row.eventType === 'main') return row;

    const base = baseName(row.name);
    const parent = mains
      .map(item => ({ item, key: normalizedTournamentName(item.name) }))
      .sort((a, b) => b.key.length - a.key.length)
      .find(({ key }) => base && key && (base.includes(key) || key.includes(base)));

    if (!parent) {
      return {
        ...row,
        parentTournamentId: null,
        parentTournamentName: null,
        verifiedTierOneChild: false
      };
    }

    return {
      ...row,
      parentTournamentId: parent.item.id,
      parentTournamentName: parent.item.name,
      verifiedTierOneChild: true,
      tier: 1
    };
  });
}
