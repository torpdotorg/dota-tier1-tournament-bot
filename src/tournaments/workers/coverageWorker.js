import { tournamentMessageKey } from '../coverageRuntime.js';

export class CoverageWorker {
  constructor({ context, adapter, publish = false }) {
    this.context = context;
    this.adapter = adapter;
    this.publish = publish;
    this.state = 'created';
    this.lastPollAt = null;
    this.lastError = null;
    this.snapshot = null;
  }
  async validate() {
    const health = await this.adapter.healthCheck(this.context);
    if (health?.status !== 'healthy') throw new Error(health?.reason || 'Provider adapter is not healthy');
    const schedule = await this.adapter.getSchedule(this.context);
    if (!Array.isArray(schedule)) throw new Error('Provider adapter returned an invalid schedule');
    return { health, schedule };
  }
  async start() {
    const validated = await this.validate();
    this.state = this.publish ? 'running' : 'observing';
    this.snapshot = validated;
    return this.status();
  }
  stop() { this.state = 'stopped'; return this.status(); }
  async poll() {
    if (!['running','observing'].includes(this.state)) return this.status();
    try {
      const [schedule, liveGames, results] = await Promise.all([
        this.adapter.getSchedule(this.context),
        this.adapter.getLiveGames(this.context),
        this.adapter.getRecentResults(this.context)
      ]);
      this.lastPollAt = new Date().toISOString();
      this.lastError = null;
      this.snapshot = { schedule, liveGames, results };
    } catch (error) {
      this.lastError = error.message;
      this.state = 'degraded';
    }
    return this.status();
  }
  key(scope, entityId = null) { return tournamentMessageKey(this.context.id, scope, entityId); }
  status() {
    return {
      tournamentId: this.context.id,
      tournamentName: this.context.name,
      adapter: this.adapter.name,
      state: this.state,
      publish: this.publish,
      lastPollAt: this.lastPollAt,
      lastError: this.lastError
    };
  }
}
