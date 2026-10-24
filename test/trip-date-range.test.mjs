import test from 'node:test';
import assert from 'node:assert/strict';
import { completeDateRange, localDay } from '../src/shared/ui/date-range.js';

test('travel range requires both dates and rejects reversed or past dates', () => {
  const today = new Date(2026, 9, 22, 18, 45);
  const options = { minDate: today, allowSameDay: true };
  const departure = new Date(2026, 9, 23);
  const arrival = new Date(2026, 9, 25);
  assert.equal(completeDateRange(departure, null, options), false);
  assert.equal(completeDateRange(null, arrival, options), false);
  assert.equal(completeDateRange(arrival, departure, options), false);
  assert.equal(completeDateRange(new Date(2026, 9, 21), arrival, options), false);
  assert.equal(completeDateRange(departure, arrival, options), true);
  assert.equal(completeDateRange(new Date(2026, 9, 22), arrival, options), true);
});

test('transport allows same-day return; a hotel stay requires at least one night', () => {
  const day = new Date(2026, 9, 23);
  assert.equal(completeDateRange(day, day, { allowSameDay: true }), true);
  assert.equal(completeDateRange(day, day), false);
  assert.equal(completeDateRange(day, new Date(2026, 9, 24)), true);
});

test('calendar validation uses local dates and safely rejects invalid values', () => {
  assert.equal(localDay(null), null);
  assert.equal(localDay(new Date('invalid')), null);
  assert.equal(completeDateRange(new Date('invalid'), new Date()), false);
  const value = new Date(2026, 9, 23, 23, 59);
  assert.equal(localDay(value).getDate(), 23);
  assert.equal(localDay(value).getHours(), 0);
  assert.equal(value.getHours(), 23);
});
