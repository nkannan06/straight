import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { checkHandAchievements } from './achievements.js';
import { sendPushNotification } from './push.js';

export function recordHand({ roomCode, userId, playedAt, holeCards, communityCards, actions, result, potCents, streetReached, description }) {
  db.prepare(
    `INSERT INTO hand_history (id, room_code, user_id, played_at, hole_cards_json, community_cards_json, actions_json, result, pot_cents, street_reached, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(), roomCode || null, userId, playedAt,
    JSON.stringify(holeCards), JSON.stringify(communityCards), JSON.stringify(actions),
    result, potCents, streetReached, description
  );
}

// Given a completed Table's state, records one hand_history row per human
// player who was dealt in, and checks their per-hand achievement criteria.
export function recordHandFromTableState(table) {
  const state = table.getState();
  const result = state.lastHandResult;
  if (!result) return;

  const handStartIdx = [...state.actionLog].reverse().findIndex((e) => e.type === 'hand_started');
  const rawHandLog = handStartIdx === -1 ? state.actionLog : state.actionLog.slice(state.actionLog.length - 1 - handStartIdx);
  const nameById = new Map(table.seats.filter(Boolean).map((s) => [s.id, s.name]));
  // Self-contained for replay: bake in names now rather than requiring a
  // lookup later against seats that may no longer be occupied by then.
  const thisHandLog = rawHandLog.map((e) => (e.playerId ? { ...e, playerName: nameById.get(e.playerId) || 'Player' } : e));
  const aggressorIds = new Set(thisHandLog.filter((e) => e.type === 'raise').map((e) => e.playerId));

  for (const seat of table.seats) {
    if (!seat || !seat.dealtIn) continue;
    const won = result.pots.some((p) => p.winnerIds.includes(seat.id));
    const handResult = won ? 'won' : seat.folded ? 'folded' : 'lost';
    const showdownEntry = result.showdownHands?.find((h) => h.id === seat.id);
    const description = won
      ? (showdownEntry ? showdownEntry.description : 'Won without showdown')
      : (showdownEntry ? showdownEntry.description : 'Folded');

    recordHand({
      roomCode: table.code,
      userId: seat.id,
      playedAt: Date.now(),
      holeCards: seat.holeCards || [],
      communityCards: result.community,
      actions: thisHandLog,
      result: handResult,
      potCents: result.totalPot,
      streetReached: result.wonWithoutShowdown ? 'preflop-fold' : 'showdown',
      description,
    });

    const newlyUnlocked = checkHandAchievements(seat.id, {
      result: handResult,
      wonWithoutShowdown: result.wonWithoutShowdown,
      wasAggressor: aggressorIds.has(seat.id),
    });
    for (const achievement of newlyUnlocked) {
      sendPushNotification(seat.id, { title: 'Achievement unlocked', body: achievement.name, data: { type: 'achievement', key: achievement.key } });
    }
  }
}

export function handStats(userId) {
  const rows = db.prepare('SELECT result, pot_cents FROM hand_history WHERE user_id = ?').all(userId);
  const handsPlayed = rows.length;
  const wins = rows.filter((r) => r.result === 'won').length;
  const winRate = handsPlayed > 0 ? wins / handsPlayed : 0;
  const biggestPotCents = rows.filter((r) => r.result === 'won').reduce((max, r) => Math.max(max, r.pot_cents), 0);
  return { handsPlayed, winRate, biggestPotCents };
}

export function listHandHistory(userId, limit = 50) {
  const rows = db.prepare('SELECT * FROM hand_history WHERE user_id = ? ORDER BY played_at DESC LIMIT ?').all(userId, limit);
  return rows.map(rowToHand);
}

export function getHand(handId) {
  const r = db.prepare('SELECT * FROM hand_history WHERE id = ?').get(handId);
  return r ? rowToHand(r) : null;
}

function rowToHand(r) {
  return {
    id: r.id,
    roomCode: r.room_code,
    playedAt: r.played_at,
    holeCards: JSON.parse(r.hole_cards_json),
    communityCards: JSON.parse(r.community_cards_json),
    actions: JSON.parse(r.actions_json),
    result: r.result,
    potCents: r.pot_cents,
    streetReached: r.street_reached,
    description: r.description,
  };
}
