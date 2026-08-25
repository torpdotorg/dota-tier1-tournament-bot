import crypto from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getSchedule } from './providers/valveLeague.js';
import { getTrackedMatches } from './db.js';
import { normalizeSeriesFormat } from './seriesFormat.js';
import { teamLabel } from './teamEmojiService.js';

const LIQUIPEDIA='https://liquipedia.net/dota2/The_International/2026/Main_Event';
const TWITCH='https://www.twitch.tv/dota2ti';
export const playoffSessions={
  'playoff-day-1':{label:'Playoff Day 1',shanghaiDate:'2026-08-20',slots:[1,2,3,4],nextSlots:[5,6,7,8]},
  'playoff-day-2':{label:'Playoff Day 2',shanghaiDate:'2026-08-21',slots:[5,6,7,8],nextSlots:[9,10,11,12]},
  'playoff-day-3':{label:'Playoff Day 3',shanghaiDate:'2026-08-22',slots:[9,10,11,12],nextSlots:[13,14]},
  'playoff-day-4':{label:'Final Day',shanghaiDate:'2026-08-23',slots:[13,14],nextSlots:[]}
};

const completedBaseline={
  1:{a:'Iron Wing',b:'Team Spirit',sa:0,sb:2},
  2:{a:'TEAM VISION',b:'BoomBoys',sa:2,sb:1},
  3:{a:'Team Liquid',b:'Team Yandex',sa:0,sb:2},
  4:{a:'Nigma Galaxy',b:'Team Falcons',sa:2,sb:1},
  5:{a:'Iron Wing',b:'BoomBoys',sa:1,sb:2},
  6:{a:'Team Liquid',b:'Team Falcons',sa:2,sb:1},
  7:{a:'Team Spirit',b:'TEAM VISION',sa:1,sb:2},
  8:{a:'Team Yandex',b:'Nigma Galaxy',sa:2,sb:1},
  9:{a:'Nigma Galaxy',b:'BoomBoys',sa:1,sb:2},
  10:{a:'Team Spirit',b:'Team Liquid',sa:2,sb:0},
  11:{a:'TEAM VISION',b:'Team Yandex',sa:2,sb:1},
  12:{a:'BoomBoys',b:'Team Spirit',sa:0,sb:2}
};
const slotStage={
  1:'Upper Bracket Quarterfinal',2:'Upper Bracket Quarterfinal',3:'Upper Bracket Quarterfinal',4:'Upper Bracket Quarterfinal',
  5:'Lower Bracket Round 1',6:'Lower Bracket Round 1',7:'Upper Bracket Semifinal',8:'Upper Bracket Semifinal',
  9:'Lower Bracket Quarterfinal',10:'Lower Bracket Quarterfinal',11:'Upper Bracket Final',12:'Lower Bracket Semifinal',
  13:'Lower Bracket Final',14:'Grand Final'
};
function numberOf(match){return Number(String(match.name||'').match(/Match\s+(\d+)/i)?.[1]||0);}
function clean(value){return String(value||'TBD').replace(/\s+/g,' ').trim()||'TBD';}
function localScores(a,b){
 const rows=getTrackedMatches().filter(x=>x.status==='ended'&&x.winner&&[a,b].includes(x.winner));
 const series=new Map();
 for(const row of rows){const key=row.seriesId||`match:${row.matchId}`;if(!series.has(key))series.set(key,[]);series.get(key).push(row);}
 let best=null;
 for(const group of series.values()){
   const teams=new Set(group.flatMap(x=>[x.radiant,x.dire])); if(!teams.has(a)||!teams.has(b))continue;
   const score={ [a]:0,[b]:0 }; for(const game of group)if(score[game.winner]!==undefined)score[game.winner]++;
   if(!best||score[a]+score[b]>best.sa+best.sb)best={sa:score[a],sb:score[b]};
 }
 return best;
}
function line(slot){
 const a=clean(slot.a),b=clean(slot.b); const complete=slot.sa!==null&&slot.sb!==null&&Math.max(slot.sa,slot.sb)>=slot.winsNeeded;
 const icon=complete?'✅':slot.live?'🔴':'▫️'; const score=slot.sa===null?'vs':`${slot.sa}–${slot.sb}`;
 return `${icon} **${a}** ${score} **${b}**`;
}
export async function buildBracket() {
 const schedule=await getSchedule(); const byNumber=new Map(schedule.map(m=>[numberOf(m),m]).filter(([n])=>n));
 const slots=[];
 for(let n=1;n<=14;n++){
   const m=byNumber.get(n); const base=completedBaseline[n]; const a=clean(base?.a||m?.teams?.[0]); const b=clean(base?.b||m?.teams?.[1]);
   const local=localScores(a,b);
   const seriesFormat=normalizeSeriesFormat({bestOf:m?.bestOf|| (n===14?5:3),stage:slotStage[n]});
   const baselineComplete=base?.sa!==null&&base?.sa!==undefined&&base?.sb!==null&&base?.sb!==undefined&&Math.max(base.sa,base.sb)>=seriesFormat.winsNeeded;
   const localComplete=local?.sa!==null&&local?.sa!==undefined&&local?.sb!==null&&local?.sb!==undefined&&Math.max(local.sa,local.sb)>=seriesFormat.winsNeeded;
   const selected=localComplete?local:(baselineComplete?base:(local||base||null));
   const sa=selected?.sa??null,sb=selected?.sb??null;
   slots.push({number:n,stage:slotStage[n],a,b,sa,sb,winsNeeded:seriesFormat.winsNeeded,seriesFormat,beginAt:m?.beginAt||null,live:String(m?.status||'').includes('live')});
 }
 const won=(slot)=>slot.sa!==null&&slot.sb!==null?(slot.sa>slot.sb?slot.a:slot.b):'TBD';
 const lost=(slot)=>slot.sa!==null&&slot.sb!==null?(slot.sa>slot.sb?slot.b:slot.a):'TBD';
 const assign=(number,a,b)=>{const slot=slots[number-1];if(a&&a!=='TBD')slot.a=a;if(b&&b!=='TBD')slot.b=b;};
 // Resolve playoff dependencies from verified upstream results. This prevents
 // stale Valve placeholders such as Team Liquid vs TBD after Match 4 ended.
 assign(5,lost(slots[0]),lost(slots[1]));
 assign(6,lost(slots[2]),lost(slots[3]));
 assign(7,won(slots[0]),won(slots[1]));
 assign(8,won(slots[2]),won(slots[3]));
 assign(9,lost(slots[7]),won(slots[4]));
 assign(10,lost(slots[6]),won(slots[5]));
 assign(11,won(slots[6]),won(slots[7]));
 assign(12,won(slots[8]),won(slots[9]));
 assign(13,lost(slots[10]),won(slots[11]));
 assign(14,won(slots[10]),won(slots[12]));
 const upper=[1,2,3,4,7,8,11].map(n=>slots[n-1]);
 const lower=[5,6,9,10,12,13].map(n=>slots[n-1]);
 const future=slots.filter(x=>x.beginAt&&new Date(x.beginAt)>new Date()&&!(x.a==='TBD'&&x.b==='TBD')).sort((a,b)=>new Date(a.beginAt)-new Date(b.beginAt));
 const upcoming=future.find(x=>x.a!=='TBD'&&x.b!=='TBD')||future[0]||null;
 const grandFinal=slots[13];
 return {slots,upper,lower,grandFinal,upcoming,updatedAt:new Date()};
}
export function bracketPayload(bracket) {
 const isEmpty=(x)=>x.a==='TBD'&&x.b==='TBD';
 const isComplete=(x)=>x.sa!==null&&x.sb!==null&&Math.max(x.sa,x.sb)>=x.winsNeeded;
 const known=(x)=>!isEmpty(x);
 const stageName=(stage)=>({
   'Upper Bracket Quarterfinal':'Upper Bracket Quarterfinals',
   'Upper Bracket Semifinal':'Upper Bracket Semifinals',
   'Upper Bracket Final':'Upper Bracket Final',
   'Lower Bracket Round 1':'Lower Bracket Round 1',
   'Lower Bracket Quarterfinal':'Lower Bracket Quarterfinals',
   'Lower Bracket Semifinal':'Lower Bracket Semifinal',
   'Lower Bracket Final':'Lower Bracket Final',
   'Grand Final':'Grand Final'
  }[String(stage||'')]||String(stage||'Match'));
 const formatLine=(x)=>{
   const score=x.sa===null?'vs':`${x.sa}–${x.sb}`;
   return `**${teamLabel(x.a)}** ${score} **${teamLabel(x.b)}**`;
 };
 const section=(slots,emptyText)=>{
   const visible=slots.filter(known);
   if(!visible.length)return emptyText;
   const parts=[];
   let stage='';
   for(const slot of visible){
     if(slot.stage!==stage){
       stage=slot.stage;
       if(parts.length)parts.push('');
       parts.push(`__${stageName(stage)}__`);
     }
     parts.push(formatLine(slot));
   }
   return parts.join('\n');
 };
 const complete=bracket.slots.filter(x=>known(x)&&isComplete(x));
 const upcoming=bracket.slots.filter(x=>known(x)&&!x.live&&!isComplete(x));
 const embed=new EmbedBuilder()
   .setColor(0xD4AF37)
   .setTitle('THE INTERNATIONAL 2026')
   .setDescription('**Playoff Bracket**\nMain Event • Shanghai');
 embed.addFields(
   {name:'UPPER BRACKET',value:section(bracket.upper,'No confirmed upper-bracket matchups yet.')},
   {name:'LOWER BRACKET',value:section(bracket.lower,'No confirmed lower-bracket matchups yet.')}
 );
 if(bracket.grandFinal&&known(bracket.grandFinal))embed.addFields({name:'GRAND FINAL',value:formatLine(bracket.grandFinal)});
 const scheduledKnown=upcoming
   .filter(x=>x.beginAt&&new Date(x.beginAt)>new Date()&&x.a!=='TBD'&&x.b!=='TBD')
   .sort((a,b)=>new Date(a.beginAt)-new Date(b.beginAt))[0];
 const next=bracket.upcoming||scheduledKnown||null;
 if(next&&!(next.a==='TBD'&&next.b==='TBD')){
   const unix=next.beginAt?Math.floor(new Date(next.beginAt).getTime()/1000):null;
   embed.addFields({
     name:'NEXT SERIES',
     value:`**${teamLabel(next.a)} vs ${teamLabel(next.b)}**\n${next.stage} • ${next.seriesFormat?.label||'Series'}${unix?`\n<t:${unix}:F> • <t:${unix}:R>`:'\nTime to be confirmed'}`
   });
 }
 embed.setFooter({text:`${complete.length} series completed • Updated automatically from tournament results`}).setTimestamp(bracket.updatedAt);
 const row=new ActionRowBuilder().addComponents(
   new ButtonBuilder().setLabel('Full Bracket').setStyle(ButtonStyle.Link).setURL(LIQUIPEDIA),
   new ButtonBuilder().setLabel('Watch Live').setStyle(ButtonStyle.Link).setURL(TWITCH)
 );
 const signature=crypto.createHash('sha256').update(JSON.stringify(bracket.slots.map(({number,a,b,sa,sb,beginAt})=>({number,a,b,sa,sb,beginAt})))).digest('hex');
 return {embeds:[embed],components:[row],signature};
}
