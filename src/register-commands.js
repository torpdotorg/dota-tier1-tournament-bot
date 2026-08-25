import { PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config, validateConfig } from './config.js'; validateConfig();
const commands=[
 new SlashCommandBuilder().setName('bot-status').setDescription('Show bot and provider status'),
 new SlashCommandBuilder().setName('today').setDescription('Show today’s TI schedule with streams').addStringOption(o=>o.setName('tournament').setDescription('Tournament name').setAutocomplete(true)),
 new SlashCommandBuilder().setName('next').setDescription('Show the next active tournament series').addStringOption(o=>o.setName('tournament').setDescription('Tournament name').setAutocomplete(true)),
 new SlashCommandBuilder().setName('standings').setDescription('Show tournament standings').addStringOption(o=>o.setName('tournament').setDescription('Tournament name').setAutocomplete(true)),
 new SlashCommandBuilder().setName('match').setDescription('Show a team profile and next match').addStringOption(o=>o.setName('team').setDescription('Team name').setRequired(true)),
 new SlashCommandBuilder().setName('results').setDescription('Show recent completed tournament games').addStringOption(o=>o.setName('tournament').setDescription('Tournament name').setAutocomplete(true)),
 new SlashCommandBuilder().setName('heroes').setDescription('Show hero statistics from processed tournament games'),
 new SlashCommandBuilder().setName('series').setDescription('Show the current or most recent series overview').addStringOption(o=>o.setName('tournament').setDescription('Tournament name').setAutocomplete(true)),
 new SlashCommandBuilder().setName('bracket').setDescription('Show the current tournament bracket').addStringOption(o=>o.setName('tournament').setDescription('Tournament name').setAutocomplete(true)),
 new SlashCommandBuilder().setName('bracket-refresh').setDescription('Force-refresh the persistent playoff bracket').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
 new SlashCommandBuilder().setName('recap-status').setDescription('Show whether each tournament-day recap is ready').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
 new SlashCommandBuilder().setName('tournaments').setDescription('Show automatically discovered tournament candidates').addBooleanOption(o=>o.setName('refresh').setDescription('Run discovery now')),
 new SlashCommandBuilder().setName('coverage').setDescription('Show active and pending tournament coverage runtimes'),
 new SlashCommandBuilder().setName('tournament-info').setDescription('Show tournament metadata and provider capabilities').addStringOption(o=>o.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true)),
 new SlashCommandBuilder().setName('tournament-info-debug').setDescription('Show private Liquipedia parser diagnostics').addStringOption(o=>o.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true)).addBooleanOption(o=>o.setName('refresh').setDescription('Force a fresh Liquipedia fetch')).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
 new SlashCommandBuilder().setName('teams').setDescription('Show verified tournament participants').addStringOption(o=>o.setName('tournament').setDescription('Tournament name').setRequired(true).setAutocomplete(true)),
 new SlashCommandBuilder().setName('simulate-tournament').setDescription('Run a private synthetic tournament lifecycle validation').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
 new SlashCommandBuilder().setName('diagnostics').setDescription('Show private provider and bot diagnostics').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c=>c.toJSON());
const rest=new REST({version:'10'}).setToken(config.discordToken);await rest.put(Routes.applicationGuildCommands(config.clientId,config.guildId),{body:commands});console.log(`Registered ${commands.length} guild slash commands.`);
