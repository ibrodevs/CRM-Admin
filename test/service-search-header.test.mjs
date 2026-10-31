import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneSearchValues, searchHeaderValue, searchHeaderDate, searchPassengerCount } from '../src/modules/services/search/search-header.js';

test('editing a search draft preserves dates and isolates nested passenger and route values', () => {
  const original = { depDate: new Date(2026, 10, 12), pax: { adt: 2, special: { youth: 1 } }, segments: [{ from: 'SVO', date: new Date(2026, 10, 13) }] };
  const draft = cloneSearchValues(original);
  assert.deepEqual(draft, original);
  draft.depDate.setDate(20); draft.pax.special.youth = 0; draft.segments[0].from = 'FRU';
  assert.equal(original.depDate.getDate(), 12);
  assert.equal(original.pax.special.youth, 1);
  assert.equal(original.segments[0].from, 'SVO');
  assert.ok(draft.segments[0].date instanceof Date);
});

test('header formats return trips and hotel periods compactly, including cleared dates', () => {
  const from = new Date(2026, 10, 12), to = new Date(2026, 10, 15);
  assert.equal(searchHeaderValue({ k: 'date', t: 'date' }, { date: from, retDate: to, trip: 'rt' }), '12.11.26 — 15.11.26');
  assert.equal(searchHeaderValue({ k: 'date', t: 'date' }, { date: from, retDate: to, trip: 'ow' }), '12.11.26');
  assert.equal(searchHeaderValue({ k: 'dates', t: 'daterange' }, { dates: { s: from, e: to } }), '12.11.26 — 15.11.26');
  assert.equal(searchHeaderDate(null), 'Не выбрано');
  assert.equal(searchHeaderDate('invalid'), 'Не выбрано');
});

test('headers resolve supplier option labels and do not replace zero passengers with one', () => {
  const field = { k: 'fare', t: 'select', o: [{ value: 'single', label: 'Разовый' }, { value: 'rt', label: 'Туда и обратно' }] };
  assert.equal(searchHeaderValue(field, { fare: 'rt' }), 'Туда и обратно');
  assert.equal(searchHeaderValue(field, {}), 'Разовый');
  assert.equal(searchHeaderValue({ k: 'pax', t: 'stepper' }, { pax: 0 }), '0');
});

test('passenger categories describe existing passengers and are not counted twice', () => {
  assert.equal(searchPassengerCount({ adt: 2, chd: 1, infNoSeat: 1, infSeat: 1, special: { youth: 1 }, subsidized: { dvoResident: 1 } }), 5);
  assert.equal(searchPassengerCount(), 0);
});
