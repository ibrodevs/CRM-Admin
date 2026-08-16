import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
const patchUrl = new URL('../scripts/apply-receipt-import-actions-layout.mjs', import.meta.url);

test('sequential review action label wraps fully inside operations column', async () => {
  const page = await readFile(pageUrl, 'utf8');
  const css = await readFile(cssUrl, 'utf8');
  const patch = await readFile(patchUrl, 'utf8');

  assert.match(page, /Проверить бланки по очереди/);
  assert.match(css, /Receipt import operations: long actions wrap without clipping/);
  assert.match(css, /\.rec-import-actions \{\s*overflow: visible !important;/);
  assert.match(css, /\.rec-import-actions \.btn \{[\s\S]*?height: auto !important;[\s\S]*?white-space: normal !important;[\s\S]*?overflow: visible !important;[\s\S]*?text-overflow: clip !important;/);

  assert.match(patch, /Проверить бланки по очереди/);
  assert.match(patch, /long actions wrap without clipping/);
  assert.match(patch, /white-space: normal !important;/);
});
