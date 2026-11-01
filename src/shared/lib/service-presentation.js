export const SERVICE_KIND_LABELS = { avia: 'Авиа', rail: 'ЖД', hotel: 'Гостиница', transfer: 'Трансфер', bus: 'Автобус', tour: 'Тур', visa: 'Виза', insurance: 'Страхование', aeroexpress: 'Аэроэкспресс', lounge: 'Бизнес-зал', other: 'Прочее' };

export function presentationService(service = {}) {
  const kind = SERVICE_KIND_LABELS[service.kind] || service.kind || SERVICE_KIND_LABELS[service.service_kind] || service.service_kind;
  return { ...service, kind, title: service.title || service.main || service.route || '', starts_at: service.starts_at || service.start?.toISOString?.(), ends_at: service.ends_at || service.end?.toISOString?.() };
}

const AIRPORT_CITIES = { FRU: 'Бишкек', OSS: 'Ош', SVO: 'Москва', DME: 'Москва', IST: 'Стамбул', SAW: 'Стамбул', DXB: 'Дубай', ALA: 'Алматы', DOH: 'Доха', TAS: 'Ташкент', GRV: 'Грозный', LED: 'Санкт-Петербург', VKO: 'Москва', ZIA: 'Москва', AER: 'Сочи', KZN: 'Казань', OVB: 'Новосибирск', SVX: 'Екатеринбург' };

const CITY_NAMES = {
  moscow: 'Москва', bishkek: 'Бишкек', osh: 'Ош', istanbul: 'Стамбул', dubai: 'Дубай',
  almaty: 'Алматы', astana: 'Астана', tashkent: 'Ташкент', grozny: 'Грозный',
  'saint petersburg': 'Санкт-Петербург', sochi: 'Сочи', kazan: 'Казань',
};

export function russianCity(value, airports = []) {
  const text = String(value || '').trim();
  return airports.find((airport) => airport.code === text.toUpperCase())?.city
    || AIRPORT_CITIES[text.toUpperCase()] || CITY_NAMES[text.toLowerCase()] || (/^[A-Z]{3}$/i.test(text) ? '' : text);
}

const AIRPORT_TIMEZONES = {
  FRU: 'Asia/Bishkek', OSS: 'Asia/Bishkek', SVO: 'Europe/Moscow', DME: 'Europe/Moscow',
  VKO: 'Europe/Moscow', LED: 'Europe/Moscow', GRV: 'Europe/Moscow', AER: 'Europe/Moscow',
  IST: 'Europe/Istanbul', SAW: 'Europe/Istanbul', DXB: 'Asia/Dubai', DOH: 'Asia/Qatar',
  ALA: 'Asia/Almaty', TAS: 'Asia/Tashkent',
};

