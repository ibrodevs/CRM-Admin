import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  normalizeTechnicalStop,
  technicalStopCount,
  technicalStopLabel,
  technicalStopsOf,
} from '../js/features/avia/technical-stops.js';

test('нормализует техническую посадку из snake_case ответа GDS', () => {
  const stop = normalizeTechnicalStop({
    airport_code: 'TAS',
    airport_name: 'Islam Karimov International Airport',
    city: 'Ташкент',
    country: 'Узбекистан',
    arrival: '2026-08-01T13:00:00',
    departure: '2026-08-01T13:45:00',
    duration_minutes: 45,
    reason: 'refueling',
    passengers_disembark: false,
    aircraft_change: false,
  });

  assert.equal(stop.airportCode, 'TAS');
  assert.equal(stop.arrival, '13:00');
  assert.equal(stop.departure, '13:45');
  assert.equal(stop.duration, '45 мин');
  assert.equal(stop.reason, 'Дозаправка');
  assert.equal(stop.deplane, false);
  assert.equal(stop.aircraftChange, false);
});

test('принимает camelCase данные и не придумывает неизвестные статусы', () => {
  const [stop] = technicalStopsOf({
    technicalStops: [{
      airportCode: 'CAN',
      airportName: 'Байюнь',
      duration: '1 ч 10 мин',
      reason: 'Санитарная остановка',
    }],
  });

  assert.equal(stop.airportCode, 'CAN');
  assert.equal(stop.duration, '1 ч 10 мин');
  assert.equal(stop.reason, 'Санитарная остановка');
  assert.equal(stop.deplane, undefined);
  assert.equal(stop.aircraftChange, undefined);
});

test('техническая посадка считается отдельно от пересадки', () => {
  const leg = {
    stops: 1,
    segs: [
      { technical_stops: [{ airport_code: 'TAS' }] },
      { technicalStops: [{ airportCode: 'CAN' }] },
    ],
  };

  assert.equal(technicalStopCount(leg), 2);
  assert.equal(leg.stops, 1);
  assert.equal(technicalStopLabel(1), '1 тех. посадка');
  assert.equal(technicalStopLabel(2), '2 тех. посадки');
  assert.equal(technicalStopLabel(5), '5 тех. посадок');
  assert.equal(technicalStopLabel(11), '11 тех. посадок');
});

test('боковая панель показывает детали, а live-ответ сохраняет technical_stops', async () => {
  const panel = await readFile(new URL('../js/page_order_card.jsx', import.meta.url), 'utf8');
  const live = await readFile(new URL('../js/page_flights.jsx', import.meta.url), 'utf8');
  const details = await readFile(new URL('../js/features/avia/technical-stops.jsx', import.meta.url), 'utf8');

  assert.match(panel, /<TechnicalStopsDetails stops=\{technicalStopsOf\(s\)\} \/>/);
  assert.match(panel, /Без пересадок ·/);
  assert.match(live, /technicalStops: technicalStopsOf\(segment\)/);
  assert.match(details, /Без смены самолёта/);
  assert.match(details, /Выход из самолёта не предусмотрен/);
});
