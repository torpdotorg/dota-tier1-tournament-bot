import { listTournaments } from './catalog.js';
import { resolveTournamentAdapter } from './workers/adapterRegistry.js';

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function selectableTournaments() {
  return listTournaments()
    .filter(row => !['rejected'].includes(row.state))
    .sort((a, b) => {
      const rank = { active: 0, upcoming: 1, completed: 2, monitoring: 3 };
      return (rank[a.state] ?? 9) - (rank[b.state] ?? 9)
        || String(a.startDate || '9999').localeCompare(String(b.startDate || '9999'));
    });
}

export function resolveCommandTournament(query = null) {
  const rows = selectableTournaments();
  if (query) {
    const key = normalize(query);
    const exact = rows.find(row => [row.id, row.name, row.shortName, row.leagueId]
      .filter(Boolean).some(value => normalize(value) === key));
    if (exact) return exact;
    const partial = rows.find(row => [row.id, row.name, row.shortName, row.leagueId]
      .filter(Boolean).some(value => normalize(value).includes(key) || key.includes(normalize(value))));
    if (partial) return partial;
    return null;
  }
  return rows.find(row => row.activationState === 'active-coverage')
    || rows.find(row => row.state === 'active' && row.eventType === 'main')
    || rows.find(row => row.state === 'upcoming' && row.eventType === 'main')
    || rows.find(row => row.state === 'active')
    || rows.find(row => row.state === 'upcoming')
    || null;
}

export function tournamentChoices(input = '', limit = 25) {
  const key = normalize(input);
  return selectableTournaments()
    .filter(row => !key || normalize(row.name).includes(key) || normalize(row.shortName).includes(key))
    .slice(0, limit)
    .map(row => ({ name: `${row.name} (${row.state})`.slice(0, 100), value: row.id.slice(0, 100) }));
}

export function commandTournamentCapability(event) {
  if (!event) return { available: false, reason: 'Tournament not found', adapter: null };
  const adapter = resolveTournamentAdapter(event);
  if (!adapter) return { available: false, reason: 'No compatible provider adapter is available yet', adapter: null };
  return { available: true, reason: null, adapter };
}
