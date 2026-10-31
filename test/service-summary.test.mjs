import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceSummary, serviceFlightSegments, travelDate } from '../src/modules/orders/model/service-summary.js';
const airports = [{code:'FRU',city:'Бишкек'}, {code:'SVO',city:'Москва'}];

test('closed flight shows Russian cities and both local dates, no flight number', () => {
  const service = {kind:'Авиа', title:'FRU → SVO · SU 1883', itinerary:{segments:[
    {origin:'FRU', destination:'SVO', departure:'2026-10-30T23:40:00+06:00', arrival:'2026-10-31T01:35:00+03:00',airline:'SU',flight_number:'1883'},
  ]}};
  assert.deepEqual(serviceSummary(service, airports), {title:'Бишкек – Москва', dates:'30.10.2026, 23:40 — 31.10.2026, 01:35'});
  assert.equal(serviceFlightSegments(service)[0].flight_number,'1883');
});
test('multi segment flights summarize first departure and final arrival', () => {
  const service={kind:'Авиа',itinerary:{segments:[{origin:'GRV',destination:'SVO',departure:'2026-10-30T12:40'}, {origin:'SVO',destination:'FRU',arrival:'2026-10-31T05:10'}]}};
  assert.deepEqual(serviceSummary(service,airports),{title:'Грозный – Бишкек',dates:'30.10.2026, 12:40 — 31.10.2026, 05:10'});
});
test('legacy flight title is localized, actual end time is preserved', () => {
  const service={kind:'Авиа',title:'FRU → SVO · SU 1883',starts_at:'2026-10-30T12:40:00',ends_at:'2026-10-30T15:35:00'};
  assert.equal(serviceSummary(service,airports).title,'Бишкек – Москва');
  assert.match(serviceSummary(service,airports).dates,/15:35/);
});
test('hotel summary contains city, property name, and date-only stay period', () => {
  assert.deepEqual(serviceSummary({kind:'Гостиница',title:'Old title',itinerary:{city:'Moscow',property_name:'Mercure Moscow',check_in:'2026-10-30',check_out:'2026-11-02'}}),{title:'Москва · Mercure Moscow',dates:'30.10.2026 — 02.11.2026'});
  assert.equal(serviceSummary({kind:'Гостиница',title:'Mercure Moscow · 3 ночи',starts_at:'2026-10-30T14:00:00',ends_at:'2026-11-02T12:00:00'}).title,'Москва · Mercure Moscow');
});
test('missing details stay explicit, unknown airport codes do not leak into compact title', () => {
  const summary=serviceSummary({kind:'Авиа',title:'ZZZ → XXX · XX 123'});
  assert.equal(summary.title,'Город вылета не указан – Город прилёта не указан');
  assert.equal(summary.dates,'Вылет не указан — Прилёт не указан');
  assert.equal(travelDate('2026-10-30T12:40:00+06:00',true),'30.10.2026, 12:40');
});
test('stored UTC timestamps use each airport timezone rather than browser timezone', () => {
  const result = serviceSummary({kind:'Авиа',title:'FRU → SVO · SU 1883',starts_at:'2026-10-30T06:40:00Z',ends_at:'2026-10-30T12:35:00Z'},airports);
  assert.equal(result.dates,'30.10.2026, 12:40 — 30.10.2026, 15:35');
});
