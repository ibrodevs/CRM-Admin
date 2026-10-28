import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as guests from '../src/modules/services/hotels/guests.js';
import * as creation from '../src/modules/services/hotels/guest-create.js';
import * as criteria from '../src/modules/services/hotels/search-criteria.js';

const require = createRequire(import.meta.url);
const React = require('react');
const babel = require('next/dist/compiled/babel/core');
const source = fs.readFileSync(new URL('../src/modules/services/hotels/HotelsPage.jsx', import.meta.url), 'utf8');
const ast = babel.parseSync(source, { babelrc: false, configFile: false, presets: ['next/dist/compiled/babel/preset-react'] });
const picker = ast.program.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'HotelPicker');
const hookNames = picker.body.body.flatMap((node) => node.type === 'VariableDeclaration' ? node.declarations.filter((d) => d.id.type === 'ArrayPattern' && d.init?.callee?.name === 'useState').map((d) => d.id.elements[0].name) : []);
const compiled = babel.transformSync(ast.program.body.filter((node) => !['ImportDeclaration', 'ExportNamedDeclaration'].includes(node.type)).map((node) => source.slice(node.start, node.end)).join('\n'), { babelrc: false, configFile: false, presets: ['next/dist/compiled/babel/preset-react'] }).code;

// Render the actual picker with controllable hooks; exercise its event handlers
// without a network server, search provider, or extra React testing dependencies.
function mountPicker({ orderId, participants } = {}) {
  const state = [], results = [];
  let cursor = 0;
  const bindings = Object.fromEntries(ast.program.body.filter((n) => n.type === 'ImportDeclaration').flatMap((n) => n.specifiers.map((s) => [s.local.name, s.local.name])));
  Object.assign(bindings, guests, creation, criteria, {
    React, window: {}, useToast: () => () => {},
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
    useEffect() {}, HOTEL_MEALS: [], fmtDate: (date) => criteria.hotelDateOnly(date),
    clientsApi: { person: async () => ({ surname: 'Иванов', given_name: 'Иван', latin_surname: 'IVANOV', latin_given_name: 'IVAN', birth_date: '1990-01-01', gender: 'male', citizenship: 'KG' }), personDocuments: async () => [{ id: 'doc', status: 'active', expires_at: '2030-01-01' }] },
  });
  vm.createContext(bindings); vm.runInContext(compiled, bindings);
  const props = { orderId, participants, onApply: async (offer) => { results.push(offer); } };
  const render = () => { cursor = 0; return bindings.HotelPicker(props); };
  render();
  const set = (name, value) => { const index = hookNames.indexOf(name); assert.notEqual(index, -1, name); state[index] = value; };
  const get = (name) => state[hookNames.indexOf(name)];
  const find = (tree, type) => {
    if (!tree) return;
    if (Array.isArray(tree)) return tree.map((node) => find(node, type)).find(Boolean);
    if (tree.type === type) return tree;
    return find(tree.props?.children, type);
  };
  return { set, get, render, results, placement: () => find(render(), bindings.PaxPlacementPanel), creation: () => find(render(), bindings.HotelGuestCreateDrawer) };
}

function seed(picker, existing, provider = 'hotelbook') {
  const room = { id: 'room-offer', name: 'Twin', cap: 2, beds: 'Twin', tariffs: [{ id: 'tariff-1', price: 14500, currency: 'RUB', name: 'Завтрак' }] };
  const hotel = { id: 'hotel-1', _backendOfferId: 'offer-1', provider_adapter: provider, name: 'Отель', rooms: [room], currency: 'RUB', fare: { rooms: [{ roomName: 'Twin', adults: 2, quantity: 1 }], isRemarkFreeFormAllowed: true } };
  for (const [name, value] of Object.entries({ activeHotel: hotel, panel: 'pax', crmGuests: [existing], selRoom: room, selTariff: room.tariffs[0], guestSel: { 0: true }, mainGuest: 0, checkin: new Date(2027, 0, 10), checkout: new Date(2027, 0, 12), specialReq: 'Тихий номер', guestRooms: { 0: 'room:0' } })) picker.set(name, value);
}

test('actual booking picker creates and automatically selects a guest without resetting the search, tariff, dates or requests', async () => {
  const picker = mountPicker();
  seed(picker, { id: 'person-old', person: 'person-old', name: 'Первый гость' });
  const preserved = Object.fromEntries(['activeHotel', 'selRoom', 'selTariff', 'checkin', 'checkout', 'specialReq', 'guestRooms', 'occupancyRooms', 'liveHotels'].map((name) => [name, picker.get(name)]));
  picker.placement().props.onCreateGuest();
  assert.ok(picker.creation());
  await picker.creation().props.onCreated({ id: 'person-new', person: 'person-new', name: 'Новый гость' });
  picker.creation().props.onClose();
  const placement = picker.placement();
  assert.equal(placement.props.pax.length, 2);
  assert.deepEqual(placement.props.guestSel, { 0: true, 1: true });
  for (const [name, value] of Object.entries(preserved)) assert.equal(picker.get(name), value, name);
  await placement.props.onAdd();
  assert.deepEqual(picker.results[0].guestPersonIds, ['person-old', 'person-new']);
  assert.deepEqual(picker.results[0].guestRoomRefs, ['room:0', 'room:0']);
  assert.equal(picker.results[0].specialRequests, 'Тихий номер');
  assert.equal(picker.results[0]._backendOfferId, 'offer-1');
});

test('actual order picker preserves existing guest selection and sends participant IDs instead of person IDs', async () => {
  const existing = { id: 'participant-old', person: 'person-old', name: 'Первый гость' };
  const picker = mountPicker({ orderId: 'order-1', participants: [existing] });
  seed(picker, existing);
  assert.equal(picker.placement().props.pax[0], existing);
  picker.placement().props.onCreateGuest();
  assert.equal(picker.creation().props.orderId, 'order-1');
  await picker.creation().props.onCreated({ id: 'participant-new', serverId: 'participant-new', person: 'person-new', name: 'Новый гость' });
  await picker.placement().props.onAdd();
  assert.deepEqual(picker.results[0].participantIds, ['participant-old', 'participant-new']);
  assert.equal(picker.results[0].guestPersonIds, undefined);
});

test('editing existing guest data stays inside placement and keeps selected tariff', async () => {
  const existing = { id: 'participant-old', person: 'person-old', name: 'Первый гость' };
  const picker = mountPicker({ orderId: 'order-1', participants: [existing] });
  seed(picker, existing);
  const tariff = picker.get('selTariff');
  picker.placement().props.onEditGuest(existing);
  assert.equal(picker.creation().props.personId, 'person-old');
  await picker.creation().props.onCreated({ ...existing, name: 'Исправленные данные' });
  assert.equal(picker.placement().props.pax.length, 1);
  assert.equal(picker.placement().props.pax[0].name, 'Исправленные данные');
  assert.equal(picker.get('selTariff'), tariff);
});

test('editing an unselected person does not change existing selection or exceed room capacity', async () => {
  const picker = mountPicker();
  seed(picker, { id: 'person-old', person: 'person-old', name: 'Первый гость' });
  picker.set('crmGuests', [...picker.get('crmGuests'), { id: 'person-other', person: 'person-other', name: 'Другой гость' }]);
  picker.placement().props.onEditGuest(picker.placement().props.pax[1]);
  await picker.creation().props.onCreated({ id: 'person-other', person: 'person-other', name: 'Исправленный гость' });
  assert.deepEqual(picker.placement().props.guestSel, { 0: true });
  assert.equal(picker.get('mainGuest'), 0);
});
