import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
const discovery=fs.readFileSync(new URL('../src/tournaments/discoveryService.js',import.meta.url),'utf8'),platform=fs.readFileSync(new URL('../src/tournaments/platformView.js',import.meta.url),'utf8');
test('discovery annotates Liquipedia rows with candidates',()=>{assert.match(discovery,/annotateProviderResolution/);assert.match(discovery,/resolvedLiquipedia/);});
test('platform exposes provider-resolution diagnostics',()=>{assert.match(platform,/Provider resolution/);assert.match(platform,/Candidate matches/);assert.match(platform,/Unresolved/);});
