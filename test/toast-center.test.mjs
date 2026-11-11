import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');

function harness(file = '../src/shared/ui/Toast.jsx', overrides = {}) {
  const values = [], effects = [];
  let cursor = 0;
  const filename = fileURLToPath(new URL(file, import.meta.url));
  const mod = new Module(filename);
  mod.require = (id) => {
    if (id in overrides) return overrides[id];
    if (id === 'react') return { ...React,
      useState(initial) { const slot = cursor++; if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial; return [values[slot], (next) => { values[slot] = typeof next === 'function' ? next(values[slot]) : next; }]; },
      useRef(initial) { const slot = cursor++; return values[slot] ||= { current: initial }; },
      useCallback: (callback) => callback,
      useEffect: (effect) => effects.push(effect),
    };
    if (id === '../icons/index.jsx') return { Icon: () => null };
    return require(id);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  return { components: mod.exports, effects, render(name, props = {}) { cursor = 0; effects.length = 0; return mod.exports[name](props); } };
}
const children = (node) => React.Children.toArray(node.props.children);
const sample = (i) => ({ id: `event-${i}`, kind: 'warn', title: `Событие ${i}`, msg: 'Описание', createdAt: 1794391200000 + i });

test('a burst of 20 events is retained and individually dismissible, without marking persistent notifications read', () => {
  const h = harness();
  let provider = h.render('ToastProvider');
  for (let i = 0; i < 20; i++) provider.props.value(`Сообщение ${i}`, 'info', { id: `event-${i}` });
  provider.props.value('Повтор доставки', 'info', { id: 'event-7' });
  provider = h.render('ToastProvider');
  let stack = children(provider).at(-1);
  assert.equal(stack.props.toasts.length, 20);
  assert.equal(new Set(stack.props.toasts.map((item) => item.id)).size, 20);
  stack.props.onClose('event-7');
  stack = children(h.render('ToastProvider')).at(-1);
  assert.equal(stack.props.toasts.length, 19);
  assert.ok(!stack.props.toasts.some((item) => item.id === 'event-7'));
  stack.props.onClear();
  assert.equal(children(h.render('ToastProvider')).at(-1).props.toasts.length, 0);
});

test('the counter, collapse, hover pause, viewport visibility and notification-center link work for a large stack', (t) => {
  const old = globalThis.IntersectionObserver;
  let notify;
  globalThis.IntersectionObserver = class { constructor(callback) { notify = callback; } observe() {} disconnect() {} };
  t.after(() => { if (old === undefined) delete globalThis.IntersectionObserver; else globalThis.IntersectionObserver = old; });
  const h = harness(), toasts = Array.from({ length: 20 }, (_, i) => sample(i));
  let destination;
  const props = { toasts, onClose() {}, onClear() {}, onNav: (route) => { destination = route; } };
  let panel = h.render('ToastStack', props);
  let [header, list, footer] = children(panel);
  assert.equal(children(header).find((node) => node.props.className === 'toast-center-count').props.children, 20);
  assert.equal(children(list).length, 20);
  assert.equal(children(list)[0].props['data-toast-id'], 'event-19');
  assert.ok(children(list).every((slot) => children(slot)[0].props.paused), 'timers wait for visibility measurement');
  const slots = children(list).map((slot) => ({ dataset: { toastId: slot.props['data-toast-id'] } }));
  list.ref.current = { children: slots };
  h.effects[0]();
  notify(slots.map((target, i) => ({ target, isIntersecting: i < 2, intersectionRatio: i < 2 ? 1 : 0 })));
  panel = h.render('ToastStack', props); [, list] = children(panel);
  assert.deepEqual(children(list).slice(0, 4).map((slot) => children(slot)[0].props.paused), [false, false, true, true]);
  panel.props.onPointerEnter();
  panel = h.render('ToastStack', props); [, list] = children(panel);
  assert.ok(children(list).every((slot) => children(slot)[0].props.paused));
  panel.props.onPointerLeave();
  panel = h.render('ToastStack', props); [header] = children(panel);
  children(header).find((node) => node.props['aria-label'] === 'Свернуть уведомления').props.onClick();
  panel = h.render('ToastStack', props); [header, list, footer] = children(panel);
  assert.equal(list.props.hidden, true);
  assert.equal(footer.props.hidden, true);
  assert.equal(children(list).length, 20, 'collapsing preserves the queue and timer state');
  assert.ok(children(list).every((slot) => children(slot)[0].props.paused));
  children(header).find((node) => node.props['aria-label'] === 'Развернуть уведомления').props.onClick();
  panel = h.render('ToastStack', props); [, list, footer] = children(panel);
  assert.equal(list.props.hidden, false);
  children(footer).find((node) => node.type === 'button').props.onClick();
  assert.equal(destination, 'notifications');
  panel.props.onFocusCapture();
  panel = h.render('ToastStack', props); [, list] = children(panel);
  assert.ok(children(list)[0].props.children.props.paused);
  children(list)[0].props.children.props.onClose('event-19');
  panel = h.render('ToastStack', props); [, list] = children(panel);
  assert.equal(children(list)[0].props.children.props.paused, false, 'removing the focused close button must not leave future timers paused');
});

test('a hidden or paused toast keeps its remaining lifetime until it can be read', (t) => {
  const original = { now: Date.now, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  let now = 1000, scheduled;
  Date.now = () => now;
  globalThis.setTimeout = (callback, delay) => { scheduled = { callback, delay }; return 1; };
  globalThis.clearTimeout = () => {};
  t.after(() => { Date.now = original.now; globalThis.setTimeout = original.setTimeout; globalThis.clearTimeout = original.clearTimeout; });
  const h = harness(); let removed;
  const props = { t: { ...sample(1), duration: 6000 }, onClose: (id) => { removed = id; }, onNav() {} };
  h.render('ToastItem', { ...props, paused: true }); h.effects[0]();
  assert.equal(scheduled, undefined);
  h.render('ToastItem', props); const cleanup = h.effects[0]();
  assert.equal(scheduled.delay, 6000);
  now += 1500; cleanup(); scheduled = undefined;
  h.render('ToastItem', { ...props, paused: true }); h.effects[0]();
  now += 120000;
  assert.equal(scheduled, undefined);
  h.render('ToastItem', props); h.effects[0]();
  assert.equal(scheduled.delay, 4500);
  scheduled.callback();
  assert.equal(removed, 'event-1');
});


test('workspace refreshes do not repeat desktop popups for already shown notification IDs', (t) => {
  const oldSet = globalThis.setTimeout, oldClear = globalThis.clearTimeout;
  const timers = [], delivered = [];
  globalThis.setTimeout = (callback) => { timers.push(callback); return timers.length; };
  globalThis.clearTimeout = () => {};
  t.after(() => { globalThis.setTimeout = oldSet; globalThis.clearTimeout = oldClear; });
  const h = harness('../src/application/shell/DesktopNotifier.jsx', {
    '../../shared/ui/Toast.jsx': { useToast: () => (message, kind, options) => delivered.push(options.id) },
  });
  const notifications = Array.from({ length: 20 }, (_, i) => i + 1).map((id) => ({ id, priority: 'Высокий', title: `Event ${id}`, desc: 'Description', link: { type: 'finance' } }));
  const props = { enabled: true, desktop: false, notifications, orders: [], onNavigate() {}, onOpenOrder() {} };
  h.render('DesktopNotifier', props); h.effects[0]();
  while (timers.length) timers.shift()();
  assert.deepEqual(delivered, Array.from({ length: 20 }, (_, i) => `notification:${i + 1}`));
  h.render('DesktopNotifier', { ...props, notifications: [...notifications] }); h.effects[0]();
  assert.equal(timers.length, 0);
  assert.equal(delivered.length, 20);
  h.render('DesktopNotifier', { ...props, notifications: [...notifications, { ...notifications[0], id: 21 }] }); h.effects[0]();
  while (timers.length) timers.shift()();
  assert.deepEqual(delivered, Array.from({ length: 21 }, (_, i) => `notification:${i + 1}`));
});
