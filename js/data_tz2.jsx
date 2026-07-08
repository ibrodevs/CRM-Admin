// ===== Данные под второй пакет ТЗ: SLA-отклик, тревел-политика, доступ операторов по услугам,
//        динамические доп. услуги. Загружается сразу после data.jsx. =====

/* ============================================================
   БЛОК A — отклик оператора на заявку (минуты) + просрочки
   ============================================================ */
const OPERATOR_SLA = window.OPERATOR_SLA || (window.OPERATOR_SLA = {
  'Акимова Айсулуу': 15, 'Даниель': 10, 'Адилет Медербеков': 20, 'Кими Райкконен': 15, 'Азамат А.': 30, 'Куба': 15,
});
function operatorSla(name) { return OPERATOR_SLA[name] != null ? OPERATOR_SLA[name] : 15; }
// Демо-очередь заявок, ожидающих отклика, для индикатора на дашборде.
const SLA_QUEUE = [
  { no: 51162, client: 'ОсОО «Гранд лимитед»', operator: 'Даниель', waited: 14, limit: operatorSla('Даниель') }, // просрочка
  { no: 51156, client: 'Сагынбеков Икрам', operator: 'Кими Райкконен', waited: 12, limit: operatorSla('Кими Райкконен') }, // накал
  { no: 51172, client: 'Бейшеналиев Сагын', operator: 'Даниель', waited: 4, limit: operatorSla('Даниель') }, // ок
  { no: 51170, client: 'Emirates', operator: 'Куба', waited: 17, limit: operatorSla('Куба') }, // просрочка
  { no: 51180, client: 'Аттокуров Эрбол', operator: 'Адилет Медербеков', waited: 9, limit: operatorSla('Адилет Медербеков') }, // ок
];
// tone: red = просрочено (waited>limit), amber = накал (>=70% лимита), green = в норме
function slaTone(waited, limit) { return waited > limit ? 'red' : (waited >= limit * 0.7 ? 'amber' : 'green'); }
function slaLabel(t) { return t === 'red' ? 'Просрочено' : t === 'amber' ? 'Накал тайминга' : 'В норме'; }

/* ============================================================
   БЛОК C — тревел-политика компании
   ============================================================ */
const TP_SCOPES = ['Вся компания', 'Подразделение', 'Должность', 'Сотрудник'];
const TP_CLASSES_AVIA = ['Эконом', 'Премиум-эконом', 'Бизнес', 'Первый'];
const TP_RAIL_CLASSES = ['Сидячий', 'Плацкарт', 'Купе', 'СВ'];
// Справочники для выпадающих списков (без рукописного ввода) — по замечаниям клиента
const TP_AIRLINES = (typeof AIRLINES !== 'undefined')
  ? Object.values(AIRLINES).map((a) => a.name)
  : ['S7 Airlines', 'Turkish Airlines', 'Emirates', 'Aeroflot', 'Air Astana', 'Qatar Airways', 'Utair', 'Lufthansa', 'Pegasus'];
