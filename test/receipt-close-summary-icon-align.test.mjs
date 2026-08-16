import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
const patchUrl = new URL('../scripts/apply-receipt-close-summary.mjs', import.meta.url);
const rowPatchUrl = new URL('../scripts/apply-receipt-close-summary-row-align.mjs', import.meta.url);
const packageUrl = new URL('../package.json', import.meta.url);

test('close import summary icons and their tiles are vertically centered against complete rows', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const patch = await readFile(patchUrl, 'utf8');
  const rowPatch = await readFile(rowPatchUrl, 'utf8');
  const pkg = JSON.parse(await readFile(packageUrl, 'utf8'));

  assert.match(css, /Close-import summary icons: center SVGs inside their tiles/);
  assert.match(css, /\.receipt-close-section-head > span,\s*\.receipt-close-file-icon \{[\s\S]*?align-items: center !important;[\s\S]*?justify-content: center !important;/);
  assert.match(css, /\.receipt-close-section-head > span > svg,\s*\.receipt-close-file-icon > svg \{[\s\S]*?align-self: center;/);

  assert.match(css, /Close-import rows: align icon tiles to the complete text block, not its first baseline/);
  assert.match(css, /\.receipt-close-section-head,\s*\.receipt-close-file \{\s*align-items: center !important;/);
  assert.match(css, /\.receipt-close-file-icon,\s*\.receipt-close-file-index,[\s\S]*?align-self: center;/);

  assert.match(patch, /Close-import summary icons: center SVGs inside their tiles/);
  assert.match(rowPatch, /align icon tiles to the complete text block, not its first baseline/);
  assert.match(rowPatch, /align-items: center !important;/);

  for (const key of ['predev', 'prebuild', 'pretest']) {
    assert.match(pkg.scripts[key], /apply-receipt-close-summary-row-align\.mjs/);
  }
});
