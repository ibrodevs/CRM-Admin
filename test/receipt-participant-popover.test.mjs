import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('participant summary renders its expanded list through a portal', async () => {
  const source = await readFile(editorUrl, 'utf8');

  assert.match(source, /import ReactDOM from 'react-dom'/);
  assert.match(source, /const buttonRef = useRef\(null\)/);
  assert.match(source, /ReactDOM\.createPortal\(/);
  assert.match(source, /className="receipt-participant-popover"/);
  assert.match(source, /window\.addEventListener\('scroll', reposition, true\)/);
});

test('participant popover is viewport positioned and scrollable instead of clipped by table cells', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Receipt participants: portal popover prevents table clipping/);
  assert.match(css, /\.receipt-participant-popover \{[\s\S]*position: fixed;[\s\S]*z-index: 100000;[\s\S]*overflow: hidden;/);
  assert.match(css, /\.receipt-participant-popover-list \{[\s\S]*overflow-y: auto;/);
  assert.match(css, /\.receipt-participants-trigger > span \{[\s\S]*text-overflow: ellipsis;/);
});
