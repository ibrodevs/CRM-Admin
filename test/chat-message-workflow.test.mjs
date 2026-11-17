import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import * as mapper from '../src/modules/chats/model/chats.mapper.js';
import { mergeChatMessages } from '../src/modules/chats/model/chat-registry.js';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const THREAD = '5f0c1c7e-1b7e-4a51-9d7b-1a2b3c4d5e6f';
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
function harness(api = {}) {
  let cursor = 0;
  const cells = [], effects = [], sent = [];
  const state = (initial) => { const index = cursor++; if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial; return [cells[index], (next) => { cells[index] = typeof next === 'function' ? next(cells[index]) : next; }]; };
  const react = { ...require('react'), useState: state, useRef(initial) { const index = cursor++; return cells[index] ||= { current: initial }; }, useEffect(fn) { effects.push(fn); } };
  const components = Object.fromEntries(['Icon','Button','Drawer','EmptyState','Avatar','ActionMenu','ChannelBadge','Pill','ChatServiceCard','ChatTaskDrawer','ChatHistoryDrawer','ServicePreview'].map((name) => [name, name]));
  const bindings = { ...components, ...mapper, mergeChatMessages, useDraftState: (_scope, _field, initial) => state(initial), useToast: () => () => {}, SERVICE_KIND: {}, ORDER_STATUS: {}, OPERATORS: [],
    chatOrderStatus: () => null, chatTypeMeta: (type) => ({ label: type, icon: 'chat' }), chatServiceById: (id, rows) => rows.find((row) => row.id === id), chatText: (text) => text, chatFileSize: () => '', threadUnread: () => 0,
    communicationsApi: { async send(id, body) { sent.push({ id, body }); return { id: 'new', body: body.body, service_card: body.service_card, author_user: 'me', created_at: '2026-11-17T12:00:00Z' }; }, async read() {}, ...api }, documentsApi: {}, workspaceActionsApi: {} };
  const source = readFileSync(new URL('../src/modules/chats/ui/ChatsPage.jsx', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('function ChatThread('), source.indexOf('\nfunction ChatInfoPanel('));
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? react : name === 'bindings' ? bindings : require(name);
  mod._compile(babel.transformSync(`import React,{useState,useEffect,useRef} from 'react'; import {${Object.keys(bindings).join(',')}} from 'bindings';\n${body}\nexport {ChatThread};`, {filename:'ChatThread.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code, import.meta.filename);
  const props = { thread: { id: THREAD, type: 'client', name: 'Иван Петров', orderId: 'order', route: 'Бишкек → Стамбул', channel: 'CRM', messages: [], internal: [] }, currentUserId: 'me', embedded: true, services: [{id:'svc',kind:'Авиа',title:'Бишкек → Стамбул'}], recipients: [], onSwitchThread() {} };
  return { sent, effects, props, render(extra = {}) { cursor = 0; effects.length = 0; return mod.exports.ChatThread({ ...props, ...extra }); } };
}

test('recipient and service selection open side panels and selected service is sent to the server', async () => {
  const h = harness(); let choose = 0;
  let tree = h.render({ onChooseRecipient: () => choose++ });
  nodes(tree).find((node) => node.props.className === 'chip chat-recipient-trigger').props.onClick();
  assert.equal(choose, 1);
  nodes(tree).find((node) => node.props.title === 'Привязать к услуге').props.onClick();
  tree = h.render();
  assert.equal(nodes(tree).find((node) => node.type === 'Drawer' && node.props.title === 'Выбрать услугу для сообщения').props.open, true);
  nodes(tree).find((node) => node.props.className === 'chat-service-option').props.onClick();
  tree = h.render();
  nodes(tree).find((node) => node.type === 'input' && node.props.placeholder === 'Сообщение…').props.onChange({ target: { value: 'Проверьте вылет' } });
  tree = h.render();
  await nodes(tree).find((node) => node.props.title === 'Отправить').props.onClick();
  assert.equal(h.sent[0].id, THREAD);
  assert.deepEqual(h.sent[0].body, { body: 'Проверьте вылет', type: 'text', internal_note: false, service_card: 'svc' });
  assert.equal(nodes(h.render()).find((node) => node.type === 'input' && node.props.placeholder === 'Сообщение…').props.value, '');
});

test('incoming messages refresh while open and load failures are visible instead of appearing as an empty conversation', async (t) => {
  const original = globalThis.window;
  let tick, cleanupTimer = false, response = [{ id:'first', body:'Первое сообщение', created_at:'2026-11-17T10:00:00Z' }];
  globalThis.window = { setInterval(fn) { tick = fn; return 1; }, clearInterval() { cleanupTimer = true; }, addEventListener() {}, removeEventListener() {} };
  t.after(() => { if (original === undefined) delete globalThis.window; else globalThis.window = original; });
  const h = harness({ async messages() { if (response instanceof Error) throw response; return { results: response }; } });
  h.render(); const cleanups = h.effects.map((fn) => fn());
  await new Promise(setImmediate);
  assert.ok(nodes(h.render()).some((node) => node.props.children === 'Первое сообщение'));
  response = [...response, { id:'second', body:'Новое входящее', created_at:'2026-11-17T11:00:00Z' }];
  await tick();
  assert.ok(nodes(h.render()).some((node) => node.props.children === 'Новое входящее'));
  response = new Error('Нет соединения'); await tick();
  assert.ok(nodes(h.render()).some((node) => node.props.role === 'alert'));
  cleanups.forEach((fn) => fn?.());
  assert.equal(cleanupTimer, true);
});

test('refresh retains an in-flight send, updates delivery, removes deleted messages and avoids redundant scroll updates', () => {
  const current = [{ id:'a', text:'A', createdAt:'2026-11-17T10:00:00Z' }, { id:'b', text:'B', createdAt:'2026-11-17T11:00:00Z' }];
  assert.equal(mergeChatMessages(current, [current[0]]), current);
  const next = mergeChatMessages(current, [{ ...current[0], deliveryState:'read' }]);
  assert.equal(next.length, 2);
  assert.equal(next[0].deliveryState, 'read');
  assert.deepEqual(mergeChatMessages(next, [{id:'a',deleted:true}]).map((message) => message.id), ['b']);
});
