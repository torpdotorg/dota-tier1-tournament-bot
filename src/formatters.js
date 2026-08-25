import { EmbedBuilder } from 'discord.js';
import { normalizeSeriesFormat, seriesProgress } from './seriesFormat.js';
import { discordTimestamp } from './utils.js';
import { teamLabel } from './teamEmojiService.js';
const TWITCH='https://www.twitch.tv/dota2ti';
const YOUTUBE='https://www.youtube.com/@dota2/streams';
function matchLines(m, rich=false) {
  const known=m.teams.some(t=>t!=='TBD');
  const title=known?`${teamLabel(m.teams[0],m.teamIds?.[0])} vs ${teamLabel(m.teams[1],m.teamIds?.[1])}`:(m.name||'Match TBD');
  const base=`**${title}**\n${discordTimestamp(m.beginAt,'f')} • ${discordTimestamp(m.beginAt,'R')}\n${m.stage||'TI 2026'}${(m.seriesFormat?.label||normalizeSeriesFormat({bestOf:m.bestOf,stage:m.stage}).label)?` • ${m.seriesFormat?.label||normalizeSeriesFormat({bestOf:m.bestOf,stage:m.stage}).label}`:''}`;
  return rich?`${base}\n📺 [Twitch](${TWITCH}) • [YouTube](${YOUTUBE})`:base;
}
export function scheduleEmbed(matches,title='Today’s TI 2026 matches') {
  const e=new EmbedBuilder().setColor(0xA4282D).setTitle(title).setTimestamp();
  if(!matches.length)return e.setDescription('No scheduled TI matches were found for this period.');
  return e.setDescription(matches.slice(0,12).map(m=>matchLines(m,true)).join('\n\n'));
}
export function nextEmbed(m, standingRows=[]) {
  const e=new EmbedBuilder().setColor(0xA4282D).setTitle('🏆 Next TI 2026 match').setTimestamp();
  if(!m)return e.setDescription('No future TI match was found.');
  e.setDescription(matchLines(m,false));
  for(const name of m.teams.filter(x=>x!=='TBD')){
    const r=standingRows.find(x=>x.name.toLowerCase()===name.toLowerCase());
    e.addFields({name, value:r?`Group stage: ${r.seriesWins}-${r.seriesLosses} series • ${r.gameWins}-${r.gameLosses} games`:'Tournament profile available after matchup confirmation'});
  }
  return e.addFields({name:'📺 Official English streams',value:`[Twitch](${TWITCH}) • [Backup Twitch](https://www.twitch.tv/dota2ti_2) • [YouTube](${YOUTUBE})`});
}
export function teamEmbed(name,row,next) {
  const e=new EmbedBuilder().setColor(0x3498DB).setTitle(`Team profile: ${teamLabel(name)}`).setTimestamp();
  if(row)e.addFields({name:'Final group-stage record',value:`#${row.rank} • ${row.seriesWins}-${row.seriesLosses} series • ${row.gameWins}-${row.gameLosses} games`});
  else e.addFields({name:'Group stage',value:'No matching group-stage record found.'});
  e.addFields({name:'Next match',value:next?matchLines(next,false):'No future matchup currently assigned.'});
  return e.addFields({name:'Watch',value:`[Twitch](${TWITCH}) • [YouTube](${YOUTUBE})`});
}
export function resultsEmbed(matches) {
  const e=new EmbedBuilder().setColor(0x2ECC71).setTitle('Recent TI 2026 game results').setTimestamp();
  if(!matches.length)return e.setDescription('Recent TI games are still being processed by Valve and OpenDota.');
  return e.setDescription(matches.map(m=>{
    const winner=m.radiantWin?m.radiant:m.dire;
    return `🏆 **${teamLabel(winner)}**\n${m.radiant} ${m.radiantScore}–${m.direScore} ${m.dire} • ${durationText(m.duration)} • \`${m.matchId}\``;
  }).join('\n\n'));
}
export function standingsEmbed(rows){const e=new EmbedBuilder().setColor(0xD4AF37).setTitle('TI 2026 Group Stage Standings').setFooter({text:'Final Swiss-stage standings • Group stage ended 16 August 2026'}).setTimestamp();return e.setDescription(rows.map(r=>`${r.rank}. **${teamLabel(r.name)}** — ${r.seriesWins}-${r.seriesLosses} series | ${r.gameWins}-${r.gameLosses} games`).join('\n'));}
function durationText(s=0){return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
export function completedMatchEmbed(m, series = null) {
  const gameWinner = m.radiantWin ? m.radiant : m.dire;
  const gameLoser = m.radiantWin ? m.dire : m.radiant;
  const seriesFinished = Boolean(series?.complete && series?.winner);
  const gameNumber = series?.gameNumber || null;
  const format = series?.format || m.seriesFormat || normalizeSeriesFormat({seriesType:m.seriesType});
  const progress = series?.progress || seriesProgress({scoreA:series?.scoreA,scoreB:series?.scoreB,gameNumber,format});
  const winnerScore = series?.winner === series?.teamA ? series?.scoreA : series?.scoreB;
  const loserScore = series?.winner === series?.teamA ? series?.scoreB : series?.scoreA;
  const opponent = series?.winner === series?.teamA ? series?.teamB : series?.teamA;
  const headline = seriesFinished
    ? `🏆 ${series.winner} defeated ${opponent} ${winnerScore}–${loserScore}`
    : `${gameWinner} won ${gameNumber ? `Game ${gameNumber}${format?.label ? ` of ${format.label}` : ''}` : 'the game'} against ${gameLoser}`;
  const embed = new EmbedBuilder()
    .setColor(seriesFinished ? 0xD4AF37 : 0x2ECC71)
    .setTitle(headline)
    .setDescription(`**Final game score**\n${m.radiant} ${m.radiantScore}–${m.direScore} ${m.dire}`)
    .addFields(
      {
        name: `Series score${format?.label ? ` • ${format.label}` : ''}`,
        value: series
          ? `${series.teamA} ${series.scoreA}–${series.scoreB} ${series.teamB}`
          : 'Temporarily unavailable — not guessed from local history.'
      },
      {
        name: 'Biggest lead',
        value: m.largestLead?.value
          ? `${m.largestLead.team} +${Number(m.largestLead.value).toLocaleString('en-US')} gold`
          : 'Pending full replay parsing.'
      },
      { name: 'Duration', value: durationText(m.duration) }
    );
  if (m.top) embed.addFields({
    name: 'Top performer',
    value: `**${m.top.name}** — ${m.top.kills}/${m.top.deaths}/${m.top.assists}\n${m.top.gpm} GPM • ${m.top.xpm} XPM`
  });
  if (m.radiantDraft?.length) embed.addFields({
    name: 'Draft',
    value: `**${teamLabel(m.radiant,m.radiantTeamId)}:** ${m.radiantDraft.join(', ')}\n**${teamLabel(m.dire,m.direTeamId)}:** ${m.direDraft.join(', ')}`
  });
  return embed.setFooter({ text: `Match ID: ${m.matchId} • Data: OpenDota/Valve` }).setTimestamp();
}


export function dailyOverviewEmbed(slots) {
  const complete=(slot)=>slot.sa!==null&&slot.sb!==null&&Math.max(slot.sa,slot.sb)>=slot.winsNeeded;
  const winner=(slot)=>slot.sa>slot.sb?slot.a:slot.b;
  const loser=(slot)=>slot.sa>slot.sb?slot.b:slot.a;
  const finalScore=(slot)=>slot.sa>slot.sb?`${slot.sa}–${slot.sb}`:`${slot.sb}–${slot.sa}`;
  const when=(slot)=>slot.beginAt?`${discordTimestamp(slot.beginAt,'t')} • ${discordTimestamp(slot.beginAt,'R')}`:'Time to be confirmed';
  const results=slots.filter(complete);
  const live=slots.filter((slot)=>slot.live&&!complete(slot));
  const upcoming=slots.filter((slot)=>!slot.live&&!complete(slot));
  const embed=new EmbedBuilder().setColor(live.length?0xED4245:0xD4AF37)
    .setTitle('🏆 TI 2026 • DAILY OVERVIEW')
    .setDescription('**MAIN EVENT • SHANGHAI**\n━━━━━━━━━━━━━━━━━━━━\nCatch up on what happened and see what is still to come.');
  if(results.length)embed.addFields({name:'✅ RESULTS SO FAR',value:results.map((slot)=>`**${winner(slot)} defeated ${loser(slot)} ${finalScore(slot)}**\n${slot.stage}\n${when(slot)}`).join('\n\n')});
  if(live.length)embed.addFields({name:'🔴 LIVE NOW',value:live.map((slot)=>`## ${slot.a} vs ${slot.b}\n${slot.stage} • ${slot.number===14?'Bo5':'Bo3'}\n${when(slot)}`).join('\n\n')});
  if(upcoming.length)embed.addFields({name:'🔥 STILL TO COME',value:upcoming.map((slot)=>`**${slot.a} vs ${slot.b}**\n${slot.stage} • ${slot.number===14?'Bo5':'Bo3'}\n${when(slot)}\n📺 [Twitch](https://www.twitch.tv/dota2ti) • [YouTube](https://www.youtube.com/@dota2/streams)`).join('\n\n')});
  if(!results.length&&!live.length&&!upcoming.length)embed.setDescription('No TI playoff series were found for today.');
  return embed.setFooter({text:'Daily overview • Times display in each Discord member’s local timezone'}).setTimestamp();
}

export function gameStartedEmbed(game, heroMap={}, playerMap={}, scheduleMatch=null) {
  const format=game.seriesFormat||normalizeSeriesFormat({seriesType:game.seriesType,bestOf:scheduleMatch?.bestOf,stage:scheduleMatch?.stage});
  const progress=game.seriesProgress||seriesProgress({scoreA:game.radiantSeriesWins,scoreB:game.direSeriesWins,format});
  const decider=Boolean(progress?.decider);
  const gameNumber=progress?.nextGame||Number(game.radiantSeriesWins||0)+Number(game.direSeriesWins||0)+1;
  const title=decider?`🔥 DECIDING GAME ${gameNumber} HAS STARTED`:`🔴 GAME ${gameNumber} HAS STARTED`;
  const stage=scheduleMatch?.stage||'TI 2026';
  const formatLabel=format?.label?` • ${format.label}`:'';
  const resolveLine=(player)=>{
    const name=player.name||playerMap[String(player.accountId||'')]||null;
    const hero=player.heroId?(heroMap[String(player.heroId)]||`Hero ${player.heroId}`):null;
    if(name&&hero)return `**${name}** — ${hero}`;
    if(hero)return hero;
    return name?`**${name}**`:'Lineup slot unavailable';
  };
  const lineupText=(players)=>players?.length?players.slice(0,5).map(resolveLine).join('\n'):'Lineup data is not available yet.';
  const winsText=(team,wins)=>{
    if(format?.bestOf===2)return `${team}: ${2-(Number(game.radiantSeriesWins||0)+Number(game.direSeriesWins||0))} game(s) remain in the fixed Bo2`;
    if(!format?.winsNeeded)return null;
    return `${team} need ${Math.max(0,format.winsNeeded-Number(wins||0))} more win${Math.max(0,format.winsNeeded-Number(wins||0))===1?'':'s'}`;
  };
  const status=[winsText(game.radiant,game.radiantSeriesWins),winsText(game.dire,game.direSeriesWins)].filter(Boolean).join('\n');
  const e=new EmbedBuilder().setColor(decider?0xED4245:0xE67E22).setTitle(title)
    .setDescription(`## ${game.radiant} vs ${game.dire}\n**${stage}${formatLabel}**\nGame clock: ${Math.floor(Number(game.gameTime||0)/60)} minute${Math.floor(Number(game.gameTime||0)/60)===1?'':'s'}\n━━━━━━━━━━━━━━━━━━━━`)
    .addFields(
      {name:`Series score${formatLabel}`,value:`${teamLabel(game.radiant,game.radiantTeamId)} ${game.radiantSeriesWins}–${game.direSeriesWins} ${teamLabel(game.dire,game.direTeamId)}`},
      {name:`🧠 ${game.radiant} lineup`,value:lineupText(game.radiantLineup)},
      {name:`🧠 ${game.dire} lineup`,value:lineupText(game.direLineup)}
    );
  if(status)e.addFields({name:decider?'🔥 Series decider':'📊 Series status',value:decider?'One game decides the series.':status});
  e.addFields({name:'Watch live',value:'[Twitch](https://www.twitch.tv/dota2ti) • [YouTube](https://www.youtube.com/@dota2/streams)'});
  return e.setFooter({text:`One start announcement per game • Match ID: ${game.matchId}`}).setTimestamp();
}

export function gameUpdateEmbed(game, heroMap={}, playerMap={}, updateMinute=20) {
  const seconds=Math.max(0,Number(game.gameTime||0));
  const gameMinutes=Math.max(0,Math.floor(seconds/60));
  const radiantWorth=Number(game.radiantNetWorth||0),direWorth=Number(game.direNetWorth||0);
  const difference=radiantWorth-direWorth;
  const leader=difference>=0?game.radiant:game.dire;
  const hasWorth=Boolean(radiantWorth||direWorth);
  const leadText=hasWorth?`${leader} lead by ${Math.abs(difference).toLocaleString('en-US')} gold`:'Team gold data is not available from the live feed.';
  const closeGold=hasWorth&&Math.abs(difference)<(gameMinutes>=40?5000:2000);
  const closeKills=Math.abs(Number(game.radiantScore||0)-Number(game.direScore||0))<=5;
  const close=closeGold||closeKills;
  const title='TI 2026 • GAME UPDATE';
  const resolvePlayer=(player)=>{
    const name=player.name||playerMap[String(player.accountId||'')]||'Unknown player';
    const hero=player.heroId?(heroMap[String(player.heroId)]||`Hero ${player.heroId}`):null;
    return {name,hero,netWorth:Number(player.netWorth||0)};
  };
  const teamNetWorth=(players)=>{
    const rows=(players||[]).map(resolvePlayer).sort((a,b)=>b.netWorth-a.netWorth).slice(0,5);
    if(!rows.length||!rows.some(row=>row.netWorth>0))return 'Player net-worth data is not available.';
    return rows.map((row,index)=>`${index+1}. **${row.name}**${row.hero?` (${row.hero})`:''} — ${row.netWorth.toLocaleString('en-US')}`).join('\n');
  };
  const embed=new EmbedBuilder().setColor(gameMinutes>=60?0x9B59B6:(close?0xED4245:0xE67E22)).setTitle(title)
    .setDescription(`## ${game.radiant} vs ${game.dire}\n**Game clock: ${gameMinutes} minutes**\n━━━━━━━━━━━━━━━━━━━━`)
    .addFields(
      {name:'Kill score',value:`**${teamLabel(game.radiant,game.radiantTeamId)} ${game.radiantScore}–${game.direScore} ${teamLabel(game.dire,game.direTeamId)}**`},
      {name:`Series score${game.seriesFormat?.label?` • ${game.seriesFormat.label}`:''}`,value:`${teamLabel(game.radiant,game.radiantTeamId)} ${game.radiantSeriesWins}–${game.direSeriesWins} ${teamLabel(game.dire,game.direTeamId)}${game.seriesProgress?.decider?'\n🔥 Deciding game':''}`},
      {name:'Gold advantage',value:leadText},
      {name:`${game.radiant.toUpperCase()} NET WORTH`,value:teamNetWorth(game.radiantLineup)},
      {name:`${game.dire.toUpperCase()} NET WORTH`,value:teamNetWorth(game.direLineup)}
    );
  if(gameMinutes>=40&&close)embed.addFields({name:'Match status',value:'The game is still close enough to swing either way.'});
  embed.addFields({name:'Watch live',value:'[Twitch](https://www.twitch.tv/dota2ti) • [YouTube](https://www.youtube.com/@dota2/streams)'});
  return embed.setFooter({text:`Match ID: ${game.matchId}`}).setTimestamp();
}

// Backward-compatible export for older internal references.
export function midgameEmbed(game, heroMap={}, playerMap={}, phase='midgame') {
  const minute=phase==='lategame'?40:20;
  return gameUpdateEmbed(game,heroMap,playerMap,minute);
}


export function heroStatsEmbed(rows) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('TI 2026 Hero Statistics')
    .setTimestamp();

  if (!rows.length) {
    return embed.setDescription('No processed tournament draft data is available yet.');
  }

  const mostPicked = rows
    .slice()
    .sort((a, b) => b.picks - a.picks || b.wins - a.wins)
    .slice(0, 10);

  const highestWinRate = rows
    .filter((row) => row.picks >= 2)
    .slice()
    .sort((a, b) => b.winRate - a.winRate || b.picks - a.picks)
    .slice(0, 10);

  return embed
    .addFields(
      {
        name: 'Most picked',
        value: mostPicked
          .map((row, index) => `${index + 1}. **${row.hero}** — ${row.picks} picks • ${row.wins} wins`)
          .join('\n')
      },
      {
        name: 'Highest win rate',
        value: highestWinRate.length
          ? highestWinRate
              .map((row, index) => `${index + 1}. **${row.hero}** — ${row.winRate}% • ${row.picks} picks`)
              .join('\n')
          : 'At least two picks are required.'
      }
    )
    .setFooter({ text: 'Based on completed tournament games processed by the bot' });
}
