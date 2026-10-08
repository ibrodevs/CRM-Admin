import { resolveCurrency } from '../../../shared/lib/money.js';
import { resultsOf } from '../../../shared/api/client.js';

// Counts belong to the free search; no order or participant IDs exist yet.
export function freeFlightSegments(params) {
  return params.segments?.length ? params.segments : [
    { from: params.from, to: params.to, date: params.depDate },
    { from: params.to, to: '', date: null },
  ];
}
export function freeFlightDate(value) {
  if (!(value instanceof Date)) return value || undefined;
  if (!Number.isFinite(value.getTime())) return undefined;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function validateFreeFlightSearch(params) {
  const segments = params.trip === 'mc' ? freeFlightSegments(params) : [{ from: params.from, to: params.to, date: params.depDate }];
  if (segments.some((s) => !s.from || !s.to || !freeFlightDate(s.date)) || (params.trip === 'rt' && !freeFlightDate(params.retDate))) return 'Заполните маршрут и даты поездки';
  if (segments.some((s) => s.from === s.to)) return 'Выберите разные аэропорты отправления и прибытия';
  if (params.trip === 'rt' && freeFlightDate(params.retDate) < freeFlightDate(params.depDate)) return 'Дата возвращения должна быть не раньше вылета';
  if (params.trip === 'mc' && segments.some((s, i) => i > 0 && freeFlightDate(s.date) < freeFlightDate(segments[i - 1].date))) return 'Даты перелётов должны идти по порядку';
  if (!(params.pax?.adt >= 1)) return 'Укажите хотя бы одного взрослого пассажира';
  return null;
}
export function freeFlightCriteria(params) {
  const pax = params.pax;
  const first = params.trip === 'mc' ? freeFlightSegments(params)[0] : { from: params.from, to: params.to, date: params.depDate };
  return {
    origin: first.from, destination: first.to, date: freeFlightDate(first.date),
    ...(params.trip === 'rt' ? { return_date: freeFlightDate(params.retDate) } : {}),
    cabin: { 'Эконом': 'economy', 'Комфорт': 'premium_economy', 'Бизнес': 'business', 'Первый': 'first' }[params.cabin] || 'economy',
    passengers: pax.adt + pax.chd + pax.infNoSeat + pax.infSeat,
    // Preserve the detailed mask alongside the current numeric passengers contract.
    passenger_types: { adults: pax.adt, children: pax.chd, infants_without_seat: pax.infNoSeat, infants_with_seat: pax.infSeat },
    special_categories: { ...pax.special }, subsidized_programs: { ...pax.subsidized },
    same_class: !!params.sameClass, allow_different_classes: !!params.allowDiffClasses,
    seek_subsidized: !!params.seekSubsidized, seek_group_fares: !!params.seekGroupFares,
    baggage: !!params.baggage, flexible_dates: !!params.flex, direct_only: !!params.direct, airline: params.airline || '',
    currency: resolveCurrency(params.currency), trip: params.trip,
    ...(params.trip === 'mc' ? { segments: freeFlightSegments(params).map((s) => ({ origin: s.from, destination: s.to, date: freeFlightDate(s.date) })) } : {}),
  };
}
export async function searchFreeFlightOffers(params, api, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  const created = await api.search({ kind: 'avia', criteria: freeFlightCriteria(params) });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await api.searchStatus(created.search_id);
    if (['completed', 'partial', 'failed', 'cancelled'].includes(status.status)) {
      if (status.status === 'cancelled') throw new Error('Поиск отменён');
      if (status.status === 'failed') throw new Error('Поставщики не вернули варианты перелёта');
      const payload = await api.offers(created.search_id, { page_size: 100 });
      const rows = resultsOf(payload);
      for (let page = 2; rows.length < payload.count; page += 1) {
        const batch = resultsOf(await api.offers(created.search_id, { page_size: 100, page }));
        if (!batch.length) break;
        rows.push(...batch);
      }
      return rows;
    }
    await pause(500);
  }
  throw new Error('Поиск занимает больше обычного. Повторите попытку.');
}
export function freeFlightDraft(offer, params) {
  return {
    ...offer, _backendOfferId: offer._backendOfferId || offer.id,
    title: (offer.itinerary?.segments || []).map((s) => `${s.origin} → ${s.destination}`).join(' · '),
    cost: Number(offer.backendOffer?.price?.amount ?? offer.fare), currency: offer.currency,
    searchCriteria: freeFlightCriteria(params), selectedOffer: offer.backendOffer || offer,
  };
}

// Fare tiles represent real alternatives for the same itinerary, provider and currency.
export function freeFlightFareOptions(selected, offers) {
  const route = (offer) => JSON.stringify((offer.itinerary?.segments || []).map((s) => [s.origin, s.destination, s.departure, s.arrival, s.airline, s.flight_number]));
  const provider = (offer) => offer.provider ?? offer.backendOffer?.provider ?? offer.provider_adapter;
  if (!selected.itinerary?.segments?.length) return [selected];
  const signature = route(selected);
  const matching = offers.filter((offer) => route(offer) === signature && provider(offer) === provider(selected) && offer.currency === selected.currency);
  return [...new Map([selected, ...matching].map((offer) => [offer.id, offer])).values()];
}
export function freeFlightLocalPassengers(pax) {
  return [
    ['adt', 'Взрослый'], ['chd', 'Ребёнок 2–11'], ['infNoSeat', 'Младенец без места'], ['infSeat', 'Младенец с местом'],
  ].flatMap(([key, role]) => Array.from({ length: pax[key] || 0 }, (_, i) => ({ id: `${key}-${i}`, name: `${role} ${i + 1}`, role })));
}
export function freeFlightFareDetails(offer) {
  const fare = offer.backendOffer?.fare || {};
  const features = [];
  if (fare.baggage != null) features.push({ text: fare.baggage === '0PC' ? 'Багаж не включён' : `Багаж: ${fare.baggage}`, ok: fare.baggage !== '0PC' });
  if (fare.refundable != null) features.push({ text: fare.refundable ? 'Возвратный' : 'Невозвратный', ok: !!fare.refundable });
  const rules = [
    ...(fare.refundable == null ? [] : [{ k: 'Возврат', v: fare.refundable ? 'Возвратный' : 'Невозвратный', tone: fare.refundable ? 'green' : 'red' }]),
    ...(fare.baggage == null ? [] : [{ k: 'Багаж', v: fare.baggage, tone: fare.baggage === '0PC' ? 'red' : 'green' }]),
  ];
  return { name: fare.name || fare.brand || offer.fareName, code: fare.booking_class || '—', cabin: { economy: 'Эконом', premium_economy: 'Комфорт', business: 'Бизнес', first: 'Первый' }[fare.cabin] || offer.cabin, features, rules };
}
