import { randomUUID } from 'node:crypto';
import { db, now } from './db.js';

export function logActivity({ ownerUserId, actorUserId, type, payload }) {
  db.prepare('INSERT INTO activity_events (id, owner_user_id, actor_user_id, type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), ownerUserId, actorUserId || null, type, JSON.stringify(payload || {}), now());
}

// Logs one event per friend's feed (plus the actor's own, if desired) — kept
// denormalized (one row per recipient) since this app's scale doesn't need a
// fan-out-on-read model.
export function logActivityToFriends(actorUserId, friendIds, type, payload) {
  for (const friendId of friendIds) {
    logActivity({ ownerUserId: friendId, actorUserId, type, payload });
  }
}

export function getActivityFeed(userId, limit = 30) {
  const rows = db.prepare(
    `SELECT e.*, u.display_name as actor_name, u.username as actor_username
     FROM activity_events e
     LEFT JOIN users u ON u.id = e.actor_user_id
     WHERE e.owner_user_id = ?
     ORDER BY e.created_at DESC
     LIMIT ?`
  ).all(userId, limit);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    actor: r.actor_user_id ? { id: r.actor_user_id, name: r.actor_name, username: r.actor_username } : null,
    payload: JSON.parse(r.payload_json),
    createdAt: r.created_at,
  }));
}
