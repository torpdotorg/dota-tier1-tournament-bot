import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withinDiscoveryHorizon } from './eligibility.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(root, 'data', 'catalog', 'tournaments.json');
const empty = () => ({ version: 5, tournaments: {} });

function ensure() {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(empty(), null, 2));
}

export function readCatalog() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return empty();
  }
}

export function writeCatalog(catalog) {
  ensure();
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(catalog, null, 2));
  fs.renameSync(temp, file);
}

export function normalizedTournamentName(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/the international/g, 'ti')
    .replace(/season/g, 's')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function dateValue(value, endOfDay = false) {
  if (!value) return Number.NaN;
  return Date.parse(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}Z`);
}

function datesOverlap(a, b) {
  const aStart = dateValue(a.startDate);
  const aEnd = dateValue(a.endDate || a.startDate, true);
  const bStart = dateValue(b.startDate);
  const bEnd = dateValue(b.endDate || b.startDate, true);
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return true;
  const tolerance = 3 * 86_400_000;
  return aStart <= bEnd + tolerance && bStart <= aEnd + tolerance;
}

function sameTournament(a, b) {
  if (a.leagueId && b.leagueId && String(a.leagueId) === String(b.leagueId)) return true;
  return normalizedTournamentName(a.name) === normalizedTournamentName(b.name) && datesOverlap(a, b);
}

function mergeSources(a = [], b = []) {
  return [...new Set([...a, ...b].filter(Boolean))];
}

function mergeDuplicate(current, incoming) {
  const preferred = current.coverage === 'configured'
    ? current
    : incoming.coverage === 'configured'
      ? incoming
      : Number(incoming.score || 0) > Number(current.score || 0)
        ? incoming
        : current;
  const secondary = preferred === current ? incoming : current;
  const sources = mergeSources(current.sources || [current.provider], incoming.sources || [incoming.provider]);
  const leagueId = preferred.leagueId || secondary.leagueId || null;

  return {
    ...secondary,
    ...preferred,
    leagueId,
    score: Math.max(Number(current.score || 0), Number(incoming.score || 0)),
    sources,
    providerAgreement: sources.length,
    firstDiscoveredAt: current.firstDiscoveredAt || incoming.firstDiscoveredAt,
    lastCheckedAt: incoming.lastCheckedAt || current.lastCheckedAt,
    aliases: [...new Set([
      current.name,
      incoming.name,
      ...(current.aliases || []),
      ...(incoming.aliases || [])
    ].filter(Boolean))]
  };
}

function mergeIntoList(list, candidate) {
  const index = list.findIndex(existing => sameTournament(existing, candidate));
  if (index < 0) list.push(candidate);
  else list[index] = mergeDuplicate(list[index], candidate);
}

export function mergeAndPruneTournaments(candidates, { protectedLeagueIds = [], now = Date.now() } = {}) {
  const oldCatalog = readCatalog();
  const stamp = new Date().toISOString();
  const protectedIds = new Set(protectedLeagueIds.map(String));
  const merged = [];

  for (const old of Object.values(oldCatalog.tournaments || {})) {
    const valid = old.coverage === 'configured' || old.verifiedTierOne || old.verifiedTierOneChild;
    const keep = valid && (protectedIds.has(String(old.leagueId)) || withinDiscoveryHorizon(old, now));
    if (keep) mergeIntoList(merged, old);
  }

  for (const candidate of candidates) {
    const protectedCandidate = candidate.coverage === 'configured' || protectedIds.has(String(candidate.leagueId));
    if (!protectedCandidate && !withinDiscoveryHorizon(candidate, now)) continue;
    const prepared = {
      ...candidate,
      sources: mergeSources(candidate.sources, [candidate.provider]),
      firstDiscoveredAt: candidate.firstDiscoveredAt || stamp,
      lastCheckedAt: stamp
    };
    mergeIntoList(merged, prepared);
  }

  const tournaments = {};
  for (const row of merged) tournaments[row.id] = row;

  const removed = Math.max(0, Object.keys(oldCatalog.tournaments || {}).length - Object.keys(tournaments).length);
  const catalog = { version: 5, lastPrunedAt: stamp, tournaments };
  writeCatalog(catalog);
  return { catalog, removed };
}

export function listTournaments() {
  return Object.values(readCatalog().tournaments || {});
}

export function updateTournament(id, patch) {
  const catalog = readCatalog();
  const current = catalog.tournaments?.[id];
  if (!current) return null;
  catalog.tournaments[id] = { ...current, ...patch, updatedAt: new Date().toISOString() };
  writeCatalog(catalog);
  return catalog.tournaments[id];
}
