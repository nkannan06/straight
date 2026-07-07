import { db, now } from './db.js';

// No real APNs credentials yet (needs an Apple Developer account + push key —
// deferred alongside Apple/Google SSO). sendPushNotification is a stub: it
// resolves the recipient's device tokens and logs what would have been sent,
// so every call site below is already wired up correctly and this function is
// the only thing that needs to change once real credentials exist.
const PUSH_CONFIGURED = false;

export function registerDeviceToken(userId, platform, token) {
  db.prepare(
    `INSERT INTO device_tokens (token, user_id, platform, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform`
  ).run(token, userId, platform, now());
}

export function unregisterDeviceToken(token) {
  db.prepare('DELETE FROM device_tokens WHERE token = ?').run(token);
}

export function sendPushNotification(userId, { title, body, data } = {}) {
  const tokens = db.prepare('SELECT token, platform FROM device_tokens WHERE user_id = ?').all(userId);
  if (tokens.length === 0) return;
  if (!PUSH_CONFIGURED) {
    console.log(`[push:stub] would notify ${tokens.length} device(s) for user ${userId}: "${title}" — ${body}`, data || '');
    return;
  }
  // Real APNs/FCM delivery goes here once credentials are configured.
}
