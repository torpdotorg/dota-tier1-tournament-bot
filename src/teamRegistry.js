import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fetchJson } from './utils.js';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const registryFile=path.join(projectRoot,'data','teams.json');
const logoDir=path.join(projectRoot,'assets','team-logos');
const openDotaTeamsUrl='https://api.opendota.com/api/teams';
const refreshMs=30*24*60*60*1000;
const genericNames=new Set(['tbd','radiant','dire','unknown','']);

// Current Tier 1 ecosystem seed catalog. IDs are deliberately resolved from
// OpenDota at runtime so rebrands and successor organizations are not frozen.
export const tierOneTeamSeeds=[
 'PARIVISION','TEAM VISION','Team Yandex','Team Falcons','BetBoom Team','BoomBoys',
 'Team Liquid','Team Spirit','Aurora Gaming','LGD Gaming','Natus Vincere',
 'Nigma Galaxy','Xtreme Gaming','Vici Gaming','GamerLegion','OG','MOUZ',
 'REKONIX','Yellow Submarine','1w Team','Iron Wing','Zero Tenacity','Arcade',
 'Tundra Esports','PlayTime','Virtus.pro','HEROIC','Power Rangers',
 'Yakult Brothers','Execration','Team Tidebound','Team Resilience','HULIGANI'
];
let registryCache=null;
let directoryCache={expires:0,value:[]};

export const normalizeTeamName=(value)=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const unique=(values)=>[...new Set(values.map(x=>String(x||'').trim()).filter(Boolean))];
const safeFile=(value)=>normalizeTeamName(value)||crypto.randomUUID();

