import { readReceiptImportDrafts, writeReceiptImportDrafts, receiptDraftStorage } from '../modules/receipts/model/import-drafts.js';
import { DraftRegistryProvider } from '../shared/drafts/DraftRegistry.jsx';
import { DraftProvider } from '../shared/drafts/Drafts.jsx';
import { PreferenceEffects } from './PreferenceEffects.jsx';
import { ToastProvider } from '../shared/ui/Toast.jsx';
import { AuthProvider, useAuth } from '../shared/auth/auth-context.jsx';
import { WorkspaceProvider } from '../legacy/compatibility/workspace-provider.jsx';
import { syncLegacyCurrentUser, syncLegacyCurrencies } from '../legacy/adapters/backend-data-sync.js';

function AccountWorkspace({ children }) {
  const { user } = useAuth();
  const receiptStore = typeof window !== 'undefined' && user ? receiptDraftStorage(window.localStorage, `${user.tenant_id || ''}:${user.id}`) : null;
  return <DraftProvider key={user ? `${user.tenant_id || ''}:${user.id}` : 'anonymous'} owner={user ? `${user.tenant_id || ''}:${user.id}` : null}><DraftRegistryProvider user={user} receiptStorage={{read:()=>readReceiptImportDrafts(receiptStore),restore:draft=>writeReceiptImportDrafts(receiptStore,[draft,...readReceiptImportDrafts(receiptStore).filter(d=>d.id!==draft.id)])}}><WorkspaceProvider><PreferenceEffects syncCurrencies={syncLegacyCurrencies} />{children}</WorkspaceProvider></DraftRegistryProvider></DraftProvider>;
}

export function AppProviders({ children }) {
  return <ToastProvider><AuthProvider syncLegacyCurrentUser={syncLegacyCurrentUser}><AccountWorkspace>{children}</AccountWorkspace></AuthProvider></ToastProvider>;
}
