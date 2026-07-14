// ===== Универсальная система карточек услуг (ТЗ «Карточки заказа») =====
// Карточка не «жёсткая под ситуацию», а собирается из трёх параметров:
//   1) вид услуги (kind) — определяет состав данных;
//   2) сценарий (scenario) — назначение, ярлык, финансовая логика, действия клиента;
//   3) состояние (status) — актуальность и доступность действий.
// Одна архитектура обслуживает авиа / ЖД / гостиницы / трансферы и форс-мажоры.
// Карточка услуги — самостоятельная сущность (отдельно от коммерческого предложения).
// Модуль грузится после data_tz2.jsx (реиспользует CARD_STATUS, SEND_CHANNELS, cardInternals).

/* ============================================================
   1. КАТАЛОГ ДЕЙСТВИЙ КЛИЕНТА (не привязаны к виду услуги — задаются сценарием, §16)
   ============================================================ */
const CARD_ACTION_CATALOG = {
  choose:           { label: 'Выбрать',                    kind: 'primary',   icon: 'checkCircle' },
  choose_variant:   { label: 'Выбрать этот вариант',       kind: 'primary',   icon: 'checkCircle' },
  view_others:      { label: 'Посмотреть другие варианты', kind: 'secondary', icon: 'grid' },
  request_other:    { label: 'Запросить другой вариант',   kind: 'secondary', icon: 'refund' },
  ask:              { label: 'Задать вопрос',              kind: 'secondary', icon: 'chat' },
  decline:          { label: 'Отказаться',                 kind: 'ghost',     icon: 'x' },
  confirm_exchange: { label: 'Подтвердить обмен',          kind: 'primary',   icon: 'swap' },
  decline_exchange: { label: 'Отказаться от обмена',       kind: 'ghost',     icon: 'x' },
  choose_other:     { label: 'Выбрать другой вариант',     kind: 'secondary', icon: 'grid' },
  acknowledge:      { label: 'Ознакомился',                kind: 'primary',   icon: 'check' },
  request_alt:      { label: 'Запросить альтернативу',     kind: 'secondary', icon: 'refund' },
  contact:          { label: 'Связаться с оператором',     kind: 'secondary', icon: 'phone' },
  request_refund:   { label: 'Запросить возврат',          kind: 'secondary', icon: 'refund' },
  choose_alt:       { label: 'Выбрать альтернативу',       kind: 'primary',   icon: 'checkCircle' },
  confirm_replace:  { label: 'Подтвердить замену',         kind: 'primary',   icon: 'swap' },
};
function cardAction(id) { return CARD_ACTION_CATALOG[id] || { label: id, kind: 'secondary', icon: 'chevRight' }; }

/* ============================================================
   2. КАТАЛОГ БЛОКОВ КАРТОЧКИ (§29) — карточка собирается из независимых блоков
   ============================================================ */
const CARD_BLOCK_CATALOG = {
  header:          'Заголовок',
  label:           'Ярлык',
  route:           'Маршрут',
  segments:        'Сегменты',
  dates:           'Даты',
  transport:       'Транспорт',
  accommodation:   'Проживание',
  passengers:      'Пассажиры / гости',
  fare:            'Тариф',
  baggage:         'Багаж',
  seats:           'Места',
  extras:          'Доп. услуги',
  source_variant:  'Исходный вариант',
  new_variant:     'Новый вариант',
  comparison:      'Сравнение',
  financial:       'Финансовый блок',
  conditions:      'Условия',
  warning:         'Предупреждение',
  response:        'Срок ответа',
  actions:         'Действия клиента',
  attachments:     'Вложения',
  contacts:        'Контакты оператора',
};

/* ============================================================
   3. СЦЕНАРИИ КАРТОЧЕК (§4) — системный тип + настраиваемое клиентское название,
      ярлык, финансовая логика, доступные действия, блоки. Хранятся как системные типы.
   fin: 'full' | 'exchange' | 'none' | 'refund'
   ============================================================ */
