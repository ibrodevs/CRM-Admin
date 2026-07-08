// ===== Mock data layer =====

const CURRENT_USER = {
  name: 'Акимова Айсулуу', role: 'Админ', email: 'akimova@psc-travelhub.kg', phone: '+996 (700) 12-34-56',
  avatar: 'assets/avatar-aisuluu.png', position: 'Администратор системы', dept: 'Управление', joined: '10.09.2024',
  // расширенный профиль (ТЗ): рабочие контакты, оргструктура, режим, локаль
  manager: '—', workEmail: 'akimova@psc-travelhub.kg', workPhone: '+996 (700) 12-34-56', internalPhone: '101',
  telegram: '@akimova_psc', hired: '10.09.2024', workStatus: 'Работает', presence: 'Онлайн',
  tz: '(GMT+6) Бишкек', lang: 'Русский', lastLogin: 'Сегодня, 09:14', slaResponseMin: 15,
};

// ---- enums / option sets ----
const ORDER_STATUS = {
  'Новое': 'teal', 'В работе': 'blue', 'Ожидание оплаты': 'amber',
  'Ожидает подтверж.': 'gray', 'Требует проверки': 'gray',
  'Оплачено': 'green', 'Отменено': 'red', 'Нет данных': 'gray',
};
const SERVICE_TYPE = {
  'Авиа': 'blue', 'Отель': 'teal', 'Трансфер': 'green',
  'Все включено': 'blue', 'Виза': 'amber', 'Новое': 'teal',
};
const REQUEST_TYPE = ['Групповая', 'Индивидуальная', 'Корпоративная'];
const SUPPLIER_STATUS = { 'Активный': 'green', 'Заблокированный': 'red', 'На паузе': 'amber' };
const FIN_STATUS = { 'Оплачено (FULL)': 'green', 'Частично': 'amber', 'Нехватает': 'red', 'Возврат': 'teal' };
const DOC_STATUS = { 'Подписано': 'green', 'Ожидает': 'red', 'В работе': 'blue' };
const DOC_STAGE = { 'Ожидание подтверж.': 'green', 'Новое': 'teal', 'Ожидает подтверж.': 'green', 'Отменено': 'red', 'В работе': 'blue', 'Ожидание оплаты': 'amber' };
const DOC_TYPE = { 'СНП': 'teal', 'Ваучер': 'green', 'Договор': 'blue', 'Акт': 'amber' };
const ORG_TYPE = { 'Авиакомпания': 'teal', 'Транспорт': 'green', 'HoReCa': 'blue', 'Другое': 'red' };

const CLIENTS = [
  'ОсОО "Гранд лимитед"', 'Аттокуров Эрбол', 'Бейшеналиев Сагын', 'Айбек Асылов',
  'ИП Мамажанов Абдутаир', 'Сагынбеков Икрам', 'Нуралиев Данияр', 'Усманов Бактыбек',
  'ОсОО "Asia Travel"', 'Каримов Икрам', 'Жумабекова Назгуль', 'Токтогулов Эмир',
];
const OPERATORS = ['Даниель', 'Адилет Медербеков', 'Кими Райкконен', 'Азамат А.', 'Куба'];

function rid(seed) { return 51150 + seed; }

// ---- ORDERS ----
const ORDERS = (() => {
  const base = [
    ['ОсОО "Гранд лимитед"', 'Групповая', 'Нет данных', 'Авиа', 'Даниель', 'Оператор', 4500, 4, 12],
    ['Аттокуров Эрбол', 'Групповая', 'Ожидание оплаты', 'Отель', 'Даниель', 'Админ', 800, 4, 58],
    ['Бейшеналиев Сагын', 'Индивидуальная', 'Новое', 'Новое', 'Даниель', 'Оператор', 790, 4, 22],
    ['Айбек Асылов', 'Групповая', 'Ожидает подтверж.', 'Трансфер', 'Даниель', 'Оператор', 4000, 4, 35],
    ['ИП Мамажанов Абдутаир', 'Корпоративная', 'Отменено', 'Трансфер', 'Даниель', 'Оператор', 3200, 4, 18],
    ['Сагынбеков Икрам', 'Корпоративная', 'В работе', 'Все включено', 'Даниель', 'Оператор', 3300, 4, 64],
    ['Бейшеналиев Сагын', 'Индивидуальная', 'Новое', 'Новое', 'Даниель', 'Оператор', 790, 4, 22],
    ['Аттокуров Эрбол', 'Групповая', 'Требует проверки', 'Отель', 'Даниель', 'Админ', 800, 4, 47],
    ['Нуралиев Данияр', 'Индивидуальная', 'Оплачено', 'Авиа', 'Адилет Медербеков', 'Оператор', 1660, 2, 100],
    ['Усманов Бактыбек', 'Корпоративная', 'В работе', 'Все включено', 'Кими Райкконен', 'Оператор', 2450, 3, 71],
    ['Каримов Икрам', 'Групповая', 'Ожидание оплаты', 'Виза', 'Даниель', 'Оператор', 1200, 2, 40],
    ['Жумабекова Назгуль', 'Индивидуальная', 'Новое', 'Отель', 'Азамат А.', 'Оператор', 980, 1, 15],
    ['Токтогулов Эмир', 'Групповая', 'Оплачено', 'Авиа', 'Даниель', 'Оператор', 5400, 6, 100],
    ['ОсОО "Asia Travel"', 'Корпоративная', 'В работе', 'Все включено', 'Куба', 'Оператор', 12400, 12, 55],
  ];
  return base.map((b, i) => ({
    id: rid(i + 2 + (i > 6 ? 6 : 0)) + (i % 5),
    no: 51162 - (i % 9),
    client: b[0], requestType: b[1], status: b[2], service: b[3],
    operator: b[4], operatorRole: b[5], sum: b[6], currency: 'USD',
    services: b[7], progress: b[8],
    date: '23.12.25',
  })).map((o, i) => ({ ...o, no: [51162, 51163, 51172, 51154, 51155, 51156, 51172, 51163, 51172, 51154, 51168, 51170, 51171, 51180][i] }));
})();

// ---- SUPPLIERS ----
const SUPPLIERS = [
  { no: 51162, name: 'S7 Airlines', org: 'S7 Airlines', status: 'Активный', service: 'Авиа', currency: 'USD', commission: '10% + 20 USD', type: 'Локальный', orgType: 'Авиакомпания' },
  { no: 51163, name: 'Аттокуров Эрбол', org: 'Asia Travel', status: 'Активный', service: 'Отель', currency: 'USDT', commission: '25 USDT', type: 'Локальный', orgType: 'HoReCa' },
  { no: 51172, name: 'Бейшеналиев Сагын', org: 'Asia Travel', status: 'Активный', service: 'Отель', currency: 'EUR', commission: '40 EUR', type: 'Глобальный', orgType: 'HoReCa' },
  { no: 51154, name: 'Айбек Асылов', org: 'Asia Travel', status: 'Активный', service: 'Трансфер', currency: 'KGS', commission: '7%', type: 'Локальный', orgType: 'Транспорт' },
  { no: 51155, name: 'ИП Мамажанов Абдутаир', org: 'Asia Travel', status: 'Заблокированный', service: 'Трансфер', currency: 'RUB', commission: 'По договоренности', type: 'Локальный', orgType: 'Транспорт' },
  { no: 51156, name: 'Utair Airlines', org: 'Utair', status: 'Активный', service: 'Авиа', currency: 'RUB', commission: '12%', type: 'Локальный', orgType: 'Авиакомпания' },
  { no: 51168, name: 'Jannat Hotel', org: 'Jannat Group', status: 'На паузе', service: 'Отель', currency: 'USD', commission: '15%', type: 'Локальный', orgType: 'HoReCa' },
  { no: 51170, name: 'Emirates', org: 'Emirates', status: 'Активный', service: 'Авиа', currency: 'EUR', commission: '8% + 15 EUR', type: 'Глобальный', orgType: 'Авиакомпания' },
  { no: 51171, name: 'Karimov Transfer', org: 'ИП Каримов Икрам', status: 'Активный', service: 'Трансфер', currency: 'KGS', commission: '5%', type: 'Локальный', orgType: 'Транспорт' },
];

// ---- FINANCE ----
const FINANCE = [
  { no: 51162, org: 'S7 Airlines', service: 'Авиа', sum: '76.200,00', paid: '76.200,00', currency: 'RUB', resp: 'Даниель', role: 'Оператор', status: 'Оплачено (FULL)', pct: 100 },
  { no: 51163, org: 'Аттокуров Эрбол', service: 'Отель', sum: '76.200,00', paid: '76.200,00', currency: 'RUB', resp: 'Даниель', role: 'Админ', status: 'Оплачено (FULL)', pct: 100 },
  { no: 51172, org: 'Бейшеналиев Сагын', service: 'Отель', sum: '76.200,00', paid: '76.200,00', currency: 'RUB', resp: 'Даниель', role: 'Оператор', status: 'Оплачено (FULL)', pct: 100 },
  { no: 51154, org: 'Айбек Асылов', service: 'Трансфер', sum: '76.200,00', paid: '76.200,00', currency: 'RUB', resp: 'Даниель', role: 'Оператор', status: 'Оплачено (FULL)', pct: 100 },
  { no: 51155, org: 'ИП Мамажанов Абдутаир', service: 'Трансфер', sum: '76.200,00', paid: '70.000,00', currency: 'RUB', resp: 'Даниель', role: 'Оператор', status: 'Нехватает', pct: 82 },
  { no: 51156, org: 'Сагынбеков Икрам', service: 'Все включено', sum: '92.500,00', paid: '45.320,00', currency: 'RUB', resp: 'Кими', role: 'Оператор', status: 'Частично', pct: 49 },
  { no: 51168, org: 'Jannat Hotel', service: 'Отель', sum: '54.000,00', paid: '54.000,00', currency: 'USD', resp: 'Азамат', role: 'Оператор', status: 'Оплачено (FULL)', pct: 100 },
  { no: 51170, org: 'Emirates', service: 'Авиа', sum: '120.000,00', paid: '0,00', currency: 'EUR', resp: 'Куба', role: 'Оператор', status: 'Возврат', pct: 0 },
];
const FIN_STATS = [
  { label: 'Оплачено', value: '200.000,00$' },
  { label: 'Частично', value: '45.320,00$' },
  { label: 'Просрочено', value: '1200$' },
  { label: 'Возврат', value: '793$' },
];

// ---- DOCUMENTS ----
const DOCUMENTS = [
  { no: 51163, client: 'Аттокуров Эрбол', org: 'Осоо "Гранд лимитед"', stage: 'Ожидание подтверж.', type: 'СНП', sum: '800 USD', status: 'Подписано' },
  { no: 51172, client: 'Бейшеналиев Сагын', org: 'Осоо "Гранд лимитед"', stage: 'Новое', type: 'СНП', sum: '790 USD', status: 'Ожидает' },
  { no: 51154, client: 'Айбек Асылов', org: 'Осоо "Гранд лимитед"', stage: 'Ожидает подтверж.', type: 'Ваучер', sum: '4000 USD', status: 'Ожидает' },
  { no: 51155, client: 'ИП Мамажанов Абдутаир', org: '-', stage: 'Отменено', type: 'Ваучер', sum: '3200 USD', status: 'Подписано' },
  { no: 51156, client: 'Сагынбеков Икрам', org: 'ИП Каримов Икрам', stage: 'В работе', type: 'Договор', sum: '3300 USD', status: 'Подписано' },
  { no: 51172, client: 'Бейшеналиев Сагын', org: 'ИП Каримов Икрам', stage: 'Новое', type: 'СНП', sum: '790 USD', status: 'Подписано' },
  { no: 51163, client: 'Аттокуров Эрбол', org: 'ИП Каримов Икрам', stage: 'Ожидание оплаты', type: 'СНП', sum: '800 USD', status: 'Подписано' },
  { no: 51172, client: 'Бейшеналиев Сагын', org: 'Осоо "Гранд лимитед"', stage: 'Новое', type: 'СНП', sum: '790 USD', status: 'Подписано' },
];

// ---- CHATS ----
const CHATS = [
  { id: 1, name: 'Jessica Drew', kind: 'Клиент', last: 'Хорошо, ожидаем.', time: '18:30', unread: 2, online: '5 мин назад', org: 'ОсОО "Гранд лимитед"',
    messages: [
      { from: 'them', text: 'Добрый день! Подскажите по статусу заявки 51163', time: '18:10' },
      { from: 'me', text: 'Здравствуйте! Заявка на согласовании у поставщика.', time: '18:14' },
      { from: 'them', text: 'Хорошо, ожидаем.', time: '18:30' },
    ] },
  { id: 2, name: 'David Moore', kind: 'Поставщики', last: 'Вы: Не могли бы Вы ускорить этот процесс?', time: '18:16', unread: 0, online: '5 мин назад', org: 'ОсОО "Гранд лимитед"',
    messages: [
      { from: 'me', text: 'Вы получили все необходимые правки?', time: '18:12', read: true },
      { from: 'them', text: 'Пока что нет, ожидаем.', time: '18:16' },
      { from: 'me', text: 'Не могли бы Вы ускорить этот процесс?', time: '18:16', read: true },
    ] },
  { id: 3, name: 'Greg James', kind: 'Агенты', last: 'Хорошая работа', time: '18:02', unread: 0, online: '1 ч назад', org: 'Asia Travel',
    messages: [{ from: 'them', text: 'Хорошая работа', time: '18:02' }] },
  { id: 4, name: 'Emily Dorson', kind: 'Клиент', last: 'Хорошо', time: '17:42', unread: 0, online: '2 ч назад', org: 'Best Travel Inc',
    messages: [{ from: 'them', text: 'Хорошо', time: '17:42' }] },
  { id: 5, name: 'Elon Brite', kind: 'Поставщики', last: 'Вы: Ожидаем', time: '17:08', unread: 0, online: 'вчера', org: 'Emirates',
    messages: [{ from: 'me', text: 'Ожидаем', time: '17:08', read: true }] },
  { id: 6, name: 'Little Sister', kind: 'Клиент', last: 'Спасибо за помощь', time: 'Ср', unread: 0, online: '3 дня назад', org: 'Asia Travel',
    messages: [{ from: 'them', text: 'Спасибо за помощь', time: 'Ср' }] },
];

// ---- CHATS: many independent threads, each tied to an order and (optionally) a service ----
// Thread types drive the left-nav filters; channel drives the connection badge.
const CHAT_TYPES = [
  { key: 'client',         label: 'Клиент',               icon: 'user' },
  { key: 'operator',       label: 'Операторы',            icon: 'users' },
  { key: 'supplier',       label: 'Поставщики',           icon: 'suppliers' },
  { key: 'local_supplier', label: 'Локальные поставщики', icon: 'building' },
  { key: 'system',         label: 'События',              icon: 'bell' },
];
const CHAT_TYPE_LABEL = { client: 'Клиентский', operator: 'Операторский', supplier: 'Поставщик', local_supplier: 'Локальный поставщик', system: 'Системный' };
const CHAT_CHANNEL_TONE = { 'MAX': 'blue', 'Email': 'teal', 'API': 'gray', 'Система': 'amber', 'Телефон': 'green', 'Поставщик': 'gray' };
// kept for backwards-compat (composer sub-channels are now just «Сообщение» / «Внутренний комментарий»)
const CHAT_CHANNELS = CHAT_TYPES;

