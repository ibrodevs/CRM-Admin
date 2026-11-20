import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from './helpers/source.mjs';

const pageUrl = new URL('../src/modules/receipts/ui/ReceiptEditorPage.jsx', import.meta.url);
const cssUrl = new URL('../src/styles/modules/receipt-ui-fixes.css', import.meta.url);

test('receipt import uses the shared compact decision and excludes unfinished files from saving', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /<DraftCloseDialog open=\{confirmClose\}/);
  assert.match(source, /onSave=\{saveDraftAndClose\}/);
  assert.match(source, /saveDisabled=\{processing \|\| !files.some/);
  assert.match(source, /file.status === 'done' && file.importId/);
  assert.doesNotMatch(source, /className="receipt-close-overview"/);
});

test('receipt close actions and rows have responsive styles', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.receipt-close-files\s*\{/);
  assert.match(css, /\.receipt-close-file\s*\{/);
  assert.match(css, /\.receipt-close-actions\s*\{/);
  assert.match(css, /grid-template-columns:\s*minmax\(140px/);
  assert.match(css, /@media \(max-width: 520px\)/);
});