const CARD_SCENARIOS = window.CARD_SCENARIOS || (window.CARD_SCENARIOS = {
  new_offer: {
    sys: 'new_offer', name: 'Новая услуга', badge: 'Новое предложение', tone: 'blue',
    labels: ['Новое предложение', 'Ваш вариант поездки', 'Предложение услуги'],
    fin: 'full', actions: ['choose', 'request_other', 'ask', 'decline'],
    blocks: ['header', 'label', 'route', 'dates', 'fare', 'baggage', 'passengers', 'conditions', 'financial', 'response', 'actions', 'attachments'],
    kinds: ['Авиа', 'ЖД', 'Гостиница', 'Гостиницы', 'Трансфер', 'Трансферы', 'Автобус', 'Такси', 'Виза', 'Визы', 'Страхование', 'Доп. услуга'],
  },
  alternative: {
    sys: 'alternative', name: 'Альтернативный вариант', badge: 'Альтернативный вариант', tone: 'teal',
    labels: ['Альтернативный вариант', 'Другой вариант поездки', 'Вариант на выбор'],
    fin: 'full', actions: ['choose_variant', 'view_others', 'request_other', 'ask'],
    blocks: ['header', 'label', 'route', 'dates', 'fare', 'baggage', 'passengers', 'conditions', 'financial', 'response', 'actions'],
    kinds: ['Авиа', 'ЖД', 'Гостиница', 'Гостиницы', 'Трансфер', 'Трансферы', 'Автобус'],
  },
  voluntary_exchange: {
    sys: 'voluntary_exchange', name: 'Добровольный обмен', badge: 'Добровольный обмен', tone: 'blue',
    labels: ['Добровольный обмен', 'Вариант для обмена', 'Обмен по вашей просьбе'],
    fin: 'exchange', actions: ['confirm_exchange', 'choose_other', 'request_other', 'ask', 'decline_exchange'],
    blocks: ['header', 'label', 'source_variant', 'new_variant', 'comparison', 'financial', 'conditions', 'response', 'actions'],
    kinds: ['Авиа', 'ЖД', 'Гостиница', 'Гостиницы', 'Трансфер', 'Трансферы'],
    linksSource: true,
  },
  involuntary_exchange: {
    sys: 'involuntary_exchange', name: 'Вынужденный обмен', badge: 'Вынужденный обмен', tone: 'amber',
    labels: ['Вынужденный обмен', 'Замена по инициативе поставщика', 'Изменение оформленной услуги'],
    // §9: при вынужденном обмене сбор не добавляется автоматически
    fin: 'exchange', noAutoFee: true, actions: ['confirm_exchange', 'choose_other', 'request_other', 'ask', 'decline_exchange'],
    blocks: ['header', 'label', 'warning', 'source_variant', 'new_variant', 'comparison', 'financial', 'conditions', 'response', 'actions'],
    kinds: ['Авиа', 'ЖД', 'Гостиница', 'Гостиницы', 'Трансфер', 'Трансферы'],
    linksSource: true,
  },
  schedule_change: {
    sys: 'schedule_change', name: 'Изменение расписания', badge: 'Изменение расписания', tone: 'amber',
    labels: ['Изменение расписания', 'Время отправления изменено', 'Обновление поездки'],
    fin: 'none', actions: ['acknowledge', 'request_alt', 'contact', 'request_refund'],
    blocks: ['header', 'label', 'warning', 'source_variant', 'new_variant', 'comparison', 'conditions', 'response', 'actions', 'contacts'],
    kinds: ['Авиа', 'ЖД', 'Трансфер', 'Трансферы', 'Автобус'],
    linksSource: true,
  },
  delay: {
    sys: 'delay', name: 'Задержка', badge: 'Рейс задержан', tone: 'amber',
    // §5: ярлык зависит от вида услуги
    badgeByKind: { 'Авиа': 'Рейс задержан', 'ЖД': 'Поезд задержан', 'Трансфер': 'Трансфер задерживается', 'Трансферы': 'Трансфер задерживается', 'Автобус': 'Автобус задерживается' },
    labels: ['Рейс задержан', 'Поезд задержан', 'Задержка отправления', 'Информация о задержке'],
    fin: 'none', actions: ['acknowledge', 'request_alt', 'contact', 'request_refund'],
    blocks: ['header', 'label', 'warning', 'transport', 'passengers', 'conditions', 'response', 'actions', 'contacts'],
    kinds: ['Авиа', 'ЖД', 'Трансфер', 'Трансферы', 'Автобус'],
    linksSource: true, forceMajeure: true,
  },
  cancellation: {
    sys: 'cancellation', name: 'Отмена', badge: 'Отмена услуги', tone: 'red',
    labels: ['Отмена услуги', 'Услуга отменена поставщиком', 'Бронирование отменено'],
    fin: 'none', actions: ['choose_alt', 'request_refund', 'contact'],
    blocks: ['header', 'label', 'warning', 'source_variant', 'conditions', 'response', 'actions', 'contacts'],
    kinds: ['Авиа', 'ЖД', 'Гостиница', 'Гостиницы', 'Трансфер', 'Трансферы', 'Автобус'],
    linksSource: true, forceMajeure: true,
  },
  refund: {
    sys: 'refund', name: 'Возврат', badge: 'Возврат', tone: 'teal',
    labels: ['Возврат', 'Предложение возврата', 'Возврат оформлен'],
    fin: 'refund', actions: ['acknowledge', 'request_refund', 'contact'],
    blocks: ['header', 'label', 'source_variant', 'financial', 'conditions', 'response', 'actions', 'contacts'],
    kinds: ['Авиа', 'ЖД', 'Гостиница', 'Гостиницы', 'Трансфер', 'Трансферы'],
    linksSource: true,
  },
  service_unavailable: {
    sys: 'service_unavailable', name: 'Услуга недоступна', badge: 'Вариант недоступен', tone: 'gray',
    labels: ['Вариант недоступен', 'Услуга недоступна', 'Позиция больше не доступна'],
    fin: 'none', actions: ['choose_alt', 'request_other', 'contact'],
    blocks: ['header', 'label', 'warning', 'source_variant', 'response', 'actions', 'contacts'],
    kinds: ['Авиа', 'ЖД', 'Гостиница', 'Гостиницы', 'Трансфер', 'Трансферы'],
    linksSource: true, forceMajeure: true,
  },
});
// Порядок отображения в списке выбора
const CARD_SCENARIO_ORDER = ['new_offer', 'alternative', 'voluntary_exchange', 'involuntary_exchange', 'schedule_change', 'delay', 'cancellation', 'refund', 'service_unavailable'];
function cardScenario(sys) { return CARD_SCENARIOS[sys] || CARD_SCENARIOS.new_offer; }
// Ярлык по сценарию + виду услуги (§5: у задержки ярлык зависит от вида)
function scenarioBadge(sys, kind) {
  const sc = cardScenario(sys);
  return (sc.badgeByKind && sc.badgeByKind[kind]) || sc.badge;
}
// Сценарии, доступные для данного вида услуги (с учётом включения администратором, §30)
function scenariosForKind(kind) {
  return CARD_SCENARIO_ORDER.filter((s) => { const sc = cardScenario(s); return sc.enabled !== false && sc.kinds.includes(kind); });
}
// Действия клиента по сценарию (§16)
function scenarioActions(sys) { return cardScenario(sys).actions.slice(); }

