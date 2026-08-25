import crypto from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { config } from './config.js';
import { getTrackedMatches, getSetting, setSetting } from './db.js';
import { getSchedule } from './providers/valveLeague.js';
import { normalizeSeriesFormat } from './seriesFormat.js';
import { teamLabel } from './teamEmojiService.js';
import {normalizeTeam as norm,teamPairKey as teamKey,selectSeriesScore,currentGameNumber,selectClosestSchedule} from './seriesLogic.js';
import {validatePayload} from './lib/payloadValidator.js';

const TWITCH='https://www.twitch.tv/dota2ti';
const YOUTUBE='https://www.youtube.com/@dota2/streams';
const MESSAGE_KEY='series_overview_message_id';
const SIGNATURE_KEY='series_overview_signature';
const gameTime=game=>Number(game.startTime||game.lastSeenAt||game.updatedAt||game.matchId||0);
const duration=value=>`${Math.floor(Number(value||0)/60)}:${String(Number(value||0)%60).padStart(2,'0')}`;

function currentSeriesGames(){
 const tracked=getTrackedMatches().filter(x=>['active','ended'].includes(x.status)&&x.radiant&&x.dire);
 if(!tracked.length)return [];
 const active=tracked.filter(x=>x.status==='active').sort((a,b)=>gameTime(b)-gameTime(a))[0]||null;
 const anchor=active||tracked.sort((a,b)=>gameTime(b)-gameTime(a))[0];
 const key=teamKey(anchor.radiant,anchor.dire);
 const anchorTime=gameTime(anchor);
 const sameTeams=tracked.filter(game=>teamKey(game.radiant,game.dire)===key);
 const sameWindow=sameTeams.filter(game=>{
  const time=gameTime(game);
  return !anchorTime||!time||Math.abs(anchorTime-time)<=24*60*60*1000;
 });
 return (sameWindow.length?sameWindow:sameTeams).sort((a,b)=>{
  const aId=Number(a.matchId||0),bId=Number(b.matchId||0);
  if(aId&&bId&&aId!==bId)return aId-bId;
  return gameTime(a)-gameTime(b);
 });
}
function canonicalTeams(games){
 const active=games.find(game=>game.status==='active');
 const first=active||games[0]||{};
 return [first.radiant||'TBD',first.dire||'TBD'];
}
function teamId(game,team){return norm(game.radiant)===norm(team)?game.radiantTeamId:game.direTeamId;}
function teamScore(game,team){return norm(game.radiant)===norm(team)?Number(game.radiantScore||0):Number(game.direScore||0);}
function teamDraft(game,team){const list=norm(game.radiant)===norm(team)?game.radiantDraft:game.direDraft;return list?.length?list.join(', '):'Draft pending';}
function gameBlock(game,index,a,b){
 const aLabel=teamLabel(a,teamId(game,a)),bLabel=teamLabel(b,teamId(game,b));
 const aScore=teamScore(game,a),bScore=teamScore(game,b);
 let state='Scheduled';
 if(game.status==='active')state=`In progress • ${aScore}–${bScore}`;
 if(game.status==='ended')state=`${teamLabel(game.winner,teamId(game,game.winner))} won • ${aScore}–${bScore} • ${duration(game.duration)}`;
 const lead=game.largestLead?.value?`\nBiggest lead: ${teamLabel(game.largestLead.team,teamId(game,game.largestLead.team))} +${Number(game.largestLead.value).toLocaleString('en-US')} gold`:'';
 return `**Game ${index+1}**\n${state}${lead}\n${aLabel}: ${teamDraft(game,a)}\n${bLabel}: ${teamDraft(game,b)}`;
}
function chunks(values,max=1000){const result=[];let current='';for(const value of values){if(current&&current.length+value.length+2>max){result.push(current);current=value;}else current=current?`${current}\n\n${value}`:value;}if(current)result.push(current);return result;}

