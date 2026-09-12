import { workspaceSettingsApi } from '../modules/settings/api.js';
import { useEffect } from 'react';
import { useAuth } from '../shared/auth/auth-context.jsx';

export function PreferenceEffects({ syncCurrencies }) {
  const { user } = useAuth();
  useEffect(() => {
    syncCurrencies({});
    if (!user) return;
    const controller = new AbortController();
    workspaceSettingsApi.getTenant('finance-currencies', controller.signal).then(({value}) => { if (!controller.signal.aborted) syncCurrencies(value || {}); }).catch(() => {});
    return () => controller.abort();
  }, [user?.id, syncCurrencies]);
  const storedTheme = typeof window !== 'undefined' ? (() => { try { return localStorage.getItem('crm_theme'); } catch { return null; } })() : null;
  const theme = user?.preferences?.theme || storedTheme || 'light';
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const activeTheme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = activeTheme;
      try { if (theme) localStorage.setItem('crm_theme', theme); } catch {}
    };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => { document.documentElement.lang = user?.preferences?.language || user?.language || 'ru'; }, [user?.preferences?.language, user?.language]);
  return null;
}
