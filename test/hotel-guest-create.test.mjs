import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/shared/api/client.js';
import { hotelGuestErrors, hotelGuestDocumentErrors, hotelGuestApiErrors, persistHotelGuest, mergeHotelGuests, selectCreatedHotelGuest, validateHotelBookingGuests } from '../src/modules/services/hotels/guest-create.js';
import { hotelGuestSelection, hotelRoomAssignments, resolveHotelParticipants } from '../src/modules/services/hotels/guests.js';

const person = { id: 'person-new', surname: 'Иванова', given_name: 'Анна', latin_surname: 'IVANOVA', latin_given_name: 'ANNA', birth_date: '1992-02-29', gender: 'female', citizenship: 'KG' };
const payload = { ...person, documents: [] };
delete payload.id;

test('hotel guest complements CRM validation with required booking data and strict birth date validation', () => {
  assert.deepEqual(hotelGuestErrors(person, { dob: '29.02.1992' }), {});
  for (const field of ['surname', 'given_name', 'latin_surname', 'latin_given_name', 'birth_date', 'gender', 'citizenship']) {
    assert.ok(Object.keys(hotelGuestErrors({ ...person, [field]: '' })).length, field);
  }
  for (const date of ['1991-02-29', '1992-02-31', '2100-01-01', 'garbage']) assert.ok(hotelGuestErrors({ ...person, birth_date: date }).dob, date);
  assert.ok(hotelGuestErrors({ ...person, birth_date: '1992-03-02' }, { dob: '31.02.1992' }).dob);
  assert.ok(hotelGuestErrors({ ...person, latin_surname: 'ИВАНОВА' }).latLast);
});

test('required documents use existing CRM document payloads and must cover checkout', () => {
  assert.ok(hotelGuestDocumentErrors(payload, { required: true }).docNo);
  assert.deepEqual(hotelGuestDocumentErrors(payload, { required: false }), {});
  assert.ok(hotelGuestDocumentErrors({ documents: [{ number: '12345', expires_at: '2026-11-01' }] }, { required: true, checkout: '2026-11-03' }).docExpiry);
  assert.deepEqual(hotelGuestDocumentErrors({ documents: [{ number: '12345', expires_at: '2027-01-01' }] }, { required: true, checkout: '2026-11-03' }), {});
});

test('creating a free-search guest saves an actual CRM client and returns its person ID, not profile ID', async () => {
  const calls = [];
  const guest = await persistHotelGuest({ payload, api: { createClient: async (body) => { calls.push(body); return { id: 'client-profile', person: person.id, person_detail: person }; } } });
  assert.equal(guest.id, person.id);
  assert.equal(guest.person, person.id);
  assert.deepEqual(calls, [{ client_type: 'individual', person_data: payloadWithoutDocuments(), documents: [] }]);
});
function payloadWithoutDocuments() { const { documents, ...body } = payload; return body; }

test('new guest in an order reuses participant or sends the correct person ID to addParticipant', async () => {
  const calls = [];
  const api = { createClient: async () => ({ person_detail: person }) };
  const orderApi = { participants: async () => [], addParticipant: async (id, body) => { calls.push({ id, body }); return { id: 'participant-new', ...body }; } };
  const guest = await persistHotelGuest({ payload, api, orderId: 'order-1', orderApi });
  assert.equal(guest.id, 'participant-new'); assert.equal(guest.person, person.id);
  assert.deepEqual(calls, [{ id: 'order-1', body: { person: person.id, role: 'passenger' } }]);
  orderApi.participants = async () => [{ id: 'participant-existing', person: person.id, status: 'active' }];
  const reused = await persistHotelGuest({ api, savedPerson: person, orderId: 'order-1', orderApi });
  assert.equal(reused.id, 'participant-existing'); assert.equal(calls.length, 1);
});

