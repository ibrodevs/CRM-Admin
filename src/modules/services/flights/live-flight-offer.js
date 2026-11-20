import { resolveCurrency } from '../../../shared/lib/money.js';
import { technicalStopsOf } from './technical-stops.js';
import { flightJourneys } from './itinerary.js';
const localClock = value => String(value || '').match(/[T ](\d{2}:\d{2})/)?.[1] || '—';
const localDate = value => { const day = String(value || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T00:00:00Z`).toLocaleDateString('ru-RU', { day:'2-digit', month:'short', timeZone:'UTC' }) : '—'; };
export function liveFlightLeg(segment) {
  const dep = segment.departure ? new Date(segment.departure) : null;
  const arr = segment.arrival ? new Date(segment.arrival) : null;
  const minutes = dep && arr ? Math.max(0, Math.round((arr - dep) / 60000)) : 0;
  return {
    from: segment.origin || '—', to: segment.destination || '—',
    dep: localClock(segment.departure),
    arr: localClock(segment.arrival),
    date: localDate(segment.departure), arrivalDate: localDate(segment.arrival),
    dur: Math.floor(minutes / 60) + 'ч ' + String(minutes % 60).padStart(2, '0') + 'м',
    stops: 0,
    stopText: 'Прямой',
    flightNo: [segment.airline, segment.flight_number].filter(Boolean).join(' '),
    technicalStops: technicalStopsOf(segment),
  };
}
function liveFlightJourney(segments) {
  const first = liveFlightLeg(segments[0] || {}), last = liveFlightLeg(segments.at(-1) || {});
  const minutes = Math.max(0, (new Date(segments.at(-1)?.arrival) - new Date(segments[0]?.departure)) / 60000);
  return { ...first, to: last.to, arr: last.arr, arrivalDate:last.arrivalDate, stops: Math.max(0, segments.length - 1),
    dur: Number.isFinite(minutes) ? `${Math.floor(minutes / 60)}ч ${String(Math.round(minutes % 60)).padStart(2, '0')}м` : first.dur,
    flightNo: segments.map(s => [s.airline, s.flight_number].filter(Boolean).join(' ')).join(' · '),
    segs: segments.map(liveFlightLeg),
    layovers: segments.slice(0, -1).map((s, i) => {
      const wait = Math.max(0, (new Date(segments[i + 1].departure) - new Date(s.arrival)) / 60000);
      return { at: s.destination, dur: Number.isFinite(wait) ? `${Math.floor(wait / 60)}ч ${Math.round(wait % 60)}м` : '' };
    }),
    stopText: segments.length > 1 ? `${segments.length - 1} перес. · ${segments.slice(0, -1).map(s => s.destination).join(', ')}` : 'Прямой' };
}
export function liveFlightOffer(offer, params = {}) {
  const segment = offer.itinerary?.segments?.[0] || {};
  const journeys = flightJourneys(offer, params).map(liveFlightJourney);
  return {
    ...offer, id: offer.id, _backendOfferId: offer.id, airline: segment.airline || '—', supplier: offer.provider_adapter || 'Подключённый поставщик',
    refundable: offer.fare?.refundable === true || offer.fare?.refundable === 'true', baggage: offer.fare?.baggage === '0PC' ? 'Без багажа' : (offer.fare?.baggage || '—'),
    cabin: offer.fare?.cabin || '—', fareName: offer.fare?.booking_class ? `Класс ${offer.fare.booking_class}` : '—',
    seatsLeft: offer.availability?.seats == null ? null : Number(offer.availability.seats), out: journeys[0] || liveFlightLeg(segment), back: journeys[1] || null, journeys,
    fare: Number(offer.price?.amount || 0), fee: 0, currency: resolveCurrency(offer.price?.currency),
  };
}
