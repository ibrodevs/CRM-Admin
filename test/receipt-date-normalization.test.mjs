import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeReceiptDisplayDate } from '../js/features/receipts/date.js';

test('IATA passenger birth date is shown as DD.MM.YYYY', () => {
  assert.equal(normalizeReceiptDisplayDate('12AUG2001'), '12.08.2001');
  assert.equal(normalizeReceiptDisplayDate('12 AUG 2001'), '12.08.2001');
  assert.equal(normalizeReceiptDisplayDate('12-aug-2001'), '12.08.2001');
  assert.equal(normalizeReceiptDisplayDate('2001-08-12'), '12.08.2001');
  assert.equal(normalizeReceiptDisplayDate('12.8.2001'), '12.08.2001');
});

test('receipt editor normalizes recognized passenger dob aliases', async () => {
  const source = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
  assert.match(source, /normalizeReceiptDisplayDate/);
  assert.match(source, /row\?\.dob, row\?\.birthDate, row\?\.birth_date, row\?\.dateOfBirth, row\?\.date_of_birth/);
  assert.match(source, /value\.dob, value\.birthDate, value\.birth_date, value\.dateOfBirth, value\.date_of_birth/);
});
