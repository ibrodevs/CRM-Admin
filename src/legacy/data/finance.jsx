function f$(n) { return Math.round(n).toLocaleString('ru-RU') + ' $'; }
function fSigned(n) { return (n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('ru-RU') + ' $'; }
function finNow() { return new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function deltaTone(n) { return n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--muted)'; }

function finCreditCheck(clientName) {
  const cps = (typeof FIN_COUNTERPARTIES !== 'undefined') ? FIN_COUNTERPARTIES : [];
  const cp = cps.find((c) => c.type === 'client' && clientName && (c.name === clientName || clientName.includes(c.name) || c.name.includes(clientName)));
  if (!cp) return { ok: true, cp: null, problems: [] };
  const overdue = cp.obligations.filter((o) => o.overdueDays > 0);
  const overdueSum = overdue.reduce((s, o) => s + o.rest, 0);
  const free = cp.limit ? Math.max(0, cp.limit - cp.used) : null;
  const exceeded = cp.limit ? cp.used > cp.limit : false;
  const problems = [];
  if (overdueSum > 0) problems.push('просроченная задолженность ' + f$(overdueSum) + ' по ' + overdue.length + ' док.');
  if (exceeded) problems.push('превышен кредитный лимит');
  else if (free != null && free < 2000) problems.push('лимит почти исчерпан (свободно ' + f$(free) + ')');
  const block = (overdueSum > 0 || exceeded) && cp.approveOnExceed;
  const nearestDue = cp.obligations.slice().sort((a, b) => a.due.localeCompare(b.due))[0];
  return { ok: problems.length === 0, cp, overdueSum, exceeded, free, block, problems, nearestDue };
}

const FIN_ACCT_GROUPS = [
  { key: 'Расчётные счета', icon: 'bank' },
  { key: 'Корпоративные карты', icon: 'finance' },
  { key: 'Касса', icon: 'calc' },
  { key: 'Эквайринг', icon: 'swap' },
  { key: 'Электронные кошельки', icon: 'globe' },
  { key: 'Депозиты', icon: 'shield' },
];
const FIN_ACCOUNTS = [
  { id: 'ac-1', group: 'Расчётные счета', name: 'Основной · KGS', bank: 'Оптима Банк', number: '1280 0012 3456 7890', currency: 'USD', balance: 84200, available: 78600, reserved: 5600, unmatched: 2, synced: 'сегодня 11:40' },
  { id: 'ac-2', group: 'Расчётные счета', name: 'Валютный · USD', bank: 'Демир Банк', number: '1090 0098 7654 3210', currency: 'USD', balance: 41250, available: 41250, reserved: 0, unmatched: 0, synced: 'сегодня 11:38' },
  { id: 'ac-3', group: 'Корпоративные карты', name: 'Visa Business ···4021', bank: 'Оптима Банк', number: '4021', currency: 'USD', balance: 6120, available: 5400, reserved: 720, unmatched: 1, synced: 'сегодня 09:15' },
  { id: 'ac-4', group: 'Корпоративные карты', name: 'Mastercard ···7788', bank: 'MBank', number: '7788', currency: 'USD', balance: 2340, available: 2340, reserved: 0, unmatched: 0, synced: 'вчера 19:02' },
  { id: 'ac-5', group: 'Касса', name: 'Касса офиса', bank: '—', number: 'CASH-01', currency: 'USD', balance: 3180, available: 3180, reserved: 0, unmatched: 0, synced: 'сегодня 10:00' },
  { id: 'ac-6', group: 'Эквайринг', name: 'Интернет-эквайринг', bank: 'Оптима Банк', number: 'ACQ-55', currency: 'USD', balance: 9450, available: 0, reserved: 9450, unmatched: 3, synced: 'сегодня 11:20', note: 'В пути · зачисление T+1' },
  { id: 'ac-7', group: 'Электронные кошельки', name: 'Balance.kg', bank: '—', number: 'WALLET-118', currency: 'USD', balance: 1870, available: 1870, reserved: 0, unmatched: 0, synced: 'сегодня 08:44' },
  { id: 'ac-8', group: 'Депозиты', name: 'Срочный депозит 6 мес.', bank: 'Демир Банк', number: 'DEP-2026-04', currency: 'USD', balance: 30000, available: 0, reserved: 30000, unmatched: 0, synced: '01.07.2026', note: 'Погашение 04.10.2026 · 12% годовых' },
];
const FIN_ACCT_OP_TYPES =['Поступление от клиента', 'Оплата поставщику', 'Возврат клиенту', 'Комиссия банка', 'Инкассация', 'Внутренний перевод'];
function acctOps(ac) {
  const rows = [];
  let bal = ac.balance;
  const seed = ac.id.charCodeAt(3);
  for (let i = 0; i < 8; i++) {
    const inflow = (i + seed) % 3 !== 0;
    const amt = 200 + ((i * 137 + seed * 53) % 1800);
    const sum = inflow ? amt : -amt;
    const type = inflow ? (i % 2 ? 'Поступление от клиента' : 'Эквайринг T+1') : FIN_ACCT_OP_TYPES[1 + (i % 3)];
    rows.push({
      date: '1' + (4 - Math.floor(i / 2)) + '.07.2026', time: (11 - i) + ':' + String((seed * 7 + i * 11) % 60).padStart(2, '0'),
      sum, currency: ac.currency, type, party: inflow ? ['ОсОО "Гранд лимитед"', 'Нуралиев Данияр', 'ИП Мамажанов'][i % 3] : ['Turkish Airlines', 'Hilton Istanbul', 'Оптима Банк'][i % 3],
      order: [51162, 51170, 51168, 51155][i % 4], service: ['Авиа', 'Гостиница', 'Трансфер', '—'][i % 4],
      doc: inflow ? 'Счёт № 61' + (50 + i) : 'Плат. поручение № 3' + (20 + i), resp: ['Даниель', 'Азамат', 'Куба'][i % 3],
      comment: inflow ? '' : 'По брони', status: i === 0 ? 'В обработке' : 'Проведено', balanceAfter: bal,
    });
    bal -= sum;
  }
  return rows;
}

const FIN_PAY_STATUS = {
  'Черновик': 'gray', 'На согласовании': 'amber', 'Согласовано': 'blue', 'Подготовлено': 'blue',
  'Отправлено': 'teal', 'Исполнено': 'green', 'Отклонено': 'red', 'Отменено': 'gray', 'Возвращено': 'red',
};
const FIN_PRIORITY = { 'Высокий': 'red', 'Средний': 'amber', 'Низкий': 'gray' };
const FIN_PAYMENTS = [
  { no: 'PMT-5041', dir: 'in', date: '14.07.2026', plan: '14.07.2026', party: 'ОсОО "Гранд лимитед"', requisites: 'р/с 1280·7890 · Оптима Банк', sum: 4500, currency: 'USD', purpose: 'Оплата по счёту № 6152 (заказ 51162)', order: 51162, supplier: '—', client: 'ОсОО "Гранд лимитед"', resp: 'Даниель', priority: 'Высокий', status: 'Исполнено',
    services: [{ t: 'Авиа FRU→IST · группа', sum: 3120 }, { t: 'Гостиница Hilton · 3 ночи', sum: 955 }, { t: 'Трансфер аэропорт→отель', sum: 425 }], fees: [{ t: 'Комиссия банка', sum: 22 }, { t: 'Комиссия платёжной системы', sum: 0 }],
    docs: ['Счёт № 6152', 'Акт № 2041'], history: [{ t: '14.07 · 12:30', text: 'Создан из счёта', who: 'Система' }, { t: '14.07 · 15:40', text: 'Платёж проведён', who: 'Даниель' }],
    approvals: [{ who: 'Старший оператор', at: '14.07 · 13:10', ok: true }, { who: 'Финансовый контроль', at: '14.07 · 14:05', ok: true }] },
  { no: 'PMT-5042', dir: 'out', date: '15.07.2026', plan: '16.07.2026', party: 'Turkish Airlines (групп. отдел)', requisites: 'IBAN TR33·0006 · Garanti', sum: 3030, currency: 'USD', purpose: 'Оплата группового блока (заказ 51162)', order: 51162, supplier: 'Turkish Airlines', client: '—', resp: 'Даниель', priority: 'Высокий', status: 'На согласовании',
    services: [{ t: 'Авиаблок 20 мест', sum: 3030 }], fees: [{ t: 'Банковская комиссия (SWIFT)', sum: 25 }],
    docs: ['Инвойс TA-8841'], history: [{ t: '15.07 · 09:10', text: 'Создан по тайм-лимиту выписки', who: 'Система' }], approvals: [{ who: 'Старший оператор', at: '15.07 · 09:40', ok: true }, { who: 'Финансовый контроль', at: null, ok: null }] },
  { no: 'PMT-5043', dir: 'out', date: '16.07.2026', plan: '17.07.2026', party: 'Hilton Istanbul', requisites: 'Local supplier · договор HIL-12', sum: 720, currency: 'USD', purpose: 'Доплата за номера (заказ 51162)', order: 51162, supplier: 'Hilton Istanbul', client: '—', resp: 'Азамат', priority: 'Средний', status: 'Подготовлено',
    services: [{ t: 'Гостиница · 3 номера', sum: 720 }], fees: [], docs: ['Ваучер HIL-2231'], history: [{ t: '16.07 · 08:20', text: 'Создан оператором', who: 'Азамат' }], approvals: [{ who: 'Старший оператор', at: '16.07 · 08:55', ok: true }] },
  { no: 'PMT-5044', dir: 'in', date: '17.07.2026', plan: '18.07.2026', party: 'Нуралиев Данияр', requisites: 'Карта ···4021', sum: 1660, currency: 'USD', purpose: 'Оплата заказа 51168', order: 51168, supplier: '—', client: 'Нуралиев Данияр', resp: 'Азамат', priority: 'Средний', status: 'Отправлено',
    services: [{ t: 'Авиа Алматы', sum: 1660 }], fees: [{ t: 'Эквайринг 1.8%', sum: 30 }], docs: ['Счёт № 6161'], history: [{ t: '17.07 · 10:05', text: 'Ссылка на оплату отправлена', who: 'Азамат' }], approvals: [] },
  { no: 'PMT-5045', dir: 'out', date: '10.07.2026', plan: '10.07.2026', party: 'Клиент · возврат', requisites: 'Карта ···7788', sum: 176, currency: 'USD', purpose: 'Возврат со штрафом (заказ 51155)', order: 51155, supplier: '—', client: 'ИП Мамажанов', resp: 'Даниель', priority: 'Низкий', status: 'Возвращено',
    services: [{ t: 'Трансфер (возврат)', sum: 220 }], fees: [{ t: 'Штраф 20%', sum: 44 }], docs: ['Заявление на возврат'], history: [{ t: '10.07 · 11:00', text: 'Возврат 176 $ проведён', who: 'Даниель' }], approvals: [{ who: 'Финансовый контроль', at: '10.07 · 10:30', ok: true }] },
  { no: 'PMT-5046', dir: 'out', date: '18.07.2026', plan: '20.07.2026', party: 'Оператор · Даниель', requisites: 'Ведомость ЗП июль', sum: 1240, currency: 'USD', purpose: 'Вознаграждение оператора (июль)', order: null, supplier: '—', client: '—', resp: 'Бухгалтерия', priority: 'Низкий', status: 'Черновик',
    services: [{ t: '% от прибыли по 14 заказам', sum: 1240 }], fees: [], docs: ['Расчётная ведомость'], history: [{ t: '18.07 · 12:00', text: 'Сформировано автоматически', who: 'Система' }], approvals: [] },
];

function obl(order, doc, sum, paid, since, due, overdueDays) {
  const rest = sum - paid;
  const status = rest <= 0 ? 'Оплачено' : overdueDays > 0 ? 'Просрочено' : 'Ожидает оплаты';
  return { order, doc, sum, paid, rest, since, due, daysToDue: overdueDays > 0 ? -overdueDays : 6, overdueDays, status };
}
const FIN_COUNTERPARTIES = [
  { id: 'cp-1', type: 'client', name: 'ОсОО "Гранд лимитед"', legal: 'ОсОО «Гранд лимитед»', scheme: 'Кредитный лимит', deferralDays: 14, deferralStart: 'от даты акта', limit: 30000, used: 21400, currency: 'USD', guaranteeLetter: true, approveOnExceed: true,
    debt: 13340, paid: 2220, balance: 13340, invoices: ['Счёт № 6152 · 4500 $'], acts: ['Акт № 2041 · подписан'], orders: [51162, 51163],
    obligations: [obl(51162, 'Счёт № 6152', 4500, 2220, '14.07', '28.07', 0), obl(51163, 'Счёт № 6108', 8840, 0, '02.07', '16.07', 1)],
    payHistory: [{ t: '14.07', text: 'Оплата 2 220 $ по заказу 51162' }, { t: '28.06', text: 'Оплата 6 100 $ по заказу 51140' }],
    discipline: { avgPayDays: 11, avgOverdue: 2, maxOverdue: 9, overdueSum: 8840, onTimePct: 82, rating: 'B' } },
  { id: 'cp-2', type: 'client', name: 'ОсОО "Asia Travel"', legal: 'ОсОО «Asia Travel»', scheme: 'Постоплата', deferralDays: 30, deferralStart: 'от даты выписки', limit: 50000, used: 12400, currency: 'USD', guaranteeLetter: true, approveOnExceed: false,
    debt: 12400, paid: 0, balance: 12400, invoices: ['Счёт № 6170 · 12 400 $'], acts: [], orders: [51180],
    obligations: [obl(51180, 'Счёт № 6170', 12400, 0, '10.07', '09.08', 0)],
    payHistory: [{ t: '05.07', text: 'Оплата 9 800 $ по заказу 51120' }],
    discipline: { avgPayDays: 24, avgOverdue: 0, maxOverdue: 3, overdueSum: 0, onTimePct: 96, rating: 'A' } },
  { id: 'cp-3', type: 'client', name: 'ИП Мамажанов Абдутаир', legal: 'ИП Мамажанов А.', scheme: 'Частичная предоплата', deferralDays: 7, deferralStart: 'от даты счёта', limit: 8000, used: 7600, currency: 'USD', guaranteeLetter: false, approveOnExceed: true,
    debt: 3200, paid: 4400, balance: 3200, invoices: ['Счёт № 6140 · 3 200 $'], acts: ['Акт № 2018'], orders: [51155],
    obligations: [obl(51155, 'Счёт № 6140', 3200, 0, '20.06', '27.06', 18)],
    payHistory: [{ t: '20.06', text: 'Предоплата 4 400 $' }],
    discipline: { avgPayDays: 19, avgOverdue: 14, maxOverdue: 22, overdueSum: 3200, onTimePct: 54, rating: 'C' } },
  { id: 'cp-4', type: 'supplier', name: 'Turkish Airlines (групп. отдел)', legal: 'Turkish Airlines Inc.', scheme: 'Депозит', deferralDays: 0, deferralStart: '—', limit: 0, used: 0, currency: 'USD', guaranteeLetter: false, approveOnExceed: false,
    debt: 3030, paid: 0, balance: 3030, invoices: ['Инвойс TA-8841 · 3 030 $'], acts: [], orders: [51162],
    obligations: [obl(51162, 'Инвойс TA-8841', 3030, 0, '15.07', '17.07', 0)],
    payHistory: [{ t: '01.07', text: 'Пополнение депозита 10 000 $' }],
    discipline: { avgPayDays: 2, avgOverdue: 0, maxOverdue: 0, overdueSum: 0, onTimePct: 100, rating: 'A' } },
  { id: 'cp-5', type: 'supplier', name: 'Hilton Istanbul', legal: 'Hilton Hotels', scheme: 'Постоплата', deferralDays: 10, deferralStart: 'от даты выезда', limit: 15000, used: 720, currency: 'USD', guaranteeLetter: false, approveOnExceed: false,
    debt: 720, paid: 235, balance: 720, invoices: ['Ваучер HIL-2231 · 720 $'], acts: [], orders: [51162],
    obligations: [obl(51162, 'Ваучер HIL-2231', 955, 235, '14.07', '24.07', 0)],
    payHistory: [{ t: '28.06', text: 'Оплата 1 240 $ по заказу 51140' }],
    discipline: { avgPayDays: 8, avgOverdue: 0, maxOverdue: 2, overdueSum: 0, onTimePct: 94, rating: 'A' } },
];
const FIN_SCHEMES = ['Предоплата', 'Частичная предоплата', 'Постоплата', 'Депозит', 'Кредитный лимит'];

const FIN_CASHFLOW = [
  { m: 'Фев', in: 62000, out: 48000 }, { m: 'Мар', in: 71000, out: 55000 }, { m: 'Апр', in: 58000, out: 61000 },
  { m: 'Май', in: 83000, out: 59000 }, { m: 'Июн', in: 94000, out: 67000 }, { m: 'Июл', in: 78000, out: 71000 },
];
const FIN_RECEIPTS = [
  { party: 'ОсОО "Asia Travel"', sum: 12400, date: '09.08.2026', basis: 'Счёт № 6170', resp: 'Куба', overdue: false },
  { party: 'ОсОО "Гранд лимитед"', sum: 4500, date: '28.07.2026', basis: 'Счёт № 6152', resp: 'Даниель', overdue: false },
  { party: 'ОсОО "Гранд лимитед"', sum: 8840, date: '16.07.2026', basis: 'Счёт № 6108', resp: 'Даниель', overdue: true },
  { party: 'ИП Мамажанов', sum: 3200, date: '27.06.2026', basis: 'Счёт № 6140', resp: 'Даниель', overdue: true },
  { party: 'Нуралиев Данияр', sum: 1660, date: '18.07.2026', basis: 'Счёт № 6161', resp: 'Азамат', overdue: false },
];
const FIN_SALARY = [
  { operator: 'Даниель', scheme: '% от прибыли (20%) + фикс за тип услуги', base: 'прибыль', total: 1240,
    accruals: [{ order: 51162, service: 'Авиа группа', base: 620, rule: '20% от прибыли', amount: 124 }, { order: 51162, service: 'Гостиница', base: 190, rule: '20% от прибыли', amount: 38 }, { order: 51163, service: 'Пакет', base: 3900, rule: '20% + 15$/усл.', amount: 1078 }] },
  { operator: 'Азамат А.', scheme: '% от сервисного сбора (35%)', base: 'серв. сбор', total: 410,
    accruals: [{ order: 51168, service: 'Авиа', base: 80, rule: '35% от сбора', amount: 28 }, { order: 51172, service: 'Отель', base: 1092, rule: '35% от сбора', amount: 382 }] },
  { operator: 'Куба', scheme: 'Комбинированная (фикс 300$ + 10% прибыли)', base: 'комбо', total: 760,
    accruals: [{ order: 51180, service: 'Пакет корп.', base: 4600, rule: 'фикс 300 + 10%', amount: 760 }] },
];
const FIN_RULES = [
  { group: 'Сервисные сборы', items: [{ t: 'Авиа', v: '3% (мин. 15 $)' }, { t: 'Гостиницы', v: '8%' }, { t: 'ЖД', v: 'фикс 5 $' }, { t: 'Трансфер', v: '10%' }] },
  { group: 'Надбавки и скидки', items: [{ t: 'Надбавка VIP', v: '+7%' }, { t: 'Скидка корп. клиент', v: '−4%' }] },
  { group: 'Комиссии', items: [{ t: 'Комиссия платёжной системы', v: '1.8% (эквайринг)' }, { t: 'Банковская комиссия', v: '25 $ (SWIFT)' }, { t: 'Внутренняя комиссия компании', v: '1%' }] },
  { group: 'Схемы начисления ЗП', items: [{ t: 'Оператор Даниель', v: '20% прибыли + фикс' }, { t: 'Оператор Азамат', v: '35% серв. сбора' }] },
  { group: 'Выплаты локальным поставщикам', items: [{ t: 'Hilton Istanbul', v: 'постоплата 10 дней' }, { t: 'Локальные трансферы', v: 'предоплата' }] },
  { group: 'Правила прибыли и налоги', items: [{ t: 'Налог с прибыли', v: '10%' }, { t: 'Курсовые разницы', v: 'по курсу НБ КР на дату' }, { t: 'Правило по юр. лицу', v: 'ОсОО «Гранд» — без НДС' }] },
];
const FIN_RECON_STATUS = { 'Сопоставлено автоматически': 'green', 'Сопоставлено вручную': 'teal', 'Не найдено соответствие': 'amber', 'Конфликт': 'red' };
const FIN_RECON = [
  { id: 'BNK-9001', date: '14.07.2026', sum: 4500, party: 'ОсОО "Гранд лимитед"', matched: 'PMT-5041 · заказ 51162', status: 'Сопоставлено автоматически' },
  { id: 'BNK-9002', date: '17.07.2026', sum: 1660, party: 'Нуралиев Д.', matched: 'PMT-5044 · заказ 51168', status: 'Сопоставлено автоматически' },
  { id: 'BNK-9003', date: '16.07.2026', sum: 720, party: 'HILTON IST TR', matched: 'PMT-5043 (вручную)', status: 'Сопоставлено вручную' },
  { id: 'BNK-9004', date: '17.07.2026', sum: 980, party: 'IBAN ···5521', matched: '—', status: 'Не найдено соответствие' },
  { id: 'BNK-9005', date: '18.07.2026', sum: 3030, party: 'TURKISH AIRLINES', matched: 'PMT-5042 · суммы расходятся (+25)', status: 'Конфликт' },
];
const FIN_ACTIONS = [
  { t: '18.07 · 12:00', user: 'Система', action: 'Сформирован платёж ЗП', field: 'PMT-5046', oldV: '—', newV: '1 240 $', reason: 'Расчёт вознаграждения за июль' },
  { t: '16.07 · 08:55', user: 'Азамат А.', action: 'Изменена сумма платежа', field: 'PMT-5043.sum', oldV: '955 $', newV: '720 $', reason: 'Сокращение числа номеров' },
  { t: '15.07 · 14:05', user: 'Финансовый контроль', action: 'Согласование платежа', field: 'PMT-5041', oldV: 'На согласовании', newV: 'Исполнено', reason: 'Оплата подтверждена банком' },
  { t: '14.07 · 12:30', user: 'Даниель', action: 'Создан счёт', field: 'Счёт № 6152', oldV: '—', newV: '4 500 $', reason: 'Согласованное КП-1042' },
];




const FIN_SVC_MODEL = {
  'Авиа': [
    { l: 'Стоимость поставщика', v: 2800, k: 'cost' }, { l: 'Тариф', v: 2600, k: 'client' }, { l: 'Таксы', v: 200, k: 'client' },
    { l: 'Сервисный сбор', v: 90, k: 'client' }, { l: 'Надбавка', v: 60, k: 'client' }, { l: 'Скидка', v: -40, k: 'client' }, { l: 'Доп. услуги (багаж, места)', v: 70, k: 'client' },
    { l: 'Агентская комиссия', v: 120, k: 'inc' }, { l: 'Комиссия поставщика', v: 90, k: 'inc' },
    { l: 'Комиссия платёжной системы', v: -32, k: 'exp' }, { l: 'Банковская комиссия', v: -12, k: 'exp' }, { l: 'Вознаграждение оператора', v: -48, k: 'exp' },
  ],
  'Гостиница': [
    { l: 'Стоимость поставщика (себестоимость)', v: 780, k: 'cost' }, { l: 'Цена номера клиенту', v: 900, k: 'client' }, { l: 'Сервисный сбор', v: 76, k: 'client' }, { l: 'Надбавка', v: 40, k: 'client' },
    { l: 'Комиссия поставщика', v: 95, k: 'inc' }, { l: 'Комиссия платёжной системы', v: -14, k: 'exp' }, { l: 'Вознаграждение оператора', v: -20, k: 'exp' },
  ],
  'ЖД': [{ l: 'Стоимость поставщика', v: 96, k: 'cost' }, { l: 'Тариф', v: 96, k: 'client' }, { l: 'Сервисный сбор', v: 8, k: 'client' }, { l: 'Вознаграждение оператора', v: -3, k: 'exp' }],
  'Трансфер': [{ l: 'Стоимость поставщика (локальный)', v: 34, k: 'cost' }, { l: 'Стоимость клиенту', v: 60, k: 'client' }, { l: 'Сервисный сбор', v: 8, k: 'client' }, { l: 'Надбавка', v: 4, k: 'client' }, { l: 'Вознаграждение оператора', v: -6, k: 'exp' }],
};
const sumK = (rows, k) => rows.filter((r) => r.k === k).reduce((s, r) => s + r.v, 0);
function svcClientTotal(rows) { return sumK(rows, 'client'); }
function svcSupplierPay(rows) { return sumK(rows, 'cost'); }
function svcModelProfit(rows) { return sumK(rows, 'client') - sumK(rows, 'cost') + sumK(rows, 'inc') + sumK(rows, 'exp'); }

const FIN_ANALYTICS_SLICES = {
  'Операторы': [{ n: 'Даниель', profit: 8200, orders: 7 }, { n: 'Азамат А.', profit: 3100, orders: 4 }, { n: 'Куба', profit: 4600, orders: 2 }],
  'Поставщики': [{ n: 'Turkish Airlines', profit: 3900, orders: 5 }, { n: 'Hilton Istanbul', profit: 1200, orders: 3 }, { n: 'Ratehawk', profit: 2100, orders: 6 }],
  'Клиенты': [{ n: 'Гранд лимитед', profit: 5400, orders: 4 }, { n: 'Asia Travel', profit: 6100, orders: 3 }, { n: 'Мамажанов', profit: 900, orders: 2 }],
  'Виды услуг': [{ n: 'Авиа', profit: 7100, orders: 12 }, { n: 'Гостиницы', profit: 4200, orders: 9 }, { n: 'Трансферы', profit: 800, orders: 6 }, { n: 'Визы', profit: 1200, orders: 3 }],
};

const ENABLE_DEMO_BUSINESS_DATA = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
if (!ENABLE_DEMO_BUSINESS_DATA) {
  [
    FIN_ACCOUNTS, FIN_PAYMENTS, FIN_COUNTERPARTIES, FIN_CASHFLOW,
    FIN_RECEIPTS, FIN_SALARY, FIN_RECON, FIN_ACTIONS,
  ].forEach((items) => { if (Array.isArray(items)) items.splice(0, items.length); });
  Object.keys(FIN_ANALYTICS_SLICES).forEach((key) => { FIN_ANALYTICS_SLICES[key] = []; });
}

export { f$, fSigned, finNow, deltaTone, finCreditCheck, FIN_ACCT_GROUPS, FIN_ACCOUNTS, FIN_ACCT_OP_TYPES, acctOps, FIN_PAY_STATUS, FIN_PRIORITY, FIN_PAYMENTS, obl, FIN_COUNTERPARTIES, FIN_SCHEMES, FIN_CASHFLOW, FIN_RECEIPTS, FIN_SALARY, FIN_RULES, FIN_RECON_STATUS, FIN_RECON, FIN_ACTIONS, FIN_SVC_MODEL, sumK, svcClientTotal, svcSupplierPay, svcModelProfit, FIN_ANALYTICS_SLICES };
