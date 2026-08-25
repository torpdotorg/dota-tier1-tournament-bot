import { TournamentProviderAdapter } from './providerAdapter.js';
import { getSchedule, getStandings } from '../../providers/valveLeague.js';
import { getTiLiveGames } from '../../providers/steam.js';
export class ConfiguredTournamentAdapter extends TournamentProviderAdapter {
  constructor() { super('configured'); }
  supports(context) { return context.coverage === 'configured'; }
  async getSchedule() { return getSchedule(); }
  async getStandings() { return getStandings(); }
  async getLiveGames() { return getTiLiveGames(); }
  async getRecentResults() { return []; }
  async healthCheck() { return { status: 'healthy' }; }
}
