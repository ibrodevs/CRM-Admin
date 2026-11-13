import { dateWithinBounds } from '../../shared/ui/date-range.js';
import { passengerCriteria, transferChildSeats } from './search/passenger-composition.js';
import { resultsOf } from '../../shared/api/client.js';

export function freeBookingDate(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return undefined;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return value || undefined;
}
export function validateFreeServiceSearch(routeKey, form, today = new Date()) {
  const date = form.date || form.dt || form.dep;
  const origin = form.from || form.airport;
  if (!String(origin || '').trim() || (routeKey !== 'lounge' && !String(form.to || '').trim()) || !freeBookingDate(date)) return 'Заполните маршрут и дату поездки';
  if (!dateWithinBounds(freeBookingDate(date), today)) return 'Дата поездки должна быть не раньше сегодняшнего дня';
  if (!Number.isInteger(form.pax) || form.pax < 1) return 'Укажите хотя бы одного пассажира или гостя';
  const returning = form.trip === 'rt';
  const ret = form.retDate || form.ret;
  if (returning && (!dateWithinBounds(freeBookingDate(ret), today) || freeBookingDate(ret) < freeBookingDate(date))) return 'Выберите дату возвращения не раньше отправления';
  if (routeKey === 'transfers' || routeKey === 'rail') {
    try { if (routeKey === 'transfers') transferProviderCriteria(form); else passengerCriteria(form, 'rail'); } catch (error) { return error.message; }
  }
  return null;
}
export async function waitFreeBookingOffers(api, searchId, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await api.searchStatus(searchId);
    if (status.status === 'cancelled') throw new Error('Поиск отменён');
    if (status.status === 'failed') throw new Error('Поставщики не вернули варианты');
    if (['completed', 'partial'].includes(status.status)) {
      const payload = await api.offers(searchId, { page_size: 100 });
      const rows = [...resultsOf(payload)];
      for (let page = 2; rows.length < payload.count; page += 1) {
        const batch = resultsOf(await api.offers(searchId, { page_size: 100, page }));
        if (!batch.length) break;
        rows.push(...batch);
      }
      return rows;
    }
    await pause(500);
  }
  throw new Error('Поиск занимает больше обычного. Повторите попытку.');
}
export function freeBookingAvailabilityTags(tags) {
  return (tags || []).filter((tag) => typeof tag === 'string');
}

export function transferDepartureParts(form) {
  const [date = '', clock = ''] = String(form.departure_time || '').split(/[ T]/);
  return {
    date: Object.hasOwn(form, 'departure_date') ? freeBookingDate(form.departure_date) || '' : date,
    clock: Object.hasOwn(form, 'departure_clock') ? form.departure_clock || '' : clock,
  };
}

export function transferProviderCriteria(form) {
  const day = freeBookingDate(form.dt || form.date);
  const departure = transferDepartureParts(form);
  const validClock = (value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (form.pickup_clock && !validClock(form.pickup_clock)) throw new Error('Выберите корректное время подачи');
  if ((departure.date || departure.clock) && (!/^\d{4}-\d{2}-\d{2}$/.test(departure.date) || !validClock(departure.clock))) {
    throw new Error('Выберите и дату, и время отправления рейса или поезда');
  }
  return {
    ...passengerCriteria(form, 'transfer'),
    additional_service_types: [...new Set([...(form.additional_service_types || []), ...transferChildSeats(form)])],
    text_tablet: form.text_tablet || undefined,
    origin_address: form.from || '', destination_address: form.to || '',
    start_place_point: form.start_point || '', finish_place_point: form.finish_point || '',
    pickup_time: day && form.pickup_clock ? `${day} ${form.pickup_clock}` : undefined,
    departure_time: departure.date && departure.clock ? `${departure.date} ${departure.clock}` : undefined,
    flight_number: !form.arrival_transport || form.arrival_transport === 'flight' ? form.flight_number || undefined : undefined,
    train_number: !form.arrival_transport || form.arrival_transport === 'train' ? form.train_number || undefined : undefined,
  };
}
