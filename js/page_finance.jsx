import { useState } from 'react';
import { Icon } from './icons';
import { Button, Drawer, FilterChip, Pill, Select, Tabs, useToast } from './ui';
import { SERVICE_KIND } from './data';
import { Topbar } from './layout';

// ===== Финансовый модуль (ТЗ: полноценное управление финансами компании) =====
// Единый раздел «Финансы»: обзор, баланс организации, журнал платежей, казначейство,
// взаиморасчёты (отсрочки/лимиты/график погашения), экономика услуг и заказов,
// денежные потоки и аналитика, центр финправил + банковская сверка + журнал финдействий.
// Вся цепочка связана: Банковская операция → Платёж → Документ → Услуга → Заказ →
// Клиент → Юр. лицо → Поставщик → Финансовый результат.

/* ---------- helpers ---------- */
function f$(n) { return Math.round(n).toLocaleString('ru-RU') + ' $'; }
function fSigned(n) { return (n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('ru-RU') + ' $'; }
function finNow() { return new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function deltaTone(n) { return n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--muted)'; }

// Проверка кредитных условий контрагента при оформлении нового заказа (ТЗ «Контроль
// кредитного лимита»): наличие просрочки, превышение лимита, возможность оформления.
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
  // «предупреждать или запрещать в соответствии с настройками»: блок при просрочке/превышении, если включено согласование
  const block = (overdueSum > 0 || exceeded) && cp.approveOnExceed;
  const nearestDue = cp.obligations.slice().sort((a, b) => a.due.localeCompare(b.due))[0];
  return { ok: problems.length === 0, cp, overdueSum, exceeded, free, block, problems, nearestDue };
}

/* ---------- Мок-данные: баланс организации ---------- */
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
// история операций по счёту (демо-генерация от текущего остатка вниз)
const FIN_ACCT_OP_TYPES = ['Поступление от клиента', 'Оплата поставщику', 'Возврат клиенту', 'Комиссия банка', 'Инкассация', 'Внутренний перевод'];
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

/* ---------- Мок-данные: журнал платежей ---------- */
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

/* ---------- Мок-данные: контрагенты (взаиморасчёты, отсрочки, лимиты, дисциплина) ---------- */
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

/* ---------- Мок-данные: денежные потоки, поступления, ЗП, правила, сверка, журнал ---------- */
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

/* ---------- Полная финмодель услуги (ТЗ: авиа-пример и др. виды) ----------
   Категории строк: cost — стоимость поставщика (себестоимость); client — то, что
   платит клиент (скидка со знаком минус); inc — доход агентства сверх цены клиента
   (комиссии поставщика/агентские); exp — расходы (со знаком минус).
   Клиенту = Σ client; Поставщику = cost; Прибыль = Σclient − cost + Σinc + Σexp. */
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

/* ==================================================================== */
/* Общие мелкие компоненты                                              */
/* ==================================================================== */
function StatTile({ label, value, tone, sub, icon, onClick, accent }) {
  return (
    <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default', padding: '18px 20px', borderColor: accent || 'var(--line)' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon && <Icon name={icon} style={{ width: 15, height: 15, color: 'var(--muted-2)' }} />}
        <span className="s-label" style={{ margin: 0, fontSize: 13 }}>{label}</span>
      </div>
      <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: tone || 'var(--ink)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
function WarnBanner({ tone = 'red', icon = 'alertTriangle', title, text, action }) {
  const bg = tone === 'red' ? 'var(--red-bg)' : 'var(--amber-bg)';
  const col = tone === 'red' ? 'var(--red)' : 'var(--amber)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: bg, marginBottom: 12 }}>
      <Icon name={icon} style={{ width: 20, height: 20, color: col, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13.5 }}>{title}</div>
        {text && <div style={{ fontSize: 12.5, color: 'var(--body)' }}>{text}</div>}
      </div>
      {action}
    </div>
  );
}
// SVG-график денежных потоков: приход/расход столбцами + линия остатка
function CashflowChart({ data, startBalance = 60000 }) {
  const W = 640, H = 190, pad = 28, bw = (W - pad * 2) / data.length;
  const max = Math.max(...data.map((d) => Math.max(d.in, d.out))) * 1.15;
  let bal = startBalance;
  const balances = data.map((d) => (bal += d.in - d.out));
  const bmax = Math.max(...balances) * 1.1, bmin = Math.min(...balances, 0);
  const by = (v) => H - pad - ((v - bmin) / (bmax - bmin)) * (H - pad * 2);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--line-strong)" />
      {data.map((d, i) => {
        const cx = pad + i * bw + bw / 2;
        return (
          <g key={i}>
            <rect x={cx - 13} y={y(d.in)} width={12} height={H - pad - y(d.in)} rx={3} fill="var(--green)" opacity="0.85" />
            <rect x={cx + 1} y={y(d.out)} width={12} height={H - pad - y(d.out)} rx={3} fill="var(--red)" opacity="0.8" />
            <text x={cx} y={H - pad + 15} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.m}</text>
          </g>
        );
      })}
      <polyline fill="none" stroke="var(--blue-soft-text)" strokeWidth="2.5"
        points={balances.map((v, i) => (pad + i * bw + bw / 2) + ',' + by(v)).join(' ')} />
      {balances.map((v, i) => <circle key={i} cx={pad + i * bw + bw / 2} cy={by(v)} r="3.5" fill="var(--blue-soft-text)" />)}
    </svg>
  );
}
function LegendDot({ color, label }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}</span>;
}
// строка «ключ — значение» с цветом суммы
function FinRow({ label, value, tone, strong }) {
  return (
    <div className="kv-row" style={{ padding: '9px 0' }}>
      <span className="k" style={{ fontSize: 13.5 }}>{label}</span>
      <span className="v" style={{ fontSize: 13.5, color: tone || 'var(--ink)', fontWeight: strong ? 800 : 600 }}>{value}</span>
    </div>
  );
}

