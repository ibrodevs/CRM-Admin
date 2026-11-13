import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import { transferDepartureParts, transferProviderCriteria, validateFreeServiceSearch } from '../src/modules/services/free-booking-search.js';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const filename = fileURLToPath(new URL('../src/modules/services/transfers/TransferSearchOptions.jsx', import.meta.url));
const mod = new Module(filename);
mod.require = (name) => {
  if (name.endsWith('free-booking-search.js')) return { transferDepartureParts };
  if (name.endsWith('DateFields.jsx')) return { DateField: 'DatePicker', TimeField: 'TimePicker' };
  if (name.endsWith('Input.jsx')) return { Input: 'TextInput' };
  if (name.endsWith('Select.jsx')) return { Select: 'Choice' };
  if (name.endsWith('InfoNotice.jsx')) return { InfoNotice: 'Notice' };
  if (name.includes('icons')) return { Icon: 'Icon' };
  return require(name);
};
mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
const { TransferSearchOptions } = mod.exports;
function controls(form) {
  const all = (node) => Array.isArray(node) ? node.flatMap(all) : node && typeof node === 'object' ? [node, ...all(node.props?.children)] : [];
  const elements = all(TransferSearchOptions({ form, set: (key, value) => { form[key] = value; } }));
  return (type, property, value) => elements.find((node) => node.type === type && node.props[property] === value);
}
test('real transfer form uses date and time pickers and sends local time without timezone conversion', () => {
  const form = { dt: new Date(2027, 2, 10), from: 'A', to: 'B', pax: 1 };
  controls(form)('TimePicker', 'label', 'Время подачи').props.onChange('23:59');
  controls(form)('DatePicker', 'label', 'Дата отправления').props.onChange(new Date(2027, 2, 11));
  controls(form)('TimePicker', 'label', 'Время отправления').props.onChange('00:03');
  const result = transferProviderCriteria(form);
  assert.equal(result.pickup_time, '2027-03-10 23:59');
  assert.equal(result.departure_time, '2027-03-11 00:03');
  assert.equal(result.departure_date, undefined);
  assert.equal(result.departure_clock, undefined);
  assert.equal(validateFreeServiceSearch('transfers', form), null);
});
test('arrival selector exposes only the relevant number and excludes hidden retained values from API criteria', () => {
  const form = { flight_number: 'SU1234', train_number: '020А' };
  controls(form)('Choice', 'aria-label', 'Встреча по прибытии').props.onChange({ target: { value: 'train' } });
  assert.ok(controls(form)('TextInput', 'placeholder', 'Например, 020А'));
  assert.equal(controls(form)('TextInput', 'placeholder', 'Например, SU 1234'), undefined);
  assert.equal(transferProviderCriteria(form).flight_number, undefined);
  assert.equal(transferProviderCriteria(form).train_number, '020А');
  controls(form)('Choice', 'aria-label', 'Встреча по прибытии').props.onChange({ target: { value: 'none' } });
  assert.equal(transferProviderCriteria(form).train_number, undefined);
  assert.equal(form.train_number, '020А', 'switching back preserves the number in the draft');
});
test('incomplete departure and invalid pickup time are blocked before submitting search', () => {
  const base = { dt: new Date(2027, 2, 10), from: 'A', to: 'B', pax: 1 };
  for (const form of [{ ...base, departure_date: new Date(2027, 2, 11) }, { ...base, departure_clock: '13:05' }, { ...base, pickup_clock: '25:00' }]) {
    assert.throws(() => transferProviderCriteria(form));
    assert.ok(validateFreeServiceSearch('transfers', form));
  }
});
test('older departure values remain editable and clearing them never restores stale data', () => {
  const form = { departure_time: '2027-03-10 12:34' };
  assert.deepEqual(transferDepartureParts(form), { date: '2027-03-10', clock: '12:34' });
  controls(form)('button', 'children', 'Сбросить отправление').props.onClick();
  assert.equal(transferProviderCriteria(form).departure_time, undefined);
  assert.deepEqual(transferDepartureParts(form), { date: '', clock: '' });
});
