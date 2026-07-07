import { db, now } from './db.js';

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

export function searchUsers(query, excludeUserId, limit = 20) {
  const like = `%${query.toLowerCase()}%`;
  return db.prepare(
    `SELECT * FROM users WHERE id != ? AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?) LIMIT ?`
  ).all(excludeUserId, like, like, limit);
}

export function heartbeat(id) {
  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now(), id);
}

export function setCurrentRoom(id, roomCode) {
  db.prepare('UPDATE users SET current_room_code = ? WHERE id = ?').run(roomCode, id);
}

const ONLINE_WINDOW_MS = 60_000;

export function presenceFor(user) {
  if (!user) return 'offline';
  if (user.current_room_code) return 'in_game';
  if (user.last_seen_at && now() - user.last_seen_at < ONLINE_WINDOW_MS) return 'online';
  return 'offline';
}

// Clears stale in-game flags for users whose heartbeat lapsed without a
// clean "leave" call (closed tab, crashed client, etc).
export function sweepStalePresence() {
  const cutoff = now() - ONLINE_WINDOW_MS * 3;
  db.prepare('UPDATE users SET current_room_code = NULL WHERE current_room_code IS NOT NULL AND (last_seen_at IS NULL OR last_seen_at < ?)').run(cutoff);
}
