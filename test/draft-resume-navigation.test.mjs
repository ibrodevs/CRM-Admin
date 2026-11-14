import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const source = readFileSync(new URL('../src/application/CRMApp.jsx', import.meta.url), 'utf8');
let body;
babel.traverse(babel.parseSync(source, { filename: 'CRMApp.jsx', presets: ['next/babel'], configFile: false, babelrc: false }), { CallExpression(path) { if (path.node.callee.name === 'useDraftNavigation') body = source.slice(path.node.arguments[0].start, path.node.arguments[0].end); } });
function resume(allowed = true) {
  const calls = [], values = new Map();
  const deps = { orders: [{ id: 'one', no: 'ORD-000042' }], auth: { user: { id: 1 } }, role: 'Оператор', roleCanSee: () => allowed,
    toast: (...args) => calls.push(['toast', ...args]), openOrder: (order) => calls.push(['order', order]), createOrder: () => calls.push(['create']),
    setRoute: (route) => calls.push(['route', route]), setIntent() {}, setCtxOrder() {} };
  const callback = new Function(...Object.keys(deps), `return (${body});`)(...Object.values(deps));
  const store = { write(scope, field, value) { values.set(`${scope}/${field}`, value); }, read(scope, field, fallback) { return values.get(`${scope}/${field}`) ?? fallback; } };
  return { calls, values, open: (entry) => callback(entry, store) };
}
test('opening a saved selection returns to its form and does not create an order or run booking', () => {
  const h = resume();
  assert.equal(h.open({ type: 'free-booking' }), true);
  assert.equal(h.values.get('dashboard/searchMounted'), true);
  assert.equal(h.values.get('dashboard/searchOpen'), true);
  assert.deepEqual(h.calls, [['route', 'dashboard']]);
});
test('order drafts open only their matching available order and inaccessible records remain unopened', () => {
  const h = resume();
  assert.equal(h.open({ type: 'order', orderId: 'one' }), true);
  assert.equal(h.calls[0][1].no, 'ORD-000042');
  assert.equal(h.open({ type: 'order', orderId: 'deleted' }), false);
  assert.equal(h.calls.filter((entry) => entry[0] === 'order').length, 1);
  const denied = resume(false);
  assert.equal(denied.open({ type: 'free-booking' }), false);
  assert.deepEqual([...denied.values], []);
});
