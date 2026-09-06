import { ToastProvider } from '../shared/ui/index';
import { AuthProvider } from '../shared/auth/auth-context';
import { WorkspaceProvider } from '../legacy/compatibility/workspace-provider';
import { syncLegacyCurrentUser } from '../legacy/adapters/backend-data-sync';

export function AppProviders({ children }) {
  return <ToastProvider><AuthProvider syncLegacyCurrentUser={syncLegacyCurrentUser}><WorkspaceProvider>{children}</WorkspaceProvider></AuthProvider></ToastProvider>;
}
