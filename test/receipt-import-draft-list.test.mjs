import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LEGACY_RECEIPT_IMPORT_DRAFT_KEY,
  RECEIPT_IMPORT_DRAFTS_KEY,
  readReceiptImportDrafts,
  receiptImportDraftTitle,
  removeReceiptImportDraft,
  upsertReceiptImportDraft,
  writeReceiptImportDrafts,
} from '../js/features/receipts/import-drafts.js';

function draft(id, savedAt, name, step = 2) {
  return { id, version: 1, savedAt, step, files: [{ id: `${id}-file`, name }] };
}

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    value: (key) => values.get(key),
  };
}

test('добавление нового черновика не затирает предыдущие квитанции', () => {
  const first = draft('draft-1', '2026-08-21T09:00:00.000Z', 'avia.pdf');
  const second = draft('draft-2', '2026-08-21T10:00:00.000Z', 'rail.pdf');
  const drafts = upsertReceiptImportDraft(upsertReceiptImportDraft([], first), second);

  assert.deepEqual(drafts.map((row) => row.id), ['draft-2', 'draft-1']);
  assert.deepEqual(drafts.map((row) => row.files[0].name), ['rail.pdf', 'avia.pdf']);
});

test('повторное сохранение обновляет только выбранный черновик', () => {
  const first = draft('draft-1', '2026-08-21T09:00:00.000Z', 'avia.pdf');
  const second = draft('draft-2', '2026-08-21T10:00:00.000Z', 'rail.pdf');
  const updated = upsertReceiptImportDraft([first, second], {
    ...first,
    savedAt: '2026-08-21T11:00:00.000Z',
    step: 4,
  });

  assert.equal(updated.length, 2);
  assert.equal(updated.find((row) => row.id === 'draft-1').step, 4);
  assert.equal(updated.find((row) => row.id === 'draft-2').files[0].name, 'rail.pdf');
});

test('старый одиночный черновик мигрирует в коллекцию без потери данных', () => {
  const legacy = draft(undefined, '2026-08-21T09:00:00.000Z', 'legacy.pdf');
  delete legacy.id;
  const store = storage({ [LEGACY_RECEIPT_IMPORT_DRAFT_KEY]: JSON.stringify(legacy) });
  const drafts = readReceiptImportDrafts(store);

  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].files[0].name, 'legacy.pdf');
  assert.ok(drafts[0].id);
  assert.equal(store.getItem(LEGACY_RECEIPT_IMPORT_DRAFT_KEY), null);
  assert.ok(store.value(RECEIPT_IMPORT_DRAFTS_KEY));
});

test('удаление затрагивает только указанный черновик, а список сохраняется', () => {
  const drafts = [
    draft('draft-1', '2026-08-21T09:00:00.000Z', 'avia.pdf'),
    draft('draft-2', '2026-08-21T10:00:00.000Z', 'rail.pdf'),
  ];
  const remaining = removeReceiptImportDraft(drafts, 'draft-2');
  const store = storage();

  assert.deepEqual(remaining.map((row) => row.id), ['draft-1']);
  assert.equal(writeReceiptImportDrafts(store, remaining), true);
  assert.deepEqual(readReceiptImportDrafts(store).map((row) => row.id), ['draft-1']);
});

test('пустая коллекция v2 не восстанавливает уже удалённый старый черновик', () => {
  const oldDraft = draft('legacy', '2026-08-21T09:00:00.000Z', 'deleted.pdf');
  const store = storage({
    [RECEIPT_IMPORT_DRAFTS_KEY]: JSON.stringify({ version: 2, drafts: [] }),
    [LEGACY_RECEIPT_IMPORT_DRAFT_KEY]: JSON.stringify(oldDraft),
  });

  assert.deepEqual(readReceiptImportDrafts(store), []);
});

test('название черновика различает одну и несколько квитанций', () => {
  assert.equal(receiptImportDraftTitle(draft('draft-1', '', 'avia.pdf')), 'avia.pdf');
  assert.equal(receiptImportDraftTitle({ files: [{ name: 'avia.pdf' }, { name: 'rail.pdf' }] }), 'avia.pdf и ещё 1');
});
