import test from 'node:test';
import assert from 'node:assert/strict';
import { hotelDateOnly, hotelCitizenship, revalidationNeedsConfirmation } from '../src/modules/services/hotels/search-criteria.js';

test('hotel dates retain the selected local calendar day', () => {
  assert.equal(hotelDateOnly(new Date(2027, 2, 10)), '2027-03-10');
  assert.equal(hotelDateOnly(null), undefined);
});

test('citizenship passes ISO codes rather than supplier dictionary IDs', () => {
  assert.equal(hotelCitizenship('Кыргызстан'), 'KG');
  assert.equal(hotelCitizenship('РФ'), 'RU');
  assert.equal(hotelCitizenship('Все'), undefined);
});

test('a changed price or currency requires review before attaching', () => {
  const previous = { cost: 120.25, currency: 'EUR' };
  const result = { offer: { price: { amount: '120.25', currency: 'EUR' } }, revalidation: { status: 'valid' } };
  assert.equal(revalidationNeedsConfirmation(previous, result), false);
  assert.equal(revalidationNeedsConfirmation(previous, { ...result, revalidation: { status: 'price_changed' } }), true);
  assert.equal(revalidationNeedsConfirmation(previous, { ...result, offer: { price: { amount: '130.00', currency: 'EUR' } } }), true);
  assert.equal(revalidationNeedsConfirmation(previous, { ...result, offer: { price: { amount: '120.25', currency: 'USD' } } }), true);
});

test('supplier cancellation deadlines are readable and retain their timezone', async () => {
  const { hotelCancellationDeadline } = await import('../src/modules/services/hotels/search-criteria.js');
  assert.equal(hotelCancellationDeadline('2026-10-18T14:00:00+03:00'), '18.10.2026, 14:00 (UTC+03:00)');
  assert.equal(hotelCancellationDeadline('2026-10-20T15:00:00Z'), '20.10.2026, 15:00 (UTC)');
  assert.equal(hotelCancellationDeadline('18.10.2026'), '18.10.2026');
});

test('hotel filter matches address and words regardless of hyphens and ё', async () => {
  const { hotelMatchesQuery } = await import('../src/modules/services/hotels/search-criteria.js');
  const hotel = { name: 'Мастер-Отель Первомайская', addr: 'Москва, Измайловский бульвар, 49' };
  assert.equal(hotelMatchesQuery(hotel, 'мастер отель'), true);
  assert.equal(hotelMatchesQuery(hotel, 'Измайловский 49'), true);
  assert.equal(hotelMatchesQuery(hotel, 'другой адрес'), false);
});

test('hotel search requires both dates, rejects past dates and same-day checkout', async () => {
  const { hotelDateError } = await import('../src/modules/services/hotels/search-criteria.js');
  const today = new Date(2026, 9, 22, 18, 30);
  assert.match(hotelDateError(null, null, today), /Выберите даты/);
  assert.match(hotelDateError(today, null, today), /Выберите даты/);
  assert.match(hotelDateError(new Date(2026, 9, 21), new Date(2026, 9, 23), today), /прошлом/);
  assert.match(hotelDateError(today, today, today), /позже/);
  assert.equal(hotelDateError(new Date(2026, 9, 22), new Date(2026, 9, 23), today), '');
});

test('hotel occupancy retains adults and child ages separately in each supplier room', async () => {
  const { hotelOccupancy } = await import('../src/modules/services/hotels/search-criteria.js');
  const result = hotelOccupancy([{ adults: 2, childrenAges: [0, 7] }, { adults: 1, childrenAges: [17] }]);
  assert.equal(result.valid, true);
  assert.equal(result.guests, 6);
  assert.deepEqual(result.rooms, [{ adults: 2, childrenAges: [0, 7], quantity: 1 }, { adults: 1, childrenAges: [17], quantity: 1 }]);
  for (const rooms of [[], Array(6).fill({ adults: 2, childrenAges: [] }), [{ adults: 0, childrenAges: [] }], [{ adults: 2, childrenAges: [''] }], [{ adults: 2, childrenAges: [18] }]]) assert.equal(hotelOccupancy(rooms).valid, false);
});


test('nonstandard stay times override hotel defaults and clearing restores the standards', async () => {
  const { hotelStayTimes } = await import('../src/modules/services/hotels/search-criteria.js');
  const itinerary = { early_arrival_time: '09:00', late_departure_time: '18:00', check_in_time: '09:00', check_out_time: '18:00', standard_check_in_time: '14:00', standard_check_out_time: '12:00' };
  assert.equal(hotelStayTimes(itinerary).checkinTime, '09:00');
  assert.equal(hotelStayTimes(itinerary).checkoutTime, '18:00');
  const cleared = hotelStayTimes(itinerary, { earlyArrivalTime: '', lateDepartureTime: '' });
  assert.equal(cleared.checkinTime, '14:00');
  assert.equal(cleared.checkoutTime, '12:00');
  assert.equal(cleared.earlyArrivalTime, '');
  assert.equal(hotelStayTimes(itinerary, { earlyArrivalTime: '00:00' }).checkinTime, '00:00');
  assert.equal(itinerary.early_arrival_time, '09:00');
});

test('selected Hotelbook tariff is revalidated with requested times and uses the updated price', async () => {
  const { loadHotelStayOffer } = await import('../src/modules/services/hotels/search-criteria.js');
  const hotel = { provider_adapter: 'hotelbook', _backendOfferId: 'offer-id', itinerary: { early_arrival_time: '09:00', late_departure_time: '18:00' } };
  const updated = { id: 'offer-id', price: { amount: '150', currency: 'EUR' }, itinerary: { ...hotel.itinerary, check_in_time: '09:00', check_out_time: '18:00', stay_times_validated: true } };
  const calls = [];
  assert.equal(await loadHotelStayOffer(hotel, async (id) => { calls.push(id); return { offer: updated }; }), updated);
  assert.deepEqual(calls, ['offer-id']);
  const never = () => { throw new Error('Unexpected request'); };
  assert.equal(await loadHotelStayOffer({ ...hotel, provider_adapter: 'aanda' }, never).then(x => x.provider_adapter), 'aanda');
  assert.equal((await loadHotelStayOffer({ ...hotel, itinerary: {} }, never))._backendOfferId, 'offer-id');
});

test('failed or lost Hotelbook time selection cannot silently use the standard tariff', async () => {
  const { loadHotelStayOffer } = await import('../src/modules/services/hotels/search-criteria.js');
  const hotel = { provider_adapter: 'hotelbook', _backendOfferId: 'offer-id', itinerary: { early_arrival_time: '09:00' } };
  await assert.rejects(loadHotelStayOffer(hotel, async () => { throw new Error('Timeout'); }), /Timeout/);
  await assert.rejects(loadHotelStayOffer(hotel, async () => ({ offer: { id: 'offer-id', itinerary: { check_in_time: '14:00' } } })), /подтвердить тариф/);
  await assert.rejects(loadHotelStayOffer(hotel, async () => ({ offer: { id: 'offer-id', itinerary: { early_arrival_time: '09:00', check_in_time: '14:00', stay_times_validated: true } } })), /подтвердить тариф/);
});
