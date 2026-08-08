import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let sourceChanged = false;
let cssChanged = false;

// Older builds placed the blank summary directly inside the document cell.
// Remove that compact block: the control now lives in its own row below the
// main receipt row, where it has enough room and does not look like technical
// metadata next to the service type.
const inlineBlock = /\n\s*\{!!subReceiptCount && \(\s*\n\s*<span className=\{'receipt-subrows-inline'[\s\S]*?<\/button>\s*\n\s*<\/span>\s*\n\s*\)\}/;
if (inlineBlock.test(source)) {
  source = source.replace(inlineBlock, '');
  sourceChanged = true;
}

const simpleStripRow = `
                            {!!subReceiptCount && (
                              <tr className={'receipt-subrows-strip-row' + (expandedReceipts[r.f.id] ? ' is-expanded' : '')}
                                style={{ opacity: skipped ? 0.5 : 1 }}>
                                <td colSpan={7}>
                                  <div className="receipt-subrows-strip">
                                    <span className="receipt-subrows-strip-count">
                                      Бланков: <b>{subReceiptCount}</b>
                                    </span>
                                    <button type="button" className="receipt-subrows-strip-toggle"
                                      aria-expanded={!!expandedReceipts[r.f.id]}
                                      onClick={() => setExpandedReceipts((current) => ({ ...current, [r.f.id]: !current[r.f.id] }))}>
                                      <span>{expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'}</span>
                                      <Icon name={expandedReceipts[r.f.id] ? 'chevUp' : 'chevDown'} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}`;

// The v2 patch creates a detached row first. Replace its verbose
// "blanks/passengers/routes" summary with the simple count requested by the UI.
const detachedStripRow = /\n\s*\{!!subReceiptCount && \(\s*\n\s*<tr className=\{'receipt-subrows-strip-row'[\s\S]*?<\/tr>\s*\n\s*\)\}/;
if (!source.includes('className="receipt-subrows-strip-count"') && detachedStripRow.test(source)) {
  source = source.replace(detachedStripRow, simpleStripRow);
  sourceChanged = true;
}

// Keep the patch resilient when it is applied over a working tree where the
// previous polish script had already removed the detached row.
if (!source.includes('className="receipt-subrows-strip-count"')) {
  const expansionMarker = `                            {expandedReceipts[r.f.id] && (r.f.subReceipts || []).map((subReceipt, subIndex) => {`;
  if (!source.includes(expansionMarker)) throw new Error('Не найдено место для полосы бланков.');
  source = source.replace(expansionMarker, `${simpleStripRow}\n${expansionMarker}`);
  sourceChanged = true;
}

const marker = '/* Receipt import: blanks live in a dedicated expandable strip below the main row. */';
if (!css.includes(marker)) {
  css += `

${marker}
.receipt-subrows-inline {
  display: none !important;
}

.receipt-subrows-strip-row {
  display: table-row !important;
}

.receipt-subrows-strip-row > td {
  padding: 0 !important;
  border-top: 0 !important;
  background: transparent !important;
}

.receipt-subrows-strip-row.is-expanded > td {
  border-bottom-color: transparent !important;
}

.receipt-subrows-strip {
  min-width: 0;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 14px 6px 52px;
  border-top: 1px solid #e7edf7;
  border-bottom: 1px solid #e7edf7;
  background: #fafbfe;
}

.receipt-subrows-strip-row.is-expanded .receipt-subrows-strip {
  background: #f6f8ff;
  border-bottom-color: #d9e3fb;
}

.receipt-subrows-strip-count {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.receipt-subrows-strip-count b {
  color: #3568d4;
  font-size: 12px;
  font-weight: 750;
}

.receipt-subrows-strip-summary,
.receipt-subrows-strip-icon,
.receipt-subrows-strip-copy {
  display: none !important;
}

.receipt-subrows-strip-toggle {
  min-width: max-content;
  min-height: 28px;
  flex: 0 0 auto;
  margin-left: auto;
  padding: 4px 5px 4px 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #3568d4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: none;
}

.receipt-subrows-strip-toggle:hover,
.receipt-subrows-strip-row.is-expanded .receipt-subrows-strip-toggle {
  background: #eef3ff;
  color: var(--blue);
}

.receipt-subrows-strip-toggle:focus-visible {
  outline: 3px solid rgba(37, 102, 255, .18);
  outline-offset: 2px;
}

.receipt-subrows-strip-toggle svg {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
}

@media (max-width: 760px) {
  .rec-import-table tbody tr.receipt-subrows-strip-row {
    display: block !important;
  }

  .rec-import-table tbody tr.receipt-subrows-strip-row > td {
    display: block !important;
  }

  .rec-import-table tbody tr.receipt-subrows-strip-row > td::before {
    display: none !important;
  }

  .receipt-subrows-strip {
    min-height: 38px;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
  }
}
`;
  cssChanged = true;
}

for (const token of [
  'className="receipt-subrows-strip-count"',
  'Бланков: <b>{subReceiptCount}</b>',
  "expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'",
  "<tr className={'receipt-subrows-strip-row'",
  'colSpan={7}',
]) {
  if (!source.includes(token)) throw new Error(`Не подтверждена полоса бланков: ${token}`);
}

if (source.includes("className={'receipt-subrows-inline'")) {
  throw new Error('Компактный блок бланков всё ещё находится внутри основной строки.');
}

if (sourceChanged) await writeFile(pageUrl, source, 'utf8');
if (cssChanged) await writeFile(cssUrl, css, 'utf8');
console.log(sourceChanged || cssChanged
  ? 'Количество бланков вынесено в отдельную раскрывающуюся полосу под основной строкой.'
  : 'Полоса количества бланков уже настроена.');
