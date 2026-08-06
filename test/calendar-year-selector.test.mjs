import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const uiUrl = new URL('../js/ui.jsx', import.meta.url);

test('общий календарь показывает и позволяет менять год', async () => {
  const source = await readFile(uiUrl, 'utf8');

  assert.match(source, /aria-label="Год"/);
  assert.match(source, /onChange=\{\(e\) => setYear\(Number\(e\.target\.value\)\)\}/);
  assert.match(source, /now\.getFullYear\(\) - 80 \+ i/);
});

test('месяц и год выбираются из одного заголовка календаря', async () => {
  const source = await readFile(uiUrl, 'utf8');

  assert.match(source, /aria-label="Месяц"/);
  assert.match(source, /CAL_MONTHS\.map\(\(name, index\)/);
  assert.match(source, /value=\{year\}/);
});
