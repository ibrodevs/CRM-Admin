import test from 'node:test';
import assert from 'node:assert/strict';
import { chartDayKey, rangeDays, salesPeriodRange, salesRangeSeries, previousSalesRange, zoomSalesRange } from '../src/modules/dashboard/model/sales-chart.js';
const now = new Date(2026, 10, 16, 12);

test('sales presets include today and calendar month starts at its first day', () => {
  assert.deepEqual(salesPeriodRange('month', now), { start: '2026-11-01', end: '2026-11-16' });
  for (const days of [7, 14, 30]) assert.equal(rangeDays(salesPeriodRange(String(days), now)), days);
  assert.deepEqual(salesPeriodRange('7', now), { start: '2026-11-10', end: '2026-11-16' });
  assert.equal(rangeDays({ start: '2024-02-01', end: '2024-02-29' }), 29);
  assert.equal(chartDayKey('2026-11-16'), '2026-11-16');
});
test('changing period recalculates sales, preserves zero days, and excludes invalid/outside rows', () => {
  const rows = [
    { created_at: '2026-11-16T12:00:00', total: 120 },
    { created_at: '2026-11-16T13:00:00', total: 80 },
    { created_at: '2026-11-05T12:00:00', total: 50 },
    { created_at: '2026-11-17T12:00:00', total: 500 },
    { created_at: 'invalid', total: 900 },
    { created_at: '2026-11-16T12:00:00', total: 'bad' },
  ];
  const value = (row) => row.total;
  const week = salesRangeSeries(rows, salesPeriodRange('7', now), value);
  assert.equal(week.length, 7);
  assert.equal(week.reduce((sum, day) => sum + day.value, 0), 200);
  assert.equal(week[6].count, 2);
  assert.equal(week[0].value, 0);
  const month = salesRangeSeries(rows, salesPeriodRange('month', now), value);
  assert.equal(month.reduce((sum, day) => sum + day.value, 0), 250);
  assert.equal(salesRangeSeries([], salesPeriodRange('14', now)).length, 14);
  assert.deepEqual(salesRangeSeries(rows, { start: '2026-11-16', end: '2026-11-01' }, value), []);
});
test('comparison uses the preceding equal number of calendar days', () => {
  assert.deepEqual(previousSalesRange(salesPeriodRange('7', now)), { start: '2026-11-03', end: '2026-11-09' });
  assert.deepEqual(previousSalesRange({ start: '2026-11-16', end: '2026-11-16' }), { start: '2026-11-15', end: '2026-11-15' });
});
test('zoom changes the date range around the cursor and never adds future days', () => {
  const range = salesPeriodRange('30', now);
  const smaller = zoomSalesRange(range, -1, 1, now);
  assert.equal(rangeDays(smaller), 24);
  assert.equal(smaller.end, '2026-11-16');
  const larger = zoomSalesRange(range, 1, 1, now);
  assert.equal(rangeDays(larger), 38);
  assert.equal(larger.end, '2026-11-16');
  let day = salesPeriodRange('month', new Date(2026, 10, 1, 12));
  assert.equal(rangeDays(day), 1);
  assert.equal(rangeDays(zoomSalesRange(day, -1, 0.5, now)), 1);
  assert.equal(rangeDays(zoomSalesRange(day, 1, 0.5, now)), 2);
  const center = zoomSalesRange({ start: '2026-10-01', end: '2026-10-30' }, -1, 0.5, now);
  assert.equal(center.start, '2026-10-04');
  assert.equal(center.end, '2026-10-27');
});
