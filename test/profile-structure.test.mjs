import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const all = (n) => Array.isArray(n) ? n.flatMap(all) : n && typeof n === 'object' ? [n, ...all(n.props?.children)] : [];
function harness(file, seed, api) {
  let cursor = 0; const values = [];
  const filename = fileURLToPath(new URL(`../src/modules/${file === 'OrgStructure' ? 'users' : 'profile'}/ui/${file}.jsx`, import.meta.url)), mod = new Module(filename);
  mod.require = (id) => {
    if (id === 'react') return { ...React, useEffect() {}, useState(initial) { const i = cursor++; if (!(i in values)) values[i] = i === 0 ? seed : typeof initial === 'function' ? initial() : initial; return [values[i], (v) => { values[i] = typeof v === 'function' ? v(values[i]) : v; }]; } };
    if (id.endsWith('api.js')) return { usersApi: api, accountApi: api };
    if (id.endsWith('client.js')) return { resultsOf: (v) => v.results || v };
    if (id.endsWith('Toast.jsx')) return { useToast: () => () => {} };
    if (id.endsWith('Overlays.jsx')) return { Drawer: 'Drawer' };
    for (const name of ['Field', 'Input', 'Select', 'Button']) if (id.endsWith(`/${name}.jsx`)) return { [name]: name };
    return require(id);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  return (props = {}) => { cursor = 0; return all(mod.exports[file](props)); };
}
test('org assignment selects dependent directory values and sends an approval request, never a direct role patch', async () => {
  let sent;
  const data = { units: [{ id: 1, name: 'Продажи', status: 'approved', manager: 'lead', manager_name: 'Руководитель', role_name: 'Оператор' }], positions: [{ id: 2, name: 'Менеджер', unit: 1, status: 'approved' }], roles: [], requests: [] };
  const render = harness('OrgStructure', data, { requestOrgChange: async (v) => { sent = v; return { id: 3 }; } });
  const props = { user: { id: 'me', org_unit: 1, job_position: 2 }, canManage: false };
  let nodes = render(props);
  assert.ok(nodes.some((n) => n.type === 'Input' && n.props.readOnly && n.props.value === 'Оператор'));
  await nodes.find((n) => n.type === 'Button' && n.props.children === 'Отправить на согласование').props.onClick();
  assert.deepEqual(sent, { user: 'me', unit: 1, position: 2 });
  nodes = render(props);
  const unitField = nodes.find((n) => n.type === 'Field' && n.props.label === 'Подразделение');
  all(unitField).find((n) => n.type === 'Select').props.onChange({ target: { value: '1' } });
  assert.equal(render(props).find((n) => n.type === 'Button' && n.props.children === 'Отправить на согласование').props.disabled, true, 'changing a unit clears the previous job');
});
test('messenger account stays unverified until a separate code confirmation succeeds', async () => {
  const calls = []; let refreshed = 0;
  const rows = [{ channel: 'telegram', configured: true, verified: false, address: '12345' }];
  const render = harness('MessengerAccounts', rows, { messengerAction: async (channel, action, data) => { calls.push({ channel, action, data }); return action === 'start' ? { sent: true } : { results: [{ ...rows[0], verified: true }] }; } });
  const props = { onSaved: async () => { refreshed++; } };
  let nodes = render(props);
  nodes.find((n) => n.type === 'Button' && n.props.children === 'Привязать аккаунт').props.onClick();
  nodes = render(props);
  await nodes.find((n) => n.type === 'Drawer').props.footer.props.onClick();
  assert.equal(calls[0].action, 'start');
  assert.equal(refreshed, 0);
  nodes = render(props);
  nodes.find((n) => n.type === 'Input' && n.props.autoComplete === 'one-time-code').props.onChange({ target: { value: '123456' } });
  await render(props).find((n) => n.type === 'Drawer').props.footer.props.onClick();
  assert.equal(calls[1].action, 'confirm');
  assert.equal(calls[1].data.code, '123456');
  assert.equal(refreshed, 1);
});
test('unconfigured messenger channels disable binding rather than claiming success', () => {
  const render = harness('MessengerAccounts', [{ channel: 'max', configured: false, verified: false, address: '' }], {});
  assert.equal(render().find((n) => n.type === 'Button' && n.props.children === 'Привязать аккаунт').props.disabled, true);
});

test('Telegram bot binding opens a personal link without requesting a manual chat ID', async () => {
  const rows = [{ channel: 'telegram', configured: true, mode: 'bot', verified: false, address: '' }];
  const render = harness('MessengerAccounts', rows, { messengerAction: async () => ({ url: 'https://t.me/psc_test_bot?start=psc_one_time_state' }) });
  let nodes = render();
  nodes.find((n) => n.type === 'Button' && n.props.children === 'Привязать аккаунт').props.onClick();
  nodes = render();
  const footer = nodes.find((n) => n.type === 'Drawer').props.footer;
  assert.equal(footer.props.disabled, false);
  await footer.props.onClick();
  nodes = render();
  assert.ok(nodes.find((n) => n.type === 'a' && n.props.href.startsWith('https://t.me/')));
  assert.ok(!nodes.some((n) => n.type === 'Field' && n.props.label === 'ID личного чата с ботом организации'));
  assert.equal(nodes.find((n) => n.type === 'Drawer').props.footer.props.disabled, true);
});
