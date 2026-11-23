import assert from 'node:assert/strict';
import { readFile } from './helpers/source.mjs';
import test from 'node:test';

const page = await readFile(new URL('../src/modules/receipts/ui/ReceiptEditorPage.jsx', import.meta.url), 'utf8');
const adapters = await readFile(new URL('../src/legacy/adapters/legacy-adapters.js', import.meta.url), 'utf8');

test('существующие квитанции показывают серверные черновики в отдельном списке', () => {
  assert.match(adapters, /isReceiptDraft: receiptImport\.stage === 'draft'/);
  assert.match(page, /'Черновик':\s+\{ tone: 'amber', action: 'Продолжить черновик' \}/);
  assert.match(page, /<DraftWorkspaceList route="receipts"/);
  assert.match(page, /all\.filter\(\(document\) => !document\.isReceiptDraft\)/);
  assert.match(page, /all\.filter\(document => document\.isReceiptDraft\)/);
  assert.match(page, /const savedDocument = await documentsApi\.updateReceipt/);
  assert.match(page, /const savedDraft = toLegacyDocument\(savedDocument, orders\)/);
  assert.match(page, /d\.isReceiptDraft[\s\S]*?\? 'Черновик'/);
  assert.match(page, /d\.isReceiptDraft \? 'Продолжить черновик'/);
});

test('незавершённые импорты выводятся отдельными черновиками с продолжением редактирования', () => {
  assert.match(page, /importDrafts\.map\(draft =>/);
  assert.match(page, /continueImportDraft\(draft\.id\)/);
  assert.match(page, /onContinue: \(\) => continueImportDraft/);
  assert.match(page, /clearImportDraft\(draft\.id\)/);
});
