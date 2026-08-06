import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cssUrl = new URL('../app/compact-steppers.css', import.meta.url);
const layoutUrl = new URL('../app/layout.jsx', import.meta.url);

test('компактные стили счётчиков подключены глобально', async () => {
  const [css, layout] = await Promise.all([
    readFile(cssUrl, 'utf8'),
    readFile(layoutUrl, 'utf8'),
  ]);

  assert.match(layout, /import '\.\/compact-steppers\.css';/);
  assert.match(css, /\.input:has\(/);
  assert.match(css, /> button\.btn\.btn-icon\.btn-sm/);
  assert.match(css, /\.hp-stepper button/);
  assert.match(css, /\.pcp-stepper button/);
});

test('кнопки плюс и минус меньше поля и не врезаются в его границы', async () => {
  const css = await readFile(cssUrl, 'utf8');

  assert.match(css, /height: 40px;/);
  assert.match(css, /width: 30px;/);
  assert.match(css, /height: 30px;/);
  assert.match(css, /padding: 4px 6px !important;/);
  assert.match(css, /overflow: hidden;/);
});
