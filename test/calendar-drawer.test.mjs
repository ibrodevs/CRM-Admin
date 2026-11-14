import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import * as dates from '../src/shared/ui/date-range.js';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const nodes = (n) => Array.isArray(n) ? n.flatMap(nodes) : n?.props ? [n, ...nodes(n.props.children)] : [];
for (const range of [false, true]) test(`${range ? 'period' : 'single date'} opens in a drawer, validates selections and restores trigger focus`, () => {
  let open = false, focused = 0, selected;
  const ref = { current: { focus() { focused++; }, querySelector() { return { focus() { focused++; } }; } } };
  const file = range ? 'DateFields.jsx' : 'CalendarField.jsx';
  let source = readFileSync(new URL('../src/shared/ui/' + file, import.meta.url), 'utf8');
  if (range) source = source.slice(source.indexOf('function DateRangeField('), source.indexOf('// Travel searches')) + '\nexport { DateRangeField };';
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? { ...require('react'), useState: () => [open, (next) => { open = typeof next === 'function' ? next(open) : next; }], useRef: () => ref }
    : name.includes('Overlays') ? { Drawer: 'Drawer' } : name.includes('CalendarPicker') ? { CalendarPicker: 'Calendar', fmtDate: () => 'дата' }
    : name.includes('icons') ? { Icon: 'Icon' } : name.includes('date-range') ? dates : require(name);
  const prefix = range ? `import {useState,useRef} from 'react'; import {Drawer} from './Overlays.jsx'; import {CalendarPicker,fmtDate} from './CalendarPicker.jsx'; import {Icon} from '../icons/index.jsx'; import {parseCalendarDate,dateWithinBounds,completeDateRange} from './date-range.js';` : '';
  mod._compile(babel.transformSync(prefix + source, { filename: file, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const render = () => nodes(mod.exports[range ? 'DateRangeField' : 'DateField']({ minDate: new Date(2026, 10, 14), requireComplete: range, onChange: (...value) => { selected = value; } }));
  render().find((n) => n.type === 'button').props.onClick();
  const drawer = render().find((n) => n.type === 'Drawer');
  assert.equal(drawer.props.className, 'calendar-drawer');
  assert.equal(drawer.props.width, 'min(480px,100vw)');
  const calendar = nodes(drawer).find((n) => n.type === 'Calendar');
  calendar.props.onConfirm(new Date(2026, 10, 13), new Date(2026, 10, 15));
  assert.equal(selected, undefined);
  assert.equal(open, true);
  calendar.props.onConfirm(new Date(2026, 10, 15), new Date(2026, 10, 17));
  assert.equal(selected[0].getDate(), 15);
  assert.equal(open, false);
  assert.equal(focused, 1);
});
