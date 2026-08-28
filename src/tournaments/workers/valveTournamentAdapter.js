import { TournamentProviderAdapter } from './providerAdapter.js';
import { getLeagueSchedule,getLeagueStandings } from '../../providers/valveLeague.js';
import { getLiveLeagueGames,getRecentLeagueMatches,simplifyLiveGame } from '../../providers/steam.js';
export class ValveTournamentAdapter extends TournamentProviderAdapter{
  constructor(){super('valve-context');}
  supports(context){return Boolean(context?.leagueId);}
  capabilities(context){const ok=this.supports(context);return{schedule:ok,standings:ok,liveGames:ok,results:ok,heroes:ok,teamProfile:ok};}
  async getSchedule(context){return getLeagueSchedule(context);}
  async getStandings(context){return getLeagueStandings(context);}
  async getLiveGames(context){return(await getLiveLeagueGames(context)).map(simplifyLiveGame);}
  async getRecentResults(context){return getRecentLeagueMatches(context,20);}
  async healthCheck(context){if(!this.supports(context))return{status:'unavailable',reason:'Tournament has no league ID'};try{await this.getSchedule(context);return{status:'healthy'};}catch(error){return{status:'failed',reason:error.message};}}
}
