import test from 'node:test';
import assert from 'node:assert/strict';
import { clientRegistry, filterClientRegistry } from '../src/modules/clients/model/client-registry.js';
const people = [{ id: 'person', name: 'Иванов Иван', type: 'Корпоративный', company: 'ООО Пример', status: 'Активный', phone: '+79990001122' }];
const companies = [{ id: 'company', name: 'Пример', fullName: 'ООО Пример', inn: '1234567890', status: 'Действующий', turnover: { RUB: '1200' }, metrics: { debt: { RUB: '500' } } }];
test('corporate contact remains a person while the legal entity has its own source and metrics', () => {
  const rows = clientRegistry(people, companies);
  assert.deepEqual(filterClientRegistry(rows, { type: 'individual' }).map((r) => r.id), ['person']);
  const legal = filterClientRegistry(rows, { type: 'legal' });
  assert.deepEqual(legal.map((r) => r.id), ['company']);
  assert.equal(legal[0].type, 'Юрлицо');
  assert.deepEqual(legal[0].spent, { RUB: '1200' });
  assert.deepEqual(legal[0].debt, { RUB: '500' });
  assert.equal(companies[0].status, 'Действующий');
});
test('entity type, normalized status and search apply together and clearing type restores both sources', () => {
  const rows = clientRegistry(people, companies);
  assert.equal(filterClientRegistry(rows, { type: 'legal', status: 'Активный', query: '1234567890' }).length, 1);
  assert.equal(filterClientRegistry(rows, { type: 'legal', status: 'VIP' }).length, 0);
  assert.equal(filterClientRegistry(rows, { type: 'individual', query: '1234567890' }).length, 0);
  assert.equal(filterClientRegistry(rows, { query: 'пример' }).length, 2);
});
