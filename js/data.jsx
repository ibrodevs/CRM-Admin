import {
  SVC_DATA,
  HOTEL_AMENITIES,
  hotelTariffs,
  hotelRooms,
  HOTELS,
  HOTEL_DISTRICTS,
  HOTEL_MEALS,
  HOTEL_EXTRAS,
} from './data/services';
import {
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
} from './data/company-finance';

import {
  AIRLINES,
  AIR_STATUS,
  isRuAirport,
  isDomesticRu,
  AVIA_MARKUPS,
  aviaMarkupsFor,
  aviaMarkupResolve,
  aviaMarkupAmount,
  CABIN_CLASSES,
  SPECIAL_PAX_CATEGORIES,
  SUBSIDIZED_PAX_PROGRAMS,
  AIRPORTS,
  FLIGHT_OFFERS,
  AVIA_COMPLEX_ROUTE,
  AIR_SERVICES,
  AIR_STATS,
  AVIA_FARE_TIERS,
  AVIA_FARE_TIERS_BUSINESS,
  AVIA_BOOKING_CLASSES,
  AVIA_BAGGAGE_OPTIONS,
  AVIA_SPECIAL_BAGGAGE,
  AVIA_MEALS,
  AVIA_INSURANCE_PLANS,
  AVIA_INSURANCE_INCLUDES,
  AVIA_COMFORT_GROUPS,
  AVIA_SEATMAP,
} from './data/avia';
import {
  CHATS,
  CHAT_TYPES,
  CHAT_TYPE_LABEL,
  CHAT_CHANNEL_TONE,
  CHAT_CHANNELS,
  CHAT_THREADS,
} from './data/chats';
import {
  NOTIF_PRIORITY,
  NOTIF_PRIO_RANK,
  NOTIF_SOURCE,
  NOTIFICATIONS,
  INTEGRATION_ERROR_CODES,
  ERR_SEVERITY,
  ERR_SYSTEMS,
  ERR_CATEGORIES,
  NOTIF_SETTINGS,
} from './data/notifications';



const CURRENT_USER = {
  name: 'Акимова Айсулуу', role: 'Админ', email: 'akimova@psc-travelhub.kg', phone: '+996 (700) 12-34-56',
  avatar: 'assets/avatar-aisuluu.png', position: 'Администратор системы', dept: 'Управление', joined: '10.09.2024',

  manager: '—', workEmail: 'akimova@psc-travelhub.kg', workPhone: '+996 (700) 12-34-56', internalPhone: '101',
  telegram: '@akimova_psc', hired: '10.09.2024', workStatus: 'Работает', presence: 'Онлайн',
  tz: '(GMT+6) Бишкек', lang: 'Русский', lastLogin: 'Сегодня, 09:14', slaResponseMin: 15,
};


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

    createdOn: new Date(2026, 5, 25 - i * 2, 9 + (i % 8)),
  })).map((o, i) => ({ ...o, no: [51162, 51163, 51172, 51154, 51155, 51156, 51172, 51163, 51172, 51154, 51168, 51170, 51171, 51180][i] }));
})();


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




const SERVICE_KIND = {
  'Авиа':      { icon: 'plane',    color: '#2566ff', tone: 'blue' },
  'ЖД':        { icon: 'train',    color: '#2f88aa', tone: 'teal' },
  'Гостиница': { icon: 'building', color: '#1f9d57', tone: 'green' },
  'Трансфер':  { icon: 'car',      color: '#c47e22', tone: 'amber' },
  'Автобус':   { icon: 'bus',      color: '#6c7686', tone: 'gray' },
  'Группа':    { icon: 'users',    color: '#5a5af0', tone: 'blue' },
  'Аэроэкспресс': { icon: 'zap',   color: '#d21b3c', tone: 'red', img: 'assets/Aeroexpress_logo.svg.png' },
  'Бизнес-зал': { icon: 'lounge', color: '#7c5cff', tone: 'blue' },
};
const SERVICE_STATUS = {
  'Поиск': 'gray', 'Предложение': 'teal', 'Согласование': 'amber',
  'Забронировано': 'blue', 'Подтверждено': 'green', 'Выписано': 'green',
  'Возврат': 'red', 'Отменено': 'red',
};


