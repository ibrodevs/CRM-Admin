import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');

function navigationHarness() {
  const cells = [];
  let cursor = 0;
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial;
    return [cells[index], (next) => { cells[index] = typeof next === 'function' ? next(cells[index]) : next; }];
  };
  const filename = fileURLToPath(new URL('../src/application/routing/useAppNavigation.js', import.meta.url));
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === 'react') return { useState, useEffect() {}, useRef: (initial) => ({ current: initial }) };
    if (name.includes('Drafts')) return { useDraftState: (_scope, _field, initial) => useState(initial), useDraftControls: () => ({ has: () => false }) };
    if (name.includes('auth-context')) return { useAuth: () => ({ user: { id: 'operator' } }) };
    return require(name);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  return () => { cursor = 0; return mod.exports.useAppNavigation(); };
}

test('client and supplier chats open over the current page without replacing its order context', () => {
  const render = navigationHarness();
  render().navigate('clients');
  const order = { id: 'order-one', no: 'ORD-000001' };
  render().setCtxOrder(order);
  const thread = { id: 'thread-one', orderId: 'order-one', order: 'ORD-000001', name: 'Клиент' };
  render().openChatThread(thread);
  assert.equal(render().route, 'clients');
  assert.equal(render().ctxOrder, order);
  assert.equal(render().chatTarget, thread, 'UI thread must not be converted into a different order/thread');
  assert.equal(render().chatOpen, true);
  render().setChatOpen(false);
  assert.equal(render().route, 'clients', 'closing restores the same workspace');
  render().navigate('suppliers');
  const supplier = { id: 'thread-two', type: 'supplier', order_number: '', order: null };
  render().openChatThread(supplier);
  assert.equal(render().route, 'suppliers');
  assert.equal(render().chatTarget, supplier, 'raw server thread reaches the drawer unchanged');
  assert.equal(render().chatOpen, true);
});

test('the chat registry uses the same overlay opener and does not render a second conversation', () => {
  const source = readFileSync(new URL('../src/modules/chats/ui/ChatsPage.jsx', import.meta.url), 'utf8');
  const registry = source.slice(source.indexOf('function ChatsPage({'), source.indexOf('Object.assign(window'));
  assert.match(registry, /onOpenChat\?\.\(thread\)/);
  assert.doesNotMatch(registry, /<ChatThread|<ChatInfoPanel|gridTemplateColumns/);
});
