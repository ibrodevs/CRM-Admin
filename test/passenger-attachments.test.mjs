import test from 'node:test';
import assert from 'node:assert/strict';
import { passengerAttachments, passengerAttachmentLabel } from '../src/modules/orders/model/passenger-attachments.js';
import { serviceBookingReference } from '../src/modules/orders/model/service-summary.js';

test('passenger row includes tickets, certificates, and other files assigned to this passenger', () => {
  const docs=[{id:1,person:'p1',kind:'ticket'},{id:2,person:'p1',kind:'certificate'},{id:3,person:'p1',kind:'other'},{id:4,person:'p2',kind:'ticket'},{id:5,person:null},{id:6,person:'p1',status:'void'}];
  assert.deepEqual(passengerAttachments(docs,{person:'p1'}).map((d)=>d.id),[1,2,3]);
  assert.deepEqual(passengerAttachments(docs,{name:'Guest'}),[]);
});
test('guest files use explicit participant identity', () => {
  const docs=[{id:1,metadata:{participant_id:7}},{id:2,metadata:{participant_id:8}},{id:3}];
  assert.deepEqual(passengerAttachments(docs,{serverId:'7'}).map((d)=>d.id),[1]);
});
test('attachment labels reflect file type and number or original filename', () => {
  assert.equal(passengerAttachmentLabel({kind:'ticket',document_number:'2502119686509'}),'Билет 2502119686509');
  assert.equal(passengerAttachmentLabel({kind:'certificate',document_number:'CERT-1'}),'Справка CERT-1');
  assert.equal(passengerAttachmentLabel({kind:'other',title:'Подтверждение.pdf'}),'Подтверждение.pdf');
});
test('booking reference is taken from each service without borrowing another service reference', () => {
  assert.equal(serviceBookingReference({booking_reference:'WZAG56/01'}),'WZAG56/01');
  assert.equal(serviceBookingReference({external_id:'HOTEL-2'}),'HOTEL-2');
  assert.equal(serviceBookingReference({hotel_details:{booking:{reference_number:'AA-3'}}}),'AA-3');
  assert.equal(serviceBookingReference({id:'crm-service-id'}),'');
});
