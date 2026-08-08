import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('blank summary shows only count and expand action inside the document block', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /receipt-subrows-inline-count/);
  assert.match(source, /Бланков: <b>\{subReceiptCount\}<\/b>/);
  assert.match(source, /receipt-subrows-inline-toggle/);
  assert.match(source, /expandedReceipts\[r\.f\.id\] \? 'Скрыть' : 'Показать'/);
  assert.doesNotMatch(source, /<b>Доступные бланки<\/b>/);
  assert.doesNotMatch(source, /Показать бланки \(/);
  assert.doesNotMatch(source, /<tr className=\{'receipt-subrows-strip-row'/);
});

test('blank controls are visually integrated into the document cell', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Receipt import: blank count stays inside the document block/);
  assert.match(css, /\.receipt-subrows-inline \{[\s\S]*width: 100%;[\s\S]*border-top: 1px solid #edf1f6;[\s\S]*display: flex;/);
  assert.match(css, /\.receipt-subrows-inline-count \{[\s\S]*font-size: 11px;/);
  assert.match(css, /\.receipt-subrows-inline-toggle \{[\s\S]*min-height: 26px;[\s\S]*border: 0;[\s\S]*background: transparent;/);
  assert.match(css, /\.receipt-subrows-strip-row \{[\s\S]*display: none !important;/);
});
