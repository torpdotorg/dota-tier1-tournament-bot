import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');
test('platform command is registered and handled',()=>{assert.match(read('register-commands.js'),/setName\('platform'\)/);assert.match(read('index.js'),/commandName==='platform'/);assert.match(read('index.js'),/platformStatusEmbed/);});
test('public view contains operational sections',()=>{const source=read('tournaments/platformView.js');for(const token of['Discovery','Providers','Coverage','Next main event','Observation mode'])assert.ok(source.includes(token),token);});
test('generic runtime remains intact',()=>{const source=read('index.js');assert.match(source,/ValveTournamentAdapter/);assert.doesNotMatch(source,/ConfiguredTournamentAdapter|startScheduler|tiLeagueId/);});
