import assert from 'node:assert/strict';
import test from 'node:test';
import { flightSearchCriteria, flightLegData } from '../src/modules/services/flights/search-criteria.js';

test('flight search preserves adults, children, infants, premium, direct flights and airline', () => {
  const criteria = flightSearchCriteria({ from: 'FRU', to: 'IST', trip: 'rt', depDate: new Date(2027, 0, 1), retDate: new Date(2027, 0, 10),
    pax: { adt: 2, chd: 1, infNoSeat: 1, infSeat: 0 }, cabin: 'Комфорт', direct: true, airline: 'TK' }, 'RUB');
  assert.deepEqual(criteria.passengers, { adults: 2, children: 1, infants: 1 });
  assert.equal(criteria.cabin, 'premium');
  assert.equal(criteria.direct_only, true);
  assert.deepEqual(criteria.preferred_airlines, ['TK']);
  assert.equal(criteria.date, '2027-01-01');
  assert.equal(criteria.return_date, '2027-01-10');
});

test('one-way omits an old return date; multi-city preserves all route sections', () => {
  const oneWay = flightSearchCriteria({ trip: 'ow', retDate: '2027-01-10', cabin: 'Бизнес' }, 'RUB');
  assert.equal(Object.hasOwn(oneWay, 'return_date'), false);
  assert.equal(oneWay.cabin, 'business');
  const multi = flightSearchCriteria({ trip: 'mc', segments: [{ from: 'FRU', to: 'IST', date: new Date(2027, 0, 1) }, { from: 'IST', to: 'DXB', date: '2027-01-03' }, { from: 'DXB', to: 'FRU', date: '2027-01-10' }] }, 'RUB');
  assert.equal(multi.segments.length, 3);
  assert.deepEqual(multi.segments[0], { origin: 'FRU', destination: 'IST', date: '2027-01-01' });
});

test('airport local times stay local and connecting destination is the final segment', () => {
  const leg = flightLegData([{ origin: 'FRU', destination: 'IST', departure: '2027-01-01T08:00:00', arrival: '2027-01-01T11:00:00', airline: 'TK', flight_number: '347', duration_minutes: 300 },
    { origin: 'IST', destination: 'DXB', departure: '2027-01-01T13:00:00', arrival: '2027-01-01T17:00:00', airline: 'TK', flight_number: '349', duration_minutes: 240 }]);
  assert.equal(leg.from, 'FRU');
  assert.equal(leg.to, 'DXB');
  assert.equal(leg.dep, '08:00');
  assert.equal(leg.arr, '17:00');
  assert.equal(leg.stops, 1);
  assert.match(leg.stopText, /IST/);
  assert.equal(leg.dur, '—'); // Cross-zone elapsed duration is unavailable without offsets.
});

test('offset timestamps yield elapsed duration; one segment uses provider duration', () => {
  const leg = flightLegData([{ departure: '2027-01-01T08:00:00+06:00', arrival: '2027-01-01T10:00:00+03:00' }]);
  assert.equal(leg.dur, '5ч 00м');
  assert.equal(leg.dep, '08:00');
  assert.equal(flightLegData([{ departure: '2027-01-01T08:00:00', arrival: '2027-01-01T11:00:00', duration_minutes: 300 }]).dur, '5ч 00м');
});
