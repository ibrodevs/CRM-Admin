import { airportOption, searchAirportOptions } from '../src/modules/services/flights/airport-options.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');

test('airport cities can be typed in the clicked field without focusing a second portal input', () => {
  const effects = [], refs = [], states = [false, ''];
  let hook = 0, refIndex = 0, focused = 0;
  const source = readFileSync(new URL('../src/modules/services/flights/FlightsPage.jsx', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('function AirportField('), source.indexOf('const PAX_DEFAULT_OPTIONS'));
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === './airport-options.js' ? { airportOption, searchAirportOptions } : name === 'react' ? {
    ...require('react'),
    useState: () => { const index = hook++; return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useRef: () => { const index = refIndex++; return refs[index] ||= { current: null }; },
    useEffect: (effect) => effects.push(effect),
  } : require(name);
  mod._compile(babel.transformSync(`import {useState,useRef,useEffect} from 'react';
    import {airportOption,searchAirportOptions} from './airport-options.js';
    const FloatingPanel='FloatingPanel',Icon='Icon',useRecentLocations=()=>[[],()=>{}];
    ${body} export {AirportField};`, { filename: 'airport-field.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const render = () => { hook = 0; refIndex = 0; effects.length = 0; return mod.exports.AirportField({ value: 'FRU', onChange() {} }); };
  const nodes = (n) => Array.isArray(n) ? n.flatMap(nodes) : n?.props ? [n, ...nodes(n.props.children)] : [];
  let tree = render();
  const field = () => nodes(render()).find((n) => n.type === 'input');
  assert.equal(field().props.value, 'Бишкек · FRU');
  assert.equal(field().props.role, 'combobox');
  assert.equal(field().props['aria-expanded'], false);
  field().ref.current = { focus(options) { assert.deepEqual(options, { preventScroll: true }); focused++; } };
  for (let attempt = 0; attempt < 2; attempt++) {
    nodes(tree).find((n) => n.props.className === 'input airport-field-trigger').props.onClick();
    assert.equal(focused, attempt + 1, 'clicking any part of the field immediately focuses the real input');
    field().props.onFocus();
    assert.equal(field().props.value, '');
    field().props.onChange({ target: { value: 'Москва' } });
    tree = render();
    assert.equal(field().props.value, 'Москва');
    assert.equal(field().props['aria-expanded'], true);
    const panel = nodes(tree).find((n) => n.type === 'FloatingPanel');
    assert.equal(nodes(panel.props.children).filter((n) => n.type === 'input').length, 0, 'no second search field in the popup');
    const options = nodes(panel.props.children).filter((n) => n.props.className === 'dropdown-item');
    assert.ok(options.some((n) => JSON.stringify(n.props.children).includes('все аэропорты')));
    panel.props.onClose();
    tree = render();
    assert.equal(field().props['aria-expanded'], false);
  }
});