/* ============================================================
   3b. СОСТАВ ДАННЫХ ПО ВИДУ УСЛУГИ (§8 авиа, §11 ЖД, §13 трансфер, §14 гостиница).
       Вид услуги определяет состав данных (§2). Схема — сгруппированные блоки полей;
       значения берутся из структурированных деталей услуги (item.details.<kind>),
       а при их отсутствии карточка откатывается к обобщённым строкам item.info.
       g(d) — извлечение значения из объекта деталей; пустые поля в карточку не попадают.
   ============================================================ */
const CARD_KIND_FIELDS = {
  'Авиа': [
    { title: 'Маршрут', rows: [
      ['Маршрут', (d) => d.route], ['Аэропорт вылета', (d) => d.depAirport], ['Аэропорт прилёта', (d) => d.arrAirport],
      ['Терминал вылета', (d) => d.terminalDep], ['Терминал прилёта', (d) => d.terminalArr] ] },
    { title: 'Рейс', rows: [
      ['Авиакомпания', (d) => d.airline], ['Номер рейса', (d) => d.flightNo], ['Тип воздушного судна', (d) => d.aircraft],
      ['Вылет', (d) => join(d.depDate, d.depTime)], ['Прилёт', (d) => join(d.arrDate, d.arrTime)],
      ['В пути', (d) => d.duration], ['Пересадки', (d) => d.stops], ['Длительность пересадки', (d) => d.layover] ] },
    { title: 'Тариф и багаж', rows: [
      ['Класс обслуживания', (d) => d.cabin], ['Класс бронирования', (d) => d.bookingClass], ['Тариф', (d) => d.fare],
      ['Ручная кладь', (d) => d.handLuggage], ['Багаж', (d) => d.baggage], ['Питание', (d) => d.meal] ] },
    { title: 'Условия', rows: [
      ['Условия возврата', (d) => d.refund], ['Условия обмена', (d) => d.exchange],
      ['Дополнительные услуги', (d) => d.extras], ['Срок подтверждения', (d) => d.confirmBy] ] },
  ],
  'ЖД': [
    { title: 'Маршрут', rows: [
      ['Маршрут', (d) => d.route], ['Станция отправления', (d) => d.depStation], ['Станция прибытия', (d) => d.arrStation],
      ['Отправление', (d) => join(d.depDate, d.depTime)], ['Прибытие', (d) => join(d.arrDate, d.arrTime)] ] },
    { title: 'Поезд', rows: [
      ['Номер поезда', (d) => d.trainNo], ['Перевозчик', (d) => d.carrier], ['Тип поезда', (d) => d.trainType],
      ['Класс обслуживания', (d) => d.cabin], ['Вагон', (d) => d.wagon], ['Тип вагона', (d) => d.wagonType], ['Место', (d) => d.seat] ] },
    { title: 'Услуги и условия', rows: [
      ['Питание', (d) => d.meal], ['Постельное бельё', (d) => d.bedding], ['Дополнительные услуги', (d) => d.extras],
      ['Условия возврата', (d) => d.refund] ] },
  ],
  'Трансфер': [
    { title: 'Подача', rows: [
      ['Точка подачи', (d) => d.pickup], ['Пункт назначения', (d) => d.dropoff], ['Дата', (d) => d.date], ['Время', (d) => d.time],
      ['Связанный рейс/поезд', (d) => d.linkedFlight], ['Место встречи', (d) => d.meetPoint], ['Табличка', (d) => d.sign], ['Время ожидания', (d) => d.waitTime] ] },
    { title: 'Автомобиль', rows: [
      ['Тип автомобиля', (d) => d.carType], ['Класс автомобиля', (d) => d.carClass], ['Вместимость', (d) => d.capacity],
      ['Багаж', (d) => d.baggage], ['Номер автомобиля', (d) => d.carNumber] ] },
    { title: 'Водитель', rows: [
      ['Водитель', (d) => d.driver], ['Телефон водителя', (d) => d.driverPhone], ['Дополнительные условия', (d) => d.extra] ] },
  ],
  'Гостиница': [
    { title: 'Гостиница', rows: [
      ['Название', (d) => d.name], ['Категория', (d) => d.category], ['Адрес', (d) => d.address], ['Расположение', (d) => d.location] ] },
    { title: 'Проживание', rows: [
      ['Заезд', (d) => join(d.checkIn, d.checkInTime)], ['Выезд', (d) => join(d.checkOut, d.checkOutTime)], ['Ночей', (d) => d.nights],
      ['Категория номера', (d) => d.roomCategory], ['Тип номера', (d) => d.roomType], ['Тип кровати', (d) => d.bed],
      ['Размещение', (d) => d.occupancy], ['Питание', (d) => d.board] ] },
    { title: 'Условия', rows: [
      ['Условия отмены', (d) => d.cancel], ['Дополнительные услуги', (d) => d.extras], ['Срок подтверждения', (d) => d.confirmBy] ] },
  ],
};
// Блоки задержки (§10 авиа / §12 ЖД) — добавляются к карточке сценария «Задержка».
const CARD_DELAY_FIELDS = { title: 'Задержка', rows: [
  ['Плановое время', (d) => d.planned], ['Новое расчётное время', (d) => d.newTime], ['Продолжительность задержки', (d) => d.duration],
  ['Причина', (d) => d.reason], ['Статус рейса/поезда', (d) => d.status], ['Затронутые пересадки', (d) => d.connections], ['Риск потери стыковки', (d) => d.risk] ] };