function endpointTimestamp(value, code) {
  if (!value || !AIRPORT_TIMEZONES[code] || !/(Z|[+-]\d{2}:?\d{2})$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: AIRPORT_TIMEZONES[code], day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function detail(service) {
  return service.details?.[service.kind] || Object.values(service.details || {})[0] || {};
}

function itinerary(service) {
  const sources = [service.itinerary, service.hotel_details?.itinerary, service.offer?.itinerary, service.svcOffer?.itinerary];
  return sources.find((value) => value && Object.keys(value).length) || {};
}

// Supplier dates are local to each endpoint. Do not convert them to the browser timezone.
export function travelDate(value, withTime = false) {
  const text = String(value || '');
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(text);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}${withTime && iso[4] ? ' • ' + iso[4] : ''}`;
  return withTime ? text.replace(/,?\s+(\d{2}:\d{2})$/, ' • $1') : text;
}

export function serviceFlightSegments(service) {
  service = presentationService(service);
  const trip = itinerary(service), d = detail(service);
  if (trip.segments?.length) return trip.segments;
  const route = String(d.route || service.title || '').split(/[→⇆–—]/).map((part) => part.trim().split(' · ')[0]);
  const dateTime = (date, time) => time ? `${travelDate(date)}${date ? ', ' : ''}${time}` : date;
  return [{
    origin: d.from || d.origin || route[0], destination: d.to || d.destination || route[1],
    origin_city: d.fromCity, destination_city: d.toCity,
    departure: dateTime(d.depDate, d.depTime) || endpointTimestamp(service.starts_at, d.from || d.origin || route[0]),
    arrival: dateTime(d.arrDate || d.depDate, d.arrTime) || endpointTimestamp(service.ends_at, d.to || d.destination || route[1]),
    flight_number: d.flightNo || String(service.title || '').split(' · ')[1] || '',
  }];
}

export function serviceSummary(service, airports = []) {
  service = presentationService(service);
  const d = detail(service), trip = itinerary(service);
  if (service.kind === 'Авиа') {
    const segments = serviceFlightSegments(service), first = segments[0], last = segments.at(-1);
    const city = (segment, side) => russianCity(segment[side + '_city_ru'] || segment[side + '_city'] || segment[side], airports);
    const endpoint = (segment, side) => city(segment, side) || segment[side];
    const mirroredReturn = segments.length > 1 && segments.length % 2 === 0 && segments.every((segment, index) => {
      const reverse = segments[segments.length - 1 - index];
      return endpoint(segment, 'origin') && endpoint(segment, 'destination')
        && endpoint(segment, 'origin') === endpoint(reverse, 'destination')
        && endpoint(segment, 'destination') === endpoint(reverse, 'origin');
    });
    const roundTrip = mirroredReturn || /⇆/.test(d.route || service.title || '');
    const destination = mirroredReturn ? segments[segments.length / 2 - 1] : last;
    const from = city(first, 'origin'), to = city(destination, 'destination');
    const separator = roundTrip ? '⇆' : '→';
    const departure = travelDate(first.departure, true), arrival = travelDate(last.arrival, true);
    return {
      title: [from || 'Город вылета не указан', to || 'Город прилёта не указан'].join(` ${separator} `),
      dates: !departure && !arrival && service.date ? service.date : `${departure || 'Вылет не указан'} ${separator} ${arrival || 'Прилёт не указан'}`,
    };
  }
  if (service.kind === 'Гостиница') {
    const hotel = trip.property_name || d.name || service.title?.split(' · ')[0] || 'Гостиница';
    const cityFromName = Object.keys(CITY_NAMES).find((name) => new RegExp(`\\b${name}\\b`, 'i').test(hotel));
    const city = russianCity(trip.city_name_ru || trip.city_name || trip.city || d.city || cityFromName, airports);
    const start = travelDate(trip.check_in || d.checkIn || service.starts_at);
    const end = travelDate(trip.check_out || d.checkOut || service.ends_at);
    return { title: `${city || 'Город не указан'} · ${hotel}`, dates: !start && !end && service.date ? service.date : `${start || 'Заезд не указан'} → ${end || 'Выезд не указан'}` };
  }
  const transport = ['ЖД', 'Трансфер', 'Автобус', 'Аэроэкспресс'].includes(service.kind);
  const rawRoute = String(d.route || trip.route || service.title || '').split(' · ')[0].split(/[→–—]/).map((part) => part.trim());
  const from = russianCity(trip.origin_city_ru || trip.origin_city || trip.origin || d.from || (rawRoute.length > 1 ? rawRoute[0] : ''), airports);
  const to = russianCity(trip.destination_city_ru || trip.destination_city || trip.destination || d.to || (rawRoute.length > 1 ? rawRoute.at(-1) : ''), airports);
  const departure = travelDate(trip.departure || trip.pickup_time || d.depDate || d.date || service.starts_at, transport);
  const arrival = travelDate(trip.arrival || service.ends_at, transport);
  const title = transport && from && to ? `${from} → ${to}` : (trip.description || d.name || service.title || service.kind || 'Услуга');
  return { title, dates: [departure, arrival && arrival !== departure ? arrival : ''].filter(Boolean).join(' → ') || service.date || 'Даты не указаны' };
}

export function serviceStayDetails(service) {
  const trip = itinerary(service), d = detail(service);
  return [
    ['Адрес', trip.address || d.address], ['Номер', trip.room || d.room],
    ['Питание', trip.meal_plan || d.board], ['Время заезда', trip.check_in_time],
    ['Время выезда', trip.check_out_time], ['Ночей', trip.nights || d.nights],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
}


export function serviceBookingReference(service) {
  const d = detail(service), booking = service.hotel_details?.booking || {};
  return String(service.booking_reference || d.pnr || d.bookingNo || booking.reference_number || booking.order_id || service.external_id || '');
}


export function serviceDetailRows(service) {
  service = presentationService(service);
  const trip = itinerary(service), d = detail(service);
  const fields = { route: 'Маршрут', depDate: 'Дата отправления', depTime: 'Время отправления', arrDate: 'Дата прибытия', arrTime: 'Время прибытия', cabin: 'Класс обслуживания', trainNo: 'Номер поезда', car_class: 'Класс автомобиля', capacity: 'Пассажиров в автомобиле', luggage_capacity: 'Мест для багажа', description: 'Описание', name: 'Название', address: 'Адрес', city: 'Город', origin: 'Отправление', destination: 'Прибытие', train_number: 'Номер поезда', carrier: 'Перевозчик', car_type: 'Тип вагона', service_class: 'Класс обслуживания', places: 'Доступно мест', vehicle: 'Автомобиль', vehicle_class: 'Класс автомобиля', room: 'Номер', meal_plan: 'Питание', coverage: 'Покрытие', policy_number: 'Номер полиса', country: 'Страна', insured_amount: 'Страховая сумма', visa_type: 'Тип визы', duration: 'Продолжительность', meeting_point: 'Место встречи', notes: 'Примечание' };
  const source = { ...d, ...trip };
  const rows = Object.entries(fields).filter(([key]) => source[key] !== undefined && source[key] !== null && source[key] !== '').map(([key, label]) => ({ label, value: typeof source[key] === 'object' ? Object.values(source[key]).filter((value) => typeof value !== 'object').join(' · ') : String(source[key]) }));
  if (service.title && !rows.some((row) => row.value === service.title)) rows.unshift({ label: 'Услуга', value: service.title });
  return rows;
}

// Technical identifiers stay visible below the human-readable route in every view.
export function serviceTechnicalLabel(service) {
  service = presentationService(service);
  if (service.kind !== 'Авиа') return service.sub && service.sub !== service.title ? service.sub : '';
  const routeLabel = serviceFlightSegments(service).map((segment) => {
    const route = [segment.origin, segment.destination].filter(Boolean).join(' → ');
    const number = [segment.airline, segment.flight_number].filter(Boolean).join(' ');
    return [route, number].filter(Boolean).join(' · ');
  }).join(' / ');
  return [routeLabel, service.sub && service.sub !== routeLabel ? service.sub : ''].filter(Boolean).join(' · ');
}

export function serviceExpandedRows(service) {
  service = presentationService(service);
  const rows = service.kind === 'Гостиница'
    ? serviceStayDetails(service).map(([label, value]) => ({ label, value }))
    : serviceDetailRows(service);
  const fare = service.fare || {};
  const cabin = { economy: 'Эконом', premium_economy: 'Премиум-эконом', business: 'Бизнес', first: 'Первый' };
  const fields = { cabin: 'Класс перелёта', booking_class: 'Класс бронирования', baggage: 'Багаж', hand_baggage: 'Ручная кладь', cabin_baggage: 'Ручная кладь', fare_basis: 'Тариф' };
  const segments = service.kind === 'Авиа' ? serviceFlightSegments(service) : [];
  const sources = segments.length ? segments.map((segment) => ({ ...fare, ...segment })) : [fare];
  sources.forEach((source, index) => Object.entries(fields).forEach(([key, label]) => {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      const value = key === 'cabin' ? cabin[source[key]] || source[key] : String(source[key]);
      rows.push({ label: segments.length > 1 ? `${label} · участок ${index + 1}` : label, value });
    }
  }));
  if (service.kind === 'Авиа') {
    if (!rows.some((row) => row.label.startsWith('Класс перелёта'))) rows.push({ label: 'Класс перелёта', value: 'Не указан' });
    if (!rows.some((row) => row.label.startsWith('Багаж'))) rows.push({ label: 'Багаж', value: 'Не указан' });
  }
  const booking = serviceBookingReference(service);
  if (booking) rows.push({ label: 'Бронирование', value: booking });
  return rows;
}
