import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const commandContextSource = fs.readFileSync(
  new URL('../src/tournaments/commandContext.js', import.meta.url),
  'utf8'
);

const catalogSource = fs.readFileSync(
  new URL('../src/tournaments/catalog.js', import.meta.url),
  'utf8'
);

test('default context prefers main events over qualifiers', () => {
  assert.match(commandContextSource, /eventType/);
  assert.match(commandContextSource, /main/);
  assert.match(commandContextSource, /upcoming/);
});

test('catalog migrates retired configured source metadata', () => {
  assert.match(catalogSource, /sanitizeLegacyConfiguredMetadata/);
  assert.match(catalogSource, /legacyConfiguredMetadataRemovedAt/);
  assert.match(
    catalogSource,
    /filter\s*\(\s*source\s*=>\s*source\s*!==\s*['"]configured['"]\s*\)/
  );
});
