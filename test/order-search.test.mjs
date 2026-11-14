import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesOrderSearch, orderAssignedTo } from '../src/modules/orders/model/order-search.js';

const order = { no: 'ORD-0000123456789', id: 'b8209777-6c88-4a89-86cb-184400311815', client: 'Грин Энерджи' };

test('order search accepts a full number, suffix, UUID and client name', () => {
  for (const query of [order.no, '123456789', order.id, 'грин', '  ord-0000123456789  ', 'B8209777-6C88-4A89-86CB-184400311815', '']) {
    assert.equal(matchesOrderSearch(order, query), true, query);
  }
  assert.equal(matchesOrderSearch(order, 'ORD-999'), false);
  assert.equal(matchesOrderSearch({}, 'missing'), false);
});


test('assigned-to-me shortcut respects operator IDs and uses names only for legacy rows', () => {
  const user = { id: 'one', name: 'Иванов Пётр' };
  assert.equal(orderAssignedTo({ operatorId: 'one' }, user), true);
  assert.equal(orderAssignedTo({ operatorId: 'two', operator: user.name }, user), false);
  assert.equal(orderAssignedTo({ operator: '  иванов пётр ' }, user), true);
  assert.equal(orderAssignedTo({ operatorId: 'two' }, user), false);
  assert.equal(orderAssignedTo({}, {}), false);
});
