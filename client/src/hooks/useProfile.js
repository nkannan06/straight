import { useState, useCallback, useEffect } from 'react';
import { SERVER_HTTP_URL } from '../lib/config.js';
import { useAuth } from './useAuth.jsx';

const PREFS_KEY = 'straight.prefs.v1';
const HEARTBEAT_INTERVAL_MS = 20_000;

const AVATAR_COLORS = ['#8F9E57', '#5F6B38', '#B8933F', '#C4534A', '#565A45', '#D99A3A'];

function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsForName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt storage
  }
  return { haptics: true };
}

// Identity (playerId/name/username) comes from the real signed-in account via
// useAuth(); only device-local preferences (haptics) live in localStorage here.
export function useProfile() {
  const auth = useAuth();
  const [prefs, setPrefs] = useState(loadPrefs);
  const userId = auth.user?.id;

  const updateProfile = useCallback(
    (patch) => {
      if ('haptics' in patch) {
        setPrefs((prev) => {
          const next = { ...prev, haptics: patch.haptics };
          localStorage.setItem(PREFS_KEY, JSON.stringify(next));
          return next;
        });
      }
      if ('name' in patch && patch.name) {
        auth.updateDisplayName(patch.name).catch(() => {});
      }
    },
    [auth]
  );

  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      fetch(`${SERVER_HTTP_URL}/api/users/${userId}/heartbeat`, { method: 'POST' }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId]);

  const name = auth.user?.displayName || 'Player';

  return {
    playerId: userId,
    name,
    username: auth.user?.username || null,
    haptics: prefs.haptics,
    initials: initialsForName(name),
    color: colorForName(name),
    updateProfile,
  };
}

export { initialsForName, colorForName };
