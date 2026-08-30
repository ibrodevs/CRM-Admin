import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const orderCard = await readFile(new URL('../js/page_order_card.jsx', import.meta.url), 'utf8');
const services = await readFile(new URL('../js/page_services.jsx', import.meta.url), 'utf8');
const adapters = await readFile(new URL('../js/api/legacy-adapters.js', import.meta.url), 'utf8');
const finance = await readFile(new URL('../js/features/orders/finance.jsx', import.meta.url), 'utf8');

test('order finance keeps the backend currency and never converts RUB totals to USD', () => {
  assert.match(orderCard, /const currency = orderFinanceCurrency\(summary, order, services\)/);
  assert.match(orderCard, /financeRowsTotal\(summary\.services_total, currency\)/);
  assert.match(orderCard, /const money = \(amount\) => ocMoney\(amount, currency\)/);
  assert.doesNotMatch(orderCard, /t \/ 90/);
  assert.doesNotMatch(orderCard, /typeof f\$ === 'function'/);
  assert.match(orderCard, /const \{ total, currency, confirmedSvc, awaitingSvc, actionSvc \} = serviceTotals\(services\)/);
  assert.match(orderCard, /ocMoney\(total, currency\)/);
});

test('an order service currency wins over an offer fallback in the service card', () => {
  assert.match(orderCard, /currency: s\.currency \|\| s\.svcOffer\.currency \|\| 'RUB'/);
  assert.match(orderCard, /const currency = s\.currency \|\| s\.svcOffer\?\.currency/);
  assert.match(services, /normalizeCurrency\(item\.currency \|\| \(item\.svcOffer && item\.svcOffer\.currency\) \|\| 'RUB'\)/);
  assert.match(services, /const fmt = \(n\) => ocMoney\(n, cur\)/);
});

test('missing legacy service currency defaults to RUB', () => {
  assert.match(adapters, /currency: item\.currency \|\| 'RUB'/);
  assert.match(finance, /function normalizeCurrency\(currency, fallback = 'RUB'\)/);
  assert.match(finance, /if \(\['RUB', 'RUR', '₽', 'РУБ'\]\.includes\(code\)\) return 'RUB'/);
});
