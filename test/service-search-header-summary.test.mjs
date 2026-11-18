import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { cloneSearchValues } from '../src/modules/services/search/search-header.js';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');

test('compact fare header expands all editable criteria and cancels without altering the search', () => {
  const states = [], editingChanges = [];
  let hook = 0;
  const state = (initial) => {
    const index = hook++;
    if (!(index in states)) states[index] = initial;
    return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
  };
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? { ...require('react'), useState: state, useRef: () => ({ current: true }), useEffect() {} }
    : name.includes('Drafts.jsx') ? { useDraftState: (_scope, _key, initial) => state(initial) }
    : name.includes('Button.jsx') ? { Button: 'Button' }
    : name.includes('icons') ? { Icon: 'Icon' }
    : name.includes('search-header.js') ? { cloneSearchValues } : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/modules/services/search/ServiceSearchHeader.jsx', import.meta.url), 'utf8'), { filename: 'service-search-header.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const values = { from: 'city:MOW', to: 'city:IST' };
  const fields = ['trip', 'from', 'to', 'dates', 'passengers'].map((key) => ({ key, label: key, value: key, render: (draft, update) => require('react').createElement('input', { 'data-key': key, value: draft[key] || '', onChange: (value) => update({ [key]: value }) }) }));
  const props = { title: 'HZ', values, fields, summaryFields: fields.slice(-2), className: 'flight-search-header', onSearch() {}, onEditingChange: (value) => editingChanges.push(value) };
  const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
  const render = () => { hook = 0; return nodes(mod.exports.ServiceSearchHeader(props)); };
  let tree = render();
  assert.equal(tree.filter((node) => node.props.className === 'ssh-field').length, 2);
  tree.find((node) => node.type === 'Button').props.onClick();
  tree = render();
  assert.equal(tree.filter((node) => node.type === 'input').length, 5);
  assert.match(tree.find((node) => node.type === 'section').props.className, /is-editing/);
  tree.find((node) => node.props['data-key'] === 'from').props.onChange('LED');
  assert.equal(values.from, 'city:MOW');
  tree.find((node) => node.type === 'button').props.onClick();
  tree = render();
  assert.equal(tree.filter((node) => node.props.className === 'ssh-field').length, 2);
  assert.deepEqual(editingChanges, [true, false]);
  hook = 0;
  const genericTree = nodes(mod.exports.ServiceSearchHeader({ ...props, summaryFields: undefined }));
  assert.equal(genericTree.filter((node) => node.props.className === 'ssh-field').length, 5);
});
