import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '../api/auth';
import { toUiUser } from '../api/adapters';
import { syncLegacyCurrentUser } from './backend-data-sync';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [challengeToken, setChallengeToken] = useState('');

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
    return { authenticated: true };
  }, []);

  const verifyTwoFactor = useCallback(async (code) => {
    const result = await authApi.verifyTwoFactor(challengeToken, code);
    setChallengeToken('');
    const uiUser = toUiUser(result.user);
    syncLegacyCurrentUser(uiUser);
    setUser(uiUser);
    setStatus('authenticated');
  }, [challengeToken]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally {
      syncLegacyCurrentUser(null);
      setUser(null);
      setStatus('anonymous');
      setChallengeToken('');
    }
  }, []);

  const value = useMemo(() => ({
    status, user, login, logout, verifyTwoFactor, refreshSession,
    requestPasswordReset: authApi.requestPasswordReset,
  }), [status, user, login, logout, verifyTwoFactor, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
