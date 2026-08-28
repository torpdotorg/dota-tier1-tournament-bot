import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
const source=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
test('generic startup integrations remain wired',()=>{for(const token of['ValveTournamentAdapter','OpenDotaTournamentAdapter','LiquipediaStructureAdapter','syncTierOneSeeds','syncApplicationTeamEmojis','startTournamentDiscovery'])assert.ok(source.includes(token),token);});
test('legacy scheduler is not started',()=>{assert.equal(source.includes('startScheduler'),false);assert.equal(source.includes('configuredTournamentIsComplete'),false);});
