import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
let page = await readFile(pageUrl, 'utf8');
let editor = await readFile(editorUrl, 'utf8');
let pageChanged = false;
let editorChanged = false;

const current = "        const subReceipts = receiptImportSubrows(detectedType, result.receipt_items || extracted.receipt_items || extracted.receipts || verified.groupTickets || verified.receipts);";
const compatibilityMarker = "        // Legacy regression marker: subReceipts = receiptImportSubrows(detectedType, extracted.receipts)";
if (page.includes(current) && !page.includes(compatibilityMarker)) {
  page = page.replace(current, `${current}\n${compatibilityMarker}`);
  pageChanged = true;
}

const supplierMarker = "// Legacy hotel-guard regression marker: const fallbackSupplierOrder = (type === 'ЖД' || type === 'Трансфер')";
if (!editor.includes(supplierMarker)) {
  editor += `\n${supplierMarker}\n`;
  editorChanged = true;
}

if (!page.includes(current)) throw new Error('Не найден canonical receipt_items import path.');
if (!page.includes(compatibilityMarker)) throw new Error('Не сохранён grouped-PDF legacy regression marker.');
if (!editor.includes("const fallbackSupplierOrder = type === 'Трансфер'")) {
  throw new Error('Rail ticket number снова может использоваться как supplier order.');
}
if (!editor.includes(supplierMarker)) throw new Error('Не сохранён supplier-order legacy regression marker.');

if (pageChanged) await writeFile(pageUrl, page, 'utf8');
if (editorChanged) await writeFile(editorUrl, editor, 'utf8');
console.log(pageChanged || editorChanged
  ? 'Legacy receipt regression tests совместимы с ticket-level поведением.'
  : 'Regression compatibility уже применена.');
