import { resultsOf } from '../../shared/api/client.js';

export function freeBookingDate(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return undefined;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return value || undefined;
}
export function validateFreeServiceSearch(routeKey, form) {
  const date = form.date || form.dt || form.dep;
  const origin = form.from || form.airport;
  if (!String(origin || '').trim() || (routeKey !== 'lounge' && !String(form.to || '').trim()) || !freeBookingDate(date)) return 'Заполните маршрут и дату поездки';
  if (!Number.isInteger(form.pax) || form.pax < 1) return 'Укажите хотя бы одного пассажира или гостя';
  const returning = form.trip === 'rt';
  const ret = form.retDate || form.ret;
  if (returning && (!freeBookingDate(ret) || freeBookingDate(ret) < freeBookingDate(date))) return 'Выберите дату возвращения не раньше отправления';
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
