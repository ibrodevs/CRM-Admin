import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const uiUrl = new URL('../js/ui.jsx', import.meta.url);
const apiUrl = new URL('../app/api/locations/route.js', import.meta.url);
const cssUrl = new URL('../app/location-autocomplete.css', import.meta.url);
const hotelUrl = new URL('../js/page_hotel_picker.jsx', import.meta.url);
const servicesUrl = new URL('../js/page_services.jsx', import.meta.url);

test('global Input enables autocomplete for city and location contexts', async () => {
  const source = await readFile(uiUrl, 'utf8');
  assert.match(source, /function LocationAutocomplete\(props\)/);
  assert.match(source, /function shouldUseLocationAutocomplete\(props\)/);
  assert.match(source, /LOCATION_CONTEXT_HINTS/);
  assert.match(source, /if \(shouldUseLocationAutocomplete\(props\)\) return <LocationAutocomplete/);
  assert.match(source, /Выберите вариант из списка/);
});

test('hotel and generic service fields are covered by shared Input detection', async () => {
  const hotel = await readFile(hotelUrl, 'utf8');
  const services = await readFile(servicesUrl, 'utf8');
  assert.match(hotel, /placeholder="Название отеля, город, адрес/);
  assert.match(services, /placeholder=\{f\.l\}/);
  assert.match(services, /l: 'Город'/);
  assert.match(services, /l: 'Откуда'/);
  assert.match(services, /l: 'Куда'/);
});

test('location API has remote search, fuzzy fallback and safe timeout', async () => {
  const source = await readFile(apiUrl, 'utf8');
  assert.match(source, /photon\.komoot\.io\/api/);
  assert.match(source, /function localSuggestions/);
  assert.match(source, /function levenshtein/);
  assert.match(source, /AbortController/);
  assert.match(source, /Санкт-Петербург/);
});

test('location dropdown is responsive and visible above drawers', async () => {
  const css = await readFile(cssUrl, 'utf8');
  assert.match(css, /\.location-autocomplete-menu/);
  assert.match(css, /z-index:\s*220/);
  assert.match(css, /\.location-autocomplete-option\.is-active/);
  assert.match(css, /@media \(max-width: 640px\)/);
});
