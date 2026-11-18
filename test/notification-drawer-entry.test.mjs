import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
function load(path, activity) {
 const cells=[];let cursor=0;
 const mod=new Module(import.meta.filename);mod.require=name=>name==='react'?{...require('react'),useState:initial=>{const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],next=>{cells[i]=next;}];}}:name.endsWith('Toast.jsx')?{useToastActivity:()=>activity,ToastItem:'ToastItem'}:name.includes('Overlays')?{Drawer:'Drawer'}:name.includes('notifications/index')?{NotificationsCenter:'NotificationsCenter'}:name.includes('Button')?{Button:'Button'}:name.includes('icons')?{Icon:'Icon'}:name.includes('Sidebar')?{ProfileCard:'ProfileCard'}:name.includes('ActionMenu')?{ActionMenu:'ActionMenu'}:name.includes('workforce')?{ShiftControl:'ShiftControl'}:name.includes('labels.js')?{ROUTE_LABELS:{},SERVICE_PARENT:{},ORDER_OPS_PARENT:{}}:name.includes('permissions')?{roleHasPerm:()=>false}:name.includes('GlobalSearch')?{GlobalSearch:'GlobalSearch'}:require(name);
 mod._compile(babel.transformSync(readFileSync(new URL(path,import.meta.url),'utf8'),{filename:'test-component.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);
 return (name,props)=>{cursor=0;return mod.exports[name](props);};
}

test('topbar bell opens the drawer with an unduplicated count next to profile',()=>{
 let opened=0;const render=load('../src/application/shell/Topbar.jsx',{toasts:[{id:'notification:one'},{id:'save-one'}]});
 const tree=nodes(render('GlobalTopbar',{route:'orders',onOpenNotif:()=>opened++,unreadNotif:3,notifOpen:true}));
 const bell=tree.find(n=>n.props.className==='gtop-notifications');assert.equal(bell.props['aria-label'],'Уведомления: 4');assert.equal(bell.props['aria-expanded'],true);bell.props.onClick();assert.equal(opened,1);
 assert.ok(tree.find(n=>n.type==='ProfileCard'));
});

test('notification drawer retains center actions and local activity without floating duplicates',()=>{
 let closed=0,route,removed,orderArgs;const activity={toasts:[{id:'notification:one'},{id:'local',msg:'Сохранено',action:{route:'orders'}}],remove:id=>removed=id,clear(){},nav:value=>route=value};
 const render=load('../src/application/shell/NotificationDrawer.jsx',activity);
 const props={open:true,notifications:[{id:'one',read:false}],onClose:()=>closed++,onNavigate:value=>route=value,onOpenOrder:(...args)=>orderArgs=args};
 let tree=render('NotificationDrawer',props),all=nodes(tree);
 assert.equal(tree.type,'Drawer');assert.equal(tree.props.open,true);
 all.find(n=>n.type==='NotificationsCenter').props.onNavigate('chats');assert.equal(closed,1);assert.equal(route,'chats');
 const order={id:'order'};all.find(n=>n.type==='NotificationsCenter').props.onOpenOrder(order,'services','flight');assert.deepEqual(orderArgs,[order,'services','flight']);assert.equal(closed,2);
 all.find(n=>n.props.role==='tab'&&Array.isArray(n.props.children)&&n.props.children[0]==='Результаты действий').props.onClick();tree=render('NotificationDrawer',props);all=nodes(tree);
 const items=all.filter(n=>n.type==='ToastItem');assert.equal(items.length,1);assert.equal(items[0].props.t.id,'local');assert.equal(items[0].props.paused,true);
 items[0].props.onClose('local');assert.equal(removed,'local');items[0].props.onAction();assert.equal(closed,3);
});
