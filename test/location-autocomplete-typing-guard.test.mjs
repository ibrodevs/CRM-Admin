import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ui = await readFile(new URL('../js/ui.jsx', import.meta.url), 'utf8');

test('подсказки локаций не открываются до ввода текста пользователем', () => {
  assert.match(ui, /const \[hasTyped, setHasTyped\] = useState\(false\);/);
  assert.match(ui, /if \(!hasTyped \|\| query\.length < 2 \|\| selectedIsCurrent\)/);
  assert.match(ui, /\{open && hasTyped && text\.trim\(\)\.length >= 2 && \(/);
  assert.match(ui, /setHasTyped\(true\);/);
});
