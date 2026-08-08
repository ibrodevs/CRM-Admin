import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fulfillmentUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('import progress counts actual blanks, not only PDF files', async () => {
  const source = await readFile(fulfillmentUrl, 'utf8');

  assert.match(source, /const processedBlankCount = done\.reduce/);
  assert.match(source, /Array\.isArray\(file\.subReceipts\) \? file\.subReceipts\.length : 0/);
  assert.match(source, /file\.parsed\?\.receiptCount \|\| file\.parsed\?\.receipt_count/);
  assert.match(source, /Бланков: <b>\{processedBlankCount\}<\/b>/);
});

test('blank counter is centered between file progress and completion state', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.receipt-upload-progress-foot \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
  assert.match(css, /\.receipt-upload-progress-blanks \{[\s\S]*justify-self: center/);
  assert.match(css, /\.receipt-upload-progress-blanks b \{[\s\S]*color: var\(--green\)/);
});
