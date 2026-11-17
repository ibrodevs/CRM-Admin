import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { draftsForRoute } from '../src/shared/drafts/workspaces.js';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const entries = [
  { id: 'free-booking', scope: 'free-booking', type: 'free-booking', title: 'Подбор услуг без заказа' },
  { id: 'order/1', scope: 'order/1', type: 'order', title: 'Заказ ORD-1' },
  { id: 'new', scope: 'OrderCreateModal/false', type: 'new-order', title: 'Новый заказ' },
  { id: 'flights', scope: 'FlightsPage', type: 'route', route: 'flights', title: 'Поиск авиабилетов' },
  { id: 'hotels', scope: 'HotelPicker/free', type: 'route', route: 'hotels', title: 'Поиск отелей' },
].map((entry) => ({ ...entry, services: [], savedAt: 1794600000000 }));
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];

test('desktop aggregates drafts and other sections show only their own work', () => {
  assert.deepEqual(draftsForRoute(entries, 'dashboard'), entries);
  assert.deepEqual(draftsForRoute(entries, 'orders'), entries.slice(1, 3));
  assert.deepEqual(draftsForRoute(entries, 'flights/search'), [entries[3]]);
  assert.deepEqual(draftsForRoute(entries, 'hotels'), [entries[4]]);
  for (const route of ['settings', 'clients', 'companies', 'calendar']) assert.deepEqual(draftsForRoute(entries, route), []);
});

test('saved drafts stay expanded after dismissal and deleting one requires confirmation', () => {
  let index = 0;
  const state = [];
  let cleared = null, opened = null;
  const store = { workspaces: () => entries, status: () => ({ restored: false, failed: false }), subscribe() {}, open(entry) { opened = entry; }, clear(scope) { cleared = scope; } };
  const react = { ...require('react'), useContext: () => store, useMemo: (fn) => fn(),
    useState: (initial) => { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], (next) => { state[i] = next; }]; },
    useSyncExternalStore: (_subscribe, snapshot) => snapshot() };
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? react : name.includes('icons') ? { Icon: 'Icon' } : name === './store.js' ? {} : name === './workspaces.js' ? { draftsForRoute } : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/shared/drafts/Drafts.jsx', import.meta.url), 'utf8'), { filename: 'Drafts.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const show = () => { index = 0; return mod.exports.DraftWorkspaceList({ route: 'orders' }); };
  assert.equal(nodes(show()).filter((node) => node.props.className === 'draft-recovery-row').length, 2);
  const buttons = nodes(show()).filter((node) => node.type === 'button');
  buttons[0].props.onClick();
  assert.equal(opened, entries[1]);
  buttons[1].props.onClick();
  assert.equal(cleared, null);
  nodes(show()).find((node) => node.type === 'button' && node.props.children === 'Удалить').props.onClick();
  assert.equal(cleared, 'order/1');
});

test('shared side panels never render the workspace draft list', () => {
  for (const file of ['src/shared/ui/Overlays.jsx', 'src/modules/locations/ui/SharedPanels.jsx']) {
    assert.doesNotMatch(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), /DraftNoticeSlot|DraftWorkspaceList/);
  }
});

test('dashboard lists drafts next to agenda and tasks; shell scopes other sections', () => {
  const dashboard = readFileSync(new URL('../src/modules/dashboard/ui/DashboardPage.jsx', import.meta.url), 'utf8');
  assert.match(dashboard, /<TodayAgenda[\s\S]*<DraftWorkspaceList\s*\/>/);
  const shell = readFileSync(new URL('../src/application/shell/AppShell.jsx', import.meta.url), 'utf8');
  assert.match(shell, /!== 'dashboard' && <DraftWorkspaceList route=\{route\}/);
});
