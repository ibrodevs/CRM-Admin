import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '../api/auth';
import { onUnauthorized } from '../api/client';
import { toUiUser } from '../api/adapters';
import { syncLegacyCurrentUser } from './backend-data-sync';

const AuthContext = createContext(null);

// Как часто фоново перепроверяется сессия. Вкладку могут оставить открытой на
// весь день; без проверки истёкшая сессия обнаруживается только в момент
// следующего действия оператора.
const SESSION_REVALIDATE_MS = 60_000;

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [challengeToken, setChallengeToken] = useState('');
  const [expired, setExpired] = useState(false);

  const refreshSession = useCallback(async (signal) => {
    try {
      const session = await authApi.session(signal);
      const uiUser = toUiUser(session.user);
      syncLegacyCurrentUser(uiUser);
      setUser(uiUser);
      setStatus('authenticated');
      return session;
    } catch (error) {
      if (error.name === 'AbortError') return null;
      syncLegacyCurrentUser(null);
      setUser(null);
      setStatus(error.status === 503 ? 'unavailable' : 'anonymous');
      return null;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshSession(controller.signal);
    return () => controller.abort();
  }, [refreshSession]);

  // Любой 401 из рабочих запросов означает, что сессии больше нет. Оставаться
  // на рабочем экране в таком состоянии нельзя: данные всё равно не придут,
  // а оператор видит пустые списки и не понимает, что произошло.
  const endSession = useCallback(() => {
    syncLegacyCurrentUser(null);
    setUser(null);
    setChallengeToken('');
    setStatus((current) => {
      if (current === 'authenticated') setExpired(true);
      return 'anonymous';
    });
  }, []);

  useEffect(() => onUnauthorized(endSession), [endSession]);

  // Фоновая перепроверка: по таймеру, при возврате на вкладку и при
  // восстановлении сети. Так истёкшая сессия обнаруживается сама, а не при
  // следующем клике оператора.
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
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
  }, [status, refreshSession]);

  const login = useCallback(async (loginValue, password) => {
    const result = await authApi.login(loginValue, password);
    if (result.two_factor_required) {
      setChallengeToken(result.challenge_token);
      return { twoFactorRequired: true };
    }
    const uiUser = toUiUser(result.user);
    syncLegacyCurrentUser(uiUser);
    setUser(uiUser);
    setStatus('authenticated');
    setExpired(false);
    return { authenticated: true };
  }, []);

  const verifyTwoFactor = useCallback(async (code) => {
    const result = await authApi.verifyTwoFactor(challengeToken, code);
    setChallengeToken('');
    const uiUser = toUiUser(result.user);
    syncLegacyCurrentUser(uiUser);
    setUser(uiUser);
    setStatus('authenticated');
    setExpired(false);
  }, [challengeToken]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally {
      syncLegacyCurrentUser(null);
      setUser(null);
      setStatus('anonymous');
      setChallengeToken('');
      setExpired(false);
    }
  }, []);

  const value = useMemo(() => ({
    status, user, expired, login, logout, verifyTwoFactor, refreshSession,
    requestPasswordReset: authApi.requestPasswordReset,
  }), [status, user, expired, login, logout, verifyTwoFactor, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
