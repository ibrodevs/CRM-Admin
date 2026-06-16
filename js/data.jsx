// ===== Mock data layer =====

const CURRENT_USER = { name: 'Акимова Айсулуу', role: 'Админ', email: 'akimova@psc-travelhub.kg', phone: '+996 (700) 12-34-56', avatar: 'assets/avatar-aisuluu.png', position: 'Администратор системы', dept: 'Управление', joined: '10.09.2024' };

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

// ---- CHAT THREADS (3-way: client / supplier / internal) ----
const CHAT_CHANNELS = [
  { key: 'client',   label: 'Клиент',     icon: 'user' },
  { key: 'supplier', label: 'Поставщик',  icon: 'suppliers' },
  { key: 'internal', label: 'Внутренние', icon: 'users' },
];

const CHAT_THREADS = [
  { id: 1, order: 51162, name: 'ОсОО "Гранд лимитед"', client: 'Нуралиев Данияр', supplier: 'Air Astana', online: '5 мин назад', unread: { client: 2, supplier: 0, internal: 1 },
    channels: {
      client: [
        { from: 'them', author: 'Нуралиев Данияр', text: 'Добрый день! Когда будет готово КП по Стамбулу?', time: '14:02' },
        { from: 'system', text: 'КП-1042 отправлено клиенту', time: '15:34' },
        { from: 'me', author: 'Даниель', text: 'Здравствуйте! Отправили, посмотрите два варианта в предложении.', time: '15:36', read: true },
        { from: 'them', author: 'Нуралиев Данияр', text: 'Спасибо! Согласовываю вариант A.', time: '15:50' },
      ],
      supplier: [
        { from: 'me', author: 'Даниель', text: 'Прошу подтвердить бронь KC 131/132 на 2 пассажиров.', time: '12:40', read: true },
        { from: 'them', author: 'Air Astana', text: 'Подтверждаем, PNR KC8H2L. Тайм-лимит выписки сегодня 18:00.', time: '12:51' },
        { from: 'them', author: 'Air Astana', text: '', attach: { name: 'Подтверждение брони.pdf', size: '96 КБ' }, time: '12:52' },
      ],
      internal: [
        { from: 'them', author: 'Адилет', text: '@Даниель клиент просит места рядом — учти при выписке.', time: '13:10' },
        { from: 'me', author: 'Даниель', text: 'Принял, выберу 12A и 12B.', time: '13:12', read: true },
        { from: 'system', text: 'Назначен ответственный: Даниель', time: '14:05' },
      ],
    } },
  { id: 2, order: 51170, name: 'ОсОО "Asia Travel"', client: 'Каримов Икрам', supplier: 'Qatar Airways', online: '1 ч назад', unread: { client: 0, supplier: 1, internal: 0 },
    channels: {
      client: [{ from: 'them', author: 'Каримов Икрам', text: 'Подтвердите, пожалуйста, статус заявки на 6 человек.', time: '11:20' }, { from: 'me', author: 'Куба', text: 'В работе, выписываем билеты до 18:00.', time: '11:40', read: true }],
      supplier: [{ from: 'me', author: 'Куба', text: 'Нужна выписка по PNR QR9981, тайм-лимит горит.', time: '16:05', read: true }, { from: 'them', author: 'Qatar Airways', text: 'Принято в обработку, ответим в течение часа.', time: '16:20' }],
      internal: [{ from: 'system', text: 'Тайм-лимит выписки сегодня 18:00', time: '16:00' }],
    } },
  { id: 3, order: 51163, name: 'Аттокуров Эрбол', client: 'Аттокуров Эрбол', supplier: 'Amadeus GDS', online: '2 ч назад', unread: { client: 1, supplier: 0, internal: 0 },
    channels: {
      client: [{ from: 'them', author: 'Аттокуров Эрбол', text: 'Загрузил паспорт, проверьте пожалуйста.', time: '09:10', attach: { name: 'passport.jpg', size: '1.1 МБ' } }],
      supplier: [{ from: 'me', author: 'Даниель', text: 'Запрос на аннуляцию AV-51163, ожидаем расчёт штрафа.', time: '12:10', read: false }],
      internal: [{ from: 'me', author: 'Даниель', text: 'Тариф невозвратный, аннуляция со 100% штрафом.', time: '12:12', read: true }],
    } },
  { id: 4, order: 51156, name: 'Сагынбеков Икрам', client: 'Сагынбеков Икрам', supplier: 'Coral Travel', online: 'вчера', unread: { client: 0, supplier: 0, internal: 0 },
    channels: {
      client: [{ from: 'me', author: 'Кими', text: 'Тур «Анталия All Inclusive» забронирован, ожидаем предоплату.', time: 'Вчера', read: true }],
      supplier: [{ from: 'them', author: 'Coral Travel', text: 'Блок мест держим до 17.06.', time: 'Вчера' }],
      internal: [],
    } },
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

const CABIN_CLASSES = ['Эконом', 'Комфорт', 'Бизнес', 'Первый'];

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
    out: { from: 'FRU', to: 'IST', dep: '23:10', arr: '08:55', date: '24 июн', dur: '8ч 45м', stops: 1, stopText: '1 пересадка · SVO 2ч 10м', flightNo: 'SU 1879' },
    back:{ from: 'IST', to: 'FRU', dep: '12:30', arr: '23:40', date: '01 июл', dur: '9ч 10м', stops: 1, stopText: '1 пересадка · SVO 1ч 50м', flightNo: 'SU 1880' },
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
    out: { from: 'FRU', to: 'IST', dep: '08:20', arr: '14:10', date: '24 июн', dur: '7ч 50м', stops: 1, stopText: '1 пересадка · DXB 1ч 40м', flightNo: 'EK 2501' },
    back:{ from: 'IST', to: 'FRU', dep: '16:40', arr: '06:25', date: '02 июл', dur: '11ч 45м', stops: 1, stopText: '1 пересадка · DXB 3ч 05м', flightNo: 'EK 2502' },
    fare: 1340, fee: 45, currency: 'USD',
  },
  {
    id: 'OF-6', airline: 'QR', supplier: 'Qatar (API)', refundable: true, baggage: '2×23 кг', cabin: 'Эконом',
    fareName: 'Classic', seatsLeft: 8,
    out: { from: 'FRU', to: 'IST', dep: '02:55', arr: '13:20', date: '24 июн', dur: '9ч 25м', stops: 1, stopText: '1 пересадка · DOH 2ч 30м', flightNo: 'QR 389' },
    back:{ from: 'IST', to: 'FRU', dep: '09:15', arr: '22:05', date: '01 июл', dur: '10ч 50м', stops: 1, stopText: '1 пересадка · DOH 3ч 15м', flightNo: 'QR 390' },
    fare: 505, fee: 24, currency: 'USD',
  },
];

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
    features: [
      { ok: true,  text: 'Ручная кладь 10 кг' },
      { ok: false, text: 'Багаж не включён' },
      { ok: false, text: 'Невозвратный' },
      { ok: false, text: 'Платный выбор места' },
    ] },
  { id: 'optimum', name: 'Эконом Оптимум', delta: 1900, recommended: true,
    features: [
      { ok: true,  text: 'Ручная кладь 10 кг' },
      { ok: true,  text: 'Багаж 1 место 23 кг' },
      { ok: true,  text: 'Возврат со штрафом' },
      { ok: true,  text: 'Выбор места включён' },
    ] },
  { id: 'max', name: 'Эконом Максимум', delta: 4300, recommended: false,
    features: [
      { ok: true,  text: 'Ручная кладь 10 кг' },
      { ok: true,  text: 'Багаж 2 места 23 кг' },
      { ok: true,  text: 'Свободный возврат' },
      { ok: true,  text: 'Выбор места + питание' },
    ] },
];

