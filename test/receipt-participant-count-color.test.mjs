import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('receipt blank quantity is separated from participant name', async () => {
  const source = await readFile(editorUrl, 'utf8');
  assert.match(source, /className="receipt-participants-name"/);
  assert.match(source, /className="receipt-participants-count"/);
  assert.match(source, /participantCountLabel/);
});

test('receipt blank quantity uses the project accent color', async () => {
  const css = await readFile(cssUrl, 'utf8');
  assert.match(css, /\.receipt-participants-trigger > \.receipt-participants-count \{[\s\S]*color: var\(--blue\);/);
  assert.match(css, /font-weight: 800;/);
});
