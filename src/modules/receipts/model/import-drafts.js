export const RECEIPT_IMPORT_DRAFTS_KEY = 'travelhub.receipt-import-drafts.v2';
export const LEGACY_RECEIPT_IMPORT_DRAFT_KEY = 'travelhub.receipt-import-draft.v1';

function usableDraft(draft) {
  return draft && Array.isArray(draft.files) && draft.files.length > 0;
}

function legacyDraftId(draft) {
  const savedAt = String(draft?.savedAt || Date.now()).replace(/[^0-9A-Za-z]/g, '');
  return `receipt-draft-${savedAt || Date.now()}`;
}

export function createReceiptImportDraftId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `receipt-draft-${crypto.randomUUID()}`;
  }
  return `receipt-draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeReceiptImportDrafts(value) {
  const rows = value?.version === 2 && Array.isArray(value.drafts)
    ? value.drafts
    : Array.isArray(value)
      ? value
      : usableDraft(value)
        ? [value]
        : [];
  return rows
    .filter(usableDraft)
    .map((draft) => ({ ...draft, version: 1, id: draft.id || legacyDraftId(draft) }))
    .sort((left, right) => String(right.savedAt || '').localeCompare(String(left.savedAt || '')));
}

export function upsertReceiptImportDraft(drafts, draft) {
  if (!usableDraft(draft)) return normalizeReceiptImportDrafts(drafts);
  const row = { ...draft, version: 1, id: draft.id || createReceiptImportDraftId() };
  return normalizeReceiptImportDrafts([
    row,
    ...normalizeReceiptImportDrafts(drafts).filter((item) => item.id !== row.id),
  ]);
}

export function removeReceiptImportDraft(drafts, draftId) {
  if (!draftId) return normalizeReceiptImportDrafts(drafts);
  return normalizeReceiptImportDrafts(drafts).filter((draft) => draft.id !== draftId);
}

export function readReceiptImportDrafts(storage) {
  if (!storage) return [];
  try {
    const currentValue = storage.getItem(RECEIPT_IMPORT_DRAFTS_KEY);
    if (currentValue !== null) {
      return normalizeReceiptImportDrafts(JSON.parse(currentValue));
    }

    const legacy = JSON.parse(storage.getItem(LEGACY_RECEIPT_IMPORT_DRAFT_KEY) || 'null');
    const migrated = normalizeReceiptImportDrafts(legacy);
    if (migrated.length) {
      writeReceiptImportDrafts(storage, migrated);
      storage.removeItem(LEGACY_RECEIPT_IMPORT_DRAFT_KEY);
    }
    return migrated;
  } catch {
    return [];
  }
}

export function writeReceiptImportDrafts(storage, drafts) {
  if (!storage) return false;
  try {
    storage.setItem(RECEIPT_IMPORT_DRAFTS_KEY, JSON.stringify({
      version: 2,
      drafts: normalizeReceiptImportDrafts(drafts),
    }));
    return true;
  } catch {
    return false;
  }
}

export function receiptImportDraftTitle(draft) {
  const names = (draft?.files || []).map((file) => String(file?.name || '').trim()).filter(Boolean);
  if (!names.length) return 'Черновик квитанции';
  if (names.length === 1) return names[0];
  return `${names[0]} и ещё ${names.length - 1}`;
}

export function receiptDashboardDrafts(documents = [], storage, onOpen) {
  const imports = readReceiptImportDrafts(storage).map(draft => ({ id:`receipt-import/${draft.id}`, category:'receipts', title:receiptImportDraftTitle(draft), stage:'form', services:['Импорт документов'], savedAt:new Date(draft.savedAt).getTime(), count:draft.files.length, canDelete:false, onContinue:()=>onOpen({importId:draft.id}) }));
  const receipts = documents.filter(row=>row.isReceiptDraft || row.metadata?.receipt_import?.stage==='draft').map(row=>({id:`receipt/${row.serverId || row.id}`,category:'receipts',title:row.name || row.title || row.document_number || 'Квитанция',stage:'form',services:['Редактор квитанций'],savedAt:new Date(row.updated_at || row.created_at || row.date).getTime(),canDelete:false,onContinue:()=>onOpen({documentId:row.serverId || row.id})}));
  return [...imports,...receipts];
}

// The editor and dashboard must use the same account-scoped storage.
export function receiptDraftStorage(storage, owner) {
  if (!storage || !owner) return null;
  const prefix = `psc:receipt-drafts:${encodeURIComponent(owner)}:`;
  const claimKey = 'psc:receipt-drafts:legacy-owner';
  const keys = [RECEIPT_IMPORT_DRAFTS_KEY, LEGACY_RECEIPT_IMPORT_DRAFT_KEY];
  try {
    const claimed = storage.getItem(claimKey);
    if (!claimed || claimed === owner) {
      storage.setItem(claimKey, owner);
      for (const key of keys) {
        if (storage.getItem(prefix + key) === null && storage.getItem(key) !== null) {
          storage.setItem(prefix + key, storage.getItem(key));
          storage.removeItem(key);
        }
      }
    }
  } catch { /* Normal write/read paths report storage failures. */ }
  return {getItem:key=>storage.getItem(prefix+key), setItem:(key,value)=>{storage.setItem(prefix+key,value);if(typeof window!=='undefined')window.dispatchEvent(new Event('receipt-drafts-changed'));},removeItem:key=>storage.removeItem(prefix+key)};
}
