import test from 'node:test';
import assert from 'node:assert/strict';
import { airportOption, searchAirportOptions } from '../src/modules/services/flights/airport-options.js';
import { freeFlightCriteria } from '../src/modules/services/flights/free-flight-search.js';

test('Moscow includes all four airports and a city-wide choice, in Russian, English and IATA search', () => {
  for (const query of ['Москва', 'Moscow', 'MOW']) {
    const options = searchAirportOptions(query);
    assert.equal(options[0].value, 'city:MOW');
    assert.deepEqual(options.filter((option) => option.kind === 'airport' && option.cityCode === 'MOW').map((option) => option.code).sort(), ['DME', 'SVO', 'VKO', 'ZIA']);
  }
  assert.ok(searchAirportOptions('петербург').some((option) => option.code === 'LED'));
  assert.equal(searchAirportOptions('Хитроу').find((option) => option.kind === 'airport').code, 'LHR');
});

test('city choices cover every multi-airport city and distinguish overlapping city and airport codes', () => {
  const all = searchAirportOptions('');
  assert.ok(all.length);
  for (const city of ['city:IST', 'city:LON', 'city:PAR', 'city:NYC', 'city:TYO']) {
    const option = airportOption(city);
    assert.equal(option.kind, 'city');
    assert.ok(option.airportCodes.length > 1);
    assert.ok(option.airportCodes.every((code) => airportOption(code)?.cityCode === option.code));
  }
  assert.equal(airportOption('IST').kind, 'airport');
  assert.deepEqual(airportOption('city:IST').airportCodes.sort(), ['IST', 'SAW']);
  assert.equal(airportOption('FRU').city, 'Бишкек');
});

test('city searches send IATA city codes for one-way, return and multi-city routes', () => {
  const base = { from: 'city:MOW', to: 'city:IST', depDate: '2027-03-12', retDate: '2027-03-17', pax: { adt: 1, chd: 0, infNoSeat: 0, infSeat: 0 }, cabin: 'Эконом' };
  for (const trip of ['ow', 'rt']) {
    const criteria = freeFlightCriteria({ ...base, trip });
    assert.equal(criteria.origin, 'MOW');
    assert.equal(criteria.destination, 'IST');
    assert.equal(criteria.return_date, trip === 'rt' ? base.retDate : undefined);
  }
  const criteria = freeFlightCriteria({ ...base, trip: 'mc', segments: [{ from: 'city:MOW', to: 'city:LON', date: base.depDate }, { from: 'LHR', to: 'SVO', date: base.retDate }] });
  assert.deepEqual(criteria.segments.map((row) => [row.origin, row.destination]), [['MOW', 'LON'], ['LHR', 'SVO']]);
});

test('every searchable catalog record has a sortable display label, including missing supplier names', () => {
  // Search single letters to exercise sparse records absent from popular-city examples.
  for (const query of [...'abcdefghijklmnopqrstuvwxyzабвгдежзийклмнопрстуфхцчшщэюя', 'ни']) {
    for (const option of searchAirportOptions(query)) {
      assert.equal(typeof option.city, 'string');
      assert.equal(typeof option.name, 'string');
      assert.ok(option.city && option.name);
    }
  }
});
