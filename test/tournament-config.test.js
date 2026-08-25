import test from 'node:test';import assert from 'node:assert/strict';import {tournament,tournamentDay,mainEventDay} from '../src/tournamentConfig.js';
test('TI dates calculate correctly',()=>{assert.equal(tournamentDay('2026-08-22'),10);assert.equal(mainEventDay('2026-08-22'),3);assert.equal(tournament.leagueId,'19719');});
