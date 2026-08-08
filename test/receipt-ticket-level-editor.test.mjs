import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
const packageUrl = new URL('../package.json', import.meta.url);


test('selected railway ticket drives both preview and specialized editor', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /const \[activeBlankIndex, setActiveBlankIndex\] = useState\(0\);/);
  assert.match(source, /const editingParsed = hasTicketGroup \? normalizeReceiptDraft/);
  assert.match(source, /<ReceiptDocumentPreview type=\{file\.type\} draft=\{editingParsed\} \/>/);
  assert.match(source, /<ReceiptSpecializedForm type=\{file\.type\} value=\{editingParsed\} onChange=\{commitEditingReceipt\}/);
  assert.match(source, /onSubChange=\{updateSubReceipt\}/);
  assert.match(source, /Изменения применяются только к выбранному билету/);
});


test('group total and railway financial fields are recomputed from child tickets', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /const ticketCost = sum\('ticketCost'\);/);
  assert.match(source, /const reservedSeatCost = sum\('reservedSeatCost'\);/);
  assert.match(source, /const agencyServiceFee = sum\('agencyServiceFee'\);/);
  assert.match(source, /const additionalFees = sum\('additionalFees'\);/);
  assert.match(source, /groupTickets: tickets,/);
  assert.match(source, /receiptItems: tickets,/);
  assert.match(source, /result\.receipt_items \|\| extracted\.receipt_items/);
});


test('rail editor shows real ticket identity, passenger document, place and conditions', async () => {
  const source = await readFile(editorUrl, 'utf8');

  assert.match(source, /type === 'ЖД' && source\('Номер билета', 'ticketNo'\)/);
  assert.match(source, /\(type === 'Авиа' \|\| type === 'ЖД'\) && <Field label="Документ">/);
  assert.match(source, /\(type === 'Авиа' \|\| type === 'ЖД'\) && <Field label="Номер билета">/);
  assert.match(source, /type === 'ЖД' \? 'Номер билета' : 'Бронь поставщика'/);
  assert.match(source, /const railConditionsBlock = type === 'ЖД'/);
  assert.doesNotMatch(source, /\(\(type === 'ЖД' \|\| type === 'Гостиница' \|\| type === 'Трансфер'\) \? value\.ref/);
});


test('ticket selector has dedicated responsive UI and patch runs after older receipt patches', async () => {
  const css = await readFile(cssUrl, 'utf8');
  const pkg = JSON.parse(await readFile(packageUrl, 'utf8'));

  assert.match(css, /Ticket-level editor: a grouped supplier PDF is a container, each ticket is independent/);
  assert.match(css, /\.receipt-ticket-editor-chip\.is-active/);
  for (const key of ['predev', 'prebuild', 'pretest']) {
    assert.match(pkg.scripts[key], /apply-receipt-blank-counter\.mjs && node scripts\/apply-receipt-ticket-level-editor\.mjs/);
  }
});
