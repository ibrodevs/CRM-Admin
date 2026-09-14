import assert from 'node:assert/strict';
import { readFile } from './helpers/source.mjs';
import test from 'node:test';

const chatsPageSource = await readFile(new URL('../src/modules/chats/ui/ChatsPage.jsx', import.meta.url), 'utf8');
const commApiSource = await readFile(new URL('../src/modules/chats/api/communicationsApi.js', import.meta.url), 'utf8');

test('communicationsApi includes history endpoint method', () => {
  assert.match(commApiSource, /history:\s*\(id,\s*signal\)\s*=>\s*get\(`chat\/threads\/\$\{id\}\/history\/`,\s*signal\)/);
});

test('chats page does not open history in a raw external tab', () => {
  assert.doesNotMatch(chatsPageSource, /window\.open\(communicationsApi\.historyUrl/);
});

test('ChatTaskDrawer allows creating a task with order selection, title, priority and due date', () => {
  assert.match(chatsPageSource, /function ChatTaskDrawer\(\{/);
  assert.match(chatsPageSource, /ordersApi\.createTask\(selectedOrderId/);
  assert.match(chatsPageSource, /TASK_PRIORITY_OPTIONS/);
  assert.match(chatsPageSource, /<DateField[^>]*label="Срок выполнения"/);
});

test('ChatHistoryDrawer fetches thread history and renders in-app timeline', () => {
  assert.match(chatsPageSource, /function ChatHistoryDrawer\(\{/);
  assert.match(chatsPageSource, /communicationsApi\.history\(thread\.id\)/);
  assert.match(chatsPageSource, /title="История изменений чата"/);
  assert.match(chatsPageSource, /title="Нет записей в истории"/);
});

test('ChatThread and ChatInfoPanel wire Задача and История buttons to drawers', () => {
  assert.match(chatsPageSource, /handleOpenTask = onOpenTask \|\|/);
  assert.match(chatsPageSource, /handleOpenHistory = onOpenHistory \|\|/);
  assert.match(chatsPageSource, /label:\s*'Задача',\s*title:\s*'Создать задачу',\s*onClick:\s*handleOpenTask/);
  assert.match(chatsPageSource, /label:\s*'История',\s*title:\s*'История изменений',\s*onClick:\s*handleOpenHistory/);
  assert.match(chatsPageSource, /<ChatTaskDrawer/);
  assert.match(chatsPageSource, /<ChatHistoryDrawer/);
});