function join(a, b) { return a && b ? (a + ' · ' + b) : (a || b || null); }
// Синонимы вида услуги (в разных местах CRM встречаются формы ед./мн. числа).
function normKind(kind) {
  return ({ 'Гостиницы': 'Гостиница', 'Трансферы': 'Трансфер', 'Ж/Д': 'ЖД', 'Железная дорога': 'ЖД' })[kind] || kind;
}
// Сбор данных карточки по виду услуги: возвращает сгруппированные блоки + плоский список (для мессенджера).
function buildCardFields(kind, item, scenarioSys) {
  const nk = normKind(kind);
  const details = (item.details && (item.details[nk] || item.details[kind])) || null;
  const schema = CARD_KIND_FIELDS[nk];
  const blocks = [];
  if (schema && details) {
    const d = details;
    schema.forEach((b) => {
      const rows = b.rows.map(([l, g]) => ({ l, v: g(d) })).filter((r) => r.v != null && r.v !== '');
      if (rows.length) blocks.push({ title: b.title, rows });
    });
    if (scenarioSys === 'delay' && details.delay) {
      const rows = CARD_DELAY_FIELDS.rows.map(([l, g]) => ({ l, v: g(details.delay) })).filter((r) => r.v != null && r.v !== '');
      if (rows.length) blocks.unshift({ title: CARD_DELAY_FIELDS.title, rows });
    }
  } else {
    // fallback — обобщённые строки услуги (подбор без структурированных деталей)
    const rows = (item.info || []).filter((r) => r && r.v != null).map((r) => ({ l: r.l, v: r.v }));
    if (rows.length) blocks.push({ title: null, rows });
  }
  const flat = blocks.reduce((a, b) => a.concat(b.rows), []);
  return { blocks, flat };
}

/* ============================================================
   4. ЗНАЧИМЫЕ ПОЛЯ ВЕРСИОННОСТИ (§23) — их изменение создаёт новую версию карточки
   ============================================================ */
const CARD_VERSION_FIELDS = ['route', 'date', 'time', 'supplier', 'flight', 'train', 'hotel', 'car', 'fare', 'class', 'baggage', 'seat', 'price', 'conditions', 'passengers', 'deadline', 'scenario', 'actions'];

/* ============================================================
   5. АДАПТАЦИЯ ПОД КАНАЛ (§18) — режимы предпросмотра
   ============================================================ */
const CHANNEL_MODE = {
  'Внутренний чат': 'internal',   // полноценная интерактивная карточка
  'Telegram':       'messenger',  // адаптированная карточка + поддерживаемые кнопки + ссылка
  'WhatsApp':       'messenger',
  'MAX':            'messenger',
  'Email':          'email',      // тема + текст + карточка + кнопки + вложения + ссылка
};
function channelMode(channel) { return CHANNEL_MODE[channel] || 'internal'; }

/* ============================================================
   6. ЖИВОЙ СТОР КАРТОЧЕК — карточки заказа с версиями, доставками, ответами, историей.
      Ключ: `${orderNo}:${serviceId}`. Отделён от КП: КП лишь ссылается на карточки.
   ============================================================ */
const SERVICE_CARDS_STORE = window.SERVICE_CARDS_STORE || (window.SERVICE_CARDS_STORE = {});
function cardsKey(orderNo, serviceId) { return String(orderNo) + ':' + String(serviceId); }
function cardsFor(orderNo, serviceId) { return SERVICE_CARDS_STORE[cardsKey(orderNo, serviceId)] || []; }
let __cardSeq = 1;
function nextCardId() { return 'SC-' + Date.now().toString(36) + '-' + (__cardSeq++); }
function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

