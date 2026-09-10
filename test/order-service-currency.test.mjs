import assert from 'node:assert/strict';
import { readFile } from './helpers/source.mjs';
import test from 'node:test';

const orderCard = await readFile(new URL('../src/modules/orders/ui/OrderCard.jsx', import.meta.url), 'utf8');
const services = await readFile(new URL('../src/modules/services/ui/ServicesPage.jsx', import.meta.url), 'utf8');
const adapters = await readFile(new URL('../src/legacy/adapters/legacy-adapters.js', import.meta.url), 'utf8');
const finance = await readFile(new URL('../src/modules/orders/model/finance.jsx', import.meta.url), 'utf8');
const money = await readFile(new URL('../src/shared/lib/money.js', import.meta.url), 'utf8');

test('order finance keeps the backend currency and never converts RUB totals to USD', () => {
  assert.match(orderCard, /const currency = selectedCurrency \|\| orderFinanceCurrency\(summary, order, services\)/);
  assert.match(orderCard, /financeRowsTotal\(summary\.services_total, currency\)/);
  assert.match(orderCard, /const money = \(amount\) => ocMoney\(amount, currency\)/);
  assert.doesNotMatch(orderCard, /t \/ 90/);
  assert.doesNotMatch(orderCard, /typeof f\$ === 'function'/);
  assert.match(orderCard, /const \{ total, currency \} = serviceTotals\(services\)/);
  assert.match(orderCard, /moneyRowsText\(serviceMoneyRows\(services/);
});

test('an order service currency wins over an offer fallback in the service card', () => {
  assert.match(orderCard, /const cardCurrency = resolveCurrency\(s\.currency, s\.svcOffer\?\.currency\)/);
  assert.match(orderCard, /currency: cardCurrency/);
  assert.match(services, /normalizeCurrency\(resolveCurrency\(item\.currency, item\.svcOffer && item\.svcOffer\.currency\)\)/);
  assert.match(services, /const fmt = \(n\) => ocMoney\(n, cur\)/);
});

// Своей валюты у услуги может не быть. Раньше в таких местах стоял жёсткий
// фолбэк (где-то 'RUB', где-то 'USD'), из-за чего на разных экранах
// показывались разные валюты. Теперь единый источник — валюта по умолчанию
// из настроек пользователя.
test('missing service currency falls back to the user preference, not a hardcoded code', () => {
  assert.match(adapters, /currency: resolveCurrency\(item\.currency\)/);
  assert.match(finance, /function normalizeCurrency\(currency, fallback\) \{/);
  assert.match(finance, /const code = resolveCurrency\(currency, fallback\)/);
  assert.doesNotMatch(finance, /\|\| 'USD'/);
  assert.match(money, /getRuntimePreferences\(\)\.base_currency/);
  assert.match(money, /export const DEFAULT_CURRENCY|DEFAULT_CURRENCY/);
});
