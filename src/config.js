import 'dotenv/config';
const required=['DISCORD_TOKEN','DISCORD_CLIENT_ID','DISCORD_GUILD_ID'];
export function validateConfig(){const missing=required.filter(name=>!process.env[name]);if(missing.length)throw new Error(`Missing required .env values: ${missing.join(', ')}`);}
export const config={
  discordToken:process.env.DISCORD_TOKEN,
  clientId:process.env.DISCORD_CLIENT_ID,
  guildId:process.env.DISCORD_GUILD_ID,
  updatesChannelId:process.env.DISCORD_UPDATES_CHANNEL_ID,
  steamApiKey:process.env.STEAM_API_KEY,
  liquipediaUserAgent:process.env.LIQUIPEDIA_USER_AGENT||'',
  timezone:process.env.TIMEZONE||'Europe/Copenhagen',
  scheduleRefreshMinutes:Math.max(1,Number(process.env.SCHEDULE_REFRESH_MINUTES||5)),
  gameUpdateIntervalMinutes:Math.max(10,Number(process.env.GAME_UPDATE_INTERVAL_MINUTES||20))
};