// Создание/отправка карточки: фиксирует неизменяемую версию, регистрирует доставки и историю.
// draft — состояние из конструктора предпросмотра. operator — текущий пользователь.
function sendServiceCard(orderNo, serviceId, draft, operator) {
  const key = cardsKey(orderNo, serviceId);
  const list = SERVICE_CARDS_STORE[key] || (SERVICE_CARDS_STORE[key] = []);
  // была ли ранее актуальная карточка по этому же сервису → это новая версия (§23)
  const prev = list.find((c) => c.actual);
  const version = prev ? prev.version + 1 : 1;
  if (prev) {
    prev.actual = false;
    prev.status = 'superseded';           // «заменена»
    prev.staleNote = 'Карточка больше не актуальна. Ниже отправлена новая версия.';
    prev.history.push({ at: nowStamp(), user: operator, action: 'Создана новая версия', version: prev.version, note: '→ v' + version });
  }
  const at = nowStamp();
  const channels = (draft.channels && draft.channels.length) ? draft.channels : [draft.channel || 'Внутренний чат'];
  const card = {
    id: nextCardId(), orderNo, serviceId, kind: draft.kind,
    scenario: draft.scenario, clientLabel: draft.clientLabel, statuses: draft.statuses || [],
    accompanyingText: draft.accompanyingText || '', passengers: draft.passengers || [],
    validity: draft.validity, responseDeadline: draft.responseDeadline || '',
    actions: draft.actions || [], attachments: draft.attachments || [],
    visibility: { ...(draft.visibility || {}) }, channels,
    fin: draft.fin || null, source: draft.source || null, snapshot: draft.snapshot || null,
    version, prevId: prev ? prev.id : null, actual: true,
    status: 'sent', operator, createdAt: at, sentAt: at,
    deliveries: channels.map((ch) => ({ channel: ch, recipient: draft.recipient || 'клиент', status: 'queued', at })),
    responses: [],
    history: [
      { at, user: operator, action: 'Карточка создана', version },
      { at, user: operator, action: 'Предпросмотр открыт', version },
      { at, user: operator, action: 'Отправлена клиенту', version, channel: channels.join(', ') },
    ],
  };
  list.push(card);
  return card;
}

// Продвижение статусов доставки (демо: имитация подтверждений канала, §21).
function advanceDelivery(card, channel, status) {
  const d = card.deliveries.find((x) => x.channel === channel);
  if (d) { d.status = status; d.at = nowStamp(); }
  card.history.push({ at: nowStamp(), user: 'Система', action: 'Статус доставки: ' + (DELIVERY_STATUS[status] || status), channel, version: card.version });
}

// Фиксация ответа клиента (§16) — привязывается к карточке, версии, каналу, пассажирам.
function recordCardResponse(card, actionId, channel, pax) {
  const at = nowStamp();
  card.responses.push({ action: actionId, label: cardAction(actionId).label, at, channel, pax: pax || null });
  card.status = RESPONSE_STATUS[actionId] || 'answered';
  card.history.push({ at, user: 'Клиент', action: 'Действие клиента: ' + cardAction(actionId).label, channel, version: card.version });
  return card;
}

// Статусы доставки (§21)
const DELIVERY_STATUS = {
  created: 'Создано', queued: 'В очереди', sent: 'Отправлено', delivered: 'Доставлено',
  viewed: 'Просмотрено', failed: 'Ошибка доставки', channel_down: 'Канал недоступен',
  no_recipient: 'Получатель недоступен', resent: 'Отправлено повторно',
};
const DELIVERY_TONE = {
  created: 'gray', queued: 'gray', sent: 'blue', delivered: 'teal', viewed: 'green',
  failed: 'red', channel_down: 'red', no_recipient: 'amber', resent: 'blue',
};
// Ответ клиента → статус карточки (§22)
const RESPONSE_STATUS = {
  choose: 'chosen', choose_variant: 'chosen', confirm_exchange: 'chosen', choose_alt: 'chosen', confirm_replace: 'chosen', acknowledge: 'viewed',
  decline: 'declined', decline_exchange: 'declined',
};

/* ============================================================
   7. ПРАВА ДОСТУПА ОПЕРАТОРА ПО КАРТОЧКАМ (§26)
      Оператор создаёт/отправляет карточки только по доступным видам услуг.
      Права разделены: просмотр, создание, редактирование, изменение стоимости,
      изменение клиентских полей, отправка, повторная отправка, отмена, новая версия.
   ============================================================ */
