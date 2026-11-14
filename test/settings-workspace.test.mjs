import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const all = (n) => Array.isArray(n) ? n.flatMap(all) : n && typeof n === 'object' ? [n, ...all(n.props?.children)] : [];
function setup(permissions, api = {}) {
  let cursor = 0; const values = [], effects = [], deps = [];
  const auth = { user: { id: 'me', name: 'Admin', permissions }, refreshSession: async () => {} };
  const filename = fileURLToPath(new URL('../src/modules/settings/ui/SettingsPage.jsx', import.meta.url));
  const mod = new Module(filename);
  mod.require = (id) => {
    if (!id.startsWith('.') && id !== 'react') return require(id);
    if (id === 'react') return { ...React, useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], (v) => { values[i] = typeof v === 'function' ? v(values[i]) : v; }]; }, useEffect(fn, next) { const i = cursor++; if (!deps[i] || next.some((v,j) => v !== deps[i][j])) { deps[i] = next; effects.push(fn); } } };
    return new Proxy({ __esModule: true }, { get(_, key) {
      if (key === '__esModule') return true;
      if (key === 'useAuth') return () => auth;
      if (key === 'useToast') return () => () => {};
      if (key === 'translate') return (v) => v;
      if (key === 'usersApi' || key === 'workspaceSettingsApi') return api;
      if (key === 'toLegacyUser') return (v) => ({ ...v, serverId: v.id });
      if (key === 'resultsOf') return (v) => v.results || v;
      return key;
    } });
  };
  globalThis.window ||= {};
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  return { render(name, props = {}) { cursor = 0; return all(mod.exports[name](props)); }, async effects() { effects.splice(0).forEach((fn) => fn()); await new Promise(setImmediate); } };
}
test('role-only administrator sees a working roles view, without empty parameter or staff tabs', () => {
  const h = setup(['roles.manage']);
  const tabs = h.render('SettingsPage').find((n) => n.type === 'Tabs').props;
  assert.deepEqual(tabs.tabs.map((t) => t.key), ['roles']);
  assert.equal(tabs.value, 'roles');
});
test('organization settings opens the same organizational workflow as the profile', () => {
  const h = setup(['users.manage']);
  let nodes = h.render('SettingsPage');
  nodes.find((n) => n.type === 'Tabs').props.onChange('organization');
  nodes = h.render('SettingsPage');
  assert.equal(nodes.find((n) => n.type === 'OrgStructure').props.user.id, 'me');
  assert.equal(nodes.find((n) => n.type === 'OrgStructure').props.canManage, true);
  nodes.find((n) => n.type === 'Tabs').props.onChange('params');
  assert.ok(h.render('SettingsPage').some((n) => n.type === 'button' && all(n).some((c) => [c.props?.children].flat().includes('Нормативы отклика и доступ к услугам'))));
});
test('creating an employee sends one stable role code even when role names collide', async () => {
  let sent;
  const h = setup(['users.manage'], { roles: async () => [{ code: 'custom-a', name: 'Специалист' }, { code: 'custom-b', name: 'Специалист' }], create: async (body) => { sent = body; return body; } });
  h.render('AddUserDrawer', { open: true }); await h.effects();
  let nodes = h.render('AddUserDrawer', { open: true });
  for (const [label, value] of [['ФИО', 'Иванов Иван'], ['E-mail', 'ivan@example.test'], ['Роль', 'custom-b'], ['Начальный пароль', 'Test-password-123']]) {
    const field = nodes.find((n) => n.type === 'Field' && n.props.label === label);
    all(field).find((n) => ['Input', 'Select'].includes(n.type)).props.onChange({ target: { value } });
    nodes = h.render('AddUserDrawer', { open: true });
  }
  await all(nodes.find((n) => n.type === 'Drawer').props.footer).find((n) => n.type === 'Button' && n.props.children === 'Добавить').props.onClick();
  assert.deepEqual(sent.roles, ['custom-b']);
});
test('failed visibility load cannot overwrite persisted settings with defaults', async () => {
  let writes = 0;
  const h = setup(['settings.manage'], { getTenant: async () => { throw new Error('Сеть недоступна'); }, saveTenant: async () => { writes++; } });
  h.render('CardVisibilityModal', { open: true }); await h.effects();
  const nodes = h.render('CardVisibilityModal', { open: true });
  const save = all(nodes.find((n) => n.type === 'Drawer').props.footer).find((n) => n.props?.children === 'Сохранить');
  assert.equal(save.props.disabled, true);
  await save.props.onClick();
  assert.equal(writes, 0);
  assert.ok(nodes.some((n) => n.props?.role === 'alert' && n.props.children === 'Сеть недоступна'));
});
