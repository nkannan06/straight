import http2 from 'node:http2';
import { SignJWT, importPKCS8 } from 'jose';
import { db, now } from './db.js';

// Real APNs delivery. Needs three env vars from the Apple Developer account's
// APNs Auth Key (Certificates, Identifiers & Profiles -> Keys): APNS_KEY_ID,
// APNS_TEAM_ID, and APNS_KEY (the full .p8 file contents). Until all three
// are set, sendPushNotification stays a harmless stub that just logs.
const APNS_KEY_ID = process.env.APNS_KEY_ID || '';
const APNS_TEAM_ID = process.env.APNS_TEAM_ID || '';
// Railway's env var editor accepts real newlines directly; this also
// tolerates a literal "\n"-escaped paste, just in case.
const APNS_KEY = (process.env.APNS_KEY || '').replace(/\\n/g, '\n');
const APNS_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.straightpoker.app';
// A device only gets tokens valid for the APNs environment matching how the
// app was signed — Xcode "Run" to a device is always development/sandbox;
// TestFlight/App Store builds are production. Flip this once you archive
// for real distribution.
const APNS_ENVIRONMENT = process.env.APNS_ENVIRONMENT || 'development';
const APNS_HOST = APNS_ENVIRONMENT === 'production' ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';

const PUSH_CONFIGURED = !!(APNS_KEY_ID && APNS_TEAM_ID && APNS_KEY);

let privateKeyPromise = null;
function getPrivateKey() {
  if (!privateKeyPromise) privateKeyPromise = importPKCS8(APNS_KEY, 'ES256');
  return privateKeyPromise;
}

// APNs auth tokens are valid up to an hour; Apple asks callers not to mint a
// fresh one more than once every ~20 minutes, so this caches and reuses one.
let cachedToken = null;
let cachedTokenIssuedAt = 0;
async function getAuthToken() {
  const nowMs = Date.now();
  if (cachedToken && nowMs - cachedTokenIssuedAt < 30 * 60_000) return cachedToken;
  const key = await getPrivateKey();
  cachedToken = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: APNS_KEY_ID })
    .setIssuer(APNS_TEAM_ID)
    .setIssuedAt()
    .sign(key);
  cachedTokenIssuedAt = nowMs;
  return cachedToken;
}

// "time-sensitive" breaks through Focus/Do Not Disturb for things the user
// should act on right now (it's their turn); everything else is a normal
// "active" notification. Time-sensitive needs the matching capability added
// in Xcode — if it's missing, iOS just quietly treats it as "active"
// instead of failing the send, so this is safe either way.
function interruptionLevelFor(type) {
  return type === 'turn_reminder' ? 'time-sensitive' : 'active';
}

function deliverToDevice(token, { title, body, data }) {
  return new Promise((resolve) => {
    getAuthToken()
      .then((authToken) => {
        const payload = JSON.stringify({
          aps: {
            alert: { title, body },
            sound: 'default',
            'interruption-level': interruptionLevelFor(data?.type),
          },
          ...data,
        });

        const client = http2.connect(`https://${APNS_HOST}`);
        client.on('error', (err) => {
          console.error('[push] APNs connection error:', err.message);
          resolve();
        });

        const req = client.request({
          ':method': 'POST',
          ':path': `/3/device/${token}`,
          authorization: `bearer ${authToken}`,
          'apns-topic': APNS_BUNDLE_ID,
          'apns-push-type': 'alert',
          'content-type': 'application/json',
        });

        let status = null;
        let responseBody = '';
        req.on('response', (headers) => {
          status = headers[':status'];
        });
        req.on('data', (chunk) => {
          responseBody += chunk;
        });
        req.on('end', () => {
          if (status !== 200) {
            console.error(`[push] APNs rejected token (status ${status}):`, responseBody);
            if (status === 410 || responseBody.includes('BadDeviceToken')) {
              unregisterDeviceToken(token);
            }
          }
          client.close();
          resolve();
        });
        req.end(payload);
      })
      .catch((err) => {
        console.error('[push] could not sign APNs auth token:', err.message);
        resolve();
      });
  });
}

export function registerDeviceToken(userId, platform, token) {
  db.prepare(
    `INSERT INTO device_tokens (token, user_id, platform, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform`
  ).run(token, userId, platform, now());
}

export function unregisterDeviceToken(token) {
  db.prepare('DELETE FROM device_tokens WHERE token = ?').run(token);
}

export function registeredTokensFor(userId) {
  return db.prepare('SELECT token, platform FROM device_tokens WHERE user_id = ?').all(userId);
}

export function isPushConfigured() {
  return PUSH_CONFIGURED;
}

export function sendPushNotification(userId, { title, body, data } = {}) {
  const tokens = db.prepare('SELECT token, platform FROM device_tokens WHERE user_id = ?').all(userId);
  if (tokens.length === 0) return;
  if (!PUSH_CONFIGURED) {
    console.log(`[push:stub] would notify ${tokens.length} device(s) for user ${userId}: "${title}" — ${body}`, data || '');
    return;
  }
  for (const { token, platform } of tokens) {
    if (platform !== 'ios') continue; // no Android/FCM path in this app
    deliverToDevice(token, { title, body, data }).catch((err) => console.error('[push] delivery failed:', err.message));
  }
}