const PAX_DOC_KIND = {
  'Загранпаспорт':            { icon: 'passport',  color: '#8b2942' },
  'Паспорт РФ':                { icon: 'passport',  color: '#1d2f6f' },
  'Свидетельство о рождении':  { icon: 'birthCert', color: '#1f9d57' },
  'Виза':                      { icon: 'visa',      color: '#2f88aa' },
};

const ORDER_SERVICES = [
  { id: 'S1', kind: 'Авиа',      title: 'FRU → IST → FRU',       sub: 'Air Astana · KC 131/132 · 2 пасс.', status: 'Выписано',      sum: 1720, currency: 'USD', date: '24.06 – 01.07', avia: 'AV-51162', supplier: 'Air Astana (API)', pax: 2,
    calc: { tariff: 1280, taxes: 216, fee: 80, commission: 144, total: 1720 },

    details: { 'Авиа': {
      route: 'FRU → IST → FRU', depAirport: 'Бишкек (FRU), Манас', arrAirport: 'Стамбул (IST), Новый аэропорт',
      terminalDep: '—', terminalArr: 'Терминал 1', airline: 'Air Astana', flightNo: 'KC 131 / KC 132', aircraft: 'Airbus A321neo',
      depDate: '24.06', depTime: '07:30', arrDate: '24.06', arrTime: '11:15', duration: '4 ч 45 мин', stops: 'Прямой', layover: '',
      cabin: 'Эконом', bookingClass: 'Q', fare: 'Economy Basic', handLuggage: '1 × 8 кг', baggage: '2 × 23 кг', meal: 'Горячее питание',
      refund: 'Возврат со сбором 60 $', exchange: 'Обмен со сбором 40 $', extras: 'Выбор места, страховка ВЗР', confirmBy: 'сегодня 18:00',
      delay: { planned: '24.06 · 07:30', newTime: '24.06 · 10:10', duration: '2 ч 40 мин', reason: 'Позднее прибытие борта', status: 'Задержан', connections: 'Трансфер IST', risk: 'Низкий — трансфер уведомлён' },
    } } },
  { id: 'S2', kind: 'Гостиница', title: 'Hilton Istanbul · 4★',  sub: 'Standard Double · 7 ночей · BB',     status: 'Забронировано', sum: 980,  currency: 'USD', date: '24.06 – 01.07', supplier: 'Booking B2B', pax: 2,
    calc: { tariff: 910, taxes: 0, fee: 40, commission: 30, total: 980 },

    details: { 'Гостиница': {
      name: 'Hilton Istanbul Bosphorus', category: '4★', address: 'Cumhuriyet Cd. 50, Şişli, Стамбул', location: '1.2 км от центра, 0.3 км от метро',
      checkIn: '24.06', checkOut: '01.07', nights: '7', roomCategory: 'Standard', roomType: 'Double', bed: '2 раздельные кровати',
      occupancy: '2 взрослых', board: 'Завтрак «шведский стол» (BB)', checkInTime: '14:00', checkOutTime: '12:00',
      cancel: 'Бесплатная отмена до 20.06, далее удержание 1 ночи', extras: 'Wi-Fi, бассейн, фитнес', confirmBy: '20.06',
    } } },
  { id: 'S3', kind: 'Трансфер',  title: 'IST → Hilton Istanbul', sub: 'Минивэн · 2 чел · встреча с табличкой', status: 'Подтверждено', sum: 60,  currency: 'USD', date: '24.06', supplier: 'Karimov Transfer', pax: 2,
    calc: { tariff: 48, taxes: 0, fee: 6, commission: 6, total: 60 },

    details: { 'Трансфер': {
      pickup: 'Аэропорт Стамбул (IST), зона прилёта', dropoff: 'Hilton Istanbul Bosphorus', date: '24.06', time: '09:30',
      linkedFlight: 'KC 131 (прилёт 11:15)', meetPoint: 'Выход A, стойка встречи', sign: '«Гранд лимитед»', waitTime: '60 мин бесплатно',
      carType: 'Mercedes-Benz Vito', carClass: 'Комфорт (минивэн)', capacity: 'до 6 пассажиров', baggage: '6 мест', carNumber: '34 ABC 34',
      driver: 'Karimov A.', driverPhone: '+90 5xx xxx xx xx', extra: 'Детское кресло по запросу',
    } } },
  { id: 'S4', kind: 'ЖД', title: 'Москва → Санкт-Петербург', sub: '«Сапсан» 754А · купе · 2 пасс.', status: 'Забронировано', sum: 12800, currency: 'RUB', date: '26.06', supplier: 'РЖД (API)', pax: 2,
    calc: { tariff: 11800, taxes: 0, fee: 600, commission: 400, total: 12800 },

    details: { 'ЖД': {
      route: 'Москва → Санкт-Петербург', depStation: 'Москва, Ленинградский вокзал', arrStation: 'Санкт-Петербург, Московский вокзал',
      depDate: '26.06', depTime: '13:30', arrDate: '26.06', arrTime: '17:35', trainNo: '754А «Сапсан»', carrier: 'РЖД', trainType: 'Скоростной',
      cabin: 'Купе', wagon: '№ 5', wagonType: 'Купейный', seat: 'Места 12, 14', meal: 'Включено', bedding: 'Не требуется', extras: 'Розетки, Wi-Fi',
      refund: 'Возврат со сбором РЖД', confirmBy: '25.06',
      delay: { planned: '26.06 · 13:30', newTime: '26.06 · 14:05', duration: '35 мин', reason: 'Технические работы на путях', status: 'Задержан', connections: '—', risk: 'Нет' },
    } } },
];



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

