import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let sourceChanged = false;
let cssChanged = false;

const baseSummary = `                                      <span className="receipt-subrows-strip-copy">
                                        <b>Доступные бланки</b>
                                        <small>
                                          {subReceiptCount} {plural(subReceiptCount, 'бланк', 'бланка', 'бланков')}
                                          {' · '}{subPassengerCount} {plural(subPassengerCount, 'пассажир', 'пассажира', 'пассажиров')}
                                          {' · '}{subRouteCount} {plural(subRouteCount, 'маршрут', 'маршрута', 'маршрутов')}
                                        </small>
                                      </span>`;

const legacyCardSummary = `                                      <span className="receipt-subrows-strip-copy">
                                        <span className="receipt-subrows-strip-heading">
                                          <b>Доступные бланки</b>
                                          <small>Каждый билет доступен отдельно</small>
                                        </span>
                                        <span className="receipt-subrows-strip-stats" aria-label="Сводка по бланкам">
                                          <span className="receipt-subrows-stat"><strong>{subReceiptCount}</strong><span>{plural(subReceiptCount, 'бланк', 'бланка', 'бланков')}</span></span>
                                          <span className="receipt-subrows-stat"><strong>{subPassengerCount}</strong><span>{plural(subPassengerCount, 'пассажир', 'пассажира', 'пассажиров')}</span></span>
                                          <span className="receipt-subrows-stat"><strong>{subRouteCount}</strong><span>{plural(subRouteCount, 'маршрут', 'маршрута', 'маршрутов')}</span></span>
                                        </span>
                                      </span>`;

const compactSummary = `                                      <span className="receipt-subrows-strip-copy">
                                        <span className="receipt-subrows-strip-primary">
                                          <b>Доступные бланки</b>
                                          <strong>{subReceiptCount}</strong>
                                        </span>
                                        <span className="receipt-subrows-strip-meta" aria-label="Сводка по бланкам">
                                          <span>{subPassengerCount} {plural(subPassengerCount, 'пассажир', 'пассажира', 'пассажиров')}</span>
                                          <i aria-hidden="true" />
                                          <span>{subRouteCount} {plural(subRouteCount, 'маршрут', 'маршрута', 'маршрутов')}</span>
                                        </span>
                                      </span>`;

if (!source.includes(compactSummary)) {
  if (source.includes(legacyCardSummary)) {
    source = source.replace(legacyCardSummary, compactSummary);
  } else if (source.includes(baseSummary)) {
    source = source.replace(baseSummary, compactSummary);
  } else {
    throw new Error('Не найден текущий блок сводки доступных бланков.');
  }
  sourceChanged = true;
}

const baseToggle = `                                    <button type="button" className="receipt-subrows-strip-toggle"
                                      aria-expanded={!!expandedReceipts[r.f.id]}
                                      onClick={() => setExpandedReceipts((current) => ({ ...current, [r.f.id]: !current[r.f.id] }))}>
                                      <Icon name="docs" />
                                      <span>{expandedReceipts[r.f.id] ? 'Скрыть бланки' : 'Показать бланки (' + subReceiptCount + ')'}</span>
                                      <Icon name={expandedReceipts[r.f.id] ? 'chevUp' : 'chevDown'} />
                                    </button>`;

const compactToggle = `                                    <button type="button" className="receipt-subrows-strip-toggle"
                                      aria-expanded={!!expandedReceipts[r.f.id]}
                                      onClick={() => setExpandedReceipts((current) => ({ ...current, [r.f.id]: !current[r.f.id] }))}>
                                      <span>{expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'}</span>
                                      <span className="receipt-subrows-toggle-count">{subReceiptCount}</span>
                                      <Icon name={expandedReceipts[r.f.id] ? 'chevUp' : 'chevDown'} />
                                    </button>`;

if (!source.includes(compactToggle)) {
  if (!source.includes(baseToggle)) throw new Error('Не найдена кнопка раскрытия бланков.');
  source = source.replace(baseToggle, compactToggle);
  sourceChanged = true;
}

