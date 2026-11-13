import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as composition from '../src/modules/services/search/passenger-composition.js';
import { transferProviderCriteria, validateFreeServiceSearch } from '../src/modules/services/free-booking-search.js';

const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const filename = fileURLToPath(new URL('../src/modules/services/search/PassengerCompositionField.jsx', import.meta.url));
const mod = new Module(filename);
mod.require = (name) => {
  if (name === 'react') return { ...require('react'), useState: () => [true, () => {}], useRef: (current) => ({ current }) };
  if (name.endsWith('passenger-composition.js')) return composition;
  if (name.endsWith('FloatingPanel.jsx')) return { FloatingPanel: 'Panel' };
  if (name.endsWith('Select.jsx')) return { Select: 'Choice' };
  if (name.includes('icons')) return { Icon: 'Icon' };
  return require(name);
};
mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
function nodes(form, kind) {
  const all = (n) => Array.isArray(n) ? n.flatMap(all) : n && typeof n === 'object' ? [n, ...all(n.props?.children)] : [];
  return all(mod.exports.PassengerCompositionField({ form, kind, set: (k, v) => { form[k] = v; } }));
}
test('passenger picker saves child age, updates total and retains seat preference', () => {
  const form = { pax: 2 };
  nodes(form, 'rail').find((n) => n.type === 'button' && n.props.children?.includes?.('Добавить ребёнка')).props.onClick();
  assert.equal(form.pax, 3);
  assert.throws(() => composition.passengerCriteria(form, 'rail'), /возраст/);
  nodes(form, 'rail').find((n) => n.type === 'Choice').props.onChange({ target: { value: '3' } });
  nodes(form, 'rail').find((n) => n.type === 'input').props.onChange({ target: { checked: false } });
  const criteria = composition.passengerCriteria(form, 'rail');
  assert.equal(criteria.passengers, 3);
  assert.equal(criteria.seats_required, 2);
  assert.deepEqual(criteria.passenger_composition.children, [{ age: 3, with_seat: false }]);
  assert.equal(composition.railPassengerDrafts(form)[2].with_seat, false);
  nodes(form, 'rail').find((n) => n.type === 'Choice').props.onChange({ target: { value: '10' } });
  assert.equal(composition.passengerCriteria(form, 'rail').seats_required, 3);
});
test('transfer children require age-specific chairs and count towards vehicle capacity', () => {
  const form = { dt: new Date(2027, 0, 10), passenger_composition: { adults: 2, children: [{ age: 0 }, { age: 2 }, { age: 7 }] }, additional_service_types: ['table'] };
  const criteria = transferProviderCriteria(form);
  assert.equal(criteria.passengers, 5);
  assert.equal(criteria.seats_required, 5);
  assert.deepEqual(criteria.additional_service_types, ['table', 'infant_seat', 'seat', 'booster']);
  assert.ok(criteria.passenger_composition.children.every((child) => child.with_seat));
});
test('invalid compositions and zero total cannot be searched; teenage travellers are retained as children', () => {
  const base = { from: 'A', to: 'B', date: new Date(2027, 0, 10), pax: 1 };
  for (const value of [{ adults: 0, children: [] }, { adults: 1, children: [{ age: null }] }, { adults: -1, children: [] }, { adults: 1, children: [{ age: 8, with_seat: false }] }]) {
    assert.throws(() => composition.passengerCriteria({ ...base, passenger_composition: value }, 'rail'));
    assert.ok(validateFreeServiceSearch('rail', { ...base, passenger_composition: value }));
  }
  assert.equal(composition.passengerCriteria({ passenger_composition: { adults: 0, children: [{ age: 17, with_seat: true }] } }, 'rail').passengers, 1);
});
