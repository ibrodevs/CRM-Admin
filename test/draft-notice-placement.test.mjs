import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
function harness() {
  let index = 0;
  const state = [];
  const react = { ...require('react'), useMemo: (fn) => fn(), useCallback: (fn) => fn,
    useState: (initial) => { const i = index++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], (next) => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; },
    useEffect() {}, useSyncExternalStore: (_subscribe, snapshot) => snapshot() };
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? react : name === 'react-dom' ? { createPortal: (node, target) => ({ node, target }) }
    : name.includes('icons') ? { Icon: 'Icon' } : name === './store.js' ? {} : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/shared/drafts/Drafts.jsx', import.meta.url), 'utf8'), { filename: 'Drafts.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  return { reset: () => { state.length = 0; }, render: (fn, props) => { index = 0; return fn(props); }, Provider: mod.exports.DraftProvider };
}
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
test('draft banner follows the topmost form and returns to the underlying workspace when it closes', () => {
  const { render, Provider } = harness();
  const tree = () => render(Provider, { owner: null });
  const register = tree().props.children.props.value;
  const root = {}, parent = {}, child = {};
  const clearRoot = register(root, 0);
  const clearChild = register(child, 160);
  const clearParent = register(parent, 120); // Parent effects may run after their children.
  const target = () => tree().props.children.props.children[1].props.target;
  assert.equal(target(), child);
  clearChild(); assert.equal(target(), parent);
  clearParent(); assert.equal(target(), root);
  clearRoot(); assert.equal(target(), undefined);
});
test('inline draft notice can be hidden and keeps destructive clearing behind confirmation', () => {
  const first = harness();
  const Notice = first.render(first.Provider, { owner: null }).props.children.props.children[1].type;
  first.reset();
  const { render } = first;
  let cleared = 0, dismissed = 0;
  const store = { workspaces: () => [{ id: 'free-booking', type: 'free-booking', title: 'Подбор услуг без заказа', services: ['Отели'], savedAt: 1794600000000 }], open() { return true; }, status: () => ({ restored: true, failed: false }), subscribe() {}, clear() { cleared++; }, dismiss() { dismissed++; } };
  const target = {};
  const show = () => render(Notice, { store, target });
  assert.equal(show().target, target, 'the banner is portalled into its form slot, never the viewport footer');
  let buttons = nodes(show().node).filter((n) => n.type === 'button');
  buttons.find((n) => n.props['aria-label']).props.onClick();
  assert.equal(dismissed, 1);
  buttons.find((n) => n.props.children === 'Очистить все').props.onClick();
  assert.equal(cleared, 0);
  nodes(show().node).find((n) => n.type === 'button' && n.props.children === 'Удалить').props.onClick();
  assert.equal(cleared, 1);
});

test('account navigation drawer does not capture saved booking forms', () => {
  const source = readFileSync(new URL('../src/application/shell/Sidebar.jsx', import.meta.url), 'utf8');
  const ast = babel.parseSync(source, { filename: 'Sidebar.jsx', presets: ['next/babel'], configFile: false, babelrc: false });
  let found = false;
  babel.traverse(ast, { JSXOpeningElement(path) {
    if (path.node.name.name !== 'Drawer') return;
    const attrs = path.node.attributes;
    if (!attrs.some((a) => a.name?.name === 'className' && a.value?.value === 'account-panel')) return;
    found = true;
    const enabled = attrs.find((a) => a.name?.name === 'showDraftNotice');
    assert.equal(enabled?.value?.expression?.value, false);
  } });
  assert.equal(found, true);
});
