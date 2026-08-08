import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('blank summary shows only the number of blanks and the expand action', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /receipt-subrows-strip-count/);
  assert.match(source, /Бланков: <b>\{subReceiptCount\}<\/b>/);
  assert.match(source, /expandedReceipts\[r\.f\.id\] \? 'Скрыть' : 'Показать'/);
  assert.doesNotMatch(source, /subPassengerCount\} \{plural\(subPassengerCount/);
  assert.doesNotMatch(source, /subRouteCount\} \{plural\(subRouteCount/);
  assert.doesNotMatch(source, /<b>Доступные бланки<\/b>/);
  assert.doesNotMatch(source, /Показать бланки \(/);
});

test('blank summary is rendered as a slim full-width strip under the main row', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Receipt import: blanks live in a dedicated expandable strip below the main row/);
  assert.match(css, /\.receipt-subrows-strip \{[\s\S]*min-height: 40px;[\s\S]*justify-content: space-between;/);
  assert.match(css, /\.receipt-subrows-strip-count \{[\s\S]*font-size: 11\.5px;/);
  assert.match(css, /\.receipt-subrows-strip-toggle \{[\s\S]*min-height: 28px;[\s\S]*border: 0;/);
  assert.match(css, /\.receipt-subrows-strip-row \{[\s\S]*display: table-row !important;/);
});
