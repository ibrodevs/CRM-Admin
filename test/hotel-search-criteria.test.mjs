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
