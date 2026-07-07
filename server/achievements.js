import { db, now } from './db.js';

export const ACHIEVEMENTS = [
  { key: 'first_win', name: 'First Win', description: 'Win your first hand', icon: 'trophy' },
  { key: 'bluffer', name: 'Bluffer', description: 'Win a hand without showdown as the aggressor', icon: 'spade' },
  { key: 'high_roller', name: 'High Roller', description: 'Play a session with $10+ big blinds', icon: 'gem' },
  { key: 'iron_man', name: 'Iron Man', description: 'Play 100 hands', icon: 'shield' },
];

export function unlockedFor(userId) {
  const rows = db.prepare('SELECT achievement_key, unlocked_at FROM user_achievements WHERE user_id = ?').all(userId);
  return new Map(rows.map((r) => [r.achievement_key, r.unlocked_at]));
}

function unlock(userId, key) {
  const result = db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_key, unlocked_at) VALUES (?, ?, ?)').run(userId, key, now());
  return result.changes > 0;
}

function byKey(key) {
  return ACHIEVEMENTS.find((a) => a.key === key);
}

// Called after a hand is recorded — checks the small, cheap-to-evaluate
// criteria. Not trying to be a full achievements engine, just enough to back
// the badges shown on the Profile screen. Returns the achievements newly
// unlocked by this call (empty if none), so callers can push-notify.
export function checkHandAchievements(userId, { result, wonWithoutShowdown, wasAggressor }) {
  const newlyUnlocked = [];
  if (result === 'won' && unlock(userId, 'first_win')) newlyUnlocked.push(byKey('first_win'));
  if (result === 'won' && wonWithoutShowdown && wasAggressor && unlock(userId, 'bluffer')) newlyUnlocked.push(byKey('bluffer'));
  const handCount = db.prepare('SELECT COUNT(*) as c FROM hand_history WHERE user_id = ?').get(userId).c;
  if (handCount >= 100 && unlock(userId, 'iron_man')) newlyUnlocked.push(byKey('iron_man'));
  return newlyUnlocked;
}

export function checkSessionAchievements(userId, { blindsBigCents }) {
  const newlyUnlocked = [];
  if (blindsBigCents >= 1000 && unlock(userId, 'high_roller')) newlyUnlocked.push(byKey('high_roller'));
  return newlyUnlocked;
}
