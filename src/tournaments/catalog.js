import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withinDiscoveryHorizon } from './eligibility.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(root, 'data', 'catalog', 'tournaments.json');
const empty = () => ({version:6, tournaments:{}});

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
function sanitizeLegacyConfiguredMetadata(event) {
  if (event.coverage !== 'configured' && !(event.sources || []).includes('configured') && event.provider !== 'configured') return event;
  const sources = (event.sources || [event.provider]).filter(source => source !== 'configured');
  const provider = event.provider === 'configured' ? (sources[0] || 'archive') : event.provider;
  const { coverage, ...rest } = event;
  return {
    ...rest,
    provider,
    sources,
    providerAgreement: sources.length,
    legacyConfiguredMetadataRemovedAt: new Date().toISOString()
  };
}

const resolutionFields = ['providerIdState','providerIdCandidate','providerIdCandidateName','providerIdConfidence','providerIdReason','providerIdSource','providerIdEvidence','providerIdBestRejectedName','providerIdBestRejectedLeagueId','providerIdBestRejectedConfidence','providerIdAlternatives'];
function latestResolution(current, incoming) {
  const patch = {};
  for (const field of resolutionFields) {
    if (Object.prototype.hasOwnProperty.call(incoming, field)) patch[field] = incoming[field];
    else if (Object.prototype.hasOwnProperty.call(current, field)) patch[field] = current[field];
  }
  return patch;
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
    ...latestResolution(current, incoming),
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

  for (const stored of Object.values(oldCatalog.tournaments || {})) {
    const old = sanitizeLegacyConfiguredMetadata(stored);
    const valid = old.verifiedTierOne || old.verifiedTierOneChild;
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
  const catalog = {version:6, lastPrunedAt:stamp, tournaments};
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