const AVIA_GROUPS_SEED = [
  { id: 'g1', name: 'Руководство', desc: 'Топ-менеджмент, бизнес-класс', fare: 'max',     members: [0, 1, 2, 3] },
  { id: 'g2', name: 'Менеджеры',   desc: 'Линейные руководители',        fare: 'optimum', members: [4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'g3', name: 'Сопровождение', desc: 'Поддержка и логистика',       fare: 'light',   members: [12, 13, 14, 15, 16, 17, 18, 19] },
];




const RAIL_SERVICE_CLASSES = [
  { id: 'kupe',  name: 'Купе',     type: 'Купейный',    icon: 'idcard',   priceRub: 4560,  freeSeats: 54,  seats: 36, perComp: 4, kinds: ['low', 'up'],   amenities: ['Кондиционер', 'Биотуалет', 'Розетка 220V', 'Индивидуальное освещение'] },
  { id: 'platz', name: 'Плацкарт', type: 'Плацкартный', icon: 'briefcase', priceRub: 2980, freeSeats: 102, seats: 54, perComp: 4, kinds: ['low', 'up'],   amenities: ['Кондиционер', 'Биотуалет', 'Розетка 220V'] },
  { id: 'sv',    name: 'СВ',       type: 'СВ',          icon: 'star',     priceRub: 8950,  freeSeats: 18,  seats: 18, perComp: 2, kinds: ['low'],          amenities: ['Кондиционер', 'Биотуалет', 'Розетка 220V', 'Душ'] },
  { id: 'lux',   name: 'Люкс',     type: 'Люкс',        icon: 'star',     priceRub: 15800, freeSeats: 6,   seats: 8,  perComp: 2, kinds: ['low'],          amenities: ['Кондиционер', 'Душ', 'ТВ', 'Питание включено'] },
  { id: 'sit',   name: 'Сидячий',  type: 'Сидячий',     icon: 'users',    priceRub: 1860,  freeSeats: 74,  seats: 60, perComp: 0, kinds: ['win', 'aisle'], amenities: ['Кондиционер', 'Wi-Fi', 'Розетка 220V'] },
];

const RAIL_WAGONS = {
  kupe:  [{ no: '02', seatsLeft: 14 }, { no: '03', seatsLeft: 6 }, { no: '04', seatsLeft: 22 }, { no: '05', seatsLeft: 8 }, { no: '06', seatsLeft: 31 }, { no: '07', seatsLeft: 12 }, { no: '08', seatsLeft: 4 }, { no: '09', seatsLeft: 19 }, { no: '10', seatsLeft: 27 }, { no: '11', seatsLeft: 9 }, { no: '12', seatsLeft: 15 }, { no: '13', seatsLeft: 3 }],
  platz: [{ no: '01', seatsLeft: 28 }, { no: '02', seatsLeft: 41 }, { no: '03', seatsLeft: 12 }, { no: '04', seatsLeft: 7 }],
  sv:    [{ no: '01', seatsLeft: 6 }, { no: '02', seatsLeft: 2 }, { no: '03', seatsLeft: 10 }],
  lux:   [{ no: '01', seatsLeft: 4 }, { no: '02', seatsLeft: 2 }],
  sit:   [{ no: '01', seatsLeft: 22 }, { no: '02', seatsLeft: 38 }, { no: '03', seatsLeft: 14 }],
};

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



const ORDER_STAGES = ['Создан', 'Подбор услуг', 'Бронирование', 'Выписка', 'Документы', 'Завершён'];

const FIN_OP_STATUS = { 'Ожидает оплаты': 'amber', 'Частично оплачено': 'blue', 'Оплачено': 'green', 'Возврат': 'teal', 'Закрыто': 'gray' };


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
  { no: 'D-3140', name: 'Маршрут-квитанция TK 341 · Нуралиев Д.', type: 'Маршрутная квитанция', order: 51172, participant: 'Нуралиев Данияр', service: 'Авиа · TK 341', finOp: '—', status: 'Сформирован', version: 1, origin: 'supplier', date: '15.06.2026', size: '206 КБ',
    versions: [{ v: 1, date: '15.06 · 10:12', who: 'Turkish Airlines', note: 'Получен от поставщика' }], history: [{ t: '15.06 · 10:12', text: 'Получен бланк от поставщика', who: 'Система' }] },
  { no: 'D-3141', name: 'Маршрут-квитанция TK 341 · Нуралиев Д. · клиентская', type: 'Маршрутная квитанция', order: 51172, participant: 'Нуралиев Данияр', service: 'Авиа · TK 341', finOp: '—', status: 'Сформирован', version: 2, origin: 'corrected', date: '15.06.2026', size: '214 КБ',
    versions: [{ v: 1, date: '15.06 · 10:12', who: 'Turkish Airlines', note: 'Получен от поставщика' }, { v: 2, date: '15.06 · 10:40', who: 'Даниель', note: 'Скорректированный бланк для клиента' }], history: [{ t: '15.06 · 10:12', text: 'Получен бланк от поставщика', who: 'Система' }, { t: '15.06 · 10:40', text: 'Создана скорректированная версия', who: 'Даниель' }] },
  { no: 'D-3142', name: 'Электронный билет · Нуралиева А.', type: 'Билет', order: 51172, participant: 'Нуралиева Айгерим', service: 'Авиа · TK 341', finOp: '—', status: 'Подписан', version: 1, origin: 'supplier', date: '15.06.2026', size: '176 КБ',
    versions: [{ v: 1, date: '15.06 · 10:16', who: 'Turkish Airlines', note: 'Выписка от поставщика' }], history: [{ t: '15.06 · 10:16', text: 'Билет получен от поставщика', who: 'Система' }] },
  { no: 'D-3143', name: 'Посадочный талон · Нуралиева А. · клиентский', type: 'Билет', order: 51172, participant: 'Нуралиева Айгерим', service: 'Авиа · TK 341', finOp: '—', status: 'Сформирован', version: 2, origin: 'corrected', date: '15.06.2026', size: '132 КБ',
    versions: [{ v: 1, date: '15.06 · 10:16', who: 'Turkish Airlines', note: 'Получен от поставщика' }, { v: 2, date: '15.06 · 10:48', who: 'Даниель', note: 'Скорректированный бланк для клиента' }], history: [{ t: '15.06 · 10:16', text: 'Получен бланк от поставщика', who: 'Система' }, { t: '15.06 · 10:48', text: 'Создана клиентская версия', who: 'Даниель' }] },
  { no: 'D-3144', name: 'Паспорт · Нуралиев Эмир', type: 'Паспорт', order: 51172, participant: 'Нуралиев Эмир', service: '—', finOp: '—', status: 'На подписи', version: 1, origin: 'client', date: '14.06.2026', size: '0.8 МБ',
    versions: [{ v: 1, date: '14.06 · 18:20', who: 'Клиент', note: 'Скан загружен клиентом' }], history: [{ t: '14.06 · 18:20', text: 'Загружен скан документа', who: 'Клиент' }] },
];


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

