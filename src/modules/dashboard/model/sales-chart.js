import { addDays, shortDayLabel } from './dashboard-metrics.js';

export const SALES_PERIODS = [{ key: 'month', label: 'Этот месяц' }, { key: '7', label: '7 дней' }, { key: '14', label: '14 дней' }, { key: '30', label: '30 дней' }];
export function chartDate(value) {
  if (!value) return null;
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(...value.split('-').map((part, index) => Number(part) - (index === 1 ? 1 : 0))) : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}
export function chartDayKey(value) {
  const date = chartDate(value);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
}
export function rangeDays({ start, end }) {
  const a = chartDate(start), b = chartDate(end);
  if (!a || !b || b < a) return 0;
  // Calendar arithmetic: a daylight saving transition must not remove a day.
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000) + 1;
}
export function salesPeriodRange(period = '7', now = new Date()) {
  const end = chartDate(now);
  const start = period === 'month' ? new Date(end.getFullYear(), end.getMonth(), 1) : addDays(end, 1 - Number(period));
  return { start: chartDayKey(start), end: chartDayKey(end) };
}
export function salesRangeSeries(rows, range, value = (row) => row.value) {
  const length = rangeDays(range);
  if (!length) return [];
  const start = chartDate(range.start);
  const buckets = new Map(Array.from({ length }, (_, index) => {
    const key = chartDayKey(addDays(start, index));
    return [key, { key, label: shortDayLabel(key), value: 0, count: 0 }];
  }));
  for (const row of rows) {
    const bucket = buckets.get(chartDayKey(row.created_at));
    const amount = Number(value(row));
    if (bucket && Number.isFinite(amount)) { bucket.value += amount; bucket.count++; }
  }
  return [...buckets.values()];
}
export function previousSalesRange(range) {
  const end = addDays(chartDate(range.start), -1);
  return { start: chartDayKey(addDays(end, 1 - rangeDays(range))), end: chartDayKey(end) };
}
export function zoomSalesRange(range, direction, anchorRatio = 0.5, now = new Date()) {
  const days = rangeDays(range);
  if (!days || !direction) return range;
  const nextDays = Math.max(1, Math.min(3660, direction > 0 ? Math.max(days + 1, Math.round(days * 1.25)) : Math.min(days - 1, Math.round(days * 0.8))));
  if (nextDays === days) return range;
  const ratio = Math.max(0, Math.min(1, anchorRatio));
  const anchor = addDays(chartDate(range.start), Math.round((days - 1) * ratio));
  let start = addDays(anchor, -Math.round((nextDays - 1) * ratio));
  let end = addDays(start, nextDays - 1);
  const today = chartDate(now);
  if (end > today) { end = today; start = addDays(end, 1 - nextDays); }
  return { start: chartDayKey(start), end: chartDayKey(end) };
}

export function salesDayStatistics(rows, day, getValue = (row) => row.value) {
  const key = chartDayKey(day);
  const sales = key ? rows.filter((row) => chartDayKey(row.created_at) === key && Number.isFinite(Number(getValue(row)))) : [];
  const total = sales.reduce((sum, row) => sum + Number(getValue(row)), 0);
  const orderIds = [...new Set(sales.map((row) => row.orderId || row.order).filter(Boolean).map(String))];
  return { key, sales, total, count: sales.length, orderIds, average: sales.length ? total / sales.length : 0 };
}
