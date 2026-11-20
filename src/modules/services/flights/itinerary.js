import { airportOption, flightLocationCode } from './airport-options.js';

const locationMatches = (code, requested) => {
  const key = flightLocationCode(requested);
  if (key === code) return true;
  const target = airportOption(requested), airport = airportOption(code);
  return target?.kind === 'city' && target.city === airport?.city && target.country === airport?.country;
};
// A connection is another segment of the same journey, not a return flight.
export function flightJourneys(offer, params = {}) {
  const segments = offer?.itinerary?.segments || [];
  if (!segments.length) return [];
  if (segments.every(s => Number.isInteger(s.journey_index))) {
    const groups = new Map();
    for (const segment of segments) {
      if (!groups.has(segment.journey_index)) groups.set(segment.journey_index, []);
      groups.get(segment.journey_index).push(segment);
    }
    return [...groups.values()];
  }
  const targets = params?.trip === 'mc' ? (params.segments || []).map(s => s.to)
    : params?.trip === 'rt' ? [params.to, params.from] : [];
  if (!targets.length) return [segments];
  const groups = []; let current = [];
  for (const segment of segments) {
    current.push(segment);
    if (locationMatches(segment.destination, targets[groups.length])) { groups.push(current); current = []; }
  }
  if (current.length) groups.push(current);
  return groups;
}
export function flightCarriers(offer) {
  return [...new Set((offer.itinerary?.segments || []).map(s => s.airline).filter(Boolean).concat(offer.airline && offer.airline !== '—' ? [offer.airline] : []))];
}
export function matchesFlightFilters(offer, filter = {}, params = {}) {
  const segments = offer.itinerary?.segments || [];
  const journeys = flightJourneys(offer, params);
  const maxStops = Math.max(0, ...journeys.map(j => j.length - 1));
  const stops = maxStops >= 2 ? '2plus' : String(maxStops);
  const flight = String(filter.flightNo || '').replace(/[^a-zа-яё0-9]/gi, '').toLowerCase();
  if (flight && !segments.some(s => `${s.airline || ''}${s.flight_number || ''}`.replace(/[^a-zа-яё0-9]/gi, '').toLowerCase().includes(flight))) return false;
  if (filter.stops?.length && !filter.stops.includes(stops)) return false;
  if (filter.air?.length && !flightCarriers(offer).some(code => filter.air.includes(code))) return false;
  if (filter.sup?.length && !filter.sup.includes(offer.supplier)) return false;
  const bag = String(offer.baggage || '').trim().toLowerCase();
  if (filter.bagOnly && (!bag || ['—', '0', '0pc', '0kg', 'без багажа', 'нет'].includes(bag))) return false;
  if (filter.refundOnly && offer.refundable !== true) return false;
  return !(Number(filter.priceMax) > 0) || Number(offer.fare) + Number(offer.fee || 0) <= Number(filter.priceMax);
}
