import { AIRLINES, CHAT_THREADS, CURRENCIES, OPERATORS, USERS, companyStaff } from '../data';







const OPERATOR_SLA = window.OPERATOR_SLA || (window.OPERATOR_SLA = {
  'Акимова Айсулуу': 15, 'Даниель': 10, 'Адилет Медербеков': 20, 'Кими Райкконен': 15, 'Азамат А.': 30, 'Куба': 15,
});
function operatorSla(name) { return OPERATOR_SLA[name] != null ? OPERATOR_SLA[name] : 15; }

const SLA_QUEUE = [
  { no: 51162, client: 'ОсОО «Гранд лимитед»', operator: 'Даниель', waited: 14, limit: operatorSla('Даниель') },
  { no: 51156, client: 'Сагынбеков Икрам', operator: 'Кими Райкконен', waited: 12, limit: operatorSla('Кими Райкконен') },
  { no: 51172, client: 'Бейшеналиев Сагын', operator: 'Даниель', waited: 4, limit: operatorSla('Даниель') },
  { no: 51170, client: 'Emirates', operator: 'Куба', waited: 17, limit: operatorSla('Куба') },
  { no: 51180, client: 'Аттокуров Эрбол', operator: 'Адилет Медербеков', waited: 9, limit: operatorSla('Адилет Медербеков') },
];

function slaTone(waited, limit) { return waited > limit ? 'red' : (waited >= limit * 0.7 ? 'amber' : 'green'); }
function slaLabel(t) { return t === 'red' ? 'Просрочено' : t === 'amber' ? 'Накал тайминга' : 'В норме'; }




const TP_SCOPES = ['Вся компания', 'Подразделение', 'Должность', 'Сотрудник'];
const TP_CLASSES_AVIA = ['Эконом', 'Премиум-эконом', 'Бизнес', 'Первый'];
const TP_RAIL_CLASSES = ['Сидячий', 'Плацкарт', 'Купе', 'СВ'];

const TP_AIRLINES = (typeof AIRLINES !== 'undefined')
  ? Object.values(AIRLINES).map((a) => a.name)
  : ['S7 Airlines', 'Turkish Airlines', 'Emirates', 'Aeroflot', 'Air Astana', 'Qatar Airways', 'Utair', 'Lufthansa', 'Pegasus'];
const TP_RAIL_TYPES = ['Сидячий', 'Плацкарт', 'Купе', 'СВ', 'Люкс'];
const TP_HOTEL_CHAINS = ['Hilton', 'Marriott', 'Radisson', 'Hyatt', 'Accor', 'InterContinental', 'Wyndham', 'Best Western', 'Локальные отели'];
const TP_HOTEL_CATEGORIES = ['3★', '4★', '5★'];
const TP_BOARD = ['Без питания', 'Завтрак', 'Полупансион', 'Полный пансион', 'All Inclusive'];
const TP_CAR_CLASSES = ['Эконом', 'Комфорт', 'Бизнес', 'Минивэн', 'VIP'];
const TP_CURRENCIES = (typeof CURRENCIES !== 'undefined') ? CURRENCIES.map((c) => c.code) : ['USD', 'EUR', 'RUB', 'KGS'];

const TP_EMPLOYEES = [...new Set([
  ...(typeof USERS !== 'undefined' ? USERS.map((u) => u.name) : []),
  ...(typeof OPERATORS !== 'undefined' ? OPERATORS : []),
  'Нуралиев Данияр', 'Каримов Икрам', 'Сагынбеков Икрам',
])];

const TP_COMPLIANCE = {
  ok: { label: 'Соответствует тревел-политике', tone: 'green', icon: 'checkCircle' },
  overLimit: { label: 'Превышен лимит стоимости', tone: 'amber', icon: 'alertCircle' },
  class: { label: 'Запрещённый класс обслуживания', tone: 'red', icon: 'alertCircle' },
  supplier: { label: 'Запрещённый поставщик', tone: 'red', icon: 'alertCircle' },
  approval: { label: 'Требуется согласование', tone: 'amber', icon: 'sla' },
};

