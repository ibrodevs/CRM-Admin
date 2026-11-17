import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import * as insurance from '../src/modules/services/insurance/insurance-search.js';
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/core');
const nodes=(node)=>Array.isArray(node)?node.flatMap(nodes):node?.props?[node,...nodes(node.props.children)]:[];
function harness(revalidateAmount = 1250) {
 let cursor=0,added,requestBody,revalidated=0;
 const values=[],deps=[],effects=[];
 const hook=(initial)=>{const i=cursor++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return[values[i],next=>{values[i]=typeof next==='function'?next(values[i]):next;}];};
 const react={...require('react'),useState:hook,useRef(initial){const i=cursor++;return values[i]||={current:initial};},useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;effects.push(fn);}}};
 const offer={id:'offer',kind:'insurance',supplier:'company',provider_adapter:'real-insurer',price:{amount:1250,currency:'RUB'},fare:{},expires_at:'2099-12-01T12:00:00Z'};
 const api={async search(body){requestBody=body;return{search_id:'search'};},async searchStatus(){return{status:'completed'};},async offers(){return{results:[offer]};},async revalidate(){revalidated++;return{offer:{...offer,price:{...offer.price,amount:revalidateAmount}}};}};
 const mod=new Module(import.meta.filename);
 mod.require=name=>name==='react'?react:name.includes('insurance-search.js')?insurance
  :name.includes('Drafts')?{useDraftState:()=>hook({countries:'Турция',start:new Date(2099,10,1),end:new Date(2099,10,5),travellers:[{birth_date:'1990-03-15'}],citizenship:'Россия',coverage:30000,coverageCurrency:'EUR',purpose:'tourism'})}
  :name.includes('suppliers/api')?{suppliersApi:{async list(){return{results:[{id:'company',name:'Страховая А'}]};}}}
  :name.includes('servicesApi')?{servicesApi:api}:name.includes('client.js')?{resultsOf:data=>data.results||data}
  :name.includes('money.js')?{resolveCurrency:value=>value||'RUB',formatMoney:(amount,currency)=>`${amount} ${currency}`}
  :name.includes('DateFields')?{DateField:'DateField',DateRangeField:'DateRangeField'}:name.includes('Overlays')?{Drawer:'Drawer'}
  :Object.fromEntries(['Button','Field','Input','Select','EmptyState'].map(name=>[name,name]))[name.split('/').at(-1).replace('.jsx','')]?{[name.split('/').at(-1).replace('.jsx','')]:name.split('/').at(-1).replace('.jsx','')}:require(name);
 mod._compile(babel.transformSync(readFileSync(new URL('../src/modules/services/insurance/InsuranceSearchPanel.jsx',import.meta.url),'utf8'),{filename:'InsuranceSearchPanel.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);
 return {render(){cursor=0;return mod.exports.InsuranceSearchPanel({currency:'RUB',addLabel:'Добавить в подборку',onAdd:async(offer,kind)=>{added={offer,kind};}});},async load(){effects.splice(0).forEach(fn=>fn());await new Promise(setImmediate);},added:()=>added,body:()=>requestBody,revalidated:()=>revalidated};
}
test('insurance prices appear only after calculation and are taken from the supplier offer',async()=>{
 const h=harness();h.render();await h.load();let tree=h.render();
 assert.ok(!nodes(tree).some(node=>node.type==='Field'&&/^Стоимость/.test(node.props.label)));
 await nodes(tree).find(node=>node.type==='Button'&&node.props.children==='Рассчитать стоимость').props.onClick();
 tree=h.render();assert.equal(h.body().kind,'insurance');assert.equal(h.added(),undefined);
 assert.ok(nodes(tree).some(node=>node.props.children==='1250 RUB'));
 await nodes(tree).find(node=>node.type==='Button'&&node.props.children==='Добавить в подборку').props.onClick();
 assert.equal(h.revalidated(),1);assert.equal(h.added().offer._backendOfferId,'offer');assert.equal(h.added().offer.cost,1250);assert.equal(h.added().kind,'Страховка');
});
test('editing the request removes previous calculated prices',async()=>{
 const h=harness();h.render();await h.load();let tree=h.render();
 await nodes(tree).find(node=>node.type==='Button'&&node.props.children==='Рассчитать стоимость').props.onClick();
 tree=h.render();nodes(tree).find(node=>node.type==='Input'&&node.props.placeholder==='Например, Турция, Грузия').props.onChange({target:{value:'Грузия'}});
 tree=h.render();assert.ok(!nodes(tree).some(node=>node.props['aria-label']==='Предложения страховых компаний'));assert.equal(h.added(),undefined);
});

test('a changed supplier price must be reviewed before the policy can be added',async()=>{
 const h=harness(1450);h.render();await h.load();let tree=h.render();
 await nodes(tree).find(node=>node.type==='Button'&&node.props.children==='Рассчитать стоимость').props.onClick();
 tree=h.render();await nodes(tree).find(node=>node.type==='Button'&&node.props.children==='Добавить в подборку').props.onClick();
 assert.equal(h.added(),undefined);
 tree=h.render();assert.ok(nodes(tree).some(node=>node.props.children==='1450 RUB'));
 await nodes(tree).find(node=>node.type==='Button'&&node.props.children==='Добавить в подборку').props.onClick();
 assert.equal(h.added().offer.cost,1450);
});
