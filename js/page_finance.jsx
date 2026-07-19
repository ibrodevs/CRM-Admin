import { useState, useEffect, useMemo } from 'react';
import { Icon } from './icons';
import { Button, Drawer, EmptyState, Field, FilterChip, Input, Pill, SearchBox, Select, Tabs, useToast } from './ui';
import { SERVICE_KIND, CLIENTS_DB, COMPANIES_DB, SUPPLIERS } from './data';
import { UFDateField } from './forms_unified';
import { Topbar } from './layout';
import {
  f$, fSigned, finNow, deltaTone, finCreditCheck,
  FIN_ACCT_GROUPS, FIN_ACCOUNTS, FIN_ACCT_OP_TYPES, acctOps,
  FIN_PAY_STATUS, FIN_PRIORITY, FIN_PAYMENTS, obl, FIN_COUNTERPARTIES, FIN_SCHEMES,
  FIN_CASHFLOW, FIN_RECEIPTS, FIN_SALARY, FIN_RULES, FIN_RECON_STATUS, FIN_RECON, FIN_ACTIONS,
  FIN_SVC_MODEL, sumK, svcClientTotal, svcSupplierPay, svcModelProfit, FIN_ANALYTICS_SLICES,
} from './data/finance';

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
  const W = 640, H = 190, pad = 28, bw = (W - pad * 2) / data.length;
  const max = Math.max(...data.map((d) => Math.max(d.in, d.out))) * 1.15;
  let bal = startBalance;
  const balances = data.map((d) => (bal += d.in - d.out));
  const bmax = Math.max(...balances) * 1.1, bmin = Math.min(...balances, 0);
  const by = (v) => H - pad - ((v - bmin) / (bmax - bmin)) * (H - pad * 2);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--line-strong)" />
      {data.map((d, i) => {
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

function FinOverview({ onGoTab }) {
  const totalCash = FIN_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const inTransit = FIN_ACCOUNTS.filter((a) => a.group === 'Эквайринг').reduce((s, a) => s + a.reserved, 0);
  const bySrc = (g) => FIN_ACCOUNTS.filter((a) => a.group === g).reduce((s, a) => s + a.balance, 0);
  const receivable = FIN_COUNTERPARTIES.filter((c) => c.type === 'client').reduce((s, c) => s + c.debt, 0);
  const payable = FIN_COUNTERPARTIES.filter((c) => c.type === 'supplier').reduce((s, c) => s + c.debt, 0);
  const expected = FIN_RECEIPTS.filter((r) => !r.overdue).reduce((s, r) => s + r.sum, 0);
  const planned = FIN_PAYMENTS.filter((p) => p.dir === 'out' && !['Исполнено', 'Отменено', 'Возвращено'].includes(p.status)).reduce((s, p) => s + p.sum, 0);
  const overdue = FIN_RECEIPTS.filter((r) => r.overdue).reduce((s, r) => s + r.sum, 0);
  const profit = FIN_CASHFLOW.reduce((s, d) => s + (d.in - d.out), 0);
  const serviceFees = 2140;
  const recent = FIN_PAYMENTS.slice(0, 5);

  return (
    <div className="fade-in">
      {overdue > 0 && <WarnBanner tone="red" title={'Просроченная дебиторская задолженность: ' + f$(overdue)}
        text="2 контрагента вышли за срок оплаты — рекомендуется напоминание и проверка кредитных условий."
        action={<Button size="sm" variant="secondary" onClick={() => onGoTab('settlements')}>К взаиморасчётам</Button>} />}
      <WarnBanner tone="amber" icon="alertCircle" title="Риск кассового разрыва 20–22 июля"
        text={'К выплате ' + f$(planned) + ', ожидаемые поступления ' + f$(expected) + '. Проверьте приоритеты платежей в казначействе.'}
        action={<Button size="sm" variant="secondary" onClick={() => onGoTab('treasury')}>В казначейство</Button>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12, marginBottom: 12 }}>
        <StatTile label="Общий остаток ДС" value={f$(totalCash)} icon="finance" accent="var(--green)" sub="по всем источникам" onClick={() => onGoTab('balance')} />
        <StatTile label="Расчётные счета" value={f$(bySrc('Расчётные счета'))} icon="bank" onClick={() => onGoTab('balance')} />
        <StatTile label="Корп. карты" value={f$(bySrc('Корпоративные карты'))} icon="finance" onClick={() => onGoTab('balance')} />
        <StatTile label="Касса" value={f$(bySrc('Касса'))} icon="calc" onClick={() => onGoTab('balance')} />
        <StatTile label="Эл. кошельки" value={f$(bySrc('Электронные кошельки'))} icon="globe" onClick={() => onGoTab('balance')} />
        <StatTile label="ДС в пути (эквайринг)" value={f$(inTransit)} icon="swap" tone="var(--teal)" sub="зачисление T+1" />
        <StatTile label="Дебиторская задолженность" value={f$(receivable)} icon="arrowUpRight" tone="var(--amber)" onClick={() => onGoTab('settlements')} />
        <StatTile label="Кредиторская задолженность" value={f$(payable)} icon="arrowUpRight" tone="var(--red)" onClick={() => onGoTab('settlements')} />
        <StatTile label="Ожидаемые поступления" value={f$(expected)} icon="calendar" tone="var(--green)" onClick={() => onGoTab('settlements')} />
        <StatTile label="Запланированные выплаты" value={f$(planned)} icon="calendar" tone="var(--red)" onClick={() => onGoTab('treasury')} />
        <StatTile label="Текущая прибыль (период)" value={f$(profit)} icon="pie" tone="var(--green)" onClick={() => onGoTab('analytics')} />
        <StatTile label="Сервисные сборы (месяц)" value={f$(serviceFees)} icon="sparkles" onClick={() => onGoTab('economics')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 12, alignItems: 'start' }}>
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>Движение денежных средств</h3>
            <div style={{ display: 'flex', gap: 14 }}><LegendDot color="var(--green)" label="Приход" /><LegendDot color="var(--red)" label="Расход" /><LegendDot color="var(--blue-soft-text)" label="Остаток" /></div>
          </div>
          <CashflowChart data={FIN_CASHFLOW} />
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Платёжный календарь</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {[...FIN_RECEIPTS.map((r) => ({ dir: 'in', date: r.date, party: r.party, sum: r.sum, overdue: r.overdue })),
              ...FIN_PAYMENTS.filter((p) => p.dir === 'out').map((p) => ({ dir: 'out', date: p.plan, party: p.party, sum: p.sum, overdue: false }))]
              .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6).map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.dir === 'in' ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--muted-2)', width: 78, flexShrink: 0 }}>{e.date}</span>
                  <span style={{ flex: 1, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.party}</span>
                  <span style={{ fontWeight: 700, color: e.overdue ? 'var(--red)' : e.dir === 'in' ? 'var(--green)' : 'var(--body)' }}>{e.dir === 'in' ? '+' : '−'}{f$(e.sum).replace(' $', '')} $</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 className="card-title" style={{ fontSize: 16 }}>Последние финансовые операции</h3>
          <Button size="sm" variant="secondary" onClick={() => onGoTab('payments')}>Все платежи</Button>
        </div>
        <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
          <table className="tbl">
            <thead><tr><th>Платёж</th><th>Дата</th><th>Контрагент</th><th>Назначение</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Статус</th></tr></thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.no}>
                  <td style={{ fontWeight: 600 }}>{p.no}</td><td>{p.date}</td><td>{p.party}</td>
                  <td style={{ color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.purpose}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: p.dir === 'in' ? 'var(--green)' : 'var(--body)' }}>{p.dir === 'in' ? '+' : '−'}{f$(p.sum)}</td>
                  <td><Pill tone={FIN_PAY_STATUS[p.status]}>{p.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FinAccountDrawer({ ac, onClose }) {
  const ops = acctOps(ac);
  return (
    <Drawer open={!!ac} onClose={onClose} title={ac.name} sub={ac.bank !== '—' ? ac.bank + ' · ' + ac.number : ac.number} width="min(760px,96vw)">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatTile label="Текущий остаток" value={f$(ac.balance)} />
        <StatTile label="Доступно" value={f$(ac.available)} tone="var(--green)" />
        <StatTile label="Зарезервировано" value={f$(ac.reserved)} tone={ac.reserved ? 'var(--amber)' : undefined} />
      </div>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <FinRow label="Банк" value={ac.bank} /><FinRow label="Номер / идентификатор" value={ac.number} />
        <FinRow label="Валюта" value={ac.currency} /><FinRow label="Несопоставленные операции" value={ac.unmatched} tone={ac.unmatched ? 'var(--amber)' : undefined} />
        <FinRow label="Последняя синхронизация" value={ac.synced} />
        {ac.note && <FinRow label="Примечание" value={ac.note} />}
      </div>
      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 10 }}>История операций по счёту</h3>
      <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
        <table className="tbl">
          <thead><tr><th>Дата · время</th><th>Тип</th><th>Контрагент</th><th>Заказ · услуга</th><th>Документ</th><th style={{ textAlign: 'right' }}>Сумма</th><th style={{ textAlign: 'right' }}>Остаток</th><th>Статус</th></tr></thead>
          <tbody>
            {ops.map((o, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>{o.date}<div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>{o.time}</div></td>
                <td>{o.type}</td><td>{o.party}</td>
                <td style={{ fontSize: 12.5 }}>№ {o.order}<div style={{ color: 'var(--muted-2)' }}>{o.service}</div></td>
                <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{o.doc}<div style={{ color: 'var(--muted-2)' }}>{o.resp}</div></td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: deltaTone(o.sum) }}>{fSigned(o.sum)}</td>
                <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{f$(o.balanceAfter)}</td>
                <td><Pill tone={o.status === 'Проведено' ? 'green' : 'amber'}>{o.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}
function FinBalance() {
  const [open, setOpen] = useState(null);
  const total = FIN_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const available = FIN_ACCOUNTS.reduce((s, a) => s + a.available, 0);
  const reserved = FIN_ACCOUNTS.reduce((s, a) => s + a.reserved, 0);
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
        <StatTile label="Всего денежных средств" value={f$(total)} tone="var(--green)" icon="finance" />
        <StatTile label="Доступно" value={f$(available)} icon="check" />
        <StatTile label="Зарезервировано / в пути" value={f$(reserved)} tone="var(--amber)" icon="clock" />
        <StatTile label="Несопоставлено операций" value={FIN_ACCOUNTS.reduce((s, a) => s + a.unmatched, 0)} tone="var(--amber)" icon="alertCircle" />
      </div>
      {FIN_ACCT_GROUPS.map((g) => {
        const accs = FIN_ACCOUNTS.filter((a) => a.group === g.key);
        if (!accs.length) return null;
        const sum = accs.reduce((s, a) => s + a.balance, 0);
        return (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name={g.icon} style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
              <h3 className="card-title" style={{ fontSize: 15 }}>{g.key}</h3>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>· {f$(sum)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
              {accs.map((a) => (
                <div key={a.id} className="card card-pad" style={{ cursor: 'pointer', padding: '16px 18px' }} onClick={() => setOpen(a)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.bank !== '—' ? a.bank + ' · ' : ''}{a.number}</div></div>
                    {a.unmatched > 0 && <Pill tone="amber">{a.unmatched} несопост.</Pill>}
                  </div>
                  <div className="s-value" style={{ fontSize: 22, marginBottom: 8 }}>{f$(a.balance)}</div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--muted)' }}>
                    <span>Доступно: <b style={{ color: 'var(--green)' }}>{f$(a.available)}</b></span>
                    {a.reserved > 0 && <span>Резерв: <b style={{ color: 'var(--amber)' }}>{f$(a.reserved)}</b></span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 8 }}>Синхронизация: {a.synced}{a.note ? ' · ' + a.note : ''}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {open && <FinAccountDrawer ac={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function FinPaymentDrawer({ p, onClose }) {
  const svcSum = p.services.reduce((s, x) => s + x.sum, 0);
  const feeSum = p.fees.reduce((s, x) => s + x.sum, 0);
  return (
    <Drawer open={!!p} onClose={onClose} title={p.no} sub={(p.dir === 'in' ? 'Входящий' : 'Исходящий') + ' платёж · ' + p.date}
      footer={<div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <Button variant="secondary" style={{ flex: 1 }} icon="download">Платёжное поручение</Button>
        <Button style={{ flex: 1 }} icon="check">Провести</Button>
      </div>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="s-value" style={{ fontSize: 26, color: p.dir === 'in' ? 'var(--green)' : 'var(--ink)' }}>{p.dir === 'in' ? '+' : '−'}{f$(p.sum)}</span>
        <Pill tone={FIN_PAY_STATUS[p.status]}>{p.status}</Pill>
        <Pill tone={FIN_PRIORITY[p.priority]}>Приоритет: {p.priority}</Pill>
      </div>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <FinRow label={p.dir === 'in' ? 'Отправитель' : 'Получатель'} value={p.party} />
        <FinRow label="Реквизиты" value={p.requisites} /><FinRow label="Назначение платежа" value={p.purpose} />
        <FinRow label="Связанный заказ" value={p.order ? '№ ' + p.order : '—'} />
        <FinRow label={p.dir === 'in' ? 'Клиент' : 'Поставщик'} value={p.dir === 'in' ? p.client : p.supplier} />
        <FinRow label="Ответственный" value={p.resp} /><FinRow label="Плановая дата" value={p.plan} />
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Оплачиваемые услуги</h3>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        {p.services.map((s, i) => <FinRow key={i} label={s.t} value={f$(s.sum)} />)}
        {p.fees.map((s, i) => <FinRow key={'f' + i} label={s.t} value={f$(s.sum)} tone="var(--amber)" />)}
        <FinRow label="Итого" value={f$(svcSum + feeSum)} strong />
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Документы-основания</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {p.docs.map((d, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '6px 11px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)' }}><Icon name="docs" style={{ width: 13, height: 13, color: 'var(--muted-2)' }} />{d}</span>)}
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Журнал согласования</h3>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        {p.approvals.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Согласование не требуется для этого типа платежа.</div>}
        {p.approvals.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < p.approvals.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <Icon name={a.ok === true ? 'checkCircle' : a.ok === false ? 'x' : 'clock'} style={{ width: 16, height: 16, color: a.ok === true ? 'var(--green)' : a.ok === false ? 'var(--red)' : 'var(--amber)' }} />
            <span style={{ flex: 1, fontSize: 13 }}>{a.who}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{a.at || 'ожидает'}</span>
          </div>
        ))}
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>История изменений</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {p.history.map((h, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--body)' }}><span style={{ color: 'var(--muted-2)', marginRight: 6 }}>{h.t}</span>{h.text} · <span style={{ color: 'var(--muted)' }}>{h.who}</span></div>)}
      </div>
    </Drawer>
  );
}
const FIN_OPERATORS = ['Даниель', 'Азамат А.', 'Куба', 'Айсулуу', 'Бухгалтерия'];
const FIN_CURRENCIES = ['USD', 'KGS', 'RUB', 'EUR', 'KZT'];
let FIN_PMT_SEQ = 5047;

const uniqBy = (arr, key) => { const seen = new Set(); return arr.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true))); };
const FIN_CLIENT_ROWS = uniqBy([
  ...COMPANIES_DB.map((c) => ({ name: c.name, sub: c.type + (c.inn ? ' · ИНН ' + c.inn : ''), icon: 'building', tone: 'var(--blue)' })),
  ...CLIENTS_DB.map((c) => ({ name: c.name, sub: c.type + (c.city ? ' · ' + c.city : '') + (c.company && c.company !== '—' ? ' · ' + c.company : ''), icon: 'user', tone: 'var(--green)' })),
], (r) => r.name);
const FIN_SUPPLIER_ROWS = uniqBy([
  ...FIN_COUNTERPARTIES.filter((c) => c.type === 'supplier').map((c) => ({ name: c.name, sub: 'Поставщик · ' + c.scheme, icon: 'suppliers', tone: 'var(--amber)' })),
  ...SUPPLIERS.map((s) => ({ name: s.name, sub: [s.service, s.org].filter((x) => x && x !== s.name).join(' · '), icon: 'suppliers', tone: 'var(--amber)' })),
], (r) => r.name);
const FIN_SERVICE_ROWS = Object.entries(SERVICE_KIND).map(([k, v]) => ({ name: k, sub: 'Вид услуги', icon: v.icon, tone: v.color }));

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
          <button key={r.name} type="button" onClick={() => onPick(r.name)}
            style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: value === r.name ? 'var(--surface-2)' : '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="oc-svc-ic" style={{ background: r.tone || 'var(--blue)', width: 34, height: 34, borderRadius: 10, flexShrink: 0 }}><Icon name={r.icon || 'briefcase'} style={{ width: 17, height: 17 }} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
              {r.sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</span>}
            </span>
            {value === r.name && <Icon name="check" style={{ width: 18, height: 18, color: 'var(--blue)' }} />}
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

function NewPaymentDrawer({ open, onClose, onCreate }) {
  const toast = useToast();
  const [dir, setDir] = useState('in');
  const [party, setParty] = useState('');
  const [sum, setSum] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [purpose, setPurpose] = useState('');
  const [order, setOrder] = useState('');
  const [plan, setPlan] = useState('');
  const [resp, setResp] = useState('Даниель');
  const [priority, setPriority] = useState('Средний');
  const [status, setStatus] = useState('Черновик');
  const [services, setServices] = useState([{ t: '', sum: '' }]);
  const [docs, setDocs] = useState([]);
  const [docDraft, setDocDraft] = useState('');
  const [err, setErr] = useState({});
  const [pickParty, setPickParty] = useState(false);
  const [pickSvc, setPickSvc] = useState(null);

  const reset = () => {
    setDir('in'); setParty(''); setSum(''); setCurrency('USD'); setPurpose(''); setOrder('');
    setPlan(''); setResp('Даниель'); setPriority('Средний'); setStatus('Черновик');
    setServices([{ t: '', sum: '' }]); setDocs([]); setDocDraft(''); setErr({});
    setPickParty(false); setPickSvc(null);
  };
  const close = () => { reset(); onClose(); };

  const svcSum = services.reduce((s, x) => s + (Number(x.sum) || 0), 0);
  const total = Number(sum) || svcSum;

  const setSvc = (i, k, v) => setServices((arr) => arr.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const addSvc = () => setServices((arr) => [...arr, { t: '', sum: '' }]);
  const rmSvc = (i) => setServices((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));
  const addDoc = () => { const d = docDraft.trim(); if (!d) return; setDocs((x) => [...x, d]); setDocDraft(''); };

  const submit = () => {
    const e = {};
    if (!party.trim()) e.party = 'Укажите контрагента';
    if (!(total > 0)) e.sum = 'Сумма должна быть больше 0';
    setErr(e);
    if (Object.keys(e).length) { toast('Заполните обязательные поля', 'err'); return; }
    const now = finNow();
    const stamp = now.slice(0, 5) + ' · ' + now.slice(-5);
    const filledSvc = services.filter((s) => s.t.trim() || Number(s.sum) > 0)
      .map((s) => ({ t: s.t.trim() || 'Услуга', sum: Number(s.sum) || 0 }));
    const needApprove = dir === 'out' && total >= 1000;
    const pmt = {
      no: 'PMT-' + FIN_PMT_SEQ++,
      dir, date: now.slice(0, 10), plan: plan.trim() || now.slice(0, 10),
      party: party.trim(), requisites: '—', sum: total, currency,
      purpose: purpose.trim() || (dir === 'in' ? 'Поступление от ' + party.trim() : 'Оплата ' + party.trim()),
      order: order.trim() || null,
      supplier: dir === 'out' ? party.trim() : '—', client: dir === 'in' ? party.trim() : '—',
      resp, priority, status,
      services: filledSvc.length ? filledSvc : [{ t: purpose.trim() || 'Платёж', sum: total }],
      fees: [], docs,
      history: [{ t: stamp, text: 'Платёж создан вручную', who: resp }],
      approvals: needApprove ? [{ who: 'Старший оператор', at: null, ok: null }, { who: 'Финансовый контроль', at: null, ok: null }] : [],
    };
    onCreate(pmt);
    toast('Платёж ' + pmt.no + ' создан', 'ok');
    reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={close} title="Новый платёж" sub="Финансы · Платежи · создание вручную" width="min(720px,96vw)"
      footer={<div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <Button variant="secondary" style={{ flex: 1 }} onClick={close}>Отмена</Button>
        <Button style={{ flex: 2 }} icon="check" onClick={submit}>Создать платёж</Button>
      </div>}>
      <Field label="Направление платежа" required>
        <Tabs tabs={[{ key: 'in', label: 'Входящий (поступление)' }, { key: 'out', label: 'Исходящий (выплата)' }]} value={dir}
          onChange={(v) => { setDir(v); setParty(''); }} />
      </Field>
      <Field label={dir === 'in' ? 'Клиент' : 'Поставщик'} required error={err.party}
        hint={dir === 'in' ? 'Выберите клиента из справочника' : 'Выберите поставщика из справочника'}>
        <FinPickerField value={party} error={err.party} icon={dir === 'in' ? 'user' : 'suppliers'}
          placeholder={dir === 'in' ? 'Выбрать клиента…' : 'Выбрать поставщика…'} onOpen={() => setPickParty(true)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label="Сумма" required error={err.sum}>
          <Input type="number" value={sum} onChange={(e) => setSum(e.target.value)} error={err.sum}
            placeholder={svcSum > 0 ? String(svcSum) + ' (из услуг)' : '0'} />
        </Field>
        <Field label="Валюта"><Select value={currency} onChange={(e) => setCurrency(e.target.value)} options={FIN_CURRENCIES} /></Field>
      </div>
      <Field label="Назначение платежа">
        <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Напр.: Оплата по счёту № 6152" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Заказ (необязательно)"><Input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="№ заказа" /></Field>
        <UFDateField label="Плановая дата" value={plan || null} onChange={(v) => setPlan(v || '')} placeholder="дд.мм.гггг" />
      </div>

      <Field label="Услуги (можно несколько)" hint="Выберите вид услуги из справочника и укажите сумму">
        <div style={{ display: 'grid', gap: 8 }}>
          {services.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <FinPickerField value={s.t} icon="briefcase" placeholder="Выбрать услугу…" onOpen={() => setPickSvc(i)} />
              </div>
              <Input type="number" value={s.sum} onChange={(e) => setSvc(i, 'sum', e.target.value)} placeholder="Сумма" style={{ width: 120 }} />
              <Button size="sm" variant="secondary" icon="trash" onClick={() => rmSvc(i)} disabled={services.length <= 1} />
            </div>
          ))}
          <div><Button size="sm" variant="secondary" icon="plus" onClick={addSvc}>Добавить услугу</Button></div>
          {svcSum > 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'right' }}>Сумма услуг: <b style={{ color: 'var(--ink)' }}>{f$(svcSum)}</b></div>}
        </div>
      </Field>

      <Field label="Документы-основания">
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={docDraft} onChange={(e) => setDocDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDoc(); } }}
            placeholder="Счёт, акт, инвойс, заявление…" style={{ flex: 1 }} />
          <Button size="sm" variant="secondary" icon="plus" onClick={addDoc}>Добавить</Button>
        </div>
        {docs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {docs.map((d, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '5px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <Icon name="docs" style={{ width: 13, height: 13, color: 'var(--muted-2)' }} />{d}
                <Icon name="x" style={{ width: 13, height: 13, color: 'var(--muted-2)', cursor: 'pointer' }} onClick={() => setDocs((x) => x.filter((_, idx) => idx !== i))} />
              </span>
            ))}
          </div>
        )}
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Ответственный"><Select value={resp} onChange={(e) => setResp(e.target.value)} options={FIN_OPERATORS} /></Field>
        <Field label="Приоритет"><Select value={priority} onChange={(e) => setPriority(e.target.value)} options={Object.keys(FIN_PRIORITY)} /></Field>
        <Field label="Статус согласования"><Select value={status} onChange={(e) => setStatus(e.target.value)} options={Object.keys(FIN_PAY_STATUS)} /></Field>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
        Итого к {dir === 'in' ? 'поступлению' : 'выплате'}: <b style={{ color: dir === 'in' ? 'var(--green)' : 'var(--ink)' }}>{f$(total)}</b>
        {dir === 'out' && total >= 1000 ? ' · потребуется согласование' : ''}
      </div>

      <FinPickerDrawer open={pickParty} value={party}
        title={dir === 'in' ? 'Выбор клиента' : 'Выбор поставщика'}
        sub={dir === 'in' ? 'Плательщик по входящему платежу' : 'Получатель исходящего платежа'}
        placeholder={dir === 'in' ? 'Поиск клиента' : 'Поиск поставщика'}
        rows={dir === 'in' ? FIN_CLIENT_ROWS : FIN_SUPPLIER_ROWS}
        onClose={() => setPickParty(false)} onPick={(name) => { setParty(name); setPickParty(false); }} />
      <FinPickerDrawer open={pickSvc !== null} value={pickSvc !== null ? services[pickSvc].t : ''}
        title="Выбор услуги" sub="Вид услуги для оплаты" placeholder="Поиск услуги" rows={FIN_SERVICE_ROWS}
        onClose={() => setPickSvc(null)} onPick={(name) => { setSvc(pickSvc, 't', name); setPickSvc(null); }} />
    </Drawer>
  );
}

function FinPayments() {
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const [extra, setExtra] = useState([]);
  const [dir, setDir] = useState('all');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const all = [...extra, ...FIN_PAYMENTS];
  const ql = q.trim().toLowerCase();
  const list = all.filter((p) => (dir === 'all' || p.dir === dir) && (!status || p.status === status)
    && (!ql || [p.no, p.party, p.purpose, p.order, p.resp].some((v) => String(v || '').toLowerCase().includes(ql))));
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Tabs tabs={[{ key: 'all', label: 'Все' }, { key: 'in', label: 'Входящие' }, { key: 'out', label: 'Исходящие' }]} value={dir} onChange={setDir} />
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: №, контрагент, заказ, назначение" style={{ minWidth: 260 }} />
        <div style={{ flex: 1 }} />
        <FilterChip label="Статус" value={status} onChange={setStatus} options={Object.keys(FIN_PAY_STATUS)} />
        <Button icon="plus" onClick={() => setCreating(true)}>Новый платёж</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>№</th><th>Дата</th><th>Направление</th><th>Контрагент</th><th>Заказ</th><th>Назначение</th><th>Ответственный</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Приоритет</th><th>Статус</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.no} style={{ cursor: 'pointer' }} onClick={() => setOpen(p)}>
                <td style={{ fontWeight: 600 }}>{p.no}</td><td>{p.date}</td>
                <td><Pill tone={p.dir === 'in' ? 'green' : 'gray'}>{p.dir === 'in' ? 'Входящий' : 'Исходящий'}</Pill></td>
                <td>{p.party}</td><td>{p.order ? '№ ' + p.order : '—'}</td>
                <td style={{ color: 'var(--muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.purpose}</td>
                <td>{p.resp}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: p.dir === 'in' ? 'var(--green)' : 'var(--body)' }}>{p.dir === 'in' ? '+' : '−'}{f$(p.sum)}</td>
                <td><Pill tone={FIN_PRIORITY[p.priority]}>{p.priority}</Pill></td>
                <td><Pill tone={FIN_PAY_STATUS[p.status]}>{p.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <FinPaymentDrawer p={open} onClose={() => setOpen(null)} />}
      <NewPaymentDrawer open={creating} onClose={() => setCreating(false)} onCreate={(p) => setExtra((x) => [p, ...x])} />
    </div>
  );
}

function FinTreasury() {
  const toast = useToast();
  const startBalance = FIN_ACCOUNTS.filter((a) => a.group !== 'Депозиты').reduce((s, a) => s + a.available, 0);
  const [prio, setPrio] = useState(() => FIN_PAYMENTS.filter((p) => p.dir === 'out').reduce((m, p) => (m[p.no] = p.priority, m), {}));
  const planned = FIN_PAYMENTS.filter((p) => p.dir === 'out' && !['Исполнено', 'Отменено', 'Возвращено'].includes(p.status));
  const incoming = FIN_RECEIPTS.slice().sort((a, b) => a.date.localeCompare(b.date));
  const totalOut = planned.reduce((s, p) => s + p.sum, 0);
  const totalIn = incoming.filter((r) => !r.overdue).reduce((s, r) => s + r.sum, 0);
  const forecast = startBalance + totalIn - totalOut;
  const order = { 'Высокий': 0, 'Средний': 1, 'Низкий': 2 };
  const sorted = planned.slice().sort((a, b) => order[prio[a.no]] - order[prio[b.no]] || a.plan.localeCompare(b.plan));
  let run = startBalance + totalIn;
  const withRunning = sorted.map((p) => { run -= p.sum; return { ...p, after: run }; });
  const gap = withRunning.some((p) => p.after < 0);
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12, marginBottom: 14 }}>
        <StatTile label="Доступно сейчас" value={f$(startBalance)} icon="finance" />
        <StatTile label="Ожидаемые поступления" value={f$(totalIn)} tone="var(--green)" icon="arrowUpRight" />
        <StatTile label="К выплате (план)" value={f$(totalOut)} tone="var(--red)" icon="arrowUpRight" />
        <StatTile label="Прогноз остатка" value={f$(forecast)} tone={forecast < 0 ? 'var(--red)' : 'var(--green)'} icon="pie" sub="после всех платежей" />
      </div>
      {gap && <WarnBanner tone="red" title="Прогнозируется кассовый разрыв"
        text="При текущем графике доступных средств не хватит на все запланированные выплаты. Понизьте приоритет части платежей или перенесите даты." />}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Планирование выплат</h3>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>Платежи выстроены по приоритету. Прогноз остатка пересчитывается на лету.</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {withRunning.map((p) => (
              <div key={p.no} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: p.after < 0 ? 'var(--red-bg)' : '#fff' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{p.party}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.no} · план {p.plan} · заказ {p.order || '—'}</div>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--red)' }}>−{f$(p.sum)}</span>
                <Select value={prio[p.no]} onChange={(e) => setPrio((m) => ({ ...m, [p.no]: e.target.value }))} options={Object.keys(FIN_PRIORITY)} style={{ width: 'auto', minWidth: 120 }} />
                <span style={{ width: 96, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: p.after < 0 ? 'var(--red)' : 'var(--muted)' }}>ост. {f$(p.after)}</span>
              </div>
            ))}
          </div>
          <Button size="sm" style={{ marginTop: 12 }} icon="check" onClick={() => toast('График платежей сохранён', 'ok')}>Утвердить график</Button>
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Прогнозная картина</h3>
          <FinRow label="Остаток на начало" value={f$(startBalance)} />
          <FinRow label="Поступит" value={'+' + f$(totalIn)} tone="var(--green)" />
          <FinRow label="Необходимо выплатить" value={'−' + f$(totalOut)} tone="var(--red)" />
          <FinRow label="Ожидаемый остаток" value={f$(forecast)} tone={forecast < 0 ? 'var(--red)' : 'var(--green)'} strong />
          <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--muted)' }}>Ближайшие поступления</div>
          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
            {incoming.slice(0, 4).map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
                <span style={{ color: 'var(--muted-2)', width: 76 }}>{r.date}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.party}</span>
                <span style={{ fontWeight: 700, color: r.overdue ? 'var(--red)' : 'var(--green)' }}>+{f$(r.sum)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreditLimitBar({ used, limit }) {
  if (!limit) return <div style={{ fontSize: 12, color: 'var(--muted)' }}>Лимит не установлен (работа по факту)</div>;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--muted)' }}>Использован лимит</span><span style={{ fontWeight: 700, color: tone }}>{f$(used)} / {f$(limit)} · {pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: tone }} /></div>
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
    kind: reconKindOf(o.doc), resp: null, debit: o.sum, credit: 0, dir: 'debit',
  }));
  // Кредит — оплаты из платежей по этому контрагенту (реальные даты / услуга / ответственный)
  (typeof FIN_PAYMENTS !== 'undefined' ? FIN_PAYMENTS : []).forEach((p) => {
    if (p.party !== cp.name) return;
    const svc = (p.services && p.services[0] && p.services[0].t) || p.purpose;
    ops.push({
      date: reconParseDate(p.date), dateLabel: p.date, basis: p.purpose, order: p.order,
      kind: reconKindOf(svc), resp: p.resp, debit: 0, credit: p.sum, dir: 'credit', doc: p.no,
    });
  });
  return ops.sort((a, b) => (a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0));
}

