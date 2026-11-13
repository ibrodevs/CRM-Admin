import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
function load(file, bindings) {
  const filename = fileURLToPath(new URL(file, import.meta.url));
  const mod = new Module(filename);
  mod.require = (name) => bindings(name) || require(name);
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  return mod.exports;
}
function authHarness(api) {
  const cells = [];
  let cursor = 0;
  const react = { ...require('react'),
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], (next) => { cells[i] = typeof next === 'function' ? next(cells[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return cells[i] ||= { current: initial }; },
    useCallback: (fn) => fn, useMemo: (fn) => fn(), useEffect() {},
  };
  const { AuthProvider } = load('../src/shared/auth/auth-context.jsx', (name) => {
    if (name === 'react') return react;
    if (name.includes('auth.api')) return { authApi: api };
    if (name.includes('preferences')) return { setRuntimePreferences() {} };
    if (name.includes('client.js')) return { onUnauthorized() {} };
    if (name.includes('user.mapper')) return { toUiUser: (user) => user };
  });
  return () => { cursor = 0; return AuthProvider({ children: 'workspace' }).props.value; };
}
test('network failure keeps the workspace; expiry locks it; same-account login resumes it', async () => {
  const user = { id: 'operator', tenant_id: 'tenant' };
  let failure;
  const render = authHarness({
    async session() { if (failure) throw failure; return { user }; },
    async login() { return { user }; }, async logout() {},
  });
  await render().refreshSession();
  assert.equal(render().status, 'authenticated');
  failure = { status: 503 };
  await render().refreshSession();
  assert.equal(render().status, 'authenticated');
  assert.equal(render().user, user);
  assert.equal(render().locked, false);
  failure = { status: 401 };
  await render().refreshSession();
  assert.equal(render().status, 'authenticated', 'the working tree must not unmount');
  assert.equal(render().user, user);
  assert.equal(render().locked, true);
  await render().login('operator', 'password');
  assert.equal(render().locked, false);
  assert.equal(render().user, user);
  await render().logout();
  assert.equal(render().status, 'anonymous');
  assert.equal(render().user, null);
});
test('parallel background checks share one request', async () => {
  let complete, count = 0;
  const render = authHarness({ session() { count++; return new Promise((resolve) => { complete = resolve; }); } });
  const a = render().refreshSession(), b = render().refreshSession();
  assert.equal(count, 1);
  complete({ user: { id: 'one' } });
  await Promise.all([a, b]);
  assert.equal(render().status, 'authenticated');
});
test('clicking the backdrop keeps hotel search and placement panels open', () => {
  let closed = 0;
  const { StackPanel } = load('../src/modules/locations/ui/SharedPanels.jsx', (name) => {
    if (name === 'react') return { ...require('react'), useContext: () => true };
    if (name.includes('Overlays')) return { useOverlayLayer() {}, useOverlayZIndex: () => 100 };
    if (name.includes('data/index')) return { AIRPORTS: [] };
    if (name.includes('icons')) return { Icon: 'Icon' };
    if (name.includes('EmptyState')) return { EmptyState: 'EmptyState' };
    if (name.includes('SearchBox')) return { SearchBox: 'SearchBox' };
  });
  const tree = StackPanel({ title: 'Пассажиры и размещение', onClose: () => closed++ });
  const backdrop = {};
  tree.props.onMouseDown({ target: backdrop, currentTarget: backdrop, stopPropagation() {} });
  assert.equal(closed, 0);
  tree.props.children.props.children[0].props.children[1].props.onClick();
  assert.equal(closed, 1, 'the explicit close button still works');
});

test('a late background response cannot restore a logged-out account', async () => {
  let complete;
  const render = authHarness({ session() { return new Promise((resolve) => { complete = resolve; }); }, async logout() {} });
  const checking = render().refreshSession();
  await render().logout();
  complete({ user: { id: 'old-account' } });
  await checking;
  assert.equal(render().user, null);
  assert.equal(render().status, 'anonymous');
});
