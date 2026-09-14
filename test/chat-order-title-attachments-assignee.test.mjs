import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from './helpers/source.mjs';
import { isBackendThread, isUuid, orderRef, toUiThread } from '../src/modules/chats/model/chats.mapper.js';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const chatsPage = await source('../src/modules/chats/ui/ChatsPage.jsx');
const chatDrawer = await source('../src/application/shell/ChatDrawer.jsx');
const routeRenderer = await source('../src/application/routing/RouteRenderer.jsx');
const overlays = await source('../src/application/shell/GlobalOverlays.jsx');

const ORDER_ID = 'a23760ea-20dc-42a1-bdfc-44aebe56da64';
const rawThread = {
  id: '5f0c1c7e-1b7e-4a51-9d7b-1a2b3c4d5e6f',
  type: 'client',
  order: ORDER_ID,
  order_number: 'ORD-000123',
  title: `Заказ № ${ORDER_ID}`,
  status: 'active',
  created_at: '2026-09-14T10:00:00Z',
};

test('заголовок чата показывает номер заказа, а не UUID', () => {
  const thread = toUiThread(rawThread);
  assert.equal(thread.name, 'Заказ № ORD-000123');
  assert.equal(thread.order, 'ORD-000123');
  assert.equal(thread.orderId, ORDER_ID);
});

test('без номера заказа UUID сокращается до короткого фрагмента', () => {
  assert.equal(toUiThread({ ...rawThread, order_number: '' }).name, 'Заказ № A23760EA');
  assert.equal(toUiThread({ ...rawThread, title: '', order_number: 'ORD-000123' }).name, 'Заказ № ORD-000123');
  assert.equal(orderRef(ORDER_ID), 'A23760EA');
  assert.equal(orderRef('ORD-000123'), 'ORD-000123');
  assert.equal(orderRef(null), '—');
});

test('тред сервера отличается от приведённого треда и от заказа', () => {
  assert.equal(isBackendThread(rawThread), true);
  assert.equal(isBackendThread(toUiThread(rawThread)), false);
  assert.equal(isBackendThread({ id: ORDER_ID, no: 'ORD-000123' }), false);
  assert.equal(isUuid(ORDER_ID), true);
  assert.equal(isUuid('order-ORD-000123'), false);
});

test('чат из карточки заказа открывает настоящий тред, а не заглушку', () => {
  assert.match(chatDrawer, /isBackendThread\(contextOrder\)/);
  assert.match(chatDrawer, /toUiThread\(contextOrder\)/);
  assert.match(chatDrawer, /orderRef\(active\.order\)/);
  assert.match(overlays, /<GlobalChatDrawer[^>]*users=\{workspace\.users\}/);
});

test('файл сначала прикрепляется, затем отправляется кнопкой отправки', () => {
  assert.doesNotMatch(chatsPage, /!thread\.orderId\) return/);
  assert.match(chatsPage, /onChange=\{pickAttachment\}/);
  assert.match(chatsPage, /if \(file\) setPendingFile\(file\)/);
  assert.match(chatsPage, /type: 'file', attachment: await uploadChatFile\(pendingFile\)/);
  assert.match(chatsPage, /title="Убрать файл"/);
});

test('в задаче из чата можно назначить ответственного', () => {
  assert.match(chatsPage, /<EmployeePickerDrawer[^>]*options=\{employees\}/);
  assert.match(chatsPage, /assignee: assignee\?\.id \|\| null/);
  assert.match(routeRenderer, /<ChatsPage[^>]*users=\{workspace\.users\}/);
});
