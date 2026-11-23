import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url), React = require('react'), babel = require('next/dist/compiled/babel/core');
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children), ...nodes(node.props.footer)] : [];
function harness({ fail = false } = {}) {
  const cells = [], calls = []; let cursor = 0;
  const react = { ...React, useEffect() {}, useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }]; } };
  const api = { updateSecurity: async body => { calls.push(body); if (fail) throw Error('Неверный пароль'); return { pin_enabled: !body.disable_pin, auto_lock_minutes: body.disable_pin ? 0 : body.auto_lock_minutes, auto_logout_minutes: 30 }; } };
  const mod = new Module(import.meta.filename);
  mod.require = name => name === 'react' ? react : !name.startsWith('.') ? require(name) : name.includes('auth.api') ? { authApi: api } : name.includes('Toast') ? { useToast: () => () => {} } : name.includes('Overlays') ? { Drawer: 'Drawer' } : name.includes('PasswordInput') ? { PasswordInput: 'PasswordInput' } : Object.fromEntries(['Input','Field','Button','Select','Pill','Icon'].map(key => [key,key]));
  mod._compile(babel.transformSync(readFileSync(new URL('../src/modules/profile/ui/SessionSecurity.jsx', import.meta.url),'utf8'), { filename:'SessionSecurity.jsx', presets:['next/babel'], configFile:false,babelrc:false,envName:'test' }).code, import.meta.filename);
  const auth = { user: { email:'test@example.test', session_security:{ pin_enabled:true,auto_lock_minutes:5,auto_logout_minutes:30 } }, refreshSession: async () => {} };
  return { calls, render() { cursor=0; return nodes(mod.exports.SessionSecurity({auth})); } };
}
const button = (tree, text) => tree.find(node => node.type === 'Button' && (node.props.children === text || Array.isArray(node.props.children) && node.props.children.includes(text)));
const drawer = tree => tree.find(node => node.type === 'Drawer');
const submit = async (tree, id, values) => {
  const old = globalThis.FormData;
  globalThis.FormData = class { get(name) { return values[name] || ''; } };
  try { await tree.find(node => node.type === 'form' && node.props.id === id).props.onSubmit({ preventDefault(){},currentTarget:{} }); }
  finally { globalThis.FormData = old; }
};

test('active PIN has an explicit status; opening and cancelling disable never changes settings', () => {
  const h=harness(); let tree=h.render();
  assert.ok(tree.find(node=>node.type==='Pill' && node.props.children==='PIN включён'));
  assert.equal(tree.filter(node=>node.props.type==='checkbox').length,0);
  assert.equal(tree.filter(node=>node.type==='PasswordInput' && node.props.name==='session-pin').length,0);
  button(tree,'Отключить PIN').props.onClick(); tree=h.render();
  assert.equal(drawer(tree).props.open,true); assert.deepEqual(h.calls,[]);
  drawer(tree).props.onClose(); tree=h.render();
  assert.equal(drawer(tree).props.open,false); assert.deepEqual(h.calls,[]);
  assert.ok(tree.find(node=>node.type==='Select' && node.props.value==='5'));
});

test('disable requires password and an explicit confirmation; success changes the visible status', async () => {
  const h=harness(); button(h.render(),'Отключить PIN').props.onClick();
  await submit(h.render(),'disable-session-pin',{}); assert.deepEqual(h.calls,[]);
  await submit(h.render(),'disable-session-pin',{disable_password:'confirmation-test-value'});
  assert.deepEqual(h.calls,[{password:'confirmation-test-value',disable_pin:true}]);
  const tree=h.render(); assert.equal(drawer(tree).props.open,false);
  assert.ok(tree.find(node=>node.type==='Pill' && node.props.children==='PIN не установлен'));
  assert.ok(tree.find(node=>node.type==='Select' && node.props.value==='0'));
});

test('invalid password leaves PIN active and keeps the confirmation open', async () => {
  const h=harness({fail:true}); button(h.render(),'Отключить PIN').props.onClick();
  await submit(h.render(),'disable-session-pin',{disable_password:'wrong-test-value'});
  const tree=h.render(); assert.equal(drawer(tree).props.open,true);
  assert.ok(tree.find(node=>node.type==='Pill' && node.props.children==='PIN включён'));
  assert.ok(tree.find(node=>node.type==='Field' && node.props.error==='Неверный пароль'));
});

test('saving intervals cannot disable PIN and changing PIN can be cancelled without resetting intervals', async () => {
  const h=harness(); let tree=h.render();
  button(tree,'Изменить PIN').props.onClick(); tree=h.render();
  tree.find(node=>node.type==='PasswordInput' && node.props.name==='session-pin').props.onChange({target:{value:'0123'}});
  tree=h.render(); button(tree,'Отменить изменение PIN').props.onClick();
  await submit(h.render(),undefined,{current_password:'test-current-password'});
  assert.equal(h.calls.length,1); assert.equal(h.calls[0].auto_lock_minutes,5);
  assert.ok(!('disable_pin' in h.calls[0])); assert.ok(!('pin' in h.calls[0]));
});
