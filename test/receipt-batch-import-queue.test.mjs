import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fulfillmentUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const resourcesUrl = new URL('../js/api/resources.js', import.meta.url);

test('receipt batch import limits backend pressure', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');

  assert.match(source, /const RECEIPT_IMPORT_CONCURRENCY = 2;/);
  assert.match(source, /const queue = \[\.\.\.add\];/);
  assert.match(source, /const workerCount = Math\.min\(RECEIPT_IMPORT_CONCURRENCY, queue\.length\);/);
  assert.match(source, /void Promise\.all\(Array\.from\(\{ length: workerCount \}, \(\) => runWorker\(\)\)\);/);
  assert.doesNotMatch(source, /add\.forEach\(async \(entry\) => \{/);
});

test('temporary backend overload is retried with one idempotency key', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');
  const resources = await readFile(resourcesUrl, 'utf8');

  assert.match(source, /const RECEIPT_IMPORT_MAX_ATTEMPTS = 3;/);
  assert.match(source, /async function importReceiptWithRetry\(file\)/);
  assert.match(source, /\[429, 500, 502, 503, 504\]\.includes\(status\)/);
  assert.match(source, /documentsApi\.importReceipt\(file, \{ idempotencyKey \}\)/);
  assert.match(resources, /importReceipt: \(file, options = \{\}\)/);
  assert.match(resources, /apiRequest\(apiPath\('receipt-imports\/'\), \{ method: 'POST', body, \.\.\.options \}\)/);
});
