import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cacheFile = path.join(root, 'data', 'catalog', 'liquipedia-tier1.json');
const api = 'https://liquipedia.net/dota2/api.php';
const cacheMs = 6 * 60 * 60 * 1000;

async function fetchApiJson(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function readCache() {
  try {
    const value = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (Date.now() - Date.parse(value.fetchedAt) < cacheMs && Array.isArray(value.tournaments) && value.tournaments.length) {
      return { tournaments: value.tournaments, diagnostics: value.diagnostics || { parsedRows: value.tournaments.length } };
    }
  } catch {}
  return null;
}

function writeCache(tournaments, diagnostics) {
  if (!tournaments.length) return false;
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    source: 'Liquipedia MediaWiki API',
    diagnostics,
    tournaments
  }, null, 2));
  return true;
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function plainText(value = '') {
  return decodeHtml(String(value)
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function isoDateRange(value, fallbackYear = new Date().getUTCFullYear()) {
  const text = plainText(value).replace(/[–—]/g, '-');
  const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const match = text.match(/([A-Za-z]{3})\s+(\d{1,2})(?:\s*-\s*(?:([A-Za-z]{3})\s*)?(\d{1,2}))?,?\s*(\d{4})?/);
  if (!match) return {};
  const startMonth = months[match[1].toLowerCase()];
  const endMonth = months[(match[3] || match[1]).toLowerCase()];
  if (!startMonth || !endMonth) return {};
  const year = Number(match[5] || fallbackYear);
  const fmt = (month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { startDate: fmt(startMonth, Number(match[2])), endDate: fmt(endMonth, Number(match[4] || match[2])) };
}

export const isoDate = isoDateRange;

export function parseWikitext(value) {
  const input = String(value || '');
  if (/<tr\b/i.test(input)) return parsePortalHtml(input).tournaments;

  const rows = [];
  for (const block of input.split(/^\|-/m).slice(1)) {
    const links = [...block.matchAll(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g)];
    const date = block.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:\s*[–—-]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*)?\d{1,2})?,?\s*\d{4}/i);
    if (!links.length || !date) continue;
    const selected = links.at(-1);
    const name = plainText(selected[2] || selected[1]);
    const dates = isoDateRange(date[0]);
    if (!name || !dates.startDate) continue;
    rows.push({
      id: `liquipedia-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      name,
      tier: 1,
      ...dates,
      provider: 'liquipedia',
      sources: ['liquipedia'],
      providerAgreement: 1,
      hasSchedule: true,
      verifiedTierOne: true,
      eventType: 'main',
      liquipediaPage: selected[1]
    });
  }
  return rows;
}

function anchorCandidates(cell = '') {
  return [...String(cell).matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => ({ href: decodeHtml(match[1]), text: plainText(match[2]) }))
    .filter(link => link.text && !/^(Tier [1-4]|Qual\.?|Showm\.?|Nation|Valve)$/i.test(link.text))
    .filter(link => /\/dota2\//i.test(link.href) && !/Tier_[1-4]_Tournaments|Qualifier_Tournaments|Show_Matches|National_Tournaments|Valve/i.test(link.href));
}

function classifyRow(rowHtml, cellTexts) {
  const text = plainText(rowHtml);
  const tierOne = /Tier\s*1/i.test(text);
  const qualifier = /\bQual\.?\b|Qualifier/i.test(text);
  const playIn = /Play[- ]?In/i.test(text);
  const showmatch = /\bShowm\.?\b|Showmatch/i.test(text);
  return { tierOne, qualifier, playIn, showmatch, eventType: playIn ? 'play-in' : qualifier ? 'qualifier' : showmatch ? 'showmatch' : 'main', rowText: text, cellTexts };
}

export function parsePortalHtml(html) {
  const rows = [];
  const rawRows = String(html || '').match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  let candidateRows = 0;
  let tierOneRows = 0;
  for (const rowHtml of rawRows) {
    const cells = [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(match => match[1]);
    if (cells.length < 2) continue;
    const cellTexts = cells.map(plainText);
    const dateCellIndex = cellTexts.findIndex(value => /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i.test(value));
    if (dateCellIndex < 0) continue;
    candidateRows++;
    const type = classifyRow(rowHtml, cellTexts);
    if (!type.tierOne) continue;
    tierOneRows++;
    const dateValue = cellTexts[dateCellIndex];
    const dates = isoDateRange(dateValue);
    if (!dates.startDate) continue;
    const tournamentCells = cells.slice(0, dateCellIndex);
    const links = tournamentCells.flatMap(anchorCandidates);
    const selected = links.at(-1);
    if (!selected) continue;
    const name = selected.text;
    const id = `liquipedia-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    rows.push({
      id,
      name,
      tier: 1,
      verifiedTierOne: type.eventType === 'main',
      verifiedTierOneChild: type.eventType !== 'main',
      eventType: type.eventType,
      ...dates,
      provider: 'liquipedia',
      sources: ['liquipedia'],
      providerAgreement: 1,
      hasSchedule: true,
      liquipediaPage: selected.href.replace(/^.*?\/dota2\//, ''),
      rawTierText: cellTexts[0] || ''
    });
  }
  const tournaments = [...new Map(rows.map(row => [`${row.name}|${row.startDate}`, row])).values()];
  return { tournaments, diagnostics: { rawTableRows: rawRows.length, candidateRows, tierOneRows, parsedRows: tournaments.length } };
}

export async function discoverLiquipediaTierOne(config, { force = false } = {}) {
  if (!config.liquipediaUserAgent) return { status: 'disabled', tournaments: [], reason: 'LIQUIPEDIA_USER_AGENT not configured', diagnostics: {} };
  if (!force) {
    const cached = readCache();
    if (cached) return { status: 'cached', tournaments: cached.tournaments, diagnostics: cached.diagnostics };
  }
  const url = `${api}?action=parse&page=${encodeURIComponent('Portal:Tournaments')}&prop=text&format=json&formatversion=2`;
  const data = await fetchApiJson(url, { headers: { 'User-Agent': config.liquipediaUserAgent, 'Accept-Encoding': 'gzip' } }, 30000);
  const parsed = parsePortalHtml(data?.parse?.text || '');
  if (!parsed.tournaments.length) {
    const oldCache = readCache();
    if (oldCache) return { status: 'stale-cache', tournaments: oldCache.tournaments, reason: 'Live parse returned zero rows', diagnostics: oldCache.diagnostics || parsed.diagnostics };
    return { status: 'empty', tournaments: [], reason: 'Liquipedia API returned HTML but no Tier 1 rows were parsed', diagnostics: parsed.diagnostics };
  }
  writeCache(parsed.tournaments, parsed.diagnostics);
  return { status: 'live', ...parsed };
}
