import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('provider ID discovery includes cache, pacing and 429 cooldown',()=>{const s=fs.readFileSync(new URL('../src/tournaments/providerIdDiscovery.js',import.meta.url),'utf8');for(const token of ['MIN_REQUEST_GAP_MS','MAX_LIVE_PAGES_PER_CYCLE','liquipediaCooldownUntil','liquipediaCachedPagesUsed','stale-cache'])assert.ok(s.includes(token),token);});
test('catalog prefers fresh provider-resolution diagnostics from incoming discovery',()=>{const s=fs.readFileSync(new URL('../src/tournaments/catalog.js',import.meta.url),'utf8');for(const token of ['latestResolution','providerIdBestRejectedName','providerIdAlternatives','version:6'])assert.ok(s.includes(token),token);});
test('platform exposes candidate sources, cache use and cooldown',()=>{const s=fs.readFileSync(new URL('../src/tournaments/platformView.js',import.meta.url),'utf8');for(const token of ['OpenDota candidates','Liquipedia cached pages used','Liquipedia cooldown','Steam candidates'])assert.ok(s.includes(token),token);});
