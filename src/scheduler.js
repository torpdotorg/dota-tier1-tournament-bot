import cron from 'node-cron';
import { ChannelType } from 'discord.js';
import { config } from './config.js';
import { getSchedule } from './providers/valveLeague.js';
import { getTiLiveGames, getVerifiedMatchAndSeries, simplifyLiveGame } from './providers/steam.js';
import { scheduleEmbed, dailyOverviewEmbed, completedMatchEmbed, gameStartedEmbed, gameUpdateEmbed } from './formatters.js';
import { heroNames, proPlayerNames } from './providers/opendota.js';
import { refreshBracket } from './bracketService.js';
import { buildBracket } from './bracket.js';
import { evaluateEndOfDayRecaps } from './recapService.js';
import { hasNotification, saveNotification, getTrackedMatches, setMatchState, getNotificationMessageId } from './db.js';
import { syncTeamRegistry } from './teamRegistry.js';
import { teamLabel } from './teamEmojiService.js';
import { refreshSeriesOverview } from './seriesOverview.js';
import { configuredTournamentIsComplete } from './tournamentConfig.js';
let lastLiveTeamSignature=null;
const MAX_ENRICHMENT_ATTEMPTS=40;
function enrichmentDelayMinutes(attemptsCompleted){
 if(attemptsCompleted<10)return 1;
 if(attemptsCompleted<18)return 15;
 return 60;
}
const today=(value)=>new Intl.DateTimeFormat('en-CA',{timeZone:config.timezone}).format(new Date(value))===new Intl.DateTimeFormat('en-CA',{timeZone:config.timezone}).format(new Date());
async function channel(client){if(!config.updatesChannelId)return null;const c=await client.channels.fetch(config.updatesChannelId);return c?.isTextBased()?c:null;}
async function daily(client){if(configuredTournamentIsComplete())return;const c=await channel(client);if(!c)return;const day=new Intl.DateTimeFormat('en-CA',{timeZone:config.timezone}).format(new Date());const key=`schedule:${day}`;if(hasNotification(key))return;const bracket=await buildBracket();const slots=bracket.slots.filter(slot=>slot.beginAt&&today(slot.beginAt));const msg=await c.send({embeds:[dailyOverviewEmbed(slots)]});saveNotification(key,msg.id);if(c.type===ChannelType.GuildAnnouncement){try{await msg.crosspost();console.log(`Published daily overview as an announcement for ${day}.`);}catch(error){console.warn(`Daily overview was posted but could not be published: ${error.message}`);}}}
function sameTeams(match, liveGame) {
  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const expected = new Set((match.teams || []).map(normalize));
  return expected.has(normalize(liveGame.radiant)) && expected.has(normalize(liveGame.dire));
}
async function prematch(client) {if(configuredTournamentIsComplete())return;
  const c = await channel(client);
  if (!c) return;
  const now = Date.now();
  const schedule = await getSchedule();
  let live = [];
  try {
    live = (await getTiLiveGames()).map(simplifyLiveGame);
  } catch (error) {
    console.warn(`[Prematch] Live-state check unavailable — ${error.message}. Reminder check skipped to avoid announcing the wrong series.`);
    return;
  }
  for (const match of schedule) {
    const mins = (new Date(match.beginAt).getTime() - now) / 60000;
    const key = `series:${match.id}:prematch-${config.prematchMinutes}`;
    if (mins <= 0 || mins > config.prematchMinutes || hasNotification(key)) continue;
    const anotherSeriesIsLive = live.some((game) => !sameTeams(match, game));
    if (anotherSeriesIsLive) {
      console.log(`[Prematch] Suppressed ${match.teams[0]} vs ${match.teams[1]} reminder because another TI series is still live.`);
      continue;
    }
    const hasTbd = match.teams.some((team) => !team || team === 'TBD');
    if (hasTbd) {
      console.log(`[Prematch] Suppressed unresolved reminder for ${match.name || match.id}.`);
      continue;
    }
    const message = await c.send(`⏰ **${teamLabel(match.teams[0],match.teamIds?.[0])} vs ${teamLabel(match.teams[1],match.teamIds?.[1])}** is scheduled to start in about ${Math.ceil(mins)} minutes.\n📺 https://www.twitch.tv/dota2ti`);
    saveNotification(key, message.id);
  }
}
async function ends(client){if(configuredTournamentIsComplete())return;const c=await channel(client);if(!c||!config.steamApiKey)return;const [rawLive,schedule]=await Promise.all([getTiLiveGames(),getSchedule().catch(()=>[])]);const live=rawLive.map(simplifyLiveGame);if(live.length){const liveTeams=live.flatMap(g=>[{teamId:g.radiantTeamId,name:g.radiant},{teamId:g.direTeamId,name:g.dire}]);const signature=liveTeams.map(t=>String(t.teamId||t.name)).sort().join('|');if(signature!==lastLiveTeamSignature){lastLiveTeamSignature=signature;syncTeamRegistry(liveTeams).catch(error=>console.warn(`[Teams] Live sync skipped: ${error.message}`));}}else{lastLiveTeamSignature=null;}const ids=new Set(live.map(x=>x.matchId));for(const g of live){const previous=getTrackedMatches().find(x=>x.matchId===g.matchId);setMatchState(g.matchId,{...previous,...g,dataSource:'Valve live league feed'});const startKey=`match:${g.matchId}:started`;if(g.gameTime>=60&&g.gameTime<300&&!hasNotification(startKey)){const [heroes,players]=await Promise.all([heroNames().catch(()=>({})),proPlayerNames().catch(()=>({}))]);const scheduled=schedule.find(m=>sameTeams(m,g))||null;const msg=await c.send({embeds:[gameStartedEmbed(g,heroes,players,scheduled)]});saveNotification(startKey,msg.id);}const interval=config.gameUpdateIntervalMinutes;const currentMinute=Math.floor(Number(g.gameTime||0)/60);const latestInterval=Math.floor(currentMinute/interval)*interval;if(latestInterval>=interval){const latestKey=`match:${g.matchId}:update-${latestInterval}`;if(!hasNotification(latestKey)){for(let missed=interval;missed<latestInterval;missed+=interval){const missedKey=`match:${g.matchId}:update-${missed}`;if(!hasNotification(missedKey))saveNotification(missedKey,null);}const [heroes,players]=await Promise.all([heroNames().catch(()=>({})),proPlayerNames().catch(()=>({}))]);const msg=await c.send({embeds:[gameUpdateEmbed(g,heroes,players,latestInterval)]});saveNotification(latestKey,msg.id);}}}for(const old of getTrackedMatches()){if(old.status!=='active'||ids.has(old.matchId))continue;if(Number(old.nextFinalRetryAt||0)>Date.now())continue;if(Number(old.finalRetryAttempts||0)>=12){setMatchState(old.matchId,{...old,status:'result-unavailable'});console.warn(`[OpenDota] Match ${old.matchId} unavailable after 12 retries; automatic result processing stopped.`);continue;}if(Date.now()-Number(old.lastSeenAt||0)>21600000){setMatchState(old.matchId,{...old,status:'expired'});continue;}const miss=Number(old.missingPolls||0)+1;if(miss<2){setMatchState(old.matchId,{...old,missingPolls:miss});continue;}const key=`match:${old.matchId}:end`;if(hasNotification(key)){setMatchState(old.matchId,{...old,status:'ended'});continue;}try{const {match:d,series}=await getVerifiedMatchAndSeries(old.matchId);if(!d)continue;const winner=d.radiantWin?d.radiant:d.dire;const needsEnrichment=!d.largestLead;setMatchState(old.matchId,{...old,...d,status:'ended',winner,seriesContext:series,enrichmentStatus:needsEnrichment?'pending':'complete',enrichmentAttempts:0,nextEnrichmentAt:needsEnrichment?Date.now()+60000:null,dataSource:'Valve/OpenDota verified result'});const msg=await c.send({embeds:[completedMatchEmbed(d,series)]});saveNotification(key,msg.id);await refreshSeriesOverview(client,{force:true,create:true});if(series?.complete){await refreshBracket(client,{force:true,create:true});await evaluateEndOfDayRecaps(client);}}catch(e){const attempts=Number(old.finalRetryAttempts||0)+1;const delays=[5,15,30,60,120,240];const delay=delays[Math.min(attempts-1,delays.length-1)];setMatchState(old.matchId,{...old,finalRetryAttempts:attempts,nextFinalRetryAt:Date.now()+delay*60000});if([1,3,6].includes(attempts))console.log(`[OpenDota] Match ${old.matchId} is not parsed yet. Retry ${attempts} in ${delay} minutes.`);}}}
async function enrichCompletedReports(client){if(configuredTournamentIsComplete())return;
 const c=await channel(client);if(!c)return;
 const rows=getTrackedMatches().filter(x=>x.status==='ended'&&['pending','delayed'].includes(x.enrichmentStatus)&&Number(x.nextEnrichmentAt||0)<=Date.now());
 for(const old of rows){
  const attempts=Number(old.enrichmentAttempts||0);
  if(attempts>=MAX_ENRICHMENT_ATTEMPTS){setMatchState(old.matchId,{...old,enrichmentStatus:'unavailable',nextEnrichmentAt:null});console.warn(`[Enrichment] Match ${old.matchId} gold timeline unavailable after ${MAX_ENRICHMENT_ATTEMPTS} attempts.`);continue;}
  try{
   const {match:d,series}=await getVerifiedMatchAndSeries(old.matchId);
   if(!d?.largestLead)throw new Error('radiant_gold_adv is not parsed yet');
   const key=`match:${old.matchId}:end`;const messageId=getNotificationMessageId(key);
   if(messageId){const message=await c.messages.fetch(messageId);await message.edit({embeds:[completedMatchEmbed(d,series||old.seriesContext||null)]});}
   setMatchState(old.matchId,{...old,...d,seriesContext:series||old.seriesContext||null,enrichmentStatus:'complete',enrichmentAttempts:attempts+1,nextEnrichmentAt:null,dataSource:'OpenDota replay enrichment'});
   console.log(`[Enrichment] Match ${old.matchId} report updated with biggest gold lead.`);
  }catch(error){
   const nextAttempt=attempts+1;
   const delayMinutes=enrichmentDelayMinutes(nextAttempt);
   const phase=nextAttempt<=10?'fast':(nextAttempt<=18?'delayed':'background');
   setMatchState(old.matchId,{...old,enrichmentStatus:phase==='fast'?'pending':'delayed',enrichmentAttempts:nextAttempt,nextEnrichmentAt:Date.now()+delayMinutes*60000});
   if([1,5,10,11,18,19,30,40].includes(nextAttempt))console.log(`[Enrichment] Match ${old.matchId} replay details pending. Attempt ${nextAttempt} of ${MAX_ENRICHMENT_ATTEMPTS}; ${phase} phase, retrying in ${delayMinutes} minute${delayMinutes===1?'':'s'}.`);
  }
 }
}
export function startScheduler(client){cron.schedule(config.dailyScheduleCron,()=>daily(client).catch(console.error),{timezone:config.timezone,noOverlap:true});cron.schedule('* * * * *',()=>prematch(client).catch(console.error),{timezone:config.timezone,noOverlap:true});setInterval(()=>ends(client).catch(console.error),config.matchPollSeconds*1000).unref();setTimeout(()=>ends(client).catch(console.error),5000).unref();setTimeout(()=>{if(!configuredTournamentIsComplete())refreshBracket(client,{create:true}).catch(console.error);},10000).unref();setInterval(()=>{if(!configuredTournamentIsComplete())refreshBracket(client,{create:true}).catch(console.error);},config.bracketRefreshMinutes*60000).unref();setTimeout(()=>{if(!configuredTournamentIsComplete())evaluateEndOfDayRecaps(client).catch(console.error);},15000).unref();setInterval(()=>{if(!configuredTournamentIsComplete())evaluateEndOfDayRecaps(client).catch(console.error);},60000).unref();setTimeout(()=>enrichCompletedReports(client).catch(console.error),20000).unref();setInterval(()=>enrichCompletedReports(client).catch(console.error),60000).unref();setTimeout(()=>{if(!configuredTournamentIsComplete())refreshSeriesOverview(client,{create:true}).catch(console.error);},25000).unref();setInterval(()=>{if(!configuredTournamentIsComplete())refreshSeriesOverview(client,{create:true}).catch(console.error);},60000).unref();console.log(`Configured tournament scheduler started for league ${config.tiLeagueId}: game-start announcements, recurring updates, results, bracket, series overview and recaps.`);}
