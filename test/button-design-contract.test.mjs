import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');

test('shared buttons preserve actions and accessibility for every supported size', () => {
  const mod = new Module(import.meta.filename);
  mod.require = name => name.includes('translations') ? { translate: text => text } : name.includes('icons') ? { Icon: 'Icon' } : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/shared/ui/Button.jsx', import.meta.url), 'utf8'), { filename: 'Button.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  for (const size of ['sm', 'md', 'lg', 'field']) {
    let clicked = false;
    const node = mod.exports.Button({ size, variant: 'secondary', children: 'Открыть', 'aria-label': 'Открыть заказ', onClick: () => { clicked = true; } });
    assert.equal(node.props['data-size'], size);
    assert.equal(node.props['data-variant'], 'secondary');
    assert.equal(node.props['aria-label'], 'Открыть заказ');
    node.props.onClick(); assert.equal(clicked, true);
  }
  const icon = mod.exports.Button({ icon: 'more', 'aria-label': 'Действия', disabled: true });
  assert.match(icon.props.className, /btn-icon/);
  assert.equal(icon.props.disabled, true);
  assert.doesNotMatch(mod.exports.Button({ icon: 'plus', children: 0 }).props.className, /btn-icon/);
});

test('screens choose shared button sizes rather than overriding typography or geometry inline', () => {
  const root = new URL('../src', import.meta.url).pathname, violations = [];
  const forbidden = new Set(['height', 'minHeight', 'padding', 'fontSize', 'fontWeight', 'borderRadius', 'lineHeight']);
  const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(directory, entry.name)) : entry.name.endsWith('.jsx') ? [join(directory, entry.name)] : []);
  const walk = (node, file) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXOpeningElement' && node.name?.name === 'Button') {
      const style = node.attributes.find(attribute => attribute.name?.name === 'style')?.value?.expression;
      for (const property of style?.properties || []) if (forbidden.has(property.key?.name)) violations.push(`${file}:${node.loc.start.line} ${property.key.name}`);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(child => walk(child, file));
      else if (value && typeof value === 'object') walk(value, file);
    }
  };
  for (const file of files(root)) walk(babel.parseSync(readFileSync(file, 'utf8'), { filename: file, presets: ['next/babel'], configFile: false, babelrc: false }), file);
  assert.deepEqual(violations, [], 'Use the size prop; typography and geometry belong to the shared Button system.');
});
