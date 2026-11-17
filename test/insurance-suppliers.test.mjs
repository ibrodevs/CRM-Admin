import test from 'node:test';
import assert from 'node:assert/strict';
import { insuranceCriteria, insuranceQuote, insuranceSelection, requestInsuranceQuotes } from '../src/modules/services/insurance/insurance-search.js';
import { hasDraftWork } from '../src/shared/drafts/workspaces.js';

const form = { countries: 'Турция, Грузия', start: new Date(2026, 11, 1), end: new Date(2026, 11, 5), travellers: [{birth_date:'1990-03-15'}], citizenship:'Россия',coverage:30000,coverageCurrency:'EUR',purpose:'tourism',currency:'RUB' };
const quote = { id:'offer',kind:'insurance',supplier:'company',provider_adapter:'real-insurer',price:{amount:'1250.50',currency:'RUB'},fare:{coverage:'30000 EUR'},itinerary:{program:'Страховка ВЗР'},expires_at:'2099-12-01T12:00:00Z' };
test('insurance request contains trip and insured data without a manually entered policy price', () => {
  const criteria=insuranceCriteria(form,new Date(2026,10,17));
  assert.deepEqual(criteria.destination_countries,['Турция','Грузия']);
  assert.equal(criteria.start_date,'2026-12-01');assert.equal(criteria.end_date,'2026-12-05');
  assert.deepEqual(criteria.travellers,[{birth_date:'1990-03-15'}]);
  assert.equal(criteria.coverage_amount,30000);assert.equal(criteria.currency,'RUB');
  assert.equal(Object.hasOwn(criteria,'cost'),false);assert.equal(Object.hasOwn(criteria,'price'),false);
  for (const patch of [{countries:''},{start:new Date(2026,0,1)},{end:new Date(2026,10,1)},{travellers:[]},{travellers:[{birth_date:'invalid'}]},{travellers:[{birth_date:'2030-01-01'}]},{citizenship:''},{coverage:0}]) assert.throws(()=>insuranceCriteria({...form,...patch},new Date(2026,10,17)));
});
test('only current supplier quotes can be selected; no missing price becomes a free policy', () => {
  assert.equal(insuranceQuote(quote).price.amount,1250.5);
  for (const patch of [{provider_adapter:'mock'},{is_manual:true},{supplier:null},{price:{currency:'RUB'}},{price:{amount:'',currency:'RUB'}},{expires_at:'2020-01-01'},{availability:'unavailable'}]) assert.equal(insuranceQuote({...quote,...patch}),null);
  const chosen=insuranceSelection(quote,insuranceCriteria(form,new Date(2026,10,17)),[{id:'company',name:'Страховая А'}]);
  assert.equal(chosen._backendOfferId,'offer');assert.equal(chosen.cost,1250.5);assert.equal(chosen.supplier,'Страховая А');assert.equal(chosen.currency,'RUB');
  assert.equal(insuranceQuote({...quote,price:{amount:0,currency:'RUB'}}).price.amount,0,'only an explicit supplier zero is accepted');
});
test('insurance calculation waits for the provider, paginates quotes and excludes test offers',async()=>{
  let request,polls=0;
  const api={async search(body){request=body;return{search_id:'search'};},async searchStatus(){return{status:++polls===1?'running':'completed'};},async offers(_id,{page}){return page===1?{count:2,next:'page2',results:[quote]}:{count:2,next:null,results:[{...quote,id:'test',provider_adapter:'mock'}]};}};
  const criteria=insuranceCriteria(form,new Date(2026,10,17));
  const offers=await requestInsuranceQuotes(api,{kind:'insurance',criteria},{pause:async()=>{}});
  assert.equal(request.kind,'insurance');assert.deepEqual(request.criteria,criteria);assert.equal(polls,2);assert.deepEqual(offers.map(row=>row.id),['offer']);
});
test('an unconfigured insurer and a cancelled calculation cannot produce a selectable price',async()=>{
  await assert.rejects(requestInsuranceQuotes({search:async()=>({search_id:'s'}),searchStatus:async()=>({status:'failed',provider_runs:[{provider_adapter:'mock',error_code:'PROVIDER_NOT_CONFIGURED'}]})},{kind:'insurance'}),/подключение страховой компании/);
  const controller=new AbortController();let cancelled=false;
  await assert.rejects(requestInsuranceQuotes({search:async()=>{controller.abort();return{search_id:'s'};},cancelSearch:async()=>{cancelled=true;}},{kind:'insurance'},{signal:controller.signal}),{name:'AbortError'});
  assert.equal(cancelled,true);
});
test('insurance input remains discoverable in saved workspaces',()=>{
  assert.equal(hasDraftWork({request:{countries:'Турция'}}),true);
  assert.equal(Boolean(hasDraftWork({request:{countries:'',travellers:[{birth_date:null}],coverage:30000,purpose:'tourism'}})),false);
});
