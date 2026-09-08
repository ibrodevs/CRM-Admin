import { PreferenceEffects } from './PreferenceEffects.jsx';
import { ToastProvider } from '../shared/ui/Toast.jsx';
import { AuthProvider } from '../shared/auth/auth-context.jsx';
import { WorkspaceProvider } from '../legacy/compatibility/workspace-provider.jsx';
import { syncLegacyCurrentUser, syncLegacyCurrencies } from '../legacy/adapters/backend-data-sync.js';

export function AppProviders({ children }) {
  return <ToastProvider><AuthProvider syncLegacyCurrentUser={syncLegacyCurrentUser}><WorkspaceProvider><PreferenceEffects syncCurrencies={syncLegacyCurrencies} />{children}</WorkspaceProvider></AuthProvider></ToastProvider>;
}
