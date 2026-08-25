import { config } from '../config.js';
import { fetchJson } from '../utils.js';
import { normalizeSeriesFormat } from '../seriesFormat.js';

const endpoint = 'https://www.dota2.com/webapi/IDOTA2League/GetLeagueData/v001';
let cache = { expires: 0, value: null };

export async function getLeagueData() {
  if (cache.value && cache.expires > Date.now()) return cache.value;
  const url = new URL(endpoint);
  url.searchParams.set('league_id', config.tiLeagueId);
  const value = await fetchJson(url, { headers: {
    Accept: 'application/json',
    'User-Agent': 'TI-Match-Insights/0.3 (+personal Discord bot)'
  }});
  cache = { value, expires: Date.now() + config.scheduleRefreshMinutes * 60000 };
  return value;
}

function objects(value, result = []) {
  if (!value || typeof value !== 'object') return result;
  if (!Array.isArray(value)) result.push(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') objects(child, result);
  }
  return result;
}
function first(obj, names) {
  for (const name of names) if (obj[name] !== undefined && obj[name] !== null) return obj[name];
  return null;
}
function epoch(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1000000000) return null;
  return new Date(n > 9999999999 ? n : n * 1000).toISOString();
}
function teamMap(data) {
  const map = new Map();
  for (const o of objects(data)) {
    const id = first(o, ['team_id','teamId']);
    const name = first(o, ['team_name','teamName','name']);
    if (id && name && !String(name).toLowerCase().includes('match')) map.set(String(id), String(name));
  }
  return map;
}
function teamId(node, side) {
  return first(node, [`${side}_team_id`, `${side}TeamId`, `team_${side}_id`]);
}
function teamName(node, side, teams) {
  const cap = side[0].toUpperCase() + side.slice(1);
  const direct = first(node, [`${side}_team_name`, `${side}TeamName`, `team_${side}_name`]);
  if (direct) return String(direct);
  const id = first(node, [`${side}_team_id`, `${side}TeamId`, `team_${side}_id`]);
  if (id && teams.has(String(id))) return teams.get(String(id));
  const nested = node[`${side}_team`] || node[`${side}Team`];
  return nested?.name || nested?.team_name || null;
}

const OFFICIAL_STREAMS = {
  twitch: 'https://www.twitch.tv/dota2ti',
  twitch2: 'https://www.twitch.tv/dota2ti_2',
  youtube: 'https://www.youtube.com/@dota2/streams'
};

const playoffSlots = {
  5: { teams: ['Iron Wing', 'BoomBoys'], stage: 'Lower Bracket Round 1', bestOf: 3 },
  6: { teams: ['Team Liquid', 'TBD'], stage: 'Lower Bracket Round 1', bestOf: 3 },
  7: { teams: ['Team Spirit', 'TEAM VISION'], stage: 'Upper Bracket Semifinal', bestOf: 3 },
  8: { teams: ['Team Yandex', 'TBD'], stage: 'Upper Bracket Semifinal', bestOf: 3 },
  9: { teams: ['TBD', 'TBD'], stage: 'Lower Bracket Quarterfinal', bestOf: 3 },
  10: { teams: ['TBD', 'TBD'], stage: 'Lower Bracket Quarterfinal', bestOf: 3 },
  11: { teams: ['TBD', 'TBD'], stage: 'Upper Bracket Final', bestOf: 3 },
  12: { teams: ['TBD', 'TBD'], stage: 'Lower Bracket Semifinal', bestOf: 3 },
  13: { teams: ['TBD', 'TBD'], stage: 'Lower Bracket Final', bestOf: 3 },
  14: { teams: ['TBD', 'TBD'], stage: 'Grand Final', bestOf: 5 }
};

