


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





function isRuAirport(code) { const a = AIRPORTS.find((x) => x.code === code); return !!a && a.country === 'Россия'; }
function isDomesticRu(from, to) { return isRuAirport(from) && isRuAirport(to); }


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


function aviaMarkupResolve(airlineCode, from, to) {
  for (const sup in AVIA_MARKUPS) {
    const byAir = AVIA_MARKUPS[sup][airlineCode];
    if (!byAir) continue;
    const rt = (byAir.routes || []).find((r) => r.from === from && r.to === to && r.value);
    if (rt) return { supplier: sup, scope: 'route', type: rt.type, value: rt.value };
    const dom = isDomesticRu(from, to);
    const bucket = dom ? byAir.domestic : byAir.intl;
    if (bucket && bucket.value) return { supplier: sup, scope: dom ? 'domestic' : 'intl', type: bucket.type, value: bucket.value };
    return null;
  }
  return null;
}
function aviaMarkupAmount(airlineCode, from, to, base) {
  const m = aviaMarkupResolve(airlineCode, from, to);
  if (!m) return 0;
  return m.type === 'percent' ? Math.round(base * m.value / 100) : m.value;
}

const CABIN_CLASSES = ['Эконом', 'Комфорт', 'Бизнес', 'Первый'];



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


const AVIA_BOOKING_CLASSES = [
  { code: 'Y', cabin: 'Эконом',         seatsLeft: 18 },
  { code: 'B', cabin: 'Эконом',         seatsLeft: 9 },
  { code: 'M', cabin: 'Эконом',         seatsLeft: 5 },
  { code: 'U', cabin: 'Премиум эконом', seatsLeft: 4 },
  { code: 'C', cabin: 'Бизнес',         seatsLeft: 3 },
  { code: 'J', cabin: 'Бизнес',         seatsLeft: 2 },
  { code: 'D', cabin: 'Бизнес',         seatsLeft: 1 },
];


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


const AVIA_MEALS = [
  { id: 'standard', label: 'Стандартное питание',  price: 0,   incl: true, color: '#e9c46a' },
  { id: 'light',    label: 'Лёгкое питание',       price: 400, color: '#8ab17d' },
  { id: 'kids',     label: 'Детское питание',      price: 400, color: '#e76f51' },
  { id: 'veg',      label: 'Вегетарианское питание', price: 400, color: '#52b788' },
  { id: 'none',     label: 'Без питания',          price: 0 },
];


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


const AVIA_SEATMAP = {
  cols: ['A', 'B', 'C', 'D', 'E', 'F'],
  rows: 18,
  legend: [
    { kind: 'std',  label: 'Стандарт', price: 0 },
    { kind: 'extra',label: 'Больше места', price: 1500 },
    { kind: 'front',label: 'Первые ряды', price: 2200 },
  ],

  rowKind: { 1: 'front', 2: 'front', 3: 'front', 11: 'extra', 12: 'extra' },
  occupied: ['1A', '1B', '3F', '5C', '7D', '7E', '9A', '11F', '14B', '14C', '16D'],
  price: { std: 0, extra: 1500, front: 2200 },
};

export {
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
};