function defaultTravelPolicy() {
  return {
    scope: 'Вся компания', scopeValue: '',
    avia: {
      classAllowed: 'Бизнес', airlinesAllowed: ['S7 Airlines', 'Turkish Airlines', 'Emirates'], airlinesForbidden: [],
      stops: true, maxStops: 1, maxLayoverH: 6, minLayoverMin: 60,
      maxPrice: 1200, maxPriceCur: 'USD', deviationPct: 20, nonRefundable: false, extrasAllowed: true, minLeadDays: 3,
    },
    rail: { wagonClass: 'Купе', wagonTypes: ['Купе', 'СВ'], maxPrice: 250, maxPriceCur: 'USD', svAllowed: true, kupeAllowed: true, highSpeed: true, minLeadDays: 2 },
    hotels: { maxNight: 150, maxNightCur: 'USD', maxCategory: '4★', chainsAllowed: ['Hilton', 'Marriott', 'Radisson'], forbidden: [], maxDistanceKm: 5, boardAllowed: ['Завтрак', 'Полупансион'], earlyCheckIn: true, lateCheckOut: false, upgrade: false },
    transfers: { carClasses: ['Эконом', 'Комфорт'], individual: true, taxi: true, maxPrice: 80, maxPriceCur: 'USD' },
    extras: { insurance: true, visa: true, vipLounge: false, fastTrack: false, airportExtra: true },

    approval: { required: true, approvers: ['Акимова Айсулуу'], onOverLimit: true, autoIfCompliant: true, allowWithout: false },
  };
}


const COMPANY_STAFF_STORE = window.COMPANY_STAFF_STORE || (window.COMPANY_STAFF_STORE = {});
function companyStaffStore(companyId) {
  if (!COMPANY_STAFF_STORE[companyId]) {
    const seed = (typeof companyStaff === 'function') ? companyStaff(companyId) : { departments: [], employees: [] };
    COMPANY_STAFF_STORE[companyId] = {
      departments: (seed.departments || []).map((d) => ({ head: '', policy: '', ...d })),
      employees: (seed.employees || []).map((e) => ({ position: '', email: '', dob: '—', inPolicy: true, ...e })),
    };
  }
  return COMPANY_STAFF_STORE[companyId];
}

const TP_DEPARTMENTS = window.TP_DEPARTMENTS || (window.TP_DEPARTMENTS = {});
function departmentsFor(companyId) { return companyStaffStore(companyId).departments; }

const TRAVEL_POLICIES = window.TRAVEL_POLICIES || (window.TRAVEL_POLICIES = {});
function travelPolicyFor(companyId) {
  if (!TRAVEL_POLICIES[companyId]) {
    TRAVEL_POLICIES[companyId] = {
      policy: defaultTravelPolicy(),
      history: [
        { date: '02.06.2026 11:20', user: 'Акимова Айсулуу', title: 'Политика создана', fields: ['Инициализация тревел-политики'] },
        { date: '18.06.2026 15:04', user: 'Кими Райкконен', title: 'Изменён лимит по авиа', fields: ['Авиа · макс. стоимость', 'Авиа · класс обслуживания'] },
      ],
    };
  }
  return TRAVEL_POLICIES[companyId];
}




const SVC_ACCESS_KINDS = ['Авиа', 'ЖД', 'Гостиницы', 'Трансферы', 'Визы', 'Страхование'];
const SVC_ACCESS_RIGHTS = ['Просмотр', 'Поиск', 'Бронирование', 'Выписка', 'Обмен', 'Возврат', 'Отмена', 'Корректировка документов', 'Отправка документов клиенту'];

function fullRights() { return SVC_ACCESS_RIGHTS.reduce((m, r) => (m[r] = true, m), {}); }
function noRights() { return SVC_ACCESS_RIGHTS.reduce((m, r) => (m[r] = false, m), {}); }

const OPERATOR_SVC_ACCESS = window.OPERATOR_SVC_ACCESS || (window.OPERATOR_SVC_ACCESS = {
  'Акимова Айсулуу': { fullAccess: true, kinds: {} },
  'Даниель': { fullAccess: false, kinds: { 'Авиа': fullRights(), 'ЖД': fullRights() } },
  'Адилет Медербеков': { fullAccess: false, kinds: { 'Гостиницы': fullRights() } },
  'Кими Райкконен': { fullAccess: true, kinds: {} },
  'Азамат А.': { fullAccess: false, kinds: { 'Трансферы': fullRights(), 'Визы': fullRights() } },
  'Куба': { fullAccess: false, kinds: { 'Страхование': fullRights(), 'Визы': fullRights() } },
});
function operatorSvcAccess(name) {
  if (!OPERATOR_SVC_ACCESS[name]) OPERATOR_SVC_ACCESS[name] = { fullAccess: false, kinds: {} };
  return OPERATOR_SVC_ACCESS[name];
}
function operatorKindsLabel(name) {
  const a = operatorSvcAccess(name);
  if (a.fullAccess) return 'Все услуги';
  const ks = Object.keys(a.kinds || {}).filter((k) => Object.values(a.kinds[k]).some(Boolean));
  return ks.length ? ks.join(', ') : '—';
}

