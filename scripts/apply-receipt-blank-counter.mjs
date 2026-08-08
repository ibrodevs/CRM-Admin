import { readFile, writeFile } from 'node:fs/promises';

const fulfillmentUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

let source = await readFile(fulfillmentUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let changed = false;

const doneMarker = `  const done = files.filter((f) => f.status === 'done');\n  const importProgress = files.length ? Math.round((done.length / files.length) * 100) : 0;`;
const donePatch = `  const done = files.filter((f) => f.status === 'done');\n  const processedBlankCount = done.reduce((total, file) => {\n    const subReceiptCount = Array.isArray(file.subReceipts) ? file.subReceipts.length : 0;\n    const declaredCount = Number(file.parsed?.receiptCount || file.parsed?.receipt_count || 0);\n    const detectedCount = Math.max(subReceiptCount, declaredCount);\n    return total + (detectedCount > 0 ? detectedCount : (file.error ? 0 : 1));\n  }, 0);\n  const importProgress = files.length ? Math.round((done.length / files.length) * 100) : 0;`;

if (!source.includes('const processedBlankCount = done.reduce')) {
  if (!source.includes(doneMarker)) throw new Error('Не найден расчёт прогресса импорта');
  source = source.replace(doneMarker, donePatch);
  changed = true;
}

const footMarker = `<span>Обработано <b>{done.length}</b> из <b>{files.length}</b> файлов</span>\n                <span>{files.length - done.length > 0 ? \`Осталось: \${files.length - done.length}\` : 'Готово'}</span>`;
const footPatch = `<span>Обработано <b>{done.length}</b> из <b>{files.length}</b> файлов</span>\n                <span className="receipt-upload-progress-blanks">Бланков: <b>{processedBlankCount}</b></span>\n                <span>{files.length - done.length > 0 ? \`Осталось: \${files.length - done.length}\` : 'Готово'}</span>`;

if (!source.includes('className="receipt-upload-progress-blanks"')) {
  if (!source.includes(footMarker)) throw new Error('Не найден нижний блок прогресса импорта');
  source = source.replace(footMarker, footPatch);
  changed = true;
}

const cssMarker = '/* Receipt import progress: show file count and actual nested blank count separately. */';
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n.receipt-upload-progress-foot {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);\n  align-items: center;\n  gap: 12px;\n}\n\n.receipt-upload-progress-foot > span:last-child {\n  justify-self: end;\n}\n\n.receipt-upload-progress-blanks {\n  justify-self: center;\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  min-height: 26px;\n  padding: 3px 10px;\n  border: 1px solid rgba(31, 157, 87, .18);\n  border-radius: 999px;\n  background: rgba(31, 157, 87, .07);\n  color: var(--green);\n  font-weight: 600;\n  white-space: nowrap;\n}\n\n.receipt-upload-progress-blanks b {\n  color: var(--green);\n  font-size: 13px;\n}\n\n@media (max-width: 760px) {\n  .receipt-upload-progress-foot {\n    grid-template-columns: minmax(0, 1fr) auto;\n    align-items: center;\n  }\n\n  .receipt-upload-progress-blanks {\n    justify-self: end;\n  }\n\n  .receipt-upload-progress-foot > span:last-child {\n    grid-column: 1 / -1;\n    justify-self: start;\n  }\n}\n`;
  changed = true;
}

// Final normalization for the inline "Бланков: N" control. The earlier strip
// patch can generate the same CSS marker first, so this must run at the end of
// prebuild and normalize the actual generated rules before tests execute.
const beforeBaseline = css;
css = css.replace(
  /(\.receipt-subrows-inline-count\s*\{[\s\S]*?)align-items:\s*center;/,
  '$1align-items: baseline;',
);
css = css.replace(
  /(\.receipt-subrows-inline-count b\s*\{[\s\S]*?font-size:)\s*11\.5px;/,
  '$1 11px;',
);
if (css !== beforeBaseline) changed = true;

const required = [
  'const processedBlankCount = done.reduce',
  'Array.isArray(file.subReceipts) ? file.subReceipts.length : 0',
  'file.parsed?.receiptCount || file.parsed?.receipt_count',
  'className="receipt-upload-progress-blanks"',
  'Бланков: <b>{processedBlankCount}</b>',
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Не подтверждён счётчик бланков: ${token}`);
}

if (!/\.receipt-subrows-inline-count\s*\{[\s\S]*?align-items:\s*baseline;/.test(css)) {
  throw new Error('Не удалось выровнять количество бланков по базовой линии.');
}
if (!/\.receipt-subrows-inline-count b\s*\{[\s\S]*?font-size:\s*11px;/.test(css)) {
  throw new Error('Не удалось синхронизировать размер цифры количества бланков.');
}

if (changed) {
  await writeFile(fulfillmentUrl, source, 'utf8');
  await writeFile(cssUrl, css, 'utf8');
  console.log('Счётчики бланков настроены и выровнены.');
} else {
  console.log('Счётчики бланков уже настроены.');
}
