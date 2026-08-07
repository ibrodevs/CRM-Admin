import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let sourceChanged = false;
let cssChanged = false;

const oldSummary = `                                      <span className="receipt-subrows-strip-copy">
                                        <b>Доступные бланки</b>
                                        <small>
                                          {subReceiptCount} {plural(subReceiptCount, 'бланк', 'бланка', 'бланков')}
                                          {' · '}{subPassengerCount} {plural(subPassengerCount, 'пассажир', 'пассажира', 'пассажиров')}
                                          {' · '}{subRouteCount} {plural(subRouteCount, 'маршрут', 'маршрута', 'маршрутов')}
                                        </small>
                                      </span>`;

const newSummary = `                                      <span className="receipt-subrows-strip-copy">
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

if (!source.includes(newSummary)) {
  if (!source.includes(oldSummary)) {
    throw new Error('Не найден текущий блок сводки доступных бланков.');
  }
  source = source.replace(oldSummary, newSummary);
  sourceChanged = true;
}

const marker = '/* Receipt import: polished available blanks card. */';
if (!css.includes(marker)) {
  css += `

${marker}
.receipt-subrows-strip-row > td {
  padding: 0 14px 12px !important;
  background: #f8fafc !important;
}

.receipt-subrows-strip {
  min-height: 70px;
  padding: 12px 14px;
  margin: 0;
  border: 1px solid #dfe7f3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, .04);
}

.receipt-subrows-strip-row.is-expanded .receipt-subrows-strip {
  border-color: #cddcff;
  background: #fbfdff;
  box-shadow: 0 3px 12px rgba(37, 102, 255, .06);
}

.receipt-subrows-strip-summary {
  flex: 1 1 auto;
  gap: 12px;
}

.receipt-subrows-strip-icon {
  width: 38px;
  height: 38px;
  flex-basis: 38px;
  border-radius: 10px;
  background: #eef4ff;
}

.receipt-subrows-strip-icon svg {
  width: 18px;
  height: 18px;
}

.receipt-subrows-strip-copy {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.receipt-subrows-strip-heading {
  min-width: 150px;
  display: grid;
  gap: 2px;
}

.receipt-subrows-strip-heading b {
  color: #172033;
  font-size: 13px;
  line-height: 1.25;
}

.receipt-subrows-strip-heading small {
  color: #8a97ab;
  font-size: 10.5px;
  line-height: 1.3;
  white-space: nowrap;
}

.receipt-subrows-strip-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
}

.receipt-subrows-stat {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border: 1px solid #e1e8f2;
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.receipt-subrows-stat strong {
  color: #24324a;
  font-size: 11.5px;
  font-weight: 800;
}

.receipt-subrows-strip-toggle {
  min-height: 40px;
  padding: 8px 13px;
  border-color: #cbd8f6;
  border-radius: 10px;
  background: #f7faff;
  color: #2566ff;
  box-shadow: none;
  font-size: 12px;
}

.receipt-subrows-strip-toggle:hover {
  border-color: #9fb9ff;
  background: #eef4ff;
}

.receipt-subrows-strip-toggle > svg:first-child {
  opacity: .8;
}

@media (max-width: 980px) {
  .receipt-subrows-strip-copy {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }

  .receipt-subrows-strip-heading {
    min-width: 0;
  }
}

@media (max-width: 760px) {
  .receipt-subrows-strip-row > td {
    padding: 0 8px 10px !important;
  }

  .receipt-subrows-strip {
    gap: 12px;
    padding: 12px;
  }

  .receipt-subrows-strip-summary {
    align-items: flex-start;
  }

  .receipt-subrows-strip-heading small {
    white-space: normal;
  }

  .receipt-subrows-strip-stats {
    gap: 6px;
  }

  .receipt-subrows-strip-toggle {
    width: 100%;
  }
}
`;
  cssChanged = true;
}

for (const token of [
  'receipt-subrows-strip-heading',
  'receipt-subrows-strip-stats',
  "plural(subReceiptCount, 'бланк', 'бланка', 'бланков')",
  "plural(subPassengerCount, 'пассажир', 'пассажира', 'пассажиров')",
  "plural(subRouteCount, 'маршрут', 'маршрута', 'маршрутов')",
  'Каждый билет доступен отдельно',
]) {
  if (!source.includes(token)) throw new Error(`Не подтвержден новый дизайн бланков: ${token}`);
}

if (sourceChanged) await writeFile(pageUrl, source, 'utf8');
if (cssChanged) await writeFile(cssUrl, css, 'utf8');
console.log(sourceChanged || cssChanged
  ? 'Блок доступных бланков приведён к компактной карточке со статистикой.'
  : 'Новый дизайн блока доступных бланков уже применён.');
