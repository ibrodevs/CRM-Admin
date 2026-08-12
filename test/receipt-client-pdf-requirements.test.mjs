import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const resourcesUrl = new URL('../js/api/resources.js', import.meta.url);
const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);


test('supplier working original and immutable source open separately inline', async () => {
  const resources = await readFile(resourcesUrl, 'utf8');
  const page = await readFile(pageUrl, 'utf8');
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(resources, /supplierPreviewUrl: \(id\) => apiPath\(`documents\/\$\{id\}\/supplier-pdf\/\?disposition=inline`\)/);
  assert.match(resources, /supplierSourcePreviewUrl: \(id\) => apiPath\(`documents\/\$\{id\}\/supplier-pdf\/\?source=1&disposition=inline`\)/);
  assert.match(page, /documentsApi\.supplierPreviewUrl\(result\.source_document_id \|\| imported\.document_id\)/);
  assert.match(page, /documentsApi\.supplierSourcePreviewUrl\(result\.source_document_id \|\| imported\.document_id\)/);
  assert.match(editor, /<iframe className="receipt-supplier-original-frame" src=\{displayedSupplierPdfUrl\} title="Оригинал поставщика с правками"/);
  assert.match(editor, /freshSupplierPdfUrl\(sourcePdfUrl\)/);
  assert.match(editor, /supplierPdfNonce/);
  assert.match(page, /freshSupplierDocumentUrl\(d\.originalUrl\)/);
  assert.match(editor, /Оригинал поставщика · с сохранёнными корректировками/);
  assert.match(editor, /Открыть оригинал с правками/);
  assert.match(editor, /Исходный оригинал/);
});


test('corrected agency receipt and corrected supplier copy still keep source immutable', async () => {
  const editor = await readFile(editorUrl, 'utf8');

  assert.match(editor, /output\.mode === 'original' \? \(/);
  assert.match(editor, /\) : type === 'Авиа' \? \(\s*<ReceiptAviaDocument draft=\{p\} organization=\{organization\} \/>/s);
  assert.match(editor, /Загруженный оригинал хранится отдельно без изменений/);
  assert.match(editor, /sourceOriginalPdfUrl/);
  assert.match(editor, /const taxRows = p\.taxBreakdown\?\.length \? p\.taxBreakdown/);
});


test('long receipt preview scrolls completely above the drawer footer', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /Client receipt PDF requirements: complete preview scroll and immutable original/);
  assert.match(css, /\.receipt-edit-preview \{[\s\S]*max-height: calc\(100dvh - 250px\);[\s\S]*overflow-y: auto;[\s\S]*padding: 0 5px 96px 0;/);
  assert.match(css, /\.receipt-supplier-original-frame \{[\s\S]*height: min\(70dvh, 900px\);/);
});


test('corrected supplier PDF footer actions stay inside drawer at every width', async () => {
  const editor = await readFile(editorUrl, 'utf8');
  const css = await readFile(cssUrl, 'utf8');

  assert.match(editor, /footer=\{<div className="receipt-supplier-footer-actions">/);
  assert.match(editor, /receipt-supplier-footer-actions[\s\S]*Открыть оригинал с правками[\s\S]*Исходный оригинал/);
  assert.match(css, /Corrected supplier PDF: footer actions must stay inside drawer/);
  assert.match(css, /\.receipt-supplier-footer-actions \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.receipt-supplier-footer-actions > \.btn \{[\s\S]*min-width: 0;[\s\S]*white-space: normal;[\s\S]*overflow-wrap: anywhere;/);
  assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*\.receipt-supplier-footer-actions \{[\s\S]*grid-template-columns: 1fr;/);
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
