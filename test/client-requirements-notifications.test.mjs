import assert from 'node:assert/strict';
import { readFile } from './helpers/source.mjs';
import test from 'node:test';

import { toUiNotification } from '../src/legacy/adapters/ui-adapters.js';

const page = await readFile(new URL('../src/modules/notifications/ui/NotificationsPage.jsx', import.meta.url), 'utf8');
const ui = await readFile(new URL('../src/shared/ui/index.jsx', import.meta.url), 'utf8');
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

test('всплывающие уведомления ограничены общей панелью с внутренней прокруткой', () => {
  assert.match(styles, /\.toast-wrap\{[^}]*bottom:16px;left:16px;right:auto;[^}]*align-items:stretch/);
  assert.doesNotMatch(styles, /body:has\(\.sidebar\.collapsed\) \.toast-wrap/);
  assert.match(styles, /\.toast-wrap\{[^}]*max-height:min\(500px,calc\(100dvh - 32px\)\)[^}]*overflow:hidden/);
  assert.match(styles, /\.toast-center-list\{[^}]*min-height:0;[^}]*overflow-y:auto;overscroll-behavior:contain/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*?\.toast-wrap[^}]*bottom:88px;[^}]*width:calc\(100vw - 24px\)/);
  assert.match(styles, /\.toast-slot\{width:100%;flex:0 0 auto\}/);
  assert.match(ui, /Все уведомления/);
});
