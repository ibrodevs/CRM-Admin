import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const servicesUrl = new URL('../js/page_services.jsx', import.meta.url);

test('счётчики пассажиров, гостей и номеров уменьшаются до нуля, но не ниже', async () => {
  const source = await readFile(servicesUrl, 'utf8');

  assert.match(source, /disabled=\{n <= 0\}/);
  assert.match(source, /set\(f\.k, Math\.max\(0, n - 1\)\)/);
  assert.match(source, /disabled=\{pax <= 0\}/);
  assert.match(source, /setPax\(Math\.max\(0, pax - 1\)\)/);
  assert.match(source, /disabled=\{form\.pax <= 0\}/);
  assert.match(source, /setF\('pax', Math\.max\(0, form\.pax - 1\)\)/);
});

test('нулевые значения не подменяются единицей перед поиском', async () => {
  const source = await readFile(servicesUrl, 'utf8');

  assert.match(source, /guests: form\.guests \?\? 0/);
  assert.match(source, /rooms: form\.rooms \?\? 0/);
  assert.match(source, /passengers: form\.pax \?\? 0/);
  assert.doesNotMatch(source, /guests: form\.guests \|\| 1/);
  assert.doesNotMatch(source, /rooms: form\.rooms \|\| 1/);
});
