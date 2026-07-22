import { COMPANIES_DB } from '../data';

const SETTLEMENT_TYPES = ['предоплата', 'депозит', 'отсрочка'];
const SETTLEMENT_TONE = { 'предоплата': 'gray', 'депозит': 'blue', 'отсрочка': 'amber' };


const FEE_SCHEMA = {
  'Авиа':      [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'issue', label: 'Сбор за оформление' }, { key: 'exchange', label: 'Сбор за обмен' }, { key: 'refund', label: 'Сбор за возврат' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'ЖД':        [{ key: 'service', label: 'Сервисный сбор' }, { key: 'issue', label: 'Сбор за оформление' }, { key: 'exchange', label: 'Сбор за обмен' }, { key: 'refund', label: 'Сбор за возврат' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'Гостиница': [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'Трансфер':  [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'Страховка': [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'Тур':       [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'supplier', label: 'Сборы поставщиков' }],
};
const FEE_SERVICE_TYPES = Object.keys(FEE_SCHEMA);


const SERVICE_DESC_DEFAULTS = {
  'Авиа':      'Оказание услуг по организации воздушной перевозки',
  'ЖД':        'Оказание услуг по организации железнодорожной перевозки',
  'Гостиница': 'Услуги по организации проживания',
  'Трансфер':  'Услуги по организации трансфера',
  'Страховка': 'Услуги по оформлению страхового полиса',
  'Тур':       'Услуги по организации туристического обслуживания',
};




const FEE_DESC_DEFAULTS = {
  service:  'Сервисный сбор агентства',
  markup:   'Агентская надбавка',
  issue:    'Сбор за оформление',
  exchange: 'Сбор за обмен',
  refund:   'Сбор за возврат',
  supplier: 'Сборы поставщика',
};

function feeDescsFromDefaults() {
  const out = {};
  FEE_SERVICE_TYPES.forEach((svc) => { out[svc] = {}; FEE_SCHEMA[svc].forEach((f) => { out[svc][f.key] = FEE_DESC_DEFAULTS[f.key] || f.label; }); });
  return out;
}

function feeDescOf(agreement, svc, key) {
  const fromAgr = agreement && agreement.feeDescs && agreement.feeDescs[svc] && agreement.feeDescs[svc][key];
  if (fromAgr != null && String(fromAgr).trim()) return fromAgr;
  return FEE_DESC_DEFAULTS[key] || key;
}




const FEE_TEMPLATES = [
  { id: 'standard', name: 'Стандартный', builtIn: true, values: { service: { type: 'percent', value: 5 }, markup: { type: 'percent', value: 3 }, issue: { type: 'fixed', value: 10 }, exchange: { type: 'fixed', value: 25 }, refund: { type: 'fixed', value: 15 }, supplier: { type: 'fixed', value: 0 } } },
  { id: 'deposit',  name: 'Депозитный', builtIn: true, values: { service: { type: 'percent', value: 4 }, markup: { type: 'percent', value: 2 }, issue: { type: 'fixed', value: 8 }, exchange: { type: 'fixed', value: 20 }, refund: { type: 'fixed', value: 12 }, supplier: { type: 'fixed', value: 0 } } },
  { id: 'credit',   name: 'Отсрочка', builtIn: true, values: { service: { type: 'percent', value: 6 }, markup: { type: 'percent', value: 4 }, issue: { type: 'fixed', value: 12 }, exchange: { type: 'fixed', value: 30 }, refund: { type: 'fixed', value: 18 }, supplier: { type: 'fixed', value: 0 } } },
  { id: 'zero',     name: 'Без сборов', builtIn: true, values: { service: { type: 'fixed', value: 0 }, markup: { type: 'fixed', value: 0 }, issue: { type: 'fixed', value: 0 }, exchange: { type: 'fixed', value: 0 }, refund: { type: 'fixed', value: 0 }, supplier: { type: 'fixed', value: 0 } } },
];
function feeTemplate(id) { return FEE_TEMPLATES.find((t) => t.id === id) || FEE_TEMPLATES[0]; }



function feesFromTemplate(tplId) {
  const t = feeTemplate(tplId);
  const out = {};
  FEE_SERVICE_TYPES.forEach((svc) => {
    out[svc] = {};
    const detailed = t.fees && t.fees[svc];
    FEE_SCHEMA[svc].forEach((f) => {
      const v = (detailed && detailed[f.key]) || (t.values && t.values[f.key]) || { type: 'fixed', value: 0 };
      out[svc][f.key] = { ...v };
    });
  });
  return out;
}
function descsFromDefaults() { return { ...SERVICE_DESC_DEFAULTS }; }


function registerFeeTemplate(name, feesObj) {
  const id = 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  FEE_TEMPLATES.push({ id, name: name || 'Индивидуальный', builtIn: false, custom: true, fees: JSON.parse(JSON.stringify(feesObj)) });
  return id;
}


const COMPANY_FINANCE = {
  'CO-2001': {
    settlement: 'депозит',
    deposit: { balance: 42000, reserved: 8600, history: [
      { date: '18.06.2026', type: 'Пополнение', amount: 30000, note: 'Пополнение депозита (пл. пор. № 512)' },
      { date: '20.06.2026', type: 'Списание', amount: -6400, note: 'Оплата заказа № 51162' },
      { date: '24.06.2026', type: 'Резерв', amount: -8600, note: 'Резерв под заказ № 51190' },
    ] },
    credit: null,
    contracts: [
      { id: 'C-118', no: '№ 2024-118', date: '09.09.2024', status: 'Действующий', agreements: [
        { id: 'A-118-3', no: 'ДС № 3', date: '01.06.2026', version: 3, status: 'Действующий', template: 'deposit',
          fees: feesFromTemplate('deposit'), descs: descsFromDefaults(),
          history: [
            { date: '09.09.2024 10:00', user: 'Даниель', title: 'ДС № 1 · создано', fields: ['Импортированы условия договора'] },
            { date: '12.02.2026 15:20', user: 'Айсулуу', title: 'ДС № 2 · сборы', fields: ['Сервисный сбор (Авиа)', 'Агентская надбавка (Авиа)'] },
            { date: '01.06.2026 11:30', user: 'Даниель', title: 'ДС № 3 · сборы, описания', fields: ['Сервисный сбор (Авиа)', 'Описание (Авиа)', 'Сбор за возврат (ЖД)'] },
          ] },
      ] },
    ],
  },
  'CO-2002': {
    settlement: 'отсрочка',
    deposit: null,
    credit: { limit: 50000, termDays: 30, debt: 18400, overdue: 4200 },
    contracts: [
      { id: 'C-014', no: '№ 2025-014', date: '14.01.2025', status: 'Действующий', agreements: [
        { id: 'A-014-1', no: 'ДС № 1', date: '14.01.2025', version: 1, status: 'Действующий', template: 'credit',
          fees: feesFromTemplate('credit'), descs: descsFromDefaults(),
          history: [{ date: '14.01.2025 09:40', user: 'Куба', title: 'ДС № 1 · создано', fields: ['Импортированы условия договора'] }] },
      ] },
    ],
  },
  'CO-2003': {
    settlement: 'предоплата', deposit: null, credit: null,
    contracts: [
      { id: 'C-033', no: '№ 2025-033', date: '20.03.2025', status: 'Действующий', agreements: [
        { id: 'A-033-1', no: 'ДС № 1', date: '20.03.2025', version: 1, status: 'Действующий', template: 'standard',
          fees: feesFromTemplate('standard'), descs: descsFromDefaults(),
          history: [{ date: '20.03.2025 12:00', user: 'Даниель', title: 'ДС № 1 · создано', fields: ['Импортированы условия договора'] }] },
      ] },
    ],
  },
  'CO-2004': {
    settlement: 'депозит',
    deposit: { balance: 15000, reserved: 3000, history: [
      { date: '02.02.2025', type: 'Пополнение', amount: 20000, note: 'Первичное пополнение' },
      { date: '15.06.2026', type: 'Списание', amount: -5000, note: 'Оплата заказа' },
    ] },
    credit: null,
    contracts: [
      { id: 'C-INT7', no: '№ INT-2025-7', date: '02.02.2025', status: 'Действующий', agreements: [
        { id: 'A-INT7-1', no: 'ДС № 1', date: '02.02.2025', version: 1, status: 'Действующий', template: 'standard',
          fees: feesFromTemplate('standard'), descs: descsFromDefaults(),
          history: [{ date: '02.02.2025 10:00', user: 'Даниель', title: 'ДС № 1 · создано', fields: ['Импортированы условия договора'] }] },
      ] },
    ],
  },
  'CO-2005': {
    settlement: 'предоплата', deposit: null, credit: null,
    contracts: [
      { id: 'C-101', no: '№ 2024-101', date: '11.11.2024', status: 'Архив', agreements: [
        { id: 'A-101-1', no: 'ДС № 1', date: '11.11.2024', version: 1, status: 'Архив', template: 'standard',
          fees: feesFromTemplate('standard'), descs: descsFromDefaults(), history: [{ date: '11.11.2024 10:00', user: 'Куба', title: 'ДС № 1 · создано', fields: ['Импортированы условия договора'] }] },
      ] },
    ],
  },
};
function companyFinance(id) { return COMPANY_FINANCE[id] || null; }

function depositAvailable(d) { return d ? d.balance - d.reserved : 0; }

function creditAvailable(c) { return c ? c.limit - c.debt : 0; }

function activeContract(fin) { return fin && fin.contracts.find((c) => c.status === 'Действующий'); }
function activeAgreement(fin) {
  const c = activeContract(fin); if (!c) return null;
  const act = c.agreements.filter((a) => a.status === 'Действующий');
  return act.length ? act.reduce((m, a) => (a.version > m.version ? a : m)) : null;
}

function feeAmount(fee, base) { if (!fee) return 0; return fee.type === 'percent' ? Math.round(base * (fee.value || 0) / 100) : (fee.value || 0); }

function applyAgreementFees(agreement, serviceType, base) {
  if (!agreement || !agreement.fees[serviceType]) return { fees: {}, total: 0 };
  const set = agreement.fees[serviceType];
  const fees = {}; let total = 0;
  FEE_SCHEMA[serviceType].forEach((f) => { const a = feeAmount(set[f.key], base); fees[f.key] = a; total += a; });
  return { fees, total };
}

function companyBalanceShort(fin) {
  if (!fin) return null;
  if (fin.settlement === 'депозит' && fin.deposit) return { kind: 'депозит', label: 'Депозит', value: depositAvailable(fin.deposit), tone: depositAvailable(fin.deposit) > 0 ? 'green' : 'red' };
  if (fin.settlement === 'отсрочка' && fin.credit) return { kind: 'отсрочка', label: 'Задолженность', value: fin.credit.debt, overdue: fin.credit.overdue, tone: fin.credit.overdue > 0 ? 'red' : 'amber' };
  return { kind: 'предоплата', label: 'Предоплата', value: 0, tone: 'gray' };
}



function financeOverview() {
  let deposits = 0, debt = 0, overdue = 0, overdueCount = 0;
  const urgent = [];
  COMPANIES_DB.forEach((co) => {
    if (co.status === 'Архив') return;
    const fin = companyFinance(co.id);
    if (!fin) return;
    if (fin.settlement === 'депозит' && fin.deposit) {
      const avail = depositAvailable(fin.deposit);
      deposits += avail;
      if (avail <= 0) urgent.push({ id: co.id, co: co.name, kind: 'депозит', text: 'Депозит исчерпан — требуется пополнение', tone: 'red', value: avail });
      else if (avail < fin.deposit.reserved) urgent.push({ id: co.id, co: co.name, kind: 'депозит', text: 'Низкий остаток депозита под резерв', tone: 'amber', value: avail });
    }
    if (fin.settlement === 'отсрочка' && fin.credit) {
      debt += fin.credit.debt;
      if (fin.credit.overdue > 0) {
        overdue += fin.credit.overdue; overdueCount++;
        urgent.push({ id: co.id, co: co.name, kind: 'отсрочка', text: 'Просроченная задолженность · срок отсрочки ' + fin.credit.termDays + ' дн.', tone: 'red', value: fin.credit.overdue });
      } else {
        const avail = creditAvailable(fin.credit);
        if (avail < fin.credit.limit * 0.15) urgent.push({ id: co.id, co: co.name, kind: 'отсрочка', text: 'Кредитный лимит почти исчерпан', tone: 'amber', value: avail });
      }
    }
  });

  urgent.sort((a, b) => (a.tone === b.tone ? Math.abs(b.value) - Math.abs(a.value) : (a.tone === 'red' ? -1 : 1)));
  return { deposits, debt, overdue, overdueCount, urgent };
}

const ENABLE_DEMO_BUSINESS_DATA = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
if (!ENABLE_DEMO_BUSINESS_DATA) {
  Object.keys(COMPANY_FINANCE).forEach((key) => { delete COMPANY_FINANCE[key]; });
}

Object.assign(window, {
  SETTLEMENT_TYPES, SETTLEMENT_TONE, FEE_SCHEMA, FEE_SERVICE_TYPES, SERVICE_DESC_DEFAULTS,
  FEE_DESC_DEFAULTS, feeDescsFromDefaults, feeDescOf,
  FEE_TEMPLATES, feeTemplate, feesFromTemplate, registerFeeTemplate, descsFromDefaults, COMPANY_FINANCE, companyFinance,
  depositAvailable, creditAvailable, activeContract, activeAgreement, feeAmount, applyAgreementFees, companyBalanceShort, financeOverview,
});

export {
  SETTLEMENT_TYPES,
  SETTLEMENT_TONE,
  FEE_SCHEMA,
  FEE_SERVICE_TYPES,
  SERVICE_DESC_DEFAULTS,
  FEE_DESC_DEFAULTS,
  feeDescsFromDefaults,
  feeDescOf,
  FEE_TEMPLATES,
  feeTemplate,
  feesFromTemplate,
  descsFromDefaults,
  registerFeeTemplate,
  COMPANY_FINANCE,
  companyFinance,
  depositAvailable,
  creditAvailable,
  activeContract,
  activeAgreement,
  feeAmount,
  applyAgreementFees,
  companyBalanceShort,
  financeOverview,
};
