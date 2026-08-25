const limits={title:256,description:4096,fields:25,fieldName:256,fieldValue:1024,total:6000};
const trim=(value,max)=>{const s=String(value??'');return s.length<=max?s:`${s.slice(0,Math.max(0,max-1))}…`;};
export function sanitizeEmbed(embed){
 const json=typeof embed?.toJSON==='function'?embed.toJSON():structuredClone(embed||{});
 if(json.title)json.title=trim(json.title,limits.title);
 if(json.description)json.description=trim(json.description,limits.description);
 if(Array.isArray(json.fields))json.fields=json.fields.slice(0,limits.fields).map(f=>({...f,name:trim(f.name,limits.fieldName),value:trim(f.value,limits.fieldValue)}));
 let total=(json.title?.length||0)+(json.description?.length||0)+(json.footer?.text?.length||0)+(json.author?.name?.length||0)+(json.fields||[]).reduce((n,f)=>n+f.name.length+f.value.length,0);
 while(total>limits.total&&json.fields?.length){const removed=json.fields.pop();total-=removed.name.length+removed.value.length;}
 return json;
}
export function validatePayload(payload){
 const errors=[];for(const [i,e] of (payload.embeds||[]).entries()){const x=sanitizeEmbed(e);if(JSON.stringify(x).length===0)errors.push(`embed ${i} is empty`);}if((payload.embeds||[]).length>10)errors.push('more than 10 embeds');if((payload.components||[]).length>5)errors.push('more than 5 component rows');return {valid:errors.length===0,errors};
}
export {limits};
