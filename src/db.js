import Database from 'better-sqlite3';
import fs from 'node:fs';

fs.mkdirSync('data', { recursive: true });
const db = new Database('data/bot.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    event_key TEXT PRIMARY KEY,
    discord_message_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS match_state (
    match_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cache (
    cache_key TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

export function hasNotification(key) {
  return Boolean(db.prepare('SELECT 1 FROM notifications WHERE event_key = ?').get(key));
}

export function saveNotification(key, messageId = null) {
  db.prepare('INSERT OR IGNORE INTO notifications(event_key, discord_message_id) VALUES (?, ?)').run(key, messageId);
}

export function setMatchState(matchId, value) {
  db.prepare(`INSERT INTO match_state(match_id, payload, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(match_id) DO UPDATE SET payload=excluded.payload, updated_at=CURRENT_TIMESTAMP`)
    .run(String(matchId), JSON.stringify(value));
}

export function getMatchState(matchId) {
  const row = db.prepare('SELECT payload FROM match_state WHERE match_id = ?').get(String(matchId));
  return row ? JSON.parse(row.payload) : null;
}

export function getTrackedMatches() {
  return db.prepare('SELECT match_id, payload FROM match_state').all().map((row) => ({
    matchId: row.match_id,
    ...JSON.parse(row.payload)
  }));
}

export function getSeriesScore(seriesId, radiant, dire) {
  if (!seriesId) return null;
  const rows=getTrackedMatches().filter(x=>String(x.seriesId||'')===String(seriesId)&&x.status==='ended'&&x.winner);
  const score={ [radiant]:0, [dire]:0 };
  for(const row of rows) if(score[row.winner]!==undefined) score[row.winner]++;
  return { radiant:score[radiant]||0, dire:score[dire]||0 };
}

export function getSetting(key) {
  return db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?').get(key)?.setting_value || null;
}
export function setSetting(key, value) {
  db.prepare(`INSERT INTO settings(setting_key, setting_value) VALUES (?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value`).run(key, String(value));
}

export default db;

export function getNotificationMessageId(key) { return db.prepare('SELECT discord_message_id FROM notifications WHERE event_key = ?').get(key)?.discord_message_id || null; }

// Tournament-scoped helpers used by the generic runtime.
export function scopedMatchId(tournamentId, matchId) { return `${tournamentId}:${matchId}`; }
export function setTournamentMatchState(tournamentId, matchId, value) { return setMatchState(scopedMatchId(tournamentId, matchId), { ...value, tournamentId: String(tournamentId), matchId: String(matchId) }); }
export function getTournamentMatchState(tournamentId, matchId) { return getMatchState(scopedMatchId(tournamentId, matchId)); }
export function getTournamentTrackedMatches(tournamentId) { return getTrackedMatches().filter(row => String(row.tournamentId || '') === String(tournamentId)); }
export function tournamentNotificationKey(tournamentId, scope, entityId = null) { return ['tournament', tournamentId, scope, entityId].filter(value => value != null && value !== '').join(':'); }
