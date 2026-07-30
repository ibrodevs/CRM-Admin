import test from 'node:test';
import assert from 'node:assert/strict';

import {
  roundTripGapDays,
  roundTripGapLabel,
  segmentConnectionLabel,
  segmentLayoverLabel,
  segmentLayoverMinutes,
} from '../js/features/receipts/layover.js';

test('рассчитывает ожидание между соседними авиасегментами', () => {
  const first = { date: '26.09.2024', arr: '15:50' };
  const second = { date: '26.09.2024', dep: '17:35' };
  assert.equal(segmentLayoverMinutes(first, second), 105);
  assert.equal(segmentLayoverLabel(first, second), 'Ожидание между рейсами: 1 ч 45 мин');
});

test('поддерживает пересадку после полуночи', () => {
  const first = { date: '26.09.2024', arr: '23:20' };
  const second = { date: '27.09.2024', dep: '01:50' };
  assert.equal(segmentLayoverMinutes(first, second), 150);
  assert.equal(segmentLayoverLabel(first, second), 'Ожидание между рейсами: 2 ч 30 мин');
});

test('не придумывает время ожидания без полного расписания', () => {
  assert.equal(segmentLayoverMinutes({ arr: '' }, { dep: '17:35' }), null);
  assert.equal(segmentLayoverLabel({ arr: '' }, { dep: '17:35' }), '');
});

test('для маршрута туда-обратно показывает дни до обратного рейса, а не ожидание', () => {
  const outbound = { date: '26.09.2024', arr: '15:50' };
  const inbound = { date: '30.09.2024', dep: '17:35' };
  assert.equal(roundTripGapDays(outbound, inbound), 4);
  assert.equal(roundTripGapLabel(outbound, inbound), 'Обратный рейс через 4 дня');
  assert.equal(segmentConnectionLabel(outbound, inbound, 'roundtrip'), 'Обратный рейс через 4 дня');
});
