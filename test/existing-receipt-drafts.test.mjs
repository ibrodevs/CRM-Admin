import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const adapters = await readFile(new URL('../js/api/legacy-adapters.js', import.meta.url), 'utf8');

test('существующие квитанции показывают серверные черновики и позволяют выбрать нужный', () => {
  assert.match(adapters, /isReceiptDraft: receiptImport\.stage === 'draft'/);
  assert.match(page, /'Черновик':\s+\{ tone: 'amber', action: 'Продолжить черновик' \}/);
  assert.match(page, /const \[draftsOpen, setDraftsOpen\] = useState\(false\)/);
  assert.match(page, /const \[draftQuery, setDraftQuery\] = useState\(''\)/);
  assert.match(page, /const receiptDrafts = all\.filter\(\(document\) => document\.isReceiptDraft\)/);
  assert.match(page, /const filteredReceiptDrafts = receiptDrafts\.filter/);
  assert.match(page, /Черновики квитанций \(\{receiptDrafts\.length\}\)/);
  assert.match(page, /disabled=\{!receiptDrafts\.length\}/);
  assert.match(page, /receiptDrafts\.length === 1/);
  assert.match(page, /setEdit\(receiptDrafts\[0\]\)/);
  assert.match(page, /setDraftsOpen\(true\)/);
  assert.match(page, /<Drawer open=\{draftsOpen\}/);
  assert.match(page, /Пассажир, документ, заказ или маршрут…/);
  assert.match(page, /filteredReceiptDrafts\.map\(\(draft\)/);
  assert.match(page, /setEdit\(draft\)/);
  assert.match(page, /const savedDocument = await documentsApi\.updateReceipt/);
  assert.match(page, /const savedDraft = toLegacyDocument\(savedDocument, orders\)/);
  assert.match(page, /d\.isReceiptDraft[\s\S]*?\? 'Черновик'/);
  assert.match(page, /d\.isReceiptDraft \? 'Продолжить черновик'/);
});
