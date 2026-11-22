import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichChatThread, chatUnread } from '../src/modules/chats/model/chat-registry.js';
import { toUiThread } from '../src/modules/chats/model/chats.mapper.js';

const orders = [{ id: 'o1', no: 'ORD-1', client: 'Иван Петров', client_person: 'p1', operator: 'Анна' }, { id: 'o2', no: 'ORD-2', client: 'Другой клиент' }];
const services = [{ id: 's1', order: 'o1', kind: 'Авиа', title: 'FRU → IST' }, { id: 's2', order: 'o2', kind: 'Авиа', title: 'DXB → SVO' }];
const clients = [{ id: 'p1', name: 'Иван Петров', phone: '+996555000000', email: 'ivan@example.test' }];
test('registry identifies order chats using the customer, itinerary, contacts and actual membership', () => {
  const thread = toUiThread({ id: 'chat', order: 'o1', order_number: 'ORD-1', title: 'Заказ № ORD-1', unread_count: 3, last_message: { body: 'Подтвердите вылет', created_at: '2026-11-17T09:00:00Z' } });
  const row = enrichChatThread(thread, { orders, services, clients, users: [{ id: 'u1', name: 'Анна' }], participants: [{ user: 'u1', role: 'operator' }, { person: 'p1', role: 'client' }, { name: 'Бывший участник', left_at: '2026-11-01' }] });
  assert.equal(row.name, 'Иван Петров');
  assert.match(row.route, /Бишкек.*Стамбул/);
  assert.doesNotMatch(row.route, /Москва|Дубай/);
  assert.deepEqual(row.relatedServices, ['s1']);
  assert.deepEqual(row.participants.map((p) => p.name), ['Анна', 'Иван Петров']);
  assert.match(row.contact, /996555000000/);
  assert.equal(row.responsibleOperator, 'Анна');
  assert.equal(row.last, 'Подтвердите вылет');
  assert.equal(chatUnread(row), 3);
});
test('unknown membership stays unknown and does not copy passengers into chat participants', () => {
  const row = enrichChatThread({ id: 'c', orderId: 'o1', name: 'Заказ № ORD-1' }, { orders, services, clients });
  assert.deepEqual(row.participants, []);
  assert.equal(row.participantsLoaded, false);
  assert.equal(enrichChatThread(row, { participants: [] }).participantsLoaded, true);
});
test('supplier chat names are preserved and unrelated orders never supply customer data', () => {
  const row = enrichChatThread({ name: 'Hotelbook', orderId: 'missing' }, { orders, services, clients });
  assert.equal(row.name, 'Hotelbook');
  assert.equal(row.client, '');
  assert.equal(row.route, '');
  assert.equal(row.contact, '');
});
test('unread counters support both server counts and channel counts', () => {
  assert.equal(chatUnread({ unread_count: 5 }), 5);
  assert.equal(chatUnread({ unread: { CRM: 2, telegram: 3 } }), 5);
  assert.equal(chatUnread({ unread: 0, unread_count: 5 }), 0);
});

test('registry includes actual trip dates from related services and omits missing-date filler', () => {
  const thread={name:'Клиент',orderId:'o1'};
  const result=enrichChatThread(thread,{orders,services:[{id:'s1',order:'o1',kind:'Трансфер',title:'Москва → Казань',starts_at:'2026-11-20T09:00:00Z',ends_at:'2026-11-21T09:00:00Z'}]});
  assert.match(result.tripDates,/20.*11.*2026/);
  assert.match(result.route,/Москва → Казань/);
  assert.equal(enrichChatThread(thread,{orders,services}).tripDates,'');
});

const { chatRegistryContext, chatActivityLabel } = await import('../src/modules/chats/model/chat-registry.js');
test('compact trip context removes missing-city filler and deduplicates dates across hotel and flight services', () => {
  const context = chatRegistryContext({ route: 'Город не указан · Мастер-Отель Первомайская', tripDates: '18.09.2026 → 22.09.2026 · 18.09.2026 • 18:06 → 22.09.2026 • 20:06' });
  assert.equal(context.title, 'Мастер-Отель Первомайская');
  assert.match(context.dates, /^18–22 сент\.? 2026$/);
});
test('compact date ranges preserve month and year boundaries', () => {
  assert.match(chatRegistryContext({ tripDates: '24.11.2026 → 02.12.2026' }).dates, /24 нояб.*2 дек.*2026/);
  assert.match(chatRegistryContext({ tripDates: '31.12.2026 → 02.01.2027' }).dates, /2026.*2027/);
  assert.equal(chatRegistryContext({}).dates, '');
  assert.equal(chatActivityLabel('invalid'), '');
});
