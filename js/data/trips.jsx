






const TRIP_NOW = new Date(2026, 5, 24, 9, 30);


const TRIP_CRIT = {
  critical: { key: 'critical', label: 'Критический',    tone: 'red',   rank: 3, hint: 'Требует немедленного вмешательства' },
  high:     { key: 'high',     label: 'Высокий',        tone: 'amber', rank: 2, hint: 'Требуется обработать сегодня' },
  medium:   { key: 'medium',   label: 'Средний',        tone: 'blue',  rank: 1, hint: 'Требует внимания' },
  info:     { key: 'info',     label: 'Информационный', tone: 'gray',  rank: 0, hint: 'Не требует действий' },
};
function critMax(a, b) { return (TRIP_CRIT[a] ? TRIP_CRIT[a].rank : -1) >= (TRIP_CRIT[b] ? TRIP_CRIT[b].rank : -1) ? a : b; }


const TRIP_FM_CATALOG = {
  flight_cancel:     { label: 'Отмена рейса',                    crit: 'critical', icon: 'plane' },
  flight_delay:      { label: 'Задержка рейса',                  crit: 'critical', icon: 'clock' },
  dep_time_change:   { label: 'Изменение времени отправления',   crit: 'high',     icon: 'clock' },
  airport_change:    { label: 'Смена аэропорта',                 crit: 'high',     icon: 'plane' },
  terminal_change:   { label: 'Смена терминала',                 crit: 'medium',   icon: 'plane' },
  train_no_change:   { label: 'Изменение номера поезда',         crit: 'medium',   icon: 'train' },
  hotel_cancel:      { label: 'Отмена гостиницы',                crit: 'critical', icon: 'building' },
  supplier_refuse:   { label: 'Отказ поставщика',                crit: 'critical', icon: 'api' },
  price_change:      { label: 'Изменение стоимости',             crit: 'high',     icon: 'finance' },
  booking_lost:      { label: 'Потеря бронирования',             crit: 'critical', icon: 'alertCircle' },
  policy_violation:  { label: 'Нарушение тревел-политики',       crit: 'high',     icon: 'shield' },
  timelimit_expired: { label: 'Истечение тайм-лимита',           crit: 'critical', icon: 'clock' },
  unpaid_service:    { label: 'Неоплаченная услуга',             crit: 'high',     icon: 'finance' },
};


