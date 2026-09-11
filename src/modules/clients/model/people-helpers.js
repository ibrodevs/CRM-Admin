import { ORDERS } from '../../../legacy/data/index.jsx';
import { convertMoney, formatMoney, getDefaultCurrency } from '../../../shared/lib/money.js';

/**
 * Суммы клиента или компании. Бэкенд отдаёт их разбитыми по валютам услуг
 * ({ USD: '831.5' }), складывать разные валюты без курса нельзя.
 * Поэтому: пробуем привести всё к валюте по умолчанию по курсам организации,
 * а если курса хотя бы для одной валюты нет — показываем суммы как есть,
 * каждую со своим символом.
 */
function pUsd(n) {
  if (n && typeof n === 'object') {
    const entries = Object.entries(n).filter(([, amount]) => Number(amount));
    if (!entries.length) return formatMoney(0);
    const target = getDefaultCurrency();
    let total = 0;
    const converted = entries.every(([currency, amount]) => {
      const value = convertMoney(amount, currency, target);
      if (value === null) return false;
      total += value;
      return true;
    });
    if (converted) return formatMoney(total, target);
    return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(' · ');
  }
  return formatMoney(n);
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
