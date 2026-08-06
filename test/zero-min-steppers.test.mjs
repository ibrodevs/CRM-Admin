import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const servicesUrl = new URL('../js/page_services.jsx', import.meta.url);
const hotelUrl = new URL('../js/page_hotel_picker.jsx', import.meta.url);

test('счётчики пассажиров в общих формах уменьшаются до нуля, но не ниже', async () => {
  const source = await readFile(servicesUrl, 'utf8');

  assert.match(source, /disabled=\{n <= 0\}/);
  assert.match(source, /set\(f\.k, Math\.max\(0, n - 1\)\)/);
  assert.match(source, /disabled=\{pax <= 0\}/);
  assert.match(source, /setPax\(Math\.max\(0, pax - 1\)\)/);
  assert.match(source, /disabled=\{form\.pax <= 0\}/);
  assert.match(source, /setF\('pax', Math\.max\(0, form\.pax - 1\)\)/);
});

test('счётчики номеров и гостей в отдельной форме отелей уменьшаются до нуля', async () => {
  const source = await readFile(hotelUrl, 'utf8');

  assert.match(source, /disabled=\{searchRooms <= 0\}/);
  assert.match(source, /setSearchRooms\(\(n\) => Math\.max\(0, n - 1\)\)/);
  assert.match(source, /disabled=\{searchGuests <= 0\}/);
  assert.match(source, /setSearchGuests\(\(n\) => Math\.max\(0, n - 1\)\)/);
  assert.match(source, /searchRooms === 0 \? 'номеров'/);
  assert.doesNotMatch(source, /disabled=\{searchRooms <= 1\}/);
  assert.doesNotMatch(source, /disabled=\{searchGuests <= 1\}/);
});

test('нулевые значения не подменяются единицей перед поиском', async () => {
  const source = await readFile(servicesUrl, 'utf8');

  assert.match(source, /guests: form\.guests \?\? 0/);
  assert.match(source, /rooms: form\.rooms \?\? 0/);
  assert.match(source, /passengers: form\.pax \?\? 0/);
  assert.doesNotMatch(source, /guests: form\.guests \|\| 1/);
  assert.doesNotMatch(source, /rooms: form\.rooms \|\| 1/);
});
