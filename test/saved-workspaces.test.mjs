import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftStore, DRAFT_TTL } from '../src/shared/drafts/store.js';
function storage() {
  const records = {};
  return new Proxy({ getItem: (key) => records[key] || null, setItem: (key, value) => { records[key] = value; }, removeItem: (key) => { delete records[key]; } }, { ownKeys: () => Object.keys(records), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
}
test('restoring navigation and cached guests alone does not announce an unfinished booking', () => {
  const store = createDraftStore(storage(), 'operator');
  store.write('navigation', 'route', 'receipts');
  store.write('free-booking/HotelPicker/free', 'crmGuests', [{ id: 1 }]);
  store.write('orders', 'createOpen', false);
  assert.deepEqual(store.workspaces(), []);
});
test('saved work links identify a mixed service selection and separate numbered orders', () => {
  const disk = storage(), store = createDraftStore(disk, 'operator', () => 1000);
  store.write('free-booking/DetailedSearchPanel', 'kind', 'Авиа');
  store.write('free-booking/DetailedSearchPanel', 'aviaParams', { from: 'MOW', to: 'LED', depDate: new Date(2026, 11, 1) });
  store.write('free-booking/HotelPicker/free', 'dest', 'Невский');
  for (const [id, no] of [['one', 'ORD-000042'], ['two', 'ORD-000043']]) {
    store.write(`order/${id}/context`, 'order', { id, no, service: 'ЖД' });
    store.write(`order/${id}/OrderCard`, 'bookingDraft', { step: 1 });
  }
  const reopened = createDraftStore(disk, 'operator', () => 1500);
  const entries = reopened.workspaces();
  assert.equal(entries.length, 3);
  const free = entries.find((entry) => entry.type === 'free-booking');
  assert.deepEqual(free.services, ['Авиабилеты', 'Отели']);
  assert.equal(entries.find((entry) => entry.orderId === 'one').title, 'Заказ ORD-000042');
  assert.equal(entries.find((entry) => entry.orderId === 'two').title, 'Заказ ORD-000043');
  assert.deepEqual(entries.find((entry) => entry.orderId === 'one').services, ['ЖД билеты']);
  let destination;
  reopened.setOpener((entry) => { destination = entry; return true; });
  assert.equal(reopened.open(free), true);
  assert.equal(destination.id, 'free-booking');
  assert.deepEqual(createDraftStore(disk, 'another-operator').workspaces(), []);
  assert.deepEqual(createDraftStore(disk, 'operator', () => DRAFT_TTL + 2000).workspaces(), []);
});
test('completed and cleared selection disappears without removing another order draft', () => {
  const store = createDraftStore(storage(), 'operator');
  store.write('free-booking/QuickAddForm/Страховка', 'title', 'Страховка ВЗР');
  store.write('order/one/HotelPicker/one', 'checkin', new Date(2026, 11, 1));
  store.clear('free-booking');
  assert.equal(store.workspaces().length, 1);
  assert.equal(store.workspaces()[0].orderId, 'one');
});

test('separate new order forms remain independently identifiable including company and group selections', () => {
  const store = createDraftStore(storage(), 'operator');
  store.write('OrderCreateModal/one/false', 'selClients', [{ id: 'a', name: 'Иван Иванов' }]);
  store.write('OrderCreateModal/two/true', 'clientType', 'org');
  store.write('OrderCreateModal/two/true', 'company', { id: 'b', name: 'ООО Пример' });
  const entries = store.workspaces();
  assert.equal(entries.length, 2);
  assert.equal(new Set(entries.map((row) => row.id)).size, 2);
  assert.ok(entries.find((row) => row.scope.endsWith('/true')).title.includes('группового заказа · ООО Пример'));
  assert.ok(entries.find((row) => row.scope.endsWith('/false')).title.includes('Иван Иванов'));
});

test('empty active hotel form is not blocked by saved searches in other service tabs', () => {
  const disk = storage(), store = createDraftStore(disk, 'operator');
  store.write('free-booking/DetailedSearchPanel', 'aviaParams', { from: 'MOW', to: 'LED', depDate: new Date(2026,11,1) });
  store.write('free-booking/HotelPicker/free', 'dest', '');
  store.write('free-booking/HotelPicker/free', 'checkin', null);
  store.write('free-booking/HotelPicker/free', 'radius', '2 км');
  store.write('free-booking/HotelPicker/free', 'meal', 'BB');
  store.write('free-booking/HotelPicker/free', 'occupancyRooms', [{adults:2,childrenAges:[]}]);
  assert.equal(store.hasWork('free-booking'), true);
  assert.equal(store.hasWork('free-booking/HotelPicker/free'), false);
  store.write('free-booking/HotelPicker/free', 'dest', 'Москва');
  assert.equal(store.hasWork('free-booking/HotelPicker/free'), true);
  store.write('free-booking/HotelPicker/free', 'dest', '');
  assert.equal(store.hasWork('free-booking/HotelPicker/free'), false);
  const reopened = createDraftStore(disk, 'operator');
  assert.equal(reopened.hasWork('free-booking/HotelPicker/free'), false);
  assert.equal(reopened.hasWork('free-booking/DetailedSearchPanel'), true);
  assert.equal(reopened.read('free-booking/DetailedSearchPanel','aviaParams').from, 'MOW');
});
