import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
const packageUrl = new URL('../package.json', import.meta.url);


test('receipt import mode icon tiles are centered against the full text block', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const pkg = JSON.parse(await readFile(packageUrl, 'utf8'));

  assert.match(css, /Receipt import mode: icon tiles align to the full two-line text block/);
  assert.match(css, /\.receipt-import-mode-options button \{\s*align-items: center !important;/);
  assert.match(css, /\.receipt-import-mode-options button > span \{[\s\S]*?align-self: center;[\s\S]*?place-items: center;[\s\S]*?line-height: 0;/);
  assert.match(css, /\.receipt-import-mode-options button > span svg \{\s*display: block;/);

  for (const scriptName of ['predev', 'prebuild', 'pretest']) {
    assert.match(pkg.scripts[scriptName], /apply-receipt-import-mode-icon-align\.mjs/);
  }
});
