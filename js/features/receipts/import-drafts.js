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
