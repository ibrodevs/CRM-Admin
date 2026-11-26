import test from 'node:test';
import assert from 'node:assert/strict';
import { proposalSearchPlan, autoProposalOption } from '../src/modules/proposals/model/auto-search.js';
import { compositionRows } from '../src/modules/proposals/model/workspace-presentation.js';
import { draftCategory, filterDrafts } from '../src/shared/drafts/workspaces.js';
import { receiptDashboardDrafts, RECEIPT_IMPORT_DRAFTS_KEY } from '../src/modules/receipts/model/import-drafts.js';
const trip = { route:'Москва → Стамбул', travel_start:'2026-12-10', travel_end:'2026-12-12', currency:'RUB', groups:[{kind:'avia',options:[]},{kind:'hotel',options:[]},{kind:'insurance',options:[]}] };
test('automatic proposal search uses chosen services, all-airports city codes and explicit preferences', () => {
  const plan=proposalSearchPlan(trip,{adults:3,cabin:'business',direct:true,airlines:'TK, SU',meal:'HB'});
  assert.equal(plan.length,3);
  assert.equal(plan[0].criteria.origin,'MOW');
  assert.equal(plan[0].criteria.destination,'IST');
  assert.equal(plan[0].criteria.adults,3);
  assert.equal(plan[0].criteria.direct_only,true);
  assert.deepEqual(plan[0].criteria.preferred_airlines,['TK','SU']);
  assert.equal(plan[1].criteria.check_out,trip.travel_end);
  assert.equal(plan[1].criteria.guests,3);
  assert.equal(plan[1].criteria.meal_plan,'HB');
  assert.ok(plan[2].error); // Manual insurance prices cannot be fabricated.
  for(const adults of [0,-1,1.5,'abc',51]) assert.throws(()=>proposalSearchPlan(trip,{adults}));
  assert.throws(()=>proposalSearchPlan({...trip,travel_end:''}));
  assert.throws(()=>proposalSearchPlan({...trip,groups:[]}));
});
test('compact composition removes phantom rows and distinguishes free and unknown prices', () => {
  const rows=compositionRows([{id:'blank',kind:'avia',title:'',price:0},{id:'real',kind:'avia',offer:'offer-1',title:'Москва → Стамбул',description:'2026-12-10T12:30:00 → 2026-12-12T15:00:00',price:''},{id:'free',kind:'transfer',title:'Трансфер',price:0}]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].hasPrice,false);
  assert.equal(rows[1].hasPrice,true);
  assert.equal(rows[0].brief,'10.12.2026 — 12.12.2026');
  assert.match(rows[0].description,/10\.12\.2026 12:30/);
});
test('provider offer selection keeps binding and price; draft filters include receipt imports', () => {
  const option=autoProposalOption({id:'supplier-offer',kind:'hotel',price:{amount:'900',currency:'RUB'},itinerary:{property_name:'Отель',check_in:'2026-12-10'}});
  assert.equal(option.offer,'supplier-offer');assert.equal(option.cost,900);
  const open=[];const storage={getItem:key=>key===RECEIPT_IMPORT_DRAFTS_KEY?JSON.stringify({version:2,drafts:[{id:'receipt-test',savedAt:'2026-11-26T10:00:00Z',files:[{name:'test.pdf'}]}]}):null};
  const entries=receiptDashboardDrafts([],storage,value=>open.push(value));
  assert.equal(entries.length,1);assert.equal(draftCategory(entries[0]),'receipts');
  assert.equal(filterDrafts(entries,{category:'proposals'}).length,0);
  entries[0].onContinue();assert.deepEqual(open,[{importId:'receipt-test'}]);
});

test('late registry refresh never reopens an editor closed after saving', async () => {
  const { readFileSync } = await import('node:fs');
  const { createRequire, Module } = await import('node:module');
  const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
  const source = readFileSync(new URL('../src/modules/proposals/ui/OffersPage.jsx',import.meta.url),'utf8');
  const ast = babel.parseSync(source,{filename:'OffersPage.jsx',presets:['next/babel'],configFile:false,babelrc:false});
  let callback;
  const visit = node => {if(!node||typeof node!=='object')return;if(node.type==='JSXOpeningElement'&&node.name?.name==='StandaloneKPEditor') callback=node.attributes.find(a=>a.name?.name==='onSaved')?.value.expression;for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);};
  visit(ast);assert.ok(callback);
  let resolve;const pending=new Promise(r=>resolve=r);let current={serverId:'kp-1'};let registry=[];
  const bindings={editTarget:current,orders:[],proposalsApi:{detail:()=>pending},toLegacyProposal:v=>v,setProposals:fn=>{registry=fn([{serverId:'kp-1'}]);},setEditTarget:fn=>{current=typeof fn==='function'?fn(current):fn;},onChanged:()=>{}};
  const mod=new Module(import.meta.filename);mod.require=name=>name==='bindings'?bindings:require(name);
  mod._compile(babel.transformSync(`import {${Object.keys(bindings)}} from 'bindings'; export const refresh=${source.slice(callback.start,callback.end)};`,{filename:'refresh.js',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);
  const refreshing=mod.exports.refresh();current=null;resolve({serverId:'kp-1',title:'Saved'});await refreshing;
  assert.equal(current,null);assert.equal(registry[0].title,'Saved');
});
