const AIRPORT_CITIES = { GRV: 'Грозный', LED: 'Санкт-Петербург', VKO: 'Москва', ZIA: 'Москва', AER: 'Сочи', KZN: 'Казань', OVB: 'Новосибирск', SVX: 'Екатеринбург' };

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
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}${withTime && iso[4] ? ', ' + iso[4] : ''}`;
  return text;
}

export function serviceFlightSegments(service) {
  const trip = itinerary(service), d = detail(service);
  if (trip.segments?.length) return trip.segments;
  const route = String(d.route || service.title || '').split(/[→–—]/).map((part) => part.trim().split(' · ')[0]);
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
  const d = detail(service), trip = itinerary(service);
  if (service.kind === 'Авиа') {
    const segments = serviceFlightSegments(service), first = segments[0], last = segments.at(-1);
    const city = (segment, side) => russianCity(segment[side + '_city_ru'] || segment[side + '_city'] || segment[side], airports);
    const from = city(first, 'origin'), to = city(last, 'destination');
    const departure = travelDate(first.departure, true), arrival = travelDate(last.arrival, true);
    return {
      title: [from || 'Город вылета не указан', to || 'Город прилёта не указан'].join(' – '),
      dates: `${departure || 'Вылет не указан'} — ${arrival || 'Прилёт не указан'}`,
    };
  }
  if (service.kind === 'Гостиница') {
    const hotel = trip.property_name || d.name || service.title?.split(' · ')[0] || 'Гостиница';
    const cityFromName = Object.keys(CITY_NAMES).find((name) => new RegExp(`\\b${name}\\b`, 'i').test(hotel));
    const city = russianCity(trip.city_name_ru || trip.city_name || trip.city || d.city || cityFromName, airports);
    const start = travelDate(trip.check_in || d.checkIn || service.starts_at);
    const end = travelDate(trip.check_out || d.checkOut || service.ends_at);
    return { title: `${city || 'Город не указан'} · ${hotel}`, dates: `${start || 'Заезд не указан'} — ${end || 'Выезд не указан'}` };
  }
  return null;
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
