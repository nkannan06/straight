import { randomUUID } from 'node:crypto';
import { db, now } from './db.js';
import { presenceFor } from './users.js';
import { logActivity } from './activity.js';

function findRelationship(userA, userB) {
  return db.prepare(
    `SELECT * FROM friendships WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)`
  ).get(userA, userB, userB, userA);
}

export function areFriends(userA, userB) {
  const rel = findRelationship(userA, userB);
  return !!rel && rel.status === 'accepted';
}

// Sends A -> B. If B already sent a pending request to A, auto-accepts
// instead of creating a duplicate/conflicting row.
export function sendFriendRequest(requesterId, recipientId) {
  if (requesterId === recipientId) throw new Error('Cannot friend yourself');
  const existing = findRelationship(requesterId, recipientId);
  if (existing) {
    if (existing.status === 'accepted') return existing;
    if (existing.status === 'pending' && existing.requester_id === recipientId) {
      return acceptRequest(existing.id, requesterId);
    }
    if (existing.status === 'declined') {
      db.prepare('UPDATE friendships SET status = ?, requester_id = ?, recipient_id = ?, updated_at = ? WHERE id = ?')
        .run('pending', requesterId, recipientId, now(), existing.id);
      return db.prepare('SELECT * FROM friendships WHERE id = ?').get(existing.id);
    }
    return existing; // already pending the same direction
  }
  const id = randomUUID();
  const ts = now();
  db.prepare('INSERT INTO friendships (id, requester_id, recipient_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, requesterId, recipientId, 'pending', ts, ts);
  return { id, requester_id: requesterId, recipient_id: recipientId, status: 'pending', created_at: ts, updated_at: ts };
}

export function acceptRequest(friendshipId, actingUserId) {
  const row = db.prepare('SELECT * FROM friendships WHERE id = ?').get(friendshipId);
  if (!row || row.recipient_id !== actingUserId || row.status !== 'pending') {
    throw new Error('No such pending request');
  }
  db.prepare('UPDATE friendships SET status = ?, updated_at = ? WHERE id = ?').run('accepted', now(), friendshipId);
  logActivity({ ownerUserId: row.requester_id, actorUserId: row.recipient_id, type: 'friend_accepted', payload: {} });
  logActivity({ ownerUserId: row.recipient_id, actorUserId: row.requester_id, type: 'friend_accepted', payload: {} });
  return { ...row, status: 'accepted' };
}

export function declineRequest(friendshipId, actingUserId) {
  const row = db.prepare('SELECT * FROM friendships WHERE id = ?').get(friendshipId);
  if (!row || row.recipient_id !== actingUserId || row.status !== 'pending') {
    throw new Error('No such pending request');
  }
  db.prepare('UPDATE friendships SET status = ?, updated_at = ? WHERE id = ?').run('declined', now(), friendshipId);
}

export function removeFriend(userId, friendId) {
  const row = findRelationship(userId, friendId);
  if (row) db.prepare('DELETE FROM friendships WHERE id = ?').run(row.id);
}

export function listFriends(userId) {
  const rows = db.prepare(
    `SELECT u.*, f.created_at as friended_at FROM friendships f
     JOIN users u ON u.id = (CASE WHEN f.requester_id = ? THEN f.recipient_id ELSE f.requester_id END)
     WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.recipient_id = ?)
     ORDER BY u.display_name COLLATE NOCASE`
  ).all(userId, userId, userId);
  return rows.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    presence: presenceFor(u),
    inRoomCode: u.current_room_code,
  }));
}

export function listPendingRequests(userId) {
  const rows = db.prepare(
    `SELECT f.id as friendship_id, u.* FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.status = 'pending' AND f.recipient_id = ?
     ORDER BY f.created_at DESC`
  ).all(userId);
  return rows.map((r) => ({ friendshipId: r.friendship_id, id: r.id, username: r.username, displayName: r.display_name }));
}

export function suggestedFriends(userId, limit = 5) {
  const rows = db.prepare(
    `SELECT DISTINCT u.* FROM ledger_entries e1
     JOIN ledger_entries e2 ON e1.session_id = e2.session_id AND e2.user_id != e1.user_id
     JOIN users u ON u.id = e2.user_id
     WHERE e1.user_id = ?
       AND u.id NOT IN (
         SELECT CASE WHEN requester_id = ? THEN recipient_id ELSE requester_id END
         FROM friendships WHERE (requester_id = ? OR recipient_id = ?) AND status != 'declined'
       )
     LIMIT ?`
  ).all(userId, userId, userId, userId, limit);
  return rows.map((u) => ({ id: u.id, username: u.username, displayName: u.display_name }));
}
