import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');

test('заказ и пассажир выбираются через стандартные боковые окна CRM', () => {
  assert.match(editor, /UFDateField, UnifiedBindField/);
  assert.match(editor, /title="Привязка к заказу"/);
  assert.match(editor, /modes=\{\['order'\]\}/);
  assert.match(editor, /title="Привязка к пассажиру"/);
  assert.match(editor, /modes=\{\['person'\]\}/);
  assert.doesNotMatch(editor, /placeholder="Выберите или укажите ФИО"/);
  assert.doesNotMatch(editor, /placeholder="PSC-2026-000125"/);
});