function ReconActContent({ cp }) {
  const toast = useToast();
  const ops = useMemo(() => reconOperations(cp), [cp]);
  const dts = ops.map((o) => o.date).filter(Boolean).map((d) => d.getTime());
  const dmin = dts.length ? new Date(Math.min(...dts)) : null;
  const dmax = dts.length ? new Date(Math.max(...dts)) : null;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState('all');
  const [resp, setResp] = useState('all');
  const [built, setBuilt] = useState(false);
  useEffect(() => { setFrom(reconFmtDate(dmin)); setTo(reconFmtDate(dmax)); setKind('all'); setResp('all'); setBuilt(false); }, [cp]);
  if (!cp) return null;

  const kindOptions = Array.from(new Set(ops.map((o) => o.kind)));
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
  const act = (verb) => toast('Акт сверки по «' + cp.name + '» (' + rows.length + ' операций) ' + verb, 'ok');

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
            <Select value={resp} onChange={(e) => { setResp(e.target.value); setBuilt(false); }}
              options={[{ value: 'all', label: 'Вся компания' }, ...respOptions.map((r) => ({ value: r, label: r }))]} />
          </Field>
        </div>
        <Button icon="check" style={{ marginTop: 12 }} onClick={() => setBuilt(true)}>Сформировать акт</Button>
      </div>

      {built ? (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 12 }}>
            <StatTile label="Дебет (начислено)" value={f$(debit)} />
            <StatTile label="Кредит (оплачено)" value={f$(credit)} tone="var(--green)" />
            <StatTile label="Сальдо (остаток)" value={f$(balance)} tone={balance > 0 ? 'var(--amber)' : 'var(--green)'} />
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
                    <td style={{ textAlign: 'right' }}>{o.debit ? f$(o.debit) : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--green)' }}>{o.credit ? f$(o.credit) : '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '18px 0' }}>Нет операций под выбранные параметры</td></tr>}
              </tbody>
              {rows.length > 0 && (
                <tfoot><tr style={{ fontWeight: 700 }}>
                  <td colSpan={5} style={{ textAlign: 'right' }}>Итого:</td>
                  <td style={{ textAlign: 'right' }}>{f$(debit)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)' }}>{f$(credit)}</td>
                </tr></tfoot>
              )}
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Button variant="secondary" icon="download" onClick={() => act('сформирован (демо)')}>Скачать</Button>
            <Button variant="secondary" icon="send" onClick={() => act('отправлен контрагенту (демо)')}>Отправить контрагенту</Button>
            <Button icon="send" onClick={() => act('передан в 1С:Бухгалтерию (демо)')}>В бухгалтерию</Button>
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

