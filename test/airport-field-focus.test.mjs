import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');

test('opening either airport field focuses its search after portal placement, including reopening', (t) => {
  const original = { requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
  t.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
  const frames = [], effects = [], refs = [], states = [false, ''];
  let hook = 0, refIndex = 0, focused = 0;
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  globalThis.cancelAnimationFrame = () => {};
  const source = readFileSync(new URL('../src/modules/services/flights/FlightsPage.jsx', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('function AirportField('), source.indexOf('const PAX_DEFAULT_OPTIONS'));
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? {
    ...require('react'),
    useState: () => { const index = hook++; return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useRef: () => { const index = refIndex++; return refs[index] ||= { current: null }; },
    useEffect: (effect) => effects.push(effect),
  } : require(name);
  mod._compile(babel.transformSync(`import {useState,useRef,useEffect} from 'react';
    const FloatingPanel='FloatingPanel',Icon='Icon',AIRPORTS=[];
    ${body} export {AirportField};`, { filename: 'airport-field.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const render = () => { hook = 0; refIndex = 0; effects.length = 0; return mod.exports.AirportField({ value: 'FRU', onChange() {} }); };
  const nodes = (n) => Array.isArray(n) ? n.flatMap(nodes) : n?.props ? [n, ...nodes(n.props.children)] : [];
  let tree = render();
  nodes(tree).find((n) => n.props.className === 'input').props.onClick();
  for (let attempt = 0; attempt < 2; attempt++) {
    tree = render();
    const input = nodes(tree).find((n) => n.type === 'input');
    input.ref.current = { focus(options) { assert.deepEqual(options, { preventScroll: true }); focused++; } };
    effects[0]();
    assert.equal(focused, attempt);
    frames.pop()();
    assert.equal(focused, attempt + 1);
    input.props.onChange({ target: { value: 'Москва' } });
    assert.equal(states[1], 'Москва');
    nodes(tree).find((n) => n.type === 'FloatingPanel').props.onClose();
    tree = render();
    nodes(tree).find((n) => n.props.className === 'input').props.onClick();
  }
});