const D = (y, mo, d, h = 0, mi = 0) => new Date(y, mo, d, h, mi);
function trTime(dt) { return dt instanceof Date ? String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0') : ''; }
function trDay(dt) { return dt instanceof Date ? String(dt.getDate()).padStart(2, '0') + '.' + String(dt.getMonth() + 1).padStart(2, '0') : ''; }
function trDayTime(dt) { return dt ? trDay(dt) + ' ' + trTime(dt) : '—'; }
function trSameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function trStartOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function trDaysBetween(a, b) { return Math.round((trStartOfDay(b) - trStartOfDay(a)) / 86400000); }
function trMinutes(ms) { return Math.round(ms / 60000); }
function trHumanIn(dt, now = TRIP_NOW) {
  const m = trMinutes(dt - now);
  if (m < 0) { const am = -m; return am < 60 ? am + ' мин назад' : Math.round(am / 60) + ' ч назад'; }
  if (m < 60) return 'через ' + m + ' мин';
  if (m < 60 * 24) return 'через ' + Math.round(m / 60) + ' ч';
  return 'через ' + Math.round(m / 1440) + ' дн';
}






const TRIPS = [

  {
    id: 'TR-51162', orderNo: 51162, client: 'Нуралиев Данияр', company: 'ОсОО «Гранд лимитед»',
    isGroup: false, pax: 2, paxNames: ['Нуралиев Данияр', 'Нуралиева Айгерим'], operator: 'Даниель', status: 'В работе',
    routeLabel: 'Москва → Стамбул → Дубай',
    start: D(2026, 5, 24, 11, 30), end: D(2026, 6, 1, 12, 0),
    services: [
      { kind: 'Авиа', title: 'SVO → IST', sub: 'Air Astana · KC 131 · 2 пасс.', supplier: 'Air Astana (API)', status: 'Выписано',
        from: 'Москва (SVO)', to: 'Стамбул (IST)', pax: 2, paid: true, ticketed: true,
        start: D(2026, 5, 24, 11, 30), end: D(2026, 5, 24, 14, 40), regOpens: D(2026, 5, 24, 9, 30) },
      { kind: 'Трансфер', title: 'IST → Hilton Istanbul', sub: 'Минивэн · встреча с табличкой', supplier: 'Karimov Transfer', status: 'Подтверждено',
        from: 'Аэропорт IST', to: 'Hilton Istanbul', pax: 2, paid: true, ticketed: true,
        start: D(2026, 5, 24, 15, 10), end: D(2026, 5, 24, 16, 0) },
      { kind: 'Гостиница', title: 'Hilton Istanbul · 4★', sub: 'Standard Double · 4 ночи · BB', supplier: 'Booking B2B', status: 'Забронировано',
        from: 'Стамбул', to: '', pax: 2, paid: true, ticketed: true,
        start: D(2026, 5, 24, 15, 0), end: D(2026, 5, 28, 12, 0), checkinUntil: D(2026, 5, 24, 23, 0) },
      { kind: 'Авиа', title: 'IST → DXB', sub: 'Emirates · EK 122 · 2 пасс.', supplier: 'Amadeus GDS', status: 'Забронировано',
        from: 'Стамбул (IST)', to: 'Дубай (DXB)', pax: 2, paid: false, ticketed: false,
        start: D(2026, 5, 28, 15, 20), end: D(2026, 5, 28, 20, 5), timeLimit: D(2026, 5, 26, 18, 0) },
      { kind: 'Гостиница', title: 'Rove Downtown · 4★', sub: 'Superior · 3 ночи · BB', supplier: 'Booking B2B', status: 'Забронировано',
        from: 'Дубай', to: '', pax: 2, paid: true, ticketed: true,
        start: D(2026, 5, 28, 21, 0), end: D(2026, 6, 1, 12, 0), checkinUntil: D(2026, 5, 29, 2, 0) },
    ],
    fm: [],
    docs: [{ name: 'Маршрутная квитанция SVO→IST', status: 'Готово' }, { name: 'Ваучер Hilton Istanbul', status: 'Готово' }, { name: 'Билет IST→DXB', status: 'Ожидает выписки' }],
  },


  {
    id: 'TR-51163', orderNo: 51163, client: 'Каримов Икрам', company: 'ОсОО «Asia Travel»',
    isGroup: false, pax: 2, paxNames: ['Каримов Икрам', 'Каримова Дилноза'], operator: 'Даниель', status: 'Форс-мажор',
    routeLabel: 'Бишкек → Дубай',
    start: D(2026, 5, 24, 22, 30), end: D(2026, 5, 29, 13, 0),
    services: [
      { kind: 'Авиа', title: 'FRU → DXB', sub: 'Emirates · EK 878 · 2 пасс.', supplier: 'Emirates (API)', status: 'Выписано',
        from: 'Бишкек (FRU)', to: 'Дубай (DXB)', pax: 2, paid: true, ticketed: true,
        start: D(2026, 5, 24, 22, 30), end: D(2026, 5, 25, 1, 10), delayed: true, regOpens: D(2026, 5, 24, 19, 30) },
      { kind: 'Трансфер', title: 'DXB → Rove Downtown', sub: 'Седан · встреча с табличкой', supplier: 'Karimov Transfer', status: 'Требует переноса',
        from: 'Аэропорт DXB', to: 'Rove Downtown', pax: 2, paid: true, ticketed: true,
        start: D(2026, 5, 24, 23, 40), end: D(2026, 5, 25, 0, 30) },
      { kind: 'Гостиница', title: 'Rove Downtown · 4★', sub: 'Superior · 4 ночи · BB', supplier: 'Booking B2B', status: 'Забронировано',
        from: 'Дубай', to: '', pax: 2, paid: true, ticketed: true,
        start: D(2026, 5, 25, 0, 0), end: D(2026, 5, 29, 12, 0), checkinUntil: D(2026, 5, 25, 0, 0) },
    ],
    fm: [{ type: 'flight_delay', event: 'Задержка рейса EK 878', service: 'FRU → DXB',
      whatChanged: 'Вылет перенесён с 22:30 на 01:20 (+2 ч 50 мин)', at: D(2026, 5, 24, 9, 5), source: 'API Emirates' }],
    docs: [{ name: 'Маршрутная квитанция FRU→DXB', status: 'Готово' }, { name: 'Ваучер Rove Downtown', status: 'Готово' }],
  },


  {
    id: 'TR-51171', orderNo: 51171, client: 'ООО «Компания»', company: 'ООО «Компания»',
    isGroup: true, group: { bookings: 32, issued: 30, noSeat: 2, placementConflict: false }, pax: 32,
    paxNames: ['Ахметов Р.', 'Соколова Е.', 'Иванов П.', '… ещё 29 пассажиров'],
    operator: 'Куба', status: 'Оформление', routeLabel: 'Москва → Казань',
    start: D(2026, 5, 25, 8, 40), end: D(2026, 5, 25, 20, 0),
    services: [
      { kind: 'Авиа', title: 'SVO → KZN (группа 32)', sub: 'Победа · DP 407 · 32 пасс.', supplier: 'Победа (API)', status: 'Оформление',
        from: 'Москва (SVO)', to: 'Казань (KZN)', pax: 32, paid: true, ticketed: false,
        start: D(2026, 5, 25, 8, 40), end: D(2026, 5, 25, 10, 30), delayed: true, timeLimit: D(2026, 5, 24, 16, 0) },
      { kind: 'Автобус', title: 'KZN → отель (группа)', sub: 'Автобус 45 мест · трансфер по программе', supplier: 'Asia Travel', status: 'Подтверждено',
        from: 'Аэропорт KZN', to: 'Гранд Отель Казань', pax: 32, paid: true, ticketed: true,
        start: D(2026, 5, 25, 11, 15), end: D(2026, 5, 25, 12, 0) },
    ],
    fm: [{ type: 'dep_time_change', event: 'Изменение времени вылета DP 407', service: 'SVO → KZN',
      whatChanged: 'Вылет сдвинут на 40 мин (08:40 → 09:20)', at: D(2026, 5, 24, 8, 40), source: 'API Победа' }],
    docs: [{ name: 'Список группы (32)', status: 'Готово' }, { name: 'Групповые билеты', status: 'Выписано 30 из 32' }],
  },


  {
    id: 'TR-51172', orderNo: 51172, client: 'Бейшеналиев Сагын', company: 'ОсОО «Гранд лимитед»',
    isGroup: false, pax: 1, paxNames: ['Бейшеналиев Сагын'], operator: 'Даниель', status: 'Согласование',
    routeLabel: 'Бишкек → Стамбул',
    start: D(2026, 6, 2, 7, 5), end: D(2026, 6, 2, 10, 25),
    services: [
      { kind: 'Авиа', title: 'FRU → IST', sub: 'Turkish Airlines · TK 341 · 1 пасс.', supplier: 'Amadeus GDS', status: 'Согласование',
        from: 'Бишкек (FRU)', to: 'Стамбул (IST)', pax: 1, paid: false, ticketed: false,
        start: D(2026, 6, 2, 7, 5), end: D(2026, 6, 2, 10, 25), timeLimit: D(2026, 5, 24, 9, 45) },
    ],
    fm: [],
    docs: [{ name: 'КП по перелёту', status: 'Отправлено клиенту' }],
  },


  {
    id: 'TR-51156', orderNo: 51156, client: 'Усманов Бактыбек', company: 'ОсОО «Asia Travel»',
    isGroup: false, pax: 3, paxNames: ['Усманов Бактыбек', 'Усманова Гульнара', 'Усманов Тимур'], operator: 'Кими', status: 'В работе',
    routeLabel: 'Москва → Санкт-Петербург',
    start: D(2026, 5, 26, 0, 40), end: D(2026, 5, 28, 11, 0),
    services: [
      { kind: 'ЖД', title: 'Москва → Санкт-Петербург', sub: '«Сапсан» 754А · купе · 3 пасс.', supplier: 'РЖД (API)', status: 'Забронировано',
        from: 'Москва, Ленинградский', to: 'СПб, Московский', pax: 3, paid: true, ticketed: true,
        start: D(2026, 5, 26, 0, 40), end: D(2026, 5, 26, 7, 15) },
      { kind: 'Трансфер', title: 'Вокзал → отель', sub: 'Минивэн · встреча на перроне', supplier: 'Karimov Transfer', status: 'Забронировано',
        from: 'Московский вокзал', to: 'Radisson Royal', pax: 3, paid: false, ticketed: true,
        start: D(2026, 5, 26, 6, 40), end: D(2026, 5, 26, 7, 20) },
      { kind: 'Гостиница', title: 'Radisson Royal · 5★', sub: 'Superior · 2 ночи · BB', supplier: 'Booking B2B', status: 'Забронировано',
        from: 'Санкт-Петербург', to: '', pax: 3, paid: true, ticketed: true,
        start: D(2026, 5, 26, 8, 0), end: D(2026, 5, 28, 12, 0), checkinUntil: D(2026, 5, 26, 23, 0) },
    ],
    fm: [],
    docs: [{ name: 'ЖД билеты «Сапсан»', status: 'Готово' }, { name: 'Ваучер Radisson Royal', status: 'Готово' }],
  },


  {
    id: 'TR-51155', orderNo: 51155, client: 'ИП Мамажанов Абдутаир', company: 'ИП Мамажанов',
    isGroup: false, pax: 2, paxNames: ['Мамажанов Абдутаир', 'Мамажанова Нургуль'], operator: 'Даниель', status: 'Ожидание оплаты',
    routeLabel: 'Бишкек → Алматы',
    start: D(2026, 5, 27, 6, 30), end: D(2026, 5, 27, 8, 0),
    services: [
      { kind: 'Авиа', title: 'FRU → ALA', sub: 'Air Astana · KC 108 · 2 пасс.', supplier: 'Air Astana (API)', status: 'Забронировано',
        from: 'Бишкек (FRU)', to: 'Алматы (ALA)', pax: 2, paid: false, ticketed: false,
        start: D(2026, 5, 27, 6, 30), end: D(2026, 5, 27, 8, 0), timeLimit: D(2026, 5, 25, 12, 0) },
    ],
    fm: [],
    docs: [{ name: 'Счёт на оплату', status: 'Ожидает оплаты' }],
  },


  {
    id: 'TR-51168', orderNo: 51168, client: 'Жумабекова Назгуль', company: '—',
    isGroup: false, pax: 1, paxNames: ['Жумабекова Назгуль'], operator: 'Азамат А.', status: 'Подтверждено',
    routeLabel: 'Бишкек · проживание',
    start: D(2026, 5, 26, 14, 0), end: D(2026, 5, 29, 12, 0),
    services: [
      { kind: 'Гостиница', title: 'Jannat Hotel · 4★', sub: 'Deluxe · 3 ночи · BB', supplier: 'Jannat Group', status: 'Подтверждено',
        from: 'Бишкек', to: '', pax: 1, paid: true, ticketed: true,
        start: D(2026, 5, 26, 14, 0), end: D(2026, 5, 29, 12, 0), checkinUntil: D(2026, 5, 26, 23, 0) },
    ],
    fm: [],
    docs: [{ name: 'Ваучер Jannat Hotel', status: 'Готово' }],
  },


  {
    id: 'TR-51180', orderNo: 51180, client: 'Токтогулов Эмир', company: 'ОсОО «Гранд лимитед»',
    isGroup: false, pax: 1, paxNames: ['Токтогулов Эмир'], operator: 'Кими', status: 'В работе',
    routeLabel: 'Бишкек → Стамбул → Лондон',
    start: D(2026, 5, 27, 8, 0), end: D(2026, 5, 30, 12, 0),
    services: [
      { kind: 'Авиа', title: 'FRU → IST', sub: 'Turkish Airlines · TK 341 · 1 пасс.', supplier: 'Amadeus GDS', status: 'Забронировано',
        from: 'Бишкек (FRU)', to: 'Стамбул (IST)', pax: 1, paid: true, ticketed: true,
        start: D(2026, 5, 27, 8, 0), end: D(2026, 5, 27, 11, 30) },
      { kind: 'Авиа', title: 'IST → LHR', sub: 'Turkish Airlines · TK 1979 · 1 пасс.', supplier: 'Amadeus GDS', status: 'Забронировано',
        from: 'Стамбул (IST)', to: 'Лондон (LHR)', pax: 1, paid: true, ticketed: true,
        start: D(2026, 5, 27, 12, 0), end: D(2026, 5, 27, 15, 30) },
      { kind: 'Гостиница', title: 'Park Plaza London · 4★', sub: 'Standard · 3 ночи · BB', supplier: 'Booking B2B', status: 'Забронировано',
        from: 'Лондон', to: '', pax: 1, paid: true, ticketed: true,
        start: D(2026, 5, 27, 21, 0), end: D(2026, 5, 30, 12, 0), checkinUntil: D(2026, 5, 28, 2, 0) },
    ],
    fm: [{ type: 'terminal_change', event: 'Смена терминала в IST', service: 'IST → LHR',
      whatChanged: 'Вылет перенесён с терминала A на терминал E', at: D(2026, 5, 24, 8, 30), source: 'API Turkish Airlines' }],
    docs: [{ name: 'Маршрутная квитанция FRU→IST→LHR', status: 'Готово' }, { name: 'Ваучер Park Plaza London', status: 'Готово' }],
  },


  {
    id: 'TR-51154', orderNo: 51154, client: 'Аттокуров Эрбол', company: 'ОсОО «Гранд лимитед»',
    isGroup: false, pax: 1, paxNames: ['Аттокуров Эрбол'], operator: 'Даниель', status: 'Требует проверки',
    opsConflict: 'Два оператора выполняют несовместимые действия: Даниель оформляет выписку рейса FRU → IST, Кими одновременно инициировал его отмену.',
    routeLabel: 'Бишкек → Стамбул (проверка)',
    start: D(2026, 5, 28, 9, 0), end: D(2026, 6, 1, 12, 0),
    services: [
      { kind: 'Авиа', title: 'FRU → IST', sub: 'Turkish Airlines · TK 341 · 1 пасс.', supplier: 'Amadeus GDS', status: 'Выписка',
        from: 'Бишкек (FRU)', to: 'Стамбул (IST)', pax: 1, paid: true, ticketed: false,
        start: D(2026, 5, 28, 9, 0), end: D(2026, 5, 28, 12, 30), timeLimit: D(2026, 5, 25, 12, 0) },
      { kind: 'Авиа', title: 'FRU → DXB', sub: 'Emirates · EK 878 · 1 пасс.', supplier: 'Emirates (API)', status: 'Забронировано',
        from: 'Бишкек (FRU)', to: 'Дубай (DXB)', pax: 1, paid: false, ticketed: false,
        start: D(2026, 5, 28, 10, 0), end: D(2026, 5, 28, 13, 0), timeLimit: D(2026, 5, 26, 18, 0) },
      { kind: 'Гостиница', title: 'Hilton Istanbul · 4★', sub: 'Standard · 3 ночи · BB', supplier: 'Booking B2B', status: 'Забронировано',
        from: 'Стамбул', to: '', pax: 1, paid: true, ticketed: true,
        start: D(2026, 5, 28, 14, 0), end: D(2026, 5, 31, 12, 0), checkinUntil: D(2026, 5, 28, 23, 0) },
      { kind: 'Гостиница', title: 'Swissotel Istanbul · 5★', sub: 'Superior · 3 ночи · BB', supplier: 'Booking B2B', status: 'Забронировано',
        from: 'Стамбул', to: '', pax: 1, paid: true, ticketed: true,
        start: D(2026, 5, 29, 14, 0), end: D(2026, 6, 1, 12, 0), checkinUntil: D(2026, 5, 29, 23, 0) },
    ],
    fm: [{ type: 'booking_lost', event: 'Потеря бронирования EK 878', service: 'FRU → DXB',
      whatChanged: 'Бронирование не подтверждено поставщиком — PNR утерян', at: D(2026, 5, 24, 7, 50), source: 'API Emirates' }],
    docs: [{ name: 'Билет FRU→IST', status: 'Ожидает выписки' }, { name: 'Билет FRU→DXB', status: 'Бронь утеряна' }],
  },
];



function tripEvents(trip, now = TRIP_NOW) {
  const ev = [];
  const soon = (dt, hoursCrit, hoursHigh, hoursMed) => {
    if (!(dt instanceof Date)) return null;
    const h = (dt - now) / 3600000;
    if (h < -2) return null;
    if (h <= hoursCrit) return 'critical';
    if (h <= hoursHigh) return 'high';
    if (h <= hoursMed) return 'medium';
    return 'info';
  };
  trip.services.forEach((s) => {
    if (s.kind === 'Авиа') {
      const c = soon(s.start, 3, 12, 48);
      if (c) ev.push({ label: 'Ожидается вылет', icon: 'plane', crit: c, at: s.start, service: s });
      if (s.regOpens && (s.regOpens - now) / 3600000 <= 2 && (s.regOpens - now) > -3600000)
        ev.push({ label: 'Открывается регистрация', icon: 'clock', crit: 'high', at: s.regOpens, service: s });
    }
    if (s.kind === 'ЖД') { const c = soon(s.start, 3, 12, 48); if (c) ev.push({ label: 'Ожидается отправление', icon: 'train', crit: c, at: s.start, service: s }); }
    if (s.kind === 'Трансфер') { const c = soon(s.start, 2, 6, 24); if (c) ev.push({ label: 'Ожидается трансфер', icon: 'car', crit: c === 'info' ? 'info' : c, at: s.start, service: s }); }
    if (s.kind === 'Гостиница') {
      const ci = soon(s.start, 4, 12, 48); if (ci) ev.push({ label: 'Ожидается заселение', icon: 'building', crit: ci === 'critical' ? 'high' : ci, at: s.start, service: s });
      const co = soon(s.end, 4, 12, 48); if (co && (s.end - now) / 3600000 <= 24) ev.push({ label: 'Ожидается выселение', icon: 'building', crit: 'medium', at: s.end, service: s });
    }

    if (!s.ticketed && s.timeLimit instanceof Date) {
      const h = (s.timeLimit - now) / 3600000;
      const c = h <= 0.5 ? 'critical' : h <= 4 ? 'high' : h <= 24 ? 'medium' : 'info';
      ev.push({ label: 'Ожидается выписка (тайм-лимит)', icon: 'clock', crit: c, at: s.timeLimit, service: s });
    }

    if (!s.paid && (s.kind !== 'Авиа' || !s.timeLimit)) ev.push({ label: 'Ожидается оплата', icon: 'finance', crit: trip.status === 'Ожидание оплаты' ? 'high' : 'medium', at: s.timeLimit || s.start, service: s });
    if (s.status === 'Согласование') ev.push({ label: 'Ожидается согласование', icon: 'template', crit: 'medium', at: s.start, service: s });
  });
  return ev.sort((a, b) => (TRIP_CRIT[b.crit].rank - TRIP_CRIT[a.crit].rank) || (a.at - b.at));
}



function tripConflicts(trip) {
  const out = [];
  const svc = trip.services;
  const flights = svc.filter((s) => s.kind === 'Авиа');
  const arrivals = svc.filter((s) => s.kind === 'Авиа' || s.kind === 'ЖД');
  const transfers = svc.filter((s) => s.kind === 'Трансфер');
  const hotels = svc.filter((s) => s.kind === 'Гостиница');
  const overlap = (a, b) => a.start < b.end && b.start < a.end;


  transfers.forEach((tr) => arrivals.forEach((a) => {
    if (!trSameDay(tr.start, a.end)) return;
    const diff = trMinutes(tr.start - a.end);
    if (diff < 0) out.push({ crit: 'critical', text: 'Трансфер назначен раньше прибытия: ' + trTime(tr.start) + ' < прибытие ' + trTime(a.end) + '. Перенесите трансфер.' });
    else if (diff < 30) out.push({ crit: 'high', text: 'Недостаточно времени на встречу: между прибытием (' + trTime(a.end) + ') и трансфером (' + trTime(tr.start) + ') всего ' + diff + ' мин.' });
  }));


  const arrivalBefore = (h) => arrivals
    .filter((a) => trSameDay(a.end, trStartOfDay(h.start)) && a.end <= h.start)
    .sort((x, y) => y.end - x.end)[0];


  hotels.forEach((h) => {
    const a = arrivalBefore(h);
    if (a && h.checkinUntil && a.end > h.checkinUntil)
      out.push({ crit: 'high', text: 'Позднее заселение: прибытие ' + trTime(a.end) + ', заселение до ' + trTime(h.checkinUntil) + '. Требуется подтверждение гостиницы.' });
  });


  hotels.forEach((h) => {
    const a = arrivalBefore(h);
    if (a && (h.start - a.end) > 4 * 3600000)
      out.push({ crit: 'medium', text: 'Гостиница начинается позже прилёта: прибытие ' + trTime(a.end) + ', заселение только в ' + trTime(h.start) + ' (≈' + Math.round((h.start - a.end) / 3600000) + ' ч ожидания).' });
  });


  hotels.forEach((h) => arrivals.forEach((d) => {
    if (trSameDay(h.end, d.start) && h.end > d.start)
      out.push({ crit: 'high', text: 'Выселение (' + trTime(h.end) + ') позже отправления (' + trTime(d.start) + '). Сдвиньте выселение раньше.' });
  }));


  const sortF = flights.slice().sort((a, b) => a.start - b.start);
  for (let i = 0; i < sortF.length - 1; i++) {
    const gap = trMinutes(sortF[i + 1].start - sortF[i].end);
    if (gap >= 0 && gap < 60 && trDaysBetween(sortF[i].end, sortF[i + 1].start) === 0)
      out.push({ crit: 'high', text: 'Недостаточно времени на пересадку: между рейсами ' + sortF[i].title + ' и ' + sortF[i + 1].title + ' всего ' + gap + ' мин.' });
  }


  for (let i = 0; i < flights.length; i++) for (let j = i + 1; j < flights.length; j++)
    if (overlap(flights[i], flights[j]))
      out.push({ crit: 'critical', text: 'Два рейса одновременно у пассажира: ' + flights[i].title + ' (' + trTime(flights[i].start) + '–' + trTime(flights[i].end) + ') и ' + flights[j].title + ' (' + trTime(flights[j].start) + '–' + trTime(flights[j].end) + ').' });


  for (let i = 0; i < hotels.length; i++) for (let j = i + 1; j < hotels.length; j++)
    if (overlap(hotels[i], hotels[j]))
      out.push({ crit: 'high', text: 'Одновременно забронированы две гостиницы на пересекающиеся даты: ' + hotels[i].title + ' и ' + hotels[j].title + '.' });


  if (svc.some((s) => s.delayed) && transfers.length)
    out.push({ crit: 'high', text: 'Рейс задержан — трансфер необходимо перенести под новое время прибытия.' });


  if (trip.opsConflict) out.push({ crit: 'high', text: trip.opsConflict });


  if (trip.group) {
    if (trip.group.noSeat > 0) out.push({ crit: 'high', text: trip.group.noSeat + ' пассажира без мест — требуется рассадка.' });
    const unissued = trip.group.bookings - trip.group.issued;
    if (unissued > 0) out.push({ crit: 'high', text: unissued + ' бронирование не выписано из ' + trip.group.bookings + '.' });
    if (trip.group.placementConflict) out.push({ crit: 'high', text: 'Конфликт размещения в группе.' });
  }
  return out;
}



function tripForceMajeures(trip) {
  return (trip.fm || []).map((f) => {
    const c = TRIP_FM_CATALOG[f.type] || {};
    return { ...f, typeLabel: c.label || f.event || 'Форс-мажор', crit: f.crit || c.crit || 'high', icon: c.icon || 'alertCircle' };
  });
}


function tripCriticality(trip, now = TRIP_NOW) {
  let c = 'info';
  tripEvents(trip, now).forEach((e) => { c = critMax(c, e.crit); });
  tripConflicts(trip).forEach((k) => { c = critMax(c, k.crit); });
  tripForceMajeures(trip).forEach((f) => { c = critMax(c, f.crit); });
  return c;
}


function tripUnpaid(trip) { return trip.services.some((s) => !s.paid); }


function controlCenterFeed(trips = TRIPS, now = TRIP_NOW, withinHours = 6) {
  const feed = [];
  trips.forEach((trip) => {
    tripEvents(trip, now).forEach((e) => {
      const h = (e.at - now) / 3600000;
      if (h > withinHours || h < -0.5) return;
      feed.push({ trip, ...e, when: trHumanIn(e.at, now) });
    });
  });
  return feed.sort((a, b) => (TRIP_CRIT[b.crit].rank - TRIP_CRIT[a.crit].rank) || (a.at - b.at));
}


function crossTripConflicts(trips = TRIPS) {
  const out = [];
  for (let i = 0; i < trips.length; i++)
    for (let j = i + 1; j < trips.length; j++) {
      const a = trips[i], b = trips[j];
      if (a.client === b.client && a.start <= b.end && b.start <= a.end)
        out.push({ crit: 'high', a, b, text: 'Пересекаются две поездки клиента ' + a.client + ' (' + a.routeLabel + ' и ' + b.routeLabel + ').' });
    }
  return out;
}


function tripFilterSets(trips = TRIPS) {
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  return {
    operators: uniq(trips.map((t) => t.operator)),
    companies: uniq(trips.map((t) => t.company)),
    clients: uniq(trips.map((t) => t.client)),
    kinds: uniq(trips.flatMap((t) => t.services.map((s) => s.kind))),
    suppliers: uniq(trips.flatMap((t) => t.services.map((s) => s.supplier))),
    statuses: uniq(trips.map((t) => t.status)),
  };
}

Object.assign(window, {
  TRIP_NOW, TRIP_CRIT, TRIP_FM_CATALOG, TRIPS, tripEvents, tripConflicts, tripForceMajeures, tripCriticality,
  tripUnpaid, controlCenterFeed, crossTripConflicts, tripFilterSets,
  trTime, trDay, trDayTime, trSameDay, trStartOfDay, trDaysBetween, trHumanIn, critMax,
});



export { TRIP_NOW, TRIP_CRIT, critMax, TRIP_FM_CATALOG, D, trTime, trDay, trDayTime, trSameDay, trStartOfDay, trDaysBetween, trMinutes, trHumanIn, TRIPS, tripEvents, tripConflicts, tripForceMajeures, tripCriticality, tripUnpaid, controlCenterFeed, crossTripConflicts, tripFilterSets };
