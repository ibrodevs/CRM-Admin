import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scrollPopoverOption } from '../src/shared/ui/scroll-popover-option.js';

const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
test('calendar year menu waits for portal placement before scrolling to the selected year', (t) => {
  const old = { document: globalThis.document, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
  t.after(() => { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
  const effects = [], frames = [];
  let hook = 0;
  const option = { getBoundingClientRect: () => ({ top: 3000, bottom: 3036 }) };
  const panel = { scrollTop: 0, clientTop: 1, clientHeight: 0, contains: (node) => node === option, getBoundingClientRect: () => ({ top: 100 }) };
  globalThis.document = { getElementById: (id) => id === 'year-menu-80' ? option : null };
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return 1; };
  globalThis.cancelAnimationFrame = () => {};
  const filename = fileURLToPath(new URL('../src/shared/ui/Select.jsx', import.meta.url));
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === 'react') return { ...require('react'), useRef: (current) => ({ current }), useEffect: (effect) => effects.push(effect), useId: () => 'year-menu', useState: () => [[true, 80][hook++], () => {}] };
    if (name.includes('translations')) return { translate: (s) => s };
    if (name.includes('FloatingPanel')) return { FloatingPanel() {} };
    if (name.includes('icons')) return { Icon() {} };
    if (name.includes('scroll-popover-option')) return { scrollPopoverOption };
    return require(name);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  const node = mod.exports.Select({ value: 2026, menuMinWidth: 140, menuClassName: 'calendar-select-dropdown', options: Array.from({ length: 101 }, (_, i) => ({ value: 1946 + i, label: String(1946 + i) })) });
  const [select, menu] = node.props.children;
  select.ref.current = { value: '2026' };
  menu.props.panelRef.current = panel;
  assert.equal(menu.props.minWidth, 140);
  assert.match(menu.props.className, /calendar-select-dropdown/);
  assert.equal(select.props.menuMinWidth, undefined, 'menu configuration must not leak into native select attributes');
  effects[0]();
  assert.equal(panel.scrollTop, 0);
  panel.clientHeight = 300; // FloatingPanel has now applied its viewport bounds.
  frames[0]();
  assert.equal(panel.scrollTop, 2635);
});
