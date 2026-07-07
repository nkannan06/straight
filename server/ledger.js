import { randomUUID } from 'node:crypto';
import { db, now } from './db.js';
import { logActivityToFriends } from './activity.js';
import { listFriends } from './friends.js';

// Greedy min-transaction debt simplification: match the largest creditor
// against the largest debtor repeatedly. Standard "Splitwise-style" settling
// — not the only optimal solution, but a simple, deterministic one.
export function simplifyDebts(balances) {
  // balances: [{ userId, netCents }] — positive = owed money, negative = owes money
  const creditors = balances.filter((b) => b.netCents > 0).map((b) => ({ ...b })).sort((a, b) => b.netCents - a.netCents);
  const debtors = balances.filter((b) => b.netCents < 0).map((b) => ({ ...b, netCents: -b.netCents })).sort((a, b) => b.netCents - a.netCents);
  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].netCents, creditors[j].netCents);
    if (amount > 0) transfers.push({ from: debtors[i].userId, to: creditors[j].userId, amountCents: amount });
    debtors[i].netCents -= amount;
    creditors[j].netCents -= amount;
    if (debtors[i].netCents === 0) i++;
    if (creditors[j].netCents === 0) j++;
  }
  return transfers;
}

export function recordSession({ name, playedAt, durationMinutes, blindsSmallCents, blindsBigCents, roomCode, createdBy, entries }) {
  const sessionId = randomUUID();
  db.prepare(
    `INSERT INTO ledger_sessions (id, name, played_at, duration_minutes, blinds_small_cents, blinds_big_cents, room_code, created_by, settled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(sessionId, name || null, playedAt, durationMinutes || null, blindsSmallCents, blindsBigCents, roomCode || null, createdBy || null);

  const insertEntry = db.prepare(
    `INSERT INTO ledger_entries (id, session_id, user_id, buy_in_cents, rebuys_count, cash_out_cents, net_cents) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const e of entries) {
    insertEntry.run(randomUUID(), sessionId, e.userId, e.buyInCents, e.rebuysCount || 0, e.cashOutCents, e.cashOutCents - e.buyInCents);
  }

  for (const e of entries) {
    if (e.netCents === undefined ? e.cashOutCents - e.buyInCents > 0 : e.netCents > 0) {
      const friendIds = listFriends(e.userId).map((f) => f.id);
      logActivityToFriends(e.userId, friendIds, 'session_won', { sessionId, amountCents: e.cashOutCents - e.buyInCents, sessionName: name });
    }
  }

  return sessionId;
}

export function getSession(sessionId) {
  const session = db.prepare('SELECT * FROM ledger_sessions WHERE id = ?').get(sessionId);
  if (!session) return null;
  const entries = db.prepare(
    `SELECT e.*, u.display_name, u.username FROM ledger_entries e JOIN users u ON u.id = e.user_id WHERE e.session_id = ? ORDER BY e.net_cents DESC`
  ).all(sessionId);
  return { ...session, entries };
}

export function listSessionsForUser(userId, limit = 50) {
  const rows = db.prepare(
    `SELECT s.* FROM ledger_sessions s JOIN ledger_entries e ON e.session_id = s.id WHERE e.user_id = ? ORDER BY s.played_at DESC LIMIT ?`
  ).all(userId, limit);
  return rows.map((s) => getSession(s.id));
}

function unsettledSessionsInvolving(userId) {
  return db.prepare(
    `SELECT DISTINCT s.id FROM ledger_sessions s JOIN ledger_entries e ON e.session_id = s.id WHERE e.user_id = ? AND s.settled = 0`
  ).all(userId).map((r) => r.id);
}

// Cumulative pairwise balance between two users: for every unsettled session
// both played in, allocate that session's net amounts via debt simplification
// and sum whatever transfers land between exactly this pair.
export function pairwiseBalanceCents(userA, userB) {
  const sessionsA = new Set(unsettledSessionsInvolving(userA));
  const sessionsB = unsettledSessionsInvolving(userB);
  const shared = sessionsB.filter((id) => sessionsA.has(id));
  let balance = 0; // positive = B owes A
  for (const sessionId of shared) {
    const entries = db.prepare('SELECT user_id, net_cents FROM ledger_entries WHERE session_id = ?').all(sessionId);
    const transfers = simplifyDebts(entries.map((e) => ({ userId: e.user_id, netCents: e.net_cents })));
    for (const t of transfers) {
      if (t.from === userB && t.to === userA) balance += t.amountCents;
      if (t.from === userA && t.to === userB) balance -= t.amountCents;
    }
  }
  return balance;
}

export function allTimeNetCents(userId) {
  const row = db.prepare('SELECT SUM(net_cents) as total FROM ledger_entries WHERE user_id = ?').get(userId);
  return row?.total || 0;
}

export function friendBalances(userId) {
  return listFriends(userId).map((f) => ({ ...f, balanceCents: pairwiseBalanceCents(userId, f.id) }));
}

export function globalSettlePlanFor(userIds) {
  const balances = userIds.map((userId) => {
    const sessions = unsettledSessionsInvolving(userId);
    const total = sessions.reduce((sum, sessionId) => {
      const entry = db.prepare('SELECT net_cents FROM ledger_entries WHERE session_id = ? AND user_id = ?').get(sessionId, userId);
      return sum + (entry?.net_cents || 0);
    }, 0);
    return { userId, netCents: total };
  }).filter((b) => b.netCents !== 0);
  return simplifyDebts(balances);
}

// Approximates "hands played together" and "biggest pot off this friend" by
// matching hand_history rows in the same room within a few seconds of each
// other (both participants' rows are written in the same recordHandFromTableState
// call, so timestamps land within milliseconds of each other in practice).
export function sessionsInvolvingBoth(userA, userB, limit = 10) {
  const rows = db.prepare(
    `SELECT s.*, e.net_cents as my_net_cents FROM ledger_sessions s
     JOIN ledger_entries e ON e.session_id = s.id AND e.user_id = ?
     WHERE EXISTS (SELECT 1 FROM ledger_entries e2 WHERE e2.session_id = s.id AND e2.user_id = ?)
     ORDER BY s.played_at DESC LIMIT ?`
  ).all(userA, userB, limit);
  return rows;
}

export function headToHeadStats(userA, userB) {
  const handsA = db.prepare('SELECT room_code, played_at, pot_cents, result FROM hand_history WHERE user_id = ?').all(userA);
  const handsB = db.prepare('SELECT room_code, played_at FROM hand_history WHERE user_id = ?').all(userB);
  let handsTogether = 0;
  let biggestPotCents = 0;
  for (const a of handsA) {
    const matched = handsB.some((b) => b.room_code === a.room_code && Math.abs(b.played_at - a.played_at) < 5000);
    if (matched) {
      handsTogether++;
      if (a.result === 'won' && a.pot_cents > biggestPotCents) biggestPotCents = a.pot_cents;
    }
  }
  return {
    handsTogether,
    balanceCents: pairwiseBalanceCents(userA, userB),
    biggestPotCents,
  };
}

export function settlePair(userA, userB) {
  const sessionsA = new Set(unsettledSessionsInvolving(userA));
  const shared = unsettledSessionsInvolving(userB).filter((id) => sessionsA.has(id));
  const ts = now();
  for (const sessionId of shared) {
    db.prepare('UPDATE ledger_sessions SET settled = 1, settled_at = ? WHERE id = ?').run(ts, sessionId);
  }
  return shared.length;
}
