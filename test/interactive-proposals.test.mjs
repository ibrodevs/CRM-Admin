import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseOption, chosenTotal, selectionErrors } from '../src/modules/proposals/model/interactive.js';
const payload = { mode: 'both', currency: 'RUB', groups: [
  { id: 'air', title: 'Авиа', required: true, options: [{ id: 'a', price: '0.10', availability: 'available' }, { id: 'b', price: '0.20', availability: 'available' }] },
  { id: 'hotel', title: 'Отели', required: false, options: [{ id: 'h', price: '0.20', availability: 'available', requires: ['a'] }] },
], packages: [{ id: 'p', option_ids: ['a', 'h'] }] };
test('client total uses cents and only selected services', () => { assert.equal(chosenTotal(payload, ['a', 'h']), .3); assert.equal(chosenTotal(payload, []), 0); });
test('changing service replaces only the option in the same group', () => { assert.deepEqual(chooseOption(payload, ['a', 'h'], 'air', 'b'), ['h', 'b']); });
test('selection validates dependencies, required groups and package composition', () => {
  assert.deepEqual(selectionErrors(payload, ['a', 'h'], 'p'), []);
  assert.ok(selectionErrors(payload, ['b', 'h'], null).length);
  assert.ok(selectionErrors(payload, ['h'], null).length);
  assert.ok(selectionErrors(payload, ['a', 'b'], null).length);
  assert.ok(selectionErrors(payload, ['a'], 'p').length);
});
test('package-only mode disallows a free composition', () => { assert.ok(selectionErrors({ ...payload, mode: 'packages' }, ['a'], null).length); });
