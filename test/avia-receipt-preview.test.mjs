import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

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

test('длинный авиа-предпросмотр прокручивается внутри и не перекрывает нижние блоки', () => {
  assert.match(css, /aviation receipt live preview containment/);
  assert.match(css, /\.receipt-edit-preview\{[\s\S]*?max-height:calc\(100dvh - 190px\)/);
  assert.match(css, /\.receipt-edit-preview\{[\s\S]*?overflow-y:auto/);
  assert.match(css, /\.receipt-edit-preview \.receipt-brand-segment-grid[\s\S]*?repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:1000px\)[\s\S]*?\.receipt-edit-preview\{[\s\S]*?position:static/);
  assert.match(css, /@media\(max-width:1000px\)[\s\S]*?max-height:none/);
});
