import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);

test('hotel supplier booking does not fall back to generic OCR reference', async () => {
  const source = await readFile(editorUrl, 'utf8');

  assert.match(source, /function cleanHotelSupplierBooking\(value\)/);
  assert.match(source, /\^\(\?:рования\|бронирования\|номер бронирования/);
  assert.match(source, /const fallbackSupplierOrder = \(type === 'ЖД' \|\| type === 'Трансфер'\)/);
  assert.match(source, /draft\.supplierOrderNo = type === 'Гостиница'/);
});

test('empty hotel booking fields have a clear placeholder', async () => {
  const source = await readFile(editorUrl, 'utf8');

  assert.match(source, /Бронирование поставщика', 'supplierOrderNo', \{ placeholder: 'Не указано в ваучере' \}/);
  assert.match(source, /Бронирование отеля', 'hotelBookingNo', \{ placeholder: 'Не указано в ваучере' \}/);
});