const TP_RAIL_TYPES = ['Сидячий', 'Плацкарт', 'Купе', 'СВ', 'Люкс'];
const TP_HOTEL_CHAINS = ['Hilton', 'Marriott', 'Radisson', 'Hyatt', 'Accor', 'InterContinental', 'Wyndham', 'Best Western', 'Локальные отели'];
const TP_HOTEL_CATEGORIES = ['3★', '4★', '5★'];
const TP_BOARD = ['Без питания', 'Завтрак', 'Полупансион', 'Полный пансион', 'All Inclusive'];
const TP_CAR_CLASSES = ['Эконом', 'Комфорт', 'Бизнес', 'Минивэн', 'VIP'];
const TP_CURRENCIES = (typeof CURRENCIES !== 'undefined') ? CURRENCIES.map((c) => c.code) : ['USD', 'EUR', 'RUB', 'KGS'];
// Список сотрудников для поиска согласующих (как поиск пассажира)
const TP_EMPLOYEES = [...new Set([
  ...(typeof USERS !== 'undefined' ? USERS.map((u) => u.name) : []),
  ...(typeof OPERATORS !== 'undefined' ? OPERATORS : []),
  'Нуралиев Данияр', 'Каримов Икрам', 'Сагынбеков Икрам',
])];
// Статусы контроля соответствия при подборе
const TP_COMPLIANCE = {
  ok: { label: 'Соответствует тревел-политике', tone: 'green', icon: 'checkCircle' },
  overLimit: { label: 'Превышен лимит стоимости', tone: 'amber', icon: 'alertCircle' },
  class: { label: 'Запрещённый класс обслуживания', tone: 'red', icon: 'alertCircle' },
  supplier: { label: 'Запрещённый поставщик', tone: 'red', icon: 'alertCircle' },
  approval: { label: 'Требуется согласование', tone: 'amber', icon: 'sla' },
};
// Политика по умолчанию для карточки компании (списки — массивы, не строки)
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
    // цепочка согласующих — список сотрудников по порядку
    approval: { required: true, approvers: ['Акимова Айсулуу'], onOverLimit: true, autoIfCompliant: true, allowWithout: false },
  };
}
// Подразделения компании + приглашённые в них сотрудники (создаются в тревел-политике)
const TP_DEPARTMENTS = window.TP_DEPARTMENTS || (window.TP_DEPARTMENTS = {});
function departmentsFor(companyId) {
  if (!TP_DEPARTMENTS[companyId]) {
    TP_DEPARTMENTS[companyId] = [
      { id: 'd1', name: 'Коммерческий отдел', head: 'Нуралиев Данияр', employees: ['Нуралиев Данияр', 'Каримов Икрам'] },
      { id: 'd2', name: 'Финансовый отдел', head: 'Сагынбеков Икрам', employees: ['Сагынбеков Икрам'] },
    ];
  }
  return TP_DEPARTMENTS[companyId];
}
// Пер-компанийные политики + история изменений
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

/* ============================================================
   БЛОК D — доступ операторов по видам услуг + ответственные в заказе
   ============================================================ */
