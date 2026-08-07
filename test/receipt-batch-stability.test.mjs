import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fulfillmentUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);

test('large receipt batches are processed one file at a time', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');

  assert.match(source, /const RECEIPT_IMPORT_CONCURRENCY = 1;/);
  assert.match(source, /const RECEIPT_IMPORT_GAP_MS = 650;/);
  assert.match(source, /const queue = \[\.\.\.add\];/);
  assert.match(source, /await receiptImportSleep\(RECEIPT_IMPORT_GAP_MS\)/);
  assert.doesNotMatch(source, /add\.forEach\(async \(entry\) => \{/);
});

test('upload and result reads both retry temporary backend failures', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');

  assert.match(source, /const RECEIPT_IMPORT_MAX_ATTEMPTS = 5;/);
  assert.match(source, /const RECEIPT_RESULT_MAX_ATTEMPTS = 6;/);
  assert.match(source, /async function importReceiptWithRetry\(file\)/);
  assert.match(source, /async function receiptResultWithRetry\(importId\)/);
  assert.match(source, /result = await receiptResultWithRetry\(importId\);/);
  assert.match(source, /new Set\(\[0, 408, 425, 429, 500, 502, 503, 504\]\)/);
});
