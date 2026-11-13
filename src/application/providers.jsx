import { PreferenceEffects } from './PreferenceEffects.jsx';
import { ToastProvider } from '../shared/ui/Toast.jsx';
import { AuthProvider, useAuth } from '../shared/auth/auth-context.jsx';
import { WorkspaceProvider } from '../legacy/compatibility/workspace-provider.jsx';
import { syncLegacyCurrentUser, syncLegacyCurrencies } from '../legacy/adapters/backend-data-sync.js';

function AccountWorkspace({ children }) {
  const { user } = useAuth();
  return <WorkspaceProvider key={user ? `${user.tenant_id || ''}:${user.id}` : 'anonymous'}><PreferenceEffects syncCurrencies={syncLegacyCurrencies} />{children}</WorkspaceProvider>;
}

export function AppProviders({ children }) {
  return <ToastProvider><AuthProvider syncLegacyCurrentUser={syncLegacyCurrentUser}><AccountWorkspace>{children}</AccountWorkspace></AuthProvider></ToastProvider>;
}
