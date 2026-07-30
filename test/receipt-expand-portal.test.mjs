import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

test('кнопка Развернуть открывает квитанцию в portal поверх бокового окна', () => {
  assert.match(page, /import ReactDOM from 'react-dom';/);
  assert.match(page, /onClick=\{\(\) => setPreviewExpanded\(true\)\}/);
  assert.match(page, /previewExpanded && typeof document !== 'undefined' && ReactDOM\.createPortal\(/);
  assert.match(page, /document\.body,/);
  assert.match(page, /className="receipt-corrected-preview-overlay is-open"/);
});

test('Escape закрывает сначала развёрнутую квитанцию, не весь редактор', () => {
  assert.match(page, /event\.stopImmediatePropagation\(\)/);
  assert.match(page, /addEventListener\('keydown', closeOnEscape, true\)/);
  assert.match(page, /removeEventListener\('keydown', closeOnEscape, true\)/);
});

test('слой развёрнутой квитанции расположен выше Drawer', () => {
  const drawer = styles.match(/\.drawer-overlay\{[^}]*z-index:(\d+)/s);
  const preview = styles.match(/\.receipt-corrected-preview-overlay\{[^}]*z-index:(\d+)/s);
  assert.ok(drawer, 'Не найден z-index Drawer');
  assert.ok(preview, 'Не найден z-index развёрнутой квитанции');
  assert.ok(Number(preview[1]) > Number(drawer[1]), `Preview z-index ${preview[1]} должен быть выше Drawer ${drawer[1]}`);
});
