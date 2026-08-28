import fs from 'node:fs';
import path from 'node:path';

const stateFile=path.join(process.cwd(),'data','catalog','liquipedia-request-state.json');
const MIN_GAP_MS=2500;
const COOLDOWN_MS=30*60*1000;
let inFlight=Promise.resolve();
let lastRequestAt=0;

function readState(){try{return JSON.parse(fs.readFileSync(stateFile,'utf8'));}catch{return{cooldownUntil:null,lastError:null};}}
function writeState(patch){const current=readState(),next={...current,...patch,updatedAt:new Date().toISOString()};fs.mkdirSync(path.dirname(stateFile),{recursive:true});const temp=`${stateFile}.tmp`;fs.writeFileSync(temp,JSON.stringify(next,null,2));fs.renameSync(temp,stateFile);return next;}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
export function liquipediaRequestState(){const state=readState(),until=Date.parse(state.cooldownUntil||'');return{...state,cooldownActive:Number.isFinite(until)&&until>Date.now()};}
export function enterLiquipediaCooldown(reason,ms=COOLDOWN_MS){return writeState({cooldownUntil:new Date(Date.now()+ms).toISOString(),lastError:reason});}
export async function coordinatedLiquipediaFetch(url,options={},timeoutMs=30000){
  const task=async()=>{
    const state=liquipediaRequestState();
    if(state.cooldownActive)throw new Error(`Liquipedia cooldown active until ${state.cooldownUntil}`);
    const wait=Math.max(0,MIN_GAP_MS-(Date.now()-lastRequestAt));if(wait)await sleep(wait);lastRequestAt=Date.now();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{...options,signal:controller.signal});
      if(!response.ok){const message=`HTTP ${response.status} from ${new URL(url).hostname}`;if(response.status===429)enterLiquipediaCooldown(message);throw new Error(message);}
      const data=await response.json();writeState({cooldownUntil:null,lastError:null,lastSuccessAt:new Date().toISOString()});return data;
    }finally{clearTimeout(timer);}
  };
  const result=inFlight.then(task,task);inFlight=result.catch(()=>{});return result;
}
