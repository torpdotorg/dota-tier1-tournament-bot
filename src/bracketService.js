import { config } from './config.js';
import { buildBracket, bracketPayload } from './bracket.js';
import { getSetting, setSetting } from './db.js';
export async function refreshBracket(client,{force=false,create=true}={}){
 if(!config.updatesChannelId)throw new Error('DISCORD_UPDATES_CHANNEL_ID is not configured.');
 const channel=await client.channels.fetch(config.updatesChannelId); if(!channel?.isTextBased())throw new Error('Updates channel is not text based.');
 let payload;
 try { payload=bracketPayload(await buildBracket()); }
 catch(error) {
  if(force) throw error;
  console.warn(`[Bracket] Refresh skipped — ${error.message}. The next scheduled refresh will try again.`);
  return {status:'data-unavailable',reason:error.message};
 } const oldSig=getSetting('bracket_signature'); const oldId=getSetting('bracket_message_id');
 if(!force&&oldSig===payload.signature&&oldId)return {status:'unchanged',messageId:oldId};
 const body={embeds:payload.embeds,components:payload.components}; let message=null;
 if(oldId){try{message=await channel.messages.fetch(oldId);await message.edit(body);}catch(error){console.warn(`Stored bracket message unavailable: ${error.message}`);}}
 if(!message&&create){message=await channel.send(body);setSetting('bracket_message_id',message.id);}
 if(message){setSetting('bracket_signature',payload.signature);return {status:oldId?'updated':'created',messageId:message.id};}
 return {status:'missing'};
}
export async function buildStandaloneBracket(){return bracketPayload(await buildBracket());}
