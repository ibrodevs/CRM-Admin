import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const apiClientUrl = new URL('../js/api/client.js', import.meta.url);

async function loadGuessType() {
  const source = await readFile(pageUrl, 'utf8');
  const match = source.match(/function guessType\(name\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'guessType helper must exist');
  return Function(`${match[0]}; return guessType;`)();
}

test('unknown filenames stay unknown instead of being mislabeled as avia', async () => {
  const guessType = await loadGuessType();

  assert.equal(guessType('Клочков.pdf'), 'Прочее');
  assert.equal(guessType('receipt-001.pdf'), 'Прочее');
  assert.equal(guessType('маршрутная-квитанция.pdf'), 'Авиа');
  assert.equal(guessType('группа-жд.pdf'), 'ЖД');
  assert.equal(guessType('voucher_1989071.pdf'), 'Гостиница');
});

test('unknown type is visible and can be corrected by the operator', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /\{ value: 'Прочее', label: 'Тип не определён' \}/);
  assert.match(source, /Для сканов используется OCR/);
});

test('DRF permission details are shown instead of a generic error', async () => {
  const source = await readFile(apiClientUrl, 'utf8');

  assert.match(source, /error\.message \|\| error\.detail \|\| STATUS_MESSAGE/);
});
