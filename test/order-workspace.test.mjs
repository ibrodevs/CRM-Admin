import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_SECTIONS, canonicalOrderSection } from '../src/modules/orders/model/workspace.js';
import { participantsForService, validateManualQuote } from '../src/modules/returns/model/request-context.js';
import { serviceSummary, serviceDetailRows } from '../src/modules/orders/model/service-summary.js';

test('every named order section is routable and unknown sections return to services', () => {
  for (const key of Object.keys(ORDER_SECTIONS)) assert.equal(canonicalOrderSection(key),key);
  for (const key of ['main','services','missing',null]) assert.equal(canonicalOrderSection(key),'main');
  assert.equal(ORDER_SECTIONS.aftersale.title,'Возвраты и обмены');
});
test('an operation selects passengers from its service, preserving their identities', () => {
  const pax=[{id:'1',name:'Иванов'},{serverId:'2',name:'Петров'}];
  assert.deepEqual(participantsForService(pax,{participantIds:['2']}),[pax[1]]);
  assert.deepEqual(participantsForService(pax,{passengers:['Иванов']}),[pax[0]]);
  assert.deepEqual(participantsForService(pax,null),[]);
});
test('manual quotes distinguish unknown amounts from explicit zero penalties', () => {
  assert.equal(validateManualQuote({paid:100,penalty:'',fee:0}),false);
  assert.equal(validateManualQuote({paid:100,penalty:0,fee:0}),true);
  assert.equal(validateManualQuote({paid:100,penalty:-1,fee:0}),false);
  assert.equal(validateManualQuote({paid:100,penalty:0,fee:0,difference:-25},true),true);
});
test('rail and transfer summaries preserve the itinerary and localized labels', () => {
  const rail={kind:'ЖД',title:'Поезд',itinerary:{origin:'Москва',destination:'Казань',departure:'2026-11-01T22:00',arrival:'2026-11-02T08:00',train_number:'002'}};
  assert.equal(serviceSummary(rail).title,'Москва → Казань');
  assert.equal(serviceSummary(rail).dates,'01.11.2026 • 22:00 → 02.11.2026 • 08:00');
  assert.ok(serviceDetailRows(rail).some((field)=>field.label==='Номер поезда'&&field.value==='002'));
  const transfer={kind:'Трансфер',title:'Минивэн',itinerary:{origin:'Москва',destination:'Шереметьево',car_class:'Минивэн',capacity:6}};
  assert.equal(serviceSummary(transfer).title,'Москва → Шереметьево');
  assert.ok(serviceDetailRows(transfer).some((field)=>field.label==='Пассажиров в автомобиле'&&field.value==='6'));
});