const PERMISSIONS = [
  { group: 'Заказы', items: [{ k: 'Просмотр заказов', r: [1, 1, 1, 1] }, { k: 'Создание и редактирование', r: [1, 1, 0, 1] }, { k: 'Удаление заказов', r: [1, 0, 0, 0] }] },
  { group: 'Услуги и КП', items: [{ k: 'Поиск и бронирование услуг', r: [1, 1, 0, 1] }, { k: 'Коммерческие предложения', r: [1, 1, 0, 1] }] },
  { group: 'Финансы', items: [{ k: 'Просмотр финансов', r: [1, 1, 1, 1] }, { k: 'Проведение оплат', r: [1, 0, 1, 0] }, { k: 'Возвраты и штрафы', r: [1, 0, 1, 0] }] },
  { group: 'Документы', items: [{ k: 'Просмотр документов', r: [1, 1, 1, 1] }, { k: 'Загрузка и подпись', r: [1, 1, 1, 1] }] },
  { group: 'Администрирование', items: [{ k: 'Пользователи и роли', r: [1, 0, 0, 0] }, { k: 'Настройки системы', r: [1, 0, 0, 0] }, { k: 'API и интеграции', r: [1, 0, 0, 0] }] },
];


const CLIENT_STATUS = { 'Активный': 'green', 'VIP': 'blue', 'Новый': 'teal', 'Неактивный': 'gray' };
const CLIENTS_DB = [
  { id: 'CL-1042', name: 'Нуралиев Данияр', type: 'Физлицо', status: 'VIP', company: 'ОсОО "Гранд лимитед"', phone: '+996 700 123 456', email: 'd.nuraliev@mail.ru', city: 'Бишкек', since: '09.09.2024', orders: 12, spent: 18400, debt: 1100, doc: 'ID AC1234567', dob: '14.03.1990' },
  { id: 'CL-1039', name: 'Каримов Икрам', type: 'Физлицо', status: 'Активный', company: 'ОсОО "Asia Travel"', phone: '+996 555 987 654', email: 'karimov@asia.kg', city: 'Ош', since: '14.01.2025', orders: 7, spent: 9200, debt: 0, doc: 'ID AC7766554', dob: '22.07.1985' },
  { id: 'CL-1051', name: 'Аттокуров Эрбол', type: 'Физлицо', status: 'Активный', company: '—', phone: '+996 700 222 333', email: 'erbol.a@gmail.com', city: 'Бишкек', since: '05.02.2025', orders: 4, spent: 4300, debt: 0, doc: 'ID AC9911223', dob: '11.05.1991' },
  { id: 'CL-1033', name: 'Сагынбеков Икрам', type: 'Физлицо', status: 'Активный', company: 'ИП Сагынбеков', phone: '+996 770 444 555', email: 'sagyn@mail.ru', city: 'Бишкек', since: '20.03.2025', orders: 3, spent: 12800, debt: 8500, doc: 'ID AC4455667', dob: '03.12.1988' },
  { id: 'CL-1028', name: 'Мамажанов Абдутаир', type: 'ИП', status: 'Неактивный', company: 'ИП Мамажанов', phone: '+996 555 111 000', email: 'mamajanov@mail.ru', city: 'Джалал-Абад', since: '11.11.2024', orders: 2, spent: 3200, debt: 0, doc: 'ИНН 21807199100123', dob: '18.07.1979' },
  { id: 'CL-1060', name: 'Жумабекова Назгуль', type: 'Физлицо', status: 'Новый', company: '—', phone: '+996 700 888 999', email: 'nazgul.j@gmail.com', city: 'Бишкек', since: '12.06.2025', orders: 1, spent: 980, debt: 980, doc: 'ID AC8877665', dob: '29.09.1995' },
];