export async function buildCurrentSeriesOverview(){
 const games=currentSeriesGames();
 if(!games.length)return {embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('TI 2026 • SERIES OVERVIEW').setDescription('No tracked series is available yet.')],components:[],signature:'empty'};
 const [a,b]=canonicalTeams(games);
 const liveGame=games.find(game=>game.status==='active')||null;
 const score=selectSeriesScore(games,a,b,liveGame);
 const schedule=selectClosestSchedule(await getSchedule().catch(()=>[]),a,b);
 const format=schedule?.seriesFormat||games[0].seriesFormat||normalizeSeriesFormat({seriesType:games[0].seriesType,bestOf:schedule?.bestOf,stage:schedule?.stage});
 const bestOf=Number(format?.bestOf||schedule?.bestOf||5),stage=liveGame?.stage||schedule?.stage||games.at(-1)?.stage||'TI 2026';
 const completed=games.filter(g=>g.status==='ended').length,live=Boolean(liveGame);
 const embed=new EmbedBuilder().setColor(live?0xED4245:0x5865F2).setTitle('TI 2026 • SERIES OVERVIEW')
  .setDescription(`**${teamLabel(a,teamId(games[0],a))} ${score[a]}–${score[b]} ${teamLabel(b,teamId(games[0],b))}**\n${stage} • ${format?.label||`Bo${bestOf}`}`);
 const liveNumber=liveGame?currentGameNumber(score):null;
 const numberedGames=games.slice(-bestOf).map((game,index,array)=>({game,number:game===liveGame&&liveNumber?liveNumber:(liveNumber?Math.max(1,liveNumber-(array.length-index)):index+1)}));
 const gameFields=chunks(numberedGames.map(({game,number})=>gameBlock(game,number-1,a,b)));
 gameFields.forEach((value,index)=>embed.addFields({name:index===0?'GAMES':'GAMES CONTINUED',value}));
 const highestNumber=Math.max(0,...numberedGames.map(x=>x.number));
 const remaining=[];for(let number=highestNumber+1;number<=bestOf;number++)remaining.push(`Game ${number} • ${number===bestOf?'If required':'Not started'}`);
 if(remaining.length)embed.addFields({name:'REMAINING GAMES',value:remaining.join('\n')});
 if(format?.winsNeeded){const aNeed=Math.max(0,format.winsNeeded-score[a]),bNeed=Math.max(0,format.winsNeeded-score[b]);embed.addFields({name:'SERIES STATUS',value:`${teamLabel(a,teamId(games[0],a))} need ${aNeed} more game win${aNeed===1?'':'s'}\n${teamLabel(b,teamId(games[0],b))} need ${bNeed} more game win${bNeed===1?'':'s'}`});}
 embed.setFooter({text:`${completed} completed game${completed===1?'':'s'} • Updated automatically`}).setTimestamp();
 const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Watch on Twitch').setStyle(ButtonStyle.Link).setURL(TWITCH),new ButtonBuilder().setLabel('Watch on YouTube').setStyle(ButtonStyle.Link).setURL(YOUTUBE));
 const signature=crypto.createHash('sha256').update(JSON.stringify(games.map(g=>[g.matchId,g.status,g.radiantScore,g.direScore,g.winner,g.largestLead,g.radiantDraft,g.direDraft]))).digest('hex');
 const payload={embeds:[embed],components:[row],signature};const validation=validatePayload(payload);if(!validation.valid)throw new Error(`Series payload invalid: ${validation.errors.join(', ')}`);return payload;
}

let refreshInFlight=null,lastRefreshAt=0;
export async function refreshSeriesOverview(client,{force=false,create=false}={}){
 if(refreshInFlight)return refreshInFlight;
 if(!force&&Date.now()-lastRefreshAt<15000)return {status:'throttled'};
 refreshInFlight=(async()=>{
 const channel=await client.channels.fetch(config.updatesChannelId);if(!channel?.isTextBased())return {status:'no-channel'};
 const payload=await buildCurrentSeriesOverview();if(payload.signature==='empty')return {status:'empty'};
 if(!force&&getSetting(SIGNATURE_KEY)===payload.signature)return {status:'unchanged'};
 const storedId=getSetting(MESSAGE_KEY);let message=storedId?await channel.messages.fetch(storedId).catch(()=>null):null;
 if(message)await message.edit({embeds:payload.embeds,components:payload.components});
 else if(create){message=await channel.send({embeds:payload.embeds,components:payload.components});setSetting(MESSAGE_KEY,message.id);}
 else return {status:'missing'};
 setSetting(SIGNATURE_KEY,payload.signature);lastRefreshAt=Date.now();return {status:storedId?'updated':'created',messageId:message.id};
 })();try{return await refreshInFlight;}finally{refreshInFlight=null;}
}
