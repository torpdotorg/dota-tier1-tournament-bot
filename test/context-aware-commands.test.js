import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const registerSource = fs.readFileSync(new URL('../src/register-commands.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const viewSource = fs.readFileSync(new URL('../src/tournaments/contextCommandViews.js', import.meta.url), 'utf8');

test('tournament-aware commands expose an autocomplete tournament option', () => {
  for (const command of ['today','next','standings','results','series','bracket']) {
    const start = registerSource.indexOf(`setName('${command}')`);
    assert.notEqual(start, -1);
    assert.match(registerSource.slice(start, start + 420), /setName\('tournament'\).*setAutocomplete\(true\)/);
  }
});

test('interaction handler responds to tournament autocomplete', () => {
  assert.match(indexSource, /isAutocomplete\(\)/);
  assert.match(indexSource, /tournamentChoices\(focused\)/);
});

test('commands default through selected catalog context rather than TI', () => {
  assert.match(indexSource, /resolveCommandTournament\(selectedQuery\)/);
  assert.match(indexSource, /const usesConfigured=selectedTournament\?\.coverage==='configured'/);
});

test('contextual views provide schedule, next and result layouts', () => {
  assert.match(viewSource, /contextualScheduleEmbed/);
  assert.match(viewSource, /contextualNextEmbed/);
  assert.match(viewSource, /contextualResultsEmbed/);
  assert.match(viewSource, /No completed games are currently available/);
});