const COMPANY_STATUS = { 'Действующий': 'green', 'На паузе': 'amber', 'Архив': 'gray' };



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







export { CURRENT_USER, ORDER_STATUS, SERVICE_TYPE, REQUEST_TYPE, SUPPLIER_STATUS, FIN_STATUS, DOC_STATUS, DOC_STAGE, DOC_TYPE, ORG_TYPE, CLIENTS, OPERATORS, rid, ORDERS, SUPPLIERS, FINANCE, FIN_STATS, DOCUMENTS, CHATS, CHAT_TYPES, CHAT_TYPE_LABEL, CHAT_CHANNEL_TONE, CHAT_CHANNELS, CHAT_THREADS, DASH_STATS, ORDER_BREAKDOWN, RECENT_CHANGES, API_ACCESS, CURRENCIES, AIRLINES, AIR_STATUS, isRuAirport, isDomesticRu, AVIA_MARKUPS, aviaMarkupsFor, aviaMarkupResolve, aviaMarkupAmount, CABIN_CLASSES, SPECIAL_PAX_CATEGORIES, SUBSIDIZED_PAX_PROGRAMS, AIRPORTS, FLIGHT_OFFERS, AVIA_COMPLEX_ROUTE, AIR_SERVICES, AIR_STATS, AVIA_FARE_TIERS, AVIA_FARE_TIERS_BUSINESS, AVIA_BOOKING_CLASSES, AVIA_BAGGAGE_OPTIONS, AVIA_SPECIAL_BAGGAGE, AVIA_MEALS, AVIA_INSURANCE_PLANS, AVIA_INSURANCE_INCLUDES, AVIA_COMFORT_GROUPS, AVIA_SEATMAP, SERVICE_KIND, SERVICE_STATUS, PAX_DOC_KIND, ORDER_SERVICES, KP_STATUS_FLOW, KP_STATUS, PROPOSALS, ORDER_PARTICIPANTS, GROUP_PAX, ORDER_GROUPS, ORDER_SERVICE_EXTRAS, ORDER_BOOKING_FLOW, AVIA_GROUPS_SEED, RAIL_SERVICE_CLASSES, RAIL_WAGONS, RAIL_OCCUPIED, ORDER_TASKS, ORDER_STAGES, FIN_OP_STATUS, FIN_OPS, DOC_KIND, DOC_STATUS2, DOCS2, FULFILLMENT, RETURN_FLOW, RETURN_STATUS, RETURN_TYPE, RETURNS, NOTIF_PRIORITY, NOTIF_PRIO_RANK, NOTIF_SOURCE, NOTIFICATIONS, INTEGRATION_ERROR_CODES, ERR_SEVERITY, ERR_SYSTEMS, ERR_CATEGORIES, NOTIF_SETTINGS, SVC_DATA, HOTEL_AMENITIES, hotelTariffs, hotelRooms, HOTELS, HOTEL_DISTRICTS, HOTEL_MEALS, HOTEL_EXTRAS, USER_STATUS, USERS, ROLES, PERMISSIONS, CLIENT_STATUS, CLIENTS_DB, COMPANY_STATUS, COMPANIES_DB, COMPANY_STAFF, companyStaff, SETTLEMENT_TYPES, SETTLEMENT_TONE, FEE_SCHEMA, FEE_SERVICE_TYPES, SERVICE_DESC_DEFAULTS, FEE_DESC_DEFAULTS, feeDescsFromDefaults, feeDescOf, FEE_TEMPLATES, feeTemplate, feesFromTemplate, descsFromDefaults, registerFeeTemplate, COMPANY_FINANCE, companyFinance, depositAvailable, creditAvailable, activeContract, activeAgreement, feeAmount, applyAgreementFees, companyBalanceShort, financeOverview };
