import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { REMARK_GROUPS, REMARK_LIMIT, remarkGroup, remarkPage } from '../src/modules/services/hotels/remarks.js';

const rows = Array.from({ length: 123 }, (_, i) => ({ id: i + 1, title: i === 0 ? 'Время заезда {value}' : i === 1 ? 'Телефон гостя {value}' : i === 2 ? 'Детская кровать' : i === 3 ? 'Особое обслуживание' : `Тихий номер, этаж ${i}`, dataType: i < 2 ? 'STRING' : 'NONE' }));
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const source = fs.readFileSync(new URL('../src/modules/services/hotels/HotelRemarks.jsx', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace('export function', 'function');
const code = babel.transformSync(source, { babelrc: false, configFile: false, presets: ['next/dist/compiled/babel/preset-react'] }).code;
async function mount() {
  const state = [], effects = [];
  let cursor = 0, selected = [], request = '';
  const bindings = { React, REMARK_GROUPS, REMARK_LIMIT, remarkGroup, remarkPage, AbortController,
    useId: () => 'remarks-test', useEffect: (effect) => { if (!effects.length) effects.push(effect); },
    useState: (initial) => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], (value) => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    servicesApi: { hotelRemarks: async () => ({ results: rows }) },
  };
  vm.createContext(bindings); vm.runInContext(code, bindings);
  const render = () => { cursor = 0; return bindings.HotelRemarks({ offerId: 'test', value: selected, onChange: (value) => { selected = value; }, operatorRequest: request, onOperatorRequestChange: (value) => { request = value; } }); };
  render(); effects[0](); await Promise.resolve();
  const all = (node, predicate) => !node ? [] : Array.isArray(node) ? node.flatMap((child) => all(child, predicate)) : typeof node === 'object' ? [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)] : [];
  return { render, get selected() { return selected; }, get request() { return request; }, find: (predicate) => all(render(), predicate), checkboxes: () => all(render(), (n) => n.type === 'input' && n.props.type === 'checkbox') };
}

test('123 wishes are grouped without loss and have bounded pages and normalized search', () => {
  const seen = [];
  for (let page = 0; page < 16; page++) seen.push(...remarkPage(rows, '', 'all', page).rows.map((row) => row.id));
  assert.deepEqual(seen, rows.map((row) => row.id));
  assert.equal(remarkPage(rows, '  ТИХИЙ  этаж  ').total, 119);
  assert.equal(remarkPage(rows, '', 'stay').total, 1);
  assert.equal(remarkPage(rows, '', 'beds').total, 1);
  assert.equal(remarkPage(rows, '', 'other').total, 1);
  assert.equal(remarkPage(rows, 'нет такого').total, 0);
  assert.equal(remarkPage(rows, '', 'all', 999).index, 15);
});

test('actual wish picker keeps selection, detail values and local text across filtering and pagination', async () => {
  const ui = await mount();
  assert.equal(ui.checkboxes().length, 8);
  ui.checkboxes()[0].props.onChange({ target: { checked: true } });
  ui.find((n) => n.type === 'input' && n.props.required)[0].props.onChange({ target: { value: '18:00' } });
  ui.find((n) => n.type === 'textarea')[0].props.onChange({ target: { value: 'Уточнить условия у отеля' } });
  ui.find((n) => n.props?.['aria-label'] === 'Следующая страница пожеланий')[0].props.onClick();
  assert.equal(ui.checkboxes().length, 8);
  ui.find((n) => n.props?.type === 'search')[0].props.onChange({ target: { value: 'Детская' } });
  assert.equal(ui.checkboxes().length, 1);
  assert.equal(ui.find((n) => n.type === 'input' && n.props.required)[0].props.value, '18:00');
  assert.equal(ui.find((n) => n.type === 'textarea')[0].props.value, 'Уточнить условия у отеля');
  ui.checkboxes()[0].props.onChange({ target: { checked: true } });
  assert.deepEqual(JSON.parse(JSON.stringify(ui.selected)), [{ remarkId: 1, data: '18:00' }, { remarkId: 3, data: null }]);
  ui.find((n) => n.props?.['aria-label'] === 'Убрать: Время заезда …')[0].props.onClick();
  assert.equal(ui.selected.length, 1);
  assert.equal(ui.selected[0].remarkId, 3);
});
