import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n?.props ? [n, ...nodes(n.props.children)] : [];
function picker(onAdd = () => {}, options = {}) {
  const state = [], notifications = [], calls = []; let cursor = 0;
  const useState = initial => { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; };
  const bindings = { useEffect(){}, ProposalComposition: 'ProposalComposition', useDraftState: (_scope, _field, initial) => useState(initial), useDraftControls: () => ({ hasWork: () => options.hasWork || false, clear: () => calls.push('clear') }), useDraftStatus: () => ({ failed: false }), useToast: () => (...args) => notifications.push(args), getDefaultCurrency: () => 'RUB', resolveCurrency: value => value || 'RUB', KP_KIND_CODE: { 'Авиа': 'avia', 'Гостиница': 'hotel' }, PAX_DEFAULT_OPTIONS: {}, ...Object.fromEntries(['StackPanel', 'Button', 'FreeBookingPanel', 'DraftScope', 'DraftCloseDialog'].map(key => [key, key])) };
  const source = readFileSync(new URL('../src/modules/proposals/ui/OffersPage.jsx', import.meta.url), 'utf8');
  const ast = babel.parseSync(source, { filename: 'OffersPage.jsx', presets: ['next/babel'], configFile: false, babelrc: false });
  const fn = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'KpServicePickerContent');
  const mod = new Module(import.meta.filename);
  mod.require = name => name === 'react' ? { ...require('react'), useState } : name === 'bindings' ? bindings : require(name);
  mod._compile(babel.transformSync(`import React,{useState} from 'react';import {${Object.keys(bindings)}} from 'bindings';${source.slice(fn.start, fn.end)};export {KpServicePickerContent};`, { filename: 'picker.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const render = () => { cursor = 0; return mod.exports.KpServicePickerContent({ currency: 'RUB', scopeId: 'proposal-123', onAdd, onClose() { calls.push('close'); }, onSaveDraft: options.save, onDiscardSelection() { calls.push('discard'); } }); };
  const tree = render();
  return { form: nodes(tree).find(n => n.type === 'FreeBookingPanel'), panel: nodes(tree).find(n => n.type === 'StackPanel'), state, notifications, calls, render, dialog: () => nodes(render()).find(n => n.type === 'DraftCloseDialog') };
}

test('KP uses the same free booking component, with one default passenger and isolated search drafts', () => {
  const h = picker();
  assert.ok(h.form);
  assert.equal(h.form.props.selectionMode, 'proposal');
  assert.equal(h.form.props.aviaParams.pax.adt, 1);
  assert.equal(h.form.props.aviaParams.currency, 'RUB');
  assert.equal(h.panel.props.closeOnBackdrop, true);
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

test('an empty picker closes directly, and entered searches ask before leaving', () => {
  const empty = picker(); empty.panel.props.onClose(); assert.deepEqual(empty.calls, ['close']);
  const filled = picker(() => {}, { hasWork: true }); filled.panel.props.onClose();
  assert.equal(filled.dialog().props.open, true); assert.deepEqual(filled.calls, []);
  filled.dialog().props.onCancel(); assert.equal(filled.dialog().props.open, false); assert.deepEqual(filled.calls, []);
});
test('changed flight options also ask to save even before running a search', () => {
  const h = picker(); h.form.props.setAviaParams({ ...h.form.props.aviaParams, trip: 'ow' });
  nodes(h.render()).find(n => n.type === 'StackPanel').props.onClose();
  assert.equal(h.dialog().props.open, true);
});
test('save closes only after success; failure keeps the picker and discard clears only its search', async () => {
  const saved = picker(() => {}, { hasWork: true, save: async () => true }); saved.panel.props.onClose();
  await saved.dialog().props.onSave(); assert.deepEqual(saved.calls, ['close']);
  const failed = picker(() => {}, { hasWork: true, save: async () => false }); failed.panel.props.onClose();
  await failed.dialog().props.onSave(); assert.deepEqual(failed.calls, []); assert.match(failed.dialog().props.note, /Не удалось/);
  failed.dialog().props.onDiscard(); assert.deepEqual(failed.calls, ['clear', 'discard', 'close']);
});