const CARD_RIGHT_KEYS = ['view', 'create', 'edit', 'price', 'clientFields', 'send', 'resend', 'cancel', 'version'];
const CARD_RIGHT_LABELS = {
  view: 'Просмотр', create: 'Создание карточки', edit: 'Редактирование', price: 'Изменение стоимости',
  clientFields: 'Изменение клиентских полей', send: 'Отправка', resend: 'Повторная отправка', cancel: 'Отмена карточки', version: 'Создание новой версии',
};
function allCardRights() { return CARD_RIGHT_KEYS.reduce((m, k) => (m[k] = true, m), {}); }
function noCardRights() { return CARD_RIGHT_KEYS.reduce((m, k) => (m[k] = false, m), {}); }
// Доступ операторов к карточкам по видам услуг (демо: специализации из §26).
const OPERATOR_CARD_ACCESS = window.OPERATOR_CARD_ACCESS || (window.OPERATOR_CARD_ACCESS = {
  'Акимова Айсулуу':  { fullAccess: true, kinds: {} },     // администратор — все услуги
  'Кими Райкконен':   { fullAccess: true, kinds: {} },     // оператор с полным доступом
  'Даниель':          { fullAccess: false, kinds: { 'Авиа': allCardRights(), 'ЖД': allCardRights() } },
  'Адилет Медербеков':{ fullAccess: false, kinds: { 'Гостиница': allCardRights() } },
  'Азамат А.':        { fullAccess: false, kinds: { 'Трансфер': allCardRights(), 'Виза': { ...allCardRights(), price: false } } },
  'Куба':             { fullAccess: false, kinds: { 'Страхование': allCardRights(), 'Виза': allCardRights() } },
});
function operatorCardAccess(name) {
  if (!OPERATOR_CARD_ACCESS[name]) OPERATOR_CARD_ACCESS[name] = { fullAccess: false, kinds: {} };
  return OPERATOR_CARD_ACCESS[name];
}
// Итоговые права оператора по конкретному виду услуги.
function operatorCardRights(name, kind) {
  const a = operatorCardAccess(name);
  if (a.fullAccess) return allCardRights();
  const nk = normKind(kind);
  return a.kinds[nk] || a.kinds[kind] || noCardRights();
}

/* ============================================================
   8. ФОРС-МАЖОР (§15) — не отдельный вид услуги, а сценарий над существующей услугой.
      Форс-мажорная карточка содержит структурированное описание события.
   ============================================================ */
const FORCE_MAJEURE_TYPES = {
  info:        { label: 'Информационная',              actions: ['acknowledge', 'contact'] },
  alternative: { label: 'С выбором альтернативы',       actions: ['choose_alt', 'request_alt', 'contact'] },
  replace:     { label: 'С подтверждением замены',      actions: ['confirm_replace', 'request_other', 'contact'] },
  refund:      { label: 'С подтверждением возврата',    actions: ['request_refund', 'acknowledge', 'contact'] },
  contact:     { label: 'С запросом связи с оператором', actions: ['contact', 'acknowledge'] },
};
function defaultForceMajeure(item, operator) {
  return {
    fmType: 'info', event: '', affectedService: item.title || item.main || '', receivedAt: nowStamp(),
    source: '', affectedPax: 'Все пассажиры', whatChanged: '', operatorActions: '', alternatives: '',
    needResponse: true, responseBy: '', operatorContact: operator || '',
  };
}
// Строки форс-мажорного блока карточки (только заполненные — попадают в предпросмотр).
const FM_ROWS = [
  ['Что произошло', 'event'], ['Затронутая услуга', 'affectedService'], ['Информация получена', 'receivedAt'],
  ['Источник информации', 'source'], ['Затронутые пассажиры', 'affectedPax'], ['Что изменилось', 'whatChanged'],
  ['Действия оператора', 'operatorActions'], ['Доступные альтернативы', 'alternatives'], ['Ответ требуется до', 'responseBy'],
];
function buildForceMajeureRows(fm) {
  if (!fm) return [];
  return FM_ROWS.map(([l, k]) => ({ l, v: fm[k] })).filter((r) => r.v != null && r.v !== '');
}

/* Умный подбор альтернатив при отмене/недоступности услуги (ТЗ #1) — как при
   вынужденном обмене система подставляет варианты, а оператор корректирует/подтверждает.
   Демо: генерирует 3 близких варианта по виду услуги. */
function smartAlternatives(item, kind) {
  const nk = normKind(kind);
  const base = (item && (item.title || item.main)) || '';
  const route = (item && item.details && (item.details.route || (item.details[nk] && item.details[nk].route))) || base;
  const seed = (base.length + nk.length) % 3;
  const sets = {
    'Авиа': [
      { title: route + ' · Turkish Airlines', meta: 'Прямой · 09:20 → 12:40 · багаж 20 кг', price: 312, delta: '+21 $' },
      { title: route + ' · Air Astana', meta: '1 пересадка · 07:05 → 14:10 · багаж 20 кг', price: 268, delta: '−23 $' },
      { title: route + ' · S7 Airlines', meta: 'Прямой · 18:35 → 21:55 · ручная кладь', price: 289, delta: '−2 $' },
    ],
    'ЖД': [
      { title: route + ' · поезд 024Ц (купе)', meta: 'Отпр. 21:10 · 1 ночь · бельё вкл.', price: 96, delta: '−4 $' },
      { title: route + ' · поезд 116А (СВ)', meta: 'Отпр. 19:40 · повышенный комфорт', price: 148, delta: '+48 $' },
    ],
    'Гостиница': [
      { title: 'Hilton Garden Inn · 4★', meta: 'Double · BB · 0.4 км от точки', price: 143, delta: '−8 $' },
      { title: 'Ramada Encore · 4★', meta: 'Standard · BB · 0.9 км от точки', price: 118, delta: '−33 $' },
      { title: 'Radisson Blu · 5★', meta: 'Superior · BB · 1.2 км', price: 176, delta: '+25 $' },
    ],
    'Трансфер': [
      { title: 'Комфорт (седан)', meta: 'Встреча с табличкой · 60 мин ожидания', price: 34, delta: '=' },
      { title: 'Минивэн (до 6 чел.)', meta: 'Встреча с табличкой · багаж +', price: 52, delta: '+18 $' },
    ],
  };
  const list = sets[nk] || sets['Авиа'];
  // «Умный поиск»: слегка ротируем по seed, чтобы варианты отличались между услугами
  return list.map((v, i) => ({ id: nk + '-alt-' + i, ...v })).slice(0, 3).map((v, i, arr) => arr[(i + seed) % arr.length]);
}

