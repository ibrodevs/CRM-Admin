import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const resourcesUrl = new URL('../js/api/resources.js', import.meta.url);
const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);


test('supplier original always opens immutable version 1 inline', async () => {
  const resources = await readFile(resourcesUrl, 'utf8');
  const page = await readFile(pageUrl, 'utf8');
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(resources, /originalPreviewUrl: \(id\) => apiPath\(`documents\/\$\{id\}\/download\/\?file_version=1&disposition=inline`\)/);
  assert.match(page, /documentsApi\.originalPreviewUrl\(result\.source_document_id \|\| imported\.document_id\)/);
  assert.match(editor, /<iframe className="receipt-supplier-original-frame" src=\{sourcePdfUrl\} title="Оригинал поставщика"/);
  assert.match(editor, /Оригинал поставщика · без корректировок/);
  assert.match(editor, /Открыть оригинал в новой вкладке/);
  assert.doesNotMatch(editor, /Авиа-бланк' : 'Авиа-бланк'\} с сохранёнными корректировками/);
});


test('corrected agency receipt stays separate from the supplier original', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /output\.mode === 'original' \? \(/);
  assert.match(editor, /\) : type === 'Авиа' \? \(\s*<ReceiptAviaDocument draft=\{p\} organization=\{organization\} \/>/s);
  assert.match(editor, /Изменения из редактора применяются только к бланку агентства и не изменяют этот файл/);
  assert.match(editor, /const taxRows = p\.taxBreakdown\?\.length \? p\.taxBreakdown/);
});


test('long receipt preview scrolls completely above the drawer footer', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Client receipt PDF requirements: complete preview scroll and immutable original/);
  assert.match(css, /\.receipt-edit-preview \{[\s\S]*max-height: calc\(100dvh - 250px\);[\s\S]*overflow-y: auto;[\s\S]*padding: 0 5px 96px 0;/);
  assert.match(css, /\.receipt-supplier-original-frame \{[\s\S]*height: min\(70dvh, 900px\);/);
});


test('rail grouped total is explicitly a group summary, child totals stay independent', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /Итого по \{tickets\.length\} бланкам/);
  assert.match(editor, /Бланк \{activeIndex \+ 1\} из \{tickets\.length\} · данные и стоимость только этого билета/);
  assert.match(editor, /total: receiptFinancialTotal\('ЖД', ticket\)/);
  assert.match(editor, /<ReceiptDocumentPreview type="ЖД" draft=\{active\} \/>/);
});


test('hotel receipt UI uses structured hotel and room fields rather than a raw OCR blob', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /p\.hotel\?\.name \|\| p\.carrier/);
  assert.match(editor, /p\.hotel\?\.address/);
  assert.match(editor, /room\.category \|\| room\.name/);
  assert.match(editor, /room\.meal/);
  assert.match(editor, /room\.guestIds/);
  assert.match(editor, /p\.hotelTerms\.deposit/);
});