async function loadRegistry(){
 if(registryCache)return registryCache;
 try{registryCache=JSON.parse(await fs.readFile(registryFile,'utf8'));}
 catch{registryCache={version:1,updatedAt:null,teams:{},aliases:{}};}
 registryCache.teams||={};registryCache.aliases||={};
 return registryCache;
}
async function saveRegistry(registry){
 await fs.mkdir(path.dirname(registryFile),{recursive:true});
 registry.updatedAt=new Date().toISOString();
 await fs.writeFile(registryFile,JSON.stringify(registry,null,2)+'\n','utf8');
 registryCache=registry;
}
async function openDotaDirectory(){
 if(directoryCache.expires>Date.now())return directoryCache.value;
 const value=await fetchJson(openDotaTeamsUrl,{},20000);
 directoryCache={value:Array.isArray(value)?value:[],expires:Date.now()+6*60*60*1000};
 return directoryCache.value;
}
function findDirectoryTeam(directory,{teamId=null,name='',aliases=[]}){
 if(teamId){const exact=directory.find(x=>String(x.team_id)===String(teamId));if(exact)return exact;}
 const candidates=unique([name,...aliases]).map(normalizeTeamName).filter(Boolean);
 return directory.find(x=>candidates.includes(normalizeTeamName(x.name)))||directory.find(x=>candidates.includes(normalizeTeamName(x.tag)))||null;
}
function detectImage(buffer){
 if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A])))return {extension:'png',mime:'image/png'};
 if(buffer.length>=3&&buffer[0]===0xFF&&buffer[1]===0xD8&&buffer[2]===0xFF)return {extension:'jpg',mime:'image/jpeg'};
 if(buffer.length>=12&&buffer.subarray(0,4).toString('ascii')==='RIFF'&&buffer.subarray(8,12).toString('ascii')==='WEBP')return {extension:'webp',mime:'image/webp'};
 if(buffer.length>=6&&['GIF87a','GIF89a'].includes(buffer.subarray(0,6).toString('ascii')))return {extension:'gif',mime:'image/gif'};
 return null;
}
async function cacheLogo(teamId,logoUrl){
 if(!logoUrl)return null;
 await fs.mkdir(logoDir,{recursive:true});
 const response=await fetch(logoUrl,{redirect:'follow',headers:{Accept:'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8','User-Agent':'Dota-Tier1-Tournament-Bot/0.8.1'}});
 if(!response.ok)throw new Error(`HTTP ${response.status} while downloading logo`);
 const buffer=Buffer.from(await response.arrayBuffer());
 const image=detectImage(buffer);
 if(!image)throw new Error(`Logo payload was not a supported image (${response.headers.get('content-type')||'unknown content type'}, ${buffer.length} bytes)`);
 const base=String(teamId||safeFile(logoUrl));
 for(const extension of ['png','jpg','webp','gif']){
  if(extension===image.extension)continue;
  await fs.rm(path.join(logoDir,`${base}.${extension}`),{force:true});
 }
 const fileName=`${base}.${image.extension}`;
 const filePath=path.join(logoDir,fileName);
 await fs.writeFile(filePath,buffer);
 return path.relative(projectRoot,filePath).replaceAll('\\','/');
}
export async function registerTeam(input,{force=false}={}){
 const name=String(input?.name||'').trim();
 if(genericNames.has(normalizeTeamName(name)))return null;
 const registry=await loadRegistry();
 const requestedId=input.teamId?String(input.teamId):null;
 const aliasKey=normalizeTeamName(name);
 const existingId=requestedId||registry.aliases[aliasKey]||null;
 const existing=existingId?registry.teams[existingId]:null;
 if(existing&&!force&&Date.now()-Date.parse(existing.lastChecked||0)<refreshMs)return existing;
 const directory=await openDotaDirectory();
 const source=findDirectoryTeam(directory,{teamId:requestedId,name,aliases:existing?.aliases||[]});
 const teamId=String(source?.team_id||requestedId||`name:${aliasKey}`);
 const previous=registry.teams[teamId]||existing||{};
 const aliases=unique([...(previous.aliases||[]),name,source?.name,source?.tag,...(input.aliases||[])]);
 const logoUrl=source?.logo_url||source?.logo||previous.logoUrl||null;
 let logoFile=previous.logoFile||null;
 const logoChanged=Boolean(logoUrl&&logoUrl!==previous.logoUrl);
 const logoMissing=logoFile?await fs.access(path.join(projectRoot,logoFile)).then(()=>false).catch(()=>true):true;
 if(logoUrl&&(force||logoChanged||logoMissing)){
  try{logoFile=await cacheLogo(teamId,logoUrl);}
  catch(error){console.warn(`[Teams] Logo cache failed for ${name}: ${error.message}`);}
 }
 const record={teamId,name:String(source?.name||previous.name||name).trim(),tag:source?.tag?String(source.tag).trim():(previous.tag||null),aliases,logoUrl,logoFile,lastChecked:new Date().toISOString(),source:source?'OpenDota':'tournament-feed'};
 registry.teams[teamId]=record;
 for(const alias of aliases)registry.aliases[normalizeTeamName(alias)]=teamId;
 await saveRegistry(registry);
 return record;
}
export async function syncTeamRegistry(teams,{force=false}={}){
 const normalized=new Map();
 for(const team of teams||[]){
  const name=String(team?.name||'').trim();if(genericNames.has(normalizeTeamName(name)))continue;
  const key=team.teamId?`id:${team.teamId}`:`name:${normalizeTeamName(name)}`;
  normalized.set(key,{teamId:team.teamId||null,name,aliases:team.aliases||[]});
 }
 console.log(`[Teams] Syncing ${normalized.size} teams...`);
 let updated=0,failed=0,logosCached=0,logosUnavailable=0;
 for(const team of normalized.values()){
  try{const record=await registerTeam(team,{force});updated++;if(record?.logoFile)logosCached++;else logosUnavailable++;}
  catch(error){failed++;console.warn(`[Teams] ${team.name}: ${error.message}`);}
 }
 const registry=await loadRegistry();
 console.log(`[Teams] Registry ready: ${Object.keys(registry.teams).length} known teams (${updated} checked, ${failed} failed).`);
 console.log(`[Teams] Logos: ${logosCached} cached, ${logosUnavailable} unavailable in this sync.`);
 return {known:Object.keys(registry.teams).length,checked:updated,failed,logosCached,logosUnavailable};
}
export async function resolveTeamIdentity({teamId=null,name=''}){
 const registry=await loadRegistry();
 const id=teamId?String(teamId):registry.aliases[normalizeTeamName(name)];
 return id?registry.teams[id]||null:null;
}
export async function getTeamRegistry(){return await loadRegistry();}

export async function syncTierOneSeeds({force=false}={}){
 return await syncTeamRegistry(tierOneTeamSeeds.map(name=>({name})),{force});
}
