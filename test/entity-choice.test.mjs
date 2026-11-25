import test from 'node:test';
import assert from 'node:assert/strict';
import { entityRow, entitySelection } from '../src/modules/clients/model/entity-choice.js';
test('two people with identical names retain their own IDs', () => {
  const people = ['a','b'].map(id => entitySelection('person', entityRow('person', {id, full_name:'Иван Иванов', phone:'+79991234567'})));
  assert.equal(people[0].client, people[1].client);
  assert.notEqual(people[0].id, people[1].id);
  assert.equal(people[1].person.id, 'b');
});
test('company and order selection preserve API identity and context', () => {
  const company = entitySelection('company', entityRow('company',{id:'c',name:'ООО Тест',inn:'123'}));
  assert.equal(company.company.id, 'c');
  const order = entitySelection('order', entityRow('order',{id:'o',number:'ORD-000001',client_name:'Иван Иванов',route:'Москва → Стамбул'}));
  assert.equal(order.order.no, 'ORD-000001');
  assert.equal(order.order.client, 'Иван Иванов');
  assert.equal(order.id, 'o');
});

test('API companies with a legal name also expose the compatible display name', () => {
  const selected = entitySelection('company', entityRow('company', {id:'c',legal_name:'ООО Пример',tax_id:'123'}));
  assert.equal(selected.company.name, 'ООО Пример');
  assert.equal(selected.label, 'ООО Пример');
});
