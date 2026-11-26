import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require=createRequire(import.meta.url), babel=require('next/dist/compiled/babel/core');
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n?.props?[n,...nodes(n.props.children)]:[];
function mount() {
  const state=[],deps=[],effects=[],calls=[];let cursor=0,props={proposalId:'p',draft:{route:'Москва → Стамбул',travel_start:'2026-12-10',travel_end:'2026-12-12',currency:'RUB',groups:[{kind:'avia'}]},companyId:null,onAdd:item=>calls.push(item),onClose(){}};
  const useState=initial=>{const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];};
  const useRef=initial=>useState({current:initial})[0];
  const useEffect=(fn,values)=>{const i=cursor++;if(!deps[i]||values.some((v,j)=>v!==deps[i][j])){deps[i]=values;effects.push(fn);}};
  const bindings={useState,useRef,useEffect,useDraftState:(_s,_k,i)=>useState(i),apiPath:p=>p,apiRequest:async()=>({results:[]}),resultsOf:v=>v.results||[],servicesApi:{search:async()=>({search_id:'s'}),searchStatus:async()=>({status:'complete'}),offers:async()=>({results:[{id:'o',kind:'avia',price:{currency:'RUB',amount:'100'}}]})},proposalSearchPlan:()=>[{kind:'avia',criteria:{}}],autoProposalOption:o=>({title:'Москва → Стамбул',...o}),KP_KINDS:{avia:'Авиа'},kpMoney:a=>a,readableServiceTitle:v=>v,...Object.fromEntries(['Drawer','Button','Field','Input','Select'].map(v=>[v,v]))};
  const source=readFileSync(new URL('../src/modules/proposals/ui/ProposalAutoSearch.jsx',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  const mod=new Module(import.meta.filename);mod.require=n=>n==='bindings'?bindings:require(n);
  mod._compile(babel.transformSync(`import React from 'react';import {${Object.keys(bindings)}} from 'bindings';${source}`,{filename:'auto.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);
  const render=next=>{props={...props,...next};cursor=0;const tree=mod.exports.ProposalAutoSearch(props);effects.splice(0).forEach(fn=>fn());return tree;};
  render();render();
  return{render,calls,run:async()=>{const tree=render();await nodes(tree.props.footer).filter(n=>n.type==='Button').at(-1).props.onClick();},rows:()=>nodes(render()).filter(n=>n.props.className==='kp-section kp-auto-offer')};
}
test('changing preferences removes old quotes before they can be added under the new criteria',async()=>{
 const h=mount();await h.run();assert.equal(h.rows().length,1);
 nodes(h.render()).find(n=>n.type==='Input'&&n.props.type==='number').props.onChange({target:{value:'2'}});
 h.render();assert.equal(h.rows().length,0);
});
test('switching the recipient company invalidates prior search results and reloads policies',async()=>{
 const h=mount();await h.run();assert.equal(h.rows().length,1);
 h.render({companyId:'another-company'});assert.equal(h.rows().length,0);
 await Promise.resolve();h.render();assert.equal(h.rows().length,0);
});
