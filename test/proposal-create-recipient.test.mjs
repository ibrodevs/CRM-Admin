import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';

const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const source = readFileSync(new URL('../src/modules/proposals/ui/OffersPage.jsx', import.meta.url), 'utf8');
const ast = babel.parseSync(source, { filename: 'OffersPage.jsx', presets: ['next/babel'], configFile: false, babelrc: false });
const fn = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'KPCreateModal');
function nodes(tree) { if (!tree) return []; if (Array.isArray(tree)) return tree.flatMap(nodes); if (typeof tree !== 'object') return []; return [tree, ...nodes(tree.props?.children)]; }
function text(tree) { if (tree == null || tree === false) return ''; if (Array.isArray(tree)) return tree.map(text).join(''); if (typeof tree !== 'object') return String(tree); return text(tree.props?.children); }
function mount() {
  const stored = {}, calls = []; let hook = 0;
  const state = (key, initial) => { if (!(key in stored)) stored[key] = typeof initial === 'function' ? initial() : initial; return [stored[key], value => { stored[key] = typeof value === 'function' ? value(stored[key]) : value; }]; };
  const bindings = { useToast: () => () => {}, useState: initial => state(`hook/${hook++}`, initial), useDraftState: (scope, key, initial) => state(`${scope}/${key}`, initial), useDraftControls: () => ({ clear() {} }), getDefaultCurrency: () => 'RUB', splitProposalRoute: () => ({from:'',to:''}), ufDateIso: v => v, CURRENCIES: [], toLegacyProposal: v => v,
    proposalsApi: { create: async body => { calls.push(['create', body]); return {id:'kp'}; }, detail: async () => ({id:'kp'}) },
    interactiveApi: { get: async () => ({version:1,draft:{}}), save: async (id, version, body) => calls.push(['save',body]) },
    ...Object.fromEntries(['TripDateRangeField','Drawer','Button','Field','Input','UnifiedBindPicker','UFDateField','ProposalRouteFields','Select','ConfirmDialog'].map(name => [name,name])) };
  const mod = new Module(import.meta.filename); mod.require = name => name === 'bindings' ? bindings : require(name);
  mod._compile(babel.transformSync(`import React from 'react';import {${Object.keys(bindings)}} from 'bindings';${source.slice(fn.start, fn.end)};export {KPCreateModal};`, {filename:'create.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code, import.meta.filename);
  const render = () => { hook = 0; return mod.exports.KPCreateModal({open:true,orders:[],onCreated(){},onClose(){}}); };
  const select = value => { let tree = render(); nodes(tree).find(n => n.type === 'Button' && n.props.className === 'kp-recipient-button').props.onClick(); tree = render(); nodes(tree).find(n => n.type === 'UnifiedBindPicker').props.onPick(value); };
  const submit = async () => { stored['proposal-create/title'] = 'Поездка'; const tree = render(); const button = nodes(tree.props.footer).find(n => n.type === 'Button' && text(n) === 'Открыть конструктор'); await button.props.onClick(); };
  return {render,select,submit,stored,calls};
}
test('one recipient control replaces the duplicate order field and displays the selected order', () => {
  const h = mount();
  assert.equal(nodes(h.render()).filter(n => n.type === 'Field' && n.props.label === 'Заказ').length, 0);
  assert.equal(nodes(h.render()).filter(n => n.type === 'Button' && n.props.className === 'kp-recipient-button').length, 1);
  h.select({mode:'order',order:{id:'order-id',no:'ORD-1',client:'Иван Петров'}});
  const trigger = nodes(h.render()).find(n => n.props?.className === 'kp-recipient-button');
  assert.match(text(trigger), /Иван Петров/); assert.match(text(trigger), /ORD-1/);
});
test('an order loaded in the unified picker remains bound even when absent from the registry props', async () => {
  const h = mount(); h.select({mode:'order',order:{id:'order-id',no:'ORD-1',client:'Иван Петров'}}); await h.submit();
  assert.equal(h.calls.find(c => c[0] === 'create')[1].order, 'order-id');
});
test('changing the recipient clears a previously selected order instead of keeping a conflicting binding', async () => {
  const h = mount(); h.select({mode:'order',order:{id:'old',no:'ORD-1',client:'Первый'}}); h.select({mode:'person',id:'person-id',client:'Второй'}); await h.submit();
  assert.equal(h.calls.find(c => c[0] === 'create')[1].order, null);
  assert.deepEqual(h.calls.find(c => c[0] === 'save')[1].recipient_ref, {type:'person',id:'person-id'});
});
