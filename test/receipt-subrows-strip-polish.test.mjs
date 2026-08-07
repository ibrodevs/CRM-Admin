import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('available blanks strip uses readable full labels instead of compressed summary', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /receipt-subrows-strip-heading/);
  assert.match(source, /Каждый билет доступен отдельно/);
  assert.match(source, /receipt-subrows-strip-stats/);
  assert.match(source, /plural\(subReceiptCount, 'бланк', 'бланка', 'бланков'\)/);
  assert.match(source, /plural\(subPassengerCount, 'пассажир', 'пассажира', 'пассажиров'\)/);
  assert.match(source, /plural\(subRouteCount, 'маршрут', 'маршрута', 'маршрутов'\)/);
});

test('available blanks strip is a calm card with pills and a stable action button', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Receipt import: polished available blanks card/);
  assert.match(css, /\.receipt-subrows-strip \{[\s\S]*border-radius: 12px;[\s\S]*background: #fff;/);
  assert.match(css, /\.receipt-subrows-stat \{[\s\S]*border-radius: 999px;/);
  assert.match(css, /\.receipt-subrows-strip-toggle \{[\s\S]*min-height: 40px;[\s\S]*white-space:/);
});
