import test from 'node:test';
import assert from 'node:assert/strict';
import { hotelPersonToGuest, hotelGuestSelection, resolveHotelParticipants } from '../src/modules/services/hotels/guests.js';

test('CRM people are guest candidates without inventing names from a search count', () => {
  assert.deepEqual(hotelPersonToGuest({ id: 'person-a', surname: 'Иванов', given_name: 'Иван', birth_date: '1990-01-01' }), { id: 'person-a', person: 'person-a', name: 'Иванов Иван', dob: '1990-01-01', role: 'Гость', docType: '', docNo: '' });
  assert.deepEqual(hotelGuestSelection([], { 0: true }, 0), []);
});

test('only selected guests are carried to the order, primary guest first', () => {
  const guests = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(hotelGuestSelection(guests, { 0: true, 2: true }, 2), [guests[2], guests[0]]);
});

test('free hotel selection reuses participants and adds missing people once', async () => {
  const calls = [];
  const api = { participants: async () => [{ id: 'participant-a', person: 'person-a', status: 'active' }],
    addParticipant: async (order, body) => { calls.push({ order, body }); return { id: 'participant-b', person: body.person }; } };
  assert.deepEqual(await resolveHotelParticipants('order', { guestPersonIds: ['person-b', 'person-a', 'person-b'] }, api), ['participant-b', 'participant-a']);
  assert.deepEqual(calls, [{ order: 'order', body: { person: 'person-b', role: 'passenger' } }]);
});

test('non-hotel drafts retain existing participant behavior', async () => {
  assert.equal(await resolveHotelParticipants('order', {}, { participants: () => { throw new Error('unexpected call'); } }), undefined);
});
