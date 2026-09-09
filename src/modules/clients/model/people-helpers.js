import { ORDERS } from '../../../legacy/data/index.jsx';

function pUsd(n) {
  if (n && typeof n === 'object') return Object.entries(n).map(([currency, amount]) => `${Number(amount).toLocaleString('ru-RU')} ${currency}`).join(' · ') || '—';
  return Math.round(n).toLocaleString('ru-RU') + ' $';
}
function sumCurrencies(rows, field) {
  const sums = {};
  for (const row of rows) for (const [currency, amount] of Object.entries(row[field] || {})) sums[currency] = (sums[currency] || 0) + Number(amount);
  return sums;
}
function hasDebt(value) { return typeof value === 'object' ? Object.values(value || {}).some((amount) => Number(amount) > 0) : Number(value) > 0; }

function ordersOf(name) { return ORDERS.filter((o) => o.client === name); }

function orderDate(order) {
  if (order?.date) return order.date;
  const raw = order?.created_at || order?.createdOn;
  if (!raw) return '—';
  const parsed = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('ru-RU');
}

export { sumCurrencies, hasDebt, pUsd, ordersOf, orderDate };