/* Затронутая цепочка связанных услуг (ТЗ #2): при сдвиге/отмене рейса система
   показывает, какие услуги заказа требуют проверки, с их статусом. Общая рамка
   события — «Изменение рейса повлияло на N услуг». */
const CHAIN_STATUS = {
  ok:        { label: 'Без изменений',            tone: 'green' },
  reconfirm: { label: 'Требуется переподтверждение', tone: 'amber' },
  retime:    { label: 'Необходимо изменить время',   tone: 'amber' },
  risk:      { label: 'Риск отмены или доплаты',      tone: 'red' },
};
function affectedServiceChain(orderNo, kind) {
  // связанные услуги, типично зависящие от времени рейса
  const nk = normKind(kind);
  const resp = (typeof ORDER_SVC_RESPONSIBLES !== 'undefined' && ORDER_SVC_RESPONSIBLES[orderNo]) || null;
  if (resp && resp.length) {
    // из реальных услуг заказа берём все, кроме текущего вида, и присваиваем статус по типу
    const statusFor = (k) => (k === 'Трансферы' || k === 'Трансфер') ? 'retime' : (k === 'Гостиницы' || k === 'Гостиница') ? 'reconfirm' : (k === 'Страхование') ? 'ok' : 'risk';
    const out = resp.filter((r) => normKind(r.kind) !== nk).map((r) => ({ kind: r.kind, service: r.service, status: statusFor(r.kind) }));
    if (out.length) return out;
  }
  // демо-цепочка по умолчанию
  return [
    { kind: 'Трансфер', service: 'Аэропорт → отель', status: 'retime' },
    { kind: 'Гостиница', service: 'Заезд в отель', status: 'reconfirm' },
    { kind: 'Страхование', service: 'Медицинская страховка', status: 'ok' },
    { kind: 'Доп. услуга', service: 'Стыковочный рейс', status: 'risk' },
  ];
}

/* ============================================================
   КЕЙС ИЗМЕНЕНИЯ ПО ЗАКАЗУ — постоянная сущность в заказе (запрос клиента).
   При отмене/сдвиге рейса вся затронутая цепочка фиксируется в заказе со
   статусом обработки по каждой услуге. API-услуги проверяются автоматически,
   локальные — через запрос поставщику. Письмо клиенту — часть кейса и всегда
   доступно для корректировок (авто/ручной). Всё пишется в историю.
   ============================================================ */
