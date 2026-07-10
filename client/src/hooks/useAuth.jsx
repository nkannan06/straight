import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchCurrentUser,
  getToken,
  getCachedUser,
  cacheUser,
  signUpWithEmail,
  logInWithEmail,
  continueWithApple as continueWithAppleRequest,
  continueWithGoogle as continueWithGoogleRequest,
  logOut as logOutRequest,
  claimUsername as claimUsernameRequest,
  updateDisplayName as updateDisplayNameRequest,
} from '../lib/auth.js';

const AuthContext = createContext(null);

function useAuthState() {
  const token = getToken();
  const cached = token ? getCachedUser() : null;
  // If we have both a token and a cached identity, render as authed
  // immediately — no loading flicker, no dependency on the network being up
  // right this second. A background check still runs and can only sign the
  // user out on a real 401; anything else (offline, a cold-starting host)
  // just leaves them signed in with what's cached.
  const [status, setStatus] = useState(token ? (cached ? 'authed' : 'loading') : 'anon');
  const [user, setUser] = useState(cached);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchCurrentUser()
      .then((u) => {
        if (cancelled) return;
        // u === null here means the server gave a definitive 401 — anything
        // else (network/server hiccup) throws instead, see the catch below.
        setUser(u);
        setStatus(u ? 'authed' : 'anon');
      })
      .catch(() => {
        if (cancelled) return;
        // Couldn't verify right now. If we already have a cached identity,
        // stay signed in with it. Only fall back to anon if we never had
        // anything to show in the first place.
        if (!cached) setStatus('anon');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = useCallback(async (fields) => {
    const u = await signUpWithEmail(fields);
    setUser(u);
    setStatus('authed');
    return u;
  }, []);

  const logIn = useCallback(async (fields) => {
    const u = await logInWithEmail(fields);
    setUser(u);
    setStatus('authed');
    return u;
  }, []);

  const continueWithApple = useCallback(async () => {
    const { user: u, isNewUser } = await continueWithAppleRequest();
    setUser(u);
    setStatus(isNewUser ? 'needs-username' : 'authed');
    return u;
  }, []);

  const continueWithGoogle = useCallback(async () => {
    const { user: u, isNewUser } = await continueWithGoogleRequest();
    setUser(u);
    setStatus(isNewUser ? 'needs-username' : 'authed');
    return u;
  }, []);

  // Called once the post-SSO-signup username picker screen is dismissed
  // (either the user chose a custom username or kept the auto-generated
  // one) — transitions out of the 'needs-username' gate into the app.
  const finishOnboarding = useCallback(() => {
    setStatus('authed');
  }, []);

  const logOut = useCallback(async () => {
    await logOutRequest();
    setUser(null);
    setStatus('anon');
  }, []);

  const claimUsername = useCallback(async (username) => {
    const saved = await claimUsernameRequest(username);
    setUser((prev) => {
      const next = prev ? { ...prev, username: saved } : prev;
      cacheUser(next);
      return next;
    });
    return saved;
  }, []);

  const updateDisplayName = useCallback(async (displayName) => {
    const saved = await updateDisplayNameRequest(displayName);
    setUser((prev) => {
      const next = prev ? { ...prev, displayName: saved } : prev;
      cacheUser(next);
      return next;
    });
    return saved;
  }, []);

  return { status, user, signUp, logIn, continueWithApple, continueWithGoogle, logOut, claimUsername, updateDisplayName, finishOnboarding };
}

export function AuthProvider({ children }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
