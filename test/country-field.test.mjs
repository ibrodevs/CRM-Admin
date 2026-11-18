import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import * as countries from '../src/shared/lib/countries.js';
import { sourceFiles, parse, traverse } from '../scripts/lib/architecture.mjs';
import { hotelCitizenship } from '../src/modules/services/hotels/search-criteria.js';
import { insuranceCriteria } from '../src/modules/services/insurance/insurance-search.js';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');

test('one country reference resolves legacy names, codes and names outside the old short list', () => {
  assert.ok(countries.COUNTRY_OPTIONS.length >= 249);
  for (const value of ['Россия', 'РФ', 'ru', 'RUS']) {
    assert.equal(countries.countryCode(value), 'RU');
  }
  assert.equal(countries.countryCode('Киргизия'), 'KG');
  assert.equal(countries.countryCode('Франция'), 'FR');
  assert.equal(countries.countryName('FR'), 'Франция');
  assert.equal(countries.countryCode('Уругвай'), 'UY');
  assert.equal(countries.countryCode('Другое'), '');
  assert.equal(countries.countryCode('Марс'), '');
  assert.equal(countries.searchCountries('рф')[0].code, 'RU');
  assert.ok(countries.searchCountries('Emirates').some((row) => row.code === 'AE'));
  assert.deepEqual(countries.countrySelection('Турция, TR; Грузия'), ['TR', 'GE']);
  assert.equal(hotelCitizenship('Франция'), 'FR');
  assert.equal(hotelCitizenship('Все'), undefined);
});

function harness(props) {
  const values = []; let cursor = 0, focused = 0;
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? { ...require('react'), useState: (initial) => { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], (next) => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; }, useRef: () => ({ current: { focus() { focused++; } } }) }
    : name.includes('countries.js') ? countries : name.includes('country-flag') ? { countryFlag: (code) => code }
    : name.includes('Overlays') ? { Drawer: 'Drawer' } : name.includes('SearchBox') ? { SearchBox: 'SearchBox' } : name.includes('Button') ? { Button: 'Button' } : name.includes('icons') ? { Icon: 'Icon' } : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/shared/ui/CountryField.jsx', import.meta.url), 'utf8'), { filename: 'CountryField.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
  return { render: () => { cursor = 0; const tree = nodes(mod.exports.CountryField(props)); const drawer = tree.find((node) => node.type === 'Drawer'); return tree.filter((node) => node === drawer || !(!drawer.props.open && nodes(drawer).includes(node))); }, focused: () => focused };
}

test('citizenship opens a search drawer, commits a code and returns focus to its trigger', () => {
  const changed = [], h = harness({ value: 'Кыргызстан', onChange: (value) => changed.push(value), title: 'Гражданство' });
  let tree = h.render(); tree.find((node) => node.type === 'button' && node.props['aria-haspopup']).props.onClick();
  tree = h.render(); assert.equal(tree.find((node) => node.type === 'Drawer').props.open, true);
  const search = tree.find((node) => node.type === 'SearchBox'); assert.equal(search.props.autoFocus, true);
  search.props.onChange('Франция'); tree = h.render();
  const choices = tree.filter((node) => node.type === 'button' && node.key);
  assert.equal(choices.length, 1); assert.equal(choices[0].key, 'FR'); choices[0].props.onClick();
  assert.deepEqual(changed, ['FR']); assert.equal(h.render().find((node) => node.type === 'Drawer').props.open, false); assert.equal(h.focused(), 1);
});

test('multiple country selection applies once; closing without apply preserves the previous request', () => {
  const changed = [], h = harness({ value: 'Турция', multiple: true, valueFormat: 'name', onChange: (value) => changed.push(value) });
  let tree = h.render(); tree.find((node) => node.type === 'button' && node.props['aria-haspopup']).props.onClick(); tree = h.render();
  tree.find((node) => node.key === 'GE').props.onClick(); assert.deepEqual(changed, []);
  tree = h.render(); tree.find((node) => node.type === 'Drawer').props.onClose(); assert.deepEqual(changed, []);
  tree = h.render(); tree.find((node) => node.type === 'button' && node.props['aria-haspopup']).props.onClick(); tree = h.render(); tree.find((node) => node.key === 'GE').props.onClick(); tree = h.render();
  tree.find((node) => node.type === 'Drawer').props.footer.props.children.find((node) => node?.type === 'Button' && !node.props.variant).props.onClick(); assert.deepEqual(changed, ['Турция, Грузия']);
});

test('citizenship cannot become an arbitrary string in an insurer request', () => {
  const form = { start: new Date(2099, 0, 1), end: new Date(2099, 0, 2), countries: 'Турция', citizenship: 'Россия', travellers: [{ birth_date: '1990-01-01' }], coverage: 30000, coverageCurrency: 'EUR', purpose: 'tourism', currency: 'RUB' };
  assert.equal(insuranceCriteria(form).citizenship, 'RU');
  assert.throws(() => insuranceCriteria({ ...form, citizenship: 'Любое' }), /гражданство/);
});

test('citizenship controls across the application cannot regress to local text or select fields', () => {
  const violations = [];
  for (const file of sourceFiles(fileURLToPath(new URL('../src', import.meta.url)))) {
    if (!file.endsWith('.jsx')) continue;
    const ast = parse(readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, { JSXOpeningElement(path) {
      if (!['Input', 'Select', 'input', 'select'].includes(path.node.name.name)) return;
      const value = path.node.attributes.find((attr) => attr.name?.name === 'value')?.value?.expression;
      if (value?.type === 'MemberExpression' && ['citizenship', 'nationality'].includes(value.property?.name)) violations.push(file);
    } });
  }
  assert.deepEqual(violations, []);
});