const ORDER_SVC_RESPONSIBLES = window.ORDER_SVC_RESPONSIBLES || (window.ORDER_SVC_RESPONSIBLES = {
  51162: [
    { kind: 'Авиа', service: 'FRU → IST · Turkish Airlines', operator: 'Даниель' },
    { kind: 'Гостиницы', service: 'Hilton Istanbul · 3 ночи', operator: 'Адилет Медербеков' },
    { kind: 'Трансферы', service: 'Аэропорт → отель', operator: 'Азамат А.' },
    { kind: 'Визы', service: 'Виза Турция · 2 чел.', operator: 'Куба' },
  ],
});
function orderResponsibles(no) { return ORDER_SVC_RESPONSIBLES[no] || []; }

const ORDER_RESP_HISTORY = window.ORDER_RESP_HISTORY || (window.ORDER_RESP_HISTORY = {
  51162: [
    { date: '10.06.2026 09:12', text: 'Авиа: назначен Даниель', user: 'Акимова Айсулуу' },
    { date: '10.06.2026 09:20', text: 'Гостиницы: Даниель → Адилет Медербеков', user: 'Акимова Айсулуу' },
  ],
});

const ORDER_ACTION_LOG = window.ORDER_ACTION_LOG || (window.ORDER_ACTION_LOG = {
  51162: [
    { time: '10.06 09:14', operator: 'Даниель', kind: 'Авиа', action: 'Поиск авиабилетов', result: 'Найдено 24 варианта' },
    { time: '10.06 09:31', operator: 'Даниель', kind: 'Авиа', action: 'Бронирование', result: 'PNR ABC123 создан' },
    { time: '10.06 10:02', operator: 'Адилет Медербеков', kind: 'Гостиницы', action: 'Бронирование отеля', result: 'Hilton подтверждён' },
    { time: '10.06 11:40', operator: 'Даниель', kind: 'Авиа', action: 'Выписка билета', result: 'Билет выписан, EMD оформлен' },
    { time: '10.06 12:32', operator: 'Даниель', kind: 'Авиа', action: 'Обмен', result: 'Дата вылета изменена' },
    { time: '10.06 15:10', operator: 'Азамат А.', kind: 'Трансферы', action: 'Бронирование трансфера', result: 'Подтверждён' },
  ],
});
function orderActionLog(no) { return ORDER_ACTION_LOG[no] || []; }





const EXTRA_STAGES = ['Поиск', 'Бронирование', 'Выписка'];

const EXTRA_AVAIL = ['До бронирования', 'После бронирования', 'После выписки', 'На любом этапе'];

const EXTRA_STATUS = {
  available: { label: 'Доступна', tone: 'green' },
  unavailable: { label: 'Недоступна', tone: 'gray' },
  request: { label: 'Требуется запрос поставщику', tone: 'amber' },
  manual: { label: 'Только вручную', tone: 'blue' },
  issued: { label: 'Уже оформлена', tone: 'teal' },
};

