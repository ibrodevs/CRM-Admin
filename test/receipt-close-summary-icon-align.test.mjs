import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
const patchUrl = new URL('../scripts/apply-receipt-close-summary.mjs', import.meta.url);

test('close import summary icons are centered inside their tiles', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const patch = await readFile(patchUrl, 'utf8');

  assert.match(css, /Close-import summary icons: center SVGs inside their tiles/);
  assert.match(css, /\.receipt-close-section-head > span,\s*\.receipt-close-file-icon \{[\s\S]*?align-items: center !important;[\s\S]*?justify-content: center !important;/);
  assert.match(css, /\.receipt-close-section-head > span > svg,\s*\.receipt-close-file-icon > svg \{[\s\S]*?align-self: center;/);

  assert.match(patch, /Close-import summary icons: center SVGs inside their tiles/);
  assert.match(patch, /align-items: center !important;/);
});
