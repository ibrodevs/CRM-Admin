import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const adapters = await readFile(new URL('../js/api/legacy-adapters.js', import.meta.url), 'utf8');

test('существующие квитанции показывают серверные черновики в отдельном списке', () => {
  assert.match(adapters, /isReceiptDraft: receiptImport\.stage === 'draft'/);
  assert.match(page, /'Черновик':\s+\{ tone: 'amber', action: 'Продолжить черновик' \}/);
  assert.match(page, /const \[registryView, setRegistryView\] = useState\('active'\)/);
  assert.match(page, /registryView === 'drafts' \? document\.isReceiptDraft : !document\.isReceiptDraft/);
  assert.match(page, /Рабочий список/);
  assert.match(page, /Черновики \(\{registryDraftCount \+ \(importDraft \? 1 : 0\)\}\)/);
  assert.match(page, /const savedDocument = await documentsApi\.updateReceipt/);
  assert.match(page, /const savedDraft = toLegacyDocument\(savedDocument, orders\)/);
  assert.match(page, /d\.isReceiptDraft[\s\S]*?\? 'Черновик'/);
  assert.match(page, /d\.isReceiptDraft \? 'Продолжить черновик'/);
});
