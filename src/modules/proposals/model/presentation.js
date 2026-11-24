import { airportOption } from '../../locations/model.js';
import { travelDate } from '../../../shared/lib/service-presentation.js';

export function readableServiceTitle(value) {
  return String(value || '').replace(/\b(?:city:)?([A-Z]{3})\b/g, (code, iata) => {
    const option = airportOption(code) || airportOption(iata);
    return option?.city ? `${option.city} (${iata})` : code;
  });
}
export function proposalContext(payload = {}) {
  const start = travelDate(payload.travel_start), end = travelDate(payload.travel_end);
  return { recipient: payload.recipient || 'Получатель не указан', route: readableServiceTitle(payload.route) || 'Направление не указано', dates: start ? start + (end && end !== start ? ` — ${end}` : '') : 'Даты поездки не указаны' };
}
