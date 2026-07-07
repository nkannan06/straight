import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchCurrentUser,
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
  const [status, setStatus] = useState('loading'); // 'loading' | 'authed' | 'anon'
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setStatus(u ? 'authed' : 'anon');
      })
      .catch(() => {
        if (!cancelled) setStatus('anon');
      });
    return () => {
      cancelled = true;
    };
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
    const u = await continueWithAppleRequest();
    setUser(u);
    setStatus('authed');
    return u;
  }, []);

  const continueWithGoogle = useCallback(async () => {
    const u = await continueWithGoogleRequest();
    setUser(u);
    setStatus('authed');
    return u;
  }, []);

  const logOut = useCallback(async () => {
    await logOutRequest();
    setUser(null);
    setStatus('anon');
  }, []);

  const claimUsername = useCallback(async (username) => {
    const saved = await claimUsernameRequest(username);
    setUser((prev) => (prev ? { ...prev, username: saved } : prev));
    return saved;
  }, []);

  const updateDisplayName = useCallback(async (displayName) => {
    const saved = await updateDisplayNameRequest(displayName);
    setUser((prev) => (prev ? { ...prev, displayName: saved } : prev));
    return saved;
  }, []);

  return { status, user, signUp, logIn, continueWithApple, continueWithGoogle, logOut, claimUsername, updateDisplayName };
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
