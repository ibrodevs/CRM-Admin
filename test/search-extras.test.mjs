import test from 'node:test';
import assert from 'node:assert/strict';
import { transferSearchExtras, offerSearchExtras } from '../src/modules/services/search/search-extras.js';

test('required child equipment is counted separately and is not advertised as free before search', () => {
  const rows = transferSearchExtras({ passenger_composition: { adults: 1, children: [{ age: 6 }, { age: 8 }, { age: null }] }, additional_service_types: ['table', 'booster'] });
  const booster = rows.find((row) => row.id === 'booster');
  assert.equal(booster.quantity, 2);
  assert.equal(booster.required, true);
  assert.equal(booster.selected, true);
  assert.equal(booster.amount, null);
  assert.equal(rows.find((row) => row.id === 'table').selected, true);
  assert.equal(rows.find((row) => row.id === 'seat').selected, false);
});

test('offer breakdown preserves free zero, paid price, currency and missing price without changing total', () => {
  const offer = { price: { amount: '2400', currency: 'RUB' }, fare: {
    additional_services: [{ id: 1, type: 'table', default_include: true, price: '500' }],
    selected_services: [{ id: 1, type: 'table', default_include: true }, { type: 'booster', price: '0' }, { type: 'tollroad', price: '300' }, { type: 'seat' }],
  } };
  const original = JSON.stringify(offer);
  const rows = offerSearchExtras({ selectedOffer: offer });
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((row) => row.amount), [0, 0, 300, null]);
  assert.ok(rows.every((row) => row.currency === 'RUB'));
  assert.equal(rows[0].included, true);
  assert.equal(JSON.stringify(offer), original);
});

test('the shared breakdown handles supplier-selected extras of any service and hides absent extras', () => {
  assert.deepEqual(offerSearchExtras({ fare: {} }), []);
  assert.equal(offerSearchExtras({ fare: { selected_services: [{ id: 'bag', name: 'Багаж', price: { amount: '12', currency: 'EUR' } }] } })[0].amount, 12);
  for (const price of ['', null, -1, 'NaN']) assert.equal(offerSearchExtras({ fare: { selected_services: [{ id: 'x', price }] } })[0].amount, null);
});
