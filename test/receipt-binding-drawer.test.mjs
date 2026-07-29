import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');

test('привязка квитанции объединяет заказ и физлицо в одном верхнем блоке', () => {
  assert.match(editor, /UFDateField, UnifiedBindField/);
  assert.match(editor, /Section title="Привязка квитанции"/);
  assert.match(editor, /modes=\{\['order', 'person'\]\}/);
  assert.match(editor, /title="Куда привязать квитанцию"/);
  assert.match(editor, /title="Привязка к пассажиру"/);
  assert.match(editor, /modes=\{\['person'\]\}/);
  assert.doesNotMatch(editor, /10\. Привязка к CRM/);
  assert.doesNotMatch(editor, /9\. Привязка к CRM/);
  assert.doesNotMatch(editor, /placeholder="Выберите или укажите ФИО"/);
  assert.doesNotMatch(editor, /placeholder="PSC-2026-000125"/);
});

test('услуга и соответствующий перелёт выбираются в боковых панелях', () => {
  assert.match(editor, /function ReceiptRelationField/);
  assert.match(editor, /<Drawer open=\{open\}/);
  assert.match(editor, /title="Выбор услуги"/);
  assert.match(editor, /title="Соответствующий перелёт"/);
  assert.match(editor, /placeholder="Выберите услугу"/);
  assert.match(editor, /placeholder="Выберите перелёт"/);
  assert.match(editor, /relationServiceOptions/);
  assert.match(editor, /relationFlightOptions/);
  assert.match(editor, /crmServiceId/);
  assert.match(editor, /crmTripId/);
  assert.doesNotMatch(editor, /<Input value=\{p\.crmService/);
  assert.doesNotMatch(editor, /<Input value=\{p\.crmTrip/);
});
