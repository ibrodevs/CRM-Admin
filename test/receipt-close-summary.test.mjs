import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('receipt import close drawer contains a structured file summary', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /className="receipt-close-summary"/);
  assert.match(source, /Бланки в текущем импорте/);
  assert.match(source, /rows\.map\(\(row, index\)/);
  assert.match(source, /Сохранится в черновик/);
  assert.match(source, /Что сохранится в черновике/);
  assert.doesNotMatch(source, /Загружено файлов: \{files\.length\}\. Можно сохранить текущую проверку/);
});

test('receipt close actions and rows have responsive styles', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.receipt-close-files\s*\{/);
  assert.match(css, /\.receipt-close-file\s*\{/);
  assert.match(css, /\.receipt-close-actions\s*\{/);
  assert.match(css, /grid-template-columns:\s*minmax\(140px/);
  assert.match(css, /@media \(max-width: 520px\)/);
});
