import { config } from '../config.js';
import { dayBoundsUtc, fetchJson, isTodayInZone, teamName } from '../utils.js';

const baseUrl = 'https://api.pandascore.co';

export async function getTodaySchedule() {
  if (!config.pandaScoreApiKey) return [];
  const { start, end } = dayBoundsUtc(config.timezone);
  const params = new URLSearchParams({
    'range[begin_at]': `${start},${end}`,
    sort: 'begin_at',
    per_page: '100'
  });
  if (config.pandaScoreTournamentId) params.set('filter[tournament_id]', config.pandaScoreTournamentId);
  const data = await fetchJson(`${baseUrl}/dota2/matches?${params}`, {
    headers: { Authorization: `Bearer ${config.pandaScoreApiKey}`, Accept: 'application/json' }
  });
  return data.filter((m) => m.begin_at && isTodayInZone(m.begin_at, config.timezone)).map((m) => ({
    id: String(m.id),
    name: m.name,
    beginAt: m.begin_at,
    status: m.status,
    numberOfGames: m.number_of_games,
    teams: [teamName(m.opponents?.[0]), teamName(m.opponents?.[1])],
    league: m.league?.name,
    tournament: m.tournament?.name,
    streams: m.streams_list || []
  }));
}
