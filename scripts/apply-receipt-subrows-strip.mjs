import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let sourceChanged = false;
let cssChanged = false;

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Не найден фрагмент: ${label}`);
  source = source.replace(from, to);
  sourceChanged = true;
};

replaceOnce(
`                          const carrierText = (p.carrier || '').trim() || r.f.name;`,
`                          const carrierText = (p.carrier || '').trim() || r.f.name;
                          const subReceiptCount = r.f.subReceipts?.length || 0;
                          const subPassengerCount = new Set((r.f.subReceipts || [])
                            .map((receipt) => receipt.passenger || receipt.passengers?.[0]?.name || '')
                            .filter(Boolean)).size;
                          const subRouteCount = new Set((r.f.subReceipts || [])
                            .map((receipt) => routeSummary(receipt))
                            .filter((route) => route && route !== '—')).size;`,
  'сводка доступных бланков',
);

replaceOnce(
`                                    <span className="rec-import-title"><ReceiptParticipantSummary draft={p} noun={r.f.type === 'Гостиница' ? 'гостей' : 'пассажиров'} />
                                      {!!r.f.subReceipts?.length && <button type="button" className="receipt-subrows-toggle"
                                        aria-expanded={!!expandedReceipts[r.f.id]}
                                        onClick={() => setExpandedReceipts((current) => ({ ...current, [r.f.id]: !current[r.f.id] }))}>
                                        {expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'} бланки ({r.f.subReceipts.length})
                                        <Icon name={expandedReceipts[r.f.id] ? 'chevUp' : 'chevDown'} />
                                      </button>}
                                    </span>`,
`                                    <span className="rec-import-title"><ReceiptParticipantSummary draft={p} noun={r.f.type === 'Гостиница' ? 'гостей' : 'пассажиров'} /></span>`,
  'удаление кнопки из имени пассажира',
);

replaceOnce(
`                              }}><Icon name="trash" style={{ width: 16, height: 16 }} /></button></td>
                            </tr>
                            {expandedReceipts[r.f.id] && (r.f.subReceipts || []).map((subReceipt, subIndex) => {`,
`                              }}><Icon name="trash" style={{ width: 16, height: 16 }} /></button></td>
                            </tr>
                            {!!subReceiptCount && (
                              <tr className={'receipt-subrows-strip-row' + (expandedReceipts[r.f.id] ? ' is-expanded' : '')}
                                style={{ opacity: skipped ? 0.5 : 1 }}>
                                <td colSpan={7}>
                                  <div className="receipt-subrows-strip">
                                    <div className="receipt-subrows-strip-summary">
                                      <span className="receipt-subrows-strip-icon"><Icon name="docs" /></span>
                                      <span className="receipt-subrows-strip-copy">
                                        <b>Доступные бланки</b>
                                        <small>
                                          {subReceiptCount} {plural(subReceiptCount, 'бланк', 'бланка', 'бланков')}
                                          {' · '}{subPassengerCount} {plural(subPassengerCount, 'пассажир', 'пассажира', 'пассажиров')}
                                          {' · '}{subRouteCount} {plural(subRouteCount, 'маршрут', 'маршрута', 'маршрутов')}
                                        </small>
                                      </span>
                                    </div>
                                    <button type="button" className="receipt-subrows-strip-toggle"
                                      aria-expanded={!!expandedReceipts[r.f.id]}
                                      onClick={() => setExpandedReceipts((current) => ({ ...current, [r.f.id]: !current[r.f.id] }))}>
                                      <Icon name="docs" />
                                      <span>{expandedReceipts[r.f.id] ? 'Скрыть бланки' : 'Показать бланки (' + subReceiptCount + ')'}</span>
                                      <Icon name={expandedReceipts[r.f.id] ? 'chevUp' : 'chevDown'} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {expandedReceipts[r.f.id] && (r.f.subReceipts || []).map((subReceipt, subIndex) => {`,
  'полноширинная полоса доступных бланков',
);

const cssMarker = '/* Receipt import: available child blanks live in a dedicated full-width strip. */';
if (!css.includes(cssMarker)) {
  css += `

${cssMarker}
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
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 14px 9px 52px;
  border-top: 1px solid #dce6ff;
  border-bottom: 1px solid #dce6ff;
  background: #f6f8ff;
}

.receipt-subrows-strip-row.is-expanded .receipt-subrows-strip {
  border-bottom-color: #c9d8ff;
  background: #f1f5ff;
}

.receipt-subrows-strip-summary {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.receipt-subrows-strip-icon {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #e5edff;
  color: var(--blue);
}

.receipt-subrows-strip-icon svg {
  width: 17px;
  height: 17px;
}

.receipt-subrows-strip-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.receipt-subrows-strip-copy b {
  color: var(--ink);
  font-size: 12.5px;
  line-height: 1.25;
}

.receipt-subrows-strip-copy small {
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.receipt-subrows-strip-toggle {
  min-width: max-content;
  min-height: 36px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 7px 12px;
  border: 1px solid #b9cbff;
  border-radius: 9px;
  background: #fff;
  color: var(--blue);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(28, 72, 160, .06);
}

.receipt-subrows-strip-toggle:hover {
  border-color: var(--blue);
  background: var(--blue-soft);
}

.receipt-subrows-strip-toggle:focus-visible {
  outline: 3px solid rgba(37, 102, 255, .18);
  outline-offset: 2px;
}

.receipt-subrows-strip-toggle svg {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
}

@media (max-width: 760px) {
  .receipt-subrows-strip {
    align-items: stretch;
    flex-direction: column;
    gap: 9px;
    padding: 10px 12px;
  }

  .receipt-subrows-strip-toggle {
    width: 100%;
  }
}
`;
  cssChanged = true;
}

for (const token of [
  'className="receipt-subrows-strip-row',
  'colSpan={7}',
  '<b>Доступные бланки</b>',
  "'Показать бланки (' + subReceiptCount + ')'",
  'className="rec-import-title"><ReceiptParticipantSummary',
]) {
  if (!source.includes(token)) throw new Error(`Не подтверждена полоса бланков: ${token}`);
}

if (sourceChanged) await writeFile(pageUrl, source, 'utf8');
if (cssChanged) await writeFile(cssUrl, css, 'utf8');
console.log(sourceChanged || cssChanged
  ? 'Доступные бланки перенесены в отдельную полноширинную полосу.'
  : 'Полоса доступных бланков уже настроена.');
