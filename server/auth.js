import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { db, now } from './db.js';

const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

// Native Sign in with Apple: the identityToken's audience is the app's
// bundle ID (not a separate Services ID — that's only needed for the
// web-based JS flow, which this app doesn't use).
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.straightpoker.app';
const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

// Google: the ID token's audience is the iOS OAuth client ID created for
// this app in Google Cloud Console.
const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID || '';
const googleJWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedBuffer = scryptSync(password, salt, 64);
  return hashBuffer.length === derivedBuffer.length && timingSafeEqual(hashBuffer, derivedBuffer);
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'player';
}

function usernameExists(username) {
  return !!db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
}

function generateUsername(seed) {
  const base = slugify(seed);
  if (!usernameExists(base)) return base;
  for (let i = 2; i < 1000; i++) {
    if (!usernameExists(`${base}${i}`)) return `${base}${i}`;
  }
  return `${base}${Date.now()}`;
}

export class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const ts = now();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, userId, ts, ts + SESSION_TTL_MS);
  return token;
}

function publicUser(row) {
  return { id: row.id, username: row.username, displayName: row.display_name, email: row.email };
}

export function signUp({ email, password, displayName }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new AuthError('A valid email is required');
  if (!password || password.length < 8) throw new AuthError('Password must be at least 8 characters');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(normalizedEmail)) {
    throw new AuthError('An account with that email already exists', 409);
  }

  const id = randomUUID();
  const username = generateUsername(displayName || normalizedEmail.split('@')[0]);
  const ts = now();
  db.prepare(
    'INSERT INTO users (id, username, display_name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, username, displayName || username, normalizedEmail, hashPassword(password), ts);

  const token = createSession(id);
  return { token, user: publicUser({ id, username, display_name: displayName || username, email: normalizedEmail }) };
}

export function logIn({ email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new AuthError('Incorrect email or password', 401);
  }
  const token = createSession(row.id);
  return { token, user: publicUser(row) };
}

// Shared by both social providers: find the account already linked to this
// provider's subject id, else link to a matching email/password account,
// else create a brand-new account.
function findOrCreateSocialUser({ column, sub, email, displayName }) {
  let row = db.prepare(`SELECT * FROM users WHERE ${column} = ?`).get(sub);
  if (row) return row;

  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  if (normalizedEmail) {
    row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (row) {
      db.prepare(`UPDATE users SET ${column} = ? WHERE id = ?`).run(sub, row.id);
      return { ...row, [column]: sub };
    }
  }

  const id = randomUUID();
  const username = generateUsername(displayName || (normalizedEmail ? normalizedEmail.split('@')[0] : 'player'));
  const ts = now();
  db.prepare(
    `INSERT INTO users (id, username, display_name, email, ${column}, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, username, displayName || username, normalizedEmail, sub, ts);
  return { id, username, display_name: displayName || username, email: normalizedEmail, created_at: ts, last_seen_at: null, current_room_code: null };
}

export async function signInWithApple({ identityToken, displayName }) {
  if (!identityToken) throw new AuthError('Missing Apple identity token');
  let payload;
  try {
    ({ payload } = await jwtVerify(identityToken, appleJWKS, { issuer: 'https://appleid.apple.com', audience: APPLE_BUNDLE_ID }));
  } catch {
    throw new AuthError('Could not verify Sign in with Apple', 401);
  }
  const user = findOrCreateSocialUser({ column: 'apple_sub', sub: payload.sub, email: payload.email, displayName });
  const token = createSession(user.id);
  return { token, user: publicUser(user) };
}

export async function signInWithGoogle({ idToken }) {
  if (!idToken) throw new AuthError('Missing Google ID token');
  if (!GOOGLE_IOS_CLIENT_ID) throw new AuthError('Google sign-in is not configured on this server yet', 501);
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, googleJWKS, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: GOOGLE_IOS_CLIENT_ID }));
  } catch {
    throw new AuthError('Could not verify Google sign-in', 401);
  }
  const user = findOrCreateSocialUser({ column: 'google_sub', sub: payload.sub, email: payload.email, displayName: payload.name });
  const token = createSession(user.id);
  return { token, user: publicUser(user) };
}

export function logOut(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function userForToken(token) {
  if (!token) return null;
  const row = db.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?`
  ).get(token, now());
  return row ? publicUser(row) : null;
}

export function isUsernameAvailable(username, excludeUserId) {
  const clean = slugify(username);
  if (clean !== username.toLowerCase()) return { available: false, reason: 'Use only letters and numbers' };
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
  if (existing && existing.id !== excludeUserId) return { available: false, reason: 'Already taken' };
  return { available: true };
}

export function claimUsername(userId, username) {
  const clean = username.toLowerCase().trim();
  const check = isUsernameAvailable(clean, userId);
  if (!check.available) throw new AuthError(check.reason, 409);
  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(clean, userId);
  return clean;
}

export function updateDisplayName(userId, displayName) {
  const clean = (displayName || '').trim().slice(0, 20);
  if (!clean) throw new AuthError('Display name is required');
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(clean, userId);
  return clean;
}

// Cheap periodic cleanup so the sessions table doesn't grow unbounded.
export function sweepExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());
}
