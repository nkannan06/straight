import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { Table, IllegalActionError } from './gameEngine.js';
import { getUserById, searchUsers, heartbeat, setCurrentRoom, presenceFor, sweepStalePresence } from './users.js';
import { signUp, logIn, logOut, signInWithApple, signInWithGoogle, userForToken, isUsernameAvailable, claimUsername, updateDisplayName, sweepExpiredSessions, AuthError } from './auth.js';
import { sendFriendRequest, acceptRequest, declineRequest, removeFriend, listFriends, listPendingRequests, suggestedFriends } from './friends.js';
import { getActivityFeed } from './activity.js';
import { recordSession, getSession, listSessionsForUser, friendBalances, allTimeNetCents, globalSettlePlanFor, settlePair, headToHeadStats, sessionsInvolvingBoth } from './ledger.js';
import { scheduleGame, respondToInvite, listUpcomingForUser } from './schedule.js';
import { recordHandFromTableState, listHandHistory, getHand, handStats } from './handHistory.js';
import { ACHIEVEMENTS, unlockedFor, checkSessionAchievements } from './achievements.js';
import { registerDeviceToken, unregisterDeviceToken, sendPushNotification } from './push.js';

const PORT = process.env.PORT || 8787;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easy to read aloud
const NEXT_HAND_DELAY_MS = 3500;
const ROOM_EMPTY_CLEANUP_MS = 30 * 60 * 1000; // 30 min with nobody connected
const TIMER_SWEEP_MS = 1000;

/** @type {Map<string, Room>} */
const rooms = new Map();

class Room {
  constructor(code, opts) {
    this.code = code;
    this.table = new Table({ code, ...opts });
    this.clients = new Map(); // playerId -> { ws }
    this.nextHandAt = null;
    this.nextHandTimer = null;
    this.emptySince = null;
    this.ledgerSession = null; // { startedAt, buyIns: Map<playerId, cents> }
    this.lastActingPlayerId = null; // tracks whose turn it was last broadcast, for turn-reminder push
  }
}

// A "session" for ledger purposes spans from the first hand dealt to when
// the host resets or the room is cleaned up — buy-in is each player's stack
// at the moment they're first dealt in, cash-out is their stack when the
// session ends (or last-known stack if they disconnected without a clean
// leave — this app doesn't track a precise mid-session exit amount yet).
function ensureLedgerSession(room) {
  if (!room.ledgerSession) {
    room.ledgerSession = { startedAt: Date.now(), buyIns: new Map() };
  }
  for (const p of room.table.occupiedSeats()) {
    if (!room.ledgerSession.buyIns.has(p.id)) {
      room.ledgerSession.buyIns.set(p.id, room.table.startingStack);
    }
  }
}

function finalizeLedgerSession(room) {
  if (!room.ledgerSession || room.ledgerSession.buyIns.size === 0) {
    room.ledgerSession = null;
    return;
  }
  const entries = [];
  for (const [playerId, buyInCents] of room.ledgerSession.buyIns) {
    const player = room.table.findPlayer(playerId);
    const cashOutCents = player ? player.stack : buyInCents;
    entries.push({ userId: playerId, buyInCents, cashOutCents });
  }
  const durationMinutes = Math.max(1, Math.round((Date.now() - room.ledgerSession.startedAt) / 60_000));
  recordSession({
    playedAt: room.ledgerSession.startedAt,
    durationMinutes,
    blindsSmallCents: room.table.blinds.small,
    blindsBigCents: room.table.blinds.big,
    roomCode: room.code,
    createdBy: room.table.hostId,
    entries,
  });
  for (const e of entries) {
    const newlyUnlocked = checkSessionAchievements(e.userId, { blindsBigCents: room.table.blinds.big });
    for (const achievement of newlyUnlocked) {
      sendPushNotification(e.userId, { title: 'Achievement unlocked', body: achievement.name, data: { type: 'achievement', key: achievement.key } });
    }
  }
  room.ledgerSession = null;
}

function generateRoomCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function sanitizeForViewer(fullState, viewerId) {
  const revealedIds = new Set();
  if (fullState.lastHandResult && !fullState.lastHandResult.wonWithoutShowdown) {
    for (const sh of fullState.lastHandResult.showdownHands) revealedIds.add(sh.id);
  }
  // A fold-win doesn't normally reveal hole cards, but if it triggered the
  // 2-7 bounty everyone just paid for, they've earned the right to see it.
  if (fullState.lastHandResult?.bounty27) {
    for (const b of fullState.lastHandResult.bounty27) revealedIds.add(b.winnerId);
  }
  return {
    ...fullState,
    seats: fullState.seats.map((seat) => {
      if (!seat) return null;
      const showCards = seat.id === viewerId || revealedIds.has(seat.id);
      return {
        ...seat,
        holeCards: showCards ? seat.holeCards : (seat.holeCards ? [null, null] : null),
      };
    }),
  };
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function broadcast(room) {
  const fullState = room.table.getState();

  const actingPlayerId = fullState.actingSeat != null ? room.table.seats[fullState.actingSeat]?.id : null;
  if (actingPlayerId && actingPlayerId !== room.lastActingPlayerId) {
    sendPushNotification(actingPlayerId, { title: 'Your turn', body: `Action's on you at table ${room.code}`, data: { type: 'turn_reminder', roomCode: room.code } });
  }
  room.lastActingPlayerId = actingPlayerId;

  for (const [playerId, client] of room.clients) {
    send(client.ws, { type: 'room_state', state: sanitizeForViewer(fullState, playerId), nextHandAt: room.nextHandAt, you: playerId });
  }
}

function sendError(ws, message) {
  send(ws, { type: 'error', message });
}

function scheduleNextHand(room) {
  if (room.nextHandTimer) clearTimeout(room.nextHandTimer);
  room.nextHandAt = Date.now() + NEXT_HAND_DELAY_MS;
  room.nextHandTimer = setTimeout(() => {
    room.nextHandAt = null;
    room.nextHandTimer = null;
    if (room.table.canStartHand()) {
      room.table.startHand();
    }
    broadcast(room);
  }, NEXT_HAND_DELAY_MS);
}

function handleJoinRoom(ws, playerId, msg) {
  const { code, name } = msg;
  const room = rooms.get(code);
  if (!room) {
    sendError(ws, 'Room not found');
    return null;
  }
  const existing = room.table.findPlayer(playerId);
  if (!existing) {
    try {
      room.table.addPlayer(playerId, name || 'Player');
    } catch (err) {
      sendError(ws, err instanceof IllegalActionError ? err.message : 'Could not join room');
      return null;
    }
  }
  room.table.setConnected(playerId, true);
  room.clients.set(playerId, { ws });
  room.emptySince = null;
  setCurrentRoom(playerId, room.code);
  broadcast(room);
  return room;
}

function requireHost(room, playerId, ws) {
  if (room.table.hostId !== playerId) {
    sendError(ws, 'Only the host can do that');
    return false;
  }
  return true;
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/rooms', (req, res) => {
  // Amounts are integer cents (see client/src/lib/money.js) — the server
  // itself is unit-agnostic and just does exact integer math either way.
  // Defaults here: $1/$2 blinds, $1,000 starting stack.
  const {
    maxSeats = 6,
    blinds = { small: 100, big: 200 },
    startingStack = 100_000,
    rabbitHuntEnabled = false,
    bounty27Enabled = false,
  } = req.body || {};
  const code = generateRoomCode();
  const room = new Room(code, { maxSeats, blinds, startingStack, rabbitHuntEnabled, bounty27Enabled });
  rooms.set(code, room);
  res.json({ code });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res.status(404).json({ exists: false });
    return;
  }
  const players = room.table.occupiedSeats();
  const host = players.find((p) => p.id === room.table.hostId);
  res.json({
    exists: true,
    code: room.code,
    hostName: host ? host.name : null,
    blinds: room.table.blinds,
    playerCount: players.length,
    maxSeats: room.table.maxSeats,
    players: players.map((p) => ({ name: p.name })),
    inProgress: room.table.street !== 'lobby',
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---- Users ----

app.post('/api/users/:id/heartbeat', (req, res) => {
  heartbeat(req.params.id);
  res.json({ ok: true });
});

app.get('/api/users/search', (req, res) => {
  const { q, userId } = req.query;
  if (!q || q.length < 1) return res.json({ results: [] });
  const results = searchUsers(q, userId || '').map((u) => ({ id: u.id, username: u.username, displayName: u.display_name }));
  res.json({ results });
});

// Must come after /api/users/search — :id would otherwise shadow it.
app.get('/api/users/:id', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: user.id, username: user.username, displayName: user.display_name });
});

