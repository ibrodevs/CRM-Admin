import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('available blanks are shown as one compact utility row', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /receipt-subrows-strip-primary/);
  assert.match(source, /<b>Доступные бланки<\/b>/);
  assert.match(source, /receipt-subrows-strip-meta/);
  assert.match(source, /receipt-subrows-toggle-count/);
  assert.match(source, /expandedReceipts\[r\.f\.id\] \? 'Скрыть' : 'Показать'/);
  assert.doesNotMatch(source, /Каждый билет доступен отдельно/);
  assert.doesNotMatch(source, /receipt-subrows-strip-stats/);
});

test('available blanks toolbar is integrated into the document row instead of a card', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Receipt import: compact integrated blanks toolbar/);
  assert.match(css, /\.receipt-subrows-strip \{[\s\S]*min-height: 46px;[\s\S]*border-radius: 0;[\s\S]*box-shadow: none;/);
  assert.match(css, /\.receipt-subrows-strip-icon \{[\s\S]*width: 28px;[\s\S]*height: 28px;/);
  assert.match(css, /\.receipt-subrows-strip-toggle \{[\s\S]*min-height: 32px;[\s\S]*white-space: nowrap;/);
  assert.doesNotMatch(css, /Receipt import: compact integrated blanks toolbar\.[\s\S]*border-radius: 12px;/);
});