function ReconActDrawer({ open, cp, onClose }) {
  if (!open || !cp) return null;
  return (
    <Drawer open={open} onClose={onClose} title="Акт сверки" sub={cp.name + ' · ' + (cp.type === 'client' ? 'клиент' : 'поставщик')} width="min(760px,97vw)"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <ReconActContent cp={cp} key={cp.id} />
    </Drawer>
  );
}

function FinReconciliation() {
  const [type, setType] = useState('client');
  const [cpId, setCpId] = useState('');
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const list = FIN_COUNTERPARTIES.filter((c) => c.type === type)
    .filter((c) => !ql || (c.name + ' ' + c.legal).toLowerCase().includes(ql));
  const cp = FIN_COUNTERPARTIES.find((c) => c.id === cpId && c.type === type) || null;
  return (
    <div className="fade-in">
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <Tabs tabs={[{ key: 'client', label: 'Клиенты' }, { key: 'supplier', label: 'Поставщики' }]} value={type} onChange={(v) => { setType(v); setCpId(''); }} />
          <SearchBox value={q} onChange={setQ} placeholder="Поиск контрагента" style={{ minWidth: 240 }} />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Выберите контрагента для акта сверки</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => setCpId(c.id)}
              style={{ cursor: 'pointer', textAlign: 'left', border: '1px solid ' + (cpId === c.id ? 'var(--blue)' : 'var(--line)'), background: cpId === c.id ? 'var(--blue-soft)' : '#fff', borderRadius: 12, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="oc-svc-ic" style={{ background: c.type === 'client' ? 'var(--blue)' : 'var(--amber)', width: 32, height: 32, flex: '0 0 32px' }}><Icon name={c.type === 'client' ? 'user' : 'suppliers'} style={{ width: 16, height: 16 }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.scheme} · долг {f$(c.debt)}</div>
              </div>
              {cpId === c.id && <Icon name="check" style={{ width: 16, height: 16, color: 'var(--blue)', flex: '0 0 16px' }} />}
            </button>
          ))}
          {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Ничего не найдено</div>}
        </div>
      </div>
      {cp
        ? <ReconActContent cp={cp} key={cp.id} />
        : <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
            <Icon name="finance" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
            Выберите контрагента выше — откроются параметры и формирование акта сверки за период / по услуге / по сотруднику.
          </div>}
    </div>
  );
}

