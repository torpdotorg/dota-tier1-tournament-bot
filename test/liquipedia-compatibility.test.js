import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isoDate,
  isoDateRange,
  parseWikitext,
  parsePortalHtml
} from '../src/tournaments/liquipediaTierOneProvider.js';

test('exports both current and legacy date parsers', () => {
  assert.equal(isoDate, isoDateRange);
  assert.deepEqual(isoDate('Sep 29 – Oct 11, 2026'), {
    startDate: '2026-09-29',
    endDate: '2026-10-11'
  });
});

test('legacy wikitext parser remains supported', () => {
  const rows = parseWikitext('|-\n| [[BLAST/SLAM/8|BLAST SLAM VIII]] || Sep 29 – Oct 11, 2026');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'BLAST SLAM VIII');
});

test('current HTML parser remains supported', () => {
  const html = '<table><tr><td><a href="/dota2/Tier_1_Tournaments">Tier 1</a></td><td><a href="/dota2/PGL/Wallachia/9">PGL Wallachia Season 9</a></td><td>Sep 17–27, 2026</td></tr></table>';
  assert.equal(parsePortalHtml(html).tournaments.length, 1);
});
