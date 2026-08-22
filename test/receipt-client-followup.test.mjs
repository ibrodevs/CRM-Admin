import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
const bindings = await readFile(new URL('../js/forms_unified.jsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.jsx', import.meta.url), 'utf8');
const resources = await readFile(new URL('../js/api/resources.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

test('identical rail costs can be selected across the complete import list', () => {
  assert.match(page, /function receiptRailCostSignature\(ticket\)/);
  assert.match(page, /const identicalRailPricingRows = \(sourceRow\) =>/);
  assert.match(page, /return pricingRows\.filter\(\(row\) => row\.f\.type === 'ЖД'/);
  assert.match(page, /setPricingSel\(Object\.fromEntries\(matches\.map/);
  assert.match(page, /Редактировать одинаковую стоимость \(\{identicalCostCount\}\)/);
});

test('express review marks every ready blank and leaves incomplete blanks for manual review', () => {
  assert.match(page, /const reviewAllReadyReceipts = \(\) =>/);
  assert.match(page, /receiptBlankMissingFields\(ticket, row\.f\.type\)\.length === 0/);
  assert.match(page, /reviewStatus: 'reviewed', review_status: 'reviewed', reviewed: true/);
  assert.match(page, />Проверить все<\/Button>/);
  assert.match(page, /Требуют ручной проверки/);
});

test('binding picker supports legal entities end to end', () => {
  assert.match(bindings, /company: 'Юр\. лицо'/);
  assert.match(bindings, /tab === 'company'/);
  assert.match(editor, /modes=\{\['order', 'company', 'person'\]\}/);
  assert.match(page, /modes=\{\['new', 'order', 'company', 'person'\]\}/);
  assert.match(page, /company: isCompany \? \(finalBindTarget\.company\?\.id \|\| null\) : null/);
  assert.match(app, /companies=\{workspace\.companies\}/);
});

test('registry switches between active receipts and drafts', () => {
  assert.match(page, /const \[registryView, setRegistryView\] = useState\('active'\)/);
  assert.match(page, /registryView === 'drafts' \? document\.isReceiptDraft : !document\.isReceiptDraft/);
  assert.match(page, />Рабочий список<\/button>/);
  assert.match(page, /Черновики \(\{registryDraftCount/);
});

test('parent and child rows expose sequential review progress', () => {
  assert.match(page, /Проверено \{reviewedBlankCount\} из \{subReceiptCount\}/);
  assert.match(page, /Проверено \{groupReviewCount\} из \{d\.parsed\.groupTickets\.length\}/);
  assert.match(page, /receiptBlankIsReviewed\(ticket\) \? 'Проверено' : 'Не проверено'/);
});

test('supplier PDF preview sync is polled as a background job instead of holding one request', () => {
  assert.match(resources, /export const jobsApi = \{/);
  assert.match(page, /async function waitForReceiptPdfJob\(jobId/);
  assert.match(page, /correction\.status === 'queued' && correction\.job_id/);
  assert.match(page, /correction = await waitForReceiptPdfJob\(correction\.job_id\)/);
});

test('supplier PDF sync status stays visible in the upper-right corner', () => {
  assert.match(page, /const pdfSyncNote = \(floating = false\) =>/);
  assert.match(page, /pdfSyncStatus && typeof document !== 'undefined' && ReactDOM\.createPortal\([\s\S]*pdfSyncNote\(true\),[\s\S]*document\.body/);
  assert.match(page, /role="status" aria-live="polite"/);
  assert.match(styles, /\.receipt-edit-preview-note\.is-floating\{\s*position:fixed;top:18px;right:72px;z-index:210/);
  assert.match(styles, /@media\(max-width:560px\)\{[\s\S]*\.receipt-edit-preview-note\.is-floating\{top:64px;right:12px/);
});

test('receipt editor keeps the avia IT fare action permanently visible', () => {
  assert.match(editor, /const aviaItFareControl = type === 'Авиа'/);
  assert.match(editor, /<b[^>]*>Закрыть тариф на IT<\/b>/);
  assert.match(editor, /В клиентской квитанции вместо суммы тарифа будет показано «IT»/);
  assert.match(editor, /enabled \? 'it' : 'total'/);
  assert.match(editor, /\{aviaItFareControl\}[\s\S]*\{bindingBlock\}/);
  assert.match(editor, /receiptUsesItFare\(p\) \? 'IT включён' : 'Тариф открыт'/);
});
