import test from 'node:test';
import assert from 'node:assert/strict';
import { hotelCoordinates, hotelMapHotels, hotelMapSuggestion } from '../src/modules/services/hotels/map-data.js';

test('map coordinates reject missing and invalid values instead of making up a position', () => {
  for (const point of [{}, { lat: '', lon: '' }, { lat: 95, lon: 20 }, { lat: 'bad', lon: 20 }]) assert.equal(hotelCoordinates(point), null);
  assert.deepEqual(hotelCoordinates({ latitude: '55.7', longitude: '37.6' }), [55.7, 37.6]);
  assert.deepEqual(hotelCoordinates({ lat: 0, lng: 0 }), [0, 0]);
});

test('map price tags use the cheapest available tariff per hotel and currency', () => {
  const hotel = { name: 'Hotel', addr: 'Street 1', city: 'City', supplier: 'provider', currency: 'RUB', base: 200 };
  const cheaper = { ...hotel, base: 100 };
  const foreign = { ...hotel, currency: 'USD', base: 3 };
  assert.deepEqual(hotelMapHotels([hotel, cheaper, foreign]), [cheaper, foreign]);
});

test('a city suggestion cannot be used as a hotel price marker', () => {
  const hotel = { name: 'Отель «Заря»' };
  const city = { title: 'Москва', lat: 55, lon: 37 };
  const match = { title: 'Отель Заря', lat: 55.7, lon: 37.6 };
  assert.equal(hotelMapSuggestion(hotel, [city]), undefined);
  assert.equal(hotelMapSuggestion(hotel, [city, match]), match);
});
