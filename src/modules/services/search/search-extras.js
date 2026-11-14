import { transferChildSeats } from './passenger-composition.js';

export const TRANSFER_EXTRAS = [
  ['infant_seat', 'Кресло до 1 года'], ['seat', 'Кресло 1–3 года'],
  ['booster', 'Бустер от 3 лет'], ['table', 'Встреча с табличкой'], ['tollroad', 'Платная дорога'],
];

export function transferSearchExtras(form) {
  const required = transferChildSeats(form);
  return TRANSFER_EXTRAS.map(([id, label]) => ({
    id, label, quantity: Math.max(1, required.filter((type) => type === id).length),
    selected: required.includes(id) || (form.additional_service_types || []).includes(id),
    required: required.includes(id), amount: null,
  }));
}

// Only explicit supplier prices are amounts. An absent price is never a free extra.
export function offerSearchExtras(service) {
  const offer = service.selectedOffer || service;
  const fare = offer.fare || {};
  const selected = fare.selected_services || offer.iway?.selected_services || [];
  const included = (fare.additional_services || []).filter((row) => row.default_include);
  const unique = new Map();
  for (const row of [...included, ...selected]) {
    const id = String(row.type || row.id || row.name || row.title || '');
    if (!id) continue;
    const raw = row.price?.amount ?? row.price;
    const price = raw === null || raw === undefined || raw === '' ? null : Number(raw);
    unique.set(id, {
      id, label: TRANSFER_EXTRAS.find(([type]) => type === row.type)?.[1] || row.name || row.title || row.type || 'Дополнительная услуга',
      quantity: row.quantity > 0 ? Number(row.quantity) : 1,
      amount: row.default_include ? 0 : Number.isFinite(price) && price >= 0 ? price : null,
      currency: row.price?.currency || row.currency || offer.price?.currency || service.currency || 'RUB',
      included: Boolean(row.default_include), selected: true,
    });
  }
  return [...unique.values()];
}
