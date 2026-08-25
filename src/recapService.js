import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { config } from './config.js';
import { buildBracket, playoffSessions } from './bracket.js';
import { getSetting, getTrackedMatches, hasNotification, saveNotification, setSetting } from './db.js';
import { getTiLiveGames } from './providers/steam.js';
import { refreshBracket } from './bracketService.js';
import { teamLabel } from './teamEmojiService.js';

const LIQUIPEDIA='https://liquipedia.net/dota2/The_International/2026/Main_Event';
const TWITCH='https://www.twitch.tv/dota2ti';
const YOUTUBE='https://www.youtube.com/@dota2/streams';

function complete(slot){return slot.sa!==null&&slot.sb!==null&&Math.max(slot.sa,slot.sb)>=slot.winsNeeded;}
function winner(slot){return slot.sa>slot.sb?slot.a:slot.b;}
function loser(slot){return slot.sa>slot.sb?slot.b:slot.a;}
function score(slot){return slot.sa>slot.sb?`${slot.sa}–${slot.sb}`:`${slot.sb}–${slot.sa}`;}
function ts(value,style='F'){return `<t:${Math.floor(new Date(value).getTime()/1000)}:${style}>`;}
function shanghaiDate(value){return new Intl.DateTimeFormat('en-CA',{timeZone:config.tournamentTimezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}

export async function evaluateEndOfDayRecaps(client,{forceSession=null}={}){
 let bracket;
 let live;
 try {
  bracket=await buildBracket();
  live=await getTiLiveGames();
 } catch(error) {
  console.warn(`[Recap] Check skipped — ${error.message}. The next scheduled check will try again.`);
  return {status:'data-unavailable',reason:error.message};
 }
 if(live.length&&!forceSession)return {status:'live-games'};
 const sessions=forceSession?[forceSession]:Object.keys(playoffSessions);
 for(const id of sessions){
  const session=playoffSessions[id]; if(!session)continue;
  const key=`recap:ti2026:${id}`; if(hasNotification(key)&&!forceSession)continue;
  const slots=session.slots.map(n=>bracket.slots[n-1]);
  if(slots.some(x=>!complete(x)))continue;
  // For normal automation, do not announce before the scheduled Shanghai date.
  const nowDate=shanghaiDate(new Date());
  if(!forceSession&&nowDate<session.shanghaiDate)continue;
  const markerKey=`recap_ready_at:${id}`;
  let readyAt=Number(getSetting(markerKey)||0);
  if(!readyAt){readyAt=Date.now();setSetting(markerKey,String(readyAt));return {status:'cooldown-started',session:id};}
  if(!forceSession&&Date.now()-readyAt<config.recapDelayMinutes*60000)continue;
  await refreshBracket(client,{force:true,create:true});
  const channel=await client.channels.fetch(config.updatesChannelId); if(!channel?.isTextBased())throw new Error('Updates channel is unavailable.');
  const payload=buildRecapPayload(id,session,slots,bracket);
  const message=await channel.send(payload); saveNotification(key,message.id); setSetting(markerKey,'0');
  return {status:'posted',session:id,messageId:message.id};
 }
 return {status:'not-ready'};
}

function dayMvp(slots){
 const teams=new Set(slots.flatMap(x=>[x.a,x.b]));
 const candidates=getTrackedMatches().filter(x=>x.status==='ended'&&x.top&&[x.radiant,x.dire].some(t=>teams.has(t)));
 if(!candidates.length)return null;
 return candidates.sort((a,b)=>{
   const score=x=>(Number(x.top.kills||0)*2)+Number(x.top.assists||0)-Number(x.top.deaths||0)+(Number(x.top.gpm||0)/100);
   return score(b)-score(a);
 })[0];
}
export function buildRecapPayload(id,session,slots,bracket){
 const tournamentStart='2026-08-13';
 const tournamentEnd='2026-08-23';
 const mainEventStart='2026-08-20';
 const totalTournamentDays=11;
 const totalMainEventDays=4;
 const dateValue=new Date(`${session.shanghaiDate}T12:00:00+08:00`);
 const dayNumber=(start,current)=>Math.floor((Date.parse(`${current}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000)+1;
 const tournamentDay=Math.max(1,Math.min(totalTournamentDays,dayNumber(tournamentStart,session.shanghaiDate)));
 const mainEventDay=Math.max(1,Math.min(totalMainEventDays,dayNumber(mainEventStart,session.shanghaiDate)));
 const placementBySlot={9:'5th–6th',10:'5th–6th',12:'4th',13:'3rd',14:'2nd'};
 const resultText=(slot)=>{
  const lines=[`**${teamLabel(winner(slot))} ${score(slot)} ${teamLabel(loser(slot))}**`,slot.stage];
  const placement=placementBySlot[slot.number];
  if(placement)lines.push(`${teamLabel(loser(slot))} eliminated (${placement})`);
  return lines.join('\n');
 };
 const results=slots.map(resultText).join('\n\n');
 const now=Date.now();
 const future=session.nextSlots
  .map(n=>bracket.slots[n-1])
  .filter(x=>x&&x.beginAt&&new Date(x.beginAt).getTime()>now);
 const lowerFinal=bracket.slots[12];
 const nextText=future.length?future.map(x=>{
   const when=`${ts(x.beginAt,'F')} • ${ts(x.beginAt,'R')}`;
   let matchup=`${teamLabel(x.a)} vs ${teamLabel(x.b)}`;
   if(x.number===14&&x.b==='TBD'&&lowerFinal?.a!=='TBD'&&lowerFinal?.b!=='TBD'){
    matchup=`${teamLabel(x.a)} vs Winner of ${teamLabel(lowerFinal.a)} vs ${teamLabel(lowerFinal.b)}`;
   }
   return `**${matchup}**\n${x.stage} • ${x.seriesFormat?.label||'Series'}\n${when}`;
  }).join('\n\n'):'No future matches remain.';
 const remaining=bracket.slots.filter(x=>x.sa===null||x.sb===null).filter(x=>x.a!=='TBD'||x.b!=='TBD').length;
 const status=[
  `Tournament: ${tournamentStart} to ${tournamentEnd}`,
  `Tournament day ${tournamentDay} of ${totalTournamentDays}`,
  `Main Event day ${mainEventDay} of ${totalMainEventDays}`,
  `Remaining series: ${remaining}`
 ].join('\n');
 const embed=new EmbedBuilder().setColor(0xD4AF37).setTitle(`TI 2026 • ${session.label.toUpperCase()} COMPLETE`)
  .setDescription(`**MAIN EVENT • SHANGHAI**\n━━━━━━━━━━━━━━━━━━━━\nThe bracket has been updated. Match times display in each member’s local timezone.`)
  .addFields(
   {name:'TOURNAMENT STATUS',value:status},
   {name:'TODAY’S RESULTS',value:results},
   {name:session.nextSlots.length?'UPCOMING MATCHES':'TOURNAMENT COMPLETE',value:nextText}
  );
 const mvp=dayMvp(slots);
 if(mvp)embed.addFields({name:'PERFORMANCE OF THE DAY',value:`**${mvp.top.name}** (${teamLabel(mvp.winner||mvp.radiant)})\n${mvp.top.kills}/${mvp.top.deaths}/${mvp.top.assists} KDA\n${mvp.top.gpm} GPM • ${mvp.top.xpm} XPM`});
 embed.setFooter({text:`Tournament session: ${session.shanghaiDate} • Full bracket on Liquipedia`}).setTimestamp(dateValue);
 const row=new ActionRowBuilder().addComponents(
  new ButtonBuilder().setLabel('Full Bracket').setStyle(ButtonStyle.Link).setURL(LIQUIPEDIA),
  new ButtonBuilder().setLabel('Watch on Twitch').setStyle(ButtonStyle.Link).setURL(TWITCH),
  new ButtonBuilder().setLabel('Watch on YouTube').setStyle(ButtonStyle.Link).setURL(YOUTUBE)
 );
 return {embeds:[embed],components:[row]};
}
