import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftStore, DRAFT_TTL } from '../src/shared/drafts/store.js';
function memory() {
  const data = {};
  return new Proxy({ getItem: (key) => data[key] || null, setItem: (key, value) => { data[key] = value; }, removeItem: (key) => { delete data[key]; } }, { ownKeys: () => Object.keys(data), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
}
test('a new tab restores the complete hotel draft with dates, guests, room assignments and wishes', () => {
  const storage = memory();
  const original = createDraftStore(storage, 'tenant:operator');
  const fields = { checkin: new Date(2027, 2, 10), checkout: new Date(2027, 2, 12), occupancyRooms: [{ adults: 2, childrenAges: [0, 7] }], guestSel: { 0: true, 2: true }, guestRooms: { 0: 'room:0', 2: 'room:1' }, mainGuest: 2, specialReq: 'Тихий номер', hotelRemarks: [{ remarkId: 10, data: '12:30' }], roomGroups: [{ members: [0, 2] }] };
  for (const [key, value] of Object.entries(fields)) original.write('free-booking/hotel', key, value);
  const reopened = createDraftStore(storage, 'tenant:operator');
  for (const [key, value] of Object.entries(fields)) assert.deepEqual(reopened.read('free-booking/hotel', key), value);
  assert.equal(reopened.read('free-booking/hotel', 'checkin').getFullYear(), 2027);
  assert.equal(reopened.status().restored, true);
});
test('closing immediately after the last character does not lose that character', () => {
  const storage = memory();
  const store = createDraftStore(storage, 'user');
  store.write('hotel', 'request', 'Запрос');
  assert.equal(createDraftStore(storage, 'user').read('hotel', 'request'), 'Запрос');
});
test('drafts are isolated by operator, tenant, order and service', () => {
  const storage = memory();
  const user = createDraftStore(storage, 'tenant:user');
  user.write('order/1/hotel', 'form', { text: 'private' });
  user.write('order/2/hotel', 'form', { text: 'other order' });
  assert.equal(createDraftStore(storage, 'tenant:other').read('order/1/hotel', 'form', null), null);
  assert.equal(createDraftStore(storage, 'other-tenant:user').read('order/1/hotel', 'form', null), null);
  assert.equal(user.read('order/1/transfer', 'form', null), null);
  assert.deepEqual(user.read('order/2/hotel', 'form'), { text: 'other order' });
});
test('clearing a completed workflow removes its child drafts but preserves other orders', () => {
  const storage = memory(), user = createDraftStore(storage, 'user');
  user.write('free-booking', 'cart', [{ id: 'offer' }]);
  user.write('free-booking/hotel', 'request', 'note');
  user.write('order/2/hotel', 'request', 'keep');
  user.clear('free-booking');
  const restored = createDraftStore(storage, 'user');
  assert.equal(restored.has('free-booking', 'cart'), false);
  assert.equal(restored.has('free-booking/hotel', 'request'), false);
  assert.equal(restored.read('order/2/hotel', 'request'), 'keep');
});
test('expired records are removed and selection sets survive reload', () => {
  let now = 1000;
  const storage = memory(), store = createDraftStore(storage, 'user', () => now);
  store.write('flight', 'selected', new Set(['guest-a', 'guest-b']));
  assert.deepEqual(createDraftStore(storage, 'user', () => now).read('flight', 'selected'), new Set(['guest-a', 'guest-b']));
  now += DRAFT_TTL + 1;
  assert.equal(createDraftStore(storage, 'user', () => now).read('flight', 'selected', null), null);
  assert.equal(Object.keys(storage).length, 0);
});
test('quota or browser storage failures are surfaced without losing the in-memory draft', () => {
  const store = createDraftStore({ getItem() { return null; }, setItem() { throw new Error('quota'); } }, 'user');
  let updates = 0; store.subscribe(() => updates++);
  store.write('hotel', 'request', 'unsaved note');
  assert.equal(store.status().failed, true);
  assert.equal(store.status().saved, false);
  assert.equal(store.read('hotel', 'request'), 'unsaved note');
  assert.equal(updates, 1);
});

test('restored hotel assignments follow guest IDs after the CRM list is reordered', async () => {
  const { remapHotelDraft } = await import('../src/modules/services/hotels/guests.js');
  const restored = remapHotelDraft(['a', 'b', 'removed'], [{ person: 'b' }, { person: 'a' }, { person: 'new' }], {
    selection: { 0: true, 2: true }, assignments: { 0: 'room:0', 2: 'room:1' }, mainGuest: 0,
    groups: [{ id: 'group', members: [0, 2] }],
  });
  assert.deepEqual(restored.selection, { 1: true });
  assert.deepEqual(restored.assignments, { 1: 'room:0' });
  assert.equal(restored.mainGuest, 1);
  assert.deepEqual(restored.groups[0].members, [1]);
});

test('editing in two tabs preserves independent fields instead of replacing an older snapshot', () => {
  const storage = memory(), a = createDraftStore(storage, 'user'), b = createDraftStore(storage, 'user');
  a.write('hotel', 'city', 'Москва');
  assert.equal(b.read('hotel', 'city'), 'Москва');
  a.write('hotel', 'request', 'Тихий номер');
  b.write('hotel', 'guests', 3);
  const restored = createDraftStore(storage, 'user');
  assert.equal(restored.read('hotel', 'city'), 'Москва');
  assert.equal(restored.read('hotel', 'request'), 'Тихий номер');
  assert.equal(restored.read('hotel', 'guests'), 3);
});
test('a damaged record does not prevent saving a new draft', () => {
  const storage = memory(), store = createDraftStore(storage, 'user');
  store.write('hotel', 'city', 'Москва');
  storage.setItem(Object.keys(storage)[0], '{broken');
  const restored = createDraftStore(storage, 'user');
  assert.equal(restored.read('hotel', 'city', ''), '');
  restored.write('hotel', 'city', 'Санкт-Петербург');
  assert.equal(restored.status().failed, false);
  assert.equal(createDraftStore(storage, 'user').read('hotel', 'city'), 'Санкт-Петербург');
});

test('the React hook persists functional input updates and scopes them to the active order', async () => {
  const { createRequire, Module } = await import('node:module');
  const { readFileSync } = await import('node:fs');
  const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
  const store = createDraftStore(memory(), 'operator');
  let contextNumber = 0, prefix = 'order/1';
  const react = { ...require('react'), createContext: () => ({ index: contextNumber++ }), useContext: (context) => context.index === 0 ? store : prefix,
    useMemo: (fn) => fn(), useCallback: (fn) => fn, useSyncExternalStore: (_subscribe, snapshot) => snapshot(), useState: (initial) => [initial, () => {}] };
  const module = new Module(import.meta.filename);
  module.require = (name) => name === 'react' ? react : name === './store.js' ? { createDraftStore } : name.includes('icons') ? { Icon: 'Icon' } : require(name);
  module._compile(babel.transformSync(readFileSync(new URL('../src/shared/drafts/Drafts.jsx', import.meta.url), 'utf8'), { filename: 'Drafts.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const useDraftState = module.exports.useDraftState;
  const [, setForm] = useDraftState('hotel', 'form', { city: '', guests: 1 });
  setForm((form) => ({ ...form, city: 'Москва' }));
  setForm((form) => ({ ...form, guests: 3 }));
  assert.deepEqual(useDraftState('hotel', 'form', {})[0], { city: 'Москва', guests: 3 });
  prefix = 'order/2';
  assert.deepEqual(useDraftState('hotel', 'form', { city: '', guests: 1 })[0], { city: '', guests: 1 });
});
