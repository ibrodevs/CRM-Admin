import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { popoverPosition } from '../src/shared/ui/popover-position.js';
import { scrollPopoverOption } from '../src/shared/ui/scroll-popover-option.js';

const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');

for (const [minWidth, closeOnScroll] of [[0, false], [360, false], [224, true]]) test(`floating menus stay fixed across internal scrolling and repeated resize notifications (minimum width ${minWidth}, dismiss on scroll ${closeOnScroll})`, (t) => {
  const old = { window: globalThis.window, document: globalThis.document, ResizeObserver: globalThis.ResizeObserver };
  t.after(() => { cleanup?.(); for (const [key, value] of Object.entries(old)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
  const listeners = new Map(), effects = [], positions = [];
  let observed, position = null, setters = 0, cleanup, outsideListener, capture, closed = 0;
  globalThis.window = { innerWidth: 1024, innerHeight: 800, addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: (name) => listeners.delete(name) };
  globalThis.document = { body: {}, addEventListener(name, callback, useCapture) { if (name === 'mousedown') { outsideListener = callback; capture = useCapture; } }, removeEventListener() {} };
  globalThis.ResizeObserver = class { constructor(callback) { observed = callback; } observe() {} disconnect() {} };
  const filename = fileURLToPath(new URL('../src/shared/ui/FloatingPanel.jsx', import.meta.url));
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === 'react') return { ...require('react'), useRef: (current) => ({ current }), useLayoutEffect: (effect) => effects.push(effect), useState: () => [position, (update) => { setters++; const next = update(position); if (next !== position) positions.push(next); position = next; }] };
    if (name === 'react-dom') return { createPortal: (element) => element };
    if (name === './Overlays.jsx') return { useOverlayLayer() {} };
    if (name === './popover-position.js') return { popoverPosition };
    return require(name);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  let bounds = { left: 180.25, right: 465.75, top: 680, bottom: 730, width: 285.5 };
  const anchor = { contains: (node) => node === anchor, isConnected: true, getBoundingClientRect: () => bounds };
  const panel = { scrollHeight: 142, offsetHeight: 144, clientHeight: 142, offsetWidth: 286, contains: (node) => node === panel, getBoundingClientRect: () => ({ width: 285.5 }) };
  const element = mod.exports.FloatingPanel({ anchorRef: { current: anchor }, onClose: () => closed++, minWidth, closeOnScroll, children: 'Options' });
  element.ref(panel);
  cleanup = effects[0]();
  assert.equal(capture, true, 'outside clicks must run before a drawer stops event bubbling');
  outsideListener({ target: panel });
  outsideListener({ target: anchor });
  assert.equal(closed, 0, 'the picker and its trigger are inside');
  outsideListener({ target: {} });
  assert.equal(closed, 1, 'blank space outside closes the picker');
  assert.deepEqual(position, { left: 180.25, top: 530, width: Math.max(285.5, minWidth), maxHeight: 360 });
  const before = setters;
  for (let i = 0; i < 30; i++) listeners.get('scroll')({ target: panel });
  assert.equal(setters, before, 'scrolling options must not reposition the menu');
  assert.equal(closed, 1, 'scrolling hours/minutes must not dismiss the menu');
  for (let i = 0; i < 30; i++) observed();
  assert.equal(positions.length, 1, 'own resize notifications converge without fractional sizing feedback');
  bounds = { ...bounds, top: 620, bottom: 670 };
  listeners.get('scroll')({ target: {} });
  if (closeOnScroll) {
    assert.equal(closed, 2, 'scrolling the form dismisses the menu');
    assert.equal(position.top, 530, 'the menu must not move away from its opening position');
  } else assert.equal(position.top, 470, 'scrolling the containing drawer still tracks the field');
  if (minWidth === 360) {
    window.innerWidth = 320;
    listeners.get('resize')();
    assert.equal(position.width, 304, 'wide suggestions remain inside a narrow viewport');
    assert.equal(position.left, 8);
  }
});

test('keyboard navigation scrolls only the list, with borders excluded from its visible area', () => {
  const row = { getBoundingClientRect: () => ({ top: 192, bottom: 228 }), scrollIntoView() { throw new Error('must not scroll page or drawers'); } };
  const panel = { scrollTop: 20, clientTop: 1, clientHeight: 100, contains: (node) => node === row, getBoundingClientRect: () => ({ top: 100 }) };
  scrollPopoverOption(panel, row);
  assert.equal(panel.scrollTop, 47);
  row.getBoundingClientRect = () => ({ top: 90, bottom: 120 });
  scrollPopoverOption(panel, row);
  assert.equal(panel.scrollTop, 36);
  row.getBoundingClientRect = () => ({ top: 120, bottom: 150 });
  scrollPopoverOption(panel, row);
  assert.equal(panel.scrollTop, 36, 'a visible hovered row does not need scrolling');
});
