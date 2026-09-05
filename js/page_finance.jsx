import { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon } from './icons';
import { Button, Drawer, EmptyState, Field, FilterChip, Input, Pill, SearchBox, Select, Tabs, useToast } from './ui';
import { SERVICE_KIND } from './data';
import { UFDateField } from './forms_unified';
import { Topbar } from './layout';
import { financeApi } from './api/resources';
import { resultsOf } from './api/client';
import { f$, FIN_ACCT_GROUPS, FIN_PAY_STATUS } from './data/finance';

const financeDate = (value) => {
  if (!value) return '—';
  const day = String(value).slice(0, 10);
  const parts = day.split('-');
  return parts.length === 3 ? parts.reverse().join('.') : new Date(value).toLocaleDateString('ru-RU');
};
const financeMoney = (value, currency = 'USD') => {
  const code = String(currency || 'USD').toUpperCase();
  const symbol = { USD: '$', EUR: '€', RUB: '₽', KGS: 'сом', KZT: '₸' }[code] || code;
  return `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${symbol}`;
};
const saveFinanceBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const financeStatus = { draft: 'Черновик', pending: 'На согласовании', confirmed: 'Исполнено', failed: 'Отклонено', cancelled: 'Отменено' };
const SERVICE_KIND_LABELS = {
  avia: 'Авиа',
  rail: 'ЖД',
  hotel: 'Гостиница',
  transfer: 'Трансфер',
  bus: 'Автобус',
  tour: 'Тур',
  aeroexpress: 'Аэроэкспресс',
  lounge: 'Бизнес-зал',
  insurance: 'Страхование',
  visa: 'Виза',
  other: 'Прочее',
};
const DEFAULT_RECON_SERVICE_KINDS = ['avia', 'rail', 'hotel', 'transfer', 'bus', 'tour', 'aeroexpress', 'lounge', 'insurance', 'visa', 'other'];
const reconServiceKindLabel = (kind) => SERVICE_KIND_LABELS[kind] || kind;
const reconServiceKindOptions = (meta) => {
  const kinds = Array.isArray(meta?.enums?.service_kinds) && meta.enums.service_kinds.length
    ? meta.enums.service_kinds
    : DEFAULT_RECON_SERVICE_KINDS;
  return kinds.map(reconServiceKindLabel);
};
const financeAccountRow = (account) => ({
  ...account,
  group: { bank: 'Расчётные счета', cash: 'Касса', deposit: 'Депозиты' }[account.kind] || 'Расчётные счета',
  bank: account.company_name || account.supplier_name || '—',
  number: account.code,
  balance: Number(account.balance || 0),
});
const financePaymentRow = (payment) => {
  const party = payment.supplier_name || payment.payer_company_name || payment.payer_person_name || 'Контрагент';
  const status = financeStatus[payment.status] || payment.status || 'Черновик';
  const date = financeDate(payment.created_at);
  return {
    ...payment,
    no: `PMT-${String(payment.id || '').slice(0, 8).toUpperCase()}`,
    dir: payment.direction === 'incoming' ? 'in' : 'out',
    date,
    party,
    sum: Number(payment.amount || 0),
    purpose: payment.comment || '—',
    orderId: payment.order || null,
    order: payment.order_number || null,
    status,
  };
};
const financeAllocationsForPayment = (payment, obligations = []) => {
  if (!payment.orderId) return [];
  const direction = payment.dir === 'in' ? 'client_receivable' : 'supplier_payable';
  let remaining = Number(payment.sum || 0);
  return obligations
    .filter((obligation) => String(obligation.order) === String(payment.orderId)
      && obligation.direction === direction
      && ['open', 'partial'].includes(obligation.status)
      && Number(obligation.outstanding || 0) > 0
      && (!payment.currency || obligation.currency === payment.currency))
    .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')))
    .map((obligation) => {
      if (remaining <= 0) return null;
      const amount = Math.min(remaining, Number(obligation.outstanding || 0));
      remaining -= amount;
      return { obligation: obligation.id, amount: amount.toFixed(2) };
    })
    .filter(Boolean);
};
const financeReceiptRow = (obligation) => {
  const due = financeDate(obligation.due_date);
  const overdue = Boolean(obligation.due_date && new Date(`${obligation.due_date}T23:59:59`) < new Date() && ['open', 'partial'].includes(obligation.status));
  return {
    date: due,
    party: obligation.client_name || `Заказ ${obligation.order_number || '—'}`,
    basis: `Заказ № ${obligation.order_number || '—'}`,
    resp: 'Backend',
    sum: Number(obligation.outstanding || 0),
    currency: obligation.currency || 'USD',
    overdue,
  };
};
const financeCounterpartyRow = (obligation) => {
  const supplier = ['supplier_payable', 'supplier_refund'].includes(obligation.direction);
  const amount = Number(obligation.original_amount || 0);
  const paid = Number(obligation.paid_amount || 0);
  const rest = Number(obligation.outstanding || 0);
  const dueRaw = obligation.due_date;
  const dueDate = dueRaw ? new Date(`${dueRaw}T23:59:59`) : null;
  const overdueDays = dueDate && dueDate < new Date() && ['open', 'partial'].includes(obligation.status)
    ? Math.max(1, Math.ceil((Date.now() - dueDate.getTime()) / 86400000)) : 0;
  const order = obligation.order_number || String(obligation.order || '').slice(0, 8);
  const name = supplier ? (obligation.supplier_name || `Поставщик · заказ ${order}`) : (obligation.client_name || `Клиент · заказ ${order}`);
  const status = obligation.status === 'settled' ? 'Оплачено' : overdueDays ? 'Просрочено' : 'Ожидает оплаты';
  const item = { id: obligation.id, order, doc: `Обязательство ${String(obligation.id || '').slice(0, 8)}`, kind: obligation.service_kind || 'Прочее', currency: obligation.currency || 'USD', sum: amount, paid, rest, since: financeDate(obligation.created_at), due: financeDate(dueRaw), daysToDue: overdueDays ? -overdueDays : 0, overdueDays, status };
  return {
    id: obligation.id,
    type: supplier ? 'supplier' : 'client',
    name,
    legal: name,
    scheme: supplier ? 'Постоплата' : 'По договору',
    deferralDays: 0,
    deferralStart: 'от даты документа',
    limit: 0,
    used: rest,
    currency: obligation.currency || 'USD',
    guaranteeLetter: false,
    approveOnExceed: false,
    debt: rest,
    paid,
    balance: rest,
    invoices: [item.doc],
    acts: [],
    orders: [order],
    obligations: [item],
    payHistory: paid ? [{ t: financeDate(obligation.created_at), text: `Оплачено ${financeMoney(paid, obligation.currency)}` }] : [],
    discipline: { avgPayDays: 0, avgOverdue: overdueDays, maxOverdue: overdueDays, overdueSum: overdueDays ? rest : 0, onTimePct: overdueDays ? 50 : 100, rating: overdueDays ? 'C' : 'A' },
  };
};

