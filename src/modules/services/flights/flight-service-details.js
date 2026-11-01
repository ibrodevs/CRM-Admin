import { plural } from '../../../shared/ui/plural.js';

const CABINS = { economy: 'Эконом', business: 'Бизнес', first: 'Первый', premium_economy: 'Премиум-эконом', premium: 'Премиум-эконом' };
const present = (value) => value !== undefined && value !== null && value !== '';
const first = (...values) => values.find(present);

function text(value) {
  if (!present(value)) return '';
  if (typeof value === 'object') {
    if (value.description || value.text) return String(value.description || value.text);
    return [value.pieces != null ? `${value.pieces} ${plural(Number(value.pieces), ['место', 'места', 'мест'])}` : '', value.weight != null ? `${value.weight} ${value.unit || 'кг'}` : ''].filter(Boolean).join(' · ');
  }
  return String(value);
}

export function baggageLabel(value) {
  if (!present(value)) return '';
  const raw = text(value).trim();
  if (/^(0PC|0|NO|NONE)$/i.test(raw) || value === false) return 'Без багажа';
  const pieces = /^(\d+)\s*PC$/i.exec(raw);
  if (pieces) return `${pieces[1]} ${Number(pieces[1]) === 1 ? 'место' : Number(pieces[1]) < 5 ? 'места' : 'мест'}`;
  return raw.replace(/(\d)\s*(KG|KGS)\b/i, '$1 кг');
}

export function flightServiceDetails(service, segments = []) {
  const detail = service.details?.['Авиа'] || {};
  const fare = { ...(service.cancellation_rules || {}), ...(service.offer?.fare && typeof service.offer.fare === 'object' ? service.offer.fare : {}), ...(service.fare && typeof service.fare === 'object' ? service.fare : {}) };
  const sourceSegments = segments.length ? segments : service.itinerary?.segments || [];
  const rows = (sourceSegments.length ? sourceSegments : [{}]).map((segment, index) => {
    const cabin = text(first(segment.cabin, fare.cabin, detail.cabin, service.offer?.cabin));
    const bookingClass = text(first(segment.booking_class, fare.booking_class, detail.bookingClass));
    const baggage = baggageLabel(first(segment.baggage, fare.baggage, detail.baggage, service.offer?.baggage));
    const handBaggage = baggageLabel(first(segment.hand_baggage, segment.cabin_baggage, fare.hand_baggage, fare.cabin_baggage, detail.handBaggage));
    const fareName = text(first(fare.fare_name, fare.name, fare.brand, detail.fareName, service.offer?.fareName));
    const fareBasis = text(first(segment.fare_basis, fare.fare_basis, detail.fareBasis));
    const refundable = first(segment.refundable, fare.refundable, service.offer?.refundable);
    const changeable = first(segment.changeable, fare.changeable, fare.exchangeable);
    const primary = [
      { label: 'Класс перелёта', value: CABINS[cabin.toLowerCase()] || cabin || 'Не указан', icon: 'ticket' },
      { label: 'Багаж', value: baggage || 'Не указан', icon: 'briefcase' },
      ...(handBaggage ? [{ label: 'Ручная кладь', value: handBaggage === 'Без багажа' ? 'Не включена' : handBaggage, icon: 'briefcase' }] : []),
      ...(fareName ? [{ label: 'Тариф', value: fareName, icon: 'ticket' }] : []),
    ];
    const extra = [
      ...(bookingClass ? [{ label: 'Класс бронирования', value: bookingClass }] : []),
      ...(fareBasis ? [{ label: 'Код тарифа', value: fareBasis }] : []),
      ...(typeof refundable === 'boolean' ? [{ label: 'Возврат', value: refundable ? 'Разрешён по условиям тарифа' : 'Не предусмотрен тарифом' }] : []),
      ...(typeof changeable === 'boolean' ? [{ label: 'Обмен', value: changeable ? 'Разрешён по условиям тарифа' : 'Не предусмотрен тарифом' }] : []),
    ];
    return { key: index, route: [segment.origin, segment.destination].filter(Boolean).join(' → '), primary, extra };
  });
  // Shared fare conditions appear once; differing segment fares keep their own route.
  const same = rows.every((row) => JSON.stringify([row.primary, row.extra]) === JSON.stringify([rows[0].primary, rows[0].extra]));
  return same ? [{ ...rows[0], route: '' }] : rows;
}
