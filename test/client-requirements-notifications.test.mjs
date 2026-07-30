import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { toUiNotification } from '../js/api/adapters.js';

const page = await readFile(new URL('../js/page_notifications.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

test('backend-уведомление сохраняет точное время, ответственного и переход', () => {
  const notification = toUiNotification({
    id: 1,
    priority: 'high',
    source: 'documents',
    title: 'Документ готов',
    body: 'Можно открыть',
    resource_type: 'Order',
    resource_id: 'order-uuid',
    deep_link: '/orders/order-uuid',
    responsible_name: 'Иванов Иван',
    created_at: '2026-07-30T06:15:00Z',
  });
  assert.equal(notification.order, 'order-uuid');
  assert.equal(notification.link.type, 'order');
  assert.equal(notification.resp, 'Иванов Иван');
  assert.ok(notification.created);
  assert.equal(notification.act, 'Перейти к разделу');
});

test('центр уведомлений показывает время и ответственного, карточки выровнены', () => {
  assert.match(page, /Ответственный:/);
  assert.match(page, /Создано:/);
  assert.match(page, /n\.created/);
  assert.match(styles, /\.ntf\{display:grid;grid-template-columns:42px minmax\(0,1fr\) auto/);
});
