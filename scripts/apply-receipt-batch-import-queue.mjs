import { readFile, writeFile } from 'node:fs/promises';

const fulfillmentUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const resourcesUrl = new URL('../js/api/resources.js', import.meta.url);

let fulfillment = await readFile(fulfillmentUrl, 'utf8');
let resources = await readFile(resourcesUrl, 'utf8');
let changed = false;

const constantsMarker = "const RECEIPT_IMPORT_DRAFT_KEY = 'travelhub.receipt-import-draft.v1';";
const constantsPatch = `${constantsMarker}\nconst RECEIPT_IMPORT_CONCURRENCY = 1;\nconst RECEIPT_IMPORT_MAX_ATTEMPTS = 5;\nconst RECEIPT_RESULT_MAX_ATTEMPTS = 6;\nconst RECEIPT_IMPORT_GAP_MS = 650;\nconst RECEIPT_TRANSIENT_STATUSES = new Set([0, 408, 425, 429, 500, 502, 503, 504]);\n\nconst receiptImportSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\nconst receiptRetryDelay = (attempt, base = 1200) => Math.min(12000, base * (2 ** attempt)) + Math.round(Math.random() * 350);\nconst isTransientReceiptError = (error) => RECEIPT_TRANSIENT_STATUSES.has(Number(error?.status || 0));\n\nasync function importReceiptWithRetry(file) {\n  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID\n    ? crypto.randomUUID()\n    : 'receipt-' + Date.now() + '-' + Math.random().toString(36).slice(2);\n  let lastError = null;\n  for (let attempt = 0; attempt < RECEIPT_IMPORT_MAX_ATTEMPTS; attempt += 1) {\n    try {\n      return await documentsApi.importReceipt(file, { idempotencyKey });\n    } catch (error) {\n      lastError = error;\n      if (!isTransientReceiptError(error) || attempt >= RECEIPT_IMPORT_MAX_ATTEMPTS - 1) throw error;\n      await receiptImportSleep(receiptRetryDelay(attempt));\n    }\n  }\n  throw lastError || new Error('Не удалось импортировать квитанцию');\n}\n\nasync function receiptResultWithRetry(importId) {\n  let lastError = null;\n  for (let attempt = 0; attempt < RECEIPT_RESULT_MAX_ATTEMPTS; attempt += 1) {\n    try {\n      return await documentsApi.receiptResult(importId);\n    } catch (error) {\n      lastError = error;\n      if (!isTransientReceiptError(error) || attempt >= RECEIPT_RESULT_MAX_ATTEMPTS - 1) throw error;\n      await receiptImportSleep(receiptRetryDelay(attempt, 900));\n    }\n  }\n  throw lastError || new Error('Не удалось получить результат распознавания');\n}`;

if (!fulfillment.includes('const RECEIPT_IMPORT_CONCURRENCY = 1;')) {
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
  const replacement = `    const queue = [...add];\n    const workerCount = Math.min(RECEIPT_IMPORT_CONCURRENCY, queue.length);\n    const runWorker = async () => {\n      while (queue.length) {\n        const entry = queue.shift();\n        if (!entry) return;\n        await (async () => {${body}\n        })();\n        if (queue.length) await receiptImportSleep(RECEIPT_IMPORT_GAP_MS);\n      }\n    };\n    void Promise.all(Array.from({ length: workerCount }, () => runWorker()));\n  };\n  const onPick`;
  fulfillment = fulfillment.slice(0, start) + replacement + fulfillment.slice(end + endMarker.length);
  changed = true;
}

const oldWait = `async function waitForReceiptResult(importId) {\n  let result = null;\n  for (let attempt = 0; attempt < 15; attempt += 1) {\n    result = await documentsApi.receiptResult(importId);\n    const status = String(result?.parser_status || '').toLowerCase();\n    if (!['queued', 'pending', 'processing', 'scanning'].includes(status)) return result;\n    await new Promise((resolve) => setTimeout(resolve, 800));\n  }\n  return result || {};\n}`;
const newWait = `async function waitForReceiptResult(importId) {\n  let result = null;\n  for (let attempt = 0; attempt < 30; attempt += 1) {\n    result = await receiptResultWithRetry(importId);\n    const status = String(result?.parser_status || '').toLowerCase();\n    if (!['queued', 'pending', 'processing', 'scanning'].includes(status)) return result;\n    await receiptImportSleep(Math.min(2200, 700 + attempt * 80));\n  }\n  return result || {};\n}`;
if (!fulfillment.includes(newWait)) {
  if (!fulfillment.includes(oldWait)) throw new Error('Не найден waitForReceiptResult');
  fulfillment = fulfillment.replace(oldWait, newWait);
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
  'const RECEIPT_IMPORT_CONCURRENCY = 1;',
  'const RECEIPT_IMPORT_MAX_ATTEMPTS = 5;',
  'const RECEIPT_RESULT_MAX_ATTEMPTS = 6;',
  'const RECEIPT_IMPORT_GAP_MS = 650;',
  'async function importReceiptWithRetry(file)',
  'async function receiptResultWithRetry(importId)',
  'const queue = [...add];',
  'const workerCount = Math.min(RECEIPT_IMPORT_CONCURRENCY, queue.length);',
  'await importReceiptWithRetry(entry.raw)',
  'await receiptImportSleep(RECEIPT_IMPORT_GAP_MS)',
  'result = await receiptResultWithRetry(importId);',
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
  console.log('Массовый импорт квитанций выполняется последовательно, с паузой и retry для загрузки и результата.');
} else {
  console.log('Стабилизация массового импорта квитанций уже применена.');
}
