import test from 'node:test';
import assert from 'node:assert/strict';
import { flightHeaderSummary, flightLocationLabel } from '../src/modules/services/search/flight-header-summary.js';

test('fare header uses readable city and airport names without technical prefixes', () => {
  assert.equal(flightLocationLabel('city:MOW'), 'Москва · все аэропорты');
  assert.equal(flightLocationLabel('SVO'), 'Москва · SVO');
  assert.equal(flightLocationLabel('city:UNKNOWN'), 'UNKNOWN');
});

test('return fare summary has two compact fields and preserves dates and passenger categories', () => {
  const values = { from: 'city:MOW', to: 'city:IST', trip: 'rt', depDate: new Date(2026, 10, 25), retDate: new Date(2026, 10, 26), pax: { adt: 2, chd: 1 }, cabin: 'Эконом' };
  const summary = flightHeaderSummary(values);
  assert.match(summary.route, /Москва · все аэропорты → Стамбул · все аэропорты · Туда и обратно/);
  assert.deepEqual(summary.fields.map((field) => field.key), ['dates', 'passengers']);
  assert.equal(summary.fields[0].value, '25.11.26 — 26.11.26');
  assert.equal(summary.fields[1].value, '3 пасс. · Эконом');
  assert.equal(values.from, 'city:MOW');
});

test('multi-city summary keeps every segment date and fixed order passenger count', () => {
  const summary = flightHeaderSummary({ trip: 'mc', pax: { adt: 1 }, segments: [{ from: 'SVO', to: 'LED', date: new Date(2026, 10, 25) }, { from: 'LED', to: 'FRU', date: new Date(2026, 10, 27) }] }, 5);
  assert.match(summary.route, /Санкт-Петербург · LED → Бишкек · FRU/);
  assert.equal(summary.fields[0].value, '25.11.26 · 27.11.26');
  assert.equal(summary.fields[1].value, '5 пасс. · Эконом');
});
