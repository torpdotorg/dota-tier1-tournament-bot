import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=f=>fs.readFileSync(new URL(`../src/${f}`,import.meta.url),'utf8');
test('startup integrations remain wired',()=>{const s=read('index.js');for(const token of ['getTournamentTeams','syncTierOneSeeds','loadTeamEmojiLabels','syncApplicationTeamEmojis','MessageFlags.Ephemeral'])assert.ok(s.includes(token),token);});
test('critical reliability code remains present',()=>{assert.ok(read('scheduler.js').includes('finalRetryAttempts'));assert.ok(read('bracket.js').includes('baselineComplete'));assert.ok(read('bracket.js').includes("teamLabel"));});
