import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let sourceChanged = false;
let cssChanged = false;

const detachedStripRow = /\n\s*\{!!subReceiptCount && \(\s*\n\s*<tr className=\{'receipt-subrows-strip-row'[\s\S]*?<\/tr>\s*\n\s*\)\}/;
if (detachedStripRow.test(source)) {
  source = source.replace(detachedStripRow, '');
  sourceChanged = true;
}

const oldInlineBlock = /\n\s*\{!!subReceiptCount && \(\s*\n\s*<span className=\{'receipt-subrows-inline'[\s\S]*?<\/span>\s*\n\s*\)\}/;
const typeSelect = `                                    <Select aria-label="Тип услуги" options={REC_TYPES.filter((item) => item.key !== 'Прочее').map((item) => item.key)}
                                      value={r.f.type} onChange={(event) => setType(r.f.id, event.target.value)} className="select rec-import-type-select" />`;
const inlineBlanks = `
                                    {!!subReceiptCount && (
                                      <span className={'receipt-subrows-inline' + (expandedReceipts[r.f.id] ? ' is-expanded' : '')}>
                                        <span className="receipt-subrows-inline-count">Бланков: <b>{subReceiptCount}</b></span>
                                        <button type="button" className="receipt-subrows-inline-toggle"
                                          aria-expanded={!!expandedReceipts[r.f.id]}
                                          onClick={() => setExpandedReceipts((current) => ({ ...current, [r.f.id]: !current[r.f.id] }))}>
                                          <span>{expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'}</span>
                                          <Icon name={expandedReceipts[r.f.id] ? 'chevUp' : 'chevDown'} />
                                        </button>
                                      </span>
                                    )}`;

if (!source.includes('className="receipt-subrows-inline-count"')) {
  if (oldInlineBlock.test(source)) {
    source = source.replace(oldInlineBlock, inlineBlanks);
    sourceChanged = true;
  } else {
    if (!source.includes(typeSelect)) throw new Error('Не найден тип услуги для встроенного блока бланков.');
    source = source.replace(typeSelect, `${typeSelect}${inlineBlanks}`);
    sourceChanged = true;
  }
}

const cssMarker = '/* Receipt import: blank count stays inside the document block. */';
if (!css.includes(cssMarker)) {
  css += `

${cssMarker}
.receipt-subrows-inline {
  width: 100%;
  min-width: 0;
  margin-top: 7px;
  padding-top: 7px;
  border-top: 1px solid #edf1f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.receipt-subrows-inline-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.receipt-subrows-inline-count b {
  color: #3568d4;
  font-size: 11.5px;
  font-weight: 750;
}

.receipt-subrows-inline-toggle {
  min-width: max-content;
  min-height: 26px;
  flex: 0 0 auto;
  margin-left: auto;
  padding: 3px 4px 3px 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #3568d4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font: inherit;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.receipt-subrows-inline-toggle:hover,
.receipt-subrows-inline.is-expanded .receipt-subrows-inline-toggle {
  background: #f1f5ff;
  color: var(--blue);
}

.receipt-subrows-inline-toggle svg {
  width: 12px;
  height: 12px;
  flex: 0 0 12px;
}

.receipt-subrows-strip-row {
  display: none !important;
}
`;
  cssChanged = true;
}

for (const token of [
  'className="receipt-subrows-inline-count"',
  'Бланков: <b>{subReceiptCount}</b>',
  'className="receipt-subrows-inline-toggle"',
  "expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'",
]) {
  if (!source.includes(token)) throw new Error(`Не подтверждён встроенный блок бланков: ${token}`);
}

if (source.includes("<tr className={'receipt-subrows-strip-row'")) {
  throw new Error('Отдельная строка бланков всё ещё присутствует снаружи документа.');
}

if (sourceChanged) await writeFile(pageUrl, source, 'utf8');
if (cssChanged) await writeFile(cssUrl, css, 'utf8');
console.log(sourceChanged || cssChanged
  ? 'Блок «Бланков: N / Показать» встроен внутрь документа.'
  : 'Блок бланков уже встроен внутрь документа.');
