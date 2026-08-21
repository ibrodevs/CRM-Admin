import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const source = await readFile(pageUrl, 'utf8');

const required = [
  'function receiptImportSubrows(type, receipts, expectedCount = 0)',
  'const declaredBlankCount = Number(',
  'extracted.service_kind || verified.service_kind || draft.service_kind',
  'receiptCount: Math.max(subReceipts.length, declaredBlankCount',
  "subReceiptCount > 1 ? 'Сумма группы: ' : ''",
  'editingParsed.sourcePage || editingParsed.source_page',
  "if (duplicate) return 'Возможный дубль'",
];

const legacyRenderDefinitions = source.match(/const subReceiptCount = r\.f\.subReceipts\?\.length \|\| 0;/g) || [];
const canonicalRenderDefinitions = source.match(/const subReceiptCount = Math\.max\(/g) || [];
if (legacyRenderDefinitions.length || canonicalRenderDefinitions.length !== 1) {
  throw new Error('Канонический контракт нарушен: счётчик бланков в строке импорта определён неверно.');
}

for (const token of required) {
  if (!source.includes(token)) {
    throw new Error(`Канонический редактор групповых бланков повреждён: ${token}`);
  }
}

console.log('Канонический контракт групповых бланков подтверждён после всех legacy-патчей.');
