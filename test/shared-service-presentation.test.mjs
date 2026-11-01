import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceSummary, serviceExpandedRows, serviceTechnicalLabel } from '../src/shared/lib/service-presentation.js';
import { buildAgenda } from '../src/modules/dashboard/model/dashboard-metrics.js';

test('calendar API and order service use identical Russian flight summaries', () => {
  const raw = { kind: 'avia', title: 'FRU → SVO · SU 1883', itinerary: { segments: [{ origin: 'FRU', destination: 'SVO', departure: '2026-11-01T12:40', arrival: '2026-11-01T15:35', airline: 'SU', flight_number: '1883' }] } };
  const original = JSON.stringify(raw);
  assert.deepEqual(serviceSummary(raw), serviceSummary({ ...raw, kind: 'Авиа' }));
  assert.deepEqual(serviceSummary(raw), { title: 'Бишкек → Москва', dates: '01.11.2026 • 12:40 → 01.11.2026 • 15:35' });
  assert.equal(serviceTechnicalLabel(raw), 'FRU → SVO · SU 1883');
  assert.equal(JSON.stringify(raw), original);
});

test('hotel overview uses city and stay dates while expanded details retain room and meal', () => {
  const hotel = { kind: 'hotel', title: 'Mercure Moscow', itinerary: { city: 'Moscow', property_name: 'Mercure Moscow', check_in: '2026-11-01', check_out: '2026-11-04', room: 'Стандарт', meal_plan: 'Завтрак' }, booking_reference: 'HT-123' };
  assert.deepEqual(serviceSummary(hotel), { title: 'Москва · Mercure Moscow', dates: '01.11.2026 → 04.11.2026' });
  assert.ok(serviceExpandedRows(hotel).some((row) => row.label === 'Номер' && row.value === 'Стандарт'));
  assert.ok(serviceExpandedRows(hotel).some((row) => row.label === 'Питание' && row.value === 'Завтрак'));
  assert.ok(serviceExpandedRows(hotel).some((row) => row.label === 'Бронирование' && row.value === 'HT-123'));
});

test('flight segment conditions stay distinct and the fare class is translated', () => {
  const rows = serviceExpandedRows({ kind: 'avia', fare: { cabin: 'business' }, itinerary: { segments: [{ origin: 'FRU', destination: 'IST', baggage: '1PC' }, { origin: 'IST', destination: 'SVO', baggage: '2PC' }] } });
  assert.ok(rows.some((row) => row.label === 'Класс перелёта · участок 1' && row.value === 'Бизнес'));
  assert.ok(rows.some((row) => row.label === 'Багаж · участок 2' && row.value === '2PC'));
});

test('dashboard includes a service later in an existing trip and keeps its order link', () => {
  const service = { id: 'flight', kind: 'avia', starts_at: '2026-11-03T12:00', title: 'SVO → FRU' };
  const trips = [{ id: 'trip', starts_at: '2026-11-01T10:00', order_number: 'ORD-1', title: 'Командировка', services: [service] }];
  const items = buildAgenda({ day: new Date(2026, 10, 3), trips });
  assert.equal(items.length, 1);
  assert.equal(items[0].order, 'ORD-1');
  assert.deepEqual(items[0].services, [service]);
  assert.equal(buildAgenda({ day: new Date(2026, 10, 2), trips }).length, 0);
});

test('older service cards keep supplied dates and fare description without API itinerary', () => {
  const service = { kind: 'Авиа', title: 'FRU → SVO · SU 1883', date: '30.10.2026 • 12:40 → 15:35', sub: 'Эконом · багаж 1PC' };
  assert.equal(serviceSummary(service).dates, service.date);
  assert.ok(serviceTechnicalLabel(service).includes(service.sub));
});
