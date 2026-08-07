import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let sourceChanged = false;
let cssChanged = false;

const typeSelect = `                                    <Select aria-label="Тип услуги" options={REC_TYPES.filter((item) => item.key !== 'Прочее').map((item) => item.key)}
                                      value={r.f.type} onChange={(event) => setType(r.f.id, event.target.value)} className="select rec-import-type-select" />`;

const integratedBlanks = `                                    <Select aria-label="Тип услуги" options={REC_TYPES.filter((item) => item.key !== 'Прочее').map((item) => item.key)}
                                      value={r.f.type} onChange={(event) => setType(r.f.id, event.target.value)} className="select rec-import-type-select" />
                                    {!!subReceiptCount && (
                                      <span className={'receipt-subrows-inline' + (expandedReceipts[r.f.id] ? ' is-expanded' : '')}>
                                        <span className="receipt-subrows-inline-info">
                                          <strong>{subReceiptCount} {plural(subReceiptCount, 'бланк', 'бланка', 'бланков')}</strong>
                                          <span>{subPassengerCount} {plural(subPassengerCount, 'пассажир', 'пассажира', 'пассажиров')} · {subRouteCount} {plural(subRouteCount, 'маршрут', 'маршрута', 'маршрутов')}</span>
                                        </span>
                                        <button type="button" className="receipt-subrows-inline-toggle"
                                          aria-expanded={!!expandedReceipts[r.f.id]}
                                          onClick={() => setExpandedReceipts((current) => ({ ...current, [r.f.id]: !current[r.f.id] }))}>
                                          <span>{expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'}</span>
                                          <Icon name={expandedReceipts[r.f.id] ? 'chevUp' : 'chevDown'} />
                                        </button>
                                      </span>
                                    )}`;

if (!source.includes('className={\'receipt-subrows-inline\'')) {
  if (!source.includes(typeSelect)) throw new Error('Не найден тип услуги для интеграции бланков в документ.');
  source = source.replace(typeSelect, integratedBlanks);
  sourceChanged = true;
}

// The previous implementation created a separate full-width <tr>.  Remove it
// completely: blank controls now belong to the parent document cell itself.
const detachedStripRow = /\n\s*\{!!subReceiptCount && \(\s*\n\s*<tr className=\{'receipt-subrows-strip-row'[\s\S]*?<\/tr>\s*\n\s*\)\}/;
if (detachedStripRow.test(source)) {
  source = source.replace(detachedStripRow, '');
  sourceChanged = true;
}

const marker = '/* Receipt import: blanks integrated inside the document cell. */';
if (!css.includes(marker)) {
  css += `

${marker}
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

.receipt-subrows-inline-info {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px 8px;
  line-height: 1.2;
}

.receipt-subrows-inline-info strong {
  color: #3568d4;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
}

.receipt-subrows-inline-info > span {
  color: #8a97aa;
  font-size: 10.5px;
  white-space: nowrap;
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
  color: #2566ff;
}

.receipt-subrows-inline-toggle svg {
  width: 12px;
  height: 12px;
  flex: 0 0 12px;
}

/* Detached strip is obsolete and must never occupy table space. */
.receipt-subrows-strip-row {
  display: none !important;
}

@media (max-width: 760px) {
  .receipt-subrows-inline {
    align-items: flex-start;
  }

  .receipt-subrows-inline-info {
    display: grid;
    gap: 2px;
  }

  .receipt-subrows-inline-info > span {
    white-space: normal;
  }
}
`;
  cssChanged = true;
}

for (const token of [
  'receipt-subrows-inline',
  'receipt-subrows-inline-info',
  'receipt-subrows-inline-toggle',
  "subReceiptCount} {plural(subReceiptCount, 'бланк', 'бланка', 'бланков')",
  "expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'",
]) {
  if (!source.includes(token)) throw new Error(`Не подтверждена интеграция бланков в документ: ${token}`);
}

if (source.includes("<tr className={'receipt-subrows-strip-row'")) {
  throw new Error('Отдельная строка доступных бланков всё ещё присутствует в таблице.');
}

if (sourceChanged) await writeFile(pageUrl, source, 'utf8');
if (cssChanged) await writeFile(cssUrl, css, 'utf8');
console.log(sourceChanged || cssChanged
  ? 'Доступные бланки встроены непосредственно в блок документа.'
  : 'Доступные бланки уже встроены в блок документа.');
