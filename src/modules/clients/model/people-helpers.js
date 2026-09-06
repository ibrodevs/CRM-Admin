import { ORDERS } from '../../../legacy/data/index';

function pUsd(n) { return Math.round(n).toLocaleString('ru-RU') + ' $'; }

function ordersOf(name) { return ORDERS.filter((o) => o.client === name); }

function orderDate(order) {
  if (order?.date) return order.date;
  const raw = order?.created_at || order?.createdOn;
  if (!raw) return '—';
  const parsed = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('ru-RU');
}

export { pUsd, ordersOf, orderDate };
