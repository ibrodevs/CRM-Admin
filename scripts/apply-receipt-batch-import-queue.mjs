import { readFile, writeFile } from 'node:fs/promises';

const fulfillmentUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const resourcesUrl = new URL('../js/api/resources.js', import.meta.url);

let fulfillment = await readFile(fulfillmentUrl, 'utf8');
let resources = await readFile(resourcesUrl, 'utf8');
let changed = false;

const constantsMarker = "const RECEIPT_IMPORT_DRAFT_KEY = 'travelhub.receipt-import-draft.v1';";
const constantsPatch = `${constantsMarker}\nconst RECEIPT_IMPORT_CONCURRENCY = 2;\nconst RECEIPT_IMPORT_MAX_ATTEMPTS = 3;\n\nconst receiptImportSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\n\nasync function importReceiptWithRetry(file) {\n  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID\n    ? crypto.randomUUID()\n    : 'receipt-' + Date.now() + '-' + Math.random().toString(36).slice(2);\n  let lastError = null;\n  for (let attempt = 0; attempt < RECEIPT_IMPORT_MAX_ATTEMPTS; attempt += 1) {\n    try {\n      return await documentsApi.importReceipt(file, { idempotencyKey });\n    } catch (error) {\n      lastError = error;\n      const status = Number(error?.status || 0);\n      const transient = status === 0 || [429, 500, 502, 503, 504].includes(status);\n      if (!transient || attempt >= RECEIPT_IMPORT_MAX_ATTEMPTS - 1) throw error;\n      const delay = 900 * (2 ** attempt) + Math.round(Math.random() * 250);\n      await receiptImportSleep(delay);\n    }\n  }\n  throw lastError || new Error('Не удалось импортировать квитанцию');\n}`;

if (!fulfillment.includes('const RECEIPT_IMPORT_CONCURRENCY = 2;')) {
  if (!fulfillment.includes(constantsMarker)) throw new Error('Не найден RECEIPT_IMPORT_DRAFT_KEY');
  fulfillment = fulfillment.replace(constantsMarker, constantsPatch);
  changed = true;
}

const uploadCall = 'const imported = await documentsApi.importReceipt(entry.raw);';
if (fulfillment.includes(uploadCall)) {
  fulfillment = fulfillment.replace(uploadCall, 'const imported = await importReceiptWithRetry(entry.raw);');
  changed = true;
}

if (fulfillment.includes('add.forEach(async (entry) => {')) {
  const startMarker = '    add.forEach(async (entry) => {';
  const endMarker = '    });\n  };\n  const onPick';
  const start = fulfillment.indexOf(startMarker);
  const end = fulfillment.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Не удалось найти границы массовой загрузки квитанций');

  const body = fulfillment.slice(start + startMarker.length, end);
  const replacement = `    const queue = [...add];\n    const workerCount = Math.min(RECEIPT_IMPORT_CONCURRENCY, queue.length);\n    const runWorker = async () => {\n      while (queue.length) {\n        const entry = queue.shift();\n        if (!entry) return;\n        await (async () => {${body}\n        })();\n      }\n    };\n    void Promise.all(Array.from({ length: workerCount }, () => runWorker()));\n  };\n  const onPick`;
  fulfillment = fulfillment.slice(0, start) + replacement + fulfillment.slice(end + endMarker.length);
  changed = true;
}

const oldImportReceipt = "importReceipt: (file) => { const body = new FormData(); body.append('file', file); return apiRequest(apiPath('receipt-imports/'), { method: 'POST', body }); },";
const newImportReceipt = "importReceipt: (file, options = {}) => { const body = new FormData(); body.append('file', file); return apiRequest(apiPath('receipt-imports/'), { method: 'POST', body, ...options }); },";
if (!resources.includes(newImportReceipt)) {
  if (!resources.includes(oldImportReceipt)) throw new Error('Не найден documentsApi.importReceipt');
  resources = resources.replace(oldImportReceipt, newImportReceipt);
  changed = true;
}

const requiredFulfillment = [
  'const RECEIPT_IMPORT_CONCURRENCY = 2;',
  'const RECEIPT_IMPORT_MAX_ATTEMPTS = 3;',
  'async function importReceiptWithRetry(file)',
  "[429, 500, 502, 503, 504].includes(status)",
  'const queue = [...add];',
  'const workerCount = Math.min(RECEIPT_IMPORT_CONCURRENCY, queue.length);',
  'await importReceiptWithRetry(entry.raw)',
];
for (const token of requiredFulfillment) {
  if (!fulfillment.includes(token)) throw new Error(`Не подтверждён стабильный batch import: ${token}`);
}
if (fulfillment.includes('add.forEach(async (entry) => {')) {
  throw new Error('Осталась параллельная отправка всех квитанций через forEach(async)');
}
if (!resources.includes('importReceipt: (file, options = {})')) {
  throw new Error('documentsApi.importReceipt не принимает idempotency options');
}

if (changed) {
  await writeFile(fulfillmentUrl, fulfillment, 'utf8');
  await writeFile(resourcesUrl, resources, 'utf8');
  console.log('Массовый импорт квитанций ограничен двумя одновременными файлами и защищён retry.');
} else {
  console.log('Стабилизация массового импорта квитанций уже применена.');
}
