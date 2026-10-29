import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeContactName, contactPersonForDraft, orderContact } from '../src/modules/orders/model/order-contact.js';
import { ordersApi } from '../src/modules/orders/api/ordersApi.js';

test('contact name normalization accepts Cyrillic/Latin and rejects whitespace or null', () => {
  assert.equal(normalizeContactName(null), '');
  assert.equal(normalizeContactName(' \n\t '), '');
  assert.equal(normalizeContactName(' Anna  Ivanova '), 'Anna Ivanova');
  assert.equal(normalizeContactName(' Анна   Иванова '), 'Анна Иванова');
});

test('server-resolved CRM contact is displayed even when a client profile is absent locally', () => {
  const contact = { person: 'person-1', name: '  Анна   Иванова ', selected: true, valid: true, required: true, source: 'contact_person' };
  assert.equal(orderContact({ booking_contact: contact }, [], []).name, 'Анна Иванова');
});

test('first passenger and company name do not masquerade as a selected contact', () => {
  const contact = orderContact({ client_company: 'company', client: 'Company' }, [{ id: 'participant-1', person: 'person-1', name: 'Anna' }]);
  assert.equal(contact.selected, false);
  assert.equal(contact.valid, false);
  assert.equal(contact.name, '');
  assert.equal(contact.message, 'Укажите контактное лицо заказа.');
});

test('explicitly marked existing guest remains contact without reentering a name', () => {
  const guest = { id: 'participant-1', person: 'person-1', name: 'Anna', is_contact: true, status: 'active' };
  const contact = orderContact({ client_company: 'company' }, [guest]);
  assert.equal(contact.person, 'person-1');
  assert.equal(contact.name, 'Anna');
  assert.equal(contact.valid, true);
});

test('creation uses selected person ID, never the participant ID or a duplicate name string', () => {
  assert.equal(contactPersonForDraft({ contact_person: 'explicit', client_person: 'payer' }), 'explicit');
  assert.equal(contactPersonForDraft({ participants: [{ id: 'participant', person: 'person-1', is_contact: true }] }), 'person-1');
  assert.equal(contactPersonForDraft({ client_person: 'payer' }), 'payer');
  assert.equal(contactPersonForDraft({ client_company: 'company', participants: [{ person: 'person-1' }] }), null);
  assert.equal(contactPersonForDraft({ contact_person: null, client_person: 'payer' }), null);
});

test('actual create and edit API requests preserve the contact FK and optimistic version', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, method: options.method, body });
    return new Response(JSON.stringify({ id: 'order', ...body }), { headers: { 'Content-Type': 'application/json' } });
  };
  try {
    await ordersApi.create({ client_company: 'company', participants: [{ id: 'participant', person: 'person-1', is_contact: true }] });
    assert.equal(calls[0].body.contact_person, 'person-1');
    assert.equal(calls[0].body.contact_name, undefined);
    await ordersApi.update('order', { contact_person: 'person-2', version: 7 });
    assert.equal(calls[1].method, 'PATCH');
    assert.deepEqual(calls[1].body, { contact_person: 'person-2', version: 7 });
  } finally { globalThis.fetch = original; }
});