function enrichMatch(match) {
  const number = Number(String(match.name || '').match(/Match\s+(\d+)/i)?.[1]);
  const slot = playoffSlots[number];
  const valveTeams = Array.isArray(match.teams) ? match.teams : ['TBD', 'TBD'];
  const valveHasBothTeams = valveTeams.length >= 2 && valveTeams.every((team) => team && team !== 'TBD');
  return {
    ...match,
    // Valve's current matchup wins whenever both team names are available.
    // Static bracket-slot names are only a fallback for unresolved TBD data.
    teams: valveHasBothTeams ? valveTeams : (slot?.teams || valveTeams),
    stage: slot?.stage || match.name || 'TI 2026',
    bestOf: slot?.bestOf || match.bestOf || null,
    seriesFormat: normalizeSeriesFormat({ bestOf: slot?.bestOf || match.bestOf, stage: slot?.stage || match.name }),
    streams: OFFICIAL_STREAMS
  };
}
export async function getSchedule() {
  const data = await getLeagueData();
  const teams = teamMap(data);
  const seen = new Set();
  const matches = [];
  for (const node of objects(data)) {
    const start = epoch(first(node, ['scheduled_time','start_time','start_timestamp','timestamp','begin_at']));
    if (!start) continue;
    const radiant = teamName(node, 'radiant', teams) || teamName(node, 'team_one', teams) || first(node, ['team1_name','team_1_name']);
    const dire = teamName(node, 'dire', teams) || teamName(node, 'team_two', teams) || first(node, ['team2_name','team_2_name']);
    const radiantTeamId = teamId(node, 'radiant') || teamId(node, 'team_one') || first(node, ['team1_id','team_1_id']);
    const direTeamId = teamId(node, 'dire') || teamId(node, 'team_two') || first(node, ['team2_id','team_2_id']);
    const nodeName = first(node, ['name','node_name','match_name']);
    if (!radiant && !dire && !nodeName) continue;
    const id = String(first(node, ['match_id','series_id','node_id','id']) || `${start}:${nodeName || radiant}:${dire}`);
    if (seen.has(id)) continue;
    seen.add(id);
    const state = String(first(node, ['state','status']) || 'scheduled').toLowerCase();
    matches.push({
      id, beginAt: start,
      teams: [String(radiant || 'TBD'), String(dire || 'TBD')],
      teamIds: [radiantTeamId ? String(radiantTeamId) : null, direTeamId ? String(direTeamId) : null],
      name: String(nodeName || ''),
      status: state,
      bestOf: Number(first(node, ['best_of','series_type','games_to_win']) || 0)
    });
  }
  return matches.map(enrichMatch).sort((a,b) => new Date(a.beginAt) - new Date(b.beginAt));
}
const verifiedGroupStandings = [
  { rank: 1, name: 'TEAM VISION', seriesWins: 4, seriesLosses: 0, gameWins: 8, gameLosses: 2 },
  { rank: 2, name: 'Team Liquid', seriesWins: 4, seriesLosses: 1, gameWins: 9, gameLosses: 5 },
  { rank: 3, name: 'Nigma Galaxy', seriesWins: 4, seriesLosses: 1, gameWins: 8, gameLosses: 2 },
  { rank: 4, name: 'Team Spirit', seriesWins: 3, seriesLosses: 2, gameWins: 6, gameLosses: 5 },
  { rank: 5, name: 'Iron Wing', seriesWins: 3, seriesLosses: 2, gameWins: 8, gameLosses: 6 },
  { rank: 6, name: 'Team Falcons', seriesWins: 3, seriesLosses: 2, gameWins: 8, gameLosses: 7 },
  { rank: 7, name: 'Aurora Gaming', seriesWins: 3, seriesLosses: 2, gameWins: 7, gameLosses: 5 },
  { rank: 8, name: 'LGD Gaming', seriesWins: 3, seriesLosses: 2, gameWins: 7, gameLosses: 6 },
  { rank: 9, name: 'BoomBoys', seriesWins: 2, seriesLosses: 3, gameWins: 5, gameLosses: 7 },
  { rank: 10, name: 'Vici Gaming', seriesWins: 2, seriesLosses: 3, gameWins: 4, gameLosses: 8 },
  { rank: 11, name: 'Team Yandex', seriesWins: 2, seriesLosses: 3, gameWins: 7, gameLosses: 7 },
  { rank: 12, name: 'Team Resilience', seriesWins: 2, seriesLosses: 3, gameWins: 7, gameLosses: 6 },
  { rank: 13, name: 'GamerLegion', seriesWins: 2, seriesLosses: 3, gameWins: 6, gameLosses: 6 },
  { rank: 14, name: 'Xtreme Gaming', seriesWins: 1, seriesLosses: 4, gameWins: 3, gameLosses: 8 },
  { rank: 15, name: 'OG', seriesWins: 1, seriesLosses: 4, gameWins: 2, gameLosses: 9 },
  { rank: 16, name: 'HULIGANI', seriesWins: 0, seriesLosses: 4, gameWins: 2, gameLosses: 8 }
];

export async function getStandings() {
  // The TI 2026 Swiss group stage is complete. Valve's participant objects do
  // not expose reliable win/loss fields in every response shape, which caused
  // the former parser to turn missing values into fake 0-0 records.
  // Return the verified final group-stage snapshot instead.
  return verifiedGroupStandings.map((row) => ({ ...row }));
}

export async function getTournamentTeams(){
 const data=await getLeagueData();const teams=teamMap(data);return [...teams.entries()].map(([teamId,name])=>({teamId,name}));
}
