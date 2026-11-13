import { setRuntimePreferences } from '../preferences/preferences.js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { authApi } from './auth.api.js';
import { onUnauthorized } from '../api/client.js';
import { toUiUser } from './user.mapper.js';

const AuthContext = createContext(null);

// Как часто фоново перепроверяется сессия. Вкладку могут оставить открытой на
// весь день; без проверки истёкшая сессия обнаруживается только в момент
// следующего действия оператора.
const SESSION_REVALIDATE_MS = 60_000;

const ignoreLegacyUser = () => {};

export function AuthProvider({ children, syncLegacyCurrentUser = ignoreLegacyUser }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [challengeToken, setChallengeToken] = useState('');
  const [expired, setExpired] = useState(false);
  const [locked, setLocked] = useState(false);
  const currentUser = useRef(null);
  const checkInFlight = useRef(null);
  const sessionVersion = useRef(0);

  const endSession = useCallback(() => {
    if (!currentUser.current) return;
    setExpired(true);
    setLocked(true);
  }, []);

  const refreshSession = useCallback(async (signal) => {
    if (checkInFlight.current) return checkInFlight.current;
    const version = sessionVersion.current;
    const pending = (async () => {
      try {
        const session = await authApi.session(signal);
        if (version !== sessionVersion.current) return null;
        const uiUser = toUiUser(session.user);
        setRuntimePreferences({ ...uiUser.preferences, timezone: uiUser.timezone });
        syncLegacyCurrentUser(uiUser);
        currentUser.current = uiUser;
        setUser(uiUser);
        setStatus('authenticated');
        return session;
      } catch (error) {
        if (error.name === 'AbortError' || version !== sessionVersion.current) return null;
        // A network/server failure is not proof of an expired session.
        // Keep the mounted workspace and its unsaved forms during recovery.
        if (currentUser.current) {
          if (error.status === 401) endSession();
          return null;
        }
        setStatus(error.status === 401 ? 'anonymous' : 'unavailable');
        return null;
      }
    })();
    checkInFlight.current = pending;
    const clearAborted = () => { if (checkInFlight.current === pending) checkInFlight.current = null; };
    signal?.addEventListener('abort', clearAborted, { once: true });
    try { return await pending; }
    finally { signal?.removeEventListener('abort', clearAborted); if (checkInFlight.current === pending) checkInFlight.current = null; }
  }, [endSession]);

  useEffect(() => {
    const controller = new AbortController();
    refreshSession(controller.signal);
    return () => controller.abort();
  }, [refreshSession]);

  useEffect(() => onUnauthorized(() => { refreshSession(); }), [refreshSession]);

  // Фоновая перепроверка: по таймеру, при возврате на вкладку и при
  // восстановлении сети. Так истёкшая сессия обнаруживается сама, а не при
  // следующем клике оператора.
  useEffect(() => {
    if (status !== 'authenticated' || locked) return undefined;
    let cancelled = false;
    const revalidate = () => {
      if (cancelled || (typeof document !== 'undefined' && document.hidden)) return;
      refreshSession();
    };
    const timer = setInterval(revalidate, SESSION_REVALIDATE_MS);
    const onVisible = () => { if (!document.hidden) revalidate(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', revalidate);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', revalidate);
      window.removeEventListener('focus', onVisible);
    };
  }, [status, locked, refreshSession]);

  const login = useCallback(async (loginValue, password) => {
    sessionVersion.current += 1;
    const result = await authApi.login(loginValue, password);
    if (result.two_factor_required) {
      setChallengeToken(result.challenge_token);
      return { twoFactorRequired: true };
    }
    const uiUser = toUiUser(result.user);
    setRuntimePreferences({ ...uiUser.preferences, timezone: uiUser.timezone });
    syncLegacyCurrentUser(uiUser);
    currentUser.current = uiUser;
    setUser(uiUser);
    setLocked(false);
    setStatus('authenticated');
    setExpired(false);
    return { authenticated: true };
  }, []);

  const verifyTwoFactor = useCallback(async (code) => {
    sessionVersion.current += 1;
    const result = await authApi.verifyTwoFactor(challengeToken, code);
    setChallengeToken('');
    const uiUser = toUiUser(result.user);
    setRuntimePreferences({ ...uiUser.preferences, timezone: uiUser.timezone });
    syncLegacyCurrentUser(uiUser);
    currentUser.current = uiUser;
    setUser(uiUser);
    setLocked(false);
    setStatus('authenticated');
    setExpired(false);
  }, [challengeToken]);

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    try { await authApi.logout(); } finally {
      setRuntimePreferences();
      syncLegacyCurrentUser(null);
      currentUser.current = null;
      setUser(null);
      setLocked(false);
      setStatus('anonymous');
      setChallengeToken('');
      setExpired(false);
    }
  }, []);

  const value = useMemo(() => ({
    status, user, expired, locked, login, logout, verifyTwoFactor, refreshSession,
    requestPasswordReset: authApi.requestPasswordReset,
  }), [status, user, expired, locked, login, logout, verifyTwoFactor, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
