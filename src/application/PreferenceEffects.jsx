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
  const theme = user?.preferences?.theme || 'light';
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme; };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => { document.documentElement.lang = user?.preferences?.language || user?.language || 'ru'; }, [user?.preferences?.language, user?.language]);
  return null;
}
