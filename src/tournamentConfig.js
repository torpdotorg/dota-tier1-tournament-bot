import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const id=process.env.ACTIVE_TOURNAMENT||'ti-2026';
export const tournamentConfigFile=path.join(root,'data','tournaments',`${id}.json`);
if(!fs.existsSync(tournamentConfigFile))throw new Error(`Tournament configuration not found: ${tournamentConfigFile}`);
export const tournament=JSON.parse(fs.readFileSync(tournamentConfigFile,'utf8'));
const day=(start,current)=>Math.floor((Date.parse(`${current}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000)+1;
export const tournamentDay=date=>day(tournament.startDate,date);
export const mainEventDay=date=>day(tournament.mainEventStartDate,date);

export function configuredTournamentIsComplete(now = Date.now()) {
  const end = Date.parse(`${tournament.endDate}T23:59:59Z`);
  return Number.isFinite(end) && end < now;
}
