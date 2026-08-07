import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('available receipt blanks live inside the document cell, not a detached table row', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /receipt-subrows-inline/);
  assert.match(source, /receipt-subrows-inline-info/);
  assert.match(source, /receipt-subrows-inline-toggle/);
  assert.match(source, /subPassengerCount/);
  assert.match(source, /subRouteCount/);
  assert.doesNotMatch(source, /<tr className=\{'receipt-subrows-strip-row'/);
});

test('blank toggle is not squeezed inside participant title', async () => {
  const source = await readFile(pageUrl, 'utf8');
  const titleMatch = source.match(/<span className="rec-import-title">([\s\S]*?)<\/span>/);

  assert.ok(titleMatch, 'participant title should exist');
  assert.doesNotMatch(titleMatch[1], /receipt-subrows-inline-toggle|Показать/);
  assert.match(source, /className="receipt-subrows-inline-toggle"/);
});

test('integrated blank control is visually part of the document block', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Receipt import: blanks integrated inside the document cell/);
  assert.match(css, /\.receipt-subrows-inline \{[\s\S]*border-top: 1px solid #edf1f6;[\s\S]*display: flex;/);
  assert.match(css, /\.receipt-subrows-inline-toggle \{[\s\S]*border: 0;[\s\S]*background: transparent;/);
  assert.match(css, /\.receipt-subrows-strip-row \{[\s\S]*display: none !important;/);
});