const EXTRA_SVC_CATALOG = window.EXTRA_SVC_CATALOG || (window.EXTRA_SVC_CATALOG = [
  { id: 'seat', name: 'Выбор места', category: 'Комфорт', icon: 'grid', stages: ['После бронирования', 'После выписки'], emd: true, manual: true, fee: true, feeName: 'Сервисный сбор за место', desc: 'Выбор конкретного места в салоне.' },
  { id: 'bag', name: 'Дополнительный багаж', category: 'Багаж', icon: 'luggage', stages: ['На любом этапе'], emd: true, manual: true, fee: true, feeName: 'Сбор за багаж', desc: 'Дополнительное место багажа сверх нормы тарифа.' },
  { id: 'meal', name: 'Питание', category: 'Питание', icon: 'utensils', stages: ['До бронирования', 'После бронирования'], emd: false, manual: true, fee: false, feeName: '', desc: 'Специальное или дополнительное питание на борту.' },
  { id: 'ins', name: 'Страхование', category: 'Страхование', icon: 'shield', stages: ['На любом этапе'], emd: false, manual: true, fee: true, feeName: 'Сервисный сбор страхование', desc: 'Страховой полис ВЗР / отмена поездки.' },
  { id: 'extrabag', name: 'Перевозка спортинвентаря', category: 'Багаж', icon: 'luggage', stages: ['До бронирования', 'После бронирования'], emd: true, manual: true, fee: true, feeName: 'Сбор за спортинвентарь', desc: 'Перевозка негабаритного спортивного инвентаря.' },
  { id: 'pet', name: 'Перевозка животных', category: 'Спецобслуживание', icon: 'heart', stages: ['До бронирования'], emd: true, manual: true, fee: true, feeName: 'Сбор за животное', desc: 'Перевозка животного в салоне / багажном отсеке.' },
  { id: 'special', name: 'Спец. обслуживание (WCHR, UMNR)', category: 'Спецобслуживание', icon: 'user', stages: ['До бронирования', 'После бронирования'], emd: false, manual: true, fee: false, feeName: '', desc: 'Сопровождение, инвалидное кресло, несопровождаемый ребёнок.' },
  { id: 'lounge', name: 'Бизнес-зал', category: 'Комфорт', icon: 'coffee', stages: ['До бронирования', 'После выписки'], emd: true, manual: true, fee: true, feeName: 'Сбор за бизнес-зал', desc: 'Доступ в бизнес-зал аэропорта.' },
  { id: 'fast', name: 'Fast Track', category: 'Комфорт', icon: 'zap', stages: ['До бронирования', 'После выписки'], emd: true, manual: true, fee: true, feeName: 'Сбор за Fast Track', desc: 'Ускоренное прохождение контроля.' },
  { id: 'emd', name: 'Докупить услугу у авиакомпании', category: 'EMD', icon: 'ticket', stages: ['После выписки'], emd: true, manual: false, fee: true, feeName: 'Сервисный сбор EMD', desc: 'Дополнительная EMD-услуга у перевозчика после выписки.' },
]);
function extraCatalogItem(id) { return EXTRA_SVC_CATALOG.find((x) => x.id === id); }




function extrasFromSupplier(stage, supplierHasApi, issued) {
  issued = issued || {};
  const stageAllows = (item) => {
    if (item.stages.includes('На любом этапе')) return true;
    if (stage === 'Бронирование') return item.stages.includes('До бронирования') || item.stages.includes('После бронирования');
    if (stage === 'Выписка') return item.stages.includes('После выписки') || item.stages.includes('После бронирования') || item.stages.includes('На любом этапе');
    return item.stages.includes('До бронирования');
  };

  const apiReturns = stage === 'Выписка'
    ? ['seat', 'bag', 'meal', 'lounge', 'fast', 'emd', 'ins']
    : ['seat', 'bag', 'meal', 'ins', 'pet', 'special', 'extrabag'];
  return EXTRA_SVC_CATALOG.map((item) => {
    let status = 'unavailable';
    const allowed = stageAllows(item);
    if (issued[item.id]) status = 'issued';
    else if (!allowed) status = 'unavailable';
    else if (supplierHasApi) status = apiReturns.includes(item.id) ? 'available' : 'unavailable';
    else status = item.manual ? 'request' : 'unavailable';
    return { ...item, status, availableNow: allowed };
  });
}









const CARD_STATUS_FLOW = ['created', 'sent', 'delivered', 'viewed', 'chosen', 'issued'];
const CARD_STATUS = {
  created:       { label: 'Создана',           tone: 'gray',  icon: 'template' },
  sent:          { label: 'Отправлена',        tone: 'blue',  icon: 'send' },
  delivered:     { label: 'Доставлена',        tone: 'teal',  icon: 'check' },
  viewed:        { label: 'Просмотрена',       tone: 'blue',  icon: 'eye' },
  chosen:        { label: 'Выбрана клиентом',  tone: 'green', icon: 'checkCircle' },
  declined:      { label: 'Отклонена',         tone: 'red',   icon: 'x' },
  expired:       { label: 'Срок действия истёк', tone: 'amber', icon: 'clock' },
  price_changed: { label: 'Цена изменилась',   tone: 'amber', icon: 'alertCircle' },
  unavailable:   { label: 'Недоступна',        tone: 'gray',  icon: 'alertCircle' },
  issued:        { label: 'Оформлена',         tone: 'green', icon: 'checkCircle' },
};
function cardStatus(k) { return CARD_STATUS[k] || CARD_STATUS.created; }



const SEND_CHANNELS = {
  'Внутренний чат': { icon: 'chat', tone: 'amber', adapt: 'интерактивная карточка внутри CRM' },
  'Telegram':       { icon: 'send', tone: 'blue',  adapt: 'карточка + кнопки «Выбрать / Отклонить»' },
  'WhatsApp':       { icon: 'chat', tone: 'green', adapt: 'сообщение с изображением карточки и ссылкой' },
  'MAX':            { icon: 'chat', tone: 'blue',  adapt: 'интерактивная карточка мессенджера MAX' },
  'Email':          { icon: 'mail', tone: 'teal',  adapt: 'письмо с HTML-карточкой услуги' },
};
function sendChannelMeta(name) { return SEND_CHANNELS[name] || SEND_CHANNELS['Внутренний чат']; }

