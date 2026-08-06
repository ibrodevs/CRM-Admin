import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const services = await readFile(new URL('../js/page_services.jsx', import.meta.url), 'utf8');

test('ЖД-поля Откуда и Куда явно используют автокомплит локаций', () => {
  const railBlockStart = services.indexOf('function RailAddFlow');
  assert.ok(railBlockStart >= 0, 'RailAddFlow не найден');
  const railBlock = services.slice(railBlockStart, services.indexOf('function RailSeatPanel', railBlockStart));

  assert.match(railBlock, /value=\{form\.from\}[\s\S]*?locationAutocomplete[\s\S]*?locationScope="rail"[\s\S]*?data-field-label="Откуда"/);
  assert.match(railBlock, /value=\{form\.to\}[\s\S]*?locationAutocomplete[\s\S]*?locationScope="rail"[\s\S]*?data-field-label="Куда"/);
  assert.equal((railBlock.match(/placeholder="Город или вокзал"/g) || []).length, 2);
});
