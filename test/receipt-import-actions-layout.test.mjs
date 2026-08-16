import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
const scriptUrl = new URL('../scripts/apply-receipt-import-actions-layout.mjs', import.meta.url);

test('receipt import actions wrap before reaching the delete column', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const script = await readFile(scriptUrl, 'utf8');

  assert.match(css, /Receipt import operations: never overlap the delete action/);
  assert.match(css, /\.rec-import-actions \{[\s\S]*?flex-wrap: wrap !important;/);
  assert.match(css, /\.rec-import-table td:last-child \{[\s\S]*?min-width: 48px;/);
  assert.match(css, /\.rec-import-remove \{[\s\S]*?flex: 0 0 34px;/);

  assert.match(script, /Receipt import operations: never overlap the delete action/);
  assert.match(script, /flex-wrap: wrap !important/);
});