function orderClientChannel(no) {
  const src = (typeof CHAT_THREADS !== 'undefined') ? CHAT_THREADS : [];
  const t = src.find((x) => x.order === no && x.type === 'client');
  const ch = t && t.channel;
  return SEND_CHANNELS[ch] ? ch : 'Внутренний чат';
}



const CARD_CLIENT_VISIBILITY = window.CARD_CLIENT_VISIBILITY || (window.CARD_CLIENT_VISIBILITY = {
  clientTotal: true, serviceFee: false, supplierPrice: false, commission: false, markup: false, profit: false, cost: false,
});

function cardInternals(item) {
  const calc = (item && item.calc) || {};
  const isOffer = !!item && item.cost != null;
  const tariff = calc.tariff != null ? calc.tariff : (isOffer ? item.cost : (item.sum || 0));
  const taxes = calc.taxes || 0;
  const fee = calc.fee != null ? calc.fee : (isOffer ? (item.fee || 0) : 0);
  const commission = calc.commission || 0;
  const markup = calc.markup || 0;
  const clientTotal = calc.total != null ? calc.total : (isOffer ? (item.cost + (item.fee || 0)) : (item.sum || 0));
  const cost = Math.max(0, tariff + taxes - commission);
  const profit = commission + fee + markup;
  return { supplierPrice: tariff + taxes, cost, commission, fee, markup, profit, clientTotal, currency: item && item.currency };
}

Object.assign(window, {
  CARD_STATUS, CARD_STATUS_FLOW, cardStatus, SEND_CHANNELS, sendChannelMeta, orderClientChannel,
  CARD_CLIENT_VISIBILITY, cardInternals,
  OPERATOR_SLA, operatorSla, SLA_QUEUE, slaTone, slaLabel,
  TP_SCOPES, TP_CLASSES_AVIA, TP_RAIL_CLASSES, TP_AIRLINES, TP_RAIL_TYPES, TP_HOTEL_CHAINS, TP_HOTEL_CATEGORIES, TP_BOARD, TP_CAR_CLASSES, TP_CURRENCIES, TP_EMPLOYEES,
  TP_COMPLIANCE, defaultTravelPolicy, TRAVEL_POLICIES, travelPolicyFor, TP_DEPARTMENTS, departmentsFor, COMPANY_STAFF_STORE, companyStaffStore,
  SVC_ACCESS_KINDS, SVC_ACCESS_RIGHTS, fullRights, noRights, OPERATOR_SVC_ACCESS, operatorSvcAccess, operatorKindsLabel,
  ORDER_SVC_RESPONSIBLES, orderResponsibles, ORDER_RESP_HISTORY, ORDER_ACTION_LOG, orderActionLog,
  EXTRA_STAGES, EXTRA_AVAIL, EXTRA_STATUS, EXTRA_SVC_CATALOG, extraCatalogItem, extrasFromSupplier,
});



export { OPERATOR_SLA, operatorSla, SLA_QUEUE, slaTone, slaLabel, TP_SCOPES, TP_CLASSES_AVIA, TP_RAIL_CLASSES, TP_AIRLINES, TP_RAIL_TYPES, TP_HOTEL_CHAINS, TP_HOTEL_CATEGORIES, TP_BOARD, TP_CAR_CLASSES, TP_CURRENCIES, TP_EMPLOYEES, TP_COMPLIANCE, defaultTravelPolicy, COMPANY_STAFF_STORE, companyStaffStore, TP_DEPARTMENTS, departmentsFor, TRAVEL_POLICIES, travelPolicyFor, SVC_ACCESS_KINDS, SVC_ACCESS_RIGHTS, fullRights, noRights, OPERATOR_SVC_ACCESS, operatorSvcAccess, operatorKindsLabel, ORDER_SVC_RESPONSIBLES, orderResponsibles, ORDER_RESP_HISTORY, ORDER_ACTION_LOG, orderActionLog, EXTRA_STAGES, EXTRA_AVAIL, EXTRA_STATUS, EXTRA_SVC_CATALOG, extraCatalogItem, extrasFromSupplier, CARD_STATUS_FLOW, CARD_STATUS, cardStatus, SEND_CHANNELS, sendChannelMeta, orderClientChannel, CARD_CLIENT_VISIBILITY, cardInternals };
