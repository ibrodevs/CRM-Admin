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
