import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
function harness() {
  let cursor = 0; const values = [];
  const filename = fileURLToPath(new URL('../src/application/shell/Sidebar.jsx', import.meta.url));
  const mod = new Module(filename);
  mod.require = (id) => {
    if (id === 'react') return { ...React, useEffect() {}, useRef: () => ({ current: null }), useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], (v) => { values[i] = typeof v === 'function' ? v(values[i]) : v; }]; } };
    if (id.endsWith('icons/index.jsx')) return { Icon: 'Icon', BrandMark: 'Brand' };
    if (id.endsWith('Avatar.jsx')) return { Avatar: 'Avatar' };
    if (id.endsWith('Overlays.jsx')) return { Drawer: 'Drawer' };
    if (id.endsWith('Toast.jsx')) return { ToastDock: 'Dock' };
    if (id.endsWith('navigation.js')) return { NAV_ITEMS: [], SERVICE_KEYS: [], ORDER_OPS_SECTIONS: [] };
    return require(id);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  return (name, props) => { cursor = 0; return mod.exports[name](props); };
}
const all = (node) => Array.isArray(node) ? node.flatMap(all) : node && typeof node === 'object' ? [node, ...all(node.props?.children)] : [];
test('account avatar opens a drawer and profile navigation and logout retain their handlers', () => {
  const render = harness(); let route, loggedOut = false;
  const props = { user: { name: 'Иван Иванов', role: 'Оператор' }, onNavigate: (value) => { route = value; }, onLogout: () => { loggedOut = true; } };
  let nodes = all(render('ProfileCard', props));
  assert.equal(nodes.find((node) => node.type === 'Drawer').props.open, false);
  nodes.find((node) => node.props['aria-label'] === 'Открыть личный кабинет').props.onClick();
  nodes = all(render('ProfileCard', props));
  assert.equal(nodes.find((node) => node.type === 'Drawer').props.open, true);
  nodes.find((node) => node.type === 'button' && React.Children.toArray(node.props.children).includes('Мой профиль')).props.onClick();
  assert.equal(route, 'profile');
  assert.equal(all(render('ProfileCard', props)).find((node) => node.type === 'Drawer').props.open, false);
  nodes.find((node) => node.props.className?.includes('account-panel-logout')).props.onClick();
  assert.equal(loggedOut, true);
});
test('sidebar footer contains the notification dock instead of the former account menu', () => {
  const nodes = all(harness()('Sidebar', { route: 'orders', user: {}, onNavigate() {} }));
  assert.equal(nodes.filter((node) => node.type === 'Dock').length, 1);
  assert.equal(nodes.filter((node) => node.type?.name === 'ProfileCard').length, 0);
});
