import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fulfillmentUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);

test('each child blank has an independent math key', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');

  assert.match(source, /const subReceiptMathKey = \(fileId, index\) => fileId \+ '::blank::' \+ index/);
  assert.match(source, /const pricingRows = doneRows\.filter/);
  assert.match(source, /mathKey: subReceiptMathKey\(row\.f\.id, index\)/);
  assert.match(source, /getMath\(r\.mathKey, p\)/);
  assert.match(source, /setMathId\(r\.mathKey\)/);
});

test('parent total is only a sum of individual blank calculations', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');

  assert.match(source, /const mathForFile = \(file\) =>/);
  assert.match(source, /file\.subReceipts\.reduce/);
  assert.match(source, /mathForFile\(r\.f\)/);
  assert.match(source, /Математика применена отдельно к/);
});