test('failed participant creation is retried without creating another CRM person', async () => {
  let creates = 0, saved;
  const api = { createClient: async () => { creates++; return { person_detail: person }; } };
  const orderApi = { participants: async () => [], addParticipant: async () => { throw new Error('network'); } };
  await assert.rejects(persistHotelGuest({ payload, api, orderId: 'order-1', orderApi, onPersonSaved: (value) => { saved = value; } }), /network/);
  orderApi.addParticipant = async () => ({ id: 'participant-retry' });
  const guest = await persistHotelGuest({ payload, api, orderId: 'order-1', orderApi, savedPerson: saved });
  assert.equal(creates, 1); assert.equal(guest.id, 'participant-retry');
});

test('probable duplicate errors expose candidates without forcing another person into CRM', async () => {
  const duplicate = new ApiError('Найдены дубли', { code: 'POSSIBLE_DUPLICATE', details: { candidates: [person] } });
  await assert.rejects(persistHotelGuest({ payload, api: { createClient: async () => { throw duplicate; } } }), (error) => error === duplicate && error.details.candidates[0].id === person.id);
  const guest = await persistHotelGuest({ savedPerson: person, api: { createClient: () => { throw new Error('must not create'); } } });
  assert.equal(guest.person, person.id);
  assert.deepEqual(hotelGuestApiErrors({ fields: { person_data: { latin_given_name: ['Проверьте имя'] } } }), { latFirst: 'Проверьте имя' });
});

test('created guest is appended and selected without reindexing existing guests, main guest or HBPRO assignments', () => {
  const old = [{ id: 'a', person: 'person-a' }, { id: 'b', person: 'person-b' }, { id: 'c', person: 'person-c' }];
  const guest = { id: 'd', person: person.id };
  const result = selectCreatedHotelGuest(old, { 0: true, 1: true, 2: true }, 1, guest);
  assert.deepEqual(result.guests, [...old, guest]); assert.equal(result.selection[3], true); assert.equal(result.mainGuest, 1);
  const assignment = hotelRoomAssignments(result.guests, result.selection, result.mainGuest, [{ quantity: 2, adults: 2 }], { 0: 'room:1', 1: 'room:0', 2: 'room:0' });
  assert.equal(assignment.valid, true);
  assert.deepEqual(assignment.refs, ['room:0', 'room:1', 'room:0', 'room:1']);
  assert.deepEqual(hotelGuestSelection(result.guests, result.selection, result.mainGuest).map((g) => g.id), ['b', 'a', 'c', 'd']);
  assert.equal(selectCreatedHotelGuest([], {}, 0, guest).mainGuest, 0);
  assert.equal(mergeHotelGuests(result.guests, [guest]).length, 4);
});

test('HBPRO document is stored in CRM and linked using booking_document with participant IDs', async () => {
  const document = { id: 'doc-1', type: 'foreign_passport', expires_at: '2030-01-01', status: 'active' };
  const calls = [];
  const guest = await persistHotelGuest({ payload, api: { createClient: async () => ({ person_detail: person }), personDocuments: async () => [document] }, orderId: 'order-1', documentRequired: true, checkout: '2026-11-03', orderApi: { participants: async () => [], addParticipant: async (id, body) => { calls.push(body); return { id: 'participant-doc', ...body }; } } });
  assert.equal(guest.serverId, 'participant-doc'); assert.equal(calls[0].person, person.id); assert.equal(calls[0].booking_document, document.id);
  const body = [];
  assert.deepEqual(await resolveHotelParticipants('order-2', { guestPersonIds: [person.id], guestBookingDocuments: { [person.id]: document.id } }, { participants: async () => [], addParticipant: async (_, data) => { body.push(data); return { id: 'participant-later', ...data }; } }), ['participant-later']);
  assert.equal(body[0].booking_document, document.id);
});

test('HBPRO missing person data and documents produce actionable errors before adding the service', async () => {
  await assert.rejects(validateHotelBookingGuests([{ name: 'Анна', person: person.id }], { person: async () => ({ ...person, gender: '' }) }), /Укажите пол/);
  await assert.rejects(validateHotelBookingGuests([{ name: 'Анна', person: person.id }], { person: async () => person, personDocuments: async () => [] }, { documentRequired: true }), /действующий документ/);
});