// ---- Auth (real email/password accounts; Apple/Google SSO plug in later) ----

function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

app.post('/api/auth/signup', (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    res.json(signUp({ email, password, displayName }));
  } catch (err) {
    res.status(err instanceof AuthError ? err.status : 500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    res.json(logIn({ email, password }));
  } catch (err) {
    res.status(err instanceof AuthError ? err.status : 500).json({ error: err.message });
  }
});

app.post('/api/auth/apple', async (req, res) => {
  try {
    const { identityToken, displayName } = req.body || {};
    res.json(await signInWithApple({ identityToken, displayName }));
  } catch (err) {
    res.status(err instanceof AuthError ? err.status : 500).json({ error: err.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    res.json(await signInWithGoogle({ idToken }));
  } catch (err) {
    res.status(err instanceof AuthError ? err.status : 500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  logOut(bearerToken(req));
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = userForToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  res.json({ user });
});

app.get('/api/auth/username-available', (req, res) => {
  const { username, userId } = req.query;
  if (!username) return res.json({ available: false, reason: 'Enter a username' });
  res.json(isUsernameAvailable(username, userId));
});

app.post('/api/auth/username', (req, res) => {
  const user = userForToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  try {
    const username = claimUsername(user.id, req.body?.username || '');
    res.json({ username });
  } catch (err) {
    res.status(err instanceof AuthError ? err.status : 500).json({ error: err.message });
  }
});

app.post('/api/auth/profile', (req, res) => {
  const user = userForToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  try {
    const displayName = updateDisplayName(user.id, req.body?.displayName || '');
    res.json({ displayName });
  } catch (err) {
    res.status(err instanceof AuthError ? err.status : 500).json({ error: err.message });
  }
});

// ---- Push notifications ----
// No real APNs credentials yet (needs an Apple Developer account) — tokens
// are still recorded so send-time call sites and the client registration
// flow are already correct; see push.js for the stubbed send.

app.post('/api/push/register', (req, res) => {
  const user = userForToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  const { platform, token } = req.body || {};
  if (!token || (platform !== 'ios' && platform !== 'android')) {
    return res.status(400).json({ error: 'platform and token are required' });
  }
  registerDeviceToken(user.id, platform, token);
  res.json({ ok: true });
});

app.post('/api/push/unregister', (req, res) => {
  const { token } = req.body || {};
  if (token) unregisterDeviceToken(token);
  res.json({ ok: true });
});

// ---- Friends ----

app.get('/api/friends/:userId', (req, res) => {
  res.json({ friends: listFriends(req.params.userId) });
});

app.get('/api/friends/:userId/requests', (req, res) => {
  res.json({ requests: listPendingRequests(req.params.userId) });
});

app.get('/api/friends/:userId/suggested', (req, res) => {
  res.json({ suggested: suggestedFriends(req.params.userId) });
});

app.post('/api/friends/:userId/request', (req, res) => {
  const { recipientId } = req.body || {};
  try {
    const row = sendFriendRequest(req.params.userId, recipientId);
    if (row.status === 'pending') {
      const requester = getUserById(req.params.userId);
      sendPushNotification(recipientId, { title: 'Friend request', body: `${requester?.display_name || 'Someone'} wants to add you`, data: { type: 'friend_request' } });
    }
    res.json({ friendship: row });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/friends/requests/:friendshipId/accept', (req, res) => {
  const { userId } = req.body || {};
  try {
    const friendship = acceptRequest(req.params.friendshipId, userId);
    const accepter = getUserById(userId);
    sendPushNotification(friendship.requester_id, { title: 'Friend request accepted', body: `${accepter?.display_name || 'Someone'} accepted your request`, data: { type: 'friend_accepted' } });
    res.json({ friendship });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/friends/requests/:friendshipId/decline', (req, res) => {
  const { userId } = req.body || {};
  try {
    declineRequest(req.params.friendshipId, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/friends/:userId/:friendId', (req, res) => {
  removeFriend(req.params.userId, req.params.friendId);
  res.json({ ok: true });
});

app.get('/api/friends/:userId/:friendId/profile', (req, res) => {
  const friend = getUserById(req.params.friendId);
  if (!friend) return res.status(404).json({ error: 'Not found' });
  res.json({
    friend: { id: friend.id, username: friend.username, displayName: friend.display_name, presence: presenceFor(friend) },
    stats: headToHeadStats(req.params.userId, req.params.friendId),
    recentSessions: sessionsInvolvingBoth(req.params.userId, req.params.friendId, 5),
  });
});

// ---- Activity feed ----

app.get('/api/activity/:userId', (req, res) => {
  res.json({ events: getActivityFeed(req.params.userId) });
});

// ---- Ledger ----

app.get('/api/ledger/:userId', (req, res) => {
  res.json({
    allTimeNetCents: allTimeNetCents(req.params.userId),
    friends: friendBalances(req.params.userId),
    sessions: listSessionsForUser(req.params.userId),
  });
});

app.get('/api/ledger/session/:sessionId', (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json({ session });
});

app.get('/api/ledger/:userId/settle-plan', (req, res) => {
  const friends = friendBalances(req.params.userId);
  const userIds = [req.params.userId, ...friends.map((f) => f.id)];
  const plan = globalSettlePlanFor([...new Set(userIds)]);
  const me = getUserById(req.params.userId);
  const nameOf = (id) => (id === req.params.userId ? 'You' : friends.find((f) => f.id === id)?.displayName || getUserById(id)?.display_name || 'Someone');
  res.json({
    plan: plan.map((t) => ({ ...t, fromName: nameOf(t.from), toName: nameOf(t.to) })),
    myName: me?.display_name || 'You',
  });
});

app.post('/api/ledger/settle', (req, res) => {
  const { userA, userB } = req.body || {};
  const count = settlePair(userA, userB);
  if (count > 0) {
    const initiator = getUserById(userA);
    sendPushNotification(userB, { title: 'Settled up', body: `${initiator?.display_name || 'Someone'} marked your balance as settled`, data: { type: 'ledger_settled' } });
  }
  res.json({ settledSessions: count });
});

// ---- Scheduling ----

app.get('/api/schedule/:userId', (req, res) => {
  res.json({ games: listUpcomingForUser(req.params.userId) });
});

app.post('/api/schedule', (req, res) => {
  const { name, scheduledAt, repeatRule, createdBy, inviteeIds } = req.body || {};
  const id = scheduleGame({ name, scheduledAt, repeatRule, createdBy, inviteeIds: inviteeIds || [] });
  res.json({ id });
});

app.post('/api/schedule/:id/rsvp', (req, res) => {
  const { userId, rsvp } = req.body || {};
  respondToInvite(req.params.id, userId, rsvp);
  res.json({ ok: true });
});

// ---- Hand history ----

app.get('/api/hands/:userId', (req, res) => {
  res.json({ hands: listHandHistory(req.params.userId) });
});

app.get('/api/hands/detail/:handId', (req, res) => {
  const hand = getHand(req.params.handId);
  if (!hand) return res.status(404).json({ error: 'Not found' });
  res.json({ hand });
});

app.get('/api/stats/:userId', (req, res) => {
  res.json(handStats(req.params.userId));
});

// ---- Achievements ----

app.get('/api/achievements/:userId', (req, res) => {
  const unlocked = unlockedFor(req.params.userId);
  res.json({
    achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlockedAt: unlocked.get(a.key) || null })),
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let boundPlayerId = null;
  let boundRoom = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendError(ws, 'Invalid message');
      return;
    }

    if (msg.type === 'ping') {
      send(ws, { type: 'pong' });
      return;
    }

    if (msg.type === 'join_room') {
      boundPlayerId = msg.playerId;
      boundRoom = handleJoinRoom(ws, msg.playerId, msg);
      return;
    }

    if (!boundRoom || !boundPlayerId) {
      sendError(ws, 'Not joined to a room yet');
      return;
    }

    try {
      switch (msg.type) {
        case 'player_action': {
          boundRoom.table.applyAction(boundPlayerId, msg.action, msg.amount);
          if (boundRoom.table.street === 'hand_complete') {
            recordHandFromTableState(boundRoom.table);
            scheduleNextHand(boundRoom);
          }
          broadcast(boundRoom);
          break;
        }
        case 'host_start_game': {
          if (!requireHost(boundRoom, boundPlayerId, ws)) break;
          boundRoom.table.startHand();
          ensureLedgerSession(boundRoom);
          broadcast(boundRoom);
          break;
        }
        case 'host_reset_game': {
          if (!requireHost(boundRoom, boundPlayerId, ws)) break;
          finalizeLedgerSession(boundRoom);
          boundRoom.table.resetGame();
          broadcast(boundRoom);
          break;
        }
        case 'host_set_blinds': {
          if (!requireHost(boundRoom, boundPlayerId, ws)) break;
          boundRoom.table.setPendingBlinds(msg.blinds);
          broadcast(boundRoom);
          break;
        }
        case 'host_set_game_options': {
          if (!requireHost(boundRoom, boundPlayerId, ws)) break;
          boundRoom.table.setGameOptions({ rabbitHuntEnabled: msg.rabbitHuntEnabled, bounty27Enabled: msg.bounty27Enabled });
          broadcast(boundRoom);
          break;
        }
        case 'host_kick_player': {
          if (!requireHost(boundRoom, boundPlayerId, ws)) break;
          const target = boundRoom.clients.get(msg.targetPlayerId);
          boundRoom.table.removePlayer(msg.targetPlayerId);
          if (target) {
            send(target.ws, { type: 'kicked' });
            boundRoom.clients.delete(msg.targetPlayerId);
          }
          broadcast(boundRoom);
          break;
        }
        case 'leave_room': {
          // Unlike a plain disconnect (which only marks connected=false so a
          // dropped connection can reconnect into the same seat), leaving is
          // a deliberate exit: actually free the seat, reassign host if they
          // were it, and if that empties the table, tear the room down now
          // instead of waiting for the 30-minute empty-room sweep.
          const leftCode = boundRoom.code;
          boundRoom.table.removePlayer(boundPlayerId);
          boundRoom.clients.delete(boundPlayerId);
          broadcast(boundRoom);
          if (boundRoom.table.occupiedSeats().length === 0) {
            finalizeLedgerSession(boundRoom);
            if (boundRoom.nextHandTimer) clearTimeout(boundRoom.nextHandTimer);
            rooms.delete(leftCode);
          }
          boundRoom = null;
          boundPlayerId = null;
          break;
        }
        default:
          sendError(ws, `Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      sendError(ws, err instanceof IllegalActionError ? err.message : 'Server error');
    }
  });

  ws.on('close', () => {
    if (!boundRoom || !boundPlayerId) return;
    boundRoom.table.setConnected(boundPlayerId, false);
    boundRoom.clients.delete(boundPlayerId);
    setCurrentRoom(boundPlayerId, null);
    broadcast(boundRoom);
    if (boundRoom.clients.size === 0) boundRoom.emptySince = Date.now();
  });
});

// Server-enforced turn timers: sweep every room in-hand and force a
// fold/check if the acting player's deadline has passed.
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.table.actionDeadline && now >= room.table.actionDeadline) {
      room.table.timeoutCurrentActor();
      if (room.table.street === 'hand_complete') {
        recordHandFromTableState(room.table);
        scheduleNextHand(room);
      }
      broadcast(room);
    }
  }
}, TIMER_SWEEP_MS);

// Clean up rooms nobody has been connected to for a while.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.emptySince && now - room.emptySince > ROOM_EMPTY_CLEANUP_MS) {
      finalizeLedgerSession(room);
      if (room.nextHandTimer) clearTimeout(room.nextHandTimer);
      rooms.delete(code);
    }
  }
}, 60_000);

// Stale-presence sweep — clears "in game" flags left behind by tabs that
// closed without a clean disconnect.
setInterval(sweepStalePresence, 60_000);
setInterval(sweepExpiredSessions, 6 * 60 * 60_000);

server.listen(PORT, () => {
  console.log(`Straight server listening on http://localhost:${PORT}`);
});