/* ==================================================================== */
/* 1. ОБЗОР — главный финансовый экран                                  */
/* ==================================================================== */
function FinOverview({ onGoTab }) {
  const totalCash = FIN_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const inTransit = FIN_ACCOUNTS.filter((a) => a.group === 'Эквайринг').reduce((s, a) => s + a.reserved, 0);
  const bySrc = (g) => FIN_ACCOUNTS.filter((a) => a.group === g).reduce((s, a) => s + a.balance, 0);
  const receivable = FIN_COUNTERPARTIES.filter((c) => c.type === 'client').reduce((s, c) => s + c.debt, 0);
  const payable = FIN_COUNTERPARTIES.filter((c) => c.type === 'supplier').reduce((s, c) => s + c.debt, 0);
  const expected = FIN_RECEIPTS.filter((r) => !r.overdue).reduce((s, r) => s + r.sum, 0);
  const planned = FIN_PAYMENTS.filter((p) => p.dir === 'out' && !['Исполнено', 'Отменено', 'Возвращено'].includes(p.status)).reduce((s, p) => s + p.sum, 0);
  const overdue = FIN_RECEIPTS.filter((r) => r.overdue).reduce((s, r) => s + r.sum, 0);
  const profit = FIN_CASHFLOW.reduce((s, d) => s + (d.in - d.out), 0);
  const serviceFees = 2140;
  const recent = FIN_PAYMENTS.slice(0, 5);

  return (
    <div className="fade-in">
      {overdue > 0 && <WarnBanner tone="red" title={'Просроченная дебиторская задолженность: ' + f$(overdue)}
        text="2 контрагента вышли за срок оплаты — рекомендуется напоминание и проверка кредитных условий."
        action={<Button size="sm" variant="secondary" onClick={() => onGoTab('settlements')}>К взаиморасчётам</Button>} />}
      <WarnBanner tone="amber" icon="alertCircle" title="Риск кассового разрыва 20–22 июля"
        text={'К выплате ' + f$(planned) + ', ожидаемые поступления ' + f$(expected) + '. Проверьте приоритеты платежей в казначействе.'}
        action={<Button size="sm" variant="secondary" onClick={() => onGoTab('treasury')}>В казначейство</Button>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12, marginBottom: 12 }}>
        <StatTile label="Общий остаток ДС" value={f$(totalCash)} icon="finance" accent="var(--green)" sub="по всем источникам" onClick={() => onGoTab('balance')} />
        <StatTile label="Расчётные счета" value={f$(bySrc('Расчётные счета'))} icon="bank" onClick={() => onGoTab('balance')} />
        <StatTile label="Корп. карты" value={f$(bySrc('Корпоративные карты'))} icon="finance" onClick={() => onGoTab('balance')} />
        <StatTile label="Касса" value={f$(bySrc('Касса'))} icon="calc" onClick={() => onGoTab('balance')} />
        <StatTile label="Эл. кошельки" value={f$(bySrc('Электронные кошельки'))} icon="globe" onClick={() => onGoTab('balance')} />
        <StatTile label="ДС в пути (эквайринг)" value={f$(inTransit)} icon="swap" tone="var(--teal)" sub="зачисление T+1" />
        <StatTile label="Дебиторская задолженность" value={f$(receivable)} icon="arrowUpRight" tone="var(--amber)" onClick={() => onGoTab('settlements')} />
        <StatTile label="Кредиторская задолженность" value={f$(payable)} icon="arrowUpRight" tone="var(--red)" onClick={() => onGoTab('settlements')} />
        <StatTile label="Ожидаемые поступления" value={f$(expected)} icon="calendar" tone="var(--green)" onClick={() => onGoTab('settlements')} />
        <StatTile label="Запланированные выплаты" value={f$(planned)} icon="calendar" tone="var(--red)" onClick={() => onGoTab('treasury')} />
        <StatTile label="Текущая прибыль (период)" value={f$(profit)} icon="pie" tone="var(--green)" onClick={() => onGoTab('analytics')} />
        <StatTile label="Сервисные сборы (месяц)" value={f$(serviceFees)} icon="sparkles" onClick={() => onGoTab('economics')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 12, alignItems: 'start' }}>
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>Движение денежных средств</h3>
            <div style={{ display: 'flex', gap: 14 }}><LegendDot color="var(--green)" label="Приход" /><LegendDot color="var(--red)" label="Расход" /><LegendDot color="var(--blue-soft-text)" label="Остаток" /></div>
          </div>
          <CashflowChart data={FIN_CASHFLOW} />
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Платёжный календарь</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {[...FIN_RECEIPTS.map((r) => ({ dir: 'in', date: r.date, party: r.party, sum: r.sum, overdue: r.overdue })),
              ...FIN_PAYMENTS.filter((p) => p.dir === 'out').map((p) => ({ dir: 'out', date: p.plan, party: p.party, sum: p.sum, overdue: false }))]
              .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6).map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.dir === 'in' ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--muted-2)', width: 78, flexShrink: 0 }}>{e.date}</span>
                  <span style={{ flex: 1, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.party}</span>
                  <span style={{ fontWeight: 700, color: e.overdue ? 'var(--red)' : e.dir === 'in' ? 'var(--green)' : 'var(--body)' }}>{e.dir === 'in' ? '+' : '−'}{f$(e.sum).replace(' $', '')} $</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 className="card-title" style={{ fontSize: 16 }}>Последние финансовые операции</h3>
          <Button size="sm" variant="secondary" onClick={() => onGoTab('payments')}>Все платежи</Button>
        </div>
        <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
          <table className="tbl">
            <thead><tr><th>Платёж</th><th>Дата</th><th>Контрагент</th><th>Назначение</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Статус</th></tr></thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.no}>
                  <td style={{ fontWeight: 600 }}>{p.no}</td><td>{p.date}</td><td>{p.party}</td>
                  <td style={{ color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.purpose}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: p.dir === 'in' ? 'var(--green)' : 'var(--body)' }}>{p.dir === 'in' ? '+' : '−'}{f$(p.sum)}</td>
                  <td><Pill tone={FIN_PAY_STATUS[p.status]}>{p.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/* 2. БАЛАНС ОРГАНИЗАЦИИ                                                 */
/* ==================================================================== */
function FinAccountDrawer({ ac, onClose }) {
  const ops = acctOps(ac);
  return (
    <Drawer open={!!ac} onClose={onClose} title={ac.name} sub={ac.bank !== '—' ? ac.bank + ' · ' + ac.number : ac.number} width="min(760px,96vw)">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatTile label="Текущий остаток" value={f$(ac.balance)} />
        <StatTile label="Доступно" value={f$(ac.available)} tone="var(--green)" />
        <StatTile label="Зарезервировано" value={f$(ac.reserved)} tone={ac.reserved ? 'var(--amber)' : undefined} />
      </div>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <FinRow label="Банк" value={ac.bank} /><FinRow label="Номер / идентификатор" value={ac.number} />
        <FinRow label="Валюта" value={ac.currency} /><FinRow label="Несопоставленные операции" value={ac.unmatched} tone={ac.unmatched ? 'var(--amber)' : undefined} />
        <FinRow label="Последняя синхронизация" value={ac.synced} />
        {ac.note && <FinRow label="Примечание" value={ac.note} />}
      </div>
      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 10 }}>История операций по счёту</h3>
      <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
        <table className="tbl">
          <thead><tr><th>Дата · время</th><th>Тип</th><th>Контрагент</th><th>Заказ · услуга</th><th>Документ</th><th style={{ textAlign: 'right' }}>Сумма</th><th style={{ textAlign: 'right' }}>Остаток</th><th>Статус</th></tr></thead>
          <tbody>
            {ops.map((o, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>{o.date}<div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>{o.time}</div></td>
                <td>{o.type}</td><td>{o.party}</td>
                <td style={{ fontSize: 12.5 }}>№ {o.order}<div style={{ color: 'var(--muted-2)' }}>{o.service}</div></td>
                <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{o.doc}<div style={{ color: 'var(--muted-2)' }}>{o.resp}</div></td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: deltaTone(o.sum) }}>{fSigned(o.sum)}</td>
                <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{f$(o.balanceAfter)}</td>
                <td><Pill tone={o.status === 'Проведено' ? 'green' : 'amber'}>{o.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}
function FinBalance() {
  const [open, setOpen] = useState(null);
  const total = FIN_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const available = FIN_ACCOUNTS.reduce((s, a) => s + a.available, 0);
  const reserved = FIN_ACCOUNTS.reduce((s, a) => s + a.reserved, 0);
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
        <StatTile label="Всего денежных средств" value={f$(total)} tone="var(--green)" icon="finance" />
        <StatTile label="Доступно" value={f$(available)} icon="check" />
        <StatTile label="Зарезервировано / в пути" value={f$(reserved)} tone="var(--amber)" icon="clock" />
        <StatTile label="Несопоставлено операций" value={FIN_ACCOUNTS.reduce((s, a) => s + a.unmatched, 0)} tone="var(--amber)" icon="alertCircle" />
      </div>
      {FIN_ACCT_GROUPS.map((g) => {
        const accs = FIN_ACCOUNTS.filter((a) => a.group === g.key);
        if (!accs.length) return null;
        const sum = accs.reduce((s, a) => s + a.balance, 0);
        return (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name={g.icon} style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
              <h3 className="card-title" style={{ fontSize: 15 }}>{g.key}</h3>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>· {f$(sum)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
              {accs.map((a) => (
                <div key={a.id} className="card card-pad" style={{ cursor: 'pointer', padding: '16px 18px' }} onClick={() => setOpen(a)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.bank !== '—' ? a.bank + ' · ' : ''}{a.number}</div></div>
                    {a.unmatched > 0 && <Pill tone="amber">{a.unmatched} несопост.</Pill>}
                  </div>
                  <div className="s-value" style={{ fontSize: 22, marginBottom: 8 }}>{f$(a.balance)}</div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--muted)' }}>
                    <span>Доступно: <b style={{ color: 'var(--green)' }}>{f$(a.available)}</b></span>
                    {a.reserved > 0 && <span>Резерв: <b style={{ color: 'var(--amber)' }}>{f$(a.reserved)}</b></span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 8 }}>Синхронизация: {a.synced}{a.note ? ' · ' + a.note : ''}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {open && <FinAccountDrawer ac={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ==================================================================== */
/* 3. ЖУРНАЛ ПЛАТЕЖЕЙ                                                    */
/* ==================================================================== */
function FinPaymentDrawer({ p, onClose }) {
  const svcSum = p.services.reduce((s, x) => s + x.sum, 0);
  const feeSum = p.fees.reduce((s, x) => s + x.sum, 0);
  return (
    <Drawer open={!!p} onClose={onClose} title={p.no} sub={(p.dir === 'in' ? 'Входящий' : 'Исходящий') + ' платёж · ' + p.date}
      footer={<div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <Button variant="secondary" style={{ flex: 1 }} icon="download">Платёжное поручение</Button>
        <Button style={{ flex: 1 }} icon="check">Провести</Button>
      </div>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="s-value" style={{ fontSize: 26, color: p.dir === 'in' ? 'var(--green)' : 'var(--ink)' }}>{p.dir === 'in' ? '+' : '−'}{f$(p.sum)}</span>
        <Pill tone={FIN_PAY_STATUS[p.status]}>{p.status}</Pill>
        <Pill tone={FIN_PRIORITY[p.priority]}>Приоритет: {p.priority}</Pill>
      </div>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <FinRow label={p.dir === 'in' ? 'Отправитель' : 'Получатель'} value={p.party} />
        <FinRow label="Реквизиты" value={p.requisites} /><FinRow label="Назначение платежа" value={p.purpose} />
        <FinRow label="Связанный заказ" value={p.order ? '№ ' + p.order : '—'} />
        <FinRow label={p.dir === 'in' ? 'Клиент' : 'Поставщик'} value={p.dir === 'in' ? p.client : p.supplier} />
        <FinRow label="Ответственный" value={p.resp} /><FinRow label="Плановая дата" value={p.plan} />
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Оплачиваемые услуги</h3>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        {p.services.map((s, i) => <FinRow key={i} label={s.t} value={f$(s.sum)} />)}
        {p.fees.map((s, i) => <FinRow key={'f' + i} label={s.t} value={f$(s.sum)} tone="var(--amber)" />)}
        <FinRow label="Итого" value={f$(svcSum + feeSum)} strong />
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Документы-основания</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {p.docs.map((d, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '6px 11px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)' }}><Icon name="docs" style={{ width: 13, height: 13, color: 'var(--muted-2)' }} />{d}</span>)}
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Журнал согласования</h3>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        {p.approvals.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Согласование не требуется для этого типа платежа.</div>}
        {p.approvals.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < p.approvals.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <Icon name={a.ok === true ? 'checkCircle' : a.ok === false ? 'x' : 'clock'} style={{ width: 16, height: 16, color: a.ok === true ? 'var(--green)' : a.ok === false ? 'var(--red)' : 'var(--amber)' }} />
            <span style={{ flex: 1, fontSize: 13 }}>{a.who}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{a.at || 'ожидает'}</span>
          </div>
        ))}
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>История изменений</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {p.history.map((h, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--body)' }}><span style={{ color: 'var(--muted-2)', marginRight: 6 }}>{h.t}</span>{h.text} · <span style={{ color: 'var(--muted)' }}>{h.who}</span></div>)}
      </div>
    </Drawer>
  );
}
function FinPayments() {
  const [open, setOpen] = useState(null);
  const [dir, setDir] = useState('all');
  const [status, setStatus] = useState('');
  const list = FIN_PAYMENTS.filter((p) => (dir === 'all' || p.dir === dir) && (!status || p.status === status));
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Tabs tabs={[{ key: 'all', label: 'Все' }, { key: 'in', label: 'Входящие' }, { key: 'out', label: 'Исходящие' }]} value={dir} onChange={setDir} />
        <div style={{ flex: 1 }} />
        <FilterChip label="Статус" value={status} onChange={setStatus} options={['', ...Object.keys(FIN_PAY_STATUS)]} />
        <Button icon="plus">Новый платёж</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>№</th><th>Дата</th><th>Направление</th><th>Контрагент</th><th>Заказ</th><th>Назначение</th><th>Ответственный</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Приоритет</th><th>Статус</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.no} style={{ cursor: 'pointer' }} onClick={() => setOpen(p)}>
                <td style={{ fontWeight: 600 }}>{p.no}</td><td>{p.date}</td>
                <td><Pill tone={p.dir === 'in' ? 'green' : 'gray'}>{p.dir === 'in' ? 'Входящий' : 'Исходящий'}</Pill></td>
                <td>{p.party}</td><td>{p.order ? '№ ' + p.order : '—'}</td>
                <td style={{ color: 'var(--muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.purpose}</td>
                <td>{p.resp}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: p.dir === 'in' ? 'var(--green)' : 'var(--body)' }}>{p.dir === 'in' ? '+' : '−'}{f$(p.sum)}</td>
                <td><Pill tone={FIN_PRIORITY[p.priority]}>{p.priority}</Pill></td>
                <td><Pill tone={FIN_PAY_STATUS[p.status]}>{p.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <FinPaymentDrawer p={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ==================================================================== */
/* 4. КАЗНАЧЕЙСТВО                                                       */
/* ==================================================================== */
function FinTreasury() {
  const toast = useToast();
  const startBalance = FIN_ACCOUNTS.filter((a) => a.group !== 'Депозиты').reduce((s, a) => s + a.available, 0);
  const [prio, setPrio] = useState(() => FIN_PAYMENTS.filter((p) => p.dir === 'out').reduce((m, p) => (m[p.no] = p.priority, m), {}));
  const planned = FIN_PAYMENTS.filter((p) => p.dir === 'out' && !['Исполнено', 'Отменено', 'Возвращено'].includes(p.status));
  const incoming = FIN_RECEIPTS.slice().sort((a, b) => a.date.localeCompare(b.date));
  const totalOut = planned.reduce((s, p) => s + p.sum, 0);
  const totalIn = incoming.filter((r) => !r.overdue).reduce((s, r) => s + r.sum, 0);
  const forecast = startBalance + totalIn - totalOut;
  const order = { 'Высокий': 0, 'Средний': 1, 'Низкий': 2 };
  const sorted = planned.slice().sort((a, b) => order[prio[a.no]] - order[prio[b.no]] || a.plan.localeCompare(b.plan));
  // прогноз остатка при последовательном исполнении по приоритету
  let run = startBalance + totalIn;
  const withRunning = sorted.map((p) => { run -= p.sum; return { ...p, after: run }; });
  const gap = withRunning.some((p) => p.after < 0);
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12, marginBottom: 14 }}>
        <StatTile label="Доступно сейчас" value={f$(startBalance)} icon="finance" />
        <StatTile label="Ожидаемые поступления" value={f$(totalIn)} tone="var(--green)" icon="arrowUpRight" />
        <StatTile label="К выплате (план)" value={f$(totalOut)} tone="var(--red)" icon="arrowUpRight" />
        <StatTile label="Прогноз остатка" value={f$(forecast)} tone={forecast < 0 ? 'var(--red)' : 'var(--green)'} icon="pie" sub="после всех платежей" />
      </div>
      {gap && <WarnBanner tone="red" title="Прогнозируется кассовый разрыв"
        text="При текущем графике доступных средств не хватит на все запланированные выплаты. Понизьте приоритет части платежей или перенесите даты." />}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Планирование выплат</h3>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>Платежи выстроены по приоритету. Прогноз остатка пересчитывается на лету.</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {withRunning.map((p) => (
              <div key={p.no} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: p.after < 0 ? 'var(--red-bg)' : '#fff' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{p.party}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.no} · план {p.plan} · заказ {p.order || '—'}</div>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--red)' }}>−{f$(p.sum)}</span>
                <Select value={prio[p.no]} onChange={(e) => setPrio((m) => ({ ...m, [p.no]: e.target.value }))} options={Object.keys(FIN_PRIORITY)} style={{ width: 'auto', minWidth: 120 }} />
                <span style={{ width: 96, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: p.after < 0 ? 'var(--red)' : 'var(--muted)' }}>ост. {f$(p.after)}</span>
              </div>
            ))}
          </div>
          <Button size="sm" style={{ marginTop: 12 }} icon="check" onClick={() => toast('График платежей сохранён', 'ok')}>Утвердить график</Button>
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Прогнозная картина</h3>
          <FinRow label="Остаток на начало" value={f$(startBalance)} />
          <FinRow label="Поступит" value={'+' + f$(totalIn)} tone="var(--green)" />
          <FinRow label="Необходимо выплатить" value={'−' + f$(totalOut)} tone="var(--red)" />
          <FinRow label="Ожидаемый остаток" value={f$(forecast)} tone={forecast < 0 ? 'var(--red)' : 'var(--green)'} strong />
          <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--muted)' }}>Ближайшие поступления</div>
          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
            {incoming.slice(0, 4).map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
                <span style={{ color: 'var(--muted-2)', width: 76 }}>{r.date}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.party}</span>
                <span style={{ fontWeight: 700, color: r.overdue ? 'var(--red)' : 'var(--green)' }}>+{f$(r.sum)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/* 5. ВЗАИМОРАСЧЁТЫ + отсрочки + кредитные лимиты + график погашения     */
/* ==================================================================== */
function CreditLimitBar({ used, limit }) {
  if (!limit) return <div style={{ fontSize: 12, color: 'var(--muted)' }}>Лимит не установлен (работа по факту)</div>;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--muted)' }}>Использован лимит</span><span style={{ fontWeight: 700, color: tone }}>{f$(used)} / {f$(limit)} · {pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: tone }} /></div>
    </div>
  );
}
function FinCounterpartyDrawer({ cp, onClose }) {
  const free = Math.max(0, cp.limit - cp.used);
  return (
    <Drawer open={!!cp} onClose={onClose} title={cp.name} sub={(cp.type === 'client' ? 'Клиент' : 'Поставщик') + ' · ' + cp.legal} width="min(780px,96vw)">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        <StatTile label={cp.type === 'client' ? 'Задолженность клиента' : 'Наш долг поставщику'} value={f$(cp.debt)} tone={cp.debt ? 'var(--amber)' : 'var(--green)'} />
        <StatTile label="Оплачено" value={f$(cp.paid)} />
        <StatTile label="Свободный лимит" value={cp.limit ? f$(free) : '—'} tone={cp.limit ? 'var(--green)' : undefined} />
      </div>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ fontSize: 14, marginBottom: 10 }}>Финансовые условия · отсрочка</h3>
        <FinRow label="Схема работы" value={cp.scheme} />
        <FinRow label="Отсрочка" value={cp.deferralDays ? cp.deferralDays + ' дн. · ' + cp.deferralStart : '—'} />
        <FinRow label="Кредитный лимит" value={cp.limit ? f$(cp.limit) + ' (' + cp.currency + ')' : 'не установлен'} />
        <FinRow label="Гарантийное письмо" value={cp.guaranteeLetter ? 'требуется' : 'не требуется'} />
        <FinRow label="Согласование при превышении" value={cp.approveOnExceed ? 'обязательно' : 'не требуется'} />
        <div style={{ marginTop: 12 }}><CreditLimitBar used={cp.used} limit={cp.limit} /></div>
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>График погашения задолженности</h3>
      <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)', marginBottom: 14 }}>
        <table className="tbl">
          <thead><tr><th>Заказ</th><th>Документ</th><th style={{ textAlign: 'right' }}>Сумма</th><th style={{ textAlign: 'right' }}>Оплачено</th><th style={{ textAlign: 'right' }}>Остаток</th><th>Возникло</th><th>Срок</th><th>Дней</th><th>Статус</th></tr></thead>
          <tbody>
            {cp.obligations.map((o, i) => (
              <tr key={i}>
                <td>№ {o.order}</td><td>{o.doc}</td>
                <td style={{ textAlign: 'right' }}>{f$(o.sum)}</td><td style={{ textAlign: 'right', color: 'var(--green)' }}>{f$(o.paid)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{f$(o.rest)}</td>
                <td>{o.since}</td><td>{o.due}</td>
                <td style={{ fontWeight: 700, color: o.overdueDays > 0 ? 'var(--red)' : 'var(--muted)' }}>{o.overdueDays > 0 ? '+' + o.overdueDays + ' проср.' : o.daysToDue + ' дн.'}</td>
                <td><Pill tone={o.status === 'Оплачено' ? 'green' : o.status === 'Просрочено' ? 'red' : 'amber'}>{o.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>История оплат</h3>
          <div className="card card-pad">{cp.payHistory.map((h, i) => <FinRow key={i} label={h.t} value={h.text} />)}</div>
        </div>
        <div>
          <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Счета · акты · заказы</h3>
          <div className="card card-pad" style={{ fontSize: 12.5, color: 'var(--body)', display: 'grid', gap: 6 }}>
            {cp.invoices.map((x, i) => <div key={'i' + i}><Icon name="finance" style={{ width: 12, height: 12, verticalAlign: -1, color: 'var(--muted-2)' }} /> {x}</div>)}
            {cp.acts.map((x, i) => <div key={'a' + i}><Icon name="template" style={{ width: 12, height: 12, verticalAlign: -1, color: 'var(--muted-2)' }} /> {x}</div>)}
            <div style={{ color: 'var(--muted)' }}>Заказы: {cp.orders.map((o) => '№ ' + o).join(', ')}</div>
          </div>
        </div>
      </div>
      {cp.type === 'supplier' && <SupplierSettlements cp={cp} />}
    </Drawer>
  );
}
// Расчёты с локальными поставщиками (ТЗ): авансы, доплаты, возвраты, взаимозачёты + комиссии
function SupplierSettlements({ cp }) {
  const toast = useToast();
  const [ops, setOps] = useState([
    { t: '28.06.2026', kind: 'Аванс', sum: 1000, note: 'Предоплата по договору' },
    { t: '05.07.2026', kind: 'Доплата', sum: 240, note: 'Доплата за доп. номера' },
    { t: '10.07.2026', kind: 'Возврат', sum: -120, note: 'Возврат за отменённый номер' },
  ]);
  const add = (kind) => {
    const demo = { 'Аванс': 500, 'Доплата': 180, 'Возврат': -90, 'Взаимозачёт': -260 };
    setOps((o) => [{ t: finNow().slice(0, 10), kind, sum: demo[kind], note: kind === 'Взаимозачёт' ? 'Зачёт встречных требований' : 'Операция оператора' }, ...o]);
    toast(kind + ' проведён', 'ok');
  };
  const kindTone = { 'Аванс': 'blue', 'Доплата': 'amber', 'Возврат': 'teal', 'Взаимозачёт': 'gray' };
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <h3 className="card-title" style={{ fontSize: 14 }}>Расчёты с локальным поставщиком</h3>
        <div style={{ flex: 1 }} />
        {['Аванс', 'Доплата', 'Возврат', 'Взаимозачёт'].map((k) => <Button key={k} size="sm" variant="secondary" onClick={() => add(k)}>+ {k}</Button>)}
      </div>
      <div className="card card-pad" style={{ marginBottom: 10 }}>
        <FinRow label="Комиссия поставщика" value="по договору · 8%" />
        <FinRow label="Поддерживаются" value="частичные оплаты · авансы · доплаты · возвраты · взаимозачёты" />
      </div>
      <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
        <table className="tbl">
          <thead><tr><th>Дата</th><th>Тип</th><th>Основание</th><th style={{ textAlign: 'right' }}>Сумма</th></tr></thead>
          <tbody>
            {ops.map((o, i) => (
              <tr key={i}><td>{o.t}</td><td><Pill tone={kindTone[o.kind]}>{o.kind}</Pill></td><td style={{ color: 'var(--muted)' }}>{o.note}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: deltaTone(o.sum) }}>{fSigned(o.sum)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function FinSettlements() {
  const [open, setOpen] = useState(null);
  const [type, setType] = useState('client');
  const list = FIN_COUNTERPARTIES.filter((c) => c.type === type);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Tabs tabs={[{ key: 'client', label: 'Клиенты' }, { key: 'supplier', label: 'Поставщики' }]} value={type} onChange={setType} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Итого задолженность: <b style={{ color: 'var(--amber)' }}>{f$(list.reduce((s, c) => s + c.debt, 0))}</b></span>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Контрагент</th><th>Схема</th><th>Отсрочка</th><th>Кредитный лимит</th><th style={{ textAlign: 'right' }}>Задолженность</th><th style={{ textAlign: 'right' }}>Оплачено</th><th>Ближайший срок</th><th>Дисциплина</th></tr></thead>
          <tbody>
            {list.map((c) => {
              const nearest = c.obligations.slice().sort((a, b) => a.due.localeCompare(b.due))[0];
              const over = c.obligations.some((o) => o.overdueDays > 0);
              return (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(c)}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td><td>{c.scheme}</td>
                  <td>{c.deferralDays ? c.deferralDays + ' дн.' : '—'}</td>
                  <td style={{ minWidth: 150 }}>{c.limit ? <CreditLimitBar used={c.used} limit={c.limit} /> : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: over ? 'var(--red)' : 'var(--amber)' }}>{f$(c.debt)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)' }}>{f$(c.paid)}</td>
                  <td style={{ color: over ? 'var(--red)' : 'var(--body)' }}>{nearest ? nearest.due : '—'}{over ? ' · просрочка' : ''}</td>
                  <td><Pill tone={c.discipline.rating === 'A' ? 'green' : c.discipline.rating === 'B' ? 'amber' : 'red'}>{c.discipline.rating} · {c.discipline.onTimePct}%</Pill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h3 className="card-title" style={{ fontSize: 16, margin: '22px 0 12px' }}>Календарь поступлений</h3>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Дата</th><th>Контрагент</th><th>Основание</th><th>Ответственный</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Статус</th></tr></thead>
          <tbody>
            {FIN_RECEIPTS.slice().sort((a, b) => a.date.localeCompare(b.date)).map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td><td style={{ fontWeight: 600 }}>{r.party}</td><td style={{ color: 'var(--muted)' }}>{r.basis}</td><td>{r.resp}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: r.overdue ? 'var(--red)' : 'var(--green)' }}>+{f$(r.sum)}</td>
                <td><Pill tone={r.overdue ? 'red' : 'green'}>{r.overdue ? 'Просрочено' : 'Ожидается'}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <FinCounterpartyDrawer cp={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ==================================================================== */
/* 6. ЭКОНОМИКА — финмодель услуги/заказа, автоначисления, ЗП операторов */
/* ==================================================================== */
function ServiceModelCard({ kind }) {
  const rows = FIN_SVC_MODEL[kind];
  const clientTotal = svcClientTotal(rows);
  const supplierPay = svcSupplierPay(rows);
  const profit = svcModelProfit(rows);
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="oc-svc-ic" style={{ background: (SERVICE_KIND[kind] || {}).color || 'var(--blue)', width: 30, height: 30 }}><Icon name={(SERVICE_KIND[kind] || {}).icon || 'briefcase'} /></span>
        <h3 className="card-title" style={{ fontSize: 15 }}>Финмодель · {kind}</h3>
      </div>
      {rows.map((r, i) => <FinRow key={i} label={r.l} value={fSigned(r.v)} tone={r.k === 'cost' ? 'var(--muted)' : r.v >= 0 ? 'var(--ink)' : 'var(--red)'} />)}
      <div style={{ borderTop: '1px dashed var(--line)', marginTop: 8, paddingTop: 4 }}>
        <FinRow label="Итоговая стоимость клиенту" value={f$(clientTotal)} strong />
        <FinRow label="Оплата поставщику" value={f$(supplierPay)} tone="var(--muted)" />
        <FinRow label="Чистая прибыль" value={f$(profit)} tone="var(--green)" strong />
      </div>
    </div>
  );
}
function FinEconomics() {
  const [kind, setKind] = useState('Авиа');
  // экономика заказа 51162 — агрегация по услугам
  const orderKinds = ['Авиа', 'Гостиница', 'Трансфер'];
  const orderRows = orderKinds.map((k) => {
    const rows = FIN_SVC_MODEL[k];
    return { k, client: svcClientTotal(rows), cost: svcSupplierPay(rows), profit: svcModelProfit(rows) };
  });
  const oClient = orderRows.reduce((s, r) => s + r.client, 0);
  const oCost = orderRows.reduce((s, r) => s + r.cost, 0);
  const oProfit = orderRows.reduce((s, r) => s + r.profit, 0);
  const tax = Math.round(oProfit * 0.1);
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>Полная финмодель услуги</h3>
            <div style={{ flex: 1 }} />
            <Select value={kind} onChange={(e) => setKind(e.target.value)} options={Object.keys(FIN_SVC_MODEL)} style={{ width: 'auto', minWidth: 130 }} />
          </div>
          <ServiceModelCard kind={kind} />
          <div className="card card-pad" style={{ marginTop: 12 }}>
            <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Автоматический расчёт начислений</h3>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>Все начисления считаются по правилам из «Центра финправил» без изменения кода.</div>
            {['Сервисный сбор', 'Надбавка / скидка', 'Комиссия поставщика', 'Агентская комиссия', 'Комиссия платёжной системы', 'Банковская комиссия', 'Вознаграждение оператора', 'Налоги и курсовые разницы'].map((x, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12.5 }}>
                <Icon name="check" style={{ width: 14, height: 14, color: 'var(--green)' }} /><span style={{ color: 'var(--body)' }}>{x}</span>
                <span style={{ flex: 1 }} /><Pill tone="blue">авто</Pill>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Финансовая детализация заказа № 51162</h3>
          <div className="card card-pad" style={{ marginBottom: 12 }}>
            <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)', marginBottom: 10 }}>
              <table className="tbl">
                <thead><tr><th>Услуга</th><th style={{ textAlign: 'right' }}>Клиенту</th><th style={{ textAlign: 'right' }}>Поставщику</th><th style={{ textAlign: 'right' }}>Прибыль</th></tr></thead>
                <tbody>
                  {orderRows.map((r) => <tr key={r.k}><td>{r.k}</td><td style={{ textAlign: 'right' }}>{f$(r.client)}</td><td style={{ textAlign: 'right', color: 'var(--muted)' }}>{f$(r.cost)}</td><td style={{ textAlign: 'right', color: deltaTone(r.profit), fontWeight: 700 }}>{f$(r.profit)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <FinRow label="Стоимость для клиента" value={f$(oClient)} strong />
            <FinRow label="Стоимость услуг поставщиков" value={f$(oCost)} tone="var(--muted)" />
            <FinRow label="Валовая прибыль" value={f$(oProfit)} tone="var(--green)" />
            <FinRow label="Налог с прибыли (10%)" value={'−' + f$(tax)} tone="var(--red)" />
            <FinRow label="Чистая прибыль" value={f$(oProfit - tax)} tone="var(--green)" strong />
          </div>
        </div>
      </div>

      <h3 className="card-title" style={{ fontSize: 16, margin: '22px 0 12px' }}>Расчёт вознаграждения операторов</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 12 }}>
        {FIN_SALARY.map((s) => (
          <div key={s.operator} className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.operator}</div>
              <span className="s-value" style={{ fontSize: 20, color: 'var(--green)' }}>{f$(s.total)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Схема: {s.scheme}</div>
            {s.accruals.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, padding: '5px 0', borderBottom: i < s.accruals.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ color: 'var(--muted-2)', width: 56 }}>№ {a.order}</span>
                <span style={{ flex: 1 }}>{a.service}<div style={{ color: 'var(--muted-2)', fontSize: 11 }}>{a.rule}</div></span>
                <span style={{ fontWeight: 700 }}>{f$(a.amount)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================================================================== */
/* 7. АНАЛИТИКА — ДДС по периодам, срезы, платёжная дисциплина           */
/* ==================================================================== */
const FIN_ANALYTICS_SLICES = {
  'Операторы': [{ n: 'Даниель', profit: 8200, orders: 7 }, { n: 'Азамат А.', profit: 3100, orders: 4 }, { n: 'Куба', profit: 4600, orders: 2 }],
  'Поставщики': [{ n: 'Turkish Airlines', profit: 3900, orders: 5 }, { n: 'Hilton Istanbul', profit: 1200, orders: 3 }, { n: 'Ratehawk', profit: 2100, orders: 6 }],
  'Клиенты': [{ n: 'Гранд лимитед', profit: 5400, orders: 4 }, { n: 'Asia Travel', profit: 6100, orders: 3 }, { n: 'Мамажанов', profit: 900, orders: 2 }],
  'Виды услуг': [{ n: 'Авиа', profit: 7100, orders: 12 }, { n: 'Гостиницы', profit: 4200, orders: 9 }, { n: 'Трансферы', profit: 800, orders: 6 }, { n: 'Визы', profit: 1200, orders: 3 }],
};
function FinAnalytics() {
  const [slice, setSlice] = useState('Операторы');
  const [period, setPeriod] = useState('Месяц');
  const rows = FIN_ANALYTICS_SLICES[slice];
  const maxP = Math.max(...rows.map((r) => r.profit));
  let bal = 60000;
  const flow = FIN_CASHFLOW.map((d) => ({ ...d, net: d.in - d.out, bal: (bal += d.in - d.out) }));
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>Денежные потоки</h3>
            <Tabs tabs={['День', 'Неделя', 'Месяц', 'Квартал', 'Год'].map((p) => ({ key: p, label: p }))} value={period} onChange={setPeriod} />
          </div>
          <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
            <table className="tbl">
              <thead><tr><th>Период</th><th style={{ textAlign: 'right' }}>Приход</th><th style={{ textAlign: 'right' }}>Расход</th><th style={{ textAlign: 'right' }}>Чистый поток</th><th style={{ textAlign: 'right' }}>Остаток</th></tr></thead>
              <tbody>
                {flow.map((d) => (
                  <tr key={d.m}><td style={{ fontWeight: 600 }}>{d.m} 2026</td>
                    <td style={{ textAlign: 'right', color: 'var(--green)' }}>+{f$(d.in)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--red)' }}>−{f$(d.out)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: deltaTone(d.net) }}>{fSigned(d.net)}</td>
                    <td style={{ textAlign: 'right' }}>{f$(d.bal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>Аналитика · прибыль</h3>
            <div style={{ flex: 1 }} />
            <Select value={slice} onChange={(e) => setSlice(e.target.value)} options={Object.keys(FIN_ANALYTICS_SLICES)} style={{ width: 'auto', minWidth: 130 }} />
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {rows.map((r) => (
              <div key={r.n}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{r.n}</span>
                  <span style={{ color: 'var(--muted)' }}>{f$(r.profit)} · {r.orders} зак.</span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}><div style={{ width: (r.profit / maxP * 100) + '%', height: '100%', background: 'var(--green)' }} /></div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 10 }}>Каждый показатель раскрывается до первичного документа.</div>
        </div>
      </div>

      <h3 className="card-title" style={{ fontSize: 16, margin: '22px 0 12px' }}>Аналитика платёжной дисциплины</h3>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Клиент</th><th style={{ textAlign: 'right' }}>Средний срок оплаты</th><th style={{ textAlign: 'right' }}>Средняя просрочка</th><th style={{ textAlign: 'right' }}>Макс. просрочка</th><th style={{ textAlign: 'right' }}>Просрочено</th><th style={{ textAlign: 'right' }}>Своевременно</th><th>Рейтинг</th><th>Рекомендация</th></tr></thead>
          <tbody>
            {FIN_COUNTERPARTIES.filter((c) => c.type === 'client').map((c) => {
              const d = c.discipline;
              const rec = d.rating === 'A' ? 'Можно увеличить лимит / отсрочку' : d.rating === 'B' ? 'Условия без изменений' : 'Снизить лимит, перейти на предоплату';
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ textAlign: 'right' }}>{d.avgPayDays} дн.</td>
                  <td style={{ textAlign: 'right', color: d.avgOverdue ? 'var(--amber)' : 'var(--muted)' }}>{d.avgOverdue} дн.</td>
                  <td style={{ textAlign: 'right' }}>{d.maxOverdue} дн.</td>
                  <td style={{ textAlign: 'right', color: d.overdueSum ? 'var(--red)' : 'var(--muted)' }}>{f$(d.overdueSum)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: d.onTimePct >= 90 ? 'var(--green)' : d.onTimePct >= 70 ? 'var(--amber)' : 'var(--red)' }}>{d.onTimePct}%</td>
                  <td><Pill tone={d.rating === 'A' ? 'green' : d.rating === 'B' ? 'amber' : 'red'}>{d.rating}</Pill></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{rec}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==================================================================== */
/* 8. ПРАВИЛА — центр финправил, банковская сверка, журнал финдействий   */
/* ==================================================================== */
function FinRules() {
  const toast = useToast();
  return (
    <div className="fade-in">
      <WarnBanner tone="amber" icon="alertCircle" title="Изменения применяются только к новым операциям"
        text="Уже оформленные заказы сохраняют исторические значения сборов и комиссий." />
      <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Центр финансовых правил</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 12, marginBottom: 22 }}>
        {FIN_RULES.map((g) => (
          <div key={g.group} className="card card-pad">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="card-title" style={{ fontSize: 14 }}>{g.group}</h3>
              <Button size="sm" variant="secondary" icon="edit" onClick={() => toast('Редактирование правил · ' + g.group, 'info')}>Настроить</Button>
            </div>
            {g.items.map((it, i) => <FinRow key={i} label={it.t} value={it.v} />)}
          </div>
        ))}
      </div>

      <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Банковская сверка</h3>
      <div className="table-card" style={{ marginBottom: 22 }}>
        <table className="tbl">
          <thead><tr><th>Банк. операция</th><th>Дата</th><th>Контрагент</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Сопоставление</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {FIN_RECON.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.id}</td><td>{r.date}</td><td>{r.party}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{f$(r.sum)}</td>
                <td style={{ color: 'var(--muted)' }}>{r.matched}</td>
                <td><Pill tone={FIN_RECON_STATUS[r.status]}>{r.status}</Pill></td>
                <td>{(r.status === 'Не найдено соответствие' || r.status === 'Конфликт') && <Button size="sm" variant="secondary" onClick={() => toast('Открываю ручное сопоставление ' + r.id, 'info')}>Сопоставить</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Журнал финансовых действий</h3>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>Все изменения фиксируются. Удаление финансовых документов без сохранения истории запрещено.</div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Дата · время</th><th>Пользователь</th><th>Действие</th><th>Объект</th><th>Было</th><th>Стало</th><th>Причина</th></tr></thead>
          <tbody>
            {FIN_ACTIONS.map((a, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>{a.t}</td><td>{a.user}</td><td style={{ fontWeight: 600 }}>{a.action}</td>
                <td style={{ color: 'var(--muted)' }}>{a.field}</td><td style={{ color: 'var(--muted)' }}>{a.oldV}</td>
                <td style={{ fontWeight: 600 }}>{a.newV}</td><td style={{ fontSize: 12, color: 'var(--muted)' }}>{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==================================================================== */
/* MAIN — страница «Финансы»                                            */
/* ==================================================================== */
const FIN_TABS = [
  { key: 'overview', label: 'Обзор' },
  { key: 'balance', label: 'Баланс' },
  { key: 'payments', label: 'Платежи' },
  { key: 'treasury', label: 'Казначейство' },
  { key: 'settlements', label: 'Взаиморасчёты' },
  { key: 'economics', label: 'Экономика' },
  { key: 'analytics', label: 'Аналитика' },
  { key: 'rules', label: 'Правила' },
];
function FinancePage() {
  const [tab, setTab] = useState('overview');
  return (
    <>
      <Topbar title="Финансы" sub="Управление финансами компании: баланс, платежи, взаиморасчёты, аналитика" />
      <div className="content">
        <div style={{ marginBottom: 18 }}><Tabs tabs={FIN_TABS} value={tab} onChange={setTab} /></div>
        {tab === 'overview' && <FinOverview onGoTab={setTab} />}
        {tab === 'balance' && <FinBalance />}
        {tab === 'payments' && <FinPayments />}
        {tab === 'treasury' && <FinTreasury />}
        {tab === 'settlements' && <FinSettlements />}
        {tab === 'economics' && <FinEconomics />}
        {tab === 'analytics' && <FinAnalytics />}
        {tab === 'rules' && <FinRules />}
      </div>
    </>
  );
}

Object.assign(window, { FinancePage, FIN_ACCOUNTS, FIN_PAYMENTS, FIN_COUNTERPARTIES, finCreditCheck });



export { f$, fSigned, finNow, deltaTone, finCreditCheck, FIN_ACCT_GROUPS, FIN_ACCOUNTS, FIN_ACCT_OP_TYPES, acctOps, FIN_PAY_STATUS, FIN_PRIORITY, FIN_PAYMENTS, obl, FIN_COUNTERPARTIES, FIN_SCHEMES, FIN_CASHFLOW, FIN_RECEIPTS, FIN_SALARY, FIN_RULES, FIN_RECON_STATUS, FIN_RECON, FIN_ACTIONS, FIN_SVC_MODEL, sumK, svcClientTotal, svcSupplierPay, svcModelProfit, StatTile, WarnBanner, CashflowChart, LegendDot, FinRow, FinOverview, FinAccountDrawer, FinBalance, FinPaymentDrawer, FinPayments, FinTreasury, CreditLimitBar, FinCounterpartyDrawer, SupplierSettlements, FinSettlements, ServiceModelCard, FinEconomics, FIN_ANALYTICS_SLICES, FinAnalytics, FinRules, FIN_TABS, FinancePage };
