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
