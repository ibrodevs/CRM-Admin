function calendarDate(value) {
  if (!(value instanceof Date)) return value || undefined;
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}

export function flightSearchCriteria(params, currency) {
  const pax = params.pax || {};
  return {
    origin: params.from, destination: params.to, date: calendarDate(params.depDate),
    ...(params.trip === 'rt' ? { return_date: calendarDate(params.retDate) } : {}),
    cabin: { 'Эконом': 'economy', 'Комфорт': 'premium', 'Премиум': 'premium', 'Бизнес': 'business', 'Первый': 'first' }[params.cabin] || params.cabin || 'economy',
    passengers: { adults: Number(pax.adt ?? 1), children: Number(pax.chd || 0), infants: Number(pax.infNoSeat || 0) + Number(pax.infSeat || 0) },
    direct_only: Boolean(params.direct), etickets_only: params.eticketsOnly ?? true,
    preferred_airlines: params.airline ? [params.airline] : [], currency, trip: params.trip,
    ...(params.trip === 'mc' ? { segments: (params.segments || []).map((segment) => ({ origin: segment.from, destination: segment.to, date: calendarDate(segment.date) })) } : {}),
  };
}

export function flightLegData(segments) {
  const first = segments[0] || {}, last = segments.at(-1) || first;
  const time = (value) => String(value || '').match(/T(\d{2}:\d{2})/)?.[1] || '—';
  const date = String(first.departure || '').slice(0, 10);
  const dated = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—';
  const hasZone = (value) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value || '');
  const duration = hasZone(first.departure) && hasZone(last.arrival)
    ? (new Date(last.arrival) - new Date(first.departure)) / 60000
    : segments.length === 1 ? first.duration_minutes ?? first.duration : null;
  const stops = Math.max(0, segments.length - 1);
  return {
    from: first.origin || '—', to: last.destination || '—', dep: time(first.departure), arr: time(last.arrival), date: dated,
    dur: duration != null && Number.isFinite(duration) && duration >= 0 ? `${Math.floor(duration / 60)}ч ${String(Math.round(duration % 60)).padStart(2, '0')}м` : '—',
    stops, stopText: stops ? `${stops} ${stops === 1 ? 'пересадка' : stops < 5 ? 'пересадки' : 'пересадок'} · ${segments.slice(0, -1).map((segment) => segment.destination).join(', ')}` : 'Прямой',
    flightNo: segments.map((segment) => [segment.airline, segment.flight_number].filter(Boolean).join(' ')).join(' / '),
  };
}
