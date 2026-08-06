import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('available receipt blanks render in a full-width table strip', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /className=\{'receipt-subrows-strip-row'/);
  assert.match(source, /<td colSpan=\{7\}>/);
  assert.match(source, /<b>Доступные бланки<\/b>/);
  assert.match(source, /Показать бланки \(' \+ subReceiptCount \+ '\)'/);
  assert.match(source, /subPassengerCount/);
  assert.match(source, /subRouteCount/);
});

test('blank toggle is no longer squeezed inside participant title', async () => {
  const source = await readFile(pageUrl, 'utf8');
  const titleMatch = source.match(/<span className="rec-import-title">([\s\S]*?)<\/span>/);

  assert.ok(titleMatch, 'participant title should exist');
  assert.doesNotMatch(titleMatch[1], /receipt-subrows-toggle|Показать/);
  assert.match(source, /className="receipt-subrows-strip-toggle"/);
});

test('blank strip keeps the action visible and stacks on mobile', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.receipt-subrows-strip \{[\s\S]*justify-content: space-between;/);
  assert.match(css, /\.receipt-subrows-strip-toggle \{[\s\S]*min-width: max-content;[\s\S]*flex: 0 0 auto;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.receipt-subrows-strip-toggle \{[\s\S]*width: 100%;/);
});
