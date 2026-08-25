import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTeamRegistry, normalizeTeamName } from './teamRegistry.js';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const maxUploadBytes=256*1024;
let labels=new Map();
let ids=new Map();

function emojiName(record){
 const base=(record.tag||record.name||`team_${record.teamId}`).toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');
 const suffix=String(record.teamId).replace(/[^0-9]/g,'').slice(-8)||'team';
 return `d2_${base.slice(0,18)}_${suffix}`.slice(0,32);
}
function rebuildLabels(registry){
 labels=new Map();ids=new Map();
 for(const record of Object.values(registry.teams||{})){
  if(record.emojiId){
   const value=`<:${record.emojiName||emojiName(record)}:${record.emojiId}>`;
   ids.set(String(record.teamId),value);
   for(const alias of record.aliases||[])labels.set(normalizeTeamName(alias),value);
   labels.set(normalizeTeamName(record.name),value);
  }
 }
}
export function teamEmoji({teamId=null,name=''}){
 return (teamId&&ids.get(String(teamId)))||labels.get(normalizeTeamName(name))||'';
}
export function teamLabel(name,teamId=null){
 const emoji=teamEmoji({teamId,name});
 return emoji?`${emoji} ${name}`:String(name||'TBD');
}
export async function syncApplicationTeamEmojis(client,{force=false}={}){
 if(!client.application)throw new Error('Discord application is unavailable.');
 const registry=await getTeamRegistry();
 const remote=await client.application.emojis.fetch();
 const byName=new Map(remote.map(emoji=>[emoji.name,emoji]));
 let created=0,reused=0,missingLogo=0,tooLarge=0,failed=0;
 for(const record of Object.values(registry.teams||{})){
  const name=emojiName(record);
  let emoji=byName.get(name)||null;
  if(emoji&&!force){reused++;}
  else if(record.logoFile){
   const filePath=path.join(projectRoot,record.logoFile);
   try{
    const buffer=await fs.readFile(filePath);
    if(buffer.length>maxUploadBytes){tooLarge++;console.warn(`[Emoji] ${record.name}: logo is ${Math.ceil(buffer.length/1024)} KiB; maximum is 256 KiB.`);continue;}
    if(emoji&&force){await emoji.delete();byName.delete(name);}
    emoji=await client.application.emojis.create({attachment:buffer,name});
    byName.set(name,emoji);created++;
   }catch(error){failed++;console.warn(`[Emoji] ${record.name}: ${error.message}`);continue;}
  }else{missingLogo++;continue;}
  record.emojiId=emoji.id;
  record.emojiName=emoji.name;
  record.emojiUpdatedAt=new Date().toISOString();
 }
 await fs.writeFile(path.join(projectRoot,'data','teams.json'),JSON.stringify(registry,null,2)+'\n','utf8');
 rebuildLabels(registry);
 console.log(`[Emoji] Ready: ${created} created, ${reused} reused, ${missingLogo} missing logo, ${tooLarge} too large, ${failed} failed.`);
 return {created,reused,missingLogo,tooLarge,failed};
}
export async function loadTeamEmojiLabels(){const registry=await getTeamRegistry();rebuildLabels(registry);return labels.size;}
