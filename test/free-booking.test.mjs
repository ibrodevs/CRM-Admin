import test from 'node:test';
import assert from 'node:assert/strict';
import { freeBookingServiceBody, freeBookingTotals } from '../src/modules/dashboard/model/free-booking.js';
import { hotelBreakfastIncluded } from '../src/modules/services/hotels/search-criteria.js';

test('hotel picker offers attach through the backend offer, retaining HB snapshot and adapter routing', () => {
  assert.deepEqual(freeBookingServiceBody({ _backendOfferId: 'crm-offer', kind: 'Гостиница', cost: 1345530, currency: 'RUB' }), { offer_id: 'crm-offer' });
  assert.deepEqual(freeBookingServiceBody({ backendOfferId: 'existing-offer' }), { offer_id: 'existing-offer' });
  assert.deepEqual(freeBookingServiceBody({ offerId: 'avia-offer' }), { offer_id: 'avia-offer' });
});

test('free booking totals preserve supplier currencies without summing different currencies', () => {
  assert.deepEqual(freeBookingTotals([{ cost: 100, currency: 'RUB' }, { cost: '200', currency: 'RUB' }, { cost: 50, currency: 'EUR' }]), { RUB: 300, EUR: 50 });
});

test('manual services retain the manual workflow', () => {
  const body = freeBookingServiceBody({ kind: 'Гостиница', title: 'Manual', cost: 100, currency: 'RUB' });
  assert.equal(body.kind, 'hotel');
  assert.equal(body.supplier_cost, 100);
  assert.equal(body.currency, 'RUB');
  assert.equal(body.offer_id, undefined);
});

test('HB no-meal descriptions never promise included breakfast', () => {
  for (const value of ['Без питания', 'RO', 'Room only', '', undefined]) assert.equal(hotelBreakfastIncluded(value), false);
  for (const value of ['BB', 'Завтрак', 'Breakfast', 'HB', 'Полупансион']) assert.equal(hotelBreakfastIncluded(value), true);
});
