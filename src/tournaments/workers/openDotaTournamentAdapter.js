import { TournamentProviderAdapter } from './providerAdapter.js';

const API = 'https://api.opendota.com/api';
const cache = new Map();
const CACHE_MS = 60_000;

async function fetchJson(url, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function cached(key, loader) {
  const existing = cache.get(key);
  if (existing && Date.now() - existing.at < CACHE_MS) return existing.value;
  const value = await loader();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function normalizeOpenDotaSeries(match) {
  const radiant = match.radiant_name || `Team ${match.radiant_team_id || 'TBD'}`;
  const dire = match.dire_name || `Team ${match.dire_team_id || 'TBD'}`;
  return {
    id: String(match.match_id),
    externalId: String(match.match_id),
    leagueId: String(match.leagueid || ''),
    beginAt: match.start_time ? new Date(Number(match.start_time) * 1000).toISOString() : null,
    teams: [radiant, dire],
    teamIds: [match.radiant_team_id ? String(match.radiant_team_id) : null, match.dire_team_id ? String(match.dire_team_id) : null],
    radiant,
    dire,
    radiantWin: typeof match.radiant_win === 'boolean' ? match.radiant_win : null,
    duration: Number(match.duration || 0),
    status: typeof match.radiant_win === 'boolean' ? 'completed' : 'scheduled',
    source: 'OpenDota'
  };
}

export class OpenDotaTournamentAdapter extends TournamentProviderAdapter {
  constructor() { super('opendota-context'); }
  supports(context) { return context.coverage !== 'configured' && Boolean(context.leagueId); }
  async leagueMatches(context) {
    const leagueId = String(context.leagueId);
    const rows = await cached('proMatches', () => fetchJson(`${API}/proMatches`));
    return (Array.isArray(rows) ? rows : [])
      .filter(match => String(match.leagueid || '') === leagueId)
      .map(normalizeOpenDotaSeries)
      .sort((a, b) => Date.parse(a.beginAt || 0) - Date.parse(b.beginAt || 0));
  }
  async getSchedule(context) { return this.leagueMatches(context); }
  async getStandings() { return []; }
  async getLiveGames() { return []; }
  async getRecentResults(context) {
    return (await this.leagueMatches(context)).filter(match => match.status === 'completed').slice(-20);
  }
  async healthCheck(context) {
    if (!this.supports(context)) return { status: 'unavailable', reason: 'Tournament has no compatible league ID' };
    try {
      await this.leagueMatches(context);
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'failed', reason: error.message };
    }
  }
}
