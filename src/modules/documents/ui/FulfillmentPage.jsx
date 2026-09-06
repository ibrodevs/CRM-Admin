import { useState, useEffect } from 'react';
import { Icon } from '../../../shared/icons/index';
import { Button, EmptyState, useToast } from '../../../shared/ui/index';
import { Topbar } from '../../../application/shell/AppShell';
import { toUiOrder } from '../../../legacy/adapters/ui-adapters';
import { financeApi, ordersApi } from '../../../legacy/compatibility/resources';
import { resultsOf } from '../../../shared/api/client';
import { fUsd } from '../../../shared/lib/money.js';

function buildFulfillmentRows({ obligations = [], orders = [], documents = [], returns = [] }) {
  const paymentRows = obligations
    .filter((item) => ['open', 'partial'].includes(item.status) && Number(item.outstanding || 0) > 0)
    .map((item) => {
      const order = orders.find((entry) => entry.id === item.order);
      const overdue = Boolean(item.due_date && new Date(`${item.due_date}T23:59:59`) < new Date());
      return {
        id: `payment-${item.id}`,
        cat: overdue ? 'overdue' : 'payment',
        orderId: item.order || null,
        order: order?.no || item.order_number || String(item.order || '').slice(0, 8),
        client: item.client_name || item.supplier_name || order?.client || 'Контрагент',
        detail: item.direction === 'supplier_payable' ? 'Оплатить поставщику' : 'Получить оплату от клиента',
        amount: fUsd(Number(item.outstanding || 0), item.currency),
        due: item.due_date ? item.due_date.split('-').reverse().join('.') : '—',
        resp: order?.operator || 'Не назначен',
        overdue,
      };
    });

  const documentedOrderIds = new Set(documents.map((item) => item.orderId).filter(Boolean).map(String));
  const documentRows = orders
    .filter((order) => order.services > 0 && !documentedOrderIds.has(String(order.id)))
    .map((order) => ({
      id: `documents-${order.id}`,
      cat: 'docs',
      orderId: order.id,
      order: order.no,
      client: order.client,
      detail: 'Подготовить документы по услугам',
      amount: fUsd(order.sum || 0, order.currency),
      due: order.planned_start ? String(order.planned_start).split('-').reverse().join('.') : '—',
      resp: order.operator || 'Не назначен',
      overdue: false,
    }));

  const terminalReturnStatuses = new Set(['completed', 'cancelled', 'rejected']);
  const returnRows = returns
    .filter((item) => !terminalReturnStatuses.has(item.statusCode || item.status))
    .map((item) => {
      const orderId = item.orderId || null;
      const order = orders.find((entry) => entry.id === orderId || entry.no === item.order);
      return {
        id: `return-${item.serverId || item.id || item.no}`,
        cat: 'return',
        orderId,
        order: order?.no || item.order || String(orderId || '').slice(0, 8),
        client: order?.client || item.client || 'Клиент',
        detail: item.reason || item.type || 'Возврат в обработке',
        amount: fUsd(Number(item.fin?.refund ?? item.refund_amount ?? item.client_refund ?? 0), item.currency || 'USD'),
        due: item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : '—',
        resp: item.resp || order?.operator || 'Не назначен',
        overdue: false,
      };
    });

  return [...paymentRows, ...documentRows, ...returnRows];
}

function FulfillmentRegistry({ onOpenOrder, rows = [], orders = [] }) {
  const toast = useToast();
  const [cat, setCat] = useState('payment');
  const [opening, setOpening] = useState(null);
  const CATS = [
    { key: 'payment', label: 'Требуют оплаты', icon: 'finance' },
    { key: 'docs', label: 'Нет документов', icon: 'docs' },
    { key: 'overdue', label: 'Просрочено', icon: 'clock' },
    { key: 'return', label: 'Возвраты в обработке', icon: 'refund' },
  ];
  const shownRows = rows.filter((r) => r.cat === cat);
  const goOrder = async (row) => {
    const found = orders.find((order) => String(order.id) === String(row.orderId) || String(order.no) === String(row.order));
    if (found) { onOpenOrder(found); return; }
    if (!row.orderId) { toast('Связанный заказ не найден или недоступен', 'warn'); return; }
    setOpening(row.id);
    try {
      const saved = await ordersApi.detail(row.orderId);
      onOpenOrder(toUiOrder(saved));
    } catch (error) {
      toast(error.message || 'Не удалось открыть связанный заказ', 'err');
    } finally { setOpening(null); }
  };

  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {CATS.map((c) => {
          const n = rows.filter((r) => r.cat === c.key).length;
          const overdue = c.key === 'overdue' || rows.some((r) => r.cat === c.key && r.overdue);
          return (
            <div key={c.key} className="stat-card" style={{ cursor: 'pointer', borderColor: cat === c.key ? 'var(--blue)' : 'var(--line)', boxShadow: cat === c.key ? '0 0 0 3px var(--blue-soft)' : 'var(--shadow-card)' }} onClick={() => setCat(c.key)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Icon name={c.icon} style={{ width: 18, height: 18, color: cat === c.key ? 'var(--blue)' : 'var(--muted-2)' }} /><span className="s-label" style={{ margin: 0 }}>{c.label}</span></div>
              <div className="s-value" style={c.key === 'overdue' && n ? { color: 'var(--red)' } : null}>{n}</div>
            </div>
          );
        })}
      </div>

      <div className="table-card">
        {shownRows.length ? (
          <table className="tbl">
            <thead><tr><th>Заказ</th><th>Клиент</th><th>Действие</th><th>Сумма</th><th>Срок</th><th>Ответственный</th><th></th></tr></thead>
            <tbody>
              {shownRows.map((r) => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => goOrder(r)}>
                  <td><span style={{ color: 'var(--blue)', fontWeight: 700 }}>№ {r.order}</span></td>
                  <td className="t-strong">{r.client}</td>
                  <td>{r.detail}</td>
                  <td className="t-strong">{r.amount}</td>
                  <td><span style={r.overdue ? { color: 'var(--red)', fontWeight: 600 } : null}>{r.due}</span></td>
                  <td>{r.resp}</td>
                  <td onClick={(e) => e.stopPropagation()}><Button variant="secondary" size="sm" iconRight="chevRight" disabled={opening === r.id} onClick={() => goOrder(r)}>{opening === r.id ? 'Открываем…' : 'В заказ'}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="checkCircle" title="Здесь чисто" sub="Нет задач в этой категории" />}
      </div>
    </div>
  );
}

function FulfillmentPage({ onOpenOrder, orders = [], documents = [], returns = [] }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    financeApi.obligations({}, controller.signal).then((payload) => {
      setRows(buildFulfillmentRows({ obligations: resultsOf(payload), orders, documents, returns }));
    }).catch((error) => { if (error.name !== 'AbortError') { setRows([]); toast(error.message || 'Не удалось загрузить очередь оформления', 'err'); } });
    return () => controller.abort();
  }, [documents, orders, returns, toast]);
  return (<><Topbar title="Оформление" /><div className="content"><FulfillmentRegistry onOpenOrder={onOpenOrder} rows={rows} orders={orders} /></div></>);
}

export { buildFulfillmentRows, FulfillmentRegistry, FulfillmentPage };
