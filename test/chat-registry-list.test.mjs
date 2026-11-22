import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { chatRegistryContext, chatActivityLabel } from '../src/modules/chats/model/chat-registry.js';
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/core');
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n?.props?[n,...nodes(n.props.children)]:[];
function harness(){let cursor=0;const cells=[];const react={...require('react'),useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],v=>cells[i]=typeof v==='function'?v(cells[i]):v];},useRef(initial){const i=cursor++;return cells[i]??=( {current:initial} );},useEffect(){}};
const bindings={chatRegistryContext,chatActivityLabel,threadUnread:t=>t.unread||0,lastMessage:t=>t.last||'Сообщений пока нет',chatTypeMeta:()=>({}),orderRef:v=>v,CHAT_TYPES:[],formatDateTime:v=>v,chatServiceById(){},serviceSummary(){},...Object.fromEntries(['Icon','Avatar','ChannelBadge','Button','EmptyState','ActionMenu','SearchBox','Select'].map(n=>[n,n]))};const source=readFileSync(new URL('../src/modules/chats/ui/ChatsPage.jsx',import.meta.url),'utf8');const body=source.slice(source.indexOf('const knownOrder'),source.indexOf('function ChatsPage'));
const mod=new Module(import.meta.filename);mod.require=n=>n==='react'?react:n==='bindings'?bindings:require(n);mod._compile(babel.transformSync(`import {useState,useEffect,useRef} from 'react';import {${Object.keys(bindings)}} from 'bindings';${body};export {ChatsNav};`,{filename:'ChatsNav.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);return props=>{cursor=0;return mod.exports.ChatsNav(props);};}

test('registry progressively exposes all chats and archive actions never open the conversation',()=>{
const render=harness(),threads=Array.from({length:46},(_,i)=>({id:'c'+i,name:'Клиент '+i,order:'ORD-'+i,route:'Москва → Казань',tripDates:'20.11.2026 → 25.11.2026',last:'Проверьте бронь',unread:i===0?5:0,is_archived:i===45}));let archived,opened=0;const props={threads,search:'',mode:'byType',onSelect:()=>opened++,onArchive:(...args)=>archived=args};
let tree=nodes(render(props));const rows=()=>tree.filter(n=>n.props.className?.startsWith('chat-row '));assert.equal(rows().length,20);assert.ok(tree.some(n=>n.props['aria-label']==='Новых сообщений: 5'));
const firstArchive=tree.find(n=>n.props['aria-label']==='Архивировать чат');firstArchive.props.onClick();assert.equal(archived[1],true);assert.equal(opened,0);
const archiveContainer=tree.find(n=>n.props.className==='chat-registry-row-actions');let stopped=false;archiveContainer.props.onClick({stopPropagation(){stopped=true;}});assert.equal(stopped,true);
tree.find(n=>n.type==='Button'&&String(n.props.children).includes('Показать ещё')).props.onClick();tree=nodes(render(props));assert.equal(rows().length,40);
tree.find(n=>n.type==='Button'&&String(n.props.children).includes('Показать ещё')).props.onClick();tree=nodes(render(props));assert.equal(rows().length,45);
tree.find(n=>n.type==='Select').props.onChange({target:{value:'archive'}});tree=nodes(render(props));assert.equal(rows().length,1);tree.find(n=>n.props['aria-label']==='Вернуть чат из архива').props.onClick();assert.equal(archived[0].id,'c45');assert.equal(archived[1],false);
});
