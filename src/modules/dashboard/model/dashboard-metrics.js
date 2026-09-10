// Pure helpers for the dashboard overview: daily series for the KPI sparklines and
// the sales chart, plus the agenda that feeds the «Сегодня» panel.
// Everything here works on data that is already loaded by the workspace — no new API calls.

const DAY_MS = 24 * 60 * 60 * 1000;

export const RU_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(value) {
  const date = toDate(value);
  if (!date) return null;
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(value, amount) {
  const date = toDate(value);
  if (!date) return null;
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function sameDay(a, b) {
  const left = toDate(a); const right = toDate(b);
  if (!left || !right) return false;
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

export function weekStart(value) {
  const date = startOfDay(value) || startOfDay(new Date());
  const shift = (date.getDay() + 6) % 7;
  return addDays(date, -shift);
}

export function weekDays(value) {
  const first = weekStart(value);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

export function ruFullDate(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getDate()} ${RU_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function ruTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Day bucket keys follow the ISO slice the dashboard already uses for «сегодня»,
// so the sparklines and the «сегодня» KPI always agree with each other.
export function isoDayKey(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

export function isoDayRange(days = 7, now = new Date()) {
  const end = toDate(now) || new Date();
  return Array.from({ length: days }, (_, index) => isoDayKey(new Date(end.getTime() - (days - 1 - index) * DAY_MS)));
}

export function shortDayLabel(isoKey) {
  const [, month, day] = String(isoKey || '').split('-');
  if (!month || !day) return '';
  return `${Number(day)} ${RU_MONTHS_SHORT[Number(month) - 1] || ''}`.trim();
}

// rows -> [{ key, label, value }] over the last `days` days.
export function dailySeries(rows = [], { days = 7, now = new Date(), key = (row) => row.created_at, value = () => 1 } = {}) {
  const buckets = new Map(isoDayRange(days, now).map((isoKey) => [isoKey, 0]));
  rows.forEach((row) => {
    const isoKey = isoDayKey(key(row));
    if (buckets.has(isoKey)) buckets.set(isoKey, buckets.get(isoKey) + (Number(value(row)) || 0));
  });
  return [...buckets.entries()].map(([isoKey, total]) => ({ key: isoKey, label: shortDayLabel(isoKey), value: total }));
}

export function seriesTotal(series = []) {
  return series.reduce((sum, point) => sum + (Number(point.value) || 0), 0);
}

// null means «нечего сравнивать» — the caller then hides the delta instead of printing +0%.
export function percentChange(current, previous) {
  const from = Number(previous) || 0;
  const to = Number(current) || 0;
  if (!from) return to ? null : 0;
  return Math.round(((to - from) / Math.abs(from)) * 100);
}

export function formatPercent(percent) {
  if (percent === null || percent === undefined) return null;
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

export function percentTone(percent) {
  if (percent === null || percent === undefined || percent === 0) return 'gray';
  return percent > 0 ? 'green' : 'red';
}

const AGENDA_EVENT_ICON = { order: 'plane', reminder: 'bell', task: 'clipboard', control: 'eye' };
const AGENDA_EVENT_TONE = { order: 'blue', reminder: 'amber', task: 'teal', control: 'red' };

// Builds the «Сегодня» agenda for one day out of resources the workspace already loaded:
// calendar trips + calendar events + ticketing deadlines from the dashboard payload.
export function buildAgenda({ day = new Date(), trips = [], events = [], deadlines = [], orders = [] } = {}) {
  const orderNumber = (id) => orders.find((order) => String(order.id) === String(id))?.no || null;
  const items = [];

  trips.forEach((trip) => {
    const at = toDate(trip.starts_at);
    if (!at || !sameDay(at, day)) return;
    items.push({
      id: `trip-${trip.id}`, at, icon: 'plane', tone: trip.criticality === 'critical' ? 'red' : 'blue',
      title: trip.title || 'Поездка',
      sub: [trip.order_number ? `Заказ № ${trip.order_number}` : '', trip.client_name || ''].filter(Boolean).join(' · '),
      order: trip.order_number || null,
    });
  });

  events.forEach((event) => {
    const at = toDate(event.starts_at);
    if (!at || !sameDay(at, day)) return;
    const number = event.order ? orderNumber(event.order) : null;
    items.push({
      id: `event-${event.id}`, at,
      icon: AGENDA_EVENT_ICON[event.kind] || 'calendar',
      tone: event.priority === 'high' || event.priority === 'critical' ? 'red' : (AGENDA_EVENT_TONE[event.kind] || 'blue'),
      title: event.title || 'Событие',
      sub: [number ? `№${number}` : '', event.description || ''].filter(Boolean).join(' · '),
      order: number,
    });
  });

  deadlines.forEach((deadline) => {
    const at = toDate(deadline.deadline);
    if (!at || !sameDay(at, day)) return;
    items.push({
      id: `deadline-${deadline.service}`, at, icon: 'clock', tone: 'amber',
      title: 'Дедлайн по заказу',
      sub: [deadline.order_number ? `№${deadline.order_number}` : '', deadline.title || ''].filter(Boolean).join(' · '),
      order: deadline.order_number || null,
    });
  });

  return items.sort((a, b) => a.at - b.at).map((item) => ({ ...item, time: ruTime(item.at) }));
}
