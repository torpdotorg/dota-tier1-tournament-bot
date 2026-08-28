import test from 'node:test';
import assert from 'node:assert/strict';
import { tournamentDiscoveryText, tournamentCatalogCounts } from '../src/tournaments/presentation.js';
const summary={total:4,active:[],upcoming:[{name:'Main Cup',eventType:'main',score:80,startDate:'2026-09-01',sources:['liquipedia']},{name:'Main Cup Qualifier',eventType:'qualifier',score:60,startDate:'2026-08-28',sources:['liquipedia']}],monitoring:[],completed:[{name:'Old Cup',eventType:'main',score:80,startDate:'2026-08-01',sources:['opendota']}]};
test('discovery groups main events separately from child events',()=>{const text=tournamentDiscoveryText(summary);assert.match(text,/UPCOMING MAIN EVENTS/);assert.match(text,/UPCOMING QUALIFIERS & PLAY-INS/);assert.ok(text.indexOf('Main Cup\n')<text.indexOf('Main Cup Qualifier'));});
test('catalog counts expose main and child upcoming totals',()=>{const text=tournamentCatalogCounts(summary);assert.match(text,/1 upcoming main events/);assert.match(text,/1 upcoming qualifiers\/play-ins/);});
