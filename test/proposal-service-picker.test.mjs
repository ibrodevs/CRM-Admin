import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n?.props ? [n, ...nodes(n.props.children)] : [];
function picker(onAdd = () => {}) {
  const state = [], notifications = [];
  const bindings = { useToast: () => (...args) => notifications.push(args), getDefaultCurrency: () => 'RUB', resolveCurrency: value => value || 'RUB', KP_KIND_CODE: { 'Авиа': 'avia', 'Гостиница': 'hotel' }, PAX_DEFAULT_OPTIONS: {}, ...Object.fromEntries(['StackPanel', 'Button', 'FreeBookingPanel', 'DraftScope'].map(key => [key, key])) };
  const source = readFileSync(new URL('../src/modules/proposals/ui/OffersPage.jsx', import.meta.url), 'utf8');
  const ast = babel.parseSync(source, { filename: 'OffersPage.jsx', presets: ['next/babel'], configFile: false, babelrc: false });
  const fn = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'KpServicePicker');
  const mod = new Module(import.meta.filename);
  mod.require = name => name === 'react' ? { ...require('react'), useState(initial) { const i = state.length; state.push(initial); return [initial, next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; } } : name === 'bindings' ? bindings : require(name);
  mod._compile(babel.transformSync(`import React,{useState} from 'react';import {${Object.keys(bindings)}} from 'bindings';${source.slice(fn.start, fn.end)};export {KpServicePicker};`, { filename: 'picker.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const tree = mod.exports.KpServicePicker({ currency: 'RUB', scopeId: 'proposal-123', onAdd, onClose() {} });
  return { form: nodes(tree).find(n => n.type === 'FreeBookingPanel'), scope: nodes(tree).find(n => n.type === 'DraftScope'), state, notifications };
}

test('KP uses the same free booking component, with one default passenger and isolated search drafts', () => {
  const h = picker();
  assert.ok(h.form);
  assert.equal(h.form.props.selectionMode, 'proposal');
  assert.equal(h.form.props.aviaParams.pax.adt, 1);
  assert.equal(h.form.props.aviaParams.currency, 'RUB');
  assert.equal(h.scope.props.name, 'kp-service-picker/proposal-123');
});
test('individual flight fares are added separately with real offer IDs and totals', () => {
  const added = [], h = picker(item => added.push(item));
  const success = h.form.props.onAddAvia([{ _backendOfferId: 'first', title: 'Москва → Стамбул', cost: 100, fee: 5, currency: 'RUB' }, { selectedOffer: { id: 'second' }, title: 'Москва → Стамбул', cost: 200, currency: 'RUB' }]);
  assert.equal(success, true);
  assert.deepEqual(added.map(item => [item.kind, item.offer, item.cost + item.fee]), [['avia', 'first', 105], ['avia', 'second', 200]]);
  assert.equal(h.state[2], 2);
});
test('a different currency or unknown price cannot be silently added as a free service', () => {
  const added = [], h = picker(item => added.push(item));
  assert.equal(h.form.props.onAddOther({ cost: 100, currency: 'EUR' }, 'Гостиница'), false);
  assert.equal(h.form.props.onAddOther({ currency: 'RUB' }, 'Гостиница'), false);
  assert.equal(added.length, 0);
  assert.equal(h.form.props.onAddOther({ cost: 0, currency: 'RUB', _backendOfferId: 'free' }, 'Гостиница'), true);
  assert.equal(added[0].offer, 'free');
});
