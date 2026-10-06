import assert from 'node:assert/strict';
import { readFile } from './helpers/source.mjs';
import test from 'node:test';

const page = await readFile(new URL('../src/modules/orders/ui/OrdersPageEnhanced.jsx', import.meta.url), 'utf8');
const routes = await readFile(new URL('../src/application/routing/RouteRenderer.jsx', import.meta.url), 'utf8');

test('orders registry uses checkbox multi-selection instead of one active radio', () => {
  assert.match(page, /selectedIds/);
  assert.match(page, /new Set\(current\)/);
  assert.match(page, /<Checkbox on=\{checked\}/);
  assert.match(page, /<Checkbox on=\{pageAllSelected\}/);
  assert.doesNotMatch(page, /<Radio/);
});

test('selected orders expose a visible bulk-selection block and filtered select-all action', () => {
  assert.match(page, /Выбрано заказов: \{selectedCount\}/);
  assert.match(page, /Выбрать все по фильтру/);
  assert.match(page, /Снять выбор/);
  assert.match(page, /filteredAllSelected/);
});

test('bulk commercial proposal action runs for the complete selection', () => {
  assert.match(page, /Promise\.allSettled\(selectedOrders\.map\(createProposalForOrder\)\)/);
  assert.match(page, /Сформировать КП\$\{selectedCount > 1/);
});

test('orders route renders the enhanced registry', () => {
  assert.match(routes, /modules\/orders\/ui\/OrdersPageEnhanced\.jsx/);
});
