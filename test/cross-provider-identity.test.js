import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function isolatedCatalog() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dota-catalog-test-'));
  const sourceDirectory = path.resolve('src/tournaments');
  const targetDirectory = path.join(temporaryRoot, 'src', 'tournaments');
  fs.mkdirSync(targetDirectory, { recursive: true });
  fs.cpSync(path.join(sourceDirectory, 'catalog.js'), path.join(targetDirectory, 'catalog.js'));
  fs.cpSync(path.join(sourceDirectory, 'eligibility.js'), path.join(targetDirectory, 'eligibility.js'));
  const module = await import(`${pathToFileURL(path.join(targetDirectory, 'catalog.js')).href}?test=${Date.now()}-${Math.random()}`);
  return { module, temporaryRoot };
}

test('merges configured and provider records with same identity', async t => {
  const { module, temporaryRoot } = await isolatedCatalog();
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));

  module.mergeAndPruneTournaments([
    { id:'configured-ti-2026', leagueId:'19719', name:'The International 2026', startDate:'2026-08-13', endDate:'2026-08-23', score:100, provider:'configured', sources:['configured'], coverage:'configured', verifiedTierOne:true },
    { id:'opendota-19719', leagueId:'19719', name:'The International 2026', startDate:'2026-08-14', endDate:'2026-08-23', score:65, provider:'opendota', sources:['opendota'], verifiedTierOne:true },
    { id:'liquipedia-ti-2026', name:'The International 2026', startDate:'2026-08-13', endDate:'2026-08-23', score:65, provider:'liquipedia', sources:['liquipedia'], verifiedTierOne:true }
  ], { protectedLeagueIds:['19719'], now:Date.parse('2026-08-23T12:00:00Z') });

  const rows = module.listTournaments();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'configured-ti-2026');
  assert.equal(rows[0].score, 100);
  assert.deepEqual(new Set(rows[0].sources), new Set(['configured','opendota','liquipedia']));
});

test('does not merge same name from different years', async t => {
  const { module, temporaryRoot } = await isolatedCatalog();
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));

  module.mergeAndPruneTournaments([
    { id:'event-2026', leagueId:'26001', name:'Example Cup', startDate:'2026-09-01', endDate:'2026-09-10', provider:'liquipedia', verifiedTierOne:true },
    { id:'event-2027', leagueId:'27001', name:'Example Cup', startDate:'2027-09-01', endDate:'2027-09-10', provider:'liquipedia', verifiedTierOne:true }
  ], {
    protectedLeagueIds:['26001','27001'],
    now:Date.parse('2026-08-23T12:00:00Z')
  });

  const rows = module.listTournaments();
  assert.equal(rows.length, 2);
  assert.deepEqual(new Set(rows.map(row => row.id)), new Set(['event-2026','event-2027']));
});
