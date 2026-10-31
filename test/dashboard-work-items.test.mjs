import assert from 'node:assert/strict';
import test from 'node:test';
import { allWorkItems, filterWorkItems } from '../src/modules/dashboard/model/work-items.js';

const request = { id: 'att-0', cat: 'newreq', order: 'ORD-1', title: 'Заявка ждёт отклик', sub: 'Клиент: Иванов', right: '20 мин' };
const approval = { id: 'ap-0', cat: 'approvals', title: 'Согласование · КП-2', sub: 'АТГ' };

test('all tasks includes every category without repeating attention tasks', () => {
  const rows = allWorkItems({
    attention: [request],
    newreq: [{ ...request, id: 'req-0' }],
    deadlines: [],
    approvals: [approval],
  });
  assert.deepEqual(rows, [request, approval]);
});

test('identical tasks in a category are preserved while cross-tab copies are removed', () => {
  const second = { ...request, id: 'att-1' };
  assert.equal(allWorkItems({ attention: [request, second], newreq: [
    { ...request, id: 'req-0' }, { ...second, id: 'req-1' },
  ] }).length, 2);
});

test('full list is not limited to the five dashboard previews', () => {
  const requests = Array.from({ length: 30 }, (_, index) => ({ ...request, id: `req-${index}`, order: `ORD-${index}` }));
  assert.equal(allWorkItems({ newreq: requests }).length, 30);
});

test('task search matches client, order, title and status without case or surrounding spaces', () => {
  const rows = [request, { ...approval, badge: 'На согласовании' }];
  assert.deepEqual(filterWorkItems(rows, '  ИВАНОВ '), [request]);
  assert.deepEqual(filterWorkItems(rows, 'ord-1'), [request]);
  assert.equal(filterWorkItems(rows, 'согласовании').length, 1);
  assert.equal(filterWorkItems(rows, 'неизвестный').length, 0);
  assert.equal(filterWorkItems(rows, '  ').length, 2);
});
