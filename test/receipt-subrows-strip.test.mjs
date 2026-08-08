import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('available receipt blanks live in a dedicated row below the main receipt row', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /<tr className=\{'receipt-subrows-strip-row'/);
  assert.match(source, /className="receipt-subrows-strip-count"/);
  assert.match(source, /Бланков: <b>\{subReceiptCount\}<\/b>/);
  assert.match(source, /expandedReceipts\[r\.f\.id\] \? 'Скрыть' : 'Показать'/);
  assert.match(source, /colSpan=\{7\}/);
  assert.doesNotMatch(source, /className=\{'receipt-subrows-inline'/);
});

test('blank toggle is not squeezed inside participant title', async () => {
  const source = await readFile(pageUrl, 'utf8');
  const titleMatch = source.match(/<span className="rec-import-title">([\s\S]*?)<\/span>/);

  assert.ok(titleMatch, 'participant title should exist');
  assert.doesNotMatch(titleMatch[1], /receipt-subrows-strip-toggle|Показать/);
  assert.match(source, /className="receipt-subrows-strip-toggle"/);
});

test('blank strip is visually separated from the main row and remains expandable', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Receipt import: blanks live in a dedicated expandable strip below the main row/);
  assert.match(css, /\.receipt-subrows-strip-row \{[\s\S]*display: table-row !important;/);
  assert.match(css, /\.receipt-subrows-strip \{[\s\S]*border-top: 1px solid #e7edf7;[\s\S]*background: #fafbfe;/);
  assert.match(css, /\.receipt-subrows-strip-toggle \{[\s\S]*border: 0;[\s\S]*background: transparent;/);
  assert.match(css, /\.receipt-subrows-inline \{[\s\S]*display: none !important;/);
});