// Канал обработки услуги: API (авто-сверка/подбор) или локальный поставщик (запрос).
function caseChannel(kind) {
  const nk = normKind(kind);
  return ['Гостиница', 'Гостиницы', 'Авиа', 'ЖД', 'Автобус'].includes(nk) ? 'api' : 'local';
}
// Статусы обработки услуги внутри кейса — цветом И текстом (не только цветом).
const CASE_SVC_STATUS = {
  idle:      { label: 'Не обработана',           tone: 'gray',  done: false },
  checking:  { label: 'Сверяется',               tone: 'blue',  done: false },
  dates_ok:  { label: 'Даты подтверждены',       tone: 'green', done: true },
  need_alt:  { label: 'Нужна альтернатива',      tone: 'amber', done: false },
  requested: { label: 'Запрос отправлен',        tone: 'blue',  done: false },
  awaiting:  { label: 'Ожидает подтверждения',   tone: 'amber', done: false },
  confirmed: { label: 'Подтверждено',            tone: 'green', done: true },
  declined:  { label: 'Отклонено поставщиком',   tone: 'red',   done: false },
  resolved:  { label: 'Альтернатива подобрана',  tone: 'green', done: true },
};
const CASE_TRIGGERS = ['Отмена рейса', 'Сдвиг даты вылета', 'Задержка рейса', 'Изменение расписания'];
// Хранилище кейсов по заказам (persist в рамках сессии).
const ORDER_CHANGE_CASES = window.ORDER_CHANGE_CASES || (window.ORDER_CHANGE_CASES = {});
function caseNow() { return new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function getChangeCase(orderNo) { return ORDER_CHANGE_CASES[orderNo] || null; }
function createChangeCase(orderNo, trigger, triggerTitle, kind) {
  const chain = affectedServiceChain(orderNo, kind);
  const t = caseNow();
  const services = chain.map((c, i) => ({
    id: 'cs-' + i, kind: c.kind, title: c.service, channel: caseChannel(c.kind),
    status: 'idle', alts: [], log: [{ t, text: 'Услуга включена в кейс изменения' }],
  }));
  const cs = {
    id: 'CH-' + (1000 + Object.keys(ORDER_CHANGE_CASES).length + Math.floor(Math.random() * 900)),
    orderNo, trigger, triggerTitle: triggerTitle || 'Рейс', created: t, services, letters: [],
    history: [{ t, text: 'Кейс изменения создан · ' + trigger + ' · ' + (triggerTitle || 'рейс') }],
  };
  ORDER_CHANGE_CASES[orderNo] = cs;
  return cs;
}
function caseProgress(cs) {
  if (!cs) return { done: 0, total: 0, pending: 0 };
  const total = cs.services.length;
  const done = cs.services.filter((s) => (CASE_SVC_STATUS[s.status] || {}).done).length;
  return { done, total, pending: total - done };
}

/* ============================================================
   9. НАСТРОЙКИ АДМИНИСТРАТОРА (§30) — включение видов/каналов, шаблоны email.
   ============================================================ */
const CARD_KINDS_ALL = ['Авиа', 'ЖД', 'Гостиница', 'Трансфер', 'Автобус', 'Такси', 'Доп. услуга', 'Страхование', 'Виза'];
const CARD_KINDS_ENABLED = window.CARD_KINDS_ENABLED || (window.CARD_KINDS_ENABLED = CARD_KINDS_ALL.reduce((m, k) => (m[k] = ['Авиа', 'ЖД', 'Гостиница', 'Трансфер'].includes(k), m), {}));
function cardKindEnabled(kind) { const nk = normKind(kind); return CARD_KINDS_ENABLED[nk] !== false; }
const CARD_CHANNELS_ENABLED = window.CARD_CHANNELS_ENABLED || (window.CARD_CHANNELS_ENABLED = Object.keys(SEND_CHANNELS).reduce((m, c) => (m[c] = true, m), {}));
function enabledChannels() { return Object.keys(SEND_CHANNELS).filter((c) => CARD_CHANNELS_ENABLED[c] !== false); }
// Шаблоны письма по сценарию (§30): тема и текст. {sys}, {title}, {label} подставляются.
const CARD_EMAIL_TEMPLATES = window.CARD_EMAIL_TEMPLATES || (window.CARD_EMAIL_TEMPLATES = {
  new_offer:           { subject: '{label} · {title}', body: 'Здравствуйте! Направляем детали по вашей услуге.' },
  voluntary_exchange:  { subject: '{label} · {title}', body: 'Здравствуйте! Подготовили вариант для обмена — проверьте условия и подтвердите.' },
  involuntary_exchange:{ subject: '{label} · {title}', body: 'Здравствуйте! По инициативе поставщика требуется замена услуги. Детали ниже.' },
  schedule_change:     { subject: '{label} · {title}', body: 'Здравствуйте! Изменилось расписание по вашей услуге. Ознакомьтесь с деталями.' },
  delay:               { subject: '{label} · {title}', body: 'Здравствуйте! Информируем о задержке. Актуальные данные ниже.' },
  cancellation:        { subject: '{label} · {title}', body: 'Здравствуйте! Услуга отменена. Предлагаем дальнейшие шаги.' },
});
function cardEmailTemplate(sys) { return CARD_EMAIL_TEMPLATES[sys] || { subject: '{label} · {title}', body: 'Здравствуйте! Направляем детали по вашей услуге.' }; }

Object.assign(window, {
  CARD_RIGHT_KEYS, CARD_RIGHT_LABELS, allCardRights, noCardRights, OPERATOR_CARD_ACCESS, operatorCardAccess, operatorCardRights,
  FORCE_MAJEURE_TYPES, defaultForceMajeure, buildForceMajeureRows, FM_ROWS, smartAlternatives, CHAIN_STATUS, affectedServiceChain,
  CARD_KINDS_ALL, CARD_KINDS_ENABLED, cardKindEnabled, CARD_CHANNELS_ENABLED, enabledChannels, CARD_EMAIL_TEMPLATES, cardEmailTemplate,
  CARD_ACTION_CATALOG, cardAction, CARD_BLOCK_CATALOG,
  CARD_SCENARIOS, CARD_SCENARIO_ORDER, cardScenario, scenarioBadge, scenariosForKind, scenarioActions,
  CARD_KIND_FIELDS, CARD_DELAY_FIELDS, buildCardFields, normKind,
  CARD_VERSION_FIELDS, CHANNEL_MODE, channelMode,
  SERVICE_CARDS_STORE, cardsKey, cardsFor, nextCardId, nowStamp,
  sendServiceCard, advanceDelivery, recordCardResponse, DELIVERY_STATUS, DELIVERY_TONE, RESPONSE_STATUS,
});
