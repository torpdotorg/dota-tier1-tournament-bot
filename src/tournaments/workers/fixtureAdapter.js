import { TournamentProviderAdapter } from './providerAdapter.js';
export class FixtureTournamentAdapter extends TournamentProviderAdapter {
  constructor(fixtures = {}) { super('fixture'); this.fixtures = fixtures; }
  supports(context) { return Boolean(this.fixtures[context.id]); }
  data(context) { return this.fixtures[context.id] || {}; }
  async getSchedule(context) { return this.data(context).schedule || []; }
  async getStandings(context) { return this.data(context).standings || []; }
  async getLiveGames(context) { return this.data(context).liveGames || []; }
  async getRecentResults(context) { return this.data(context).results || []; }
  async healthCheck(context) { return this.supports(context) ? { status: 'healthy' } : { status: 'unavailable' }; }
}
