import { Capacitor, registerPlugin } from '@capacitor/core';
import { SERVER_HTTP_URL } from './config.js';

// Swappable auth layer: every call in this module goes through the same
// small set of exports (signUpWithEmail, logInWithEmail, continueWithApple,
// continueWithGoogle, logOut, fetchCurrentUser). continueWithApple/
// continueWithGoogle call the native plugins in client/ios/App/App/
// (AppleSignInPlugin.swift, GoogleSignInPlugin.swift) — real native sign-in,
// not a stub — but only Capacitor's native runtime implements them, so both
// throw a clear error in the browser preview.
const AppleSignIn = registerPlugin('AppleSignIn');
const GoogleSignIn = registerPlugin('GoogleSignIn');

const TOKEN_KEY = 'straight.auth.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function postJson(path, body, { auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${SERVER_HTTP_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export async function signUpWithEmail({ email, password, displayName }) {
  const { token, user } = await postJson('/api/auth/signup', { email, password, displayName });
  setToken(token);
  return user;
}

export async function logInWithEmail({ email, password }) {
  const { token, user } = await postJson('/api/auth/login', { email, password });
  setToken(token);
  return user;
}

export async function continueWithApple() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Sign in with Apple only works in the installed iOS app — use email for now.');
  }
  const { identityToken, displayName } = await AppleSignIn.signIn();
  const { token, user } = await postJson('/api/auth/apple', { identityToken, displayName });
  setToken(token);
  return user;
}

export async function continueWithGoogle() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Sign in with Google only works in the installed iOS app — use email for now.');
  }
  const { idToken } = await GoogleSignIn.signIn();
  const { token, user } = await postJson('/api/auth/google', { idToken });
  setToken(token);
  return user;
}

export async function logOut() {
  const token = getToken();
  setToken(null);
  if (token) {
    fetch(`${SERVER_HTTP_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
}

export async function fetchCurrentUser() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${SERVER_HTTP_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    setToken(null);
    return null;
  }
  const { user } = await res.json();
  return user;
}

export async function checkUsernameAvailable(username, userId) {
  const params = new URLSearchParams({ username, userId: userId || '' });
  const res = await fetch(`${SERVER_HTTP_URL}/api/auth/username-available?${params}`);
  return res.json();
}

export async function claimUsername(username) {
  const { username: saved } = await postJson('/api/auth/username', { username }, { auth: true });
  return saved;
}

export async function updateDisplayName(displayName) {
  const { displayName: saved } = await postJson('/api/auth/profile', { displayName }, { auth: true });
  return saved;
}
