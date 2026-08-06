import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

test('backend receipts normalise into separate rail blanks', async () => {
  const source = await readFile(editorUrl, 'utf8');

  assert.match(source, /const rawGroupTickets = \[value\.groupTickets, value\.receipts, value\.railTickets\]/);
  assert.match(source, /draft\.groupTickets = rawGroupTickets\.map/);
  assert.match(source, /receiptIndex: ticket\.receiptIndex \|\| ticket\.receipt_index \|\| index \+ 1/);
});

test('rail preview has a separate blank strip and per-ticket price', async () => {
  const source = await readFile(editorUrl, 'utf8');

  assert.match(source, /function ReceiptRailMultiBlankPreview\(/);
  assert.match(source, /Доступные бланки/);
  assert.match(source, /Билет № \{item\.ticketNo\}/);
  assert.match(source, /item\.trip \|\| 'Место не распознано'/);
  assert.match(source, /данные и стоимость только этого билета/);
  assert.match(source, /<ReceiptDocumentPreview type="ЖД" draft=\{active\}/);
});

test('hotel preview displays each room with its assigned guest', async () => {
  const source = await readFile(editorUrl, 'utf8');

  assert.match(source, /function ReceiptHotelDocumentPreview\(/);
  assert.match(source, /Размещение по гостям/);
  assert.match(source, /room\.guestIds\?\.length/);
  assert.match(source, /room\.checkInDate \|\| stay\.date/);
  assert.match(source, /room\.checkOutDate \|\| stay\.endDate/);
});

test('expand button cannot be squeezed by blank information', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /\.receipt-edit-preview-head > button \{[\s\S]*flex: 0 0 auto !important;[\s\S]*white-space: nowrap;/);
  assert.match(css, /\.receipt-blank-strip \{/);
  assert.match(css, /\.receipt-blank-strip-scroll \{/);
});
