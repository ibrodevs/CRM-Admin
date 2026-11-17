import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import * as mapper from '../src/modules/chats/model/chats.mapper.js';
import * as registry from '../src/modules/chats/model/chat-registry.js';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
function harness() {
  const cells = [], effects = []; let cursor = 0;
  const react = { ...require('react'), useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], (next) => { cells[i] = typeof next === 'function' ? next(cells[i]) : next; }]; },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || deps.some((value, index) => value !== cells[i][index])) { cells[i] = deps; effects.push(fn); } } };
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? react
    : name.includes('/clients/index') ? { UnifiedBindPicker:'UnifiedBindPicker' }
    : name.includes('/chats/index') ? { ...mapper, threadUnread: registry.chatUnread, ...Object.fromEntries(['ChatThread','ChatInfoPanel','ChatTaskDrawer','ChatHistoryDrawer'].map((name) => [name,name])) }
    : name.includes('chat-registry') ? registry
    : name.includes('communicationsApi') ? {communicationsApi:{}}
    : name.includes('icons') ? {Icon:'Icon'} : name.includes('Overlays') ? {Drawer:'Drawer'}
    : name.includes('EmptyState') ? {EmptyState:'EmptyState'} : name.includes('SearchBox') ? {SearchBox:'SearchBox'} : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/application/shell/ChatDrawer.jsx', import.meta.url),'utf8'),{filename:'ChatDrawer.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);
  return { ...mod.exports, render(props) { cursor = 0; return mod.exports.GlobalChatDrawer(props); }, flush() { effects.splice(0).forEach((fn) => fn()); } };
}

test('orders are selected through the shared side picker and refresh does not switch back to the original order', () => {
  const h = harness();
  const orders = [{id:'o1',no:'ORD-1',client:'Иван'}, {id:'o2',no:'ORD-2',client:'Анна'}];
  const threads = [{id:'c1',orderId:'o1',order:'ORD-1',type:'client',name:'Заказ № ORD-1'}, {id:'c2',orderId:'o2',order:'ORD-2',type:'client',name:'Заказ № ORD-2'}];
  const props = {open:true,onClose(){},contextOrder:threads[0],initialThreads:threads,orders};
  let tree = h.render(props); h.flush(); tree = h.render(props);
  nodes(tree).find((node) => node.props.title === 'Выбрать заказ в боковом окне').props.onClick();
  tree = h.render(props);
  const picker = nodes(tree).find((node) => node.type === 'UnifiedBindPicker');
  assert.equal(picker.props.open, true);
  assert.deepEqual(picker.props.modes, ['order']);
  picker.props.onPick({order:orders[1]});
  tree = h.render({...props,initialThreads:threads.map((thread) => ({...thread}))}); h.flush();
  tree = h.render({...props,initialThreads:[...threads]});
  const conversation = nodes(tree).find((node) => node.type === 'ChatThread');
  assert.equal(conversation.props.thread.id, 'c2');
  assert.equal(conversation.props.thread.name, 'Анна');
  assert.equal(conversation.key, 'c2');
  assert.ok(!nodes(tree).some((node) => node.type === 'ActionMenu'));
});
test('matching by customer cannot open a different order conversation, and order selection prefers the client chat', () => {
  const {findMatchingThread} = harness();
  const threads = [{id:'supplier',orderId:'o1',order:'ORD-1',type:'supplier',client:'Иван'}, {id:'client',orderId:'o1',order:'ORD-1',type:'client',client:'Иван'}];
  assert.equal(findMatchingThread(threads,{id:'missing',no:'ORD-2',client:'Иван'}),null);
  assert.equal(findMatchingThread(threads,{id:'o1',no:'ORD-1'}).id,'client');
});
