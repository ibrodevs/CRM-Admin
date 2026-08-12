import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const resources = await readFile(new URL('../js/api/resources.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const prerequisitePatch = await readFile(new URL('../scripts/apply-receipt-client-pdf-requirements.mjs', import.meta.url), 'utf8');
const correctedPatch = await readFile(new URL('../scripts/apply-receipt-corrected-supplier-pdf.mjs', import.meta.url), 'utf8');

test('API exposes corrected supplier PDF and immutable source separately', () => {
  assert.match(resources, /supplierPreviewUrl:[\s\S]*?supplier-pdf\/\?disposition=inline/);
  assert.match(resources, /supplierSourcePreviewUrl:[\s\S]*?supplier-pdf\/\?source=1&disposition=inline/);
});

test('receipt registry and importer use corrected supplier PDF by default', () => {
  assert.match(page, /documentsApi\.supplierPreviewUrl/);
  assert.match(page, /documentsApi\.supplierSourcePreviewUrl/);
  assert.match(page, /sourceOriginalUrl/);
  assert.match(page, /Оригинал с правками/);
  assert.match(page, /Исходный/);
  assert.match(page, /supplier_pdf_correction/);
});

test('supplier preview explains corrected copy and keeps source available', () => {
  assert.match(editor, /ReceiptBrandDocumentDrawer\(\{ open, type, draft, originalUrl, sourceOriginalUrl, onClose \}\)/);
  assert.match(editor, /Оригинал поставщика · с сохранёнными корректировками/);
  assert.match(editor, /встроенного шрифта и исходной верстки/);
  assert.match(editor, /Открыть оригинал с правками/);
  assert.match(editor, /Исходный оригинал/);
  assert.doesNotMatch(editor, /Изменения из редактора применяются только к бланку агентства и не изменяют этот файл/);
});

test('corrected supplier patch is always the final receipt build patch', () => {
  for (const key of ['predev', 'prebuild', 'pretest']) {
    assert.match(pkg.scripts[key], /apply-receipt-sequential-review-compat\.mjs && node scripts\/apply-receipt-corrected-supplier-pdf\.mjs/);
  }
});

test('receipt PDF build patches remain safe on repeated builds', () => {
  assert.match(prerequisitePatch, /const correctedSupplierReady =/);
  assert.match(prerequisitePatch, /if \(!correctedSupplierReady\)/);
  assert.match(correctedPatch, /page\.includes\('\>Оригинал с правками<\/Button>'\)/);
  assert.match(correctedPatch, /editor\.includes\('footer={<div className="receipt-supplier-footer-actions">'\)/);
});
