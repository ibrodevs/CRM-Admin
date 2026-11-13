import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');

test('time picker closes without changing time and can reopen and select hours or minutes', () => {
  const source = readFileSync(new URL('../src/shared/ui/DateFields.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('function TimeField(');
  const end = source.indexOf('Object.assign(window', start);
  let open = false;
  let value = '14:17';
  const React = require('react');
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? {
    ...React, useState: () => [open, (next) => { open = typeof next === 'function' ? next(open) : next; }],
    useRef: (current) => ({ current }), useEffect() {},
  } : require(name);
  mod._compile(babel.transformSync(`import {useState,useRef,useEffect} from 'react';
    const FloatingPanel='FloatingPanel', Icon='Icon';
    ${source.slice(start, end)} export {TimeField};`, {
    filename: 'time-field.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test',
  }).code, import.meta.filename);
  const render = () => mod.exports.TimeField({ label: 'Время подачи', value, minuteStep: 1, onChange: (next) => { value = next; } });
  const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
  const trigger = (tree) => nodes(tree).find((n) => n.props['aria-haspopup'] === 'dialog');
  const popup = (tree) => nodes(tree).find((n) => n.type === 'FloatingPanel');
  assert.equal(popup(render()), undefined);
  trigger(render()).props.onClick();
  assert.equal(trigger(render()).props['aria-expanded'], true);
  popup(render()).props.onClose(); // Outside click or Escape from shared FloatingPanel.
  assert.equal(popup(render()), undefined);
  assert.equal(value, '14:17');
  trigger(render()).props.onClick();
  let tree = render();
  assert.equal(popup(tree).props.anchorRef, trigger(tree).ref);
  const columns = nodes(popup(tree)).filter((n) => n.props.className === 'scroll');
  columns[0].props.children[15].props.onClick();
  assert.equal(value, '15:17');
  assert.equal(open, true);
  tree = render();
  nodes(popup(tree)).filter((n) => n.props.className === 'scroll')[1].props.children[23].props.onClick();
  assert.equal(value, '15:23');
  nodes(popup(render())).find((n) => n.props.children === 'Готово').props.onClick();
  assert.equal(open, false);
  assert.equal(value, '15:23');
});
