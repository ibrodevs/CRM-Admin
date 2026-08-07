import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let changed = false;

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Не найден фрагмент: ${label}`);
  source = source.replace(from, to);
  changed = true;
};

replaceOnce(
`                        const t = recType(r.f.type); const p = r.f.parsed; const st = REC_STATUS[r.status] || { tone: 'gray' };`,
`                        const t = recType(r.f.type); const p = r.f.parsed;
                        const displayStatus = r.status === 'Ошибка' && p?.recognitionPending ? 'Требует проверки' : r.status;
                        const st = REC_STATUS[displayStatus] || REC_STATUS['Требует проверки'] || { tone: 'amber', action: 'Проверить' };`,
  'безопасный статус распознавания',
);

replaceOnce(
`                                <Pill tone={st.tone}>{r.status}</Pill>`,
`                                <Pill tone={st.tone}>{displayStatus}</Pill>`,
  'отображение статуса',
);

replaceOnce(
`                                  <span className="rec-import-money-total">{recMoney(clientTotal(m), p.currency)}</span>`,
`                                  <span className={'rec-import-money-total' + (!recHasSourceAmount(p) ? ' is-missing' : '')}>
                                    {recHasSourceAmount(p) ? recMoney(clientTotal(m), p.currency) : 'Стоимость не распознана'}
                                  </span>`,
  'не показывать выдуманный ноль',
);

replaceOnce(
`                                        if (r.status === 'Ошибка' && r.f.raw) {
                                          const raw = r.f.raw;
                                          remove(r.f.id);
                                          addFiles([raw]);
                                        } else setEditId(r.f.id);`,
`                                        if (r.status === 'Ошибка' && !p?.recognitionPending && r.f.raw) {
                                          const raw = r.f.raw;
                                          remove(r.f.id);
                                          addFiles([raw]);
                                        } else setEditId(r.f.id);`,
  'ручная проверка вместо бесконечного retry',
);

replaceOnce(
`                                      }}>{st.action}</button>`,
`                                      }}>{displayStatus === 'Требует проверки' ? 'Проверить и заполнить' : st.action}</button>`,
  'понятное действие для нераспознанного документа',
);

const marker = '/* Receipt import hardening: unresolved data is reviewable and child blanks stay inside the table. */';
if (!css.includes(marker)) {
  css += `

${marker}
.rec-import-money-total.is-missing {
  color: var(--amber) !important;
  font-size: 12px !important;
  line-height: 1.25;
  white-space: normal;
}

.rec-import-table .receipt-subrows-strip-row {
  display: table-row !important;
  width: 100% !important;
  background: #f7f9ff !important;
}

.receipt-subrows-strip-row > td,
.rec-import-table .receipt-subrows-strip-row > td {
  display: table-cell !important;
  width: 100% !important;
  max-width: none !important;
  padding: 0 !important;
  background: #f7f9ff !important;
  box-sizing: border-box !important;
}

.receipt-subrows-strip,
.rec-import-table .receipt-subrows-strip {
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  padding: 9px 14px !important;
  border-top: 1px solid #dce6ff !important;
  border-bottom: 1px solid #dce6ff !important;
  background: #f7f9ff !important;
}

.receipt-subrows-strip-summary {
  flex: 1 1 auto;
}

.receipt-subrows-strip-toggle {
  margin-left: auto;
}

@media (max-width: 760px) {
  .receipt-subrows-strip,
  .rec-import-table .receipt-subrows-strip {
    padding: 10px 12px !important;
  }
}
`;
  changed = true;
}

for (const token of [
  "const displayStatus = r.status === 'Ошибка' && p?.recognitionPending ? 'Требует проверки' : r.status;",
  "Стоимость не распознана",
  "Проверить и заполнить",
  "Receipt import hardening",
]) {
  const body = token === 'Receipt import hardening' ? css : source;
  if (!body.includes(token)) throw new Error(`Не подтверждено исправление импорта: ${token}`);
}

if (changed) {
  await writeFile(pageUrl, source, 'utf8');
  await writeFile(cssUrl, css, 'utf8');
}
console.log(changed ? 'Импорт квитанций стабилизирован: без ложных нулей, тупиковых ошибок и узкой полосы бланков.' : 'Импорт квитанций уже стабилизирован.');
