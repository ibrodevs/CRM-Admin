import test from 'node:test';
import assert from 'node:assert/strict';
import { freeFlightFareDetails } from '../src/modules/services/flights/free-flight-search.js';

const condition = (details, label) => details.rules.find(rule => rule.k === label);

test('TTBooking segment baggage appears even when the fare contains only booking metadata', () => {
  const details = freeFlightFareDetails({ backendOffer: { fare: { booking_class: 'Y' }, itinerary: { segments: [{ baggage: '1PC', hand_baggage: '8KG' }] } } });
  assert.equal(condition(details, 'Багаж').v, '1 место');
  assert.equal(condition(details, 'Ручная кладь').v, '8 кг');
  assert.equal(condition(details, 'Возврат').tone, 'unknown');
});

test('explicit false and string false remain prohibited, never treated as truthy', () => {
  const details = freeFlightFareDetails({ fare: { baggage: '0PC', cabin_baggage: false, refundable: 'false', exchangeable: true } });
  assert.equal(condition(details, 'Багаж').v, 'Не включён');
  assert.equal(condition(details, 'Ручная кладь').v, 'Не включена');
  assert.equal(condition(details, 'Возврат').v, 'Невозвратный');
  assert.equal(condition(details, 'Обмен').v, 'Разрешён');
});

test('different segment allowances are retained with route labels instead of the first segment only', () => {
  const details = freeFlightFareDetails({ backendOffer: { fare: { baggage: '2PC', refundable: true }, itinerary: { segments: [
    { origin: 'FRU', destination: 'IST', baggage: '0PC' },
    { origin: 'IST', destination: 'SVO', baggage: { pieces: 1, weight: 23 } },
  ] } } });
  const baggage = condition(details, 'Багаж');
  assert.equal(baggage.tone, 'mixed');
  assert.deepEqual(baggage.segments.map(({ v, route }) => [v, route]), [['Не включён', 'FRU → IST'], ['1 место · 23 кг', 'IST → SVO']]);
  assert.equal(condition(details, 'Возврат').v, 'Разрешён');
});

test('derived flattened flags never turn missing supplier conditions into restrictions', () => {
  const details = freeFlightFareDetails({ fare: 1000, refundable: false, baggage: '—', backendOffer: { fare: {} } });
  assert.equal(details.rules.length, 4);
  assert.ok(details.rules.every(rule => rule.tone === 'unknown'));
});
