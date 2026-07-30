import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');


test('ИП и другие юридические формы не становятся авиакомпанией', () => {
  assert.match(editor, /function isReceiptLegalEntityName\(value\)/);
  assert.match(editor, /function firstReceiptAirlineValue\(\.\.\.values\)/);
  assert.match(editor, /!isReceiptLegalEntityName\(value\)/);
  assert.match(editor, /value\.carrier,[\s\S]*value\.airline,[\s\S]*draft\.legs\.find\(\(leg\) => leg\.carrier\)/);
  assert.match(editor, /value\.issuer/);
});


test('ложный маршрут из имени продавца очищается', () => {
  assert.match(editor, /isReceiptLegalEntityName\(normalized\.from\) \|\| isReceiptLegalEntityName\(normalized\.to\)/);
  assert.match(editor, /normalized\.from = '';/);
  assert.match(editor, /normalized\.to = '';/);
});
