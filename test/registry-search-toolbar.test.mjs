import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const React = require('react');
const SearchBox = () => null;
const mod = new Module(import.meta.filename);
mod.require = (name) => name === './SearchBox.jsx' ? { SearchBox } : require(name);
mod._compile(require('next/dist/compiled/babel/core').transformSync(readFileSync(new URL('../src/shared/ui/SearchToolbar.jsx', import.meta.url), 'utf8'), { filename: 'SearchToolbar.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
test('registry search keeps its value and handler in a separate trailing column, independent of its former location', () => {
  let query = '';
  const update = (value) => { query = value; };
  const search = React.createElement(SearchBox, { key: 'search', value: 'Иван', onChange: update, style: { width: 220, minWidth: 260, flex: '1 1 260px' } });
  const filter = React.createElement('button', { key: 'filter' }, 'Статус');
  const spacer = React.createElement('div', { key: 'spacer', className: 'topbar-spacer' });
  for (const children of [[search, filter, spacer], [filter, spacer, search]]) {
    const tree = mod.exports.SearchToolbar({ children });
    const [controls, queryColumn] = tree.props.children;
    assert.equal(controls.props.children.length, 1);
    assert.equal(controls.props.children[0].props.children, 'Статус');
    const input = queryColumn.props.children[0];
    assert.equal(input.props.value, 'Иван');
    assert.equal(input.props.style.width, '100%');
    assert.equal(input.props.style.minWidth, 0);
    input.props.onChange('Пётр');
    assert.equal(query, 'Пётр');
    assert.equal(tree.props.role, 'search');
  }
});
