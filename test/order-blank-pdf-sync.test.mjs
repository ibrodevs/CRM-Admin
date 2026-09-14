// Правка стоимости и закрытие тарифа на IT в заказе должны доходить до бланка.
//
// Рабочая PDF-копия пересобирается на сервере, но отдаётся по одному и тому же
// адресу. В реестре квитанций адрес после пересборки получал новую метку, а в
// заказе — нет: iframe показывал файл из кэша, и выглядело это так, будто
// тариф не закрывается, а новые цены не применяются.

import assert from 'node:assert/strict';
import { readFile } from './helpers/source.mjs';
import test from 'node:test';

const documentsPage = await readFile(new URL('../src/modules/documents/ui/DocumentsPage.jsx', import.meta.url), 'utf8');
const syncHook = await readFile(new URL('../src/modules/receipts/model/supplier-pdf-sync.js', import.meta.url), 'utf8');
const receiptsIndex = await readFile(new URL('../src/modules/receipts/index.js', import.meta.url), 'utf8');
const supplierPdfModel = await readFile(new URL('../src/modules/documents/model/supplier-pdf.js', import.meta.url), 'utf8');

test('хук пересборки рабочей PDF-копии доступен за пределами реестра квитанций', () => {
  assert.match(receiptsIndex, /export \{ useSupplierPdfSync \} from '\.\/model\/supplier-pdf-sync\.js'/);
  assert.match(syncHook, /preview_sync: true/);
  assert.match(syncHook, /waitForReceiptPdfJob\(correction\.job_id\)/);
  assert.match(syncHook, /if \(!\['corrected', 'source'\]\.includes\(correction\.status\)\)/);
});

test('пересборка ставится в очередь только при правках, влияющих на PDF', () => {
  assert.match(syncHook, /receiptSupplierPdfFingerprint\(file\.parsed\) === receiptSupplierPdfFingerprint\(nextParsed\)/);
  // Дебаунс: сервер не дёргается на каждый введённый символ.
  assert.match(syncHook, /SYNC_DEBOUNCE_MS = \d+/);
  assert.match(syncHook, /setTimeout\([\s\S]*?SYNC_DEBOUNCE_MS\)/);
});

test('устаревший ответ не подменяет предпросмотр', () => {
  // Оператор мог изменить бланк ещё раз, пока шёл запрос.
  assert.match(syncHook, /sequence\.current !== attempt/);
  assert.match(syncHook, /cancelSync/);
});

test('после пересборки адрес рабочей копии получает новую метку и ревизию', () => {
  assert.match(syncHook, /originalUrl: freshSupplierDocumentUrl\(documentsApi\.supplierPreviewUrl\(fileId\)\)/);
  assert.match(syncHook, /supplierPdfRevision: revision/);
  // Метка обязана быть уникальной: без неё браузер отдаст файл из кэша.
  assert.match(supplierPdfModel, /_pdf=\$\{Date\.now\(\)\}/);
});

test('редактор документов заказа подключён к живой пересборке', () => {
  assert.match(documentsPage, /useSupplierPdfSync/);
  assert.match(documentsPage, /const receiptPdfSync = useSupplierPdfSync\(setReceiptEdit, toast\)/);
  assert.match(documentsPage, /pdfSyncStatus=\{receiptPdfSync\.status\}/);
  assert.match(documentsPage, /receiptPdfSync\.syncIfSupplierPdfChanged\(receiptEdit, parsed\)/);
  assert.match(documentsPage, /receiptPdfSync\.refreshPreview\(fileId\)/);
  assert.match(documentsPage, /originalUrl: freshSupplierDocumentUrl\(documentsApi\.supplierPreviewUrl\(d\.serverId\)\)/);
});

test('редактор бланков услуги заказа подключён к живой пересборке', () => {
  assert.match(documentsPage, /const blankPdfSync = useSupplierPdfSync\(setEdit, toast\)/);
  assert.match(documentsPage, /pdfSyncStatus=\{blankPdfSync\.status\}/);
  assert.match(documentsPage, /blankPdfSync\.syncIfSupplierPdfChanged\(edit, parsed\)/);
  assert.match(documentsPage, /blankPdfSync\.refreshPreview\(fileId\)/);
  // Открытие бланка берёт свежий адрес, а не адрес из пересчитываемого списка.
  assert.match(documentsPage, /const openBlank = \(blank\) => setEdit\(blank && \{[\s\S]*?freshSupplierDocumentUrl\(blank\.originalUrl\)/);
  assert.doesNotMatch(documentsPage, /onClick=\{\(\) => setEdit\(document\)\}/);
});

test('сохранение бланка услуги обновляет открытую карточку, а не только список', () => {
  const saveBlank = documentsPage.match(/const saveBlank = async \(fileId, parsed, options = \{\}\) => \{[\s\S]*?\n  \};/)?.[0];
  assert.ok(saveBlank, 'saveBlank должен существовать');
  assert.match(saveBlank, /setEdit\(\(current\) => \(current && String\(current\.id\) === String\(fileId\)/);
  assert.match(saveBlank, /blankPdfSync\.refreshPreview\(fileId\)/);
  assert.match(saveBlank, /await reload\(\)/);
});