const marker = '/* Receipt import: compact integrated blanks toolbar. */';
if (!css.includes(marker)) {
  css += `

${marker}
.receipt-subrows-strip-row > td {
  padding: 0 !important;
  background: #fff !important;
  border-top: 0 !important;
}

.receipt-subrows-strip {
  min-height: 46px;
  margin: 0;
  padding: 6px 14px 6px 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 0;
  border-top: 1px solid #edf1f7;
  border-bottom: 1px solid #edf1f7;
  border-radius: 0;
  background: #fafcff;
  box-shadow: none;
}

.receipt-subrows-strip-row.is-expanded .receipt-subrows-strip {
  border-color: #dce6f5;
  background: #f7faff;
  box-shadow: none;
}

.receipt-subrows-strip-summary {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 9px;
}

.receipt-subrows-strip-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #edf3ff;
  color: #2566ff;
}

.receipt-subrows-strip-icon svg {
  width: 14px;
  height: 14px;
}

.receipt-subrows-strip-copy {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.receipt-subrows-strip-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: max-content;
}

.receipt-subrows-strip-primary b {
  color: #344054;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}

.receipt-subrows-strip-primary strong {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: #e8efff;
  color: #2566ff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.receipt-subrows-strip-meta {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #8a97aa;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.receipt-subrows-strip-meta i {
  width: 3px;
  height: 3px;
  flex: 0 0 3px;
  border-radius: 50%;
  background: #c4ccda;
}

.receipt-subrows-strip-toggle {
  min-width: 0;
  min-height: 32px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 9px 5px 11px;
  border: 1px solid #d8e1ef;
  border-radius: 8px;
  background: #fff;
  color: #3568d4;
  box-shadow: none;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}

.receipt-subrows-strip-toggle:hover {
  border-color: #b8c9e8;
  background: #f4f7fc;
}

.receipt-subrows-strip-row.is-expanded .receipt-subrows-strip-toggle {
  border-color: #c6d7fa;
  background: #eef4ff;
  color: #2566ff;
}

.receipt-subrows-strip-toggle svg {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
}

.receipt-subrows-toggle-count {
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #edf3ff;
  color: #2566ff;
  font-size: 10px;
  font-weight: 800;
}

@media (max-width: 900px) {
  .receipt-subrows-strip {
    padding-left: 14px;
  }
}

@media (max-width: 680px) {
  .receipt-subrows-strip {
    min-height: 44px;
    gap: 8px;
    padding: 6px 9px;
  }

  .receipt-subrows-strip-icon {
    display: none;
  }

  .receipt-subrows-strip-copy {
    gap: 8px;
  }

  .receipt-subrows-strip-meta span:first-child {
    display: none;
  }

  .receipt-subrows-strip-meta i {
    display: none;
  }

  .receipt-subrows-strip-toggle {
    min-height: 30px;
    padding-inline: 8px;
  }
}
`;
  cssChanged = true;
}

for (const token of [
  'receipt-subrows-strip-primary',
  'receipt-subrows-strip-meta',
  'receipt-subrows-toggle-count',
  '<b>Доступные бланки</b>',
  "expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'",
]) {
  if (!source.includes(token)) throw new Error(`Не подтвержден компактный блок бланков: ${token}`);
}

for (const removedToken of [
  'Каждый билет доступен отдельно',
  'receipt-subrows-strip-stats',
  'receipt-subrows-stat',
]) {
  if (source.includes(removedToken)) throw new Error(`Старый громоздкий дизайн остался в JSX: ${removedToken}`);
}

if (sourceChanged) await writeFile(pageUrl, source, 'utf8');
if (cssChanged) await writeFile(cssUrl, css, 'utf8');
console.log(sourceChanged || cssChanged
  ? 'Доступные бланки превращены в компактную служебную строку документа.'
  : 'Компактная строка доступных бланков уже настроена.');
