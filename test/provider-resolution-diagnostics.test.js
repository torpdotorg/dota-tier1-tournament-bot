import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {providerResolutionDiagnostics} from '../src/tournaments/providerResolution.js';
test('retains best rejected provider candidate',()=>{const result=providerResolutionDiagnostics({name:'PGL Wallachia Season 9',startDate:'2026-09-17',endDate:'2026-09-27'},[{name:'PGL Wallachia Season 8',leagueId:'100',startDate:'2026-05-01',endDate:'2026-05-10',provider:'steam'}]);assert.equal(result.providerIdState,'unresolved');assert.equal(result.providerIdBestRejectedName,'PGL Wallachia Season 8');assert.ok(result.providerIdAlternatives.length);});
test('platform exposes source diagnostics and unresolved evidence',()=>{const source=fs.readFileSync(new URL('../src/tournaments/platformView.js',import.meta.url),'utf8');assert.match(source,/ID discovery sources/);assert.match(source,/Best unresolved matches/);assert.match(source,/providerIdBestRejectedConfidence/);});
test('discovery stores candidate pool metrics',()=>{const source=fs.readFileSync(new URL('../src/tournaments/discoveryService.js',import.meta.url),'utf8');assert.match(source,/candidatePool/);assert.match(source,/resolvedCandidates/);assert.match(source,/unresolvedCandidates/);});
