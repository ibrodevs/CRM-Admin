import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { toUiOrder } from '../src/modules/orders/model/orders.mapper.js';
import { orderDateOnly } from '../src/modules/orders/api/order-card.js';
const source = await readFile(new URL('../src/modules/orders/model/finance.jsx', import.meta.url), 'utf8');
const { serviceMoneyRows, moneyRowsText, ocMoney, financeSnapshot } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('order amounts keep currencies, decimals and cancelled-service exclusions', () => {
  const services = [
    { currency: 'RUB', client_total: '100.25', status: 'issued' },
    { currency: '₽', client_total: '20.10', status: 'confirmed' },
    { currency: 'USD', client_total: '3.40', status: 'issued' },
    { currency: 'RUB', client_total: '999', statusCode: 'cancelled', status: 'Отменено' },
    { currency: 'USD', client_total: '999', status: 'failed' },
  ];
  const rows = serviceMoneyRows(services);
  assert.deepEqual(rows, [{ currency: 'RUB', amount: 120.35 }, { currency: 'USD', amount: 3.4 }]);
  assert.equal(moneyRowsText(rows), '120,35 ₽ + 3,4 $');
  assert.equal(ocMoney('0.01', 'RUB'), '0,01 ₽');
  assert.equal(financeSnapshot('ORD-1', services).paidText, 'Нет данных');
});

test('order list preserves backend currency breakdown even with a different base currency', () => {
  const order = toUiOrder({ id: '1', base_currency: 'USD', total_amount: '0', totals_by_currency: [{ currency: 'RUB', amount: '2500.75' }] });
  assert.equal(moneyRowsText(order.totals, order.currency), '2 500,75 ₽');
  assert.equal(moneyRowsText([], 'USD'), '0 $');
});

test('order dates preserve the selected local day', () => {
  assert.equal(orderDateOnly(new Date(2026, 8, 10)), '2026-09-10');
  assert.equal(orderDateOnly('10.09.2026'), '2026-09-10');
});