const financeCounterpartyRows = (obligations = []) => {
  const grouped = new Map();
  obligations.filter((item) => ['client_receivable', 'supplier_payable'].includes(item.direction)).forEach((obligation) => {
    const row = financeCounterpartyRow(obligation);
    const key = `${row.type}|${row.name}|${row.currency}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, row);
      return;
    }
    current.debt += row.debt;
    current.paid += row.paid;
    current.balance += row.balance;
    current.used += row.used;
    current.obligations.push(...row.obligations);
    current.payHistory.push(...row.payHistory);
    current.orders = [...new Set([...current.orders, ...row.orders])];
    current.invoices = [...current.invoices, ...row.invoices];
  });
  return [...grouped.values()];
};

function StatTile({ label, value, tone, sub, icon, onClick, accent }) {
  return (
    <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default', padding: '18px 20px', borderColor: accent || 'var(--line)' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon && <Icon name={icon} style={{ width: 15, height: 15, color: 'var(--muted-2)' }} />}
        <span className="s-label" style={{ margin: 0, fontSize: 13 }}>{label}</span>
      </div>
      <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: tone || 'var(--ink)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
function WarnBanner({ tone = 'red', icon = 'alertTriangle', title, text, action }) {
  const bg = tone === 'red' ? 'var(--red-bg)' : 'var(--amber-bg)';
  const col = tone === 'red' ? 'var(--red)' : 'var(--amber)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: bg, marginBottom: 12 }}>
      <Icon name={icon} style={{ width: 20, height: 20, color: col, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13.5 }}>{title}</div>
        {text && <div style={{ fontSize: 12.5, color: 'var(--body)' }}>{text}</div>}
      </div>
      {action}
    </div>
  );
}
function CashflowChart({ data, startBalance = 60000 }) {
  const safeData = data.length ? data : [{ m: '—', in: 0, out: 0 }];
  const W = 640, H = 190, pad = 28, bw = (W - pad * 2) / safeData.length;
  const max = Math.max(...safeData.map((d) => Math.max(d.in, d.out)), 1) * 1.15;
  let bal = startBalance;
  const balances = safeData.map((d) => (bal += d.in - d.out));
  const bmax = Math.max(...balances) * 1.1, bmin = Math.min(...balances, 0);
  const by = (v) => H - pad - ((v - bmin) / ((bmax - bmin) || 1)) * (H - pad * 2);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--line-strong)" />
      {safeData.map((d, i) => {
        const cx = pad + i * bw + bw / 2;
        return (
          <g key={i}>
            <rect x={cx - 13} y={y(d.in)} width={12} height={H - pad - y(d.in)} rx={3} fill="var(--green)" opacity="0.85" />
            <rect x={cx + 1} y={y(d.out)} width={12} height={H - pad - y(d.out)} rx={3} fill="var(--red)" opacity="0.8" />
            <text x={cx} y={H - pad + 15} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.m}</text>
          </g>
        );
      })}
      <polyline fill="none" stroke="var(--blue-soft-text)" strokeWidth="2.5"
        points={balances.map((v, i) => (pad + i * bw + bw / 2) + ',' + by(v)).join(' ')} />
      {balances.map((v, i) => <circle key={i} cx={pad + i * bw + bw / 2} cy={by(v)} r="3.5" fill="var(--blue-soft-text)" />)}
    </svg>
  );
}
function LegendDot({ color, label }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}</span>;
}
function FinRow({ label, value, tone, strong }) {
  return (
    <div className="kv-row" style={{ padding: '9px 0' }}>
      <span className="k" style={{ fontSize: 13.5 }}>{label}</span>
      <span className="v" style={{ fontSize: 13.5, color: tone || 'var(--ink)', fontWeight: strong ? 800 : 600 }}>{value}</span>
    </div>
  );
}

function FinOverview({ onGoTab, overview, accounts = [], payments = [], receipts = [], counterparties = [], cashflow = [], economics = [] }) {
  const currencies = Array.from(new Set([
    ...accounts.map((item) => item.currency),
    ...payments.map((item) => item.currency),
    ...receipts.map((item) => item.currency),
    ...counterparties.map((item) => item.currency),
    ...cashflow.map((item) => item.currency),
    ...economics.map((item) => item.currency),
  ].filter(Boolean))).sort();
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const currency = currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0] || 'USD';
  const currencyAccounts = accounts.filter((item) => item.currency === currency);
  const currencyPayments = payments.filter((item) => item.currency === currency);
  const currencyReceipts = receipts.filter((item) => item.currency === currency);
  const currencyCounterparties = counterparties.filter((item) => item.currency === currency);
  const currencyEconomics = economics.filter((item) => item.currency === currency);
  const totalCash = currencyAccounts.reduce((sum, item) => sum + item.balance, 0);
  const overviewReceivable = (overview?.client_receivable || []).filter((item) => item?.currency === currency);
  const overviewPayable = (overview?.supplier_payable || []).filter((item) => item?.currency === currency);
  const receivable = overviewReceivable.length
    ? overviewReceivable.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    : currencyCounterparties.filter((item) => item.type === 'client').reduce((sum, item) => sum + item.debt, 0);
  const payable = overviewPayable.length
    ? overviewPayable.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    : currencyCounterparties.filter((item) => item.type === 'supplier').reduce((sum, item) => sum + item.debt, 0);
  const expected = currencyReceipts.filter((item) => !item.overdue).reduce((sum, item) => sum + item.sum, 0);
  const planned = currencyPayments
    .filter((item) => item.dir === 'out' && !['Исполнено', 'Отменено', 'Отклонено'].includes(item.status))
    .reduce((sum, item) => sum + item.sum, 0);
  const overdueRows = currencyReceipts.filter((item) => item.overdue);
  const overdue = overdueRows.reduce((sum, item) => sum + item.sum, 0);
  const gross = currencyEconomics.reduce((sum, item) => sum + Number(item.revenue || 0) - Number(item.cost || 0), 0);
  const serviceFees = currencyEconomics.reduce((sum, item) => sum + Number(item.fees || 0), 0);
  const recent = currencyPayments.slice(0, 5);
  const flowByDate = new Map();
  cashflow.filter((item) => item.currency === currency).forEach((item) => {
    const key = financeDate(item.date);
    const row = flowByDate.get(key) || { m: key, in: 0, out: 0 };
    row[item.direction === 'incoming' ? 'in' : 'out'] += Number(item.amount || 0);
    flowByDate.set(key, row);
  });
  const flowData = [...flowByDate.values()];
  const calendarRows = [
    ...currencyReceipts.map((item) => ({ dir: 'in', date: item.date, party: item.party, sum: item.sum, overdue: item.overdue })),
    ...currencyPayments.filter((item) => item.dir === 'out').map((item) => ({ dir: 'out', date: item.date, party: item.party, sum: item.sum, overdue: false })),
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Field label="Валюта">
          <Select value={currency} onChange={(event) => setSelectedCurrency(event.target.value)} options={currencies.length ? currencies : ['USD']} style={{ width: 130 }} />
        </Field>
      </div>
      {overdue > 0 && <WarnBanner tone="red" title={'Просроченная дебиторская задолженность: ' + financeMoney(overdue, currency)}
        text={`${overdueRows.length} обязательств вышли за срок оплаты.`}
        action={<Button size="sm" variant="secondary" onClick={() => onGoTab('settlements')}>К взаиморасчётам</Button>} />}
      {planned > totalCash + expected && <WarnBanner tone="amber" icon="alertCircle" title="Риск кассового разрыва"
        text={`К выплате ${financeMoney(planned, currency)}, доступно с ожидаемыми поступлениями ${financeMoney(totalCash + expected, currency)}.`}
        action={<Button size="sm" variant="secondary" onClick={() => onGoTab('treasury')}>В казначейство</Button>} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12, marginBottom: 12 }}>
        <StatTile label="Остаток денежных средств" value={financeMoney(totalCash, currency)} icon="finance" accent="var(--green)" onClick={() => onGoTab('balance')} />
        <StatTile label="Дебиторская задолженность" value={financeMoney(receivable, currency)} icon="arrowUpRight" tone="var(--amber)" onClick={() => onGoTab('settlements')} />
        <StatTile label="Кредиторская задолженность" value={financeMoney(payable, currency)} icon="arrowUpRight" tone="var(--red)" onClick={() => onGoTab('settlements')} />
        <StatTile label="Ожидаемые поступления" value={financeMoney(expected, currency)} icon="calendar" tone="var(--green)" onClick={() => onGoTab('settlements')} />
        <StatTile label="Платежи к исполнению" value={financeMoney(planned, currency)} icon="calendar" tone="var(--red)" onClick={() => onGoTab('treasury')} />
        <StatTile label="Валовая прибыль услуг" value={financeMoney(gross, currency)} icon="pie" tone={gross >= 0 ? 'var(--green)' : 'var(--red)'} onClick={() => onGoTab('economics')} />
        <StatTile label="Сервисные сборы" value={financeMoney(serviceFees, currency)} icon="sparkles" onClick={() => onGoTab('economics')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 12, alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 6 }}>Подтверждённый денежный поток</h3>
          {flowData.length ? (
            <>
              <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}><LegendDot color="var(--green)" label="Приход" /><LegendDot color="var(--red)" label="Расход" /><LegendDot color="var(--blue-soft-text)" label="Остаток" /></div>
              <CashflowChart data={flowData} startBalance={0} />
            </>
          ) : <EmptyState icon="finance" title="Подтверждённых операций пока нет" />}
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Платёжный календарь</h3>
          {calendarRows.length ? <div style={{ display: 'grid', gap: 8 }}>
            {calendarRows.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6).map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.dir === 'in' ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                <span style={{ color: 'var(--muted-2)', width: 78, flexShrink: 0 }}>{item.date}</span>
                <span style={{ flex: 1, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.party}</span>
                <span style={{ fontWeight: 700, color: item.overdue ? 'var(--red)' : item.dir === 'in' ? 'var(--green)' : 'var(--body)' }}>{item.dir === 'in' ? '+' : '−'}{financeMoney(item.sum, currency)}</span>
              </div>
            ))}
          </div> : <EmptyState icon="calendar" title="Запланированных операций нет" />}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 className="card-title" style={{ fontSize: 16 }}>Последние платежи</h3>
          <Button size="sm" variant="secondary" onClick={() => onGoTab('payments')}>Все платежи</Button>
        </div>
        {!recent.length ? <EmptyState icon="finance" title="Платежей пока нет" /> : <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
          <table className="tbl">
            <thead><tr><th>Платёж</th><th>Дата</th><th>Контрагент</th><th>Назначение</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Статус</th></tr></thead>
            <tbody>{recent.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.no}</td><td>{item.date}</td><td>{item.party}</td>
                <td style={{ color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.purpose}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: item.dir === 'in' ? 'var(--green)' : 'var(--body)' }}>{item.dir === 'in' ? '+' : '−'}{financeMoney(item.sum, item.currency)}</td>
                <td><Pill tone={FIN_PAY_STATUS[item.status]}>{item.status}</Pill></td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
      </div>
    </div>
  );
}

function FinAccountDrawer({ ac, onClose }) {
  return (
    <Drawer open={!!ac} onClose={onClose} title={ac.name} sub={ac.number} width="min(620px,96vw)">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
        <StatTile label="Фактический остаток" value={financeMoney(ac.balance, ac.currency)} tone={ac.balance >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatTile label="Валюта счёта" value={ac.currency} />
      </div>
      <div className="card card-pad">
        <FinRow label="Тип счёта" value={ac.group} />
        <FinRow label="Код / номер" value={ac.number || '—'} />
        <FinRow label="Связанная организация" value={ac.bank || '—'} />
        <FinRow label="Статус" value={ac.is_active ? 'Активен' : 'Неактивен'} />
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 12 }}>
        Остаток рассчитан backend по проводкам этого финансового счёта.
      </div>
    </Drawer>
  );
}
function FinBalance({ accounts = [] }) {
  const [open, setOpen] = useState(null);
  const totals = accounts.reduce((map, account) => {
    map[account.currency] = (map[account.currency] || 0) + account.balance;
    return map;
  }, {});
  return (
    <div className="fade-in">
      {!accounts.length ? <EmptyState icon="bank" title="Финансовые счета не созданы" /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
            {Object.entries(totals).map(([currency, value]) => (
              <StatTile key={currency} label={`Остаток · ${currency}`} value={financeMoney(value, currency)} tone={value >= 0 ? 'var(--green)' : 'var(--red)'} icon="finance" />
            ))}
          </div>
          {FIN_ACCT_GROUPS.map((group) => {
            const groupAccounts = accounts.filter((account) => account.group === group.key);
            if (!groupAccounts.length) return null;
            return (
              <div key={group.key} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Icon name={group.icon} style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
                  <h3 className="card-title" style={{ fontSize: 15 }}>{group.key}</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
                  {groupAccounts.map((account) => (
                    <button key={account.id} type="button" className="card card-pad"
                      style={{ cursor: 'pointer', padding: '16px 18px', textAlign: 'left', border: '1px solid var(--line)', background: 'var(--surface)' }}
                      onClick={() => setOpen(account)}>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{account.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{account.number || 'Без кода'}{account.bank !== '—' ? ' · ' + account.bank : ''}</div>
                      <div className="s-value" style={{ fontSize: 22, marginTop: 10, color: account.balance >= 0 ? 'var(--ink)' : 'var(--red)' }}>{financeMoney(account.balance, account.currency)}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
      {open && <FinAccountDrawer ac={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function FinPaymentDrawer({ p, onClose, onConfirm }) {
  const toast = useToast();
  const canConfirm = p.status === 'Черновик' || p.status === 'На согласовании';
  return (
    <Drawer open={!!p} onClose={onClose} title={p.no} sub={(p.dir === 'in' ? 'Входящий' : 'Исходящий') + ' платёж · ' + p.date}
      footer={<div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <Button variant="secondary" style={{ flex: 1 }} icon="download" onClick={() => {
          if (!p.id) return toast('Платёж ещё не сохранён в backend', 'err');
          window.open(financeApi.paymentOrderUrl(p.id), '_blank', 'noopener,noreferrer');
        }}>Платёжное поручение</Button>
        {canConfirm && <Button style={{ flex: 1 }} icon="check" onClick={() => onConfirm(p)}>Провести</Button>}
      </div>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="s-value" style={{ fontSize: 26, color: p.dir === 'in' ? 'var(--green)' : 'var(--ink)' }}>{p.dir === 'in' ? '+' : '−'}{financeMoney(p.sum, p.currency)}</span>
        <Pill tone={FIN_PAY_STATUS[p.status]}>{p.status}</Pill>
      </div>
      <div className="card card-pad">
        <FinRow label={p.dir === 'in' ? 'Плательщик' : 'Получатель'} value={p.party} />
        <FinRow label="Связанный заказ" value={p.order ? '№ ' + p.order : '—'} />
        <FinRow label="Способ оплаты" value={p.method || '—'} />
        <FinRow label="Назначение" value={p.purpose} />
        <FinRow label="Валюта" value={p.currency || '—'} />
        <FinRow label="Создан" value={p.date} />
        <FinRow label="Подтверждён" value={p.confirmed_at ? financeDate(p.confirmed_at) : '—'} />
        <FinRow label="ID транзакции провайдера" value={p.provider_transaction_id || '—'} />
      </div>
    </Drawer>
  );
}

const FIN_CURRENCIES = ['USD', 'KGS', 'RUB', 'EUR', 'KZT'];

function FinPickerDrawer({ open, title, sub, rows, placeholder, value, onClose, onPick }) {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  if (!open) return null;
  const ql = q.trim().toLowerCase();
  const shown = rows.filter((r) => !ql || (r.name + ' ' + (r.sub || '')).toLowerCase().includes(ql));
  return (
    <Drawer open={open} onClose={onClose} title={title} sub={sub} width="min(520px,96vw)"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Отмена</Button>}>
      <SearchBox value={q} onChange={setQ} placeholder={placeholder} style={{ width: '100%', marginBottom: 12 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((r) => (
          <button key={r.value || r.name} type="button" onClick={() => onPick(r.value || r.name)}
            style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: value === (r.value || r.name) ? 'var(--surface-2)' : '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="oc-svc-ic" style={{ background: r.tone || 'var(--blue)', width: 34, height: 34, borderRadius: 10, flexShrink: 0 }}><Icon name={r.icon || 'briefcase'} style={{ width: 17, height: 17 }} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
              {r.sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</span>}
            </span>
            {value === (r.value || r.name) && <Icon name="check" style={{ width: 18, height: 18, color: 'var(--blue)' }} />}
          </button>
        ))}
        {!shown.length && <EmptyState icon="search" title="Ничего не найдено" />}
      </div>
    </Drawer>
  );
}

function FinPickerField({ value, placeholder, icon, error, onOpen }) {
  return (
    <button type="button" className={'select' + (error ? ' err' : '')} onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
      <Icon name={icon} style={{ width: 16, height: 16, color: 'var(--muted-2)', flexShrink: 0 }} />
      <span style={{ flex: 1, color: value ? 'var(--ink)' : 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || placeholder}</span>
      <Icon name="chevRight" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
    </button>
  );
}

function NewPaymentDrawer({ open, onClose, onCreate, clientRows = [], supplierRows = [], orderRows = [] }) {
  const toast = useToast();
  const [dir, setDir] = useState('in');
  const [partyKey, setPartyKey] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [purpose, setPurpose] = useState('');
  const [orderId, setOrderId] = useState('');
  const [method, setMethod] = useState('manual');
  const [saving, setSaving] = useState(false);
  const [pickParty, setPickParty] = useState(false);
  const [pickOrder, setPickOrder] = useState(false);
  const [errors, setErrors] = useState({});
  const partyRows = dir === 'in' ? clientRows : supplierRows;
  const selectedParty = partyRows.find((item) => item.value === partyKey);
  const selectedOrder = orderRows.find((item) => item.value === orderId);

  const reset = () => {
    setDir('in');
    setPartyKey('');
    setAmount('');
    setCurrency('USD');
    setPurpose('');
    setOrderId('');
    setMethod('manual');
    setPickParty(false);
    setPickOrder(false);
    setErrors({});
  };
  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };
  const submit = async () => {
    const nextErrors = {};
    if (!selectedParty) nextErrors.party = 'Выберите контрагента';
    if (!(Number(amount) > 0)) nextErrors.amount = 'Сумма должна быть больше нуля';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      await onCreate({
        dir,
        partyKey,
        sum: Number(amount),
        currency,
        purpose: purpose.trim(),
        orderId: orderId || null,
        method,
      });
      toast('Платёж создан в backend', 'ok');
      reset();
      onClose();
    } catch (error) {
      toast(error.message || 'Не удалось создать платёж', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={close} title="Новый платёж" sub="Создание финансового платежа" width="min(640px,96vw)"
      footer={<div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <Button variant="secondary" style={{ flex: 1 }} disabled={saving} onClick={close}>Отмена</Button>
        <Button style={{ flex: 2 }} icon="check" disabled={saving} onClick={submit}>Создать платёж</Button>
      </div>}>
      <Field label="Направление" required>
        <Tabs tabs={[{ key: 'in', label: 'Входящий' }, { key: 'out', label: 'Исходящий' }]} value={dir}
          onChange={(value) => { setDir(value); setPartyKey(''); setErrors({}); }} />
      </Field>
      <Field label={dir === 'in' ? 'Плательщик' : 'Получатель'} required error={errors.party}>
        <FinPickerField value={selectedParty?.name || ''} error={errors.party} icon={dir === 'in' ? 'user' : 'suppliers'}
          placeholder={dir === 'in' ? 'Выбрать клиента…' : 'Выбрать поставщика…'} onOpen={() => setPickParty(true)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label="Сумма" required error={errors.amount}>
          <Input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} error={errors.amount} placeholder="0.00" />
        </Field>
        <Field label="Валюта"><Select value={currency} onChange={(event) => setCurrency(event.target.value)} options={FIN_CURRENCIES} /></Field>
      </div>
      <Field label="Связанный заказ">
        <FinPickerField value={selectedOrder?.name || ''} icon="briefcase" placeholder="Без привязки к заказу" onOpen={() => setPickOrder(true)} />
      </Field>
      <Field label="Способ оплаты">
        <Input value={method} onChange={(event) => setMethod(event.target.value)} placeholder="manual" />
      </Field>
      <Field label="Назначение платежа">
        <Input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Основание или комментарий" />
      </Field>

      <FinPickerDrawer open={pickParty} value={partyKey}
        title={dir === 'in' ? 'Выбор плательщика' : 'Выбор получателя'}
        sub={dir === 'in' ? 'Лицо или компания из backend' : 'Поставщик из backend'}
        placeholder="Поиск контрагента" rows={partyRows}
        onClose={() => setPickParty(false)} onPick={(value) => { setPartyKey(value); setPickParty(false); }} />
      <FinPickerDrawer open={pickOrder} value={orderId} title="Выбор заказа" sub="Заказы из backend"
        placeholder="Поиск по номеру заказа" rows={orderRows}
        onClose={() => setPickOrder(false)} onPick={(value) => { setOrderId(value); setPickOrder(false); }} />
    </Drawer>
  );
}

function FinPayments({ payments = [], obligations = [], onPaymentCreated, onPaymentConfirmed, clientRows = [], supplierRows = [], orderRows = [] }) {
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updates, setUpdates] = useState({});
  const [dir, setDir] = useState('all');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const all = payments.map((payment) => updates[payment.id] || payment);
  const ql = q.trim().toLowerCase();
  const list = all.filter((p) => (dir === 'all' || p.dir === dir) && (!status || p.status === status)
    && (!ql || [p.no, p.party, p.purpose, p.order].some((v) => String(v || '').toLowerCase().includes(ql))));
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Tabs tabs={[{ key: 'all', label: 'Все' }, { key: 'in', label: 'Входящие' }, { key: 'out', label: 'Исходящие' }]} value={dir} onChange={setDir} />
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: №, контрагент, заказ, назначение" style={{ minWidth: 260 }} />
        <div style={{ flex: 1 }} />
        <FilterChip label="Статус" value={status} onChange={setStatus} options={Object.keys(FIN_PAY_STATUS)} />
        <Button icon="plus" onClick={() => setCreating(true)}>Новый платёж</Button>
      </div>
      {!list.length ? <EmptyState icon="finance" title="Платежей не найдено" /> : <div className="table-card">
        <table className="tbl tbl-wide">
          <thead><tr><th>№</th><th>Дата</th><th>Направление</th><th>Контрагент</th><th>Заказ</th><th>Назначение</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Статус</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.no} style={{ cursor: 'pointer' }} onClick={() => setOpen(p)}>
                <td style={{ fontWeight: 600 }}>{p.no}</td><td>{p.date}</td>
                <td><Pill tone={p.dir === 'in' ? 'green' : 'gray'}>{p.dir === 'in' ? 'Входящий' : 'Исходящий'}</Pill></td>
                <td>{p.party}</td><td>{p.order ? '№ ' + p.order : '—'}</td>
                <td style={{ color: 'var(--muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.purpose}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: p.dir === 'in' ? 'var(--green)' : 'var(--body)' }}>{p.dir === 'in' ? '+' : '−'}{financeMoney(p.sum, p.currency)}</td>
                <td><Pill tone={FIN_PAY_STATUS[p.status]}>{p.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
      {open && <FinPaymentDrawer p={open} onClose={() => setOpen(null)} onConfirm={async (payment) => {
        try {
          const allocations = financeAllocationsForPayment(payment, obligations);
          const updated = financePaymentRow(await financeApi.confirmPayment(payment.id, { version: payment.version, allocations }));
          setUpdates((current) => ({ ...current, [payment.id]: updated }));
          setOpen(updated);
          await onPaymentConfirmed?.();
        } catch (error) { toast(error.message || 'Не удалось провести платёж', 'err'); }
      }} />}
      <NewPaymentDrawer open={creating} onClose={() => setCreating(false)} clientRows={clientRows} supplierRows={supplierRows} orderRows={orderRows} onCreate={async (p) => {
        return onPaymentCreated(p);
      }} />
    </div>
  );
}

function FinTreasury({ accounts = [], payments = [], receipts = [] }) {
  const currencies = Array.from(new Set([
    ...accounts.map((item) => item.currency),
    ...payments.map((item) => item.currency),
    ...receipts.map((item) => item.currency),
  ].filter(Boolean))).sort();
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const currency = currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0] || 'USD';
  const currencyAccounts = accounts.filter((item) => item.currency === currency && item.kind !== 'deposit');
  const planned = payments
    .filter((item) => item.currency === currency && item.dir === 'out' && !['Исполнено', 'Отменено', 'Отклонено'].includes(item.status))
    .slice()
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const incoming = receipts
    .filter((item) => item.currency === currency && !item.overdue)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const startBalance = currencyAccounts.reduce((sum, item) => sum + item.balance, 0);
  const totalOut = planned.reduce((sum, item) => sum + item.sum, 0);
  const totalIn = incoming.reduce((sum, item) => sum + item.sum, 0);
  const forecast = startBalance + totalIn - totalOut;
  let running = startBalance + totalIn;
  const withRunning = planned.map((payment) => {
    running -= payment.sum;
    return { ...payment, after: running };
  });
  const gap = withRunning.some((item) => item.after < 0);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Field label="Валюта">
          <Select value={currency} onChange={(event) => setSelectedCurrency(event.target.value)} options={currencies.length ? currencies : ['USD']} style={{ width: 130 }} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12, marginBottom: 14 }}>
        <StatTile label="Остаток на счетах и в кассе" value={financeMoney(startBalance, currency)} icon="finance" />
        <StatTile label="Ожидаемые поступления" value={financeMoney(totalIn, currency)} tone="var(--green)" icon="arrowUpRight" />
        <StatTile label="Непроведённые выплаты" value={financeMoney(totalOut, currency)} tone="var(--red)" icon="arrowUpRight" />
        <StatTile label="Расчётный остаток" value={financeMoney(forecast, currency)} tone={forecast < 0 ? 'var(--red)' : 'var(--green)'} icon="pie" />
      </div>
      {gap && <WarnBanner tone="red" title="По текущим данным возможен кассовый разрыв"
        text="Сумма непроведённых исходящих платежей превышает остаток с учётом ожидаемых поступлений." />}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Исходящие платежи к проведению</h3>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>Показываются фактические непроведённые платежи backend в выбранной валюте.</div>
          {!withRunning.length ? <EmptyState icon="check" title="Платежей к проведению нет" /> : <div style={{ display: 'grid', gap: 8 }}>
            {withRunning.map((payment) => (
              <div key={payment.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: payment.after < 0 ? 'var(--red-bg)' : '#fff' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{payment.party}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{payment.no} · создан {payment.date} · заказ {payment.order || '—'} · {payment.status}</div>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--red)' }}>−{financeMoney(payment.sum, currency)}</span>
                <span style={{ width: 118, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: payment.after < 0 ? 'var(--red)' : 'var(--muted)' }}>остаток {financeMoney(payment.after, currency)}</span>
              </div>
            ))}
          </div>}
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Расчёт</h3>
          <FinRow label="Остаток" value={financeMoney(startBalance, currency)} />
          <FinRow label="Ожидается" value={'+' + financeMoney(totalIn, currency)} tone="var(--green)" />
          <FinRow label="К проведению" value={'−' + financeMoney(totalOut, currency)} tone="var(--red)" />
          <FinRow label="После операций" value={financeMoney(forecast, currency)} tone={forecast < 0 ? 'var(--red)' : 'var(--green)'} strong />
          <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--muted)' }}>Ближайшие обязательства клиентов</div>
          {!incoming.length ? <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 8 }}>Нет ожидаемых поступлений</div> : <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
            {incoming.slice(0, 4).map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
                <span style={{ color: 'var(--muted-2)', width: 76 }}>{item.date}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.party}</span>
                <span style={{ fontWeight: 700, color: 'var(--green)' }}>+{financeMoney(item.sum, currency)}</span>
              </div>
            ))}
          </div>}
        </div>
      </div>
    </div>
  );
}

// --- Акт сверки: разбор дат, определение услуги, сбор операций ---
function reconParseDate(s) {
  const m = String(s || '').match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (!m) return null;
  let y = m[3] ? Number(m[3]) : 2026;
  if (y < 100) y += 2000;
  return new Date(y, Number(m[2]) - 1, Number(m[1]));
}
function reconFmtDate(d) {
  return d ? String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear() : '';
}
function reconKindOf(text) {
  const t = String(text || '');
  for (const k of Object.keys(SERVICE_KIND)) if (t.includes(k)) return k;
  if (/авиа|перел|билет|рейс|блок мест|авиабл/i.test(t)) return 'Авиа';
  if (/гостин|отел|hotel|номер|ноч|ваучер|hil/i.test(t)) return 'Гостиница';
  if (/трансфер/i.test(t)) return 'Трансфер';
  if (/ж\/д|поезд|жд/i.test(t)) return 'ЖД';
  return 'Прочее';
}
function reconOperations(cp) {
  if (!cp) return [];
  const ops = [];
  // Дебет — начисления по документам-обязательствам
  (cp.obligations || []).forEach((o) => ops.push({
    date: reconParseDate(o.since), dateLabel: o.since, basis: o.doc, order: o.order,
    kind: o.kind ? reconServiceKindLabel(o.kind) : reconKindOf(o.doc), resp: null, debit: o.sum, credit: o.paid, dir: 'obligation',
  }));
  return ops.sort((a, b) => (a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0));
}

function ReconActContent({ cp, meta }) {
  const toast = useToast();
  const ops = useMemo(() => reconOperations(cp), [cp]);
  const dts = ops.map((o) => o.date).filter(Boolean).map((d) => d.getTime());
  const dmin = dts.length ? new Date(Math.min(...dts)) : null;
  const dmax = dts.length ? new Date(Math.max(...dts)) : null;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState('all');
  const [resp, setResp] = useState('all');
  const [respPick, setRespPick] = useState(false);
  const [built, setBuilt] = useState(false);
  useEffect(() => { setFrom(reconFmtDate(dmin)); setTo(reconFmtDate(dmax)); setKind('all'); setResp('all'); setBuilt(false); }, [cp]);
  if (!cp) return null;

  const knownKinds = reconServiceKindOptions(meta);
  const kindOptions = Array.from(new Set([...knownKinds, ...ops.map((o) => o.kind).filter(Boolean)]));
  const respOptions = Array.from(new Set(ops.map((o) => o.resp).filter(Boolean)));
  const fromD = reconParseDate(from), toD = reconParseDate(to);
  const rows = ops.filter((o) => {
    if (fromD && o.date && o.date < fromD) return false;
    if (toD && o.date && o.date > new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59)) return false;
    if (kind !== 'all' && o.kind !== kind) return false;
    if (resp !== 'all' && (o.resp || '—') !== resp) return false;
    return true;
  });
  const debit = rows.reduce((s, o) => s + o.debit, 0);
  const credit = rows.reduce((s, o) => s + o.credit, 0);
  const balance = debit - credit;
  const paramLine = [
    from || to ? 'период ' + (from || '…') + ' — ' + (to || '…') : 'весь период',
    kind !== 'all' ? 'услуга: ' + kind : 'все услуги',
    resp !== 'all' ? 'сотрудник: ' + resp : 'вся компания',
  ].join(' · ');
  const act = async (kind) => {
    try {
      const result = await financeApi.createDocument({
        kind,
        payload: {
          counterpart: cp.name, period: paramLine, debit, credit, balance,
          rows: rows.map((row) => ({ date: row.dateLabel, basis: row.basis, order: row.order, kind: row.kind, debit: row.debit, credit: row.credit })),
        },
      });
      if (result instanceof Blob) saveFinanceBlob(result, `Акт-сверки-${cp.name}.txt`);
      toast(kind === 'reconciliation' ? 'Акт сверки скачан' : 'Задача поставлена в очередь backend', 'ok');
    } catch (error) { toast(error.message || 'Не удалось обработать акт сверки', 'err'); }
  };

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ fontSize: 14, marginBottom: 10 }}>Параметры акта · {cp.name}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <UFDateField label="Период с" value={from || null} onChange={(v) => { setFrom(v || ''); setBuilt(false); }} placeholder="дд.мм.гггг" />
          <UFDateField label="Период по" value={to || null} onChange={(v) => { setTo(v || ''); setBuilt(false); }} placeholder="дд.мм.гггг" />
          <Field label="Услуга">
            <Select value={kind} onChange={(e) => { setKind(e.target.value); setBuilt(false); }}
              options={[{ value: 'all', label: 'Все услуги' }, ...kindOptions.map((k) => ({ value: k, label: k }))]} />
          </Field>
          <Field label="Сотрудник / отдел">
            <FinPickerField value={resp === 'all' ? '' : resp} icon="users" placeholder="Вся компания" onOpen={() => setRespPick(true)} />
          </Field>
        </div>
        <Button icon="check" style={{ marginTop: 12 }} onClick={() => setBuilt(true)}>Сформировать акт</Button>
      </div>

      <FinPickerDrawer open={respPick} value={resp === 'all' ? 'Вся компания' : resp}
        title="Сотрудник / отдел" sub="Ответственные по операциям" placeholder="Поиск сотрудника"
        rows={[{ name: 'Вся компания', sub: 'все сотрудники и отделы', icon: 'users', tone: 'var(--blue)' },
          ...respOptions.map((r) => ({ name: r, sub: 'ответственный менеджер', icon: 'user', tone: 'var(--green)' }))]}
        onClose={() => setRespPick(false)}
        onPick={(name) => { setResp(name === 'Вся компания' ? 'all' : name); setBuilt(false); setRespPick(false); }} />

      {built ? (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 12 }}>
            <StatTile label="Дебет (начислено)" value={financeMoney(debit, cp.currency)} />
            <StatTile label="Кредит (оплачено)" value={financeMoney(credit, cp.currency)} tone="var(--green)" />
            <StatTile label="Сальдо (остаток)" value={financeMoney(balance, cp.currency)} tone={balance > 0 ? 'var(--amber)' : 'var(--green)'} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>Акт сверки с <b style={{ color: 'var(--ink)' }}>{cp.name}</b> · {paramLine} · операций: {rows.length}</div>
          <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
            <table className="tbl">
              <thead><tr><th>Дата</th><th>Основание</th><th>Заказ</th><th>Услуга</th><th>Сотрудник</th><th style={{ textAlign: 'right' }}>Дебет</th><th style={{ textAlign: 'right' }}>Кредит</th></tr></thead>
              <tbody>
                {rows.map((o, i) => (
                  <tr key={i}>
                    <td>{o.dateLabel}</td>
                    <td style={{ color: 'var(--body)' }}>{o.basis}</td>
                    <td>{o.order ? '№ ' + o.order : '—'}</td>
                    <td>{o.kind}</td>
                    <td>{o.resp || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{o.debit ? financeMoney(o.debit, cp.currency) : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--green)' }}>{o.credit ? financeMoney(o.credit, cp.currency) : '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '18px 0' }}>Нет операций под выбранные параметры</td></tr>}
              </tbody>
              {rows.length > 0 && (
                <tfoot><tr style={{ fontWeight: 700 }}>
                  <td colSpan={5} style={{ textAlign: 'right' }}>Итого:</td>
                  <td style={{ textAlign: 'right' }}>{financeMoney(debit, cp.currency)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)' }}>{financeMoney(credit, cp.currency)}</td>
                </tr></tfoot>
              )}
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Button variant="secondary" icon="download" onClick={() => act('reconciliation')}>Скачать</Button>
            <Button variant="secondary" icon="send" onClick={() => act('reconciliation_send')}>Отправить контрагенту</Button>
            <Button icon="send" onClick={() => act('accounting_export')}>В бухгалтерию</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 14px', border: '1px dashed var(--line)', borderRadius: 12, color: 'var(--muted)', fontSize: 13 }}>
          <Icon name="finance" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
          Укажите параметры и нажмите «Сформировать акт» — появится детализация по дебету/кредиту за выбранный период.
        </div>
      )}
    </>
  );
}

function ReconActDrawer({ open, cp, meta, onClose }) {
  if (!open || !cp) return null;
  return (
    <Drawer open={open} onClose={onClose} title="Акт сверки" sub={cp.name + ' · ' + (cp.type === 'client' ? 'клиент' : 'поставщик')} width="min(760px,97vw)"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <ReconActContent cp={cp} meta={meta} key={cp.id} />
    </Drawer>
  );
}

function FinReconciliation({ counterparties = [], meta }) {
  const [cpKey, setCpKey] = useState('');
  const [pick, setPick] = useState(false);
  const cp = counterparties.find((c) => `${c.id}|${c.currency}` === cpKey) || null;
  const rows = counterparties.map((c) => ({
    value: `${c.id}|${c.currency}`,
    name: c.name,
    sub: (c.type === 'client' ? 'Клиент' : 'Поставщик') + ' · ' + c.currency + ' · долг ' + financeMoney(c.debt, c.currency),
    icon: c.type === 'client' ? 'user' : 'suppliers',
    tone: c.type === 'client' ? 'var(--blue)' : 'var(--amber)',
  }));
  return (
    <div className="fade-in">
      <div className="card card-pad" style={{ marginBottom: 14, maxWidth: 560 }}>
        <Field label="Контрагент" hint="Клиент или поставщик — выберите из списка в боковом окне">
          <FinPickerField value={cp ? `${cp.name} · ${cp.currency}` : ''} icon="suppliers" placeholder="Выбрать контрагента или компанию…" onOpen={() => setPick(true)} />
        </Field>
      </div>
      {cp
        ? <ReconActContent cp={cp} meta={meta} key={cp.id} />
        : <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
            <Icon name="finance" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
            Выберите контрагента — откроются параметры и формирование акта сверки за период / по услуге / по сотруднику.
          </div>}
      <FinPickerDrawer open={pick} value={cpKey} title="Выбор контрагента" sub="Клиенты и поставщики"
        placeholder="Поиск контрагента или компании" rows={rows}
        onClose={() => setPick(false)} onPick={(value) => { setCpKey(value); setPick(false); }} />
    </div>
  );
}

function FinCounterpartyDrawer({ cp, meta, onClose }) {
  const toast = useToast();
  const [reconOpen, setReconOpen] = useState(false);
  const debit = cp.obligations.reduce((sum, item) => sum + item.sum, 0);
  const credit = cp.obligations.reduce((sum, item) => sum + item.paid, 0);
  const rows = cp.obligations.map((item) => ({
    date: item.since,
    basis: item.doc,
    order: item.order,
    kind: item.kind,
    debit: item.sum,
    credit: item.paid,
  }));
  const exportDocument = async (kind) => {
    try {
      const result = await financeApi.createDocument({
        kind,
        payload: { counterpart: cp.name, debit, credit, balance: debit - credit, rows },
      });
      if (result instanceof Blob) {
        const label = { invoice: 'Счёт', upd: 'УПД' }[kind] || 'Документ';
        saveFinanceBlob(result, `${label}-${cp.name}.txt`);
        toast('Документ сформирован по данным backend', 'ok');
      } else {
        toast(result?.status === 'queued' ? 'Выгрузка поставлена в очередь backend' : 'Запрос обработан backend', 'ok');
      }
    } catch (error) {
      toast(error.message || 'Не удалось сформировать документ', 'err');
    }
  };

  return (
    <Drawer open={!!cp} onClose={onClose} title={cp.name} sub={(cp.type === 'client' ? 'Клиент' : 'Поставщик') + ' · ' + cp.currency} width="min(900px,96vw)"
      footer={<div style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" icon="download" onClick={() => setReconOpen(true)} style={{ flex: 1 }}>Акт сверки</Button>
        <Button variant="secondary" size="sm" icon="download" onClick={() => exportDocument('invoice')} style={{ flex: 1 }}>Счёт</Button>
        <Button variant="secondary" size="sm" icon="download" onClick={() => exportDocument('upd')} style={{ flex: 1 }}>УПД</Button>
        <Button size="sm" icon="send" onClick={() => exportDocument('accounting_export')} style={{ flex: 1.4 }}>В бухгалтерию</Button>
      </div>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        <StatTile label={cp.type === 'client' ? 'Задолженность клиента' : 'Наш долг поставщику'} value={financeMoney(cp.debt, cp.currency)} tone={cp.debt ? 'var(--amber)' : 'var(--green)'} />
        <StatTile label="Начислено" value={financeMoney(debit, cp.currency)} />
        <StatTile label="Оплачено" value={financeMoney(credit, cp.currency)} tone="var(--green)" />
      </div>

      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Финансовые обязательства</h3>
      <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)', marginBottom: 14 }}>
        <table className="tbl">
          <thead><tr><th>Заказ</th><th>Основание</th><th>Вид услуги</th><th>Возникло</th><th>Срок</th><th style={{ textAlign: 'right' }}>Начислено</th><th style={{ textAlign: 'right' }}>Оплачено</th><th style={{ textAlign: 'right' }}>Остаток</th><th>Статус</th></tr></thead>
          <tbody>{cp.obligations.map((item) => (
            <tr key={item.id}>
              <td>№ {item.order}</td>
              <td>{item.doc}</td>
              <td>{reconServiceKindLabel(item.kind)}</td>
              <td>{item.since}</td>
              <td style={{ color: item.overdueDays > 0 ? 'var(--red)' : undefined }}>{item.due}</td>
              <td style={{ textAlign: 'right' }}>{financeMoney(item.sum, cp.currency)}</td>
              <td style={{ textAlign: 'right', color: 'var(--green)' }}>{financeMoney(item.paid, cp.currency)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{financeMoney(item.rest, cp.currency)}</td>
              <td><Pill tone={item.status === 'Оплачено' ? 'green' : item.status === 'Просрочено' ? 'red' : 'amber'}>{item.status}</Pill></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Параметры договора и кредитного лимита показываются в карточке компании; здесь отображаются только проведённые финансовые записи.</div>
      <ReconActDrawer open={reconOpen} cp={cp} meta={meta} onClose={() => setReconOpen(false)} />
    </Drawer>
  );
}
function FinSettlements({ counterparties = [], receipts = [], meta }) {
  const [open, setOpen] = useState(null);
  const [type, setType] = useState('client');
  const [q, setQ] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const query = q.trim().toLowerCase();
  const list = counterparties.filter((item) => item.type === type)
    .filter((item) => !query || [item.name, item.legal, ...item.orders.map(String)].some((value) => String(value || '').toLowerCase().includes(query)))
    .filter((item) => !onlyOverdue || item.obligations.some((obligation) => obligation.overdueDays > 0));
  const debtByCurrency = list.reduce((map, item) => {
    map[item.currency] = (map[item.currency] || 0) + item.debt;
    return map;
  }, {});
  const debtText = Object.entries(debtByCurrency).map(([currency, value]) => financeMoney(value, currency)).join('; ') || '0';

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Tabs tabs={[{ key: 'client', label: 'Клиенты' }, { key: 'supplier', label: 'Поставщики' }]} value={type} onChange={setType} />
        <SearchBox value={q} onChange={setQ} placeholder="Поиск по контрагенту или заказу" style={{ minWidth: 260 }} />
        <button type="button" onClick={() => setOnlyOverdue((value) => !value)}
          style={{ cursor: 'pointer', fontSize: 12.5, padding: '7px 12px', borderRadius: 9, border: '1px solid ' + (onlyOverdue ? 'var(--red)' : 'var(--line)'), background: onlyOverdue ? 'var(--red-bg)' : '#fff', color: onlyOverdue ? 'var(--red)' : 'var(--body)' }}>
          Только с просрочкой
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Найдено: <b>{list.length}</b> · задолженность: <b style={{ color: 'var(--amber)' }}>{debtText}</b></span>
      </div>

      {!list.length ? <EmptyState icon="finance" title="Взаиморасчётов не найдено" /> : (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Контрагент</th><th>Валюта</th><th>Заказы</th><th>Обязательств</th><th style={{ textAlign: 'right' }}>Задолженность</th><th style={{ textAlign: 'right' }}>Оплачено</th><th>Ближайший срок</th><th>Статус</th></tr></thead>
            <tbody>{list.map((item) => {
              const nearest = item.obligations.filter((obligation) => obligation.due && obligation.due !== '—').slice().sort((a, b) => a.due.localeCompare(b.due))[0];
              const overdue = item.obligations.some((obligation) => obligation.overdueDays > 0);
              return (
                <tr key={item.type + item.name + item.currency} style={{ cursor: 'pointer' }} onClick={() => setOpen(item)}>
                  <td className="t-strong">{item.name}</td>
                  <td>{item.currency}</td>
                  <td>{item.orders.join(', ') || '—'}</td>
                  <td>{item.obligations.length}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: overdue ? 'var(--red)' : 'var(--amber)' }}>{financeMoney(item.debt, item.currency)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)' }}>{financeMoney(item.paid, item.currency)}</td>
                  <td style={{ color: overdue ? 'var(--red)' : 'var(--body)' }}>{nearest?.due || '—'}{overdue ? ' · просрочка' : ''}</td>
                  <td><Pill tone={overdue ? 'red' : item.debt > 0 ? 'amber' : 'green'}>{overdue ? 'Просрочено' : item.debt > 0 ? 'Ожидает оплаты' : 'Оплачено'}</Pill></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      <h3 className="card-title" style={{ fontSize: 16, margin: '22px 0 12px' }}>Календарь поступлений</h3>
      {!receipts.length ? <EmptyState icon="calendar" title="Ожидаемых поступлений нет" /> : (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Дата</th><th>Контрагент</th><th>Основание</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Статус</th></tr></thead>
            <tbody>{receipts.slice().sort((a, b) => a.date.localeCompare(b.date)).map((receipt, index) => (
              <tr key={index}>
                <td>{receipt.date}</td><td className="t-strong">{receipt.party}</td><td style={{ color: 'var(--muted)' }}>{receipt.basis}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: receipt.overdue ? 'var(--red)' : 'var(--green)' }}>{financeMoney(receipt.sum, receipt.currency)}</td>
                <td><Pill tone={receipt.overdue ? 'red' : 'green'}>{receipt.overdue ? 'Просрочено' : 'Ожидается'}</Pill></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {open && <FinCounterpartyDrawer cp={open} meta={meta} onClose={() => setOpen(null)} />}
    </div>
  );
}

function FinEconomics({ economics = [] }) {
  const rows = economics.map((item) => ({
    ...item,
    revenue: Number(item.revenue || 0),
    cost: Number(item.cost || 0),
    fees: Number(item.fees || 0),
    markup: Number(item.markup || 0),
    gross: Number(item.revenue || 0) - Number(item.cost || 0),
  }));
  return (
    <div className="fade-in">
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
        Данные рассчитаны backend по подтверждённым и оформленным услугам. Каждая строка разделена по виду услуги и валюте.
      </div>
      {!rows.length ? <EmptyState icon="pie" title="Нет услуг для расчёта экономики" /> : (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Вид услуги</th><th>Валюта</th><th style={{ textAlign: 'right' }}>Выручка</th><th style={{ textAlign: 'right' }}>Стоимость поставщика</th><th style={{ textAlign: 'right' }}>Сборы</th><th style={{ textAlign: 'right' }}>Наценка</th><th style={{ textAlign: 'right' }}>Валовая прибыль</th></tr></thead>
            <tbody>{rows.map((item) => (
              <tr key={`${item.kind}|${item.currency}`}>
                <td className="t-strong">{reconServiceKindLabel(item.kind)}</td>
                <td>{item.currency}</td>
                <td style={{ textAlign: 'right' }}>{financeMoney(item.revenue, item.currency)}</td>
                <td style={{ textAlign: 'right' }}>{financeMoney(item.cost, item.currency)}</td>
                <td style={{ textAlign: 'right' }}>{financeMoney(item.fees, item.currency)}</td>
                <td style={{ textAlign: 'right' }}>{financeMoney(item.markup, item.currency)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: item.gross >= 0 ? 'var(--green)' : 'var(--red)' }}>{financeMoney(item.gross, item.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FinAnalytics({ cashflow = [] }) {
  const currencies = Array.from(new Set(cashflow.map((item) => item.currency).filter(Boolean))).sort();
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const currency = currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0] || 'USD';
  const grouped = new Map();
  cashflow.filter((item) => item.currency === currency).forEach((item) => {
    const key = financeDate(item.date);
    const row = grouped.get(key) || { date: key, incoming: 0, outgoing: 0 };
    row[item.direction === 'incoming' ? 'incoming' : 'outgoing'] += Number(item.amount || 0);
    grouped.set(key, row);
  });
  let cumulative = 0;
  const rows = [...grouped.values()].map((item) => {
    const net = item.incoming - item.outgoing;
    cumulative += net;
    return { ...item, net, cumulative };
  });
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Field label="Валюта">
          <Select value={currency} onChange={(event) => setSelectedCurrency(event.target.value)} options={currencies.length ? currencies : ['USD']} style={{ width: 130 }} />
        </Field>
      </div>
      {!rows.length ? <EmptyState icon="finance" title="Подтверждённых денежных операций нет" /> : (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Дата</th><th style={{ textAlign: 'right' }}>Приход</th><th style={{ textAlign: 'right' }}>Расход</th><th style={{ textAlign: 'right' }}>Чистый поток</th><th style={{ textAlign: 'right' }}>Накопительный поток</th></tr></thead>
            <tbody>{rows.map((item) => (
              <tr key={item.date}>
                <td className="t-strong">{item.date}</td>
                <td style={{ textAlign: 'right', color: 'var(--green)' }}>{item.incoming ? '+' + financeMoney(item.incoming, currency) : '—'}</td>
                <td style={{ textAlign: 'right', color: 'var(--red)' }}>{item.outgoing ? '−' + financeMoney(item.outgoing, currency) : '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: item.net >= 0 ? 'var(--green)' : 'var(--red)' }}>{financeMoney(item.net, currency)}</td>
                <td style={{ textAlign: 'right' }}>{financeMoney(item.cumulative, currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const FIN_TABS = [
  { key: 'overview', label: 'Обзор' },
  { key: 'balance', label: 'Баланс' },
  { key: 'payments', label: 'Платежи' },
  { key: 'treasury', label: 'Казначейство' },
  { key: 'settlements', label: 'Взаиморасчёты' },
  { key: 'recon', label: 'Акт сверки' },
  { key: 'economics', label: 'Экономика' },
  { key: 'analytics', label: 'Денежный поток' },
];

function FinancePage({ overview, clients = [], companies = [], suppliers = [], orders = [], meta = null }) {
  const [tab, setTab] = useState('overview');
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [obligations, setObligations] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [economics, setEconomics] = useState([]);

  const loadFinance = useCallback(async (signal) => {
    const [accountPayload, paymentPayload, obligationPayload, cashflowPayload, economicsPayload] = await Promise.all([
      financeApi.accounts(signal),
      financeApi.payments({}, signal),
      financeApi.obligations({}, signal),
      financeApi.cashflow({}, signal),
      financeApi.economics({}, signal),
    ]);
    setAccounts(resultsOf(accountPayload).filter((item) => ['bank', 'cash', 'deposit'].includes(item.kind)).map(financeAccountRow));
    setPayments(resultsOf(paymentPayload).map(financePaymentRow));
    setObligations(resultsOf(obligationPayload));
    setCashflow((cashflowPayload?.cashflow || []).map((item) => ({
      date: item.date,
      direction: item.direction,
      currency: item.money?.currency,
      amount: Number(item.money?.amount || 0),
    })));
    setEconomics(economicsPayload?.by_kind || []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadFinance(controller.signal).catch((error) => {
      if (error.name !== 'AbortError') console.error(error);
    });
    return () => controller.abort();
  }, [loadFinance]);

  const receipts = useMemo(() => obligations
    .filter((item) => item.direction === 'client_receivable' && ['open', 'partial'].includes(item.status) && Number(item.outstanding || 0) > 0)
    .map(financeReceiptRow), [obligations]);
  const counterparties = useMemo(() => financeCounterpartyRows(obligations), [obligations]);
  const clientRows = useMemo(() => [
    ...companies.map((item) => ({ value: `company:${item.id}`, name: item.name, sub: `${item.type || 'Компания'} · ИНН ${item.inn || '—'}`, icon: 'building', tone: 'var(--blue)' })),
    ...clients.map((item) => ({ value: `person:${item.id}`, name: item.name, sub: item.type || 'Физическое лицо', icon: 'user', tone: 'var(--green)' })),
  ], [clients, companies]);
  const supplierRows = useMemo(() => suppliers.map((item) => ({ value: `supplier:${item.id || item.no}`, name: item.name, sub: item.service || 'Поставщик', icon: 'suppliers', tone: 'var(--amber)' })), [suppliers]);
  const orderRows = useMemo(() => orders.filter((item) => item.id).map((item) => ({ value: String(item.id), name: `№ ${item.no || item.number || item.id}`, sub: item.client || item.clientName || 'Заказ', icon: 'briefcase', tone: 'var(--blue)' })), [orders]);

  const createPayment = async (payment) => {
    const [partyType, partyId] = String(payment.partyKey || '').split(':');
    const created = await financeApi.createPayment({
      direction: payment.dir === 'in' ? 'incoming' : 'outgoing',
      order: payment.orderId || null,
      payer_person: payment.dir === 'in' && partyType === 'person' ? partyId : null,
      payer_company: payment.dir === 'in' && partyType === 'company' ? partyId : null,
      supplier: payment.dir === 'out' && partyType === 'supplier' ? partyId : null,
      method: payment.method || 'manual',
      amount: payment.sum,
      currency: payment.currency,
      comment: payment.purpose,
    });
    const row = financePaymentRow(created);
    setPayments((current) => [row, ...current.filter((item) => item.id !== row.id)]);
    return row;
  };

  return (
    <>
      <Topbar title="Финансы" sub="Баланс, платежи, обязательства и экономика по данным backend" />
      <div className="content">
        <div style={{ marginBottom: 18 }}><Tabs tabs={FIN_TABS} value={tab} onChange={setTab} /></div>
        {tab === 'overview' && <FinOverview onGoTab={setTab} overview={overview} accounts={accounts} payments={payments} receipts={receipts} counterparties={counterparties} cashflow={cashflow} economics={economics} />}
        {tab === 'balance' && <FinBalance accounts={accounts} />}
        {tab === 'payments' && <FinPayments payments={payments} obligations={obligations} onPaymentCreated={createPayment} onPaymentConfirmed={() => loadFinance()} clientRows={clientRows} supplierRows={supplierRows} orderRows={orderRows} />}
        {tab === 'treasury' && <FinTreasury accounts={accounts} payments={payments} receipts={receipts} />}
        {tab === 'settlements' && <FinSettlements counterparties={counterparties} receipts={receipts} meta={meta} />}
        {tab === 'recon' && <FinReconciliation counterparties={counterparties} meta={meta} />}
        {tab === 'economics' && <FinEconomics economics={economics} />}
        {tab === 'analytics' && <FinAnalytics cashflow={cashflow} />}
      </div>
    </>
  );
}

Object.assign(window, { FinancePage });

export { f$, StatTile, WarnBanner, CashflowChart, LegendDot, FinRow, FinOverview, FinAccountDrawer, FinBalance, FinPaymentDrawer, FinPayments, FinTreasury, ReconActDrawer, FinCounterpartyDrawer, FinSettlements, FinEconomics, FinAnalytics, FIN_TABS, FinancePage };
