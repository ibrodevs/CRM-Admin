import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import React from 'react';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const all = (n) => Array.isArray(n) ? n.flatMap(all) : n && typeof n === 'object' ? [n, ...all(n.props?.children)] : [];
function harness(providers) {
  let cursor = 0, sent, requested; const values = [], deps = [], effects = [];
  const hook = (initial) => { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], (v) => { values[i] = typeof v === 'function' ? v(values[i]) : v; }]; };
  const react = { ...React, useState: hook, useEffect(fn, next) { const i = cursor++; if (!deps[i] || next.some((v,j) => v !== deps[i][j])) { deps[i] = next; effects.push(fn); } } };
  const source = readFileSync(new URL('../src/modules/orders/ui/OrderCard.jsx', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('function QuickAddForm('), source.indexOf('\nfunction AddServicePanel'));
  const prefix = `import {useState,useEffect} from 'react'; import {useDraftState,useToast,suppliersApi,resultsOf,SERVICE_KIND,formatIsoDateTime,fmtDate,Field,Input,Select,DateField,Button} from 'bindings';`;
  const mod = new Module(import.meta.filename);
  mod.require = (id) => id === 'react' ? react : id === 'bindings' ? { useDraftState: (_, __, initial) => hook(initial), useToast: () => () => {}, suppliersApi: { list: async (params) => { requested = params; return { results: providers }; } }, resultsOf: (v) => v.results || v, SERVICE_KIND: {}, formatIsoDateTime: () => null, fmtDate: () => '', ...Object.fromEntries(['Field','Input','Select','DateField','Button'].map((v) => [v,v])) } : require(id);
  mod._compile(babel.transformSync(prefix + body + '\nexport {QuickAddForm};', {filename:'QuickAddForm.jsx', presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code, import.meta.filename);
  return { render() { cursor = 0; return all(mod.exports.QuickAddForm({ kind: 'Страховка', currency: 'RUB', onAdd: (offer, kind) => { sent = { offer, kind }; } })); }, async load() { effects.splice(0).forEach((fn) => fn()); await new Promise(setImmediate); }, sent: () => sent, requested: () => requested };
}
test('insurance supplier choices come from the active insurance directory, including all suppliers', async () => {
  const h = harness([{ id:'one',name:'Страховая А' }, { id:'two',name:'Страховая Б' }]); h.render(); await h.load();
  let nodes = h.render();
  assert.deepEqual(h.requested(), {service_kind:'insurance',status:'active'});
  const select = nodes.find((n) => n.type === 'Select');
  assert.deepEqual(select.props.options.map((r) => r.value), ['__all__','one','two']);
  select.props.onChange({target:{value:'__all__'}}); nodes = h.render();
  assert.ok(nodes.some((n) => n.props?.['aria-label'] === 'Сравнение страховых предложений'));
  assert.equal(nodes.find((n) => n.type === 'Button' && n.props.icon === 'plus').props.disabled, true);
  const title = all(nodes.find((n) => n.type === 'Field' && n.props.label === 'Название услуги')).find((n) => n.type === 'Input');
  title.props.onChange({target:{value:'Страховка ВЗР'}});
  nodes.find((n) => n.type === 'Input' && n.props['aria-label'] === 'Стоимость страховки: Страховая Б').props.onChange({target:{value:'0'}});
  nodes = h.render();
  const choices = nodes.filter((n) => n.type === 'Button' && n.props.children === 'Выбрать');
  assert.equal(choices[0].props.disabled, true, 'missing amount is not a free policy');
  assert.equal(choices[1].props.disabled, false, 'explicit zero is allowed');
  choices[1].props.onClick();
  assert.equal(h.sent().offer.supplierId, 'two'); assert.equal(h.sent().offer.supplier, 'Страховая Б'); assert.equal(h.sent().offer.cost, 0);
  assert.equal(h.sent().kind, 'Страховка');
});
test('empty insurance directory explains the missing suppliers and blocks creation', async () => {
  const h = harness([]); h.render(); await h.load(); const nodes = h.render();
  assert.equal(nodes.find((n) => n.type === 'Select').props.disabled, true);
  assert.equal(nodes.find((n) => n.type === 'Button' && n.props.icon === 'plus').props.disabled, true);
  assert.ok(nodes.some((n) => typeof n.props?.children === 'string' && n.props.children.includes('нет активных поставщиков')));
});
