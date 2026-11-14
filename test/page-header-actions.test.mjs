import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url), React = require('react'), babel = require('next/dist/compiled/babel/core');
let context, effect;
const ref = { current: null };
const mod = new Module(import.meta.filename);
mod.require = (name) => name === 'react' ? { ...React, useContext: () => context, useRef: () => ref, useEffect: (fn) => { effect = fn; } }
  : name === 'react-dom' ? { createPortal: (node, target) => ({ node, target }) } : require(name);
mod._compile(babel.transformSync(readFileSync(new URL('../src/shared/ui/PageActions.jsx', import.meta.url), 'utf8'), { filename: 'PageActions.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
test('page actions move to the title slot while retaining their callback and disabled state', () => {
  let clicked = 0;
  const button = React.createElement('button', { disabled: false, onClick: () => clicked++ }, 'Импорт документов');
  context = null;
  assert.equal(mod.exports.PageActions({ children: button }).props.children, button, 'order tabs keep local actions without a page provider');
  context = { target: null };
  assert.equal(mod.exports.PageActions({ children: button }), null, 'do not briefly duplicate actions in the filter row');
  const header = {};
  context = { target: header };
  const moved = mod.exports.PageActions({ children: button });
  assert.equal(moved.target, header);
  assert.equal(moved.node.props.children, button);
  moved.node.props.children.props.onClick();
  assert.equal(clicked, 1);
});
test('header target registration is cleaned up when leaving the section', () => {
  const node = {}; let registered, removed = false;
  context = { register: (target) => { registered = target; return () => { removed = true; }; } };
  mod.exports.PageActionTarget(); ref.current = node;
  const cleanup = effect();
  assert.equal(registered, node);
  cleanup(); assert.equal(removed, true);
});
test('registry search toolbars contain no section-level creation or import buttons', () => {
  for (const file of ['receipts/ui/ReceiptEditorPage.jsx','proposals/ui/OffersPage.jsx','returns/ui/ReturnsPage.jsx','documents/ui/DocumentsPage.jsx','finance/ui/FinancePage.jsx']) {
    const filename = new URL('../src/modules/' + file, import.meta.url), source = readFileSync(filename, 'utf8');
    const ast = babel.parseSync(source, { filename: file, presets: ['next/babel'], configFile: false, babelrc: false });
    babel.traverse(ast, { JSXElement(path) {
      if (path.node.openingElement.name.name !== 'Button') return;
      const toolbar = path.findParent((parent) => parent.isJSXElement() && parent.node.openingElement.name.name === 'SearchToolbar');
      assert.equal(toolbar, null, `${file}: section actions belong next to the title`);
    } });
  }
});
