import test from 'node:test';
import assert from 'node:assert/strict';
import { baggageLabel, flightServiceDetails } from '../src/modules/services/flights/flight-service-details.js';

test('missing cabin and baggage remain unknown instead of inheriting order economy', () => {
  const details=flightServiceDetails({});
  assert.equal(details[0].primary.find((f)=>f.label==='Класс перелёта').value,'Не указан');
  assert.equal(details[0].primary.find((f)=>f.label==='Багаж').value,'Не указан');
  assert.deepEqual(details[0].extra,[]);
});
test('flight details preserve explicit no baggage and non-refundable conditions', () => {
  const details=flightServiceDetails({fare:{name:'Business Flex',cabin:'business',baggage:'0PC',hand_baggage:'8KG',booking_class:'C',fare_basis:'CFLEX',refundable:false,changeable:true}})[0];
  assert.equal(details.primary[0].value,'Бизнес');
  assert.equal(details.primary[1].value,'Без багажа');
  assert.equal(details.primary[2].value,'8 кг');
  assert.equal(details.primary.find((f)=>f.label==='Тариф').value,'Business Flex');
  assert.equal(details.extra.find((f)=>f.label==='Возврат').value,'Не предусмотрен тарифом');
  assert.ok(!flightServiceDetails({fare:{}})[0].extra.some((f)=>f.label==='Возврат'));
});
test('different cabin classes and baggage are displayed per segment', () => {
  const details=flightServiceDetails({},[{origin:'FRU',destination:'SVO',cabin:'economy',baggage:'1PC'}, {origin:'SVO',destination:'FRU',cabin:'business',baggage:'2PC'}]);
  assert.equal(details.length,2);
  assert.equal(details[0].route,'FRU → SVO');
  assert.equal(details[1].primary[0].value,'Бизнес');
  assert.equal(details[1].primary[1].value,'2 места');
});
test('shared conditions are shown once and legacy cancellation rules supply fare data', () => {
  const details=flightServiceDetails({cancellation_rules:{cabin:'economy',baggage:'1PC'}},[{origin:'FRU',destination:'SVO'},{origin:'SVO',destination:'FRU'}]);
  assert.equal(details.length,1);
  assert.equal(details[0].route,'');
  assert.equal(details[0].primary[1].value,'1 место');
  assert.equal(baggageLabel({pieces:1,weight:23}),'1 место · 23 кг');
});

test('structured zero baggage and missing provider markers are not positive allowances', () => {
  for (const value of [{pieces:0}, {weight:0}, {pieces:0,weight:0}, '0 KG', 'false']) assert.equal(baggageLabel(value), 'Без багажа');
  for (const value of ['—', '-', 'N/A', 'unknown', {}]) assert.equal(baggageLabel(value), '');
  assert.equal(baggageLabel(true), 'Включено');
  assert.equal(baggageLabel({pieces:1,weight:23}), '1 место · 23 кг');
  assert.equal(baggageLabel('21PC'), '21 место');
});

test('provider quantity and unit remain together without inventing a weight', () => {
  assert.equal(baggageLabel({type:'PC',value:1}), '1 место');
  assert.equal(baggageLabel({type:'KG',value:23}), '23 кг');
  assert.equal(baggageLabel({type:'PC',value:0}), 'Без багажа');
  assert.equal(baggageLabel('PC'), 'Норма не передана');
});