// Baggage options per passenger (step 4 → Багаж)
const AVIA_BAGGAGE_OPTIONS = [
  { id: 'none', label: 'Без багажа',     price: 0 },
  { id: 'b23',  label: '1 место · 23 кг', price: 1800 },
  { id: 'b23x2',label: '2 места · 23 кг', price: 3300 },
  { id: 'b32',  label: '1 место · 32 кг', price: 2600 },
];
const AVIA_SPECIAL_BAGGAGE = [
  { id: 'bike',  label: 'Велосипед',             icon: 'route',     from: 3500 },
  { id: 'ski',   label: 'Лыжи / сноуборд',       icon: 'zap',       from: 3000 },
  { id: 'music', label: 'Музыкальный инструмент', icon: 'template',  from: 2500 },
  { id: 'sport', label: 'Спортивный инвентарь',   icon: 'briefcase', from: 2800 },
  { id: 'animal',label: 'Животное в салоне',      icon: 'paperclip', from: 5000 },
];

// Meals per passenger (step 4 → Питание)
const AVIA_MEALS = [
  { id: 'standard', label: 'Стандартное питание',  price: 0,    note: 'Включено в тариф' },
  { id: 'light',    label: 'Лёгкое питание',       price: 600 },
  { id: 'kids',     label: 'Детское питание',      price: 600 },
  { id: 'veg',      label: 'Вегетарианское',       price: 800 },
  { id: 'none',     label: 'Без питания',          price: 0 },
];

