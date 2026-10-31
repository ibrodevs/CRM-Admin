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
  assert.equal(hotelMapSuggestion(hotel, [{ ...match, kind: 'Город' }]), undefined);
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
  assert.equal(markers[0].options.element.attrs.role, 'group');
  assert.equal(button.textContent, '100 RUB');
  let stopped = false; button.events.click({ stopPropagation() { stopped = true; } });
  assert.equal(selected, cheaper); assert.equal(stopped, true);
  instance.setHotels([{ ...hotel, itinerary: { lat: 0, lon: 0 } }], {}, () => {});
  assert.equal(markers[0].removed, true); assert.deepEqual(markers[1].point, [0, 0]);
  instance.destroy();
  assert.equal(markers[1].removed, true); assert.equal(instance.map.removed, true);
});


test('supplier coordinates arrive as normalized latitude/longitude and take priority over geocoding', async () => {
  const { resolveHotelMapPoint } = await import('../src/modules/services/hotels/map-data.js');
  const hotel = { provider_adapter: 'hotelbook', _backendOfferId: 'offer', itinerary: { latitude: 55.798, longitude: 37.817 } };
  const unexpected = () => { throw new Error('Unnecessary lookup'); };
  assert.deepEqual(await resolveHotelMapPoint(hotel, { getHotelContent: unexpected, searchLocations: unexpected }), [55.798, 37.817]);
  for (const invalid of [null, { latitude: true, longitude: 20 }, { latitude: ' ', longitude: 20 }]) assert.equal(hotelCoordinates(invalid), null);
});

test('old search results recover exact supplier hotel coordinates from content by offer ID', async () => {
  const { resolveHotelMapPoint } = await import('../src/modules/services/hotels/map-data.js');
  const hotel = { provider_adapter: 'hotelbook', _backendOfferId: 'offer', itinerary: { hotel_id: 123 }, name: 'Hotel' };
  let called = 0;
  const point = await resolveHotelMapPoint(hotel, {
    getHotelContent: async (ids) => { called++; assert.deepEqual(ids, { offerId: 'offer' }); return { hotel: { id: 123, latitude: 55.798, longitude: 37.817 } }; },
    searchLocations: () => { throw new Error('Supplier already has coordinates'); },
  });
  assert.deepEqual(point, [55.798, 37.817]);
  assert.equal(called, 1);
});

test('a different hotel ID or a city result cannot become a hotel marker', async () => {
  const { resolveHotelMapPoint } = await import('../src/modules/services/hotels/map-data.js');
  const point = await resolveHotelMapPoint({ provider_adapter: 'hotelbook', _backendOfferId: 'offer', itinerary: { hotel_id: 123 }, name: 'Hotel' }, {
    getHotelContent: async () => ({ hotel: { id: 999, latitude: 55, longitude: 37 } }),
    searchLocations: async () => [{ title: 'Москва', lat: 55, lon: 37 }],
  });
  assert.equal(point, null);
});

test('a transient content failure can recover on the next lookup', async () => {
  const { resolveHotelMapPoint } = await import('../src/modules/services/hotels/map-data.js');
  const hotel = { provider_adapter: 'hotelbook', _backendOfferId: 'offer', name: 'Hotel' };
  let attempts = 0;
  const deps = { getHotelContent: async () => { if (++attempts === 1) throw new Error('Timeout'); return { hotel: { latitude: 55, longitude: 37 } }; }, searchLocations: async () => [] };
  assert.equal(await resolveHotelMapPoint(hotel, deps), null);
  assert.deepEqual(await resolveHotelMapPoint(hotel, deps), [55, 37]);
});

test('hotel marker deduplication keeps supplier accounts separate', () => {
  const hotel = { name: 'Hotel', supplier: 'hotelbook', supplierId: 'supplier-a', itinerary: { hotel_id: 123 }, currency: 'EUR', base: 120 };
  assert.equal(hotelMapHotels([hotel, { ...hotel, supplierId: 'supplier-b' }]).length, 2);
});

test('cancelled location lookup does not publish a late supplier coordinate', async () => {
  const { resolveHotelMapPoint } = await import('../src/modules/services/hotels/map-data.js');
  const controller = new AbortController();
  const point = await resolveHotelMapPoint({ provider_adapter: 'hotelbook', _backendOfferId: 'offer' }, {
    signal: controller.signal,
    getHotelContent: async () => { controller.abort(); return { hotel: { latitude: 55, longitude: 37 } }; },
    searchLocations: () => { throw new Error('Aborted'); },
  });
  assert.equal(point, null);
});
