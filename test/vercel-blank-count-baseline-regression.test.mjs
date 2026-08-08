import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('final prebuild CSS keeps receipt blank count on the text baseline', async () => {
  const css = await readFile(cssUrl, 'utf8');
  assert.match(css, /\.receipt-subrows-inline-count\s*\{[\s\S]*?align-items:\s*baseline;/);
  assert.match(css, /\.receipt-subrows-inline-count b\s*\{[\s\S]*?font-size:\s*11px;/);
});
