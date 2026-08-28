import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
test('all Liquipedia modules use shared coordinator',()=>{for(const f of ['../src/tournaments/liquipediaTierOneProvider.js','../src/tournaments/providerIdDiscovery.js','../src/tournaments/workers/liquipediaStructureAdapter.js'])assert.match(read(f),/coordinatedLiquipediaFetch/,f);});
test('cooldown persists on disk',()=>{const s=read('../src/tournaments/liquipediaRequestCoordinator.js');assert.match(s,/liquipedia-request-state\.json/);assert.match(s,/cooldownUntil/);assert.match(s,/response.status===429/);});
test('failed discovery logs preserved catalog counts',()=>{assert.match(read('../src/tournaments/discoveryService.js'),/Existing catalog preserved/);});
