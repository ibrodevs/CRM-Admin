import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url), React = require('react'), babel = require('next/dist/compiled/babel/core');
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
function harness(file, extra = {}) {
  const cells = []; let cursor = 0;
  const react = { ...React, useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }]; }, useRef: () => extra.ref || { current: null } };
  const mod = new Module(import.meta.filename);
  mod.require = name => name === 'react' ? react : name.includes('Toast') ? { useToast: () => () => {} } : name.includes('Input') ? { Input: 'Input' } : name.includes('Button') ? { Button: 'Button' } : name.includes('Field') ? { Field: 'Field' } : name.includes('icons') ? { Icon: 'Icon' } : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), { filename: file, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  return (component, props) => { cursor = 0; return nodes(mod.exports[component](props)); };
}

test('copy and reveal use the actual autofilled password even before React receives an input event', async () => {
  const copied = [], changes = [], ref = { current: { value: 'autofilled-test-value' } };
  const old = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async value => copied.push(value) } } });
  try {
    const render = harness('shared/ui/PasswordInput.jsx', { ref });
    const props = { value: '', onChange: event => changes.push(event.target.value), name: 'current_password', autoComplete: 'current-password' };
    let tree = render('PasswordInput', props);
    await tree.find(node => node.props['aria-label'] === 'Скопировать пароль').props.onClick();
    assert.deepEqual(copied, ['autofilled-test-value']);
    tree.find(node => node.props['aria-label'] === 'Показать пароль').props.onClick();
    assert.deepEqual(changes, ['autofilled-test-value']);
    tree = render('PasswordInput', props);
    assert.equal(tree.find(node => node.type === 'Input').props.type, 'text');
    assert.ok(tree.filter(node => node.type === 'button').every(node => node.props.type === 'button'));
  } finally {
    if (old) Object.defineProperty(globalThis, 'navigator', old); else delete globalThis.navigator;
  }
});

test('unlock accepts four digit PINs, preserves legacy PINs and still requires six digits for two factor', async () => {
  for (const length of [4, 6]) {
    const render = harness('shared/auth/PinUnlock.jsx');
    const props = { auth: { user: { email: 'test@example.test', session_security: { pin_length: length } }, login: async () => ({ twoFactorRequired: true }) } };
    let tree = render('PinUnlock', props);
    assert.equal(tree.find(node => node.type === 'Input').props.maxLength, length);
    tree.find(node => node.type === 'Input').props.onChange({ target: { value: length === 4 ? '0123' : '012345' } });
    tree = render('PinUnlock', props);
    assert.equal(tree.find(node => node.props.type === 'submit').props.disabled, false);
    tree.find(node => node.props.variant === 'ghost').props.onClick();
    tree = render('PinUnlock', props);
    tree.find(node => node.type === 'Input').props.onChange({ target: { value: 'test-password' } });
    tree = render('PinUnlock', props);
    await tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    tree = render('PinUnlock', props);
    const code = tree.find(node => node.type === 'Input');
    assert.equal(code.props.maxLength, 6);
    assert.equal(code.props.autoComplete, 'one-time-code');
    code.props.onChange({ target: { value: '1234' } });
    tree = render('PinUnlock', props);
    assert.equal(tree.find(node => node.props.type === 'submit').props.disabled, true);
  }
});

test('search inputs identify as searches and do not invite password manager login autofill', () => {
  const render = harness('shared/ui/SearchBox.jsx');
  const tree = render('SearchBox', { value: '', onChange() {} });
  const input = tree.find(node => node.type === 'input');
  assert.equal(input.props.type, 'search');
  assert.equal(input.props.autoComplete, 'off');
  assert.equal(input.props['data-1p-ignore'], 'true');
});

test('PIN reveal toggles only visibility, preserving leading zero and input restrictions without copying', () => {
  const ref = { current: { value: '0123' } }, changes = [];
  const render = harness('shared/ui/PasswordInput.jsx', { ref });
  const props = { value: '0123', secretLabel: 'PIN', allowCopy: false, inputMode: 'numeric', maxLength: 4, onChange: event => changes.push(event.target.value) };
  let tree = render('PasswordInput', props);
  assert.equal(tree.find(node => node.type === 'Input').props.type, 'password');
  assert.equal(tree.filter(node => node.type === 'button').length, 1);
  tree.find(node => node.props['aria-label'] === 'Показать PIN').props.onClick();
  tree = render('PasswordInput', props);
  const input = tree.find(node => node.type === 'Input');
  assert.equal(input.props.type, 'text');assert.equal(input.props.value, '0123');
  assert.equal(input.props.maxLength, 4);assert.equal(input.props.inputMode, 'numeric');
  tree.find(node => node.props['aria-label'] === 'Скрыть PIN').props.onClick();
  assert.equal(render('PasswordInput', props).find(node => node.type === 'Input').props.type, 'password');
  assert.deepEqual(changes, []);
});
