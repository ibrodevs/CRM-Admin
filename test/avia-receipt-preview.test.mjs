import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');

test('авиа-сегменты сохраняют класс, бронирование, статус и тарифные поля', () => {
  assert.match(editor, /function normalizeReceiptLeg\(row = \{\}\)/);
  assert.match(editor, /source\.booking_class/);
  assert.match(editor, /source\.booking_status/);
  assert.match(editor, /source\.flight_number/);
  assert.match(editor, /source\.fare_basis/);
  assert.match(editor, /source\.cabin_class/);
  assert.match(editor, /source\.baggage_allowance/);
  assert.match(editor, /value\.booking_status/);
  assert.match(editor, /value\.booking_reference/);
  assert.match(editor, /asArray\(value\.legs \|\| value\.segments/);
});

test('предпросмотр и бланк агентства используют один авиа-компонент', () => {
  assert.match(editor, /function ReceiptAviaDocument/);
  assert.match(editor, /Класс бронирования/);
  assert.match(editor, /Статус бронирования/);
  assert.match(editor, /Класс обслуживания/);
  assert.match(editor, /Правила обмена/);
  assert.match(editor, /Правила возврата/);
  assert.match(editor, /if \(type === 'Авиа'\) return[\s\S]*?<ReceiptAviaDocument draft=\{draft\}/);
  assert.match(editor, /type === 'Авиа' \? \([\s\S]*?<ReceiptAviaDocument draft=\{p\} organization=\{organization\}/);
});
