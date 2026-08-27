import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('available receipt blanks live inside the document cell', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /className=\{'receipt-subrows-inline'/);
  assert.match(source, /className="receipt-subrows-inline-count"/);
  assert.match(source, /Бланков: <b>\{subReceiptCount\}<\/b>/);
  assert.match(source, /className="receipt-subrows-inline-toggle"/);
  assert.match(source, /expandedReceipts\[r\.f\.id\] \? 'Скрыть' : 'Показать'/);
  assert.doesNotMatch(source, /<tr className=\{'receipt-subrows-strip-row'/);
  // Полоса бланков не должна возвращаться отдельной строкой на всю ширину.
  // Широких строк в таблице импорта больше нет вовсе: вкладки одинаковой
  // стоимости вынесены в сквозную полосу над таблицей.
  assert.equal((source.match(/colSpan=\{7\}/g) || []).length, 0);
  assert.match(source, /<ReceiptCostGroupsBar/);
});

test('blank toggle is outside participant title but still inside the document block', async () => {
  const source = await readFile(pageUrl, 'utf8');
  const titleMatch = source.match(/<span className="rec-import-title">([\s\S]*?)<\/span>/);

  assert.ok(titleMatch, 'participant title should exist');
  assert.doesNotMatch(titleMatch[1], /receipt-subrows-inline-toggle|Показать/);
  assert.match(source, /className="rec-import-main"[\s\S]*className=\{'receipt-subrows-inline'/);
});

test('blank block is visually part of the document content', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Receipt import: blank count stays inside the document block/);
  assert.match(css, /\.receipt-subrows-inline \{[\s\S]*margin-top: 7px;[\s\S]*padding-top: 7px;[\s\S]*border-top: 1px solid #edf1f6;/);
  assert.match(css, /\.receipt-subrows-inline-toggle \{[\s\S]*border: 0;[\s\S]*background: transparent;/);
  assert.match(css, /\.receipt-subrows-strip-row \{[\s\S]*display: none !important;/);
});
