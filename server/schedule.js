import { randomUUID } from 'node:crypto';
import { db, now } from './db.js';
import { logActivity } from './activity.js';
import { sendPushNotification } from './push.js';
import { getUserById } from './users.js';

export function scheduleGame({ name, scheduledAt, repeatRule, createdBy, inviteeIds }) {
  const id = randomUUID();
  db.prepare('INSERT INTO scheduled_games (id, name, scheduled_at, repeat_rule, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name || null, scheduledAt, repeatRule || 'none', createdBy, now());

  const host = getUserById(createdBy);
  const insertInvite = db.prepare('INSERT INTO scheduled_game_invites (id, scheduled_game_id, user_id, rsvp) VALUES (?, ?, ?, ?)');
  insertInvite.run(randomUUID(), id, createdBy, 'going');
  for (const inviteeId of inviteeIds) {
    if (inviteeId === createdBy) continue;
    insertInvite.run(randomUUID(), id, inviteeId, null);
    logActivity({ ownerUserId: inviteeId, actorUserId: createdBy, type: 'game_invite', payload: { scheduledGameId: id, name } });
    sendPushNotification(inviteeId, {
      title: 'Game invite',
      body: `${host?.display_name || 'Someone'} invited you to ${name || 'a poker night'}`,
      data: { type: 'schedule_invite', scheduledGameId: id },
    });
  }
  return id;
}

export function respondToInvite(scheduledGameId, userId, rsvp) {
  db.prepare(
    `INSERT INTO scheduled_game_invites (id, scheduled_game_id, user_id, rsvp, responded_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(scheduled_game_id, user_id) DO UPDATE SET rsvp = excluded.rsvp, responded_at = excluded.responded_at`
  ).run(randomUUID(), scheduledGameId, userId, rsvp, now());
}

export function listUpcomingForUser(userId) {
  const games = db.prepare(
    `SELECT g.* FROM scheduled_games g JOIN scheduled_game_invites i ON i.scheduled_game_id = g.id
     WHERE i.user_id = ? ORDER BY g.scheduled_at ASC`
  ).all(userId);

  return games.map((g) => {
    const invites = db.prepare(
      `SELECT i.*, u.display_name, u.username FROM scheduled_game_invites i JOIN users u ON u.id = i.user_id WHERE i.scheduled_game_id = ?`
    ).all(g.id);
    const myInvite = invites.find((i) => i.user_id === userId);
    return {
      id: g.id,
      name: g.name,
      scheduledAt: g.scheduled_at,
      repeatRule: g.repeat_rule,
      roomCode: g.room_code,
      myRsvp: myInvite?.rsvp || null,
      invitees: invites.map((i) => ({ id: i.user_id, displayName: i.display_name, username: i.username, rsvp: i.rsvp })),
    };
  });
}

export function attachRoomCode(scheduledGameId, roomCode) {
  db.prepare('UPDATE scheduled_games SET room_code = ? WHERE id = ?').run(roomCode, scheduledGameId);
}
