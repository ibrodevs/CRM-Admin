import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as dateRange from '../src/shared/ui/date-range.js';
import { calendarMonths } from '../src/shared/ui/calendar-months.js';
import { validateFreeFlightSearch } from '../src/modules/services/flights/free-flight-search.js';
import { validateFreeServiceSearch } from '../src/modules/services/free-booking-search.js';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
function mount(props) {
  const state = [];
  let hook = 0;
  const filename = fileURLToPath(new URL('../src/shared/ui/CalendarPicker.jsx', import.meta.url));
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === 'react') return {
      ...require('react'), useEffect() {}, useMemo: (fn) => fn(), useRef: () => ({ current: null }),
      useState: (initial) => {
        const index = hook++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (next) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
      },
    };
    if (name.includes('icons')) return { Icon: 'Icon' };
    if (name.includes('Button')) return { Button: 'Button' };
    if (name.includes('calendar-months')) return { calendarMonths };
    if (name.includes('date-range')) return dateRange;
    return require(name);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  const all = (node) => Array.isArray(node) ? node.flatMap(all) : node?.props ? [node, ...all(node.props.children)] : [];
  const nodes = () => { hook = 0; return all(mod.exports.CalendarPicker(props)); };
  return { nodes, control: (label) => nodes().find((node) => node.props['aria-label'] === label), text: (label) => nodes().find((node) => node.type === 'button' && node.props.children === label) };
}
const today = new Date(2026, 10, 13, 18, 30);

test('calendar rejects past selections and stale drafts, including directly invoked callbacks', () => {
  const chosen = [];
  const picker = mount({ mode: 'single', minDate: today, startVal: new Date(2026, 10, 1), autoConfirm: true, onConfirm: (date) => chosen.push(date) });
  assert.equal(picker.control('Предыдущий месяц').props.disabled, true);
  const past = picker.control('12 ноября 2026 г.');
  assert.equal(past.props.disabled, true);
  past.props.onClick();
  assert.equal(chosen.length, 0);
  const confirm = picker.nodes().find((node) => node.type === 'Button');
  assert.equal(confirm.props.disabled, true);
  confirm.props.onClick();
  assert.equal(chosen.length, 0);
  picker.control('13 ноября 2026 г.').props.onClick();
  assert.equal(chosen[0].getDate(), 13);
});

test('month and year use bounded grids and update the same date picker', () => {
  const picker = mount({ mode: 'single', minDate: today, startVal: today });
  picker.control('Выбрать год').props.onClick();
  assert.equal(picker.text(2025), undefined);
  assert.equal(picker.control('Предыдущие годы').props.disabled, true);
  picker.text(2027).props.onClick();
  picker.control('Выбрать месяц').props.onClick();
  picker.text('Февраль').props.onClick();
  assert.ok(picker.control('28 февраля 2027 г.'));
  assert.equal(picker.control('29 февраля 2027 г.'), undefined);
  picker.control('Выбрать год').props.onClick();
  picker.text(2028).props.onClick();
  assert.ok(picker.control('29 февраля 2028 г.'));
});

test('historical periods remain selectable and birth-date upper bounds disable future dates', () => {
  const chosen = [];
  const history = mount({ mode: 'single', minDate: null, startVal: new Date(1990, 0, 1), autoConfirm: true, onConfirm: (date) => chosen.push(date) });
  history.control('1 января 1990 г.').props.onClick();
  assert.equal(chosen[0].getFullYear(), 1990);
  const birth = mount({ mode: 'single', minDate: new Date(1900, 0, 1), maxDate: today, startVal: today });
  assert.equal(birth.control('12 ноября 2026 г.').props.disabled, false);
  assert.equal(birth.control('14 ноября 2026 г.').props.disabled, true);
  assert.equal(birth.control('Следующий месяц').props.disabled, true);
});

test('strict local date parsing and submit validation reject invalid or past travel dates', () => {
  assert.equal(dateRange.parseCalendarDate('31.02.2026'), null);
  assert.equal(dateRange.parseCalendarDate('2026-02-29'), null);
  assert.equal(dateRange.parseCalendarDate('29.02.2028').getDate(), 29);
  const base = { trip: 'ow', from: 'MOW', to: 'LED', depDate: '2026-11-12', pax: { adt: 1 } };
  assert.match(validateFreeFlightSearch(base, today), /сегодняшнего/);
  assert.equal(validateFreeFlightSearch({ ...base, depDate: '2026-11-13' }, today), null);
  for (const kind of ['rail', 'transfers', 'buses', 'lounge']) {
    assert.match(validateFreeServiceSearch(kind, { from: 'A', to: 'B', date: '2026-11-12', pax: 1 }, today), /сегодняшнего/);
  }
});

test('shared date wrappers retain string formats, historical use and birth-date bounds', () => {
  const filename = fileURLToPath(new URL('../src/shared/ui/UnifiedDateField.jsx', import.meta.url));
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name.includes('CalendarField')) return { DateField: 'DateField' };
    if (name.includes('Field.jsx')) return { Field: 'Field' };
    if (name.includes('date-range')) return dateRange;
    return require(name);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  let selected;
  const history = mod.exports.UFDateField({ label: 'Дата договора', value: '12.04.2010', onChange: (value) => { selected = value; } }).props.children;
  assert.equal(history.props.minDate, null);
  assert.equal(history.props.maxDate, null);
  history.props.onChange(new Date(1990, 5, 20));
  assert.equal(selected, '20.06.1990');
  assert.equal(mod.exports.ufParseDate('31.02.2026'), null);
  const birth = mod.exports.UFDateField({ label: 'Дата рождения', value: null, onChange() {} }).props.children;
  assert.equal(birth.props.minDate.getFullYear(), 1900);
  assert.equal(dateRange.localDay(birth.props.maxDate).getTime(), dateRange.localDay(new Date()).getTime());
});

test('a completed transport period permits same-day travel while hotels require another night', () => {
  for (const allowSameDay of [false, true]) {
    const chosen = [];
    const picker = mount({ mode: 'range', minDate: today, requireComplete: true, allowSameDay, autoConfirm: true, onConfirm: (...dates) => chosen.push(dates) });
    picker.control('13 ноября 2026 г.').props.onClick();
    picker.control('13 ноября 2026 г.').props.onClick();
    assert.equal(chosen.length, allowSameDay ? 1 : 0);
    if (!allowSameDay) {
      picker.control('14 ноября 2026 г.').props.onClick();
      assert.equal(chosen.length, 1);
    }
  }
});
