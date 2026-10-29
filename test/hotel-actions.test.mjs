import test from 'node:test';
import assert from 'node:assert/strict';
import { postSaleFlow, allRoomsSelected, hotelActionAvailability, policyLines } from '../src/modules/services/hotels/actions/hotelCapabilities.js';
import { hotelActionsApi } from '../src/modules/services/hotels/actions/hotelActionsApi.js';
const data = () => ({ summary: { rooms: [{ ref: 'room:0' }, { ref: 'room:1' }] }, operations: [], permissions: { view: true, modify: true, cancel: true, documents: true, financial_confirmation: true }, capabilities: { refresh: { mode: 'api' }, cancel_booking: { mode: 'api' }, cancel_rooms: { mode: 'unsupported', reason: 'Whole booking only' }, change_dates: { mode: 'manual' }, add_room: { mode: 'new_booking' }, documents: { mode: 'local' } } });
test('hotel actions have their own flow while airline services keep the ticket flow', () => {
  assert.equal(postSaleFlow({ kind: 'hotel' }), 'hotel');
  assert.equal(postSaleFlow({ kind: 'Гостиница' }), 'hotel');
  assert.equal(postSaleFlow({ kind: 'avia' }), 'ticket');
  assert.equal(postSaleFlow({ kind: 'Авиа' }), 'ticket');
});
test('rooms are independently selectable and whole-booking cancellation needs all of them', () => {
  const d = data();
  assert.equal(allRoomsSelected(d.summary.rooms, ['room:0']), false);
  assert.equal(allRoomsSelected(d.summary.rooms, ['room:1', 'room:0']), true);
  assert.equal(hotelActionAvailability('cancel_booking', d, ['room:0']).enabled, false);
  assert.equal(hotelActionAvailability('cancel_booking', d, ['room:0', 'room:1']).enabled, true);
  assert.equal(hotelActionAvailability('cancel_rooms', d, ['room:0']).enabled, false);
});
test('capabilities distinguish manual requests, new bookings, local documents and unsupported operations', () => {
  const d = data();
  assert.equal(hotelActionAvailability('change_dates', d, []).mode, 'manual');
  assert.equal(hotelActionAvailability('add_room', d, []).mode, 'new_booking');
  assert.equal(hotelActionAvailability('documents', d, []).mode, 'local');
  assert.equal(hotelActionAvailability('change_room', d, []).enabled, false);
});
test('unknown penalty is never advertised as a free cancellation', () => {
  assert.equal(hotelActionAvailability('cancel_free', data(), ['room:0', 'room:1']).enabled, false);
  assert.deepEqual(policyLines(null), []);
  assert.ok(policyLines({ cancel: [{ from: '2027-03-08', price: { amount: 120.25, currency: 'EUR' } }] }).some((line) => line.includes('120.25 EUR')));
});
test('a submitted or unknown cancellation cannot be submitted again', () => {
  for (const status of ['submitted_to_supplier', 'awaiting_supplier', 'checking', 'unknown']) {
    const d = data(); d.operations = [{ operation_type: 'cancel_booking', status }];
    assert.equal(hotelActionAvailability('cancel_booking', d, ['room:0', 'room:1']).enabled, false);
    assert.equal(hotelActionAvailability('refresh', d, []).enabled, true);
  }
});
test('view/modify/cancel/financial/document permissions are checked independently', () => {
  const d = data();
  d.permissions.modify = false;
  assert.equal(hotelActionAvailability('change_dates', d, []).enabled, false);
  d.permissions.financial_confirmation = false;
  assert.equal(hotelActionAvailability('cancel_booking', d, ['room:0', 'room:1']).enabled, false);
  assert.equal(hotelActionAvailability('refresh', d, []).enabled, true);
  d.permissions.documents = false;
  assert.equal(hotelActionAvailability('documents', d, []).enabled, false);
  assert.equal(hotelActionAvailability('refresh', d, [], true).enabled, false);
});
test('real request helpers preserve idempotency key, operation identity and explicit confirmation', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, body: options.body && JSON.parse(options.body), headers: options.headers }); return new Response(JSON.stringify({ id: 'op' }), { headers: { 'Content-Type': 'application/json' } }); };
  try {
    const body = { operation_type: 'cancel_booking', scope: 'booking', room_refs: ['room:0', 'room:1'] };
    await hotelActionsApi.create('service', body, 'persistent-request-key');
    assert.deepEqual(calls[0].body, body);
    assert.equal(calls[0].headers.get('Idempotency-Key'), 'persistent-request-key');
    const operation = { id: 'operation', version: 4 };
    await hotelActionsApi.confirm('service', operation, { confirmed: true, accept_unknown_penalty: true });
    await hotelActionsApi.confirm('service', operation, { confirmed: true, accept_unknown_penalty: true });
    assert.ok(calls[1].url.endsWith('/hotel-actions/operation/confirm'));
    assert.equal(calls[1].headers.get('Idempotency-Key'), calls[2].headers.get('Idempotency-Key'));
    assert.deepEqual(calls[1].body, { version: 4, confirmed: true, accept_unknown_penalty: true });
    await hotelActionsApi.resolve('service', operation, 'completed', 'Supplier answered');
    assert.deepEqual(calls[3].body, { version: 4, status: 'completed', note: 'Supplier answered' });
  } finally { globalThis.fetch = original; }
});
