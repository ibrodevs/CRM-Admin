import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('unresolved receipt uses review state instead of terminal error', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /displayStatus = r\.status === 'Ошибка' && p\?\.recognitionPending \? 'Требует проверки'/);
  assert.match(source, /Проверить и заполнить/);
});

test('missing source amount is never rendered as a real zero', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /Стоимость не распознана/);
  assert.match(source, /recHasSourceAmount\(p\)[\s\S]*recMoney\(clientTotal\(m\), p\.currency\)/);
});

test('available blanks strip fills the complete table width', async () => {
  const css = await readFile(cssUrl, 'utf8');
  assert.match(css, /\.rec-import-table \.receipt-subrows-strip-row > td[\s\S]*width: 100% !important;/);
  assert.match(css, /\.rec-import-table \.receipt-subrows-strip[\s\S]*width: 100% !important;/);
  assert.match(css, /box-sizing: border-box !important;/);
});
