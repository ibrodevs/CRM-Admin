import { resolveCurrency } from '../../../shared/lib/money.js';

export function freeBookingOfferId(service) {
  return service._backendOfferId || service.offerId || service.backendOfferId;
}

export function freeBookingAmount(service) {
  return Number(service.fareDeltaUsd || service.total || service.cost || service.price || service.sum || 0);
}

export function freeBookingTotals(services) {
  return services.reduce((totals, service) => {
    const currency = resolveCurrency(service.currency);
    totals[currency] = (totals[currency] || 0) + freeBookingAmount(service);
    return totals;
  }, {});
}

export function freeBookingServiceBody(service) {
  const offerId = freeBookingOfferId(service);
  if (offerId) return { offer_id: offerId };
  const kinds = { 'Авиа': 'avia', 'ЖД': 'rail', 'Гостиница': 'hotel', 'Отель': 'hotel', 'Трансфер': 'transfer', 'Страховка': 'insurance', 'Виза': 'visa', 'Тур': 'tour', 'Автобус': 'bus' };
  const kind = service.kind || 'avia';
  return {
    kind: kinds[kind] || kind,
    title: service.title || service.route || service.fareName || (service.from && service.to ? service.from + ' → ' + service.to : service.kind || 'Услуга'),
    currency: resolveCurrency(service.currency),
    client_total: freeBookingAmount(service),
    supplier_cost: service.cost || service.tariff || freeBookingAmount(service),
    agency_fee: service.fee || 0,
    markup: service.markup || 0,
  };
}
