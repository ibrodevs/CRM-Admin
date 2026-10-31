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

test('Mapbox markers preserve coordinate order, cheapest prices, click selection and cleanup', async (t) => {
  const { createHotelMapbox, HOTEL_MAPBOX_STYLE } = await import('../src/modules/services/hotels/hotel-mapbox.js');
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ children: [], attrs: {}, events: {}, append(child) { this.children.push(child); }, setAttribute(key, value) { this.attrs[key] = value; }, addEventListener(key, fn) { this.events[key] = fn; } }) };
  t.after(() => { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; });
  const markers = [];
  class MapMock {
    constructor(options) { this.options = options; this.events = {}; }
    addControl(control, position) { this.controlPosition = position; }
    on(name, callback) { this.events[name] = callback; }
    fitBounds(bounds, options) { this.bounds = bounds.points; this.fitOptions = options; }
    resize() { this.resized = true; }
    remove() { this.removed = true; }
  }
  class BoundsMock { points = []; extend(point) { this.points.push(point); } }
  class MarkerMock {
    constructor(options) { this.options = options; markers.push(this); }
    setLngLat(point) { this.point = point; return this; }
    addTo(map) { this.map = map; return this; }
    remove() { this.removed = true; }
  }
  let loaded = false, failed = false, selected;
  const sdk = { Map: MapMock, Marker: MarkerMock, LngLatBounds: BoundsMock, NavigationControl: class {} };
  const instance = createHotelMapbox(sdk, {}, 'pk.public', { onLoad: () => { loaded = true; }, onError: () => { failed = true; } });
  assert.equal(instance.map.options.style, HOTEL_MAPBOX_STYLE);
  assert.equal(instance.map.options.accessToken, 'pk.public');
  assert.equal(instance.map.controlPosition, 'top-right');
  instance.map.events.load(); instance.map.events.error();
  assert.equal(loaded, true); assert.equal(failed, true);
  const hotel = { name: 'Hotel', addr: 'Street 1', supplier: 'provider', currency: 'RUB', base: 200, itinerary: { lat: 55.7, lon: 37.6 } };
  const cheaper = { ...hotel, base: 100 };
  instance.setHotels([hotel, cheaper, { ...hotel, name: 'Unknown', itinerary: {} }], {}, (value) => { selected = value; });
  assert.equal(markers.length, 1);
  assert.deepEqual(markers[0].point, [37.6, 55.7]);
  assert.deepEqual(instance.map.bounds, [[37.6, 55.7]]);
  const button = markers[0].options.element.children[0];
  assert.equal(button.textContent, '100 RUB');
  let stopped = false; button.events.click({ stopPropagation() { stopped = true; } });
  assert.equal(selected, cheaper); assert.equal(stopped, true);
  instance.setHotels([{ ...hotel, itinerary: { lat: 0, lon: 0 } }], {}, () => {});
  assert.equal(markers[0].removed, true); assert.deepEqual(markers[1].point, [0, 0]);
  instance.destroy();
  assert.equal(markers[1].removed, true); assert.equal(instance.map.removed, true);
});
