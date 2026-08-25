import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fulfillmentUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const resourcesUrl = new URL('../js/api/resources.js', import.meta.url);

test('receipt batch import limits backend pressure', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');

  assert.match(source, /const RECEIPT_IMPORT_CONCURRENCY = 1;/);
  assert.match(source, /const RECEIPT_IMPORT_GAP_MS = 650;/);
  assert.match(source, /const queue = \[\.\.\.add\];/);
  assert.match(source, /const workerCount = Math\.min\(RECEIPT_IMPORT_CONCURRENCY, queue\.length\);/);
  assert.match(source, /await receiptImportSleep\(RECEIPT_IMPORT_GAP_MS\)/);
  assert.match(source, /void Promise\.all\(Array\.from\(\{ length: workerCount \}, \(\) => runWorker\(\)\)\);/);
  assert.doesNotMatch(source, /add\.forEach\(async \(entry\) => \{/);
});

test('receipt batch import stops after one authorization failure', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');

  assert.match(source, /let fatalBatchError = null;/);
  assert.match(source, /if \(fatalBatchError\) \{/);
  assert.match(source, /\[401, 403\]\.includes\(Number\(error\?\.status\)\)/);
  assert.match(source, /if \(isFatalAccessError\) fatalBatchError = error;/);
  assert.match(source, /let fatalBatchNotified = false;/);
  assert.match(source, /Пакет остановлен, повторные запросы не отправлялись/);
});

test('temporary backend overload is retried for upload and result', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');
  const resources = await readFile(resourcesUrl, 'utf8');

  assert.match(source, /const RECEIPT_IMPORT_MAX_ATTEMPTS = 5;/);
  assert.match(source, /const RECEIPT_RESULT_MAX_ATTEMPTS = 6;/);
  assert.match(source, /new Set\(\[0, 408, 425, 429, 500, 502, 503, 504\]\)/);
  assert.match(source, /async function importReceiptWithRetry\(file\)/);
  assert.match(source, /async function receiptResultWithRetry\(importId\)/);
  assert.match(source, /documentsApi\.importReceipt\(file, \{ idempotencyKey \}\)/);
  assert.match(source, /result = await receiptResultWithRetry\(importId\);/);
  assert.match(resources, /importReceipt: \(file, options = \{\}\)/);
  assert.match(resources, /apiRequest\(apiPath\('receipt-imports\/'\), \{ method: 'POST', body, \.\.\.options \}\)/);
});
