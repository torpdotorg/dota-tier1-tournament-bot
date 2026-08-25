export class TournamentProviderAdapter {
  constructor(name) { this.name = name; }
  supports() { return false; }
  async getSchedule() { return []; }
  async getStandings() { return []; }
  async getLiveGames() { return []; }
  async getRecentResults() { return []; }
  async healthCheck() { return { status: 'unknown' }; }
}
