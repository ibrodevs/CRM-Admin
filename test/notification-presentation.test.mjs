import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationPresentation, notificationCountdown } from '../src/shared/lib/notification-presentation.js';
const orders = [{ id: 'order-one', no: 'ORD-000001', client: 'Иван Петров' }];
const services = [{ id: 'flight', order: 'order-one', kind: 'Авиа', title: 'FRU → IST', ticketing_deadline: '2026-11-17T14:00:00+06:00', payment_deadline: '2026-11-17T15:00:00+06:00' }];

test('ticketing notification identifies the customer, order and route and uses the exact service deadline', () => {
  const info = notificationPresentation({ resource_type: 'OrderService', resource_id: 'flight', event_type: 'service.deadline', title: 'Дедлайн выписки через 2h' }, { orders, services });
  assert.equal(info.order, orders[0]);
  assert.ok(info.context.includes('Иван Петров'));
  assert.ok(info.context.includes('Заказ № ORD-000001'));
  assert.match(info.context.join(' '), /Бишкек.*Стамбул/);
  assert.equal(info.deadlineAt, '2026-11-17T08:00:00.000Z');
  assert.equal(info.deadlineLabel, 'До выписки');
});
test('document and chat notifications identify their own resource instead of a generic name', () => {
  const document = notificationPresentation({ resource_type: 'Document', resource_id: 'doc' }, { orders, documents: [{ id: 'doc', orderId: 'order-one', name: 'Договор № 45' }] });
  assert.ok(document.context.includes('Договор № 45'));
  assert.equal(document.actionLabel, 'Документы заказа');
  const chat = notificationPresentation({ resource_type: 'ChatThread', resource_id: 'chat', event_type: 'chat.response', response_deadline: '2026-11-17T08:00:00Z' }, { orders, chats: [{ id: 'chat', orderId: 'order-one', name: 'Анна · Трансфер' }] });
  assert.ok(chat.context.includes('Анна · Трансфер'));
  assert.equal(chat.actionLabel, 'Открыть чат');
  assert.equal(chat.deadlineLabel, 'До ответа');
  assert.equal(chat.deadlineAt, '2026-11-17T08:00:00.000Z');
});
test('priority alone never fabricates a deadline, and unknown resources never inherit another customer', () => {
  const unknown = notificationPresentation({ priority: 'Критический', resource_type: 'OrderService', resource_id: 'missing', title: 'Срочно: выписка через 2 часа' }, { orders, services });
  assert.equal(unknown.deadlineAt, null);
  assert.deepEqual(unknown.context, []);
  const ordinary = notificationPresentation({ resource_type: 'OrderService', resource_id: 'flight', event_type: 'service.updated' }, { orders, services });
  assert.equal(ordinary.deadlineAt, null, 'ordinary status changes are not ticketing alerts');
});
test('legacy deadline events recover only explicit timestamps from their bodies', () => {
  const info = notificationPresentation({ body: 'Перелёт: выписка до 2026-11-17 14:00:00+06:00', title: 'Дедлайн выписки' });
  assert.equal(info.deadlineAt, '2026-11-17T08:00:00.000Z');
});
test('countdown crosses midnight and shows overdue durations without negative clocks', () => {
  const end = '2026-11-18T00:00:00Z';
  assert.deepEqual(notificationCountdown(end, Date.parse('2026-11-17T23:59:01Z')), { overdue: false, text: '00:00:59' });
  assert.deepEqual(notificationCountdown(end, Date.parse('2026-11-18T00:01:10Z')), { overdue: true, text: '00:01:10' });
  assert.deepEqual(notificationCountdown(end, Date.parse('2026-11-16T23:00:00Z')), { overdue: false, text: '1 д. 01:00:00' });
  assert.equal(notificationCountdown('invalid'), null);
});
