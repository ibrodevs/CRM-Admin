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
