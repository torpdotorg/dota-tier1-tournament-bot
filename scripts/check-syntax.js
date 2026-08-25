import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const sourceRoot=path.join(root,'src');

function javascriptFiles(directory){
  const files=[];
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const fullPath=path.join(directory,entry.name);
    if(entry.isDirectory())files.push(...javascriptFiles(fullPath));
    else if(entry.isFile()&&entry.name.endsWith('.js'))files.push(fullPath);
  }
  return files;
}

const files=javascriptFiles(sourceRoot).sort();
let failures=0;
for(const file of files){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0){
    failures++;
    console.error(`Syntax check failed: ${path.relative(root,file)}`);
    if(result.stdout)console.error(result.stdout.trim());
    if(result.stderr)console.error(result.stderr.trim());
  }
}
if(failures)process.exit(1);
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
