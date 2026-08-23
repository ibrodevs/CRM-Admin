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
  assert.match(page, /после сохранения сумма сразу переносится в рабочую копию PDF/);
  assert.match(page, /queueWorkingPdfSync\(fileId/);
  assert.match(page, /pdfSync\[r\.f\.id\] === 'saving'[\s\S]*PDF обновляется/);
  assert.doesNotMatch(page, /v1 поставщика не меняется/);
});

test('registry group price edits sync every changed child before sequential review completes', () => {
  assert.match(page, /function receiptFinancialFingerprint\(receipt\)/);
  assert.match(page, /tickets: Array\.isArray\(group\) && group\.length > 1 \? group\.map\(financial\) : \[\]/);
  assert.match(page, /const financialChanged = activeEdit[\s\S]*receiptFinancialFingerprint\(activeEdit\.parsed\) !== receiptFinancialFingerprint\(parsed\)/);
  assert.match(page, /queueRegistrySupplierPdfSync\(activeEdit\.serverId, parsed\)/);
  assert.match(page, /preview_sync: true/);
  assert.match(page, /if \(correction\.status !== 'corrected'\)/);
  assert.match(page, /pdfSyncStatus=\{edit \? registryPdfSync\[edit\.serverId \|\| edit\.id\] : ''\}/);

  const helperSource = page.match(/function receiptFinancialFingerprint\(receipt\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(helperSource, 'receiptFinancialFingerprint helper must exist');
  const fingerprint = Function(`${helperSource}; return receiptFinancialFingerprint;`)();
  const before = {
    total: '8308.20',
    groupTickets: [
      { ticketCost: '2217.10', reservedSeatCost: '1937.00', total: '4154.10' },
      { ticketCost: '2217.10', reservedSeatCost: '1937.00', total: '4154.10' },
    ],
  };
  const normalized = structuredClone(before);
  normalized.groupTickets[0].ticketCost = 2217.1;
  assert.equal(fingerprint(before), fingerprint(normalized), 'JSON number normalization is not a price edit');
  const changed = structuredClone(before);
  changed.groupTickets[0].ticketCost = '2318.11';
  changed.groupTickets[0].total = '4255.11';
  assert.notEqual(fingerprint(before), fingerprint(changed), 'one changed child must trigger PDF sync');
});

test('direct grouped-ticket edits replace stale pricing state before PDF sync', () => {
  assert.match(page, /const syncEditorMath = \(mathKey, receipt\) => \{/);
  assert.match(page, /tariff: supplierNet\(receipt\)/);
  assert.match(page, /fee: Math\.round\(\(Number\(receipt\?\.fees\) \|\| 0\) \* 100\) \/ 100/);
  assert.match(page, /mathStateRef\.current = next;[\s\S]*setMath\(next\)/);
  assert.match(page, /syncEditorMath\(subReceiptMathKey\(fileId, subIndex\), editedChild\)/);
  assert.match(page, /filesStateRef\.current = next;[\s\S]*queueWorkingPdfSync\(fileId, \{ mode: 'review' \}\)/);
});

test('supplier preview explains corrected copy and keeps source available', () => {
  assert.match(editor, /ReceiptBrandDocumentDrawer\(\{ open, type, draft, originalUrl, sourceOriginalUrl, onClose \}\)/);
  assert.match(editor, /Оригинал поставщика · с сохранёнными корректировками/);
  assert.match(editor, /встроенного шрифта и исходной верстки/);
  assert.match(editor, /Оригинал поставщика с корректировками/);
  assert.match(editor, /Исходный файл поставщика/);
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