const CHAT_THREADS = [
  // ===== order 51162 — ОсОО "Гранд лимитед" =====
  { id: 1, order: 51162, type: 'client', channel: 'MAX', name: 'ОсОО "Гранд лимитед"', client: 'Нуралиев Данияр', online: '5 мин назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: true, unread: 2,
    relatedServices: ['S1', 'S2'], participants: [{ name: 'Нуралиев Данияр', role: 'Клиент' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [
      { from: 'them', author: 'Нуралиев Данияр', text: 'Добрый день! Когда будет готово КП по Стамбулу?', time: '14:02' },
      { from: 'system', text: 'КП-1042 отправлено клиенту', time: '15:34' },
      { from: 'me', author: 'Даниель', text: 'Здравствуйте! Отправили, посмотрите два варианта в предложении.', time: '15:36', read: true },
      { from: 'them', author: 'Нуралиев Данияр', text: 'Спасибо! Согласовываю вариант A.', time: '15:50' },
    ],
    internal: [
      { from: 'them', author: 'Адилет', text: '@Даниель клиент просит места рядом — учти при выписке.', time: '13:10' },
      { from: 'me', author: 'Даниель', text: 'Принял, выберу 12A и 12B.', time: '13:12', read: true },
    ] },
  { id: 2, order: 51162, type: 'supplier', channel: 'API', name: 'Air Astana', client: 'Нуралиев Данияр', supplier: 'Air Astana', online: '12 мин назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S1'], participants: [{ name: 'Air Astana', role: 'Поставщик' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [
      { from: 'me', author: 'Даниель', text: 'Прошу подтвердить бронь KC 131/132 на 2 пассажиров.', time: '12:40', read: true },
      { from: 'them', author: 'Air Astana', text: 'Подтверждаем, PNR KC8H2L. Тайм-лимит выписки сегодня 18:00.', time: '12:51' },
      { from: 'them', author: 'Air Astana', text: '', attach: { name: 'Подтверждение брони.pdf', size: '96 КБ' }, time: '12:52' },
    ],
    internal: [] },
  { id: 3, order: 51162, type: 'supplier', channel: 'Email', name: 'Booking B2B', client: 'Нуралиев Данияр', supplier: 'Booking B2B', online: '1 ч назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 1,
    relatedServices: ['S2'], participants: [{ name: 'Booking B2B', role: 'Поставщик' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [
      { from: 'me', author: 'Даниель', text: 'Уточните тариф по Hilton Istanbul на 7 ночей, BB.', time: '13:20', read: true },
      { from: 'them', author: 'Booking B2B', text: 'Тариф подтверждён, бронь под гарантию до 16.06.', time: '14:18' },
    ],
    internal: [] },
  { id: 4, order: 51162, type: 'system', channel: 'Система', name: 'События заказа № 51162', client: 'Нуралиев Данияр', online: 'сейчас',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S1'], participants: [{ name: 'Система', role: 'Бот' }],
    messages: [
      { from: 'system', text: 'Назначен ответственный: Даниель', time: '14:05' },
      { from: 'system', text: 'Получен ответ от поставщика Air Astana по запросу №34251. Статус: Подтверждено', time: '15:40', action: { label: 'Открыть ответ', service: 'S1' } },
      { from: 'system', text: 'Тайм-лимит выписки авиабилетов — сегодня 18:00', time: '16:00' },
    ],
    internal: [] },
  { id: 5, order: 51162, type: 'operator', channel: 'MAX', name: 'Команда заказа № 51162', client: 'Нуралиев Данияр', online: '3 мин назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: [], participants: [{ name: 'Даниель', role: 'Оператор' }, { name: 'Адилет', role: 'Оператор' }, { name: 'Кими', role: 'Бухгалтер' }],
    messages: [
      { from: 'them', author: 'Кими', text: 'Счёт по варианту A сформирую после согласования клиента.', time: '15:55' },
      { from: 'me', author: 'Даниель', text: 'Клиент согласовал A, можно выставлять.', time: '15:58', read: true },
    ],
    internal: [] },

  // ===== order 51170 — ОсОО "Asia Travel" =====
  { id: 6, order: 51170, type: 'client', channel: 'MAX', name: 'ОсОО "Asia Travel"', client: 'Каримов Икрам', online: '1 ч назад',
    createdAt: '12.06.2026', responsibleOperator: 'Куба', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S1'], participants: [{ name: 'Каримов Икрам', role: 'Клиент' }, { name: 'Куба', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Каримов Икрам', text: 'Подтвердите, пожалуйста, статус заявки на 6 человек.', time: '11:20' }, { from: 'me', author: 'Куба', text: 'В работе, выписываем билеты до 18:00.', time: '11:40', read: true }],
    internal: [] },
  { id: 7, order: 51170, type: 'supplier', channel: 'API', name: 'Qatar Airways', client: 'Каримов Икрам', supplier: 'Qatar Airways', online: '20 мин назад',
    createdAt: '12.06.2026', responsibleOperator: 'Куба', connectionStatus: 'Подключено', pinned: false, unread: 1,
    relatedServices: ['S1'], participants: [{ name: 'Qatar Airways', role: 'Поставщик' }, { name: 'Куба', role: 'Оператор' }],
    messages: [{ from: 'me', author: 'Куба', text: 'Нужна выписка по PNR QR9981, тайм-лимит горит.', time: '16:05', read: true }, { from: 'them', author: 'Qatar Airways', text: 'Принято в обработку, ответим в течение часа.', time: '16:20' }],
    internal: [{ from: 'system', text: 'Тайм-лимит выписки сегодня 18:00', time: '16:00' }] },
  { id: 8, order: 51170, type: 'operator', channel: 'Телефон', name: 'Куба ↔ Даниель', client: 'Каримов Икрам', online: 'вчера',
    createdAt: '12.06.2026', responsibleOperator: 'Куба', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: [], participants: [{ name: 'Куба', role: 'Оператор' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Даниель', text: 'Передаю заказ тебе на сегодня, я на встрече.', time: 'Вчера' }, { from: 'me', author: 'Куба', text: 'Принял, держу тайм-лимит.', time: 'Вчера', read: true }],
    internal: [] },

  // ===== order 51163 — Аттокуров Эрбол =====
  { id: 9, order: 51163, type: 'client', channel: 'MAX', name: 'Аттокуров Эрбол', client: 'Аттокуров Эрбол', online: '2 ч назад',
    createdAt: '14.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 1,
    relatedServices: [], participants: [{ name: 'Аттокуров Эрбол', role: 'Клиент' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Аттокуров Эрбол', text: 'Загрузил паспорт, проверьте пожалуйста.', time: '09:10', attach: { name: 'passport.jpg', size: '1.1 МБ' } }],
    internal: [{ from: 'me', author: 'Даниель', text: 'Скан читаемый, отправляю на проверку визы.', time: '09:20', read: true }] },
  { id: 10, order: 51163, type: 'supplier', channel: 'API', name: 'Amadeus GDS', client: 'Аттокуров Эрбол', supplier: 'Amadeus GDS', online: '3 ч назад',
    createdAt: '13.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Отключено', pinned: false, unread: 0,
    relatedServices: ['S1'], participants: [{ name: 'Amadeus GDS', role: 'Поставщик' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [{ from: 'me', author: 'Даниель', text: 'Запрос на аннуляцию AV-51163, ожидаем расчёт штрафа.', time: '12:10', read: false }],
    internal: [{ from: 'me', author: 'Даниель', text: 'Тариф невозвратный, аннуляция со 100% штрафом.', time: '12:12', read: true }] },
  { id: 11, order: 51163, type: 'local_supplier', channel: 'Email', name: 'Asia Local DMC', client: 'Аттокуров Эрбол', supplier: 'Asia Local DMC', online: 'вчера',
    createdAt: '13.06.2026', responsibleOperator: 'Даниель', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S3'], participants: [{ name: 'Asia Local DMC', role: 'Локальный поставщик' }, { name: 'Даниель', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Asia Local DMC', text: 'Трансфер подтверждён, встреча с табличкой у выхода 3.', time: 'Вчера' }],
    internal: [] },

  // ===== order 51156 — Сагынбеков Икрам =====
  { id: 12, order: 51156, type: 'client', channel: 'Email', name: 'Сагынбеков Икрам', client: 'Сагынбеков Икрам', online: 'вчера',
    createdAt: '10.06.2026', responsibleOperator: 'Кими', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: [], participants: [{ name: 'Сагынбеков Икрам', role: 'Клиент' }, { name: 'Кими', role: 'Оператор' }],
    messages: [{ from: 'me', author: 'Кими', text: 'Тур «Анталия All Inclusive» забронирован, ожидаем предоплату.', time: 'Вчера', read: true }],
    internal: [] },
  { id: 13, order: 51156, type: 'supplier', channel: 'Email', name: 'Coral Travel', client: 'Сагынбеков Икрам', supplier: 'Coral Travel', online: 'вчера',
    createdAt: '10.06.2026', responsibleOperator: 'Кими', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S2'], participants: [{ name: 'Coral Travel', role: 'Поставщик' }, { name: 'Кими', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Coral Travel', text: 'Блок мест держим до 17.06.', time: 'Вчера' }],
    internal: [] },
  { id: 14, order: 51156, type: 'local_supplier', channel: 'Телефон', name: 'Antalya Transfers', client: 'Сагынбеков Икрам', supplier: 'Antalya Transfers', online: '2 дн назад',
    createdAt: '10.06.2026', responsibleOperator: 'Кими', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: ['S3'], participants: [{ name: 'Antalya Transfers', role: 'Локальный поставщик' }, { name: 'Кими', role: 'Оператор' }],
    messages: [{ from: 'them', author: 'Antalya Transfers', text: 'Машина и водитель назначены на дату заезда.', time: '2 дн назад' }],
    internal: [] },
  { id: 15, order: 51156, type: 'system', channel: 'Система', name: 'События заказа № 51156', client: 'Сагынбеков Икрам', online: 'сейчас',
    createdAt: '10.06.2026', responsibleOperator: 'Кими', connectionStatus: 'Подключено', pinned: false, unread: 0,
    relatedServices: [], participants: [{ name: 'Система', role: 'Бот' }],
    messages: [
      { from: 'system', text: 'Заказ создан и назначен оператору Кими', time: '10.06 · 10:00' },
      { from: 'system', text: 'Ожидается предоплата от клиента', time: '10.06 · 10:05' },
    ],
    internal: [] },
];

// ---- DASHBOARD ----
const DASH_STATS = [
  { label: 'Нужен ввод данных', value: 16, cta: 'Перейти' },
  { label: 'Ожидают подтверждения', value: 54 },
  { label: 'Без поставщика', value: 12 },
  { label: 'Просрочены оплаты', value: 7 },
];
const ORDER_BREAKDOWN = [
  { label: 'Оплачено', pct: 45, count: '42 заказа', color: '#2bb96a' },
  { label: 'В работе', pct: 27, count: '19 заказов', color: '#2566ff' },
  { label: 'Ожидает оплаты', pct: 8, count: '6 заказов', color: '#f0921f' },
  { label: 'Возврат', pct: 11, count: '17 заказов', color: '#ec4444' },
  { label: 'Аннуляция', pct: 9, count: '7 заказов', color: '#22b8c9' },
];
const RECENT_CHANGES = [
  { time: '21:15', dept: 'Бухгалтерия', client: 'ОсОО "Гранд лимитед"', type: 'Групповая', resp: 'Даниель', desc: 'Выписан счет клиенту' },
  { time: '20:48', dept: 'Операторы', client: 'Аттокуров Эрбол', type: 'Индивидуальная', resp: 'Адилет', desc: 'Загружены документы' },
  { time: '19:32', dept: 'Операторы', client: 'Айбек Асылов', type: 'Корпоративная', resp: 'Кими', desc: 'Назначен поставщик' },
  { time: '18:05', dept: 'Бухгалтерия', client: 'Токтогулов Эмир', type: 'Групповая', resp: 'Даниель', desc: 'Подтверждена оплата' },
];

// ---- API access (settings) ----
const API_ACCESS = [
  { no: 51163, org: 'Осоо "Гранд лимитед"', orgType: 'Авиакомпания', date: '12.02.2026' },
  { no: 51172, org: 'Осоо "Гранд лимитед"', orgType: 'Авиакомпания', date: '25.09.2025' },
  { no: 51154, org: 'Осоо "Гранд лимитед"', orgType: 'Транспорт', date: '20.01.2025' },
  { no: 51155, org: '-', orgType: 'Другое', date: '25.09.2025' },
  { no: 51156, org: 'ИП Каримов Икрам', orgType: 'HoReCa', date: '20.01.2025' },
  { no: 51172, org: 'ИП Каримов Икрам', orgType: 'Авиакомпания', date: '12.02.2026' },
  { no: 51163, org: 'ИП Каримов Икрам', orgType: 'Авиакомпания', date: '25.09.2025' },
  { no: 51172, org: 'Осоо "Гранд лимитед"', orgType: 'Авиакомпания', date: '20.01.2025' },
];

const CURRENCIES = [
  { code: 'USD', name: 'Американский доллар', sym: '$', rate: '86,4' },
  { code: 'RUB', name: 'Российский рубль', sym: '₽', rate: '1,2' },
  { code: 'KGS', name: 'Кыргызский сом', sym: 'с', rate: '1' },
  { code: 'EUR', name: 'Евро', sym: '€', rate: '95,3' },
  { code: 'KZT', name: 'Казахстанский тенге', sym: '₸', rate: '0,19' },
];

// ============ AVIA / FLIGHTS ============

// Airline reference (IATA code, name, brand color for the logo badge)
const AIRLINES = {
  S7:  { name: 'S7 Airlines',     color: '#7bb026' },
  TK:  { name: 'Turkish Airlines',color: '#c2002f' },
  EK:  { name: 'Emirates',        color: '#d71921' },
  KC:  { name: 'Air Astana',      color: '#00a3a1' },
  UT:  { name: 'Utair',           color: '#0098d8' },
  SU:  { name: 'Aeroflot',        color: '#00256a' },
  QR:  { name: 'Qatar Airways',   color: '#5c0632' },
  PC:  { name: 'Pegasus',         color: '#f8b000' },
  HY:  { name: 'Uzbekistan Air',  color: '#1d4e9c' },
};

const AIR_STATUS = {
  'Поиск': 'gray', 'Предложение': 'teal', 'Согласование': 'amber',
  'Забронировано': 'blue', 'Выписано': 'green', 'Возврат': 'red', 'Обмен': 'teal', 'Аннуляция': 'red',
};

// ---- АВИА-НАДБАВКИ ПОСТАВЩИКОВ (расширенная постановка клиента) ----
// Иерархия: поставщик → авиакомпания → маршрут. У авиакомпании две базовые строки
// (внутри РФ / международные) плюс список точечных маршрутов (from→to) с отдельной надбавкой.
// Надбавка применяется к базовой цене тарифа и отражается в поиске уже с наценкой.
function isRuAirport(code) { const a = AIRPORTS.find((x) => x.code === code); return !!a && a.country === 'Россия'; }
function isDomesticRu(from, to) { return isRuAirport(from) && isRuAirport(to); }
// type: 'percent' — % от базовой стоимости; 'fixed' — фиксированная сумма (в валюте тарифа).
// Хранится в рантайме; редактируется в карточке поставщика (вкладка «Надбавки»).
const AVIA_MARKUPS = {
  'Emirates': {
    EK: { domestic: { type: 'percent', value: 0 }, intl: { type: 'percent', value: 5 }, routes: [{ from: 'FRU', to: 'DXB', type: 'fixed', value: 15 }] },
  },
  'S7 Airlines': {
    S7: { domestic: { type: 'percent', value: 2 }, intl: { type: 'percent', value: 4 }, routes: [] },
  },
  'Utair Airlines': {
    UT: { domestic: { type: 'percent', value: 3 }, intl: { type: 'percent', value: 6 }, routes: [] },
  },
};
function aviaMarkupsFor(supplierName) {
  if (!AVIA_MARKUPS[supplierName]) AVIA_MARKUPS[supplierName] = {};
  return AVIA_MARKUPS[supplierName];
}
// Резолвит надбавку по авиакомпании и маршруту среди всех настроенных поставщиков.
// Приоритет: точечный маршрут → внутри РФ / международный. Возвращает {type,value,scope,supplier} | null.
function aviaMarkupResolve(airlineCode, from, to) {
  for (const sup in AVIA_MARKUPS) {
    const byAir = AVIA_MARKUPS[sup][airlineCode];
    if (!byAir) continue;
    const rt = (byAir.routes || []).find((r) => r.from === from && r.to === to && r.value);
    if (rt) return { supplier: sup, scope: 'route', type: rt.type, value: rt.value };
    const dom = isDomesticRu(from, to);
    const bucket = dom ? byAir.domestic : byAir.intl;
    if (bucket && bucket.value) return { supplier: sup, scope: dom ? 'domestic' : 'intl', type: bucket.type, value: bucket.value };
    return null; // авиакомпания настроена, но надбавка нулевая
  }
  return null;
}
function aviaMarkupAmount(airlineCode, from, to, base) {
  const m = aviaMarkupResolve(airlineCode, from, to);
  if (!m) return 0;
  return m.type === 'percent' ? Math.round(base * m.value / 100) : m.value;
}

const CABIN_CLASSES = ['Эконом', 'Комфорт', 'Бизнес', 'Первый'];

// Discount / subsidized passenger categories shown under "Специальные категории"
// in the avia passengers-and-class popover.
const SPECIAL_PAX_CATEGORIES = [
  { key: 'youth',          label: 'Молодёжь (12–23 года)' },
  { key: 'seniorM',        label: 'Пенсионеры мужчины (60+)' },
  { key: 'seniorF',        label: 'Пенсионеры женщины (55+)' },
  { key: 'largeFamily',    label: 'Многодетные семьи' },
  { key: 'disabled',       label: 'Инвалиды' },
  { key: 'disabledEscort', label: 'Инвалиды с сопровождением' },
];
const SUBSIDIZED_PAX_PROGRAMS = [
  { key: 'dvoResident', label: 'Резиденты ДВО' },
  { key: 'dvoChild',    label: 'Дети ДВО' },
  { key: 'kldResident', label: 'Резиденты Калининградской области' },
  { key: 'kldChild',    label: 'Дети Калининградской области' },
];

// Airport directory for the autocomplete
const AIRPORTS = [
  { code: 'FRU', city: 'Бишкек',     name: 'Манас',              country: 'Кыргызстан' },
  { code: 'OSS', city: 'Ош',         name: 'Ош',                 country: 'Кыргызстан' },
  { code: 'IST', city: 'Стамбул',    name: 'Istanbul Airport',   country: 'Турция' },
  { code: 'SAW', city: 'Стамбул',    name: 'Sabiha Gökçen',      country: 'Турция' },
  { code: 'DXB', city: 'Дубай',      name: 'Dubai Intl',         country: 'ОАЭ' },
  { code: 'SVO', city: 'Москва',     name: 'Шереметьево',        country: 'Россия' },
  { code: 'DME', city: 'Москва',     name: 'Домодедово',         country: 'Россия' },
  { code: 'ALA', city: 'Алматы',     name: 'Алматы',             country: 'Казахстан' },
  { code: 'DOH', city: 'Доха',       name: 'Hamad Intl',         country: 'Катар' },
  { code: 'TAS', city: 'Ташкент',    name: 'Islam Karimov',      country: 'Узбекистан' },
];

// Search-result offers (what comes back from the supplier APIs)
const FLIGHT_OFFERS = [
  {
    id: 'OF-1', airline: 'KC', supplier: 'Air Astana (API)', refundable: true, baggage: '23 кг', cabin: 'Эконом',
    fareName: 'Economy Basic', seatsLeft: 6,
    out: { from: 'FRU', to: 'IST', dep: '04:15', arr: '08:40', date: '24 июн', dur: '6ч 25м', stops: 0, stopText: 'Прямой', flightNo: 'KC 131' },
    back:{ from: 'IST', to: 'FRU', dep: '14:05', arr: '23:30', date: '01 июл', dur: '6ч 25м', stops: 0, stopText: 'Прямой', flightNo: 'KC 132' },
    fare: 412, fee: 18, currency: 'USD',
  },
  {
    id: 'OF-2', airline: 'TK', supplier: 'Amadeus GDS', refundable: true, baggage: '2×23 кг', cabin: 'Эконом',
    fareName: 'EcoFly', seatsLeft: 9,
    out: { from: 'FRU', to: 'IST', dep: '05:50', arr: '09:10', date: '24 июн', dur: '5ч 20м', stops: 0, stopText: 'Прямой', flightNo: 'TK 345' },
    back:{ from: 'IST', to: 'FRU', dep: '01:45', arr: '11:00', date: '01 июл', dur: '5ч 15м', stops: 0, stopText: 'Прямой', flightNo: 'TK 346' },
    fare: 468, fee: 22, currency: 'USD',
  },
  {
    id: 'OF-3', airline: 'SU', supplier: 'Sirena-Travel', refundable: false, baggage: 'Без багажа', cabin: 'Эконом',
    fareName: 'Эконом Лайт', seatsLeft: 3,
    out: { from: 'FRU', to: 'IST', dep: '23:10', arr: '08:55', date: '24 июн', dur: '8ч 45м', stops: 1, stopText: '1 пересадка · SVO 2ч 10м', flightNo: 'SU 1879',
      segs: [{ from: 'FRU', to: 'SVO', dep: '23:10', arr: '03:15', dur: '4ч 05м', flightNo: 'SU 1879' }, { from: 'SVO', to: 'IST', dep: '05:25', arr: '08:55', dur: '2ч 30м', flightNo: 'SU 1881' }],
      layovers: [{ at: 'SVO', dur: '2ч 10м' }] },
    back:{ from: 'IST', to: 'FRU', dep: '12:30', arr: '23:40', date: '01 июл', dur: '9ч 10м', stops: 1, stopText: '1 пересадка · SVO 1ч 50м', flightNo: 'SU 1880',
      segs: [{ from: 'IST', to: 'SVO', dep: '12:30', arr: '16:10', dur: '3ч 40м', flightNo: 'SU 1880' }, { from: 'SVO', to: 'FRU', dep: '18:00', arr: '23:40', dur: '3ч 40м', flightNo: 'SU 1882' }],
      layovers: [{ at: 'SVO', dur: '1ч 50м' }] },
    fare: 356, fee: 16, currency: 'USD',
  },
  {
    id: 'OF-4', airline: 'PC', supplier: 'Pegasus (API)', refundable: false, baggage: 'Без багажа', cabin: 'Эконом',
    fareName: 'Essentials', seatsLeft: 12,
    out: { from: 'FRU', to: 'SAW', dep: '06:25', arr: '09:30', date: '24 июн', dur: '5ч 05м', stops: 0, stopText: 'Прямой', flightNo: 'PC 593' },
    back:{ from: 'SAW', to: 'FRU', dep: '03:10', arr: '12:05', date: '01 июл', dur: '4ч 55м', stops: 0, stopText: 'Прямой', flightNo: 'PC 594' },
    fare: 298, fee: 14, currency: 'USD',
  },
  {
    id: 'OF-5', airline: 'EK', supplier: 'Amadeus GDS', refundable: true, baggage: '30 кг', cabin: 'Бизнес',
    fareName: 'Business Flex', seatsLeft: 4,
    out: { from: 'FRU', to: 'IST', dep: '08:20', arr: '14:10', date: '24 июн', dur: '7ч 50м', stops: 1, stopText: '1 пересадка · DXB 1ч 40м', flightNo: 'EK 2501',
      segs: [{ from: 'FRU', to: 'DXB', dep: '08:20', arr: '12:20', dur: '4ч 00м', flightNo: 'EK 2501' }, { from: 'DXB', to: 'IST', dep: '14:00', arr: '14:10', dur: '2ч 10м', flightNo: 'EK 2503' }],
      layovers: [{ at: 'DXB', dur: '1ч 40м' }] },
    back:{ from: 'IST', to: 'FRU', dep: '16:40', arr: '06:25', date: '02 июл', dur: '11ч 45м', stops: 1, stopText: '1 пересадка · DXB 3ч 05м', flightNo: 'EK 2502',
      segs: [{ from: 'IST', to: 'DXB', dep: '16:40', arr: '21:00', dur: '4ч 20м', flightNo: 'EK 2502' }, { from: 'DXB', to: 'FRU', dep: '00:05', arr: '06:25', dur: '4ч 20м', flightNo: 'EK 2504' }],
      layovers: [{ at: 'DXB', dur: '3ч 05м' }] },
    fare: 1340, fee: 45, currency: 'USD',
  },
  {
    id: 'OF-6', airline: 'QR', supplier: 'Qatar (API)', refundable: true, baggage: '2×23 кг', cabin: 'Эконом',
    fareName: 'Classic', seatsLeft: 8,
    out: { from: 'FRU', to: 'IST', dep: '02:55', arr: '13:20', date: '24 июн', dur: '9ч 25м', stops: 1, stopText: '1 пересадка · DOH 2ч 30м', flightNo: 'QR 389',
      segs: [{ from: 'FRU', to: 'DOH', dep: '02:55', arr: '06:25', dur: '3ч 30м', flightNo: 'QR 389' }, { from: 'DOH', to: 'IST', dep: '08:55', arr: '13:20', dur: '3ч 25м', flightNo: 'QR 391' }],
      layovers: [{ at: 'DOH', dur: '2ч 30м' }] },
    back:{ from: 'IST', to: 'FRU', dep: '09:15', arr: '22:05', date: '01 июл', dur: '10ч 50м', stops: 1, stopText: '1 пересадка · DOH 3ч 15м', flightNo: 'QR 390',
      segs: [{ from: 'IST', to: 'DOH', dep: '09:15', arr: '13:05', dur: '3ч 50м', flightNo: 'QR 390' }, { from: 'DOH', to: 'FRU', dep: '16:20', arr: '22:05', dur: '3ч 45м', flightNo: 'QR 392' }],
      layovers: [{ at: 'DOH', dur: '3ч 15м' }] },
    fare: 505, fee: 24, currency: 'USD',
  },
];

// Pre-built multi-city itinerary shown as route option 3 («Сложный маршрут») in the avia picker
const AVIA_COMPLEX_ROUTE = {
  legs: [
    { airline: 'KC', from: 'FRU', to: 'IST', dep: '04:15', arr: '08:40',    dur: '6ч 25м', price: 23220 },
    { airline: 'PC', from: 'IST', to: 'SAW', dep: '09:30', arr: '11:40',    dur: '2ч 10м', price: 6180 },
    { airline: 'SU', from: 'SAW', to: 'FRU', dep: '23:10', arr: '02:40 +1', dur: '3ч 30м', price: 12780 },
  ],
  layovers: [
    { label: 'Пересадка 50м', min: 50 },
    { label: 'Пересадка 6ч 30м', min: 390 },
  ],
};

// Flight-services registry rows
const AIR_SERVICES = [
  { no: 'AV-51162', order: 51162, route: 'FRU → IST → FRU', pax: 4, airline: 'KC', pnr: 'KC8H2L', ticket: '465-2410…', supplier: 'Air Astana (API)', status: 'Выписано', sum: 1720, currency: 'USD', dep: '24.06.26' },
  { no: 'AV-51163', order: 51163, route: 'FRU → DXB',       pax: 2, airline: 'EK', pnr: 'EKQ91A', ticket: '176-9912…', supplier: 'Amadeus GDS',     status: 'Забронировано', sum: 1980, currency: 'USD', dep: '28.06.26' },
  { no: 'AV-51172', order: 51172, route: 'FRU → IST',       pax: 1, airline: 'TK', pnr: 'TK4521', ticket: '—',         supplier: 'Amadeus GDS',     status: 'Согласование', sum: 468,  currency: 'USD', dep: '02.07.26' },
  { no: 'AV-51154', order: 51154, route: 'OSS → SVO',       pax: 3, airline: 'SU', pnr: '—',      ticket: '—',         supplier: 'Sirena-Travel',   status: 'Предложение', sum: 1068, currency: 'USD', dep: '05.07.26' },
  { no: 'AV-51155', order: 51155, route: 'FRU → SAW',       pax: 2, airline: 'PC', pnr: 'PC77KD', ticket: '624-1180…', supplier: 'Pegasus (API)',   status: 'Возврат',     sum: 596,  currency: 'USD', dep: '12.06.26' },
  { no: 'AV-51168', order: 51168, route: 'FRU → ALA',       pax: 1, airline: 'KC', pnr: 'KC2P0X', ticket: '465-7741…', supplier: 'Air Astana (API)', status: 'Выписано',    sum: 210,  currency: 'USD', dep: '18.06.26' },
  { no: 'AV-51170', order: 51170, route: 'FRU → IST → FRU', pax: 6, airline: 'QR', pnr: 'QR9981', ticket: '—',         supplier: 'Qatar (API)',     status: 'Поиск',       sum: 0,    currency: 'USD', dep: '—' },
];

const AIR_STATS = [
  { label: 'Активные брони', value: 12 },
  { label: 'Ожидают выписки', value: 5 },
  { label: 'Тайм-лимит сегодня', value: 3, tone: 'red' },
  { label: 'В возврате', value: 2 },
];

// ============ AVIA PICKER (two-pane in-order flight selection) ============

// Fare tiers shown in step 2 «Выберите тариф». delta = price difference vs the base fare.
const AVIA_FARE_TIERS = [
  { id: 'light', name: 'Эконом Лайт', delta: 0, recommended: false,
    desc: 'Базовый тариф для поездок налегке: только ручная кладь, без багажа. Изменения и возврат не предусмотрены. Выбор места — за доплату. Подходит для коротких поездок без багажа.',
    rules: [{ k: 'Возврат', v: 'Невозвратный', tone: 'red' }, { k: 'Обмен', v: 'Платный', tone: 'amber' }, { k: 'Багаж', v: 'Не включён', tone: 'red' }, { k: 'Выбор места', v: 'Платный', tone: 'amber' }],
    features: [
      { ok: true,  text: 'Ручная кладь 10 кг' },
      { ok: false, text: 'Багаж не включён' },
      { ok: false, text: 'Невозвратный' },
      { ok: false, text: 'Платный выбор места' },
    ] },
  { id: 'optimum', name: 'Эконом Оптимум', delta: 1900, recommended: true,
    desc: 'Оптимальный баланс цены и гибкости: включён багаж 23 кг и выбор места, возврат возможен со штрафом. Лучший выбор для большинства поездок.',
    rules: [{ k: 'Возврат', v: 'Со штрафом', tone: 'amber' }, { k: 'Обмен', v: 'Со штрафом', tone: 'amber' }, { k: 'Багаж', v: '23 кг', tone: 'green' }, { k: 'Выбор места', v: 'Включён', tone: 'green' }],
    features: [
      { ok: true,  text: 'Ручная кладь 10 кг' },
      { ok: true,  text: 'Багаж 1 место 23 кг' },
      { ok: true,  text: 'Возврат со штрафом' },
      { ok: true,  text: 'Выбор места включён' },
    ] },
  { id: 'max', name: 'Эконом Максимум', delta: 4300, recommended: false,
    desc: 'Максимально гибкий эконом: два места багажа по 23 кг, свободный возврат и обмен без штрафов, выбор места и питание включены. Для тех, кому важна свобода изменений.',
    rules: [{ k: 'Возврат', v: 'Свободный', tone: 'green' }, { k: 'Обмен', v: 'Свободный', tone: 'green' }, { k: 'Багаж', v: '2×23 кг', tone: 'green' }, { k: 'Выбор места', v: 'Включён', tone: 'green' }],
    features: [
      { ok: true,  text: 'Ручная кладь 10 кг' },
      { ok: true,  text: 'Багаж 2 места 23 кг' },
      { ok: true,  text: 'Свободный возврат' },
      { ok: true,  text: 'Выбор места + питание' },
    ] },
];

// Business-cabin fare tiers (used when the passenger's booking class is C/J/D)
const AVIA_FARE_TIERS_BUSINESS = [
  { id: 'biz-lite', name: 'Бизнес Лайт', delta: 8000, recommended: false,
    desc: 'Вход в бизнес-класс по выгодной цене: повышенный багаж 2×32 кг, доступ в бизнес-зал и выбор места. Возврат возможен со штрафом.',
    rules: [{ k: 'Возврат', v: 'Со штрафом', tone: 'amber' }, { k: 'Обмен', v: 'Бесплатный', tone: 'green' }, { k: 'Багаж', v: '2×32 кг', tone: 'green' }, { k: 'Бизнес-зал', v: 'Включён', tone: 'green' }],
    features: [
      { ok: true,  text: 'Багаж 2 места 32 кг' },
      { ok: true,  text: 'Бизнес-зал в аэропорту' },
      { ok: false, text: 'Возврат со штрафом' },
      { ok: true,  text: 'Выбор места включён' },
    ] },
  { id: 'biz-flex', name: 'Бизнес Флекс', delta: 14000, recommended: true,
    desc: 'Полноценный бизнес с максимальной гибкостью: свободный возврат и обмен, выбор места и питание, доступ в бизнес-зал. Оптимальный выбор для деловых поездок.',
    rules: [{ k: 'Возврат', v: 'Свободный', tone: 'green' }, { k: 'Обмен', v: 'Свободный', tone: 'green' }, { k: 'Багаж', v: '2×32 кг', tone: 'green' }, { k: 'Питание', v: 'Включено', tone: 'green' }],
    features: [
      { ok: true,  text: 'Багаж 2 места 32 кг' },
      { ok: true,  text: 'Бизнес-зал в аэропорту' },
      { ok: true,  text: 'Свободный возврат' },
      { ok: true,  text: 'Выбор места + питание' },
    ] },
  { id: 'biz-premium', name: 'Бизнес Премиум', delta: 22000, recommended: false,
    desc: 'Премиальный бизнес: увеличенный багаж 3×32 кг, VIP-зал и фаст-трек, свободный возврат и персональный ассистент на всех этапах поездки.',
    rules: [{ k: 'Возврат', v: 'Свободный', tone: 'green' }, { k: 'Обмен', v: 'Свободный', tone: 'green' }, { k: 'Багаж', v: '3×32 кг', tone: 'green' }, { k: 'Ассистент', v: 'Персональный', tone: 'green' }],
    features: [
      { ok: true,  text: 'Багаж 3 места 32 кг' },
      { ok: true,  text: 'VIP-зал и фаст-трек' },
      { ok: true,  text: 'Свободный возврат' },
      { ok: true,  text: 'Личный ассистент' },
    ] },
];

// Booking classes shown on the fare-selection screen («Все доступные классы на рейс»)
const AVIA_BOOKING_CLASSES = [
  { code: 'Y', cabin: 'Эконом',         seatsLeft: 18 },
  { code: 'B', cabin: 'Эконом',         seatsLeft: 9 },
  { code: 'M', cabin: 'Эконом',         seatsLeft: 5 },
  { code: 'U', cabin: 'Премиум эконом', seatsLeft: 4 },
  { code: 'C', cabin: 'Бизнес',         seatsLeft: 3 },
  { code: 'J', cabin: 'Бизнес',         seatsLeft: 2 },
  { code: 'D', cabin: 'Бизнес',         seatsLeft: 1 },
];

// Baggage options per passenger (step 4 → Багаж)
const AVIA_BAGGAGE_OPTIONS = [
  { id: 'none', label: 'Без багажа',      price: 0 },
  { id: 'b23',  label: '1 место 23 кг',   price: 1800 },
  { id: 'b23x2',label: '2 места по 23 кг', price: 3600 },
  { id: 'b32',  label: '1 место 32 кг',   price: 2800 },
];
const AVIA_SPECIAL_BAGGAGE = [
  { id: 'bike',  label: 'Велосипед',              icon: 'route',     from: 3500 },
  { id: 'ski',   label: 'Лыжи / сноуборд',        icon: 'snowflake', from: 3000 },
  { id: 'music', label: 'Музыкальный инструмент', icon: 'template',  from: 4000 },
  { id: 'sport', label: 'Спортивный инвентарь',   icon: 'dumbbell',  from: 3500 },
  { id: 'animalc',label: 'Животное в салоне',     icon: 'heart',     from: 5000 },
  { id: 'animalh',label: 'Животное в багажном отсеке', icon: 'heart', from: 6000 },
];

// Meals per passenger (step 4 → Питание)
const AVIA_MEALS = [
  { id: 'standard', label: 'Стандартное питание',  price: 0,   incl: true, color: '#e9c46a' },
  { id: 'light',    label: 'Лёгкое питание',       price: 400, color: '#8ab17d' },
  { id: 'kids',     label: 'Детское питание',      price: 400, color: '#e76f51' },
  { id: 'veg',      label: 'Вегетарианское питание', price: 400, color: '#52b788' },
  { id: 'none',     label: 'Без питания',          price: 0 },
];

// Insurance plans per passenger (step 4 → Страхование)
const AVIA_INSURANCE_PLANS = [
  { id: 'basic',   label: 'Базовая',  price: 600,  sub: 'Страховка на время поездки', cover: 'Покрытие до 100 000 €' },
  { id: 'standard',label: 'Стандарт', price: 900,  sub: 'Расширенное покрытие',       cover: 'Покрытие до 300 000 €' },
  { id: 'premium', label: 'Премиум',  price: 1400, sub: 'Максимальное покрытие',      cover: 'Покрытие до 500 000 €' },
  { id: 'none',    label: 'Без страхования', price: 0, sub: 'Не оформлять страховку', cover: '—' },
];
const AVIA_INSURANCE_INCLUDES = [
  { icon: 'shield', title: 'Медицинские расходы', sub: 'Лечение за рубежом' },
  { icon: 'heart',  title: 'Несчастный случай',   sub: 'Выплаты при травмах' },
  { icon: 'clock',  title: 'Задержка рейса',       sub: 'Компенсация расходов' },
  { icon: 'luggage', title: 'Утрата багажа',       sub: 'Возмещение расходов' },
  { icon: 'calendar', title: 'Отмена поездки',     sub: 'Возврат затрат' },
];

// Comfort & service add-ons (step 4 → Комфорт и сервис), grouped — passenger matrix
const AVIA_COMFORT_GROUPS = [
  { group: 'Комфорт в аэропорту', icon: 'idcard', sub: 'Услуги для более комфортного прохождения аэропортовых процедур', items: [
    { id: 'fasttrack', label: 'Fast Track (ускоренное прохождение)', sub: 'Отдельный проход через контроль', icon: 'star',     price: 1200 },
    { id: 'lounge',    label: 'Бизнес-зал',                          sub: 'Доступ в бизнес-зал аэропорта',    icon: 'idcard',   price: 2500 },
    { id: 'escort',    label: 'Сопровождение в аэропорту',           sub: 'Помощь сотрудника аэропорта',      icon: 'user',     price: 1500 },
    { id: 'vip',       label: 'VIP-зал',                             sub: 'Персональный зал повышенной комфортности', icon: 'star', price: 5000 },
    { id: 'priority',  label: 'Приоритетная посадка',                sub: 'Приоритетная посадка на борт самолёта', icon: 'arrowUpRight', price: 600 },
  ] },
  { group: 'Связь в путешествии', icon: 'wifi', sub: 'Услуги для связи во время полёта и в поездке', items: [
    { id: 'wifi', label: 'Wi-Fi на борту',           sub: 'Доступ в интернет на борту самолёта', icon: 'wifi',  price: 800 },
    { id: 'esim', label: 'eSIM для путешествий',      sub: 'Мобильный интернет в стране прибытия', icon: 'phone', price: 490 },
    { id: 'roam', label: 'Мобильный интернет (роуминг)', sub: 'Интернет в роуминге',              icon: 'globe', price: 390 },
  ] },
  { group: 'Дополнительный сервис', icon: 'bell', sub: 'Индивидуальные услуги и приятные дополнения', items: [
    { id: 'flowers',  label: 'Цветы к прилёту',  sub: 'Букет для встречи в аэропорту', icon: 'heart',    price: 2000 },
    { id: 'meetgreet',label: 'Табличка с именем', sub: 'Встреча с табличкой в аэропорту', icon: 'idcard', price: 800 },
    { id: 'assistant',label: 'Личный помощник',   sub: 'Индивидуальный ассистент в поездке', icon: 'user', price: 3500 },
    { id: 'interpreter', label: 'Переводчик',     sub: 'Услуги переводчика на встрече',  icon: 'chat',     price: 1500 },
    { id: 'concierge',label: 'Консьерж-сервис',   sub: 'Помощь в бронировании и организации', icon: 'bell', price: 2500 },
  ] },
  { group: 'Документы и справки', icon: 'docs', sub: 'Оформление необходимых документов', items: [
    { id: 'visa',  label: 'Помощь с визой',        sub: 'Подготовка пакета документов', icon: 'visa', price: 3000 },
    { id: 'cert',  label: 'Справка для посольства', sub: 'Документ о бронировании',      icon: 'docs', price: 700 },
  ] },
];

// Seat map for step 3 / step 4 → Места. Compact cabin: rows × A–F, aisle between C and D.
const AVIA_SEATMAP = {
  cols: ['A', 'B', 'C', 'D', 'E', 'F'],
  rows: 18,
  legend: [
    { kind: 'std',  label: 'Стандарт', price: 0 },
    { kind: 'extra',label: 'Больше места', price: 1500 },
    { kind: 'front',label: 'Первые ряды', price: 2200 },
  ],
  // explicit pricing/category overrides by row; default category is 'std'
  rowKind: { 1: 'front', 2: 'front', 3: 'front', 11: 'extra', 12: 'extra' },
  occupied: ['1A', '1B', '3F', '5C', '7D', '7E', '9A', '11F', '14B', '14C', '16D'],
  price: { std: 0, extra: 1500, front: 2200 },
};

// ============ ORDER CARD ============

// Service kinds shown inside an order (icon + accent for the registry/badges)
const SERVICE_KIND = {
  'Авиа':      { icon: 'plane',    color: '#2566ff', tone: 'blue' },
  'ЖД':        { icon: 'train',    color: '#2f88aa', tone: 'teal' },
  'Гостиница': { icon: 'building', color: '#1f9d57', tone: 'green' },
  'Трансфер':  { icon: 'car',      color: '#c47e22', tone: 'amber' },
  'Автобус':   { icon: 'bus',      color: '#6c7686', tone: 'gray' },
  'Группа':    { icon: 'users',    color: '#5a5af0', tone: 'blue' },
};
const SERVICE_STATUS = {
  'Поиск': 'gray', 'Предложение': 'teal', 'Согласование': 'amber',
  'Забронировано': 'blue', 'Подтверждено': 'green', 'Выписано': 'green',
  'Возврат': 'red', 'Отменено': 'red',
};

// icon + colour per passenger document type, per "Иконки документов для бронирования" reference sheet
const PAX_DOC_KIND = {
  'Загранпаспорт':            { icon: 'passport',  color: '#8b2942' },
  'Паспорт РФ':                { icon: 'passport',  color: '#1d2f6f' },
  'Свидетельство о рождении':  { icon: 'birthCert', color: '#1f9d57' },
  'Виза':                      { icon: 'visa',      color: '#2f88aa' },
};

const ORDER_SERVICES = [
  { id: 'S1', kind: 'Авиа',      title: 'FRU → IST → FRU',       sub: 'Air Astana · KC 131/132 · 2 пасс.', status: 'Выписано',      sum: 1720, currency: 'USD', date: '24.06 – 01.07', avia: 'AV-51162', supplier: 'Air Astana (API)', pax: 2,
    calc: { tariff: 1280, taxes: 216, fee: 80, commission: 144, total: 1720 } },
  { id: 'S2', kind: 'Гостиница', title: 'Hilton Istanbul · 4★',  sub: 'Standard Double · 7 ночей · BB',     status: 'Забронировано', sum: 980,  currency: 'USD', date: '24.06 – 01.07', supplier: 'Booking B2B', pax: 2,
    calc: { tariff: 910, taxes: 0, fee: 40, commission: 30, total: 980 } },
  { id: 'S3', kind: 'Трансфер',  title: 'IST → Hilton Istanbul', sub: 'Минивэн · 2 чел · встреча с табличкой', status: 'Подтверждено', sum: 60,  currency: 'USD', date: '24.06', supplier: 'Karimov Transfer', pax: 2,
    calc: { tariff: 48, taxes: 0, fee: 6, commission: 6, total: 60 } },
];

// Commercial proposals (КП). A proposal belongs to an order and holds several variants;
// the client approves one variant, which then converts into the booking stage.
const KP_STATUS_FLOW = ['Черновик', 'Подготовлено', 'Отправлено клиенту', 'На согласовании', 'Согласовано', 'Отклонено', 'Архивировано'];
const KP_STATUS = {
  'Черновик': 'gray', 'Подготовлено': 'teal', 'Отправлено клиенту': 'blue',
  'На согласовании': 'amber', 'Согласовано': 'green', 'Отклонено': 'red', 'Архивировано': 'gray',
};

const PROPOSALS = [
  {
    id: 'КП-1042', order: 51162, client: 'ОсОО "Гранд лимитед"', status: 'Отправлено клиенту',
    currency: 'USD', validUntil: '20.06.2026', created: '14.06.2026', approvedVariant: null,
    variants: [
      { id: 'v1', name: 'Вариант A · Прямые рейсы', items: [
        { id: 'i1', kind: 'Авиа',      title: 'Turkish Airlines · FRU–IST–FRU', sub: 'TK 345/346 · 2 пасс. · прямой', cost: 936, fee: 44 },
        { id: 'i2', kind: 'Гостиница', title: 'Hilton Istanbul 4★',             sub: 'Standard Double · 7 ночей · BB', cost: 980, fee: 25 },
        { id: 'i3', kind: 'Трансфер',  title: 'Индивидуальный трансфер',         sub: 'Минивэн · встреча с табличкой', cost: 60, fee: 0 },
      ] },
      { id: 'v2', name: 'Вариант B · Бюджетный', items: [
        { id: 'i4', kind: 'Авиа',      title: 'Pegasus · FRU–SAW–FRU',  sub: 'PC 593/594 · 2 пасс.', cost: 596, fee: 28 },
        { id: 'i5', kind: 'Гостиница', title: 'Holiday Inn 3★',          sub: '7 ночей · BB',         cost: 710, fee: 20 },
        { id: 'i6', kind: 'Трансфер',  title: 'Групповой трансфер',      sub: 'Шаттл аэропорт–отель', cost: 30, fee: 0 },
      ] },
    ],
    history: [
      { t: '14.06 · 14:40', text: 'КП создано из заказа № 51162', who: 'Даниель' },
      { t: '14.06 · 15:10', text: 'Добавлен Вариант B · Бюджетный', who: 'Даниель' },
      { t: '14.06 · 15:34', text: 'Отправлено клиенту', who: 'Даниель' },
    ],
  },
  { id: 'КП-1039', order: 51170, client: 'ОсОО "Asia Travel"', status: 'Согласовано', currency: 'USD', validUntil: '18.06.2026', created: '10.06.2026', approvedVariant: 'v1',
    variants: [{ id: 'v1', name: 'Вариант A', items: [
      { id: 'a1', kind: 'Авиа', title: 'Qatar Airways · FRU–IST–FRU', sub: '6 пасс.', cost: 3030, fee: 120 },
      { id: 'a2', kind: 'Гостиница', title: 'Sheraton · 5★', sub: '5 ночей', cost: 1500, fee: 60 }] }],
    history: [{ t: '10.06 · 11:00', text: 'Создано', who: 'Куба' }, { t: '12.06 · 09:20', text: 'Согласовано клиентом · Вариант A', who: 'Система' }] },
  { id: 'КП-1051', order: 51163, client: 'Аттокуров Эрбол', status: 'Черновик', currency: 'USD', validUntil: '25.06.2026', created: '14.06.2026', approvedVariant: null,
    variants: [{ id: 'v1', name: 'Вариант A', items: [{ id: 'b1', kind: 'Авиа', title: 'Emirates · FRU–DXB', sub: '2 пасс.', cost: 1900, fee: 80 }] }],
    history: [{ t: '14.06 · 10:05', text: 'Черновик создан', who: 'Даниель' }] },
  { id: 'КП-1033', order: 51156, client: 'Сагынбеков Икрам', status: 'На согласовании', currency: 'USD', validUntil: '17.06.2026', created: '09.06.2026', approvedVariant: null,
    variants: [{ id: 'v1', name: 'Всё включено', items: [{ id: 'c1', kind: 'Группа', title: 'Анталия · All Inclusive', sub: '10 чел · 7 ночей', cost: 8200, fee: 300 }] }],
    history: [{ t: '09.06 · 16:00', text: 'Создано и отправлено', who: 'Кими' }] },
  { id: 'КП-1028', order: 51155, client: 'ИП Мамажанов Абдутаир', status: 'Отклонено', currency: 'USD', validUntil: '12.06.2026', created: '05.06.2026', approvedVariant: null,
    variants: [{ id: 'v1', name: 'Вариант A', items: [{ id: 'd1', kind: 'Трансфер', title: 'Трансфер Бишкек–Алматы', sub: '4 чел', cost: 200, fee: 20 }] }],
    history: [{ t: '05.06 · 12:00', text: 'Создано', who: 'Даниель' }, { t: '08.06 · 14:30', text: 'Отклонено клиентом', who: 'Система' }] },
  // ЖД + проживание (групповая перевозка): отдельный тип КП с таблицами рейсов/гостиниц
  {
    id: 'ГП117', order: 51190, client: 'Dreamlaser', status: 'Отправлено клиенту', currency: 'KZT',
    validUntil: '25.06.2025', created: '25.05.2025', approvedVariant: null, docType: 'train',
    train: {
      passengers: 26,
      direction: 'Новый Уренгой',
      note: 'Стоимость проезда в обратную сторону указана номинально-групповая. Возможна корректировка стоимости по факту становления поезда на рейс.',
      trips: [
        { id: 't1', carrier: 'Поезд', number: '012Я', route: 'Нижний Новгород - Новый Уренгой', dateDep: '8/10/2025', timeDep: '20:22', dateArr: '8/13/2025', timeArr: '13:30', price: 13703.40, asb: 769.70, sa: 300.00, qty: 26, cost: 384100.00, note: 'групповое бронирование', cls: 'Плацкарт', extra: '' },
        { id: 't2', carrier: 'Поезд', number: 'Не назначен', route: 'Новый Уренгой - Нижний Новгород', dateDep: '9/12/2025', timeDep: 'не назначен', dateArr: '10 - 12.09.2025', timeArr: 'не назначен', price: 13703.40, asb: 769.70, sa: 300.00, qty: 26, cost: 384098.00, note: 'плавающая дата / выкуп свободных мест при СПНР', cls: 'Плацкарт', extra: '' },
      ],
    },
    accommodation: {
      guests: 26,
      location: 'Новый Уренгой.\nСК "Звёздный"',
      variants: [
        { id: 'av1', name: 'Вариант 1', rows: [
          { id: 'r1', hotel: 'Газовик', room: 'Стандарт', address: 'ул. Окружная, д. 7', dateIn: '8/13/2025', timeIn: '14:00', dateOut: '9/12/2025', timeOut: '12:00', price: 118800.00, asb: 0, sa: 0, qty: 26, cost: 3088800.00, note: '1 местное размещение', meal: 'Завтрак', point: '3 от локации' },
        ] },
        { id: 'av2', name: 'Вариант 2', rows: [
          { id: 'r2', hotel: 'Газовик', room: 'Стандарт 2', address: 'ул. Окружная, д. 7', dateIn: '8/13/2025', timeIn: '14:00', dateOut: '9/12/2025', timeOut: '12:00', price: 198000.00, asb: 0, sa: 0, qty: 13, cost: 2574000.00, note: '2х местное размещение', meal: 'Завтрак', point: '1 км от локации' },
        ] },
        { id: 'av3', name: 'Вариант 3', rows: [
          { id: 'r3', hotel: 'Апартаменты', room: '3 к квартира', address: 'ул. Восточный микрорайон, д. 6/8', dateIn: '8/13/2025', timeIn: '14:00', dateOut: '9/12/2025', timeOut: '12:00', price: 182848.00, asb: 0, sa: 0, qty: 1, cost: 182848.00, note: '6-ти местное размещение, 3 двуспальных кровати', meal: 'отсутствует', point: '1 км от локации' },
          { id: 'r4', hotel: 'Апартаменты', room: '3 к квартира', address: 'м-н Советский, д. 6/3', dateIn: '8/13/2025', timeIn: '14:00', dateOut: '9/12/2025', timeOut: '12:00', price: 218244.00, asb: 0, sa: 0, qty: 1, cost: 218244.00, note: '6-ти местное размещение, 3 двуспальных кровати', meal: 'отсутствует', point: '0,9 км от локации' },
          { id: 'r5', hotel: 'Апартаменты', room: '3 к квартира', address: 'ул. Советский микрорайон, д. 9/2', dateIn: '8/13/2025', timeIn: '14:00', dateOut: '9/12/2025', timeOut: '12:00', price: 219348.00, asb: 0, sa: 0, qty: 1, cost: 219348.00, note: '6-ти местное размещение, 3 двуспальных кровати', meal: 'отсутствует', point: '0,7 км от локации' },
          { id: 'r6', hotel: 'Апартаменты', room: '3 к квартира', address: 'м-н Юбилейный, д. 4/2', dateIn: '8/13/2025', timeIn: '14:00', dateOut: '9/12/2025', timeOut: '12:00', price: 221689.00, asb: 0, sa: 0, qty: 1, cost: 221689.00, note: '6-ти местное размещение, 3 двуспальных кровати', meal: 'отсутствует', point: '1,3 км от локации' },
          { id: 'r7', hotel: 'Апартаменты', room: '1 к квартира', address: 'м-н Мирный, д.1/2', dateIn: '8/13/2025', timeIn: '14:00', dateOut: '9/12/2025', timeOut: '12:00', price: 112040.00, asb: 0, sa: 0, qty: 1, cost: 112040.00, note: '2х местное размещение, 1 двуспальная кровать', meal: 'отсутствует', point: '1,1 км от локации' },
        ] },
      ],
    },
    history: [
      { t: '25.05 · 09:10', text: 'КП «ГП117» создано (Поезд + Проживание)', who: 'Даниель' },
      { t: '25.05 · 09:40', text: 'Отправлено клиенту', who: 'Даниель' },
    ],
  },
];

const ORDER_PARTICIPANTS = [
  { name: 'Нуралиев Данияр',  role: 'Взрослый', doc: 'ID AC1234567', dob: '14.03.1990', phone: '+996 700 123 456', lead: true, docStatus: 'ok',
    docType: 'Загранпаспорт', docNo: 'AC1234567', docExpiry: '14.03.2035' },
  { name: 'Нуралиева Айгерим', role: 'Взрослый', doc: 'ID AC7654321', dob: '02.08.1992', phone: '+996 700 765 432', docStatus: 'ok',
    docType: 'Паспорт РФ', docNo: '4510 123456', docExpiry: '02.08.2033' },
  { name: 'Нуралиев Эмир',    role: 'Ребёнок',  doc: 'ID AC9911223', dob: '11.05.2017', phone: '—', docStatus: 'check',
    docType: 'Свидетельство о рождении', docNo: 'VII-123456', docExpiry: '11.05.2027' },
];

// ============ GROUP TRAVEL (4a — групповое бронирование) ============
// Larger passenger roster used when an order is marked as a group trip.
const GROUP_PAX = [
  { name: 'Нуралиев Данияр',     role: 'Взрослый', doc: 'ID AC1234567', docStatus: 'ok',
    docType: 'Загранпаспорт', docNo: 'AC1234567', docExpiry: '14.03.2035' },
  { name: 'Каримов Икрам',       role: 'Взрослый', doc: 'ID AC7766554', docStatus: 'ok',
    docType: 'Паспорт РФ', docNo: '4509 776655', docExpiry: '03.05.2032' },
  { name: 'Сагынбеков Бекзат',   role: 'Взрослый', doc: 'ID AC4455667', docStatus: 'ok',
    docType: 'Загранпаспорт', docNo: 'AC4455667', docExpiry: '22.09.2034' },
  { name: 'Аттокуров Эрбол',     role: 'Взрослый', doc: 'ID AC9911223', docStatus: 'ok',
    docType: 'Виза', docNo: 'US9911223', docExpiry: '08.02.2031' },
  { name: 'Жумабекова Назгуль',  role: 'Взрослый', doc: 'ID AC8877665', docStatus: 'ok',
    docType: 'Паспорт РФ', docNo: '4511 887766', docExpiry: '17.07.2030' },
  { name: 'Осмонова Айпери',     role: 'Взрослый', doc: 'ID AC5512347', docStatus: 'ok',
    docType: 'Загранпаспорт', docNo: 'AC5512347', docExpiry: '29.01.2033' },
  { name: 'Мамытов Тилек',       role: 'Взрослый', doc: 'ID AC6623481', docStatus: 'ok',
    docType: 'Паспорт РФ', docNo: '4512 662348', docExpiry: '05.12.2031' },
  { name: 'Бакиров Адилет',      role: 'Взрослый', doc: 'ID AC7734512', docStatus: 'ok',
    docType: 'Загранпаспорт', docNo: 'AC7734512', docExpiry: '11.06.2032' },
  { name: 'Эргешов Нурлан',      role: 'Взрослый', doc: 'ID AC8845623', docStatus: 'ok',
    docType: 'Виза', docNo: 'GB8845623', docExpiry: '26.04.2030' },
  { name: 'Кадырова Жанара',     role: 'Взрослый', doc: 'ID AC9956734', docStatus: 'ok',
    docType: 'Паспорт РФ', docNo: '4513 995673', docExpiry: '14.10.2033' },
  { name: 'Турдубаева Айгуль',   role: 'Взрослый', doc: 'ID AC1167845', docStatus: 'ok',
    docType: 'Загранпаспорт', docNo: 'AC1167845', docExpiry: '02.03.2034' },
  { name: 'Сыдыков Эмир',        role: 'Взрослый', doc: 'ID AC2278956', docStatus: 'ok',
    docType: 'Паспорт РФ', docNo: '4514 227895', docExpiry: '19.08.2032' },
  { name: 'Абдыкеримов Руслан',  role: 'Взрослый', doc: 'ID AC3389067', docStatus: 'ok',
    docType: 'Загранпаспорт', docNo: 'AC3389067', docExpiry: '07.05.2031' },
  { name: 'Исаева Динара',       role: 'Взрослый', doc: 'ID AC4490178', docStatus: 'ok',
    docType: 'Виза', docNo: 'US4490178', docExpiry: '23.11.2030' },
  { name: 'Бейшеналиев Канат',   role: 'Взрослый', doc: 'ID AC5501289', docStatus: 'ok',
    docType: 'Паспорт РФ', docNo: '4515 550128', docExpiry: '30.06.2033' },
  { name: 'Орозова Бермет',      role: 'Взрослый', doc: 'ID AC6612390', docStatus: 'ok',
    docType: 'Загранпаспорт', docNo: 'AC6612390', docExpiry: '12.02.2032' },
  { name: 'Жээнбеков Алмаз',     role: 'Взрослый', doc: 'ID AC7723401', docStatus: 'ok',
    docType: 'Паспорт РФ', docNo: '4516 772340', docExpiry: '09.09.2031' },
  { name: 'Касымова Чолпон',     role: 'Ребёнок',  doc: 'ID AC8834512', docStatus: 'check',
    docType: 'Свидетельство о рождении', docNo: 'VII-883451', docExpiry: '15.04.2028' },
  { name: 'Маматов Темир',       role: 'Ребёнок',  doc: 'ID AC9945623', docStatus: 'check',
    docType: 'Свидетельство о рождении', docNo: 'VII-994562', docExpiry: '01.01.2029' },
  { name: 'Алиева Асель',        role: 'Взрослый', doc: 'ID AC1056734', docStatus: 'ok',
    docType: 'Загранпаспорт', docNo: 'AC1056734', docExpiry: '27.07.2034' },
];
const ORDER_GROUPS = [
  { id: 'grp-1', name: 'Руководство', type: 'Отдел', pax: 4, policy: 'Бизнес-класс', ready: 4, issues: 0 },
  { id: 'grp-2', name: 'Маркетинг', type: 'Отдел', pax: 8, policy: 'Эконом', ready: 7, issues: 1 },
  { id: 'grp-3', name: 'Сопровождение', type: 'Группа', pax: 8, policy: 'Эконом + багаж', ready: 7, issues: 1 },
];
const ORDER_SERVICE_EXTRAS = {
  summary: [
    { key: 'seats', label: 'Места', value: '18 назначено, 2 требуют выбора', icon: 'briefcase' },
    { key: 'baggage', label: 'Багаж', value: '14 c багажом, 6 без багажа', icon: 'luggage' },
    { key: 'meal', label: 'Питание', value: '6 спецпитаний, 14 стандарт', icon: 'docs' },
    { key: 'insurance', label: 'Страхование', value: '20 полисов, 3 тарифа', icon: 'idcard' },
  ],
  passengers: [
    { name: 'Нуралиев Данияр', group: 'Руководство', fare: 'Бизнес Flex', seat: '2A', baggage: '2x23 кг', meal: 'Вегетарианское', insurance: 'Premium' },
    { name: 'Каримов Икрам', group: 'Руководство', fare: 'Бизнес Flex', seat: '2C', baggage: '2x23 кг', meal: 'Стандарт', insurance: 'Premium' },
    { name: 'Жумабекова Назгуль', group: 'Маркетинг', fare: 'Эконом Optimum', seat: '14A', baggage: '1x23 кг', meal: 'Стандарт', insurance: 'Standard' },
    { name: 'Касымова Чолпон', group: 'Сопровождение', fare: 'Эконом Light', seat: 'не выбрано', baggage: 'без багажа', meal: 'Детское', insurance: 'Standard', issue: true },
  ],
};
const ORDER_BOOKING_FLOW = [
  { key: 'method', label: 'Способ бронирования', note: 'Индивидуальный и групповой сценарий доступны', status: 'done' },
  { key: 'launch', label: 'Запуск бронирования', note: 'Запросы к Air Astana, Booking B2B и Karimov Transfer готовы', status: 'done' },
  { key: 'supplier', label: 'Ответы поставщиков', note: '2 ответа получены, трансфер ожидает подтверждения', status: 'current' },
  { key: 'confirm', label: 'Подтверждение услуг', note: 'После проверки тарифов и документов', status: 'pending' },
  { key: 'issue', label: 'Выписка и оплата', note: 'Выписка, сбор документов и закрытие долга', status: 'pending' },
];
// member indices reference GROUP_PAX positions; fare references AVIA_FARE_TIERS ids
const AVIA_GROUPS_SEED = [
  { id: 'g1', name: 'Руководство', desc: 'Топ-менеджмент, бизнес-класс', fare: 'max',     members: [0, 1, 2, 3] },
  { id: 'g2', name: 'Менеджеры',   desc: 'Линейные руководители',        fare: 'optimum', members: [4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'g3', name: 'Сопровождение', desc: 'Поддержка и логистика',       fare: 'light',   members: [12, 13, 14, 15, 16, 17, 18, 19] },
];

// ============ RAIL (ЖД) — wagon & per-passenger seat selection ============
// Service classes (обслуживание), prices in ₽. `kinds` drives the seat berth/type per seat:
// for two-kind classes odd seat → kinds[0], even → kinds[1]; single-kind classes use kinds[0].
const RAIL_SERVICE_CLASSES = [
  { id: 'kupe',  name: 'Купе',     type: 'Купейный',    icon: 'idcard',   priceRub: 4560,  freeSeats: 54,  seats: 36, perComp: 4, kinds: ['low', 'up'],   amenities: ['Кондиционер', 'Биотуалет', 'Розетка 220V', 'Индивидуальное освещение'] },
  { id: 'platz', name: 'Плацкарт', type: 'Плацкартный', icon: 'briefcase', priceRub: 2980, freeSeats: 102, seats: 54, perComp: 4, kinds: ['low', 'up'],   amenities: ['Кондиционер', 'Биотуалет', 'Розетка 220V'] },
  { id: 'sv',    name: 'СВ',       type: 'СВ',          icon: 'star',     priceRub: 8950,  freeSeats: 18,  seats: 18, perComp: 2, kinds: ['low'],          amenities: ['Кондиционер', 'Биотуалет', 'Розетка 220V', 'Душ'] },
  { id: 'lux',   name: 'Люкс',     type: 'Люкс',        icon: 'star',     priceRub: 15800, freeSeats: 6,   seats: 8,  perComp: 2, kinds: ['low'],          amenities: ['Кондиционер', 'Душ', 'ТВ', 'Питание включено'] },
  { id: 'sit',   name: 'Сидячий',  type: 'Сидячий',     icon: 'users',    priceRub: 1860,  freeSeats: 74,  seats: 60, perComp: 0, kinds: ['win', 'aisle'], amenities: ['Кондиционер', 'Wi-Fi', 'Розетка 220V'] },
];
// available wagons per service class (no, seatsLeft); type is taken from the class
const RAIL_WAGONS = {
  kupe:  [{ no: '02', seatsLeft: 14 }, { no: '03', seatsLeft: 6 }, { no: '04', seatsLeft: 22 }, { no: '05', seatsLeft: 8 }, { no: '06', seatsLeft: 31 }, { no: '07', seatsLeft: 12 }, { no: '08', seatsLeft: 4 }, { no: '09', seatsLeft: 19 }, { no: '10', seatsLeft: 27 }, { no: '11', seatsLeft: 9 }, { no: '12', seatsLeft: 15 }, { no: '13', seatsLeft: 3 }],
  platz: [{ no: '01', seatsLeft: 28 }, { no: '02', seatsLeft: 41 }, { no: '03', seatsLeft: 12 }, { no: '04', seatsLeft: 7 }],
  sv:    [{ no: '01', seatsLeft: 6 }, { no: '02', seatsLeft: 2 }, { no: '03', seatsLeft: 10 }],
  lux:   [{ no: '01', seatsLeft: 4 }, { no: '02', seatsLeft: 2 }],
  sit:   [{ no: '01', seatsLeft: 22 }, { no: '02', seatsLeft: 38 }, { no: '03', seatsLeft: 14 }],
};
// already-sold seats per «class:wagon» (demo)
const RAIL_OCCUPIED = {
  'kupe:02': [1, 2, 7, 8, 15, 16, 30], 'kupe:03': [3, 4, 11, 12, 19, 20, 27, 28], 'kupe:04': [5, 6, 17, 28],
  'platz:01': [10, 11, 22, 33, 41, 50], 'platz:02': [2, 14, 36, 48],
  'sv:01': [3, 4, 11, 12], 'sv:02': [1, 2, 7, 8, 13, 14],
  'lux:01': [3, 4], 'lux:02': [1, 2, 7],
  'sit:01': [3, 5, 12, 20, 27, 41, 55], 'sit:02': [1, 2, 7, 8, 15, 30, 44],
};

const ORDER_TASKS = [
  { text: 'Выписать билет — тайм-лимит', due: 'сегодня 18:00', urgent: true },
  { text: 'Получить оплату от клиента', due: 'завтра', urgent: false },
  { text: 'Загрузить ваучер отеля', due: '16.06', urgent: false },
];

// ============ FINANCE CONTOUR + DOCUMENTS (Оформление и сопровождение) ============

const ORDER_STAGES = ['Создан', 'Подбор услуг', 'Бронирование', 'Выписка', 'Документы', 'Завершён'];

const FIN_OP_STATUS = { 'Ожидает оплаты': 'amber', 'Частично оплачено': 'blue', 'Оплачено': 'green', 'Возврат': 'teal', 'Закрыто': 'gray' };

// One financial operation. payable = tariff + taxes + fee + penalty − discount; debt = payable − paid − refund.
const FIN_OPS = [
  { no: 'F-2041', order: 51162, source: 'Авиа',      type: 'Оплата клиента', date: '14.06.2026', resp: 'Даниель', currency: 'USD', tariff: 1600, taxes: 120, fee: 80,  commission: 64, discount: 80, paid: 1720, refund: 0,   penalty: 0,  status: 'Оплачено',         comment: 'Полная оплата по варианту A', history: [{ t: '14.06 · 12:30', text: 'Создана из согласованного КП-1042', who: 'Система' }, { t: '14.06 · 15:40', text: 'Платёж 1720 $ подтверждён', who: 'Даниель' }] },
  { no: 'F-2042', order: 51162, source: 'Гостиница', type: 'Оплата клиента', date: '14.06.2026', resp: 'Даниель', currency: 'USD', tariff: 955,  taxes: 0,   fee: 25,  commission: 95, discount: 0,  paid: 500,  refund: 0,   penalty: 0,  status: 'Частично оплачено', comment: 'Внесён аванс 50%',                history: [{ t: '14.06 · 12:30', text: 'Создана из КП-1042', who: 'Система' }, { t: '14.06 · 16:10', text: 'Аванс 500 $', who: 'Даниель' }] },
  { no: 'F-2043', order: 51162, source: 'Трансфер',  type: 'Оплата клиента', date: '14.06.2026', resp: 'Даниель', currency: 'USD', tariff: 60,   taxes: 0,   fee: 0,   commission: 6,  discount: 0,  paid: 0,    refund: 0,   penalty: 0,  status: 'Ожидает оплаты',    comment: '',                              history: [{ t: '14.06 · 12:30', text: 'Создана из КП-1042', who: 'Система' }] },
  { no: 'F-2031', order: 51170, source: 'Авиа',      type: 'Оплата поставщику', date: '12.06.2026', resp: 'Куба', currency: 'USD', tariff: 3030, taxes: 0,   fee: 0,   commission: 240, discount: 0, paid: 0,    refund: 0,   penalty: 0,  status: 'Ожидает оплаты',    comment: 'Тайм-лимит выписки',            history: [{ t: '12.06 · 09:20', text: 'Создана', who: 'Система' }] },
  { no: 'F-2018', order: 51155, source: 'Трансфер',  type: 'Возврат клиенту', date: '10.06.2026', resp: 'Даниель', currency: 'USD', tariff: 200, taxes: 0,   fee: 20,  commission: 0,  discount: 0,  paid: 220,  refund: 176, penalty: 44, status: 'Возврат',           comment: 'Возврат со штрафом 20%',        history: [{ t: '08.06 · 14:30', text: 'Заявка на возврат', who: 'Клиент' }, { t: '10.06 · 11:00', text: 'Возврат 176 $ (штраф 44 $)', who: 'Даниель' }] },
  { no: 'F-2009', order: 51168, source: 'Гостиница', type: 'Оплата клиента', date: '07.06.2026', resp: 'Азамат', currency: 'USD', tariff: 510, taxes: 0,   fee: 30,  commission: 76, discount: 0,  paid: 540,  refund: 0,   penalty: 0,  status: 'Закрыто',           comment: 'Сделка закрыта',                history: [{ t: '07.06 · 10:00', text: 'Оплачено и закрыто', who: 'Азамат' }] },
];

const DOC_KIND = {
  'Маршрутная квитанция': { icon: 'route',    color: '#2566ff' },
  'Билет':                { icon: 'ticket',   color: '#5a5af0' },
  'Ваучер':               { icon: 'docs',     color: '#1f9d57' },
  'Страховой полис':      { icon: 'idcard',   color: '#2f88aa' },
  'Счёт':                 { icon: 'finance',  color: '#c47e22' },
  'Акт':                  { icon: 'template', color: '#6c7686' },
  'Договор':              { icon: 'docs',     color: '#2566ff' },
  'Паспорт':              { icon: 'idcard',   color: '#7e889a' },
  'Прочее':               { icon: 'paperclip',color: '#9aa3b2' },
};
const DOC_STATUS2 = { 'Черновик': 'gray', 'Сформирован': 'teal', 'В бухгалтерии': 'blue', 'На подписи': 'amber', 'Подписан': 'green', 'Аннулирован': 'red' };

const DOCS2 = [
  { no: 'D-3120', name: 'Маршрут-квитанция KC 131/132', type: 'Маршрутная квитанция', order: 51162, participant: 'Нуралиев Данияр', service: 'Авиа · AV-51162', finOp: 'F-2041', status: 'Подписан', version: 2, date: '14.06.2026', size: '212 КБ',
    versions: [{ v: 2, date: '14.06 · 15:40', who: 'Даниель', note: 'Итоговая после выписки' }, { v: 1, date: '13.06 · 18:02', who: 'Система', note: 'Черновик из брони' }],
    history: [{ t: '13.06 · 18:02', text: 'Создан автоматически', who: 'Система' }, { t: '14.06 · 15:40', text: 'Загружена версия 2, подписан', who: 'Даниель' }] },
  { no: 'D-3121', name: 'Электронный билет · Нуралиев Д.', type: 'Билет', order: 51162, participant: 'Нуралиев Данияр', service: 'Авиа · AV-51162', finOp: 'F-2041', status: 'Подписан', version: 1, date: '14.06.2026', size: '180 КБ',
    versions: [{ v: 1, date: '14.06 · 15:41', who: 'Система', note: 'Выписка' }], history: [{ t: '14.06 · 15:41', text: 'Билет выписан', who: 'Система' }] },
  { no: 'D-3122', name: 'Ваучер Hilton Istanbul', type: 'Ваучер', order: 51162, participant: '—', service: 'Гостиница', finOp: 'F-2042', status: 'На подписи', version: 1, date: '14.06.2026', size: '96 КБ',
    versions: [{ v: 1, date: '14.06 · 16:12', who: 'Даниель', note: 'Получен от поставщика' }], history: [{ t: '14.06 · 16:12', text: 'Загружен ваучер', who: 'Даниель' }] },
  { no: 'D-3123', name: 'Счёт на оплату № 6152', type: 'Счёт', order: 51162, participant: '—', service: '—', finOp: 'F-2042', status: 'Сформирован', version: 1, date: '14.06.2026', size: '64 КБ',
    versions: [{ v: 1, date: '14.06 · 12:35', who: 'Система', note: 'Счёт по КП' }], history: [{ t: '14.06 · 12:35', text: 'Счёт сформирован', who: 'Система' }] },
  { no: 'D-3124', name: 'Договор № 2024-118', type: 'Договор', order: 51162, participant: 'ОсОО "Гранд лимитед"', service: '—', finOp: '—', status: 'Подписан', version: 1, date: '09.09.2024', size: '320 КБ',
    versions: [{ v: 1, date: '09.09.24', who: 'Даниель', note: 'Подписан сторонами' }], history: [{ t: '09.09.24', text: 'Договор подписан', who: 'Даниель' }] },
  { no: 'D-3098', name: 'Страховой полис · группа', type: 'Страховой полис', order: 51170, participant: '6 чел', service: 'Группа', finOp: '—', status: 'Сформирован', version: 1, date: '12.06.2026', size: '140 КБ',
    versions: [{ v: 1, date: '12.06', who: 'Куба', note: 'Полис ВЗР' }], history: [{ t: '12.06 · 10:00', text: 'Полис оформлен', who: 'Куба' }] },
  { no: 'D-3077', name: 'Паспорт · Аттокуров Эрбол', type: 'Паспорт', order: 51163, participant: 'Аттокуров Эрбол', service: '—', finOp: '—', status: 'Черновик', version: 1, date: '14.06.2026', size: '1.1 МБ',
    versions: [{ v: 1, date: '14.06', who: 'Клиент', note: 'Скан загружен' }], history: [{ t: '14.06 · 09:10', text: 'Загружен клиентом', who: 'Клиент' }] },
  // --- per-passenger documents for the group order 51162 (demo of grouping by passenger) ---
  { no: 'D-3130', name: 'Электронный билет · Каримов И.', type: 'Билет', order: 51162, participant: 'Каримов Икрам', service: 'Авиа · AV-51162', finOp: 'F-2041', status: 'Подписан', version: 1, date: '14.06.2026', size: '178 КБ',
    versions: [{ v: 1, date: '14.06 · 15:42', who: 'Система', note: 'Выписка' }], history: [{ t: '14.06 · 15:42', text: 'Билет выписан', who: 'Система' }] },
  { no: 'D-3131', name: 'Страховой полис · Каримов И.', type: 'Страховой полис', order: 51162, participant: 'Каримов Икрам', service: 'Группа', finOp: '—', status: 'Сформирован', version: 1, date: '14.06.2026', size: '88 КБ',
    versions: [{ v: 1, date: '14.06 · 16:00', who: 'Даниель', note: 'Полис ВЗР' }], history: [{ t: '14.06 · 16:00', text: 'Полис оформлен', who: 'Даниель' }] },
  { no: 'D-3132', name: 'Электронный билет · Сагынбеков Б.', type: 'Билет', order: 51162, participant: 'Сагынбеков Бекзат', service: 'Авиа · AV-51162', finOp: 'F-2041', status: 'Подписан', version: 1, date: '14.06.2026', size: '181 КБ',
    versions: [{ v: 1, date: '14.06 · 15:43', who: 'Система', note: 'Выписка' }], history: [{ t: '14.06 · 15:43', text: 'Билет выписан', who: 'Система' }] },
  { no: 'D-3133', name: 'Паспорт · Сагынбеков Б.', type: 'Паспорт', order: 51162, participant: 'Сагынбеков Бекзат', service: '—', finOp: '—', status: 'На подписи', version: 1, date: '13.06.2026', size: '0.9 МБ',
    versions: [{ v: 1, date: '13.06', who: 'Клиент', note: 'Скан загружен' }], history: [{ t: '13.06 · 11:20', text: 'Загружен клиентом', who: 'Клиент' }] },
  { no: 'D-3134', name: 'Электронный билет · Аттокуров Э.', type: 'Билет', order: 51162, participant: 'Аттокуров Эрбол', service: 'Авиа · AV-51162', finOp: 'F-2041', status: 'Подписан', version: 1, date: '14.06.2026', size: '179 КБ',
    versions: [{ v: 1, date: '14.06 · 15:44', who: 'Система', note: 'Выписка' }], history: [{ t: '14.06 · 15:44', text: 'Билет выписан', who: 'Система' }] },
];

// Fulfillment control desk rows (отдел оформления). cat: payment | docs | overdue | return
const FULFILLMENT = [
  { order: 51162, client: 'ОсОО "Гранд лимитед"', cat: 'payment', detail: 'Трансфер · ожидает оплаты', amount: '60 $',  due: 'завтра',        resp: 'Даниель' },
  { order: 51162, client: 'ОсОО "Гранд лимитед"', cat: 'docs',    detail: 'Ваучер Hilton — на подписи', amount: '—',     due: 'сегодня',       resp: 'Даниель' },
  { order: 51170, client: 'ОсОО "Asia Travel"',   cat: 'payment', detail: 'Авиа · оплата поставщику',  amount: '3 030 $', due: 'сегодня 18:00', resp: 'Куба',   overdue: true },
  { order: 51170, client: 'ОсОО "Asia Travel"',   cat: 'docs',    detail: 'Билеты не выписаны (6 pax)', amount: '—',     due: 'сегодня 18:00', resp: 'Куба',   overdue: true },
  { order: 51155, client: 'ИП Мамажанов Абдутаир',cat: 'return',  detail: 'Возврат трансфера в обработке', amount: '176 $', due: 'в работе',   resp: 'Даниель' },
  { order: 51156, client: 'Сагынбеков Икрам',     cat: 'payment', detail: 'Тур · ожидает предоплаты',  amount: '8 500 $', due: '17.06',        resp: 'Кими' },
  { order: 51163, client: 'Аттокуров Эрбол',      cat: 'docs',    detail: 'Паспорт на проверке',       amount: '—',     due: '16.06',         resp: 'Даниель' },
  { order: 51154, client: 'Айбек Асылов',         cat: 'overdue', detail: 'Подтверждение поставщика просрочено', amount: '—', due: 'просрочено 1 день', resp: 'Адилет', overdue: true },
];

// ============ ВОЗВРАТЫ И ОБМЕНЫ (постпродажное обслуживание) ============

const RETURN_FLOW = ['Создано', 'На проверке', 'Ожидает согласования клиента', 'Передано поставщику', 'В обработке', 'Завершено'];
const RETURN_STATUS = {
  'Создано': 'gray', 'На проверке': 'teal', 'Ожидает согласования клиента': 'amber',
  'Передано поставщику': 'blue', 'В обработке': 'blue', 'Завершено': 'green', 'Отменено': 'red', 'Отклонено': 'red',
};
const RETURN_TYPE = {
  'Возврат билета':         { icon: 'refund', tone: 'teal' },
  'Обмен билета':           { icon: 'swap',   tone: 'blue' },
  'Аннуляция бронирования': { icon: 'x',      tone: 'red' },
  'Оформление справки':     { icon: 'docs',   tone: 'amber' },
};

// A post-sale operation. fin: original / supplierPenalty / serviceFee / extraHold → refund (для возврата).
// Для обмена дополнительно exchange: oldP / newP / diff (доплата при diff>0, возврат при diff<0).
const RETURNS = [
  { no: 'R-7020', order: 51162, client: 'ОсОО "Гранд лимитед"', type: 'Обмен билета', service: 'Авиа · AV-51162', supplier: 'Air Astana (API)', initiator: 'Оператор', resp: 'Даниель', status: 'Ожидает согласования клиента', created: '14.06.2026', deadline: '16.06.2026', currency: 'USD', finOp: null,
    participants: ['Нуралиев Данияр', 'Нуралиева Айгерим'],
    fin: { original: 1720, supplierPenalty: 80, serviceFee: 30, extraHold: 0, refund: 0 },
    exchange: { oldP: { route: 'FRU → IST → FRU', date: '24.06 – 01.07', fare: 'Economy Basic', price: 1720 }, newP: { route: 'FRU → IST → FRU', date: '26.06 – 03.07', fare: 'Economy', price: 1880 }, diff: 160 },
    documents: [{ name: 'Запрос на обмен', kind: 'Заявление', status: 'Подписан', v: 1 }, { name: 'Расчёт обмена от поставщика', kind: 'Подтверждение поставщика', status: 'Сформирован', v: 1 }],
    history: [{ t: '14.06 · 16:40', text: 'Создан запрос на обмен (оператор)', who: 'Даниель' }, { t: '14.06 · 16:55', text: 'Подобран новый вариант · +160 $', who: 'Даниель' }, { t: '14.06 · 17:02', text: 'Отправлено на согласование клиенту', who: 'Даниель' }] },
  { no: 'R-7019', order: 51170, client: 'ОсОО "Asia Travel"', type: 'Возврат билета', service: 'Авиа · QR 389/390', supplier: 'Qatar (API)', initiator: 'Клиент', resp: 'Куба', status: 'Передано поставщику', created: '13.06.2026', deadline: '15.06.2026', currency: 'USD', finOp: null,
    participants: ['Группа · 6 чел'],
    fin: { original: 3150, supplierPenalty: 480, serviceFee: 120, extraHold: 0, refund: 2550 },
    documents: [{ name: 'Заявление на возврат', kind: 'Заявление', status: 'Подписан', v: 1 }],
    history: [{ t: '13.06 · 10:00', text: 'Запрос на возврат (клиент)', who: 'Клиент' }, { t: '13.06 · 11:20', text: 'Проверка условий тарифа', who: 'Куба' }, { t: '13.06 · 12:00', text: 'Передано поставщику Qatar', who: 'Куба' }] },
  { no: 'R-7012', order: 51155, client: 'ИП Мамажанов Абдутаир', type: 'Возврат билета', service: 'Трансфер · F-2018', supplier: 'Karimov Transfer', initiator: 'Клиент', resp: 'Даниель', status: 'Завершено', created: '08.06.2026', deadline: '10.06.2026', currency: 'USD', finOp: 'F-2018',
    participants: ['Мамажанов Абдутаир'],
    fin: { original: 220, supplierPenalty: 30, serviceFee: 14, extraHold: 0, refund: 176 },
    documents: [{ name: 'Заявление на возврат', kind: 'Заявление', status: 'Подписан', v: 1 }, { name: 'Подтверждение возврата', kind: 'Подтверждение поставщика', status: 'Подписан', v: 1 }, { name: 'Справка о возврате', kind: 'Справка', status: 'Подписан', v: 2 }],
    history: [{ t: '08.06 · 14:30', text: 'Запрос на возврат (клиент)', who: 'Клиент' }, { t: '09.06 · 09:00', text: 'Согласовано с клиентом', who: 'Даниель' }, { t: '10.06 · 11:00', text: 'Возврат исполнен · фин. операция F-2018', who: 'Система' }] },
  { no: 'R-7008', order: 51163, client: 'Аттокуров Эрбол', type: 'Аннуляция бронирования', service: 'Авиа · AV-51163', supplier: 'Amadeus GDS', initiator: 'Оператор', resp: 'Даниель', status: 'На проверке', created: '14.06.2026', deadline: '15.06.2026', currency: 'USD', finOp: null,
    participants: ['Аттокуров Эрбол', 'Аттокурова Айгерим'],
    fin: { original: 1980, supplierPenalty: 1980, serviceFee: 0, extraHold: 0, refund: 0 },
    documents: [{ name: 'Запрос на аннуляцию', kind: 'Заявление', status: 'Черновик', v: 1 }],
    history: [{ t: '14.06 · 12:10', text: 'Создан запрос на аннуляцию', who: 'Даниель' }] },
  { no: 'R-7005', order: 51168, client: 'Jannat Hotel', type: 'Оформление справки', service: 'Авиа · AV-51168', supplier: 'Air Astana (API)', initiator: 'Клиент', resp: 'Азамат', status: 'Создано', created: '14.06.2026', deadline: '17.06.2026', currency: 'USD', finOp: null,
    participants: ['Каримов Икрам'],
    fin: { original: 0, supplierPenalty: 0, serviceFee: 10, extraHold: 0, refund: 0 },
    documents: [],
    history: [{ t: '14.06 · 13:30', text: 'Запрос справки о перелёте', who: 'Клиент' }] },
  { no: 'R-6990', order: 51156, client: 'Сагынбеков Икрам', type: 'Возврат билета', service: 'Тур · Анталия', supplier: 'Coral Travel', initiator: 'Клиент', resp: 'Кими', status: 'Отклонено', created: '06.06.2026', deadline: '08.06.2026', currency: 'USD', finOp: null,
    participants: ['Группа · 10 чел'],
    fin: { original: 8500, supplierPenalty: 8500, serviceFee: 0, extraHold: 0, refund: 0 },
    documents: [{ name: 'Заявление на возврат', kind: 'Заявление', status: 'Подписан', v: 1 }],
    history: [{ t: '06.06 · 15:00', text: 'Запрос на возврат', who: 'Клиент' }, { t: '07.06 · 10:00', text: 'Невозвратный тариф · отклонено', who: 'Кими' }] },
];

// ============ УВЕДОМЛЕНИЯ (управление вниманием оператора) ============

const NOTIF_PRIORITY = { 'Критический': 'red', 'Высокий': 'amber', 'Средний': 'blue', 'Информационный': 'gray' };
const NOTIF_PRIO_RANK = { 'Критический': 0, 'Высокий': 1, 'Средний': 2, 'Информационный': 3 };
const NOTIF_SOURCE = {
  'Заказы': { icon: 'orders', color: '#2566ff' }, 'Авиа': { icon: 'plane', color: '#5a5af0' },
  'КП': { icon: 'template', color: '#2f88aa' }, 'Финансы': { icon: 'finance', color: '#1f9d57' },
  'Документы': { icon: 'docs', color: '#c47e22' }, 'Возвраты': { icon: 'refund', color: '#2f88aa' },
  'Чаты': { icon: 'chat', color: '#5a5af0' }, 'Поставщики': { icon: 'suppliers', color: '#6c7686' },
  'Система': { icon: 'settings', color: '#7e889a' },
};

// link.type → раздел для действия из уведомления: order | finance | documents | returns | offers
const NOTIFICATIONS = [
  { id: 'N1',  cat: 'Финансы',   priority: 'Критический',    source: 'Финансы',   title: 'Просрочена оплата поставщику', desc: 'Заказ № 51170 · Qatar · тайм-лимит выписки сегодня 18:00', time: '8 мин', order: 51170, resp: 'Куба',    link: { type: 'finance' },   act: 'Открыть финансы',          read: false, pinned: true },
  { id: 'N2',  cat: 'Возвраты',  priority: 'Критический',    source: 'Возвраты',  title: 'Дедлайн возврата сегодня',     desc: 'R-7019 · возврат Qatar · исполнить до 15.06',              time: '22 мин', order: 51170, resp: 'Куба',   link: { type: 'returns' },   act: 'Открыть возврат',          read: false, pinned: false },
  { id: 'N3',  cat: 'Документы', priority: 'Критический',    source: 'Документы', title: 'Не выписаны билеты',           desc: 'Заказ № 51170 · 6 пассажиров без билетов',                 time: '25 мин', order: 51170, resp: 'Куба',   link: { type: 'documents' }, act: 'Открыть документы',         read: false, pinned: false },
  { id: 'N4',  cat: 'КП',        priority: 'Высокий',        source: 'КП',        title: 'Истекает срок действия КП',    desc: 'КП-1033 · Сагынбеков Икрам · действует до 17.06',          time: '40 мин', order: 51156, resp: 'Кими',   link: { type: 'offers' },    act: 'Открыть КП',                read: false, pinned: false },
  { id: 'N5',  cat: 'Возвраты',  priority: 'Высокий',        source: 'Возвраты',  title: 'Возврат требует проверки',     desc: 'R-7008 · аннуляция AV-51163 · нужна проверка условий',     time: '1 ч',    order: 51163, resp: 'Даниель', link: { type: 'returns' },  act: 'Открыть возврат',          read: false, pinned: false },
  { id: 'N6',  cat: 'Документы', priority: 'Высокий',        source: 'Документы', title: 'Требуется загрузка документа', desc: 'Заказ № 51163 · паспорт Аттокуров Эрбол на проверке',      time: '1 ч',    order: 51163, resp: 'Даниель', link: { type: 'documents' },act: 'Открыть документы',         read: false, pinned: false },
  { id: 'N7',  cat: 'КП',        priority: 'Высокий',        source: 'КП',        title: 'Клиент отклонил КП',           desc: 'КП-1028 · ИП Мамажанов · невозвратный тариф',              time: '2 ч',    order: 51155, resp: 'Даниель', link: { type: 'offers' },   act: 'Открыть КП',                read: true,  pinned: false },
  { id: 'N8',  cat: 'Заказы',    priority: 'Средний',        source: 'Заказы',    title: 'Новый заказ',                  desc: 'Заказ № 51180 · ОсОО "Asia Travel" · корпоративная',       time: '2 ч',    order: 51180, resp: 'Куба',    link: { type: 'order' },    act: 'Открыть заказ',             read: false, pinned: false },
  { id: 'N9',  cat: 'Возвраты',  priority: 'Средний',        source: 'Возвраты',  title: 'Обмен ждёт согласования клиента', desc: 'R-7020 · обмен AV-51162 · доплата +160 $',               time: '3 ч',    order: 51162, resp: 'Даниель', link: { type: 'returns' },  act: 'Открыть возврат',          read: false, pinned: false },
  { id: 'N10', cat: 'Финансы',   priority: 'Средний',        source: 'Финансы',   title: 'Частичная оплата',             desc: 'F-2042 · Hilton · внесён аванс 500 $ из 980 $',            time: '3 ч',    order: 51162, resp: 'Даниель', link: { type: 'finance' },  act: 'Открыть финансы',           read: true,  pinned: false },
  { id: 'N11', cat: 'Система',   priority: 'Средний',        source: 'Система',   title: 'Вам назначен заказ',           desc: 'Заказ № 51162 · ОсОО "Гранд лимитед"',                     time: '4 ч',    order: 51162, resp: 'Даниель', link: { type: 'order' },    act: 'Открыть заказ',             read: true,  pinned: false },
  { id: 'N12', cat: 'Система',   priority: 'Средний',        source: 'Чаты',      title: 'Вас упомянули',                desc: '@Даниель в комментарии по AV-51162: «учти места рядом»',   time: '4 ч',    order: 51162, resp: 'Даниель', link: { type: 'order' },    act: 'Перейти',                   read: false, pinned: false },
  { id: 'N13', cat: 'Финансы',   priority: 'Информационный', source: 'Финансы',   title: 'Поступила оплата',             desc: 'F-2041 · оплата 1 720 $ подтверждена',                     time: '5 ч',    order: 51162, resp: 'Даниель', link: { type: 'finance' },  act: 'Открыть финансы',           read: true,  pinned: false },
  { id: 'N14', cat: 'Финансы',   priority: 'Информационный', source: 'Возвраты',  title: 'Возврат завершён',             desc: 'R-7012 · возврат 176 $ исполнен',                          time: 'Вчера',  order: 51155, resp: 'Даниель', link: { type: 'returns' },  act: 'Открыть возврат',          read: true,  pinned: false },
  { id: 'N15', cat: 'Документы', priority: 'Информационный', source: 'Документы', title: 'Выпущены документы',           desc: 'Заказ № 51162 · маршрут-квитанция и билет готовы',          time: 'Вчера',  order: 51162, resp: 'Даниель', link: { type: 'documents' },act: 'Открыть документы',         read: true,  pinned: false },
  { id: 'N16', cat: 'КП',        priority: 'Информационный', source: 'КП',        title: 'Клиент согласовал КП',         desc: 'КП-1039 · ОсОО "Asia Travel" · Вариант A',                 time: 'Вчера',  order: 51170, resp: 'Куба',    link: { type: 'offers' },   act: 'Открыть КП',                read: true,  pinned: false },
];

const NOTIF_SETTINGS = [
  { key: 'finance', label: 'Финансовые события', desc: 'Оплаты, задолженности, возвраты', on: true },
  { key: 'myorders', label: 'События по моим заказам', desc: 'Только заказы, где я ответственный', on: true },
  { key: 'system', label: 'Системные уведомления', desc: 'Назначения, упоминания, смена ответственного', on: true },
  { key: 'deadlines', label: 'Напоминания о дедлайнах', desc: 'Тайм-лимиты, сроки КП, дедлайны возвратов', on: true },
];

// ============ СЕРВИСНЫЕ МОДУЛИ (ЖД / гостиницы / трансферы / автобусы / туры) ============
// Единая форма оффера: { id, title, sub, info:[{l,v}], tags:[], supplier, cost, fee }
// Единая форма строки реестра: { no, order, main, sub, date, qty, status, sum }
const SVC_DATA = {
  rail: {
    // structured rail offers (Москва ↔ Санкт-Петербург) — prices in ₽; cost = тариф/место
    offers: [
      { id: 'R1', number: '752А', name: 'САПСАН', carrier: 'РЖД',
        dep: { time: '07:30', date: '20 июн, сб', city: 'Москва', station: 'Казанский вокзал' },
        arr: { time: '11:15', date: '20 июн, сб', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '3 ч 45 мин', stops: 'Прямой', priceRub: 4560, cls: 'Купе', freeSeats: 54,
        tags: ['Купейный', 'РЖД'], supplier: 'РЖД (GDS)', currency: 'RUB', cost: 4560, fee: 250,
        title: 'Поезд 752А «САПСАН»', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '07:30 · 20 июн' }, { l: 'Прибытие', v: '11:15 · 20 июн' }, { l: 'В пути', v: '3 ч 45 мин' }] },
      { id: 'R2', number: '770А', name: 'Ласточка', carrier: 'РЖД',
        dep: { time: '08:40', date: '20 июн, сб', city: 'Москва', station: 'Ленинградский вокзал' },
        arr: { time: '12:30', date: '20 июн, сб', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '3 ч 50 мин', stops: 'Прямой', priceRub: 3250, cls: 'Сидячий', freeSeats: 112,
        tags: ['Сидячий', 'РЖД'], supplier: 'РЖД (GDS)', currency: 'RUB', cost: 3250, fee: 220,
        title: 'Поезд 770А «Ласточка»', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '08:40 · 20 июн' }, { l: 'Прибытие', v: '12:30 · 20 июн' }, { l: 'В пути', v: '3 ч 50 мин' }] },
      { id: 'R3', number: '028А', name: 'Гранд Экспресс', carrier: 'ТКС',
        dep: { time: '22:10', date: '20 июн, сб', city: 'Москва', station: 'Ленинградский вокзал' },
        arr: { time: '08:30', date: '21 июн, вс', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '10 ч 20 мин', stops: 'Прямой', priceRub: 8950, cls: 'СВ', freeSeats: 18,
        tags: ['СВ', 'ТКС'], supplier: 'ТКС (API)', currency: 'RUB', cost: 8950, fee: 400,
        title: 'Поезд 028А «Гранд Экспресс»', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '22:10 · 20 июн' }, { l: 'Прибытие', v: '08:30 · 21 июн' }, { l: 'В пути', v: '10 ч 20 мин' }] },
      { id: 'R4', number: '016А', name: 'Экспресс', carrier: 'РЖД',
        dep: { time: '13:50', date: '20 июн, сб', city: 'Москва', station: 'Ленинградский вокзал' },
        arr: { time: '23:05', date: '20 июн, сб', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '9 ч 15 мин', stops: 'Прямой', priceRub: 2980, cls: 'Плацкарт', freeSeats: 102,
        tags: ['Плацкартный', 'РЖД'], supplier: 'РЖД (GDS)', currency: 'RUB', cost: 2980, fee: 180,
        title: 'Поезд 016А', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '13:50 · 20 июн' }, { l: 'Прибытие', v: '23:05 · 20 июн' }, { l: 'В пути', v: '9 ч 15 мин' }] },
      { id: 'R5', number: '004А', name: 'САПСАН', carrier: 'РЖД',
        dep: { time: '19:30', date: '20 июн, сб', city: 'Москва', station: 'Казанский вокзал' },
        arr: { time: '23:25', date: '20 июн, сб', city: 'Санкт-Петербург', station: 'Московский вокзал' },
        dur: '3 ч 55 мин', stops: 'Прямой', priceRub: 15800, cls: 'Люкс', freeSeats: 6,
        tags: ['Люкс', 'РЖД'], supplier: 'РЖД (GDS)', currency: 'RUB', cost: 15800, fee: 600,
        title: 'Поезд 004А «САПСАН»', sub: 'Москва → Санкт-Петербург',
        info: [{ l: 'Отправление', v: '19:30 · 20 июн' }, { l: 'Прибытие', v: '23:25 · 20 июн' }, { l: 'В пути', v: '3 ч 55 мин' }] },
    ],
    registry: [
      { no: 'RW-51201', order: 51162, main: 'Москва → Санкт-Петербург', sub: 'Сапсан 752А · Купе', date: '20.06.26', qty: 2, status: 'Забронировано', sum: 9620, currency: 'RUB' },
      { no: 'RW-51188', order: 51156, main: 'Москва → Санкт-Петербург', sub: 'Ласточка 770А · Сидячий', date: '26.06.26', qty: 4, status: 'Выписано', sum: 13880, currency: 'RUB' },
      { no: 'RW-51177', order: 51170, main: 'Москва → Санкт-Петербург', sub: 'Сапсан 754А · Купе', date: '02.07.26', qty: 6, status: 'Поиск', sum: 0, currency: 'RUB' },
    ],
  },
  hotels: {
    offers: [
      { id: 'H1', title: 'Hilton Istanbul Bosphorus 4★', sub: 'Şişli · 1.2 км от центра', info: [{ l: 'Заезд', v: '24.06' }, { l: 'Выезд', v: '01.07' }, { l: 'Ночей', v: '7' }], tags: ['Завтрак', 'Wi-Fi', 'Бассейн', 'Standard Double'], supplier: 'Booking B2B', cost: 980, fee: 25 },
      { id: 'H2', title: 'Holiday Inn Şişli 3★', sub: 'Şişli · 2.0 км от центра', info: [{ l: 'Заезд', v: '24.06' }, { l: 'Выезд', v: '01.07' }, { l: 'Ночей', v: '7' }], tags: ['Завтрак', 'Wi-Fi', 'Twin Room'], supplier: 'Expedia TAAP', cost: 710, fee: 20 },
      { id: 'H3', title: 'Swissôtel The Bosphorus 5★', sub: 'Beşiktaş · вид на Босфор', info: [{ l: 'Заезд', v: '24.06' }, { l: 'Выезд', v: '01.07' }, { l: 'Ночей', v: '7' }], tags: ['Полупансион', 'Спа', 'Deluxe'], supplier: 'Booking B2B', cost: 1820, fee: 45 },
    ],
    registry: [
      { no: 'HT-51162', order: 51162, main: 'Hilton Istanbul 4★', sub: 'Стамбул · Standard Double', date: '24.06 – 01.07', qty: 2, status: 'Забронировано', sum: 1005 },
      { no: 'HT-51168', order: 51168, main: 'Jannat Resort 4★', sub: 'Иссык-Куль · Family', date: '10.07 – 15.07', qty: 4, status: 'Подтверждено', sum: 640 },
      { no: 'HT-51155', order: 51155, main: 'Rixos Premium 5★', sub: 'Анталия · Suite', date: '01.08 – 10.08', qty: 2, status: 'Предложение', sum: 2300 },
    ],
  },
  transfers: {
    offers: [
      { id: 'T1', title: 'Mercedes Vito (минивэн)', sub: 'до 6 пассажиров · 6 мест багажа', info: [{ l: 'Подача', v: 'IST аэропорт' }, { l: 'Назначение', v: 'Hilton Istanbul' }, { l: 'Время', v: '24.06 · 09:30' }], tags: ['Встреча с табличкой', 'Детское кресло'], supplier: 'Karimov Transfer', cost: 55, fee: 5 },
      { id: 'T2', title: 'Toyota Camry (седан)', sub: 'до 3 пассажиров', info: [{ l: 'Подача', v: 'IST аэропорт' }, { l: 'Назначение', v: 'Hilton Istanbul' }, { l: 'Время', v: '24.06 · 09:30' }], tags: ['Эконом'], supplier: 'IST Transfer', cost: 32, fee: 3 },
      { id: 'T3', title: 'Mercedes S-class (VIP)', sub: 'до 3 пассажиров · бизнес', info: [{ l: 'Подача', v: 'IST аэропорт' }, { l: 'Назначение', v: 'Hilton Istanbul' }, { l: 'Время', v: '24.06 · 09:30' }], tags: ['Бизнес', 'Вода', 'Wi-Fi'], supplier: 'VIP Cars', cost: 120, fee: 8 },
    ],
    registry: [
      { no: 'TR-51162', order: 51162, main: 'IST → Hilton Istanbul', sub: 'Минивэн Vito · встреча', date: '24.06.26', qty: 2, status: 'Подтверждено', sum: 60 },
      { no: 'TR-51170', order: 51170, main: 'FRU → центр', sub: 'Седан · эконом', date: '28.06.26', qty: 3, status: 'Забронировано', sum: 18 },
      { no: 'TR-51156', order: 51156, main: 'Аэропорт AYT → отель', sub: 'Автобус · группа 10', date: '01.08.26', qty: 10, status: 'Предложение', sum: 140 },
    ],
  },
  buses: {
    offers: [
      { id: 'B1', title: 'Setra S 415', sub: 'Перевозчик AsiaBus', info: [{ l: 'Отправление', v: '08:00 · 24.06' }, { l: 'Прибытие', v: '16:30 · 24.06' }, { l: 'В пути', v: '8 ч 30 м' }], tags: ['Wi-Fi', 'Кондиционер', '45 мест'], supplier: 'AsiaBus', cost: 25, fee: 2 },
      { id: 'B2', title: 'Neoplan Cityliner', sub: 'Перевозчик Bishkek Express', info: [{ l: 'Отправление', v: '21:00 · 24.06' }, { l: 'Прибытие', v: '05:00 · 25.06' }, { l: 'В пути', v: '8 ч 00 м' }], tags: ['Ночной', 'Туалет', '49 мест'], supplier: 'Bishkek Express', cost: 22, fee: 2 },
      { id: 'B3', title: 'Mercedes Tourismo', sub: 'Перевозчик Silk Road', info: [{ l: 'Отправление', v: '10:30 · 24.06' }, { l: 'Прибытие', v: '18:40 · 24.06' }, { l: 'В пути', v: '8 ч 10 м' }], tags: ['Wi-Fi', 'USB', '51 место'], supplier: 'Silk Road', cost: 28, fee: 2 },
    ],
    registry: [
      { no: 'BS-51190', order: 51156, main: 'Бишкек → Алматы', sub: 'AsiaBus · Setra', date: '24.06.26', qty: 12, status: 'Забронировано', sum: 324 },
      { no: 'BS-51172', order: 51162, main: 'Бишкек → Чолпон-Ата', sub: 'Silk Road · группа', date: '10.07.26', qty: 20, status: 'Выписано', sum: 600 },
      { no: 'BS-51155', order: 51155, main: 'Алматы → Бишкек', sub: 'Bishkek Express', date: '12.08.26', qty: 4, status: 'Поиск', sum: 0 },
    ],
  },
  tours: {
    offers: [
      { id: 'G1', title: 'Анталия · All Inclusive', sub: 'Rixos Premium Belek 5★', info: [{ l: 'Даты', v: '24.06 – 01.07' }, { l: 'Ночей', v: '7' }, { l: 'Питание', v: 'Ultra AI' }], tags: ['Перелёт включён', 'Трансфер', 'Страховка'], supplier: 'Coral Travel', cost: 820, fee: 40 },
      { id: 'G2', title: 'Дубай · экскурсионный', sub: 'Rove Downtown 4★', info: [{ l: 'Даты', v: '24.06 – 30.06' }, { l: 'Ночей', v: '6' }, { l: 'Питание', v: 'Завтрак' }], tags: ['Перелёт включён', '3 экскурсии'], supplier: 'Anex Tour', cost: 690, fee: 35 },
      { id: 'G3', title: 'Иссык-Куль · оздоровительный', sub: 'Karven 4 Seasons 4★', info: [{ l: 'Даты', v: '10.07 – 17.07' }, { l: 'Ночей', v: '7' }, { l: 'Питание', v: 'Полный пансион' }], tags: ['Трансфер', 'Спа-программа'], supplier: 'Kyrgyz Concept', cost: 410, fee: 20 },
    ],
    registry: [
      { no: 'GT-51156', order: 51156, main: 'Анталия · All Inclusive', sub: 'Rixos Premium 5★ · 10 чел', date: '24.06 – 01.07', qty: 10, status: 'Согласование', sum: 8500 },
      { no: 'GT-51170', order: 51170, main: 'Дубай · экскурсионный', sub: 'Rove Downtown 4★ · 6 чел', date: '24.06 – 30.06', qty: 6, status: 'Забронировано', sum: 4140 },
      { no: 'GT-51168', order: 51168, main: 'Иссык-Куль · оздоровит.', sub: 'Karven 4 Seasons · 4 чел', date: '10.07 – 17.07', qty: 4, status: 'Предложение', sum: 1640 },
    ],
  },
};

// ============ ГОСТИНИЦЫ (полный модуль подбора) ============
// Справочники для расширенного модуля бронирования гостиниц: каталог отелей,
// категории номеров, тарифы, удобства и дополнительные услуги. Цены — в рублях.
const HOTEL_AMENITIES = [
  { id: 'ac', icon: 'snowflake', label: 'Кондиционер' },
  { id: 'tv', icon: 'tv', label: 'Телевизор' },
  { id: 'safe', icon: 'lock', label: 'Сейф' },
  { id: 'minibar', icon: 'coffee', label: 'Мини-бар' },
  { id: 'wifi', icon: 'wifi', label: 'Wi-Fi бесплатно' },
  { id: 'robe', icon: 'sparkles', label: 'Халат и тапочки' },
  { id: 'desk', icon: 'briefcase', label: 'Рабочий стол' },
  { id: 'bath', icon: 'sun', label: 'Ванная с душем' },
];

// набор тарифов, общий для всех номеров (база — цена номера за ночь)
function hotelTariffs(base) {
  return [
    { id: 'pop', name: 'Популярный', badge: 'Популярный', price: base,
      feats: [{ ok: true, t: 'Завтрак включён' }, { ok: true, t: 'Бесплатная отмена до 17.06.2026' }, { ok: true, t: 'Оплата на месте · без предоплаты' }] },
    { id: 'flex', name: 'Тариф с гибкой отменой', price: Math.round(base * 1.18),
      feats: [{ ok: true, t: 'Завтрак включён' }, { ok: true, t: 'Бесплатная отмена в любое время' }, { ok: true, t: 'Оплата на месте · без предоплаты' }] },
    { id: 'nobreak', name: 'Тариф без завтрака', price: Math.round(base * 0.88),
      feats: [{ ok: false, t: 'Без завтрака' }, { ok: false, t: 'Без бесплатной отмены' }, { ok: true, t: 'Оплата на месте' }] },
  ];
}

// фабрика стандартного набора категорий номеров
function hotelRooms(mult) {
  const m = mult || 1;
  const R = (id, name, base, beds, cap, count, area, floor) =>
    ({ id, name, base: Math.round(base * m), beds, cap, count, area, floor, tariffs: hotelTariffs(Math.round(base * m)) });
  return [
    R('superior', 'Superior Room', 12450, '1 большая кровать', 2, 5, 24, '2–9'),
    R('deluxe', 'Deluxe Room', 16200, '1 большая кровать', 2, 3, 32, '3–11'),
    R('junior', 'Junior Suite', 24800, '2 раздельные кровати', 2, 4, 40, '6–12'),
    R('suite', 'Suite', 34600, '1 большая кровать', 2, 2, 55, '10–14'),
    R('exec', 'Executive Suite', 48500, '1 большая кровать', 2, 1, 70, '14'),
    R('family', 'Family Room', 18900, '2 кровати', 4, 2, 38, '2–6'),
    R('standard', 'Standard Room', 9800, '1 кровать', 2, 6, 18, '1–5'),
  ];
}

const HOTELS = [
  { id: 'metropol', name: 'Metropol Hotel Moscow', stars: 5, addr: 'Тверская б-р, д. 2, Москва', district: 'Центр города', metro: 450,
    rating: 9.4, ratingText: 'Превосходно', reviews: 1243, base: 12450, breakfast: true, freeCancel: '17.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 937-10-00', email: 'reservation@metropol-moscow.ru', addrFull: 'Тверская б-р, д. 2, Москва, 125009, Россия',
    rooms: hotelRooms(1) },
  { id: 'azimut', name: 'Azimut City Hotel Smolenskaya', stars: 4, addr: 'Смоленская ул., 8, Москва', district: 'Центр города', metro: 600,
    rating: 8.7, ratingText: 'Отлично', reviews: 892, base: 8900, breakfast: true, freeCancel: '17.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 411-77-77', email: 'reservation@azimuthotels.com', addrFull: 'Смоленская ул., 8, Москва, 121099, Россия',
    rooms: hotelRooms(0.72) },
  { id: 'ibis', name: 'Ibis Moscow Centre Bakhrushina', stars: 3, addr: 'ул. Бахрушина, 11, Москва', district: 'Центр города', metro: 800,
    rating: 8.2, ratingText: 'Очень хорошо', reviews: 568, base: 6200, breakfast: true, freeCancel: '18.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 660-09-09', email: 'h7141@accor.com', addrFull: 'ул. Бахрушина, 11, Москва, 115054, Россия',
    rooms: hotelRooms(0.5) },
  { id: 'ararat', name: 'Ararat Park Hyatt Moscow', stars: 5, addr: 'Неглинная ул., 4, Москва', district: 'Центр города', metro: 300,
    rating: 9.6, ratingText: 'Превосходно', reviews: 657, base: 24800, breakfast: true, freeCancel: '18.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 783-12-34', email: 'moscow.park@hyatt.com', addrFull: 'Неглинная ул., 4, Москва, 109012, Россия',
    rooms: hotelRooms(1.99) },
  { id: 'radisson', name: 'Radisson Collection Hotel', stars: 5, addr: 'Кутузовский пр-т, 2/1, Москва', district: 'Дорогомилово', metro: 350,
    rating: 9.1, ratingText: 'Превосходно', reviews: 1024, base: 19500, breakfast: true, freeCancel: '17.06.2026', payAtHotel: false,
    supplier: 'Островок', phone: '+7 495 221-55-55', email: 'info.moscow@radissoncollection.com', addrFull: 'Кутузовский пр-т, 2/1, Москва, 121248, Россия',
    rooms: hotelRooms(1.56) },
  { id: 'novotel', name: 'Novotel Moscow City', stars: 4, addr: 'Пресненская наб., 2, Москва', district: 'Пресненский', metro: 200,
    rating: 8.6, ratingText: 'Отлично', reviews: 741, base: 10200, breakfast: true, freeCancel: '17.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 114-95-00', email: 'h7726@accor.com', addrFull: 'Пресненская наб., 2, Москва, 123317, Россия',
    rooms: hotelRooms(0.82) },
  { id: 'mercure', name: 'Mercure Arbat Moscow', stars: 4, addr: 'Смоленская пл., 6, Москва', district: 'Арбат', metro: 500,
    rating: 8.4, ratingText: 'Очень хорошо', reviews: 503, base: 9400, breakfast: false, freeCancel: '16.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 225-00-25', email: 'h9518@accor.com', addrFull: 'Смоленская пл., 6, Москва, 119121, Россия',
    rooms: hotelRooms(0.75) },
  { id: 'hostel', name: 'City Comfort Inn', stars: 2, addr: 'ул. Щепкина, 28, Москва', district: 'Мещанский', metro: 700,
    rating: 7.6, ratingText: 'Хорошо', reviews: 214, base: 4200, breakfast: false, freeCancel: '15.06.2026', payAtHotel: true,
    supplier: 'Островок', phone: '+7 495 120-30-40', email: 'book@citycomfort.ru', addrFull: 'ул. Щепкина, 28, Москва, 129110, Россия',
    rooms: hotelRooms(0.34) },
];

// районы для бокового фильтра (значения должны совпадать с HOTELS[].district)
const HOTEL_DISTRICTS = ['Центр города', 'Арбат', 'Дорогомилово', 'Пресненский', 'Мещанский'];

// типы питания (тарифные планы)
const HOTEL_MEALS = [
  { id: 'RO', label: 'RO', full: 'Без питания' },
  { id: 'BB', label: 'BB', full: 'Завтрак' },
  { id: 'HB', label: 'HB', full: 'Полупансион' },
  { id: 'FB', label: 'FB', full: 'Полный пансион' },
  { id: 'AI', label: 'AI', full: 'Всё включено' },
];

// дополнительные услуги отеля, сгруппированы по категориям
const HOTEL_EXTRAS = [
  { cat: 'stay', icon: 'building', label: 'Проживание', items: [
    { id: 'early', label: 'Ранний заезд', note: 'с 06:00', price: 1500, per: 'room' },
    { id: 'late', label: 'Поздний выезд', note: 'до 18:00', price: 1500, per: 'room' },
    { id: 'extrabed', label: 'Дополнительная кровать', price: 1000, per: 'room' },
    { id: 'kidbed', label: 'Детская кровать', price: 0, per: 'room' },
    { id: 'upgrade', label: 'Повышение категории номера', note: 'Superior → Deluxe', price: 4000, per: 'room' },
  ] },
  { cat: 'meal', icon: 'utensils', label: 'Питание', items: [
    { id: 'breakfast', label: 'Завтрак (шведский стол)', price: 750, per: 'guest' },
    { id: 'lunch', label: 'Обед', price: 900, per: 'guest' },
    { id: 'dinner', label: 'Ужин', price: 1200, per: 'guest' },
  ] },
  { cat: 'transfer', icon: 'car', label: 'Трансферы', items: [
    { id: 'tr_in', label: 'Трансфер аэропорт → отель', price: 1800, per: 'unit' },
    { id: 'tr_out', label: 'Трансфер отель → аэропорт', price: 1800, per: 'unit' },
  ] },
  { cat: 'service', icon: 'sparkles', label: 'Сервис в отеле', items: [
    { id: 'parking', label: 'Парковка', note: 'на период проживания', price: 1000, per: 'unit' },
    { id: 'spa', label: 'SPA / фитнес доступ', price: 500, per: 'guest' },
    { id: 'welcome', label: 'Поздравление к приезду', price: 0, per: 'unit' },
    { id: 'roomservice', label: 'Поздний ужин (room service)', price: 500, per: 'unit' },
  ] },
  { cat: 'kids', icon: 'baby', label: 'Детские услуги', items: [
    { id: 'nanny', label: 'Услуги няни (час)', price: 1200, per: 'unit' },
    { id: 'kidsmenu', label: 'Детское меню', price: 600, per: 'guest' },
  ] },
  { cat: 'insurance', icon: 'shield', label: 'Страхование', items: [
    { id: 'med', label: 'Медицинская страховка', price: 450, per: 'guest' },
    { id: 'cancel', label: 'Страховка от невыезда', price: 700, per: 'guest' },
  ] },
  { cat: 'other', icon: 'briefcase', label: 'Прочее', items: [
    { id: 'flowers', label: 'Цветы в номер', price: 2500, per: 'unit' },
    { id: 'lateco', label: 'Дополнительный комплект полотенец', price: 0, per: 'room' },
  ] },
];

// ============ НАСТРОЙКИ: пользователи / роли / права ============
const USER_STATUS = { 'Активный': 'green', 'Заблокированный': 'red', 'Приглашён': 'amber' };
const USERS = [
  { name: 'Акимова Айсулуу', email: 'akimova@psc-travelhub.kg', role: 'Админ', status: 'Активный', last: 'сейчас', avatar: 'assets/avatar-aisuluu.png' },
  { name: 'Даниель', email: 'daniel@psc-travelhub.kg', role: 'Оператор', status: 'Активный', last: '5 мин назад' },
  { name: 'Адилет Медербеков', email: 'adilet@psc-travelhub.kg', role: 'Оператор', status: 'Активный', last: '1 ч назад' },
  { name: 'Кими Райкконен', email: 'kimi@psc-travelhub.kg', role: 'Менеджер', status: 'Активный', last: '2 ч назад' },
  { name: 'Куба', email: 'kuba@psc-travelhub.kg', role: 'Оператор', status: 'Приглашён', last: '—' },
  { name: 'Азамат А.', email: 'azamat@psc-travelhub.kg', role: 'Бухгалтер', status: 'Заблокированный', last: '3 дня назад' },
];
const ROLES = ['Админ', 'Оператор', 'Бухгалтер', 'Менеджер'];
// r aligned to ROLES order [Админ, Оператор, Бухгалтер, Менеджер]
const PERMISSIONS = [
  { group: 'Заказы', items: [{ k: 'Просмотр заказов', r: [1, 1, 1, 1] }, { k: 'Создание и редактирование', r: [1, 1, 0, 1] }, { k: 'Удаление заказов', r: [1, 0, 0, 0] }] },
  { group: 'Услуги и КП', items: [{ k: 'Поиск и бронирование услуг', r: [1, 1, 0, 1] }, { k: 'Коммерческие предложения', r: [1, 1, 0, 1] }] },
  { group: 'Финансы', items: [{ k: 'Просмотр финансов', r: [1, 1, 1, 1] }, { k: 'Проведение оплат', r: [1, 0, 1, 0] }, { k: 'Возвраты и штрафы', r: [1, 0, 1, 0] }] },
  { group: 'Документы', items: [{ k: 'Просмотр документов', r: [1, 1, 1, 1] }, { k: 'Загрузка и подпись', r: [1, 1, 1, 1] }] },
  { group: 'Администрирование', items: [{ k: 'Пользователи и роли', r: [1, 0, 0, 0] }, { k: 'Настройки системы', r: [1, 0, 0, 0] }, { k: 'API и интеграции', r: [1, 0, 0, 0] }] },
];

// ============ КЛИЕНТЫ ============
const CLIENT_STATUS = { 'Активный': 'green', 'VIP': 'blue', 'Новый': 'teal', 'Неактивный': 'gray' };
const CLIENTS_DB = [
  { id: 'CL-1042', name: 'Нуралиев Данияр', type: 'Физлицо', status: 'VIP', company: 'ОсОО "Гранд лимитед"', phone: '+996 700 123 456', email: 'd.nuraliev@mail.ru', city: 'Бишкек', since: '09.09.2024', orders: 12, spent: 18400, debt: 1100, doc: 'ID AC1234567', dob: '14.03.1990' },
  { id: 'CL-1039', name: 'Каримов Икрам', type: 'Физлицо', status: 'Активный', company: 'ОсОО "Asia Travel"', phone: '+996 555 987 654', email: 'karimov@asia.kg', city: 'Ош', since: '14.01.2025', orders: 7, spent: 9200, debt: 0, doc: 'ID AC7766554', dob: '22.07.1985' },
  { id: 'CL-1051', name: 'Аттокуров Эрбол', type: 'Физлицо', status: 'Активный', company: '—', phone: '+996 700 222 333', email: 'erbol.a@gmail.com', city: 'Бишкек', since: '05.02.2025', orders: 4, spent: 4300, debt: 0, doc: 'ID AC9911223', dob: '11.05.1991' },
  { id: 'CL-1033', name: 'Сагынбеков Икрам', type: 'Физлицо', status: 'Активный', company: 'ИП Сагынбеков', phone: '+996 770 444 555', email: 'sagyn@mail.ru', city: 'Бишкек', since: '20.03.2025', orders: 3, spent: 12800, debt: 8500, doc: 'ID AC4455667', dob: '03.12.1988' },
  { id: 'CL-1028', name: 'Мамажанов Абдутаир', type: 'ИП', status: 'Неактивный', company: 'ИП Мамажанов', phone: '+996 555 111 000', email: 'mamajanov@mail.ru', city: 'Джалал-Абад', since: '11.11.2024', orders: 2, spent: 3200, debt: 0, doc: 'ИНН 21807199100123', dob: '18.07.1979' },
  { id: 'CL-1060', name: 'Жумабекова Назгуль', type: 'Физлицо', status: 'Новый', company: '—', phone: '+996 700 888 999', email: 'nazgul.j@gmail.com', city: 'Бишкек', since: '12.06.2025', orders: 1, spent: 980, debt: 980, doc: 'ID AC8877665', dob: '29.09.1995' },
];

// ============ КОМПАНИИ ============
const COMPANY_STATUS = { 'Действующий': 'green', 'На паузе': 'amber', 'Архив': 'gray' };
// requiresESign: контрагент принимает закрывающие документы только с ЭЦП (зависит от его бухгалтерии).
// docCorrections: память о замечаниях по оформлению документов этого контрагента (наименование услуг,
// реквизиты подписи и т.п.), накопленная на предпросмотре — чтобы не повторять одну и ту же ошибку.
const COMPANIES_DB = [
  { id: 'CO-2001', name: 'ОсОО "Гранд лимитед"', type: 'Туроператор', status: 'Действующий', inn: '07070707070707', okpo: '8362411', dir: 'Нуралиев Данияр', phone: '+996 777 777 777', email: 'grandlimited@mail.ru', addr: 'Бишкек, ул. Токтогула 125/1', bank: 'Демир Банк', account: '1240020000123456', contract: '№ 2024-118 от 09.09.24', orders: 12, turnover: 86400, contacts: 3, vat: '12%',
    requiresESign: true, docCorrections: [{ date: '02.06.2026', who: 'Даниель', note: 'В акте указывать «Агентское вознаграждение по доп. соглашению № 3», а не общее «Сервисный сбор»' }] },
  { id: 'CO-2002', name: 'ОсОО "Asia Travel"', type: 'Турагент', status: 'Действующий', inn: '02208200512345', okpo: '2291055', dir: 'Каримов Икрам', phone: '+996 312 555 444', email: 'office@asia.kg', addr: 'Ош, ул. Курманжан Датка 12', bank: 'Оптима Банк', account: '1090000111223344', contract: '№ 2025-014 от 14.01.25', orders: 7, turnover: 54200, contacts: 2, vat: '12%',
    requiresESign: false, docCorrections: [] },
  { id: 'CO-2003', name: 'ИП Сагынбеков', type: 'Корпоративный клиент', status: 'На паузе', inn: '20312198800321', okpo: '—', dir: 'Сагынбеков Икрам', phone: '+996 770 444 555', email: 'sagyn@mail.ru', addr: 'Бишкек, ул. Чуй 200', bank: 'РСК Банк', account: '1180000999888777', contract: '№ 2025-033 от 20.03.25', orders: 3, turnover: 12800, contacts: 1, vat: 'без НДС',
    requiresESign: false, docCorrections: [] },
  { id: 'CO-2004', name: 'Best Travel Inc', type: 'Партнёр', status: 'Действующий', inn: '00000000000000', okpo: '—', dir: 'Greg James', phone: '+1 202 555 0114', email: 'partner@besttravel.com', addr: 'Dubai, Sheikh Zayed Rd', bank: 'Emirates NBD', account: 'AE12 0000 1111', contract: '№ INT-2025-7 от 02.02.25', orders: 5, turnover: 41000, contacts: 2, vat: '—',
    requiresESign: true, docCorrections: [] },
  { id: 'CO-2005', name: 'ИП Мамажанов', type: 'Корпоративный клиент', status: 'Архив', inn: '21807199100123', okpo: '—', dir: 'Мамажанов Абдутаир', phone: '+996 555 111 000', email: 'mamajanov@mail.ru', addr: 'Джалал-Абад, ул. Ленина 5', bank: 'Айыл Банк', account: '1230000222333444', contract: '№ 2024-101 от 11.11.24', orders: 2, turnover: 3200, contacts: 1, vat: 'без НДС',
    requiresESign: false, docCorrections: [] },
];

// Company staff directories, grouped by department (used by the "Создать заказ" employee
// picker so an operator can pick a whole department / travel-policy group instead of
// typing full names one by one).
const COMPANY_STAFF = {
  'CO-2001': {
    departments: [
      { id: 'd1', name: 'Руководство', policy: 'Бизнес-класс' },
      { id: 'd2', name: 'Отдел продаж', policy: 'Эконом' },
      { id: 'd3', name: 'Логистика', policy: 'Эконом' },
    ],
    employees: [
      { id: 'E-101', name: 'Нуралиев Данияр',  phone: '+996 700 123 456', doc: 'ID AC1234567', dept: 'd1' },
      { id: 'E-102', name: 'Нуралиева Айгерим', phone: '+996 700 765 432', doc: 'ID AC7654321', dept: 'd1' },
      { id: 'E-103', name: 'Орозов Бакыт',      phone: '+996 700 111 222', doc: 'ID AC1112223', dept: 'd2' },
      { id: 'E-104', name: 'Турдубекова Жаныл', phone: '+996 700 333 444', doc: 'ID AC3334445', dept: 'd2' },
      { id: 'E-105', name: 'Асанов Тилек',      phone: '+996 700 555 666', doc: 'ID AC5556667', dept: 'd2' },
      { id: 'E-106', name: 'Бекова Нурзат',     phone: '+996 700 777 888', doc: 'ID AC7778889', dept: 'd3' },
      { id: 'E-107', name: 'Маматов Эрлан',      phone: '+996 700 999 000', doc: 'ID AC9990001', dept: 'd3' },
    ],
  },
  'CO-2002': {
    departments: [
      { id: 'd1', name: 'Дирекция', policy: 'Бизнес-класс' },
      { id: 'd2', name: 'Маркетинг', policy: 'Эконом' },
    ],
    employees: [
      { id: 'E-201', name: 'Каримов Икрам',     phone: '+996 555 987 654', doc: 'ID AC7766554', dept: 'd1' },
      { id: 'E-202', name: 'Сатарова Венера',   phone: '+996 555 222 333', doc: 'ID AC2223334', dept: 'd2' },
      { id: 'E-203', name: 'Жолдошев Азамат',   phone: '+996 555 444 555', doc: 'ID AC4445556', dept: 'd2' },
    ],
  },
};
function companyStaff(companyId) { return COMPANY_STAFF[companyId] || { departments: [], employees: [] }; }

/* ====================================================================
   ФИНАНСОВЫЕ УСЛОВИЯ ЮР. ЛИЦ (ТЗ: балансы, договоры, доп.соглашения, сборы)
   Тип взаиморасчётов, депозит/кредитный лимит, договоры с версионируемыми
   дополнительными соглашениями, индивидуальные сборы по видам услуг и
   шаблоны описаний услуг для закрывающих документов.
   ==================================================================== */
const SETTLEMENT_TYPES = ['предоплата', 'депозит', 'отсрочка'];
const SETTLEMENT_TONE = { 'предоплата': 'gray', 'депозит': 'blue', 'отсрочка': 'amber' };

// Состав сборов по каждому виду услуг (ТЗ). Разные услуги — разный набор сборов.
const FEE_SCHEMA = {
  'Авиа':      [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'issue', label: 'Сбор за оформление' }, { key: 'exchange', label: 'Сбор за обмен' }, { key: 'refund', label: 'Сбор за возврат' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'ЖД':        [{ key: 'service', label: 'Сервисный сбор' }, { key: 'issue', label: 'Сбор за оформление' }, { key: 'exchange', label: 'Сбор за обмен' }, { key: 'refund', label: 'Сбор за возврат' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'Гостиница': [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'Трансфер':  [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'Страховка': [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'supplier', label: 'Сборы поставщиков' }],
  'Тур':       [{ key: 'service', label: 'Сервисный сбор' }, { key: 'markup', label: 'Агентская надбавка' }, { key: 'supplier', label: 'Сборы поставщиков' }],
};
const FEE_SERVICE_TYPES = Object.keys(FEE_SCHEMA);

// Описания услуг по умолчанию для закрывающих документов (акт/счёт/УПД) — ТЗ.
const SERVICE_DESC_DEFAULTS = {
  'Авиа':      'Оказание услуг по организации воздушной перевозки',
  'ЖД':        'Оказание услуг по организации железнодорожной перевозки',
  'Гостиница': 'Услуги по организации проживания',
  'Трансфер':  'Услуги по организации трансфера',
  'Страховка': 'Услуги по оформлению страхового полиса',
  'Тур':       'Услуги по организации туристического обслуживания',
};

// Формулировки сборов по умолчанию для закрывающих документов — каждая строка сбора
// (сервисный, агентская надбавка, сборы поставщика и т.д.) печатается в акте/счёте/УПД
// отдельной позицией со своим описанием (расширенная постановка клиента).
const FEE_DESC_DEFAULTS = {
  service:  'Сервисный сбор агентства',
  markup:   'Агентская надбавка',
  issue:    'Сбор за оформление',
  exchange: 'Сбор за обмен',
  refund:   'Сбор за возврат',
  supplier: 'Сборы поставщика',
};
// Разворачивает пустой набор описаний сборов по всем услугам (по умолчанию).
function feeDescsFromDefaults() {
  const out = {};
  FEE_SERVICE_TYPES.forEach((svc) => { out[svc] = {}; FEE_SCHEMA[svc].forEach((f) => { out[svc][f.key] = FEE_DESC_DEFAULTS[f.key] || f.label; }); });
  return out;
}
// Формулировка конкретного сбора в соглашении (fallback → дефолт → метка схемы).
function feeDescOf(agreement, svc, key) {
  const fromAgr = agreement && agreement.feeDescs && agreement.feeDescs[svc] && agreement.feeDescs[svc][key];
  if (fromAgr != null && String(fromAgr).trim()) return fromAgr;
  return FEE_DESC_DEFAULTS[key] || key;
}

// Именованные шаблоны сборов. values задают ставку по ключу сбора; при применении
// к конкретной услуге берутся только те ключи, что есть в её схеме (FEE_SCHEMA).
// type: 'percent' — % от базовой стоимости; 'fixed' — фиксированная сумма.
const FEE_TEMPLATES = [
  { id: 'standard', name: 'Стандартный', builtIn: true, values: { service: { type: 'percent', value: 5 }, markup: { type: 'percent', value: 3 }, issue: { type: 'fixed', value: 10 }, exchange: { type: 'fixed', value: 25 }, refund: { type: 'fixed', value: 15 }, supplier: { type: 'fixed', value: 0 } } },
  { id: 'deposit',  name: 'Депозитный', builtIn: true, values: { service: { type: 'percent', value: 4 }, markup: { type: 'percent', value: 2 }, issue: { type: 'fixed', value: 8 }, exchange: { type: 'fixed', value: 20 }, refund: { type: 'fixed', value: 12 }, supplier: { type: 'fixed', value: 0 } } },
  { id: 'credit',   name: 'Отсрочка', builtIn: true, values: { service: { type: 'percent', value: 6 }, markup: { type: 'percent', value: 4 }, issue: { type: 'fixed', value: 12 }, exchange: { type: 'fixed', value: 30 }, refund: { type: 'fixed', value: 18 }, supplier: { type: 'fixed', value: 0 } } },
  { id: 'zero',     name: 'Без сборов', builtIn: true, values: { service: { type: 'fixed', value: 0 }, markup: { type: 'fixed', value: 0 }, issue: { type: 'fixed', value: 0 }, exchange: { type: 'fixed', value: 0 }, refund: { type: 'fixed', value: 0 }, supplier: { type: 'fixed', value: 0 } } },
];
function feeTemplate(id) { return FEE_TEMPLATES.find((t) => t.id === id) || FEE_TEMPLATES[0]; }
// Разворачивает шаблон в набор сборов по всем видам услуг.
// Шаблон может задавать сборы либо плоско (values по ключу сбора — общие для всех услуг),
// либо детально по каждой услуге (fees — так хранятся создаваемые/индивидуальные шаблоны).
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
// Регистрирует создаваемый (индивидуальный) шаблон сборов на основе детального набора по услугам.
// Возвращает id нового шаблона; хранится в рантайме на время сессии (ТЗ: «...и создаваемые»).
function registerFeeTemplate(name, feesObj) {
  const id = 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  FEE_TEMPLATES.push({ id, name: name || 'Индивидуальный', builtIn: false, custom: true, fees: JSON.parse(JSON.stringify(feesObj)) });
  return id;
}

// Данные финансовых условий по компаниям
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
// Доступный остаток депозита
function depositAvailable(d) { return d ? d.balance - d.reserved : 0; }
// Доступный остаток кредитного лимита
function creditAvailable(c) { return c ? c.limit - c.debt : 0; }
// Активный договор и доп.соглашение компании (последнее действующее)
function activeContract(fin) { return fin && fin.contracts.find((c) => c.status === 'Действующий'); }
function activeAgreement(fin) {
  const c = activeContract(fin); if (!c) return null;
  const act = c.agreements.filter((a) => a.status === 'Действующий');
  return act.length ? act.reduce((m, a) => (a.version > m.version ? a : m)) : null;
}
// Расчёт одного сбора по базовой стоимости
function feeAmount(fee, base) { if (!fee) return 0; return fee.type === 'percent' ? Math.round(base * (fee.value || 0) / 100) : (fee.value || 0); }
// Сумма всех сборов по виду услуги из доп.соглашения (ТЗ: авторасчёт при создании заказа)
function applyAgreementFees(agreement, serviceType, base) {
  if (!agreement || !agreement.fees[serviceType]) return { fees: {}, total: 0 };
  const set = agreement.fees[serviceType];
  const fees = {}; let total = 0;
  FEE_SCHEMA[serviceType].forEach((f) => { const a = feeAmount(set[f.key], base); fees[f.key] = a; total += a; });
  return { fees, total };
}
// Краткий баланс для строки в списке компаний / дашборде
function companyBalanceShort(fin) {
  if (!fin) return null;
  if (fin.settlement === 'депозит' && fin.deposit) return { kind: 'депозит', label: 'Депозит', value: depositAvailable(fin.deposit), tone: depositAvailable(fin.deposit) > 0 ? 'green' : 'red' };
  if (fin.settlement === 'отсрочка' && fin.credit) return { kind: 'отсрочка', label: 'Задолженность', value: fin.credit.debt, overdue: fin.credit.overdue, tone: fin.credit.overdue > 0 ? 'red' : 'amber' };
  return { kind: 'предоплата', label: 'Предоплата', value: 0, tone: 'gray' };
}

// Финансовая сводка по всем клиентам для дашборда (ТЗ: балансы, пропущенные оплаты по срокам,
// срочные документы для оплат «в дашборде и иных местах»).
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
  // сортировка: сначала критичные (красные), затем по сумме
  urgent.sort((a, b) => (a.tone === b.tone ? Math.abs(b.value) - Math.abs(a.value) : (a.tone === 'red' ? -1 : 1)));
  return { deposits, debt, overdue, overdueCount, urgent };
}

Object.assign(window, {
  SETTLEMENT_TYPES, SETTLEMENT_TONE, FEE_SCHEMA, FEE_SERVICE_TYPES, SERVICE_DESC_DEFAULTS,
  FEE_DESC_DEFAULTS, feeDescsFromDefaults, feeDescOf,
  FEE_TEMPLATES, feeTemplate, feesFromTemplate, registerFeeTemplate, descsFromDefaults, COMPANY_FINANCE, companyFinance,
  depositAvailable, creditAvailable, activeContract, activeAgreement, feeAmount, applyAgreementFees, companyBalanceShort, financeOverview,
  CURRENT_USER, ORDER_STATUS, SERVICE_TYPE, REQUEST_TYPE, SUPPLIER_STATUS,
  FIN_STATUS, DOC_STATUS, DOC_STAGE, DOC_TYPE, ORG_TYPE, CLIENTS, OPERATORS,
  ORDERS, SUPPLIERS, FINANCE, FIN_STATS, DOCUMENTS, CHATS, CHAT_CHANNELS, CHAT_TYPES, CHAT_TYPE_LABEL, CHAT_CHANNEL_TONE, CHAT_THREADS, SVC_DATA,
  CLIENT_STATUS, CLIENTS_DB, COMPANY_STATUS, COMPANIES_DB, COMPANY_STAFF, companyStaff,
  USERS, USER_STATUS, ROLES, PERMISSIONS,
  DASH_STATS, ORDER_BREAKDOWN, RECENT_CHANGES, API_ACCESS, CURRENCIES,
  AIRLINES, AIR_STATUS, CABIN_CLASSES, SPECIAL_PAX_CATEGORIES, SUBSIDIZED_PAX_PROGRAMS, AIRPORTS, FLIGHT_OFFERS, AIR_SERVICES, AIR_STATS,
  AVIA_MARKUPS, aviaMarkupsFor, aviaMarkupResolve, aviaMarkupAmount, isRuAirport, isDomesticRu,
  AVIA_FARE_TIERS, AVIA_FARE_TIERS_BUSINESS, AVIA_BOOKING_CLASSES, AVIA_BAGGAGE_OPTIONS, AVIA_SPECIAL_BAGGAGE, AVIA_MEALS,
  AVIA_INSURANCE_PLANS, AVIA_INSURANCE_INCLUDES, AVIA_COMFORT_GROUPS, AVIA_SEATMAP,
  SERVICE_KIND, SERVICE_STATUS, PAX_DOC_KIND, ORDER_SERVICES, KP_STATUS, KP_STATUS_FLOW, PROPOSALS, ORDER_PARTICIPANTS, ORDER_TASKS,
  GROUP_PAX, ORDER_GROUPS, ORDER_SERVICE_EXTRAS, ORDER_BOOKING_FLOW, AVIA_GROUPS_SEED,
  RAIL_SERVICE_CLASSES, RAIL_WAGONS, RAIL_OCCUPIED,
  ORDER_STAGES, FIN_OP_STATUS, FIN_OPS, DOC_KIND, DOC_STATUS2, DOCS2, FULFILLMENT,
  RETURN_FLOW, RETURN_STATUS, RETURN_TYPE, RETURNS,
  NOTIF_PRIORITY, NOTIF_PRIO_RANK, NOTIF_SOURCE, NOTIFICATIONS, NOTIF_SETTINGS,
  HOTELS, HOTEL_AMENITIES, HOTEL_DISTRICTS, HOTEL_MEALS, HOTEL_EXTRAS, hotelTariffs, hotelRooms,
});
