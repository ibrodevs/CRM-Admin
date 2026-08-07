import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('blank summary is compact and embedded under document metadata', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /receipt-subrows-inline/);
  assert.match(source, /subReceiptCount\} \{plural\(subReceiptCount, 'бланк', 'бланка', 'бланков'\)/);
  assert.match(source, /subPassengerCount\} \{plural\(subPassengerCount, 'пассажир', 'пассажира', 'пассажиров'\)/);
  assert.match(source, /subRouteCount\} \{plural\(subRouteCount, 'маршрут', 'маршрута', 'маршрутов'\)/);
  assert.match(source, /expandedReceipts\[r\.f\.id\] \? 'Скрыть' : 'Показать'/);
  assert.doesNotMatch(source, /Каждый билет доступен отдельно/);
  assert.doesNotMatch(source, /<b>Доступные бланки<\/b>/);
});

test('blank controls have no card chrome or detached strip', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Receipt import: blanks integrated inside the document cell/);
  assert.match(css, /\.receipt-subrows-inline \{[\s\S]*margin-top: 7px;[\s\S]*border-top: 1px solid #edf1f6;/);
  assert.match(css, /\.receipt-subrows-inline-toggle \{[\s\S]*min-height: 26px;[\s\S]*border: 0;[\s\S]*background: transparent;/);
  assert.match(css, /\.receipt-subrows-strip-row \{[\s\S]*display: none !important;/);
});
