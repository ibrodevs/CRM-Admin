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

test('collapsed notifications expose the strongest remaining severity and cards include readable type labels', () => {
  const h = harness();
  const props = { toasts: [{ ...sample(1), kind: 'warn' }, { ...sample(2), kind: 'err' }], onClose() {}, onClear() {}, onNav() {} };
  let panel = h.render('ToastStack', props);
  assert.equal(panel.props['data-urgency'], 'err');
  children(children(panel)[0]).find((node) => node.props['aria-label'] === 'Свернуть уведомления').props.onClick();
  panel = h.render('ToastStack', props);
  assert.equal(panel.props['data-urgency'], 'err');
  assert.equal(children(panel)[1].props.hidden, true);
  assert.equal(h.render('ToastStack', { ...props, toasts: [props.toasts[0]] }).props['data-urgency'], 'warn');
  const all = (node) => React.Children.toArray(node?.props?.children).flatMap((child) => typeof child === 'object' ? [child, ...all(child)] : []);
  for (const [kind, label] of [['ok', 'Успешно'], ['info', 'Информация'], ['warn', 'Важно'], ['err', 'Срочно']]) {
    const item = harness().render('ToastItem', { t: { ...sample(1), kind }, onClose() {}, onNav() {} });
    assert.equal(all(item).find((node) => node.props.className === 'toast-urgency').props.children, label);
  }
});


test('notification header toggles from its title, counter and empty area while close and arrow act only once', () => {
  const h = harness();
  let cleared = 0;
  const props = { toasts: [sample(1)], onClose() {}, onClear() { cleared++; }, onNav() {} };
  const header = () => children(h.render('ToastStack', props))[0];
  const hidden = () => children(h.render('ToastStack', props))[1].props.hidden;
  for (const area of ['title', 'counter', 'space']) {
    const before = hidden();
    header().props.onClick({ target: { closest: () => null, area } });
    assert.equal(hidden(), !before);
  }
  const before = hidden();
  const arrow = children(header()).find((n) => n.props['aria-expanded'] != null);
  arrow.props.onClick();
  header().props.onClick({ target: { closest: () => ({ tagName: 'BUTTON' }) } });
  assert.equal(hidden(), !before, 'arrow bubbling must not toggle the header a second time');
  children(header()).find((n) => n.props.title === 'Скрыть все').props.onClick();
  header().props.onClick({ target: { closest: () => ({ tagName: 'BUTTON' }) } });
  assert.equal(cleared, 1);
  assert.equal(hidden(), false, 'clearing must not collapse an emptied queue through click bubbling');
});

test('sidebar notification dock persists at zero, opens above navigation, and retains the queue when cleared', () => {
  const h = harness(); let cleared = 0;
  let props = { toasts: [], docked: true, onClose() {}, onClear() { cleared++; }, onNav() {} };
  let panel = h.render('ToastStack', props);
  assert.match(panel.props.className, /is-docked/);
  assert.match(panel.props.className, /is-empty/);
  assert.equal(children(panel)[1].props.hidden, true);
  children(children(panel)[0]).find((node) => node.props['aria-expanded'] != null).props.onClick();
  panel = h.render('ToastStack', props);
  assert.equal(children(panel)[1].props.hidden, false);
  props = { ...props, toasts: [sample(1)] };
  panel = h.render('ToastStack', props);
  assert.doesNotMatch(panel.props.className, /is-empty/);
  children(children(panel)[0]).find((node) => node.props.title === 'Скрыть все').props.onClick();
  assert.equal(cleared, 1);
  panel = h.render('ToastStack', { ...props, toasts: [] });
  assert.ok(panel, 'zero events leaves a persistent outlined entry instead of disappearing');
  assert.equal(children(panel)[1].props.hidden, true);
});

test('moving notifications into the sidebar portal preserves actions and unregisters its target on exit', () => {
  const h = harness(undefined, { 'react-dom': { createPortal: (content, target) => React.createElement('Portal', { target }, content) } });
  let provider = h.render('ToastProvider');
  provider.props.value('Event', 'info', { id: 'kept', action: { route: 'orders', label: 'Заказ' } });
  const target = {};
  const cleanup = children(provider)[0].props.value(target);
  provider = h.render('ToastProvider');
  const portal = children(provider).at(-1);
  assert.equal(portal.props.target, target);
  assert.equal(portal.props.children.props.docked, true);
  assert.equal(portal.props.children.props.toasts[0].action.route, 'orders');
  cleanup();
  const stack = children(h.render('ToastProvider')).at(-1);
  assert.equal(stack.props.docked, false);
  assert.equal(stack.props.toasts[0].id, 'kept');
});

test('compact notification uses the one-word action while preserving its exact destination and full text', () => {
  let destination, closed;
  const message = 'Полный текст уведомления с подробностями и сроком выполнения';
  const item = harness().render('ToastItem', { t: { ...sample(1), msg: message, action: { label: 'Перейти к разделу', route: 'documents' } }, onClose: (id) => { closed = id; }, onNav: (route) => { destination = route; } });
  const all = (node) => React.Children.toArray(node?.props?.children).flatMap((child) => typeof child === 'object' ? [child, ...all(child)] : []);
  const elements = all(item);
  assert.equal(elements.find((node) => node.props.className === 'toast-msg').props.children, message);
  const action = elements.find((node) => node.props.className === 'toast-link');
  assert.equal(action.props.children, 'Перейти');
  action.props.onClick();
  assert.equal(destination, 'documents');
  assert.equal(closed, 'event-1');
});
