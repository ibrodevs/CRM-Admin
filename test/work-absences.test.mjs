import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const all = (node) => Array.isArray(node) ? node.flatMap(all) : node && typeof node === 'object' ? [node, ...all(node.props?.children)] : [];
function form() {
  const values = []; let cursor = 0, created;
  const filename = fileURLToPath(new URL('../src/modules/profile/ui/WorkAbsences.jsx', import.meta.url));
  const mod = new Module(filename);
  mod.require = (id) => {
    if (id === 'react') return { ...React, useEffect() {}, useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], (v) => { values[i] = typeof v === 'function' ? v(values[i]) : v; }]; } };
    if (id.endsWith('api.js')) return { usersApi: { createAbsence: async (data) => { created = data; } } };
    if (id.endsWith('client.js')) return { resultsOf: (v) => v.results || v };
    if (id.endsWith('Toast.jsx')) return { useToast: () => () => {} };
    if (id.endsWith('UnifiedDateField.jsx')) return { UFDateField: 'Date', ufDateFromIso: (v) => v, ufDateIso: (v) => v };
    for (const name of ['Select', 'Button', 'Input']) if (id.endsWith(`/${name}.jsx`)) return { [name]: name };
    return require(id);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  return { render(canManage = false) { cursor = 0; return all(mod.exports.WorkAbsences({ user: { id: 'operator-1', name: 'Оператор', workStatus: 'Работает' }, canManage })); }, created: () => created };
}
test('operator absence exposes mandatory dates and submits a request without patching the live work status', async () => {
  const h = form();
  assert.equal(h.render().filter((n) => n.type === 'Date').length, 0);
  h.render().find((n) => n.type === 'Select').props.onChange({ target: { value: 'vacation' } });
  let nodes = h.render();
  assert.equal(nodes.filter((n) => n.type === 'Date').length, 2);
  await nodes.find((n) => n.type === 'Button' && n.props.children === 'Отправить на согласование').props.onClick();
  assert.equal(h.created(), undefined);
  nodes.filter((n) => n.type === 'Date')[0].props.onChange('2026-12-01');
  nodes.filter((n) => n.type === 'Date')[1].props.onChange('2026-12-10');
  nodes = h.render();
  await nodes.find((n) => n.type === 'Button' && n.props.children === 'Отправить на согласование').props.onClick();
  assert.deepEqual(h.created(), { user: 'operator-1', kind: 'vacation', starts_on: '2026-12-01', ends_on: '2026-12-10', comment: '' });
  assert.equal(h.render().filter((n) => n.type === 'Date').length, 0);
});
test('administrator can choose an employee and sees a direct absence action', () => {
  const h = form(); let nodes = h.render(true);
  assert.equal(nodes.filter((n) => n.type === 'Select').length, 2);
  nodes.filter((n) => n.type === 'Select')[1].props.onChange({ target: { value: 'day_off' } });
  nodes = h.render(true);
  assert.ok(nodes.find((n) => n.type === 'Button' && n.props.children === 'Сохранить отсутствие'));
});
