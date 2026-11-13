import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hotelOccupancy } from '../src/modules/services/hotels/search-criteria.js';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
function load(file, bindings) {
  const filename = fileURLToPath(new URL(file, import.meta.url));
  const mod = new Module(filename);
  mod.require = (name) => bindings(name) || require(name);
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  return mod.exports;
}
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
test('common passenger drawer opens, closes and reopens with retained values and focus', () => {
  let open = false, focused = 0;
  const trigger = { current: { focus: () => focused++ } };
  const { PassengerPickerField } = load('../src/modules/services/search/PassengerPickerField.jsx', (name) => {
    if (name === 'react') return { ...require('react'), useRef: () => trigger, useState: () => [open, (value) => { open = value; }] };
    if (name.includes('Overlays')) return { Drawer: 'Drawer' };
    if (name.includes('Button')) return { Button: 'Button' };
    if (name.includes('icons')) return { Icon: 'Icon' };
  });
  const render = () => nodes(PassengerPickerField({ title: 'Состав пассажиров', summary: '2 взр. · 1 дет.', total: 3, children: 'Категории' }));
  const button = () => render().find((node) => node.type === 'button');
  const drawer = () => render().find((node) => node.type === 'Drawer');
  assert.equal(drawer().props.open, false);
  button().props.onClick();
  assert.equal(drawer().props.open, true);
  drawer().props.onClose();
  assert.equal(focused, 1);
  button().props.onClick();
  assert.equal(button().props.children[1].props.children, '2 взр. · 1 дет.');
  assert.equal(drawer().props.width, 'min(620px,100vw)');
  drawer().props.footer.props.onClick();
  assert.equal(open, false);
});

test('hotel drawer retains room composition and requires every child age', () => {
  let rooms = [{ adults: 2, childrenAges: [] }];
  const { HotelOccupancyPicker } = load('../src/modules/services/hotels/HotelOccupancyPicker.jsx', (name) => {
    if (name.includes('PassengerPickerField')) return { PassengerPickerField: 'Picker', PassengerCounterRow: 'Counter' };
    if (name.includes('Button')) return { Button: 'Button' };
    if (name.includes('Field.jsx')) return { Field: 'Field' };
    if (name.includes('Select')) return { Select: 'Select' };
    if (name.includes('search-criteria')) return { hotelOccupancy };
  });
  const render = () => nodes(HotelOccupancyPicker({ rooms, onChange: (next) => { rooms = next; } }));
  render().find((node) => node.type === 'Button' && node.props.children === 'Добавить ребёнка').props.onClick();
  assert.equal(render()[0].props.doneDisabled, true);
  render().find((node) => node.type === 'Select').props.onChange({ target: { value: '0' } });
  assert.equal(render()[0].props.doneDisabled, false);
  render().find((node) => node.type === 'Counter').props.onChange(3);
  assert.deepEqual(rooms, [{ adults: 3, childrenAges: [0] }]);
  assert.equal(render()[0].props.total, 4);
  render().find((node) => node.type === 'Button' && node.props.children === 'Добавить номер').props.onClick();
  assert.equal(rooms.length, 2);
  assert.deepEqual(rooms[0], { adults: 3, childrenAges: [0] });
});
