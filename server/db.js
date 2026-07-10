import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

// node:sqlite is experimental as of Node 22-24 but stable enough for this
// app's needs, and it means zero extra native-compiled dependencies for a
// "something light" database. Swap for Postgres/etc. later by replacing this
// file's exports — callers only use the query helpers below, never the raw
// DatabaseSync instance.
const DB_PATH = process.env.STRAIGHT_DB_PATH || path.join(path.dirname(fileURLToPath(import.meta.url)), 'straight.db');

// Logged on every boot so a persistent-storage misconfiguration (wrong path,
// volume not mounted yet at open time, etc.) is visible in the deploy logs
// instead of only showing up as "my data disappeared" after the fact.
const dbAlreadyExisted = existsSync(DB_PATH);
console.log(`[db] opening ${DB_PATH} (already existed: ${dbAlreadyExisted}${dbAlreadyExisted ? `, ${statSync(DB_PATH).size} bytes` : ''})`);

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  current_room_code TEXT
);

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(requester_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  actor_user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  played_at INTEGER NOT NULL,
  duration_minutes INTEGER,
  blinds_small_cents INTEGER NOT NULL,
  blinds_big_cents INTEGER NOT NULL,
  room_code TEXT,
  created_by TEXT REFERENCES users(id),
  settled INTEGER NOT NULL DEFAULT 0,
  settled_at INTEGER
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ledger_sessions(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  buy_in_cents INTEGER NOT NULL,
  rebuys_count INTEGER NOT NULL DEFAULT 0,
  cash_out_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_games (
  id TEXT PRIMARY KEY,
  name TEXT,
  scheduled_at INTEGER NOT NULL,
  repeat_rule TEXT NOT NULL DEFAULT 'none' CHECK (repeat_rule IN ('none','weekly','biweekly','monthly')),
  created_by TEXT REFERENCES users(id),
  room_code TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_game_invites (
  id TEXT PRIMARY KEY,
  scheduled_game_id TEXT NOT NULL REFERENCES scheduled_games(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  rsvp TEXT CHECK (rsvp IN ('going','maybe','cant')),
  responded_at INTEGER,
  UNIQUE(scheduled_game_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL REFERENCES users(id),
  achievement_key TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS hand_history (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES ledger_sessions(id),
  room_code TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  played_at INTEGER NOT NULL,
  hole_cards_json TEXT NOT NULL,
  community_cards_json TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('won','lost','folded')),
  pot_cents INTEGER NOT NULL,
  street_reached TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS device_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_recipient ON friendships(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_owner ON activity_events(owner_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_session ON ledger_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_user ON hand_history(user_id, played_at);
CREATE INDEX IF NOT EXISTS idx_invites_user ON scheduled_game_invites(user_id);
`);

// Lightweight migration helper — node:sqlite has no migration framework, and
// ALTER TABLE ADD COLUMN is the one schema change that's safe to run
// idempotently against a table that already has data (unlike the CREATE
// TABLE IF NOT EXISTS statements above, which only take effect on a
// brand-new database).
function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((r) => r.name === column);
}
function ensureColumn(table, column, definition) {
  if (!columnExists(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn('users', 'email', 'TEXT');
ensureColumn('users', 'password_hash', 'TEXT');
ensureColumn('users', 'apple_sub', 'TEXT');
ensureColumn('users', 'google_sub', 'TEXT');
// SQLite can't add a UNIQUE constraint via ALTER TABLE, so enforce it with an
// index instead — partial so multiple still-interim (emailless/SSO-only) users don't collide.
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub) WHERE apple_sub IS NOT NULL');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL');

export function now() {
  return Date.now();
}
