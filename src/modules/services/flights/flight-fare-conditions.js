import { baggageLabel } from './flight-service-details.js';

const boolean = value => value === true || value === 'true' ? true : value === false || value === 'false' ? false : null;
const fields = [
  { k: 'Багаж', icon: 'luggage', keys: ['baggage'], absent: 'Не включён' },
  { k: 'Ручная кладь', icon: 'briefcase', keys: ['hand_baggage', 'cabin_baggage', 'carry_on'], absent: 'Не включена' },
  { k: 'Возврат', icon: 'refund', keys: ['refundable'], yes: 'Разрешён', no: 'Невозвратный' },
  { k: 'Обмен', icon: 'swap', keys: ['changeable', 'exchangeable'], yes: 'Разрешён', no: 'Не разрешён' },
];

// Search providers may supply allowances per segment rather than in the fare.
// Keep unknown conditions distinct from an explicit prohibition.
export function flightFareConditions(source = {}) {
  const fare = source.fare && typeof source.fare === 'object' ? source.fare : {};
  const segments = source.itinerary?.segments?.length ? source.itinerary.segments : [{}];
  return fields.map(field => {
    const values = segments.map(segment => {
      const candidates = [...field.keys.map(key => segment[key]), ...field.keys.map(key => fare[key])];
      let v = 'Не указано', tone = 'unknown';
      if (field.yes) {
        const allowed = candidates.map(boolean).find(value => value !== null);
        if (allowed !== undefined) { v = allowed ? field.yes : field.no; tone = allowed ? 'green' : 'red'; }
      } else {
        const label = candidates.map(baggageLabel).find(Boolean);
        if (label) { v = label === 'Без багажа' ? field.absent : label; tone = label === 'Без багажа' ? 'red' : label === 'Норма не передана' ? 'unknown' : 'green'; }
      }
      return { v, tone, route: [segment.origin, segment.destination].filter(Boolean).join(' → ') };
    });
    const same = values.every(value => value.v === values[0].v && value.tone === values[0].tone);
    return { k: field.k, icon: field.icon, v: same ? values[0].v : 'По сегментам', tone: same ? values[0].tone : 'mixed', ...(same ? {} : { segments: values }) };
  });
}