const SVC_ACCESS_KINDS = ['Авиа', 'ЖД', 'Гостиницы', 'Трансферы', 'Визы', 'Страхование'];
const SVC_ACCESS_RIGHTS = ['Просмотр', 'Поиск', 'Бронирование', 'Выписка', 'Обмен', 'Возврат', 'Отмена', 'Корректировка документов', 'Отправка документов клиенту'];
// Полный набор прав по виду услуг
function fullRights() { return SVC_ACCESS_RIGHTS.reduce((m, r) => (m[r] = true, m), {}); }
function noRights() { return SVC_ACCESS_RIGHTS.reduce((m, r) => (m[r] = false, m), {}); }
// Профиль ответственности оператора по видам услуг (демо: специализации из ТЗ)
const OPERATOR_SVC_ACCESS = window.OPERATOR_SVC_ACCESS || (window.OPERATOR_SVC_ACCESS = {
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
// Ответственные по каждой услуге заказа (демо) + история переназначений
const ORDER_SVC_RESPONSIBLES = window.ORDER_SVC_RESPONSIBLES || (window.ORDER_SVC_RESPONSIBLES = {
  51162: [
    { kind: 'Авиа', service: 'FRU → IST · Turkish Airlines', operator: 'Даниель' },
    { kind: 'Гостиницы', service: 'Hilton Istanbul · 3 ночи', operator: 'Адилет Медербеков' },
    { kind: 'Трансферы', service: 'Аэропорт → отель', operator: 'Азамат А.' },
    { kind: 'Визы', service: 'Виза Турция · 2 чел.', operator: 'Куба' },
  ],
});
function orderResponsibles(no) { return ORDER_SVC_RESPONSIBLES[no] || []; }
// История переназначений ответственных
const ORDER_RESP_HISTORY = window.ORDER_RESP_HISTORY || (window.ORDER_RESP_HISTORY = {
  51162: [
    { date: '10.06.2026 09:12', text: 'Авиа: назначен Даниель', user: 'Акимова Айсулуу' },
    { date: '10.06.2026 09:20', text: 'Гостиницы: Даниель → Адилет Медербеков', user: 'Акимова Айсулуу' },
  ],
});
// Журнал действий операторов по заказу (кто / услуга / когда / результат)
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

/* ============================================================
   БЛОК E — динамические доп. услуги (по этапам + по API поставщика)
   ============================================================ */
// Этап оформления заказа/услуги
const EXTRA_STAGES = ['Поиск', 'Бронирование', 'Выписка'];
// Когда услуга в принципе может быть доступна
const EXTRA_AVAIL = ['До бронирования', 'После бронирования', 'После выписки', 'На любом этапе'];
// Статусы услуги (что вернул поставщик / как оформляется)
const EXTRA_STATUS = {
  available: { label: 'Доступна', tone: 'green' },
  unavailable: { label: 'Недоступна', tone: 'gray' },
  request: { label: 'Требуется запрос поставщику', tone: 'amber' },
  manual: { label: 'Только вручную', tone: 'blue' },
  issued: { label: 'Уже оформлена', tone: 'teal' },
};
// Справочник доп. услуг (в настройках). Определяет отображение и правила, НЕ доступность.
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

// Симуляция ответа API поставщика: какие доп. услуги доступны для текущего этапа/поставщика.
// CRM НЕ угадывает — показывает только то, что «вернул поставщик». Для локальных поставщиков (без API)
// услуги помечаются как ручной запрос.
function extrasFromSupplier(stage, supplierHasApi, issued) {
  issued = issued || {};
  const stageAllows = (item) => {
    if (item.stages.includes('На любом этапе')) return true;
    if (stage === 'Бронирование') return item.stages.includes('До бронирования') || item.stages.includes('После бронирования');
    if (stage === 'Выписка') return item.stages.includes('После выписки') || item.stages.includes('После бронирования') || item.stages.includes('На любом этапе');
    return item.stages.includes('До бронирования');
  };
  // «ответ API»: детерминированный демо-набор, зависящий от этапа
  const apiReturns = stage === 'Выписка'
    ? ['seat', 'bag', 'meal', 'lounge', 'fast', 'emd', 'ins']
    : ['seat', 'bag', 'meal', 'ins', 'pet', 'special', 'extrabag'];
  return EXTRA_SVC_CATALOG.map((item) => {
    let status = 'unavailable';
    const allowed = stageAllows(item);
    if (issued[item.id]) status = 'issued';
    else if (!allowed) status = 'unavailable';
    else if (supplierHasApi) status = apiReturns.includes(item.id) ? 'available' : 'unavailable';
    else status = item.manual ? 'request' : 'unavailable'; // локальный поставщик без API → ручной запрос
    return { ...item, status, availableNow: allowed };
  });
}

Object.assign(window, {
  OPERATOR_SLA, operatorSla, SLA_QUEUE, slaTone, slaLabel,
  TP_SCOPES, TP_CLASSES_AVIA, TP_RAIL_CLASSES, TP_AIRLINES, TP_RAIL_TYPES, TP_HOTEL_CHAINS, TP_HOTEL_CATEGORIES, TP_BOARD, TP_CAR_CLASSES, TP_CURRENCIES, TP_EMPLOYEES,
  TP_COMPLIANCE, defaultTravelPolicy, TRAVEL_POLICIES, travelPolicyFor, TP_DEPARTMENTS, departmentsFor,
  SVC_ACCESS_KINDS, SVC_ACCESS_RIGHTS, fullRights, noRights, OPERATOR_SVC_ACCESS, operatorSvcAccess, operatorKindsLabel,
  ORDER_SVC_RESPONSIBLES, orderResponsibles, ORDER_RESP_HISTORY, ORDER_ACTION_LOG, orderActionLog,
  EXTRA_STAGES, EXTRA_AVAIL, EXTRA_STATUS, EXTRA_SVC_CATALOG, extraCatalogItem, extrasFromSupplier,
});