function FinCounterpartyDrawer({ cp, onClose }) {
  const toast = useToast();
  const [reconOpen, setReconOpen] = useState(false);
  const free = Math.max(0, cp.limit - cp.used);
  const debit = cp.obligations.reduce((s, o) => s + o.sum, 0);
  const credit = cp.obligations.reduce((s, o) => s + o.paid, 0);
  const exp = (kind) => toast(kind + ' по «' + cp.name + '» сформирован (демо)', 'ok');
  return (
    <Drawer open={!!cp} onClose={onClose} title={cp.name} sub={(cp.type === 'client' ? 'Клиент' : 'Поставщик') + ' · ' + cp.legal} width="min(780px,96vw)"
      footer={<div style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" icon="download" onClick={() => setReconOpen(true)} style={{ flex: 1 }}>Акт сверки</Button>
        <Button variant="secondary" size="sm" icon="download" onClick={() => exp('Счёт')} style={{ flex: 1 }}>Счёт</Button>
        <Button variant="secondary" size="sm" icon="download" onClick={() => exp('УПД')} style={{ flex: 1 }}>УПД</Button>
        <Button size="sm" icon="send" onClick={() => toast('Данные переданы в 1С:Бухгалтерию (демо)', 'ok')} style={{ flex: 1.4 }}>В бухгалтерию</Button>
      </div>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        <StatTile label={cp.type === 'client' ? 'Задолженность клиента' : 'Наш долг поставщику'} value={f$(cp.debt)} tone={cp.debt ? 'var(--amber)' : 'var(--green)'} />
        <StatTile label="Оплачено" value={f$(cp.paid)} />
        <StatTile label="Свободный лимит" value={cp.limit ? f$(free) : '—'} tone={cp.limit ? 'var(--green)' : undefined} />
      </div>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ fontSize: 14, marginBottom: 10 }}>Финансовые условия · отсрочка</h3>
        <FinRow label="Схема работы" value={cp.scheme} />
        <FinRow label="Отсрочка" value={cp.deferralDays ? cp.deferralDays + ' дн. · ' + cp.deferralStart : '—'} />
        <FinRow label="Кредитный лимит" value={cp.limit ? f$(cp.limit) + ' (' + cp.currency + ')' : 'не установлен'} />
        <FinRow label="Гарантийное письмо" value={cp.guaranteeLetter ? 'требуется' : 'не требуется'} />
        <FinRow label="Согласование при превышении" value={cp.approveOnExceed ? 'обязательно' : 'не требуется'} />
        <div style={{ marginTop: 12 }}><CreditLimitBar used={cp.used} limit={cp.limit} /></div>
      </div>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ fontSize: 14, marginBottom: 10 }}>Детализация по дебету / кредиту</h3>
        <FinRow label="Дебет (начислено по документам)" value={f$(debit)} />
        <FinRow label="Кредит (оплачено)" value={f$(credit)} tone="var(--green)" />
        <FinRow label="Сальдо (остаток)" value={f$(debit - credit)} tone={debit - credit > 0 ? 'var(--amber)' : 'var(--green)'} strong />
      </div>
      <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>График погашения задолженности</h3>
      <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)', marginBottom: 14 }}>
        <table className="tbl">
          <thead><tr><th>Заказ</th><th>Документ</th><th style={{ textAlign: 'right' }}>Сумма</th><th style={{ textAlign: 'right' }}>Оплачено</th><th style={{ textAlign: 'right' }}>Остаток</th><th>Возникло</th><th>Срок</th><th>Дней</th><th>Статус</th></tr></thead>
          <tbody>
            {cp.obligations.map((o, i) => (
              <tr key={i}>
                <td>№ {o.order}</td><td>{o.doc}</td>
                <td style={{ textAlign: 'right' }}>{f$(o.sum)}</td><td style={{ textAlign: 'right', color: 'var(--green)' }}>{f$(o.paid)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{f$(o.rest)}</td>
                <td>{o.since}</td><td>{o.due}</td>
                <td style={{ fontWeight: 700, color: o.overdueDays > 0 ? 'var(--red)' : 'var(--muted)' }}>{o.overdueDays > 0 ? '+' + o.overdueDays + ' проср.' : o.daysToDue + ' дн.'}</td>
                <td><Pill tone={o.status === 'Оплачено' ? 'green' : o.status === 'Просрочено' ? 'red' : 'amber'}>{o.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>История оплат</h3>
          <div className="card card-pad">{cp.payHistory.map((h, i) => <FinRow key={i} label={h.t} value={h.text} />)}</div>
        </div>
        <div>
          <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Счета · акты · заказы</h3>
          <div className="card card-pad" style={{ fontSize: 12.5, color: 'var(--body)', display: 'grid', gap: 6 }}>
            {cp.invoices.map((x, i) => <div key={'i' + i}><Icon name="finance" style={{ width: 12, height: 12, verticalAlign: -1, color: 'var(--muted-2)' }} /> {x}</div>)}
            {cp.acts.map((x, i) => <div key={'a' + i}><Icon name="template" style={{ width: 12, height: 12, verticalAlign: -1, color: 'var(--muted-2)' }} /> {x}</div>)}
            <div style={{ color: 'var(--muted)' }}>Заказы: {cp.orders.map((o) => '№ ' + o).join(', ')}</div>
          </div>
        </div>
      </div>
      {cp.type === 'supplier' && <SupplierSettlements cp={cp} />}
      <ReconActDrawer open={reconOpen} cp={cp} onClose={() => setReconOpen(false)} />
    </Drawer>
  );
}
function SupplierSettlements({ cp }) {
  const toast = useToast();
  const [ops, setOps] = useState([
    { t: '28.06.2026', kind: 'Аванс', sum: 1000, note: 'Предоплата по договору' },
    { t: '05.07.2026', kind: 'Доплата', sum: 240, note: 'Доплата за доп. номера' },
    { t: '10.07.2026', kind: 'Возврат', sum: -120, note: 'Возврат за отменённый номер' },
  ]);
  const add = (kind) => {
    const operationAmounts = { 'Аванс': 500, 'Доплата': 180, 'Возврат': -90, 'Взаимозачёт': -260 };
    setOps((o) => [{ t: finNow().slice(0, 10), kind, sum: operationAmounts[kind], note: kind === 'Взаимозачёт' ? 'Зачёт встречных требований' : 'Операция оператора' }, ...o]);
    toast(kind + ' проведён', 'ok');
  };
  const kindTone = { 'Аванс': 'blue', 'Доплата': 'amber', 'Возврат': 'teal', 'Взаимозачёт': 'gray' };
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <h3 className="card-title" style={{ fontSize: 14 }}>Расчёты с локальным поставщиком</h3>
        <div style={{ flex: 1 }} />
        {['Аванс', 'Доплата', 'Возврат', 'Взаимозачёт'].map((k) => <Button key={k} size="sm" variant="secondary" onClick={() => add(k)}>+ {k}</Button>)}
      </div>
      <div className="card card-pad" style={{ marginBottom: 10 }}>
        <FinRow label="Комиссия поставщика" value="по договору · 8%" />
        <FinRow label="Поддерживаются" value="частичные оплаты · авансы · доплаты · возвраты · взаимозачёты" />
      </div>
      <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
        <table className="tbl">
          <thead><tr><th>Дата</th><th>Тип</th><th>Основание</th><th style={{ textAlign: 'right' }}>Сумма</th></tr></thead>
          <tbody>
            {ops.map((o, i) => (
              <tr key={i}><td>{o.t}</td><td><Pill tone={kindTone[o.kind]}>{o.kind}</Pill></td><td style={{ color: 'var(--muted)' }}>{o.note}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: deltaTone(o.sum) }}>{fSigned(o.sum)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function FinSettlements() {
  const [open, setOpen] = useState(null);
  const [type, setType] = useState('client');
  const [q, setQ] = useState('');
  const [scheme, setScheme] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const ql = q.trim().toLowerCase();
  const list = FIN_COUNTERPARTIES.filter((c) => c.type === type)
    .filter((c) => !ql || [c.name, c.legal, ...c.orders.map(String)].some((v) => String(v || '').toLowerCase().includes(ql)))
    .filter((c) => !scheme || c.scheme === scheme)
    .filter((c) => !onlyOverdue || c.obligations.some((o) => o.overdueDays > 0));
  const schemeOptions = Array.from(new Set(FIN_COUNTERPARTIES.map((c) => c.scheme)));
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Tabs tabs={[{ key: 'client', label: 'Клиенты' }, { key: 'supplier', label: 'Поставщики' }]} value={type} onChange={setType} />
        <SearchBox value={q} onChange={setQ} placeholder="Поиск по компании, юр. лицу, заказу" style={{ minWidth: 260 }} />
        <FilterChip label="Схема" value={scheme} onChange={setScheme} options={schemeOptions} />
        <button type="button" onClick={() => setOnlyOverdue((v) => !v)}
          style={{ cursor: 'pointer', fontSize: 12.5, padding: '7px 12px', borderRadius: 9, border: '1px solid ' + (onlyOverdue ? 'var(--red)' : 'var(--line)'), background: onlyOverdue ? 'var(--red-bg)' : '#fff', color: onlyOverdue ? 'var(--red)' : 'var(--body)' }}>
          Только с просрочкой
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Найдено: <b>{list.length}</b> · задолженность: <b style={{ color: 'var(--amber)' }}>{f$(list.reduce((s, c) => s + c.debt, 0))}</b></span>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Контрагент</th><th>Схема</th><th>Отсрочка</th><th>Кредитный лимит</th><th style={{ textAlign: 'right' }}>Задолженность</th><th style={{ textAlign: 'right' }}>Оплачено</th><th>Ближайший срок</th><th>Дисциплина</th></tr></thead>
          <tbody>
            {list.map((c) => {
              const nearest = c.obligations.slice().sort((a, b) => a.due.localeCompare(b.due))[0];
              const over = c.obligations.some((o) => o.overdueDays > 0);
              return (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(c)}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td><td>{c.scheme}</td>
                  <td>{c.deferralDays ? c.deferralDays + ' дн.' : '—'}</td>
                  <td style={{ minWidth: 150 }}>{c.limit ? <CreditLimitBar used={c.used} limit={c.limit} /> : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: over ? 'var(--red)' : 'var(--amber)' }}>{f$(c.debt)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)' }}>{f$(c.paid)}</td>
                  <td style={{ color: over ? 'var(--red)' : 'var(--body)' }}>{nearest ? nearest.due : '—'}{over ? ' · просрочка' : ''}</td>
                  <td><Pill tone={c.discipline.rating === 'A' ? 'green' : c.discipline.rating === 'B' ? 'amber' : 'red'}>{c.discipline.rating} · {c.discipline.onTimePct}%</Pill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h3 className="card-title" style={{ fontSize: 16, margin: '22px 0 12px' }}>Календарь поступлений</h3>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Дата</th><th>Контрагент</th><th>Основание</th><th>Ответственный</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Статус</th></tr></thead>
          <tbody>
            {FIN_RECEIPTS.slice().sort((a, b) => a.date.localeCompare(b.date)).map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td><td style={{ fontWeight: 600 }}>{r.party}</td><td style={{ color: 'var(--muted)' }}>{r.basis}</td><td>{r.resp}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: r.overdue ? 'var(--red)' : 'var(--green)' }}>+{f$(r.sum)}</td>
                <td><Pill tone={r.overdue ? 'red' : 'green'}>{r.overdue ? 'Просрочено' : 'Ожидается'}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <FinCounterpartyDrawer cp={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ServiceModelCard({ kind }) {
  const rows = FIN_SVC_MODEL[kind];
  const clientTotal = svcClientTotal(rows);
  const supplierPay = svcSupplierPay(rows);
  const profit = svcModelProfit(rows);
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="oc-svc-ic" style={{ background: (SERVICE_KIND[kind] || {}).color || 'var(--blue)', width: 30, height: 30 }}><Icon name={(SERVICE_KIND[kind] || {}).icon || 'briefcase'} /></span>
        <h3 className="card-title" style={{ fontSize: 15 }}>Финмодель · {kind}</h3>
      </div>
      {rows.map((r, i) => <FinRow key={i} label={r.l} value={fSigned(r.v)} tone={r.k === 'cost' ? 'var(--muted)' : r.v >= 0 ? 'var(--ink)' : 'var(--red)'} />)}
      <div style={{ borderTop: '1px dashed var(--line)', marginTop: 8, paddingTop: 4 }}>
        <FinRow label="Итоговая стоимость клиенту" value={f$(clientTotal)} strong />
        <FinRow label="Оплата поставщику" value={f$(supplierPay)} tone="var(--muted)" />
        <FinRow label="Чистая прибыль" value={f$(profit)} tone="var(--green)" strong />
      </div>
    </div>
  );
}
function FinEconomics() {
  const [kind, setKind] = useState('Авиа');
  const orderKinds = ['Авиа', 'Гостиница', 'Трансфер'];
  const orderRows = orderKinds.map((k) => {
    const rows = FIN_SVC_MODEL[k];
    return { k, client: svcClientTotal(rows), cost: svcSupplierPay(rows), profit: svcModelProfit(rows) };
  });
  const oClient = orderRows.reduce((s, r) => s + r.client, 0);
  const oCost = orderRows.reduce((s, r) => s + r.cost, 0);
  const oProfit = orderRows.reduce((s, r) => s + r.profit, 0);
  const tax = Math.round(oProfit * 0.1);
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>Полная финмодель услуги</h3>
            <div style={{ flex: 1 }} />
            <Select value={kind} onChange={(e) => setKind(e.target.value)} options={Object.keys(FIN_SVC_MODEL)} style={{ width: 'auto', minWidth: 130 }} />
          </div>
          <ServiceModelCard kind={kind} />
          <div className="card card-pad" style={{ marginTop: 12 }}>
            <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Автоматический расчёт начислений</h3>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>Все начисления считаются по правилам из «Центра финправил» без изменения кода.</div>
            {['Сервисный сбор', 'Надбавка / скидка', 'Комиссия поставщика', 'Агентская комиссия', 'Комиссия платёжной системы', 'Банковская комиссия', 'Вознаграждение оператора', 'Налоги и курсовые разницы'].map((x, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12.5 }}>
                <Icon name="check" style={{ width: 14, height: 14, color: 'var(--green)' }} /><span style={{ color: 'var(--body)' }}>{x}</span>
                <span style={{ flex: 1 }} /><Pill tone="blue">авто</Pill>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Финансовая детализация заказа № 51162</h3>
          <div className="card card-pad" style={{ marginBottom: 12 }}>
            <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)', marginBottom: 10 }}>
              <table className="tbl">
                <thead><tr><th>Услуга</th><th style={{ textAlign: 'right' }}>Клиенту</th><th style={{ textAlign: 'right' }}>Поставщику</th><th style={{ textAlign: 'right' }}>Прибыль</th></tr></thead>
                <tbody>
                  {orderRows.map((r) => <tr key={r.k}><td>{r.k}</td><td style={{ textAlign: 'right' }}>{f$(r.client)}</td><td style={{ textAlign: 'right', color: 'var(--muted)' }}>{f$(r.cost)}</td><td style={{ textAlign: 'right', color: deltaTone(r.profit), fontWeight: 700 }}>{f$(r.profit)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <FinRow label="Стоимость для клиента" value={f$(oClient)} strong />
            <FinRow label="Стоимость услуг поставщиков" value={f$(oCost)} tone="var(--muted)" />
            <FinRow label="Валовая прибыль" value={f$(oProfit)} tone="var(--green)" />
            <FinRow label="Налог с прибыли (10%)" value={'−' + f$(tax)} tone="var(--red)" />
            <FinRow label="Чистая прибыль" value={f$(oProfit - tax)} tone="var(--green)" strong />
          </div>
        </div>
      </div>

      <h3 className="card-title" style={{ fontSize: 16, margin: '22px 0 12px' }}>Расчёт вознаграждения операторов</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 12 }}>
        {FIN_SALARY.map((s) => (
          <div key={s.operator} className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.operator}</div>
              <span className="s-value" style={{ fontSize: 20, color: 'var(--green)' }}>{f$(s.total)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Схема: {s.scheme}</div>
            {s.accruals.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, padding: '5px 0', borderBottom: i < s.accruals.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ color: 'var(--muted-2)', width: 56 }}>№ {a.order}</span>
                <span style={{ flex: 1 }}>{a.service}<div style={{ color: 'var(--muted-2)', fontSize: 11 }}>{a.rule}</div></span>
                <span style={{ fontWeight: 700 }}>{f$(a.amount)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FinAnalytics() {
  const [slice, setSlice] = useState('Операторы');
  const [period, setPeriod] = useState('Месяц');
  const rows = FIN_ANALYTICS_SLICES[slice];
  const maxP = Math.max(...rows.map((r) => r.profit));
  let bal = 60000;
  const flow = FIN_CASHFLOW.map((d) => ({ ...d, net: d.in - d.out, bal: (bal += d.in - d.out) }));
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>Денежные потоки</h3>
            <Tabs tabs={['День', 'Неделя', 'Месяц', 'Квартал', 'Год'].map((p) => ({ key: p, label: p }))} value={period} onChange={setPeriod} />
          </div>
          <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
            <table className="tbl">
              <thead><tr><th>Период</th><th style={{ textAlign: 'right' }}>Приход</th><th style={{ textAlign: 'right' }}>Расход</th><th style={{ textAlign: 'right' }}>Чистый поток</th><th style={{ textAlign: 'right' }}>Остаток</th></tr></thead>
              <tbody>
                {flow.map((d) => (
                  <tr key={d.m}><td style={{ fontWeight: 600 }}>{d.m} 2026</td>
                    <td style={{ textAlign: 'right', color: 'var(--green)' }}>+{f$(d.in)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--red)' }}>−{f$(d.out)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: deltaTone(d.net) }}>{fSigned(d.net)}</td>
                    <td style={{ textAlign: 'right' }}>{f$(d.bal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 className="card-title" style={{ fontSize: 16 }}>Аналитика · прибыль</h3>
            <div style={{ flex: 1 }} />
            <Select value={slice} onChange={(e) => setSlice(e.target.value)} options={Object.keys(FIN_ANALYTICS_SLICES)} style={{ width: 'auto', minWidth: 130 }} />
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {rows.map((r) => (
              <div key={r.n}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{r.n}</span>
                  <span style={{ color: 'var(--muted)' }}>{f$(r.profit)} · {r.orders} зак.</span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}><div style={{ width: (r.profit / maxP * 100) + '%', height: '100%', background: 'var(--green)' }} /></div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 10 }}>Каждый показатель раскрывается до первичного документа.</div>
        </div>
      </div>

      <h3 className="card-title" style={{ fontSize: 16, margin: '22px 0 12px' }}>Аналитика платёжной дисциплины</h3>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Клиент</th><th style={{ textAlign: 'right' }}>Средний срок оплаты</th><th style={{ textAlign: 'right' }}>Средняя просрочка</th><th style={{ textAlign: 'right' }}>Макс. просрочка</th><th style={{ textAlign: 'right' }}>Просрочено</th><th style={{ textAlign: 'right' }}>Своевременно</th><th>Рейтинг</th><th>Рекомендация</th></tr></thead>
          <tbody>
            {FIN_COUNTERPARTIES.filter((c) => c.type === 'client').map((c) => {
              const d = c.discipline;
              const rec = d.rating === 'A' ? 'Можно увеличить лимит / отсрочку' : d.rating === 'B' ? 'Условия без изменений' : 'Снизить лимит, перейти на предоплату';
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ textAlign: 'right' }}>{d.avgPayDays} дн.</td>
                  <td style={{ textAlign: 'right', color: d.avgOverdue ? 'var(--amber)' : 'var(--muted)' }}>{d.avgOverdue} дн.</td>
                  <td style={{ textAlign: 'right' }}>{d.maxOverdue} дн.</td>
                  <td style={{ textAlign: 'right', color: d.overdueSum ? 'var(--red)' : 'var(--muted)' }}>{f$(d.overdueSum)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: d.onTimePct >= 90 ? 'var(--green)' : d.onTimePct >= 70 ? 'var(--amber)' : 'var(--red)' }}>{d.onTimePct}%</td>
                  <td><Pill tone={d.rating === 'A' ? 'green' : d.rating === 'B' ? 'amber' : 'red'}>{d.rating}</Pill></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{rec}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinRules() {
  const toast = useToast();
  return (
    <div className="fade-in">
      <WarnBanner tone="amber" icon="alertCircle" title="Изменения применяются только к новым операциям"
        text="Уже оформленные заказы сохраняют исторические значения сборов и комиссий." />
      <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Центр финансовых правил</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 12, marginBottom: 22 }}>
        {FIN_RULES.map((g) => (
          <div key={g.group} className="card card-pad">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="card-title" style={{ fontSize: 14 }}>{g.group}</h3>
              <Button size="sm" variant="secondary" icon="edit" onClick={() => toast('Редактирование правил · ' + g.group, 'info')}>Настроить</Button>
            </div>
            {g.items.map((it, i) => <FinRow key={i} label={it.t} value={it.v} />)}
          </div>
        ))}
      </div>

      <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Банковская сверка</h3>
      <div className="table-card" style={{ marginBottom: 22 }}>
        <table className="tbl">
          <thead><tr><th>Банк. операция</th><th>Дата</th><th>Контрагент</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Сопоставление</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {FIN_RECON.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.id}</td><td>{r.date}</td><td>{r.party}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{f$(r.sum)}</td>
                <td style={{ color: 'var(--muted)' }}>{r.matched}</td>
                <td><Pill tone={FIN_RECON_STATUS[r.status]}>{r.status}</Pill></td>
                <td>{(r.status === 'Не найдено соответствие' || r.status === 'Конфликт') && <Button size="sm" variant="secondary" onClick={() => toast('Открываю ручное сопоставление ' + r.id, 'info')}>Сопоставить</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Журнал финансовых действий</h3>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>Все изменения фиксируются. Удаление финансовых документов без сохранения истории запрещено.</div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Дата · время</th><th>Пользователь</th><th>Действие</th><th>Объект</th><th>Было</th><th>Стало</th><th>Причина</th></tr></thead>
          <tbody>
            {FIN_ACTIONS.map((a, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>{a.t}</td><td>{a.user}</td><td style={{ fontWeight: 600 }}>{a.action}</td>
                <td style={{ color: 'var(--muted)' }}>{a.field}</td><td style={{ color: 'var(--muted)' }}>{a.oldV}</td>
                <td style={{ fontWeight: 600 }}>{a.newV}</td><td style={{ fontSize: 12, color: 'var(--muted)' }}>{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  { key: 'analytics', label: 'Аналитика' },
  { key: 'rules', label: 'Правила' },
];
function FinancePage() {
  const [tab, setTab] = useState('overview');
  return (
    <>
      <Topbar title="Финансы" sub="Управление финансами компании: баланс, платежи, взаиморасчёты, аналитика" />
      <div className="content">
        <div style={{ marginBottom: 18 }}><Tabs tabs={FIN_TABS} value={tab} onChange={setTab} /></div>
        {tab === 'overview' && <FinOverview onGoTab={setTab} />}
        {tab === 'balance' && <FinBalance />}
        {tab === 'payments' && <FinPayments />}
        {tab === 'treasury' && <FinTreasury />}
        {tab === 'settlements' && <FinSettlements />}
        {tab === 'recon' && <FinReconciliation />}
        {tab === 'economics' && <FinEconomics />}
        {tab === 'analytics' && <FinAnalytics />}
        {tab === 'rules' && <FinRules />}
      </div>
    </>
  );
}

Object.assign(window, { FinancePage, FIN_ACCOUNTS, FIN_PAYMENTS, FIN_COUNTERPARTIES, finCreditCheck });

export { f$, fSigned, finNow, deltaTone, finCreditCheck, FIN_ACCT_GROUPS, FIN_ACCOUNTS, FIN_ACCT_OP_TYPES, acctOps, FIN_PAY_STATUS, FIN_PRIORITY, FIN_PAYMENTS, obl, FIN_COUNTERPARTIES, FIN_SCHEMES, FIN_CASHFLOW, FIN_RECEIPTS, FIN_SALARY, FIN_RULES, FIN_RECON_STATUS, FIN_RECON, FIN_ACTIONS, FIN_SVC_MODEL, sumK, svcClientTotal, svcSupplierPay, svcModelProfit, StatTile, WarnBanner, CashflowChart, LegendDot, FinRow, FinOverview, FinAccountDrawer, FinBalance, FinPaymentDrawer, FinPayments, FinTreasury, CreditLimitBar, ReconActDrawer, FinCounterpartyDrawer, SupplierSettlements, FinSettlements, ServiceModelCard, FinEconomics, FIN_ANALYTICS_SLICES, FinAnalytics, FinRules, FIN_TABS, FinancePage };
