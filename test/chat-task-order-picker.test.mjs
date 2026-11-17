import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
function harness() {
  let cursor = 0, submitted;
  const cells = [], deps = [], effects = [];
  const react = { ...require('react'), useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], next => { cells[i] = typeof next === 'function' ? next(cells[i]) : next; }]; }, useEffect(fn, next) { const i = cursor++; if (!deps[i] || next.some((value,index) => value !== deps[i][index])) { deps[i] = next; effects.push(fn); } } };
  const bindings = { useToast: () => () => {}, orderRef: (value) => value, userListApi:{}, TASK_PRIORITY_OPTIONS:[], formatIsoDate: (value) => value, ordersApi:{async createTask(id,body){submitted={id,body};}}, ...Object.fromEntries(['Drawer','Field','Button','Input','Select','DateField','Avatar','Icon','EmployeePickerDrawer','UnifiedBindPicker'].map((name) => [name,name])) };
  const source = readFileSync(new URL('../src/modules/chats/ui/ChatsPage.jsx',import.meta.url),'utf8');
  const body = source.slice(source.indexOf('function ChatTaskDrawer('),source.indexOf('function ChatHistoryDrawer('));
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? react : name === 'bindings' ? bindings : require(name);
  mod._compile(babel.transformSync(`import {useState,useEffect} from 'react'; import {${Object.keys(bindings)}} from 'bindings';\n${body}\nexport {ChatTaskDrawer};`,{filename:'ChatTaskDrawer.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);
  return {render(props){cursor=0;return mod.exports.ChatTaskDrawer(props);},flush(){effects.splice(0).forEach(fn=>fn());},submitted:()=>submitted};
}
test('chat tasks choose orders through a side panel and preserve the choice and typed title on refresh', async () => {
  const h = harness(), orders=[{id:'one',no:'ORD-1',client:'Иван'},{id:'two',no:'ORD-2',client:'Анна'}];
  const props={open:true,onClose(){},thread:{id:'chat',orderId:'one',order:'ORD-1',name:'Иван'},orders,users:[{id:'user'}]};
  h.render(props);h.flush();let tree=h.render(props);
  nodes(tree).find(node=>node.props['aria-label']==='Выбрать заказ для задачи').props.onClick();
  tree=h.render(props);
  const picker=nodes(tree).find(node=>node.type==='UnifiedBindPicker');
  assert.equal(picker.props.open,true);assert.deepEqual(picker.props.modes,['order']);
  picker.props.onPick({order:orders[1]});
  nodes(tree).find(node=>node.type==='Input'&&node.props.placeholder==='Например: Ответить клиенту по рейсу').props.onChange({target:{value:'Проверить трансфер'}});
  h.render({...props,thread:{...props.thread},orders:[...orders]});h.flush();tree=h.render(props);
  assert.ok(!nodes(tree).some(node=>node.type==='Select'&&node.props.value==='two'));
  assert.equal(nodes(tree).find(node=>node.type==='UnifiedBindPicker').props.open,false);
  await tree.props.footer.props.children[1].props.onClick();
  assert.equal(h.submitted().id,'two');assert.equal(h.submitted().body.title,'Проверить трансфер');
});
test('a chat without an order does not silently assign the task to the first unrelated order', () => {
  const h=harness(),props={open:true,onClose(){},thread:{id:'chat',name:'Поставщик'},orders:[{id:'one',no:'ORD-1'}],users:[{id:'user'}]};
  h.render(props);h.flush();const tree=h.render(props);
  assert.equal(tree.props.footer.props.children[1].props.disabled,true);
});
