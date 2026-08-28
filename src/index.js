import{Client,Events,GatewayIntentBits,MessageFlags,EmbedBuilder}from'discord.js';
import{config,validateConfig}from'./config.js';
import{diagnosticsEmbed}from'./diagnostics.js';
import{syncTierOneSeeds}from'./teamRegistry.js';
import{syncApplicationTeamEmojis,loadTeamEmojiLabels}from'./teamEmojiService.js';
import{startTournamentDiscovery}from'./tournaments/discoveryScheduler.js';
import{runTournamentDiscovery,discoverySummary}from'./tournaments/discoveryService.js';
import{tournamentDiscoveryText,tournamentCatalogCounts}from'./tournaments/presentation.js';
import{coverageRuntimeSummary}from'./tournaments/coverageRuntime.js';
import{registerTournamentAdapter,resolveTournamentCapability}from'./tournaments/workers/adapterRegistry.js';
import{ValveTournamentAdapter}from'./tournaments/workers/valveTournamentAdapter.js';
import{OpenDotaTournamentAdapter}from'./tournaments/workers/openDotaTournamentAdapter.js';
import{LiquipediaStructureAdapter}from'./tournaments/workers/liquipediaStructureAdapter.js';
import{tournamentInfoEmbed,tournamentTeamsEmbed,tournamentStructureBracketEmbed,tournamentStructureDebugEmbed}from'./tournaments/structureViews.js';
import{coverageWorkerSummary}from'./tournaments/workers/workerManager.js';
import{simulateTournamentLifecycle}from'./tournaments/simulationEngine.js';
import{resolveCommandTournament,tournamentChoices,commandTournamentCapability}from'./tournaments/commandContext.js';
import{contextualScheduleEmbed,contextualNextEmbed,contextualResultsEmbed,unavailableContextEmbed,contextualTeamEmbed,contextualHeroStatsEmbed}from'./tournaments/contextCommandViews.js';
import{platformStatusEmbed}from'./tournaments/platformView.js';
import{providerHealthSummary}from'./tournaments/providerHealth.js';
import{preparationSummary}from'./tournaments/preparationService.js';
validateConfig();registerTournamentAdapter(new ValveTournamentAdapter());registerTournamentAdapter(new OpenDotaTournamentAdapter());registerTournamentAdapter(new LiquipediaStructureAdapter(config));
const started=Date.now(),client=new Client({intents:[GatewayIntentBits.Guilds]});
client.once(Events.ClientReady,ready=>{console.log(`Logged in as ${ready.user.tag}`);console.log('Catalog-driven tournament runtime initialized in observation mode.');startTournamentDiscovery(ready);Promise.allSettled([syncTierOneSeeds()]).then(async results=>{for(const result of results)if(result.status==='rejected')console.warn(`[Teams] Startup sync skipped: ${result.reason?.message||result.reason}`);await loadTeamEmojiLabels();await syncApplicationTeamEmojis(ready).catch(error=>console.warn(`[Emoji] Startup sync skipped: ${error.message}`));});});
function heroRows(results){const map=new Map();for(const m of results||[])for(const[team,draft]of[[m.radiant,m.radiantDraft||[]],[m.dire,m.direDraft||[]]])for(const hero of draft){const x=map.get(hero)||{hero,picks:0,wins:0};x.picks++;if((m.winner||m.radiantWin&&m.radiant)===team)x.wins++;map.set(hero,x);}return[...map.values()].map(x=>({...x,winRate:Math.round(x.wins/x.picks*100)}));}
client.on(Events.InteractionCreate,async i=>{if(i.isAutocomplete()){await i.respond(tournamentChoices(i.options.getFocused()));return;}if(!i.isChatInputCommand())return;try{await i.deferReply({flags:MessageFlags.Ephemeral});const query=i.options.getString('tournament'),event=resolveCommandTournament(query),cap=commandTournamentCapability(event);if(i.commandName==='bot-status')return i.editReply(`**Dota Tier 1 Tournament Platform is online**\nUptime: ${Math.floor((Date.now()-started)/1000)}s\nCatalog-driven discovery: enabled\nTournament runtime: observation mode\nGeneric workers: enabled`);
if(i.commandName==='platform')return i.editReply({embeds:[platformStatusEmbed({discovery:discoverySummary(),providers:providerHealthSummary(),coverage:coverageRuntimeSummary(),workers:coverageWorkerSummary(),preparation:preparationSummary()})]});
if(i.commandName==='today'||i.commandName==='next'||i.commandName==='standings'||i.commandName==='results'||i.commandName==='match'||i.commandName==='heroes'||i.commandName==='series'){
 if(!cap.available)return i.editReply({embeds:[unavailableContextEmbed(event,i.commandName,cap.reason)]});
 const adapter=cap.adapter;
 if(i.commandName==='today')return i.editReply({embeds:[contextualScheduleEmbed(event,await adapter.getSchedule(event),{todayOnly:true})]});
 if(i.commandName==='next'){const rows=await adapter.getSchedule(event),next=rows.find(x=>!x.beginAt||Date.parse(x.beginAt)>Date.now());return i.editReply({embeds:[contextualNextEmbed(event,next)]});}
 if(i.commandName==='standings'){const rows=await adapter.getStandings(event);return i.editReply({embeds:[rows.length?new EmbedBuilder().setColor(0xD4AF37).setTitle(`${event.name} • STANDINGS`).setDescription(rows.map(r=>`${r.rank}. **${r.name}**`).join('\n')).setTimestamp():unavailableContextEmbed(event,'Standings','The selected provider does not currently expose standings.')]});}
 if(i.commandName==='results')return i.editReply({embeds:[contextualResultsEmbed(event,await adapter.getRecentResults(event))]});
 if(i.commandName==='match'){const name=i.options.getString('team',true),q=name.toLowerCase(),[standings,schedule]=await Promise.all([adapter.getStandings(event),adapter.getSchedule(event)]),standing=standings.find(r=>String(r.name||'').toLowerCase().includes(q)),next=schedule.find(m=>Date.parse(m.beginAt||0)>Date.now()&&(m.teams||[]).some(t=>String(t).toLowerCase().includes(q)));return i.editReply({embeds:[contextualTeamEmbed(event,name,standing,next)]});}
 if(i.commandName==='heroes')return i.editReply({embeds:[contextualHeroStatsEmbed(event,heroRows(await adapter.getRecentResults(event)))]});
 return i.editReply({embeds:[unavailableContextEmbed(event,'Series overview','Generic series reconstruction will activate when live series data is available.')]});
}
if(i.commandName==='bracket'||i.commandName==='tournament-info'||i.commandName==='tournament-info-debug'||i.commandName==='teams'){const capability=i.commandName==='bracket'?'bracket':i.commandName==='teams'?'teams':'tournamentInfo',adapter=resolveTournamentCapability(event,capability);if(!adapter)return i.editReply({embeds:[unavailableContextEmbed(event,i.commandName,'No compatible structure provider is available.')]});if(i.commandName==='bracket')return i.editReply({embeds:[tournamentStructureBracketEmbed(event,await adapter.getStructure(event))]});if(i.commandName==='teams')return i.editReply({embeds:[tournamentTeamsEmbed(event,await adapter.getStructure(event))]});if(i.commandName==='tournament-info-debug')return i.editReply({embeds:[tournamentStructureDebugEmbed(event,await adapter.getDiagnostics(event,{force:i.options.getBoolean('refresh')||false}))]});return i.editReply({embeds:[tournamentInfoEmbed(event,await adapter.getStructure(event))]});}
if(i.commandName==='bracket-refresh'||i.commandName==='recap-status')return i.editReply('This legacy configured-tournament operation was removed in v2.2.0.');
if(i.commandName==='tournaments'){if(i.options.getBoolean('refresh'))await runTournamentDiscovery({force:true});const x=discoverySummary();return i.editReply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('Tournament Discovery').setDescription(`Observation mode\n\n${tournamentDiscoveryText(x)}`).addFields({name:'Catalog',value:tournamentCatalogCounts(x)}).setTimestamp()]});}
if(i.commandName==='coverage'){const x=coverageRuntimeSummary(),w=coverageWorkerSummary();return i.editReply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('Tournament Coverage').setDescription(x.runtimes.length?x.runtimes.map(r=>`**${r.name}** — ${r.state}`).join('\n'):'No coverage runtimes are active.').addFields({name:'Runtime',value:`Running: ${x.running}\nLast reconcile: ${x.at||'not completed'}`},{name:'Workers',value:`Observing: ${w.observing}\nPublishing: ${w.running}\nDegraded: ${w.degraded||0}\nAwaiting adapter: ${w.waitingAdapter}`}).setTimestamp()]});}
if(i.commandName==='simulate-tournament'){const result=await simulateTournamentLifecycle();return i.editReply(`Simulation: **${result.status}**\nTournament: ${result.tournament}\nStages: ${result.stages.length}\nPublic messages: ${result.publicMessages}\nFinal worker state: ${result.finalWorkerState}`);}if(i.commandName==='diagnostics')return i.editReply({embeds:[await diagnosticsEmbed()]});}catch(error){console.error(error);const payload={content:`Command failed: ${error.message}`,flags:MessageFlags.Ephemeral};if(i.deferred||i.replied)await i.editReply(payload);else await i.reply(payload);}});
process.on('unhandledRejection',console.error);process.on('uncaughtException',console.error);await client.login(config.discordToken);
