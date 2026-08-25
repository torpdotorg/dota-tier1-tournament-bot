import test from 'node:test';import assert from 'node:assert/strict';
const classify=e=>/404/.test(e.message)?'not-ready':/timeout|network/i.test(e.message)?'temporary':'fatal';
test('OpenDota 404 is treated as not ready',()=>assert.equal(classify(new Error('HTTP 404 from api.opendota.com')),'not-ready'));
test('provider timeout is temporary',()=>assert.equal(classify(new Error('Temporary connection timeout from api.steampowered.com')),'temporary'));
