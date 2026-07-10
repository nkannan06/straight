import { SERVER_HTTP_URL } from './config.js';

export async function apiGet(path) {
  const res = await fetch(`${SERVER_HTTP_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${SERVER_HTTP_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `POST ${path} failed`);
  }
  return res.json();
}

export async function apiDelete(path) {
  const res = await fetch(`${SERVER_HTTP_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed`);
  return res.json();
}

export async function createRoom({ maxSeats, blinds, startingStack, rabbitHuntEnabled, bounty27Enabled }) {
  const res = await fetch(`${SERVER_HTTP_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxSeats, blinds, startingStack, rabbitHuntEnabled, bounty27Enabled }),
  });
  if (!res.ok) throw new Error('Could not create room');
  return res.json();
}

export async function fetchRoomPreview(code) {
  const res = await fetch(`${SERVER_HTTP_URL}/api/rooms/${encodeURIComponent(code)}`);
  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error('Could not reach server');
  return res.json();
}