// Insurance plans per passenger (step 4 → Страхование)
const AVIA_INSURANCE_PLANS = [
  { id: 'none',    label: 'Без страховки', price: 0,    cover: '—' },
  { id: 'basic',   label: 'Базовая',       price: 600,  cover: 'Медрасходы до 30 000 $' },
  { id: 'standard',label: 'Стандарт',      price: 900,  cover: 'Медрасходы до 50 000 $ · багаж' },
  { id: 'premium', label: 'Премиум',       price: 1400, cover: 'Медрасходы до 100 000 $ · отмена · багаж' },
];
const AVIA_INSURANCE_INCLUDES = [
  { icon: 'plus',  title: 'Медицинские расходы' },
  { icon: 'luggage', title: 'Потеря багажа' },
  { icon: 'calendar', title: 'Отмена поездки' },
  { icon: 'clock', title: 'Задержка рейса' },
];

// Comfort & service add-ons (step 4 → Комфорт и сервис), grouped
const AVIA_COMFORT_GROUPS = [
  { group: 'Комфорт в перелёте', items: [
    { id: 'fasttrack', label: 'Fast Track в аэропорту', sub: 'Ускоренное прохождение контроля', price: 2200 },
    { id: 'lounge',    label: 'Бизнес-зал',             sub: 'Доступ в зал ожидания', price: 3500 },
    { id: 'priority',  label: 'Приоритетная посадка',   sub: 'Посадка вне очереди', price: 1200 },
    { id: 'vip',       label: 'VIP-сопровождение',      sub: 'Персональный ассистент', price: 6000 },
  ] },
  { group: 'Связь и развлечения', items: [
    { id: 'wifi',  label: 'Wi-Fi на борту',     sub: 'Интернет в течение всего полёта', price: 900 },
    { id: 'power', label: 'Розетка у кресла',   sub: 'Гарантированное питание устройств', price: 400 },
    { id: 'media', label: 'Мультимедиа премиум', sub: 'Расширенный пакет контента', price: 600 },
  ] },
  { group: 'Дополнительный сервис', items: [
    { id: 'meetgreet', label: 'Встреча с табличкой', sub: 'В аэропорту прилёта', price: 2500 },
    { id: 'transferb', label: 'Трансфер до отеля',   sub: 'Индивидуальный автомобиль', price: 3200 },
    { id: 'sim',       label: 'Туристическая SIM',    sub: 'Интернет в стране назначения', price: 800 },
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
  'Забронировано': 'blue', 'Подтверждено': 'blue', 'Выписано': 'green',
  'Возврат': 'red', 'Отменено': 'red',
};

const ORDER_SERVICES = [
  { id: 'S1', kind: 'Авиа',      title: 'FRU → IST → FRU',       sub: 'Air Astana · KC 131/132 · 2 пасс.', status: 'Выписано',      sum: 1720, currency: 'USD', date: '24.06 – 01.07', avia: 'AV-51162', supplier: 'Air Astana (API)' },
  { id: 'S2', kind: 'Гостиница', title: 'Hilton Istanbul · 4★',  sub: 'Standard Double · 7 ночей · BB',     status: 'Забронировано', sum: 980,  currency: 'USD', date: '24.06 – 01.07', supplier: 'Booking B2B' },
  { id: 'S3', kind: 'Трансфер',  title: 'IST → Hilton Istanbul', sub: 'Минивэн · 2 чел · встреча с табличкой', status: 'Подтверждено', sum: 60,  currency: 'USD', date: '24.06', supplier: 'Karimov Transfer' },
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
];

const ORDER_PARTICIPANTS = [
  { name: 'Нуралиев Данияр',  role: 'Взрослый', doc: 'ID AC1234567', dob: '14.03.1990', phone: '+996 700 123 456', lead: true },
  { name: 'Нуралиева Айгерим', role: 'Взрослый', doc: 'ID AC7654321', dob: '02.08.1992', phone: '+996 700 765 432' },
  { name: 'Нуралиев Эмир',    role: 'Ребёнок',  doc: 'ID AC9911223', dob: '11.05.2017', phone: '—' },
];

// ============ GROUP TRAVEL (4a — групповое бронирование) ============
// Larger passenger roster used when an order is marked as a group trip.
const GROUP_PAX = [
  { name: 'Нуралиев Данияр',     role: 'Взрослый', doc: 'ID AC1234567' },
  { name: 'Каримов Икрам',       role: 'Взрослый', doc: 'ID AC7766554' },
  { name: 'Сагынбеков Бекзат',   role: 'Взрослый', doc: 'ID AC4455667' },
  { name: 'Аттокуров Эрбол',     role: 'Взрослый', doc: 'ID AC9911223' },
  { name: 'Жумабекова Назгуль',  role: 'Взрослый', doc: 'ID AC8877665' },
  { name: 'Осмонова Айпери',     role: 'Взрослый', doc: 'ID AC5512347' },
  { name: 'Мамытов Тилек',       role: 'Взрослый', doc: 'ID AC6623481' },
  { name: 'Бакиров Адилет',      role: 'Взрослый', doc: 'ID AC7734512' },
  { name: 'Эргешов Нурлан',      role: 'Взрослый', doc: 'ID AC8845623' },
  { name: 'Кадырова Жанара',     role: 'Взрослый', doc: 'ID AC9956734' },
  { name: 'Турдубаева Айгуль',   role: 'Взрослый', doc: 'ID AC1167845' },
  { name: 'Сыдыков Эмир',        role: 'Взрослый', doc: 'ID AC2278956' },
  { name: 'Абдыкеримов Руслан',  role: 'Взрослый', doc: 'ID AC3389067' },
  { name: 'Исаева Динара',       role: 'Взрослый', doc: 'ID AC4490178' },
  { name: 'Бейшеналиев Канат',   role: 'Взрослый', doc: 'ID AC5501289' },
  { name: 'Орозова Бермет',      role: 'Взрослый', doc: 'ID AC6612390' },
  { name: 'Жээнбеков Алмаз',     role: 'Взрослый', doc: 'ID AC7723401' },
  { name: 'Касымова Чолпон',     role: 'Ребёнок',  doc: 'ID AC8834512' },
  { name: 'Маматов Темир',       role: 'Ребёнок',  doc: 'ID AC9945623' },
  { name: 'Алиева Асель',        role: 'Взрослый', doc: 'ID AC1056734' },
];
// member indices reference GROUP_PAX positions; fare references AVIA_FARE_TIERS ids
const AVIA_GROUPS_SEED = [
  { id: 'g1', name: 'Руководство', desc: 'Топ-менеджмент, бизнес-класс', fare: 'max',     members: [0, 1, 2, 3] },
  { id: 'g2', name: 'Менеджеры',   desc: 'Линейные руководители',        fare: 'optimum', members: [4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'g3', name: 'Сопровождение', desc: 'Поддержка и логистика',       fare: 'light',   members: [12, 13, 14, 15, 16, 17, 18, 19] },
];

const ORDER_TASKS = [
  { text: 'Выписать билет — тайм-лимит', due: 'сегодня 18:00', urgent: true },
  { text: 'Получить оплату от клиента', due: 'завтра', urgent: false },
  { text: 'Загрузить ваучер отеля', due: '16.06', urgent: false },
];

// ============ FINANCE CONTOUR + DOCUMENTS (Оформление и сопровождение) ============

const ORDER_STAGES = ['Создан', 'Согласован', 'Оформляется', 'Оплачен', 'Документы выданы', 'Завершён'];

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
const DOC_STATUS2 = { 'Черновик': 'gray', 'Сформирован': 'teal', 'На подписи': 'amber', 'Подписан': 'green', 'Аннулирован': 'red' };

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
    offers: [
      { id: 'R1', title: 'Поезд 027Щ «Киргизия»', sub: 'Бишкек → Москва', info: [{ l: 'Отправление', v: '22:40 · 24.06' }, { l: 'Прибытие', v: '10:15 · 27.06' }, { l: 'В пути', v: '2 д 11 ч' }], tags: ['Купе', 'Постель включена'], supplier: 'КЖД (API)', cost: 120, fee: 8 },
      { id: 'R2', title: 'Поезд 305Ф', sub: 'Бишкек → Москва', info: [{ l: 'Отправление', v: '14:10 · 24.06' }, { l: 'Прибытие', v: '06:40 · 27.06' }, { l: 'В пути', v: '2 д 16 ч' }], tags: ['Плацкарт', 'Без пересадок'], supplier: 'РЖД (GDS)', cost: 86, fee: 6 },
      { id: 'R3', title: 'Поезд 008Ц', sub: 'Бишкек → Москва', info: [{ l: 'Отправление', v: '09:20 · 25.06' }, { l: 'Прибытие', v: '23:55 · 27.06' }, { l: 'В пути', v: '2 д 14 ч' }], tags: ['СВ', '2-местное купе'], supplier: 'РЖД (GDS)', cost: 240, fee: 14 },
    ],
    registry: [
      { no: 'RW-51201', order: 51162, main: 'Бишкек → Москва', sub: 'Поезд 027Щ · Купе', date: '24.06.26', qty: 2, status: 'Забронировано', sum: 256 },
      { no: 'RW-51188', order: 51156, main: 'Бишкек → Алматы', sub: 'Поезд 011 · Плацкарт', date: '26.06.26', qty: 4, status: 'Выписано', sum: 184 },
      { no: 'RW-51177', order: 51170, main: 'Москва → СПб', sub: 'Сапсан 758А · Эконом', date: '02.07.26', qty: 6, status: 'Поиск', sum: 0 },
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
const COMPANIES_DB = [
  { id: 'CO-2001', name: 'ОсОО "Гранд лимитед"', type: 'Туроператор', status: 'Действующий', inn: '07070707070707', okpo: '8362411', dir: 'Нуралиев Данияр', phone: '+996 777 777 777', email: 'grandlimited@mail.ru', addr: 'Бишкек, ул. Токтогула 125/1', bank: 'Демир Банк', account: '1240020000123456', contract: '№ 2024-118 от 09.09.24', orders: 12, turnover: 86400, contacts: 3, vat: '12%' },
  { id: 'CO-2002', name: 'ОсОО "Asia Travel"', type: 'Турагент', status: 'Действующий', inn: '02208200512345', okpo: '2291055', dir: 'Каримов Икрам', phone: '+996 312 555 444', email: 'office@asia.kg', addr: 'Ош, ул. Курманжан Датка 12', bank: 'Оптима Банк', account: '1090000111223344', contract: '№ 2025-014 от 14.01.25', orders: 7, turnover: 54200, contacts: 2, vat: '12%' },
  { id: 'CO-2003', name: 'ИП Сагынбеков', type: 'Корпоративный клиент', status: 'На паузе', inn: '20312198800321', okpo: '—', dir: 'Сагынбеков Икрам', phone: '+996 770 444 555', email: 'sagyn@mail.ru', addr: 'Бишкек, ул. Чуй 200', bank: 'РСК Банк', account: '1180000999888777', contract: '№ 2025-033 от 20.03.25', orders: 3, turnover: 12800, contacts: 1, vat: 'без НДС' },
  { id: 'CO-2004', name: 'Best Travel Inc', type: 'Партнёр', status: 'Действующий', inn: '00000000000000', okpo: '—', dir: 'Greg James', phone: '+1 202 555 0114', email: 'partner@besttravel.com', addr: 'Dubai, Sheikh Zayed Rd', bank: 'Emirates NBD', account: 'AE12 0000 1111', contract: '№ INT-2025-7 от 02.02.25', orders: 5, turnover: 41000, contacts: 2, vat: '—' },
  { id: 'CO-2005', name: 'ИП Мамажанов', type: 'Корпоративный клиент', status: 'Архив', inn: '21807199100123', okpo: '—', dir: 'Мамажанов Абдутаир', phone: '+996 555 111 000', email: 'mamajanov@mail.ru', addr: 'Джалал-Абад, ул. Ленина 5', bank: 'Айыл Банк', account: '1230000222333444', contract: '№ 2024-101 от 11.11.24', orders: 2, turnover: 3200, contacts: 1, vat: 'без НДС' },
];

Object.assign(window, {
  CURRENT_USER, ORDER_STATUS, SERVICE_TYPE, REQUEST_TYPE, SUPPLIER_STATUS,
  FIN_STATUS, DOC_STATUS, DOC_STAGE, DOC_TYPE, ORG_TYPE, CLIENTS, OPERATORS,
  ORDERS, SUPPLIERS, FINANCE, FIN_STATS, DOCUMENTS, CHATS, CHAT_CHANNELS, CHAT_THREADS, SVC_DATA,
  CLIENT_STATUS, CLIENTS_DB, COMPANY_STATUS, COMPANIES_DB,
  USERS, USER_STATUS, ROLES, PERMISSIONS,
  DASH_STATS, ORDER_BREAKDOWN, RECENT_CHANGES, API_ACCESS, CURRENCIES,
  AIRLINES, AIR_STATUS, CABIN_CLASSES, AIRPORTS, FLIGHT_OFFERS, AIR_SERVICES, AIR_STATS,
  AVIA_FARE_TIERS, AVIA_BAGGAGE_OPTIONS, AVIA_SPECIAL_BAGGAGE, AVIA_MEALS,
  AVIA_INSURANCE_PLANS, AVIA_INSURANCE_INCLUDES, AVIA_COMFORT_GROUPS, AVIA_SEATMAP,
  SERVICE_KIND, SERVICE_STATUS, ORDER_SERVICES, KP_STATUS, KP_STATUS_FLOW, PROPOSALS, ORDER_PARTICIPANTS, ORDER_TASKS,
  GROUP_PAX, AVIA_GROUPS_SEED,
  ORDER_STAGES, FIN_OP_STATUS, FIN_OPS, DOC_KIND, DOC_STATUS2, DOCS2, FULFILLMENT,
  RETURN_FLOW, RETURN_STATUS, RETURN_TYPE, RETURNS,
  NOTIF_PRIORITY, NOTIF_PRIO_RANK, NOTIF_SOURCE, NOTIFICATIONS, NOTIF_SETTINGS,
});
