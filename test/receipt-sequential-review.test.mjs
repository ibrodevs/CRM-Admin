import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/receipt-ui-fixes.css', import.meta.url), 'utf8');


test('grouped railway receipts are reviewed as a sequential wizard', () => {
  assert.match(page, /function receiptBlankIsReviewed\(ticket\)/);
  assert.match(page, /function receiptGroupNeedsSequentialReview\(file\)/);
  assert.match(page, /const firstUnreviewed = tickets\.findIndex/);
  assert.match(page, /Последовательная проверка бланков/);
  assert.match(page, /Сохранить и далее/);
  assert.match(page, /Сохранить и завершить проверку/);
  assert.match(page, /setActiveBlankIndex\(safeBlankIndex \+ 1\)/);
});


test('each child ticket gets its own reviewed state before the parent can finish', () => {
  assert.match(page, /reviewStatus: 'reviewed'/);
  assert.match(page, /reviewedAt = new Date\(\)\.toISOString\(\)/);
  assert.match(page, /receiptGroupNeedsSequentialReview\(r\.f\)/);
  assert.match(page, /Проверить бланки по очереди/);
  assert.match(page, /receiptBlankIsReviewed\(subReceipt\) \? 'Проверено' : 'Не проверено'/);

  const updateBlock = page.match(/const updateSubReceipt = \(fileId, subIndex, parsed\) => \{[\s\S]*?\n  \};\n  const markReviewed/);
  assert.ok(updateBlock, 'updateSubReceipt block must exist');
  assert.doesNotMatch(updateBlock[0], /setReviewed\(\(cur\)/);
});


test('sequential review validates critical ticket data and shows progress', () => {
  for (const field of ['ФИО пассажира', 'номер билета', 'маршрут', 'номер поезда', 'стоимость билета']) {
    assert.match(page, new RegExp(field));
  }
  assert.match(page, /role="progressbar"/);
  assert.match(styles, /\.receipt-sequential-review/);
  assert.match(styles, /\.receipt-sequential-progress/);
  assert.match(styles, /\.receipt-sequential-steps/);
  assert.match(styles, /\.receipt-sequential-validation/);
});


test('similar avia and rail files support explicit grouped or ordinary intake', () => {
  assert.match(page, /function receiptSimilaritySignature\(file\)/);
  assert.match(page, /function receiptDetectedGroups\(files, importMode = 'auto'\)/);
  assert.match(page, /Определить автоматически/);
  assert.match(page, /Групповое редактирование/);
  assert.match(page, /Обычное редактирование/);
  assert.match(page, /Применять общие исправления ко всей группе/);
  assert.match(page, /receiptSharedGroupPatch\(source\.type, parsed\)/);
  assert.match(page, /ФИО, документы, номера билетов и стоимость отдельных ЖД-билетов не смешиваются/);
  assert.match(styles, /\.receipt-import-mode-options/);
  assert.match(styles, /\.receipt-similar-group-banner/);
});


test('opposite avia routes are one sequential group but keep individual routes', () => {
  assert.match(page, /passengerMatches && aFrom && aTo && aFrom === bTo && aTo === bFrom/);
  assert.match(page, /continueSequential: hasNextGroupBlank/);
  assert.match(page, /if \(nextId\) setEditId\(nextId\)/);
  assert.match(page, /if \(!sameDirection\) delete targetPatch\.legs/);
  assert.match(page, /Последовательная проверка: бланк \{groupInfo\.position\} из \{groupInfo\.count\}/);
});


test('correction control stays visible while a long receipt form scrolls', () => {
  assert.match(styles, /\.receipt-editor-form > \.receipt-source-notice \{ position: sticky; top: 0;/);
});


test('multi-page aviation groups use one confirmation and preserve individual tickets', () => {
  assert.match(page, /!\['Авиа', 'ЖД'\]\.includes\(file\.type\)/);
  assert.match(page, /const isAviaTicketGroup = file\.type === 'Авиа' && hasTicketGroup/);
  assert.match(page, /const saveAviaGroup = async/);
  assert.match(page, /Проверить и применить к \{groupTickets\.length\} бланкам/);
  assert.match(page, /Применить общие исправления к/);
  assert.match(page, /'Да, применить и далее' : 'Да, применить и завершить'/);
  assert.match(page, /Индивидуальные данные пассажиров сохранятся/);
  assert.match(page, /aggregateReceiptSubrows\(parent, subReceipts, receiptType = 'ЖД'\)/);
});


test('group corrections update child blank cards and the supplier-PDF save payload', () => {
  const updateBlock = page.match(/const updateParsed = \(id, parsed, options = \{\}\) => \{[\s\S]*?\n  \};\n  const updateSubReceipt/);
  assert.ok(updateBlock, 'updateParsed block must exist');
  assert.match(updateBlock[0], /normalized\.groupTickets\?\.length > 1/);
  assert.match(updateBlock[0], /return \{ \.\.\.file, parsed: normalized, subReceipts \}/);
  assert.match(updateBlock[0], /targetSubReceipts\.length/);
  assert.match(updateBlock[0], /parsed: aggregateReceiptSubrows\(targetParent, targetSubReceipts, file\.type\)/);

  assert.match(page, /function receiptWithPricing\(type, receipt, pricing\)/);
  assert.match(page, /const verifiedReceiptForSave = \(file\) =>/);
  assert.match(page, /verified_data: verifiedForSave/);
  assert.match(page, /const p = verifiedReceiptForSaveWithMath\(r\.f, mathStateRef\.current\)/);
});


test('single rail receipt keeps visible parent prices as the PDF sync source', () => {
  assert.match(page, /function receiptHasMultipleSubReceipts\(file\)/);
  assert.match(page, /file\.subReceipts\.length > 1/);

  const updateBlock = page.match(/const updateParsed = \(id, parsed, options = \{\}\) => \{[\s\S]*?\n  \};\n  const updateSubReceipt/);
  assert.ok(updateBlock, 'updateParsed block must exist');
  assert.match(updateBlock[0], /compatibility `receipts: \[ticket\]` value is not a real group/);
  assert.match(updateBlock[0], /receiptHasMultipleSubReceipts\(file\) \? file\.subReceipts : \[\]/);

  const saveBlock = page.match(/const verifiedReceiptForSaveWithMath = \(file, mathState\) => \{[\s\S]*?\n  \};\n  const verifiedReceiptForSave/);
  assert.ok(saveBlock, 'verifiedReceiptForSaveWithMath block must exist');
  assert.match(saveBlock[0], /if \(!receiptHasMultipleSubReceipts\(file\)\)/);
  assert.match(saveBlock[0], /receiptWithPricing\(file\.type, parent, mathForFileWithState\(file, mathState\)\)/);

  const helperSource = page.match(/function receiptHasMultipleSubReceipts\(file\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(helperSource, 'receiptHasMultipleSubReceipts helper must exist');
  const hasMultiple = Function(`${helperSource}; return receiptHasMultipleSubReceipts;`)();
  assert.equal(hasMultiple({ subReceipts: [{ total: 1225.6 }] }), false);
  assert.equal(hasMultiple({ subReceipts: [{ total: 100 }, { total: 200 }] }), true);
  assert.match(updateBlock[0], /filesStateRef\.current = next/);
});


test('thirty blanks are selected in a vertical grid without horizontal scrolling', () => {
  assert.match(styles, /\.receipt-ticket-editor-scroll \{[\s\S]*display: grid;[\s\S]*overflow-x: clip;[\s\S]*overflow-y: auto;/);
  assert.match(styles, /\.receipt-sequential-steps \{ display:grid;[\s\S]*overflow-x:hidden; overflow-y:auto;/);
  assert.doesNotMatch(styles, /\.receipt-ticket-editor-scroll \{[\s\S]{0,180}overflow-x: auto;/);
});

test('active ticket stays visible and ticket status icons remain centered', () => {
  assert.match(page, /ticketGridRef\.current\?\.querySelector/);
  assert.match(page, /scrollIntoView\(\{ block: 'nearest', inline: 'nearest', behavior: 'smooth' \}\)/);
  assert.match(page, /data-ticket-index=\{index\}/);
  assert.match(styles, /\.receipt-ticket-editor-index \{[\s\S]*place-items: center/);
  assert.match(styles, /\.receipt-sequential-steps button > span \{[\s\S]*place-items:center/);
  assert.match(styles, /\.receipt-ticket-editor-scroll > \.receipt-ticket-editor-chip \{[\s\S]*align-items: center !important/);
  assert.match(styles, /\.receipt-ticket-editor-chip > \.receipt-ticket-editor-index \{[\s\S]*align-self: center !important;[\s\S]*margin-block: auto/);
});


test('rail editor defaults to supplier PDF and exposes corrected live view', () => {
  assert.match(page, /setEditPreviewMode\(file\?\.type === 'ЖД' && file\?\.originalUrl \? 'supplier' : 'corrected'\)/);
  assert.match(page, />Бланк поставщика<\/button>/);
  assert.match(page, />С корректировками<\/button>/);
  assert.match(page, /receipt-edit-supplier-frame/);
  assert.match(page, /после изменения стоимости эта рабочая PDF-копия обновится автоматически/i);
  assert.match(page, /supplierDocumentPageUrl\(file\.originalUrl, supplierPageNumber\)/);
  assert.match(page, /receiptPage \|\| editingParsed\.receipt_page/);
  assert.match(page, /receiptIndex \|\| editingParsed\.receipt_index/);
  assert.match(page, /_receipt_page=\$\{normalizedPage\}#page=\$\{normalizedPage\}/);
  assert.match(page, /const supplierPreviewKey = `\$\{file\.id \|\| file\.originalUrl \|\| 'supplier'\}-page-\$\{supplierPageNumber\}-revision-\$\{file\.supplierPdfRevision \|\| 0\}`/);
  assert.match(page, /key=\{`\$\{supplierPreviewKey\}-inline`\}/);
  assert.match(page, /key=\{`\$\{supplierPreviewKey\}-expanded`\}/);
  assert.match(page, /Развёрнутый бланк поставщика · страница \$\{supplierPageNumber\}/);
});


test('price edits refresh the supplier PDF during review and pricing step', () => {
  assert.match(page, /const clientAmount = round\(tariffAndTaxes \+ fees \+ Number\(pricing\?\.markup \|\| 0\)\)/);
  assert.match(page, /total: clientAmount/);
  assert.match(page, /queueWorkingPdfSync\(fileId, \{ mode: 'review' \}\)/);
  assert.match(page, /safeTargets\.map\(\(row\) => String\(row\.mathKey\)\.split\('::blank::'\)\[0\]\)[\s\S]*syncPricingSnapshots\(next, affectedFileIds, \{ announce: safeTargets\.length === 1, delay: 0 \}\)/);
  assert.match(page, /queueWorkingPdfSync\(fileId, \{\n\s+mode: 'pricing', delay, announce,/);
  assert.match(page, /documentsApi\.updateReceipt\(sourceDocumentId, \{/);
  assert.match(page, /const verifiedData = submittedSnapshot[\s\S]*mode === 'pricing'[\s\S]*verifiedReceiptForSaveWithMath\(file, mathStateRef\.current\)[\s\S]*verifiedReceiptForReview\(file\)/);
  assert.match(page, /draft: true,[\s\S]*verified_data: verifiedData,[\s\S]*preview_sync: true/);
  assert.match(page, /freshSupplierDocumentUrl\(documentsApi\.supplierPreviewUrl\(sourceDocumentId\)\)/);
  assert.match(page, /supplierPdfRevision: revision/);
  assert.match(page, /const previous = pdfSyncChains\.current\[fileId\] \|\| Promise\.resolve\(\)/);
  assert.match(page, /PDF обновлён/);
});


test('desktop operation actions stay on one line', () => {
  assert.match(styles, /@media \(min-width: 901px\) \{[\s\S]*\.rec-import-actions \{ flex-wrap:nowrap;/);
  assert.match(page, /<th style=\{\{ width: 420 \}\}>Операции<\/th>/);
});
