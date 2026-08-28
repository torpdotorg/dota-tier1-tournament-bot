import { coordinatedLiquipediaFetch, liquipediaRequestState } from '../liquipediaRequestCoordinator.js';
import fs from 'node:fs';
import path from 'node:path';
import { TournamentProviderAdapter } from './providerAdapter.js';

const API = 'https://liquipedia.net/dota2/api.php';
const CACHE_MS = 6 * 60 * 60 * 1000;
const CACHE_SCHEMA = 2;
const cacheDirectory = path.join(process.cwd(), 'data', 'catalog', 'structures');
const rawDirectory = path.join(cacheDirectory, 'raw');

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&#45;/g, '-')
    .replace(/&#95;/g, '_')
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)));
}
function plainText(value = '') {
  return decodeHtml(String(value).replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function cleanValue(value) {
  const cleaned = plainText(value).replace(/^[:–-]+\s*/, '').trim();
  return cleaned && cleaned !== ':' ? cleaned : null;
}
function pageName(event) { return String(event?.liquipediaPage || '').replace(/^\/+/, '').replace(/^dota2\//i, ''); }
function safeName(event) { return String(event?.id || pageName(event) || 'unknown').replace(/[^a-z0-9_-]+/gi, '-'); }
function cacheFile(event) { return path.join(cacheDirectory, `${safeName(event)}.json`); }
function rawFile(event) { return path.join(rawDirectory, `${safeName(event)}.html`); }
function captureRaw(event, html) {
  fs.mkdirSync(rawDirectory, { recursive: true });
  fs.writeFileSync(rawFile(event), String(html || ''), 'utf8');
  return rawFile(event);
}
function validStructure(structure) {
  return structure?.cacheSchema === CACHE_SCHEMA
    && structure?.diagnostics?.pageFound === true
    && Number(structure?.diagnostics?.htmlBytes || 0) > 0
    && structure?.format !== ':';
}
function readCache(event, allowStale = false) {
  try {
    const value = JSON.parse(fs.readFileSync(cacheFile(event), 'utf8'));
    if (value.schema !== CACHE_SCHEMA || !validStructure(value.structure)) return null;
    if (!allowStale && Date.now() - Date.parse(value.fetchedAt) >= CACHE_MS) return null;
    return value.structure;
  } catch { return null; }
}
function writeCache(event, structure) {
  if (!validStructure(structure)) return false;
  fs.mkdirSync(cacheDirectory, { recursive: true });
  fs.writeFileSync(cacheFile(event), JSON.stringify({ schema: CACHE_SCHEMA, fetchedAt: structure.fetchedAt || new Date().toISOString(), structure }, null, 2));
  return true;
}
async function fetchPageHtml(event, config) {
  const page=pageName(event);if(!page)throw new Error('Liquipedia page identifier is unavailable');if(!config?.liquipediaUserAgent)throw new Error('LIQUIPEDIA_USER_AGENT is not configured');
  const url=`${API}?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json&formatversion=2`;
  const data=await coordinatedLiquipediaFetch(url,{headers:{'User-Agent':config.liquipediaUserAgent,'Accept-Encoding':'gzip'}},30000);
  if(!data?.parse?.text)throw new Error('Liquipedia returned no parsed page content');return data.parse.text;
}
function extractInfobox(html) {
  const result = {};
  const source = String(html || '');
  const assign = (labelValue, rawValue) => {
    const label = plainText(labelValue).replace(/:$/, '').trim().toLowerCase();
    const value = cleanValue(rawValue);
    if (!value) return;
    if (label === 'format' || label === 'tournament format') result.format = value;
    else if (label === 'location') result.location = value;
    else if (label === 'teams' || label === 'participants') result.participants = value;
    else if (label === 'type') result.type = value;
    else if (label === 'server') result.server = value;
    else if (label === 'start date') result.startDate = value;
    else if (label === 'end date') result.endDate = value;
  };

  const rowPattern = /<div>\s*<div[^>]*class="[^"]*infobox-cell-2\s+infobox-description[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  for (const match of source.matchAll(rowPattern)) assign(match[1], match[2]);

  // Compatibility with compact/synthetic markup used by existing regression tests.
  const legacyCells = source.match(/<div[^>]*class="[^"]*infobox-cell-2[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
  for (const cell of legacyCells) {
    const text = plainText(cell);
    const match = text.match(/^(Format|Tournament Format|Location|Teams|Participants|Type|Server|Start Date|End Date)\s*[:–-]?\s*(.*)$/i);
    if (match && !(match[1].toLowerCase() === 'format' && result.format)) assign(match[1], match[2]);
  }
  return result;
}
function extractFormatDetails(html) {
  const section = String(html).match(/<h2[^>]*id="Format"[^>]*>[\s\S]*?<\/h2>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)?.[1] || '';
  return [...section.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(match => plainText(match[1])).filter(Boolean).slice(0, 8);
}
function extractParticipantSlots(html) {
  const cards = String(html).split(/class="general-collapsible collapsed team-participant-card"/i).slice(1);
  const slots = [];
  for (const card of cards) {
    const header = card.slice(0, card.indexOf('class="should-collapse') > 0 ? card.indexOf('class="should-collapse') : 5000);
    const name = cleanValue(header.match(/class="name"[^>]*>([\s\S]*?)<\/span>/i)?.[1]);
    const label = cleanValue(header.match(/team-participant-card[^>]*label[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1]);
    const qualifier = cleanValue(header.match(/team-participant-card[^>]*qualifier-details[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1]);
    slots.push({ slot: slots.length + 1, name: name && name !== 'TBD' ? name : null, status: label || 'TBD', qualifier: qualifier || null });
    if (slots.length >= 32) break;
  }
  return slots;
}
function extractLegacyTeams(html) {
  const blocks = String(html).match(/<(?:div|span|tr|li)[^>]*class="[^"]*(?:team-template|teamcard|participant|team-template-text)[^"]*"[^>]*>[\s\S]*?<\/(?:div|span|tr|li)>/gi) || [];
  const rows = [];
  for (const block of blocks) {
    for (const match of block.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const href = decodeHtml(match[1]);
      const name = cleanValue(match[2]);
      if (!name || name === 'TBD' || !/\/dota2\//i.test(href) || /action=|redlink|File:|Category:/i.test(href)) continue;
      rows.push({ name, liquipediaPage: href.replace(/^.*?\/dota2\//, '') });
    }
  }
  const seen = new Set();
  return rows.filter(team => {
    const key = team.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 32);
}
function extractTeams(slots, html) {
  const namedSlots = slots.filter(slot => slot.name).map(slot => ({ name: slot.name, slot: slot.slot, status: slot.status }));
  return namedSlots.length ? namedSlots : extractLegacyTeams(html);
}
function extractBracket(html) {
  const rounds = [...String(html).matchAll(/class="brkts-header brkts-header-div"[^>]*>([^<]+)/gi)].map(match => cleanValue(match[1])).filter(Boolean);
  const matchBlocks = String(html).split(/class="brkts-match brkts-match-popup-wrapper[^\"]*"/i).slice(1);
  const matches = [];
  for (const block of matchBlocks) {
    const segment = block.slice(0, block.indexOf('class="brkts-match-info-icon') > 0 ? block.indexOf('class="brkts-match-info-icon') : 12000);
    const names = [...segment.matchAll(/match-info-header-opponent[\s\S]*?class="name"[^>]*>([\s\S]*?)<\/span>/gi)].map(match => cleanValue(match[1]) || 'TBD').slice(0, 2);
    if (names.length < 2) continue;
    const bestOf = cleanValue(segment.match(/match-info-header-scoreholder-lower"[^>]*>\s*\(?(Bo\d+)\)?/i)?.[1]);
    const id = decodeHtml(segment.match(/Match:ID_([^&\"]+)/i)?.[1] || `match-${matches.length + 1}`).replace(/_/g, '-');
    const roundCode = id.match(/R(\d{2})/i)?.[1];
    const roundIndex = roundCode ? Math.max(0, Number(roundCode) - 1) : Math.min(matches.length, rounds.length - 1);
    matches.push({ id: `lp-${id}`, round: rounds[roundIndex] || 'Bracket', teams: names, bestOf: bestOf || null, status: names.every(name => name === 'TBD') ? 'scheduled-tbd' : 'scheduled' });
    if (matches.length >= 32) break;
  }
  if (!matches.length) {
    const blocks = String(html).match(/<(?:div|table)[^>]*class="[^"]*(?:bracket|brkts|matchlist)[^"]*"[^>]*>[\s\S]*?<\/(?:div|table)>/gi) || [];
    for (const block of blocks) {
      const names = [...block.matchAll(/<a\b[^>]*href="[^"]*\/dota2\/[^"]+"[^>]*>([\s\S]*?)<\/a>/gi)]
        .map(match => cleanValue(match[1]))
        .filter(name => name && name !== 'TBD');
      for (let index = 0; index + 1 < names.length; index += 2) {
        matches.push({ id: `lp-legacy-${matches.length + 1}`, round: rounds[0] || 'Bracket', teams: [names[index], names[index + 1]], bestOf: null, status: 'scheduled' });
      }
    }
  }
  return { rounds: [...new Set(rounds)], matches };
}
export function parseLiquipediaStructure(html, event = {}) {
  const source = String(html || '');
  const infobox = extractInfobox(source);
  const participantSlots = extractParticipantSlots(source);
  const teams = extractTeams(participantSlots, source);
  const bracketResult = extractBracket(source);
  const participantCount = Number.parseInt(infobox.participants, 10) || participantSlots.length || null;
  const formatDetails = extractFormatDetails(source);
  const stages = bracketResult.rounds.length ? bracketResult.rounds : [...source.matchAll(/<h2[^>]*id="([^"]+)"[^>]*>/gi)].map(match => decodeHtml(match[1]).replace(/_/g, ' ')).filter(value => /format|participants|results|playoff|bracket|final/i.test(value));
  const diagnostics = {
    pageFound: Boolean(source.trim()), htmlBytes: Buffer.byteLength(source, 'utf8'), infoboxDetected: /data-analytics-infobox-type="Tournament"/i.test(source), headingsFound: (source.match(/<h2\b/gi) || []).length,
    participantCardsFound: participantSlots.length, participantSlotsNamed: teams.length, participantSlotsTbd: participantSlots.filter(slot => !slot.name).length,
    bracketHeadersFound: bracketResult.rounds.length, bracketMatchNodesFound: bracketResult.matches.length, bracketMatchesNamed: bracketResult.matches.filter(match => match.teams.some(name => name !== 'TBD')).length,
    teamsParsed: teams.length, bracketMatchesParsed: bracketResult.matches.length
  };
  return {
    cacheSchema: CACHE_SCHEMA, tournamentId: event.id || null, tournamentName: event.name || null, liquipediaPage: pageName(event),
    format: cleanValue(infobox.format), formatDetails, location: infobox.location || null, eventType: infobox.type || null, server: infobox.server || null,
    participantText: infobox.participants || null, participantCount, participantSlots, stages: [...new Set(stages)].slice(0, 12), teams, bracket: bracketResult.matches,
    capabilities: { tournamentInfo: true, teams: teams.length > 0, teamSlots: participantSlots.length > 0, bracket: bracketResult.matches.length > 0, bracketNamed: bracketResult.matches.some(match => match.teams.some(name => name !== 'TBD')), schedule: false, standings: false, liveGames: false, results: false },
    diagnostics, source: 'Liquipedia MediaWiki API'
  };
}
export class LiquipediaStructureAdapter extends TournamentProviderAdapter {
  constructor(config) { super('liquipedia-structure'); this.config = config; }
  supports(context) { return Boolean(pageName(context)); }
  capabilities(context) { return { tournamentInfo: this.supports(context), teams: this.supports(context), bracket: this.supports(context) }; }
  async getStructure(context, { force = false } = {}) {
    if (!force) { const cached = readCache(context); if (cached) return { ...cached, cacheStatus: 'cached' }; }
    const state=liquipediaRequestState();
    if(state.cooldownActive){const stale=readCache(context,true);if(stale)return{...stale,cacheStatus:'stale-cache'};}
    let html;try{html=await fetchPageHtml(context,this.config);}catch(error){const stale=readCache(context,true);if(stale)return{...stale,cacheStatus:'stale-cache'};throw error;}
    const rawPath = captureRaw(context, html);
    const structure = { ...parseLiquipediaStructure(html, context), fetchedAt: new Date().toISOString(), rawCapturePath: path.relative(process.cwd(), rawPath) };
    writeCache(context, structure);
    return { ...structure, cacheStatus: 'live' };
  }
  async getDiagnostics(context, { force = false } = {}) {
    const structure = await this.getStructure(context, { force });
    return { tournament: context?.name || null, page: pageName(context) || null, cacheSchema: structure.cacheSchema, cacheStatus: structure.cacheStatus, fetchedAt: structure.fetchedAt || null, rawCapturePath: structure.rawCapturePath || null, participantCount: structure.participantCount || null, format: structure.format || null, capabilities: structure.capabilities, ...structure.diagnostics };
  }
  async healthCheck(context) {
    if (!this.supports(context)) return { status: 'unavailable', reason: 'Liquipedia page identifier is unavailable' };
    try { await this.getStructure(context); return { status: 'healthy' }; } catch (error) { return { status: 'failed', reason: error.message }; }
  }
}
