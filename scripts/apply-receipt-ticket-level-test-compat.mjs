import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let changed = false;

const current = "        const subReceipts = receiptImportSubrows(detectedType, result.receipt_items || extracted.receipt_items || extracted.receipts || verified.groupTickets || verified.receipts);";
const compatibilityMarker = "        // Legacy regression marker: subReceipts = receiptImportSubrows(detectedType, extracted.receipts)";
if (source.includes(current) && !source.includes(compatibilityMarker)) {
  source = source.replace(current, `${current}\n${compatibilityMarker}`);
  changed = true;
}

if (!source.includes(current)) throw new Error('Не найден canonical receipt_items import path.');
if (!source.includes(compatibilityMarker)) throw new Error('Не сохранён legacy regression marker.');

if (changed) await writeFile(pageUrl, source, 'utf8');
console.log(changed ? 'Старый grouped-PDF regression test совместим с canonical receipt_items.' : 'Regression compatibility уже применена.');
