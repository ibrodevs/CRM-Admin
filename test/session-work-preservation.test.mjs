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
    if (name.includes('Drafts')) return { DraftNoticeSlot: 'DraftNoticeSlot' };
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
  let empty = true;
  const dismissible = StackPanel({ title: 'Свободное бронирование', onClose: () => closed++, closeOnBackdrop: () => empty });
  dismissible.props.onMouseDown({ target: backdrop, currentTarget: backdrop, stopPropagation() {} });
  assert.equal(closed, 2, 'an empty form closes on its backdrop');
  empty = false;
  dismissible.props.onMouseDown({ target: backdrop, currentTarget: backdrop, stopPropagation() {} });
  assert.equal(closed, 2, 'the click checks the latest form state and keeps entered data open');
  empty = true;
  dismissible.props.onMouseDown({ target: {}, currentTarget: backdrop, stopPropagation() {} });
  assert.equal(closed, 2, 'clicks inside the form do not dismiss it');
  const pointer = (target = backdrop) => ({ target, currentTarget: backdrop, button: 0, preventDefault() { this.prevented = true; }, stopPropagation() {} });
  dismissible.props.onPointerDownCapture(pointer({}));
  assert.equal(closed, 2, 'pointer capture must leave inner and nested panels alone');
  const outside = pointer();
  dismissible.props.onPointerDownCapture(outside);
  assert.equal(closed, 3, 'empty search dismisses before bubbling outside-click handlers');
  assert.equal(outside.prevented, true, 'the click cannot reach the navigation underneath');
  empty = false;
  dismissible.props.onPointerDownCapture(pointer());
  assert.equal(closed, 3, 'pointer capture preserves entered search data');


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

