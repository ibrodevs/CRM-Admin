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

Object.assign(window, {
  CURRENT_USER, ORDER_STATUS, SERVICE_TYPE, REQUEST_TYPE, SUPPLIER_STATUS,
  FIN_STATUS, DOC_STATUS, DOC_STAGE, DOC_TYPE, ORG_TYPE, CLIENTS, OPERATORS,
  ORDERS, SUPPLIERS, FINANCE, FIN_STATS, DOCUMENTS, CHATS,
  DASH_STATS, ORDER_BREAKDOWN, RECENT_CHANGES, API_ACCESS, CURRENCIES,
});