test('free booking backdrop stays dismissible with populated or default-valued forms and preserves saved work', () => {
  const source = readFileSync(new URL('../src/modules/dashboard/ui/DashboardPage.jsx', import.meta.url), 'utf8');
  const ast = babel.parseSync(source, { filename: 'DashboardPage.jsx', presets: ['next/babel'], configFile: false, babelrc: false });
  const fn = ast.program.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'DetailedSearchPanelContent');
  let closed = 0, cleared = 0;
  const stored = { kind: 'Страховка', draft: [{ id: 'selected-offer' }], aviaParams: { from: 'MOW', to: 'LED', pax: { adt: 2 } } };
  const bindings = { useToast: () => () => {}, useDraftControls: () => ({ has: () => true, clear: () => cleared++ }), useDraftState: (_scope, key, initial) => [stored[key] ?? initial, () => {}], PAX_DEFAULT_OPTIONS: {}, plural: () => 'услуга', ...Object.fromEntries(['StackPanel','Button','InfoNotice','FreeBookingPanel','FreeBookingFinalize'].map((key) => [key,key])) };
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? { ...require('react'), useRef: () => ({ current: false }), useEffect() {} } : name === 'bindings' ? bindings : require(name);
  mod._compile(babel.transformSync(`import {useRef,useEffect} from 'react';import {${Object.keys(bindings)}} from 'bindings';${source.slice(fn.start,fn.end)};export {DetailedSearchPanelContent};`, { filename: 'BookingPanel.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const render = () => mod.exports.DetailedSearchPanelContent({ onClose: () => closed++ });
  const panel = render();
  assert.equal(panel.props.closeOnBackdrop, true, 'passengers, default criteria and selected offers must not block backdrop dismissal');
  panel.props.onClose();
  assert.equal(closed, 1);
  assert.equal(cleared, 0, 'closing must not clear any workspace drafts');
  assert.equal(render().props.footer.props.children[0].props.children[1].props.children, 1, 'selected service remains in the selection after reopening');
  assert.equal(stored.aviaParams.pax.adt, 2);
});

test('hotel map backdrop closes only the map and retains the search underneath', () => {
  const source = readFileSync(new URL('../src/modules/services/hotels/HotelsPage.jsx', import.meta.url), 'utf8');
  const ast = babel.parseSync(source, { filename: 'HotelsPage.jsx', presets: ['next/babel'], configFile: false, babelrc: false });
  let mapPanel;
  babel.traverse(ast, { JSXOpeningElement(path) {
    if (path.node.name.name === 'StackPanel' && path.node.attributes.some((attr) => attr.name?.name === 'className' && attr.value?.value === 'hp-map-panel')) mapPanel = path.node;
  } });
  assert.ok(mapPanel);
  assert.ok(mapPanel.attributes.some((attr) => attr.name?.name === 'closeOnBackdrop' && attr.value === null));
  const close = mapPanel.attributes.find((attr) => attr.name?.name === 'onClose').value.expression;
  assert.equal(close.body.callee.name, 'setMapOpen');
  assert.equal(close.body.arguments[0].value, false);
  assert.equal(close.body.arguments.length, 1, 'closing the map does not reset search or clear drafts');
});

test('flight fare and nested details close only their own layer on the backdrop', () => {
  const { StackPanel } = load('../src/modules/locations/ui/SharedPanels.jsx', (name) => {
    if (name === 'react') return { ...require('react'), useContext: () => true };
    if (name.includes('Overlays')) return { useOverlayLayer() {}, useOverlayZIndex: () => 100 };
    if (name.includes('data/index')) return { AIRPORTS: [] };
    if (name.includes('icons')) return { Icon: 'Icon' };
    if (name.includes('EmptyState')) return { EmptyState: 'EmptyState' };
    if (name.includes('SearchBox')) return { SearchBox: 'SearchBox' };
  });
  const closed = [];
  const search = StackPanel({ title: 'Поиск', onClose: () => closed.push('search') });
  const fare = StackPanel({ title: 'Тарифы', closeOnBackdrop: true, onClose: () => closed.push('fare') });
  const details = StackPanel({ title: 'Условия', closeOnBackdrop: true, onClose: () => closed.push('details') });
  const backdrop = {}, parentBackdrop = {};
  const pointer = (target, currentTarget = target) => ({ target, currentTarget, button: 0, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
  search.props.onPointerDownCapture(pointer(backdrop, parentBackdrop));
  fare.props.onPointerDownCapture(pointer(backdrop, parentBackdrop));
  const click = pointer(backdrop);
  details.props.onPointerDownCapture(click);
  assert.deepEqual(closed, ['details']);
  assert.equal(click.prevented, true, 'prevent compatibility mouse events from closing the next layer');
  assert.equal(click.stopped, true);
  fare.props.onPointerDownCapture(pointer({}, backdrop));
  assert.deepEqual(closed, ['details'], 'interacting inside the restored fare panel does not close it');
  fare.props.onPointerDownCapture(pointer(backdrop));
  assert.deepEqual(closed, ['details', 'fare']);
});

test('all flight fare detail panels explicitly enable backdrop dismissal', () => {
  const source = readFileSync(new URL('../src/modules/orders/ui/OrderCard.jsx', import.meta.url), 'utf8');
  const ast = babel.parseSync(source, { filename: 'OrderCard.jsx', presets: ['next/babel'], configFile: false, babelrc: false });
  const panels = [];
  babel.traverse(ast, { FunctionDeclaration(path) {
    if (path.node.id?.name !== 'FreeBookingFlightFarePanel') return;
    path.traverse({ JSXOpeningElement(element) { if (element.node.name.name === 'StackPanel') panels.push(element.node); } });
  } });
  assert.equal(panels.length, 3);
  for (const panel of panels) assert.ok(panel.attributes.some((attr) => attr.name?.name === 'closeOnBackdrop' && attr.value === null));
  const close = (panel) => panel.attributes.find((attr) => attr.name?.name === 'onClose').value.expression;
  assert.equal(close(panels[0]).name, 'onClose');
  assert.equal(close(panels[1]).body.callee.name, 'setInfoFare');
  assert.equal(close(panels[1]).body.arguments[0].value, undefined); // NullLiteral: close rules only.
  assert.equal(close(panels[1]).body.arguments[0].type, 'NullLiteral');
  assert.equal(close(panels[2]).body.callee.name, 'setPerPaxOpen');
  assert.equal(close(panels[2]).body.arguments[0].value, false);
});
