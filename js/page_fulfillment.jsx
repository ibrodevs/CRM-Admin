// ===== Оформление и сопровождение: Финансы + Документы (единый процесс) =====

function fUsd(n, c = 'USD') { return Math.round(n).toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c); }
function finPayable(op) { return op.tariff + op.taxes + op.fee + op.penalty - op.discount; }
function finDebt(op) { return Math.max(0, finPayable(op) - op.paid); }

/* ---------- order stage bar ---------- */
function OrderStageBar({ index }) {
  return (
    <div className="stage-bar">
      {ORDER_STAGES.map((s, i) => {
        const state = i < index ? 'done' : i === index ? 'active' : '';
        return (
          <React.Fragment key={s}>
            {i > 0 && <span className={'stage-line' + (i <= index ? ' done' : '')} />}
            <div className={'stage ' + state}>
              <span className="dot">{i < index ? <Icon name="check" strokeWidth={3} /> : i + 1}</span>
              <span className="lbl">{s}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ====================================================================
   FINANCE OPERATION CARD
   ==================================================================== */
function FinanceOpCard({ op, onClose, onChange }) {
  const toast = useToast();
  if (!op) return null;
  const payable = finPayable(op);
  const debt = finDebt(op);
  const pct = payable ? Math.min(100, Math.round((op.paid / payable) * 100)) : 0;
  const isRefund = op.status === 'Возврат';

  const setStatus = (s) => { onChange && onChange(op.no, { status: s }); toast('Статус: ' + s, 'ok'); };

  return (
    <Drawer open={!!op} onClose={onClose} title={'Операция ' + op.no}
      footer={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button style={{ flex: 1, minWidth: 150 }} icon="finance" onClick={() => { onChange && onChange(op.no, { paid: payable, status: 'Оплачено' }); toast('Платёж добавлен', 'ok'); }}>Добавить платёж</Button>
          <Button variant="secondary" icon="refund" onClick={() => toast('Открыт модуль возврата', 'info')}>Возврат</Button>
          <Button variant="secondary" icon="check" onClick={() => setStatus('Закрыто')}>Закрыть</Button>
        </div>
      }>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Pill tone={SERVICE_KIND[op.source] ? SERVICE_KIND[op.source].tone : 'blue'}>{op.source}</Pill>
        <span style={{ color: 'var(--muted)' }}>{op.type}</span>
        <div style={{ flex: 1 }} />
        <ActionMenu trigger={<button style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Pill tone={FIN_OP_STATUS[op.status]}>{op.status}</Pill><Icon name="chevDown" style={{ width: 15, height: 15, color: 'var(--muted-2)' }} /></button>}
          items={Object.keys(FIN_OP_STATUS).map((s) => ({ icon: op.status === s ? 'check' : null, label: s, onClick: () => setStatus(s) }))} />
      </div>

      {/* amount breakdown */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 className="card-title" style={{ fontSize: 16, marginBottom: 8 }}>Расчёт</h3>
        <div className="amt-row"><span className="k">Тариф</span><span className="v">{fUsd(op.tariff, op.currency)}</span></div>
        <div className="amt-row"><span className="k">Таксы и сборы</span><span className="v">{fUsd(op.taxes, op.currency)}</span></div>
        <div className="amt-row"><span className="k">Сервисный сбор</span><span className="v">{fUsd(op.fee, op.currency)}</span></div>
        {op.discount > 0 && <div className="amt-row minus"><span className="k">Скидка</span><span className="v">− {fUsd(op.discount, op.currency)}</span></div>}
        {op.penalty > 0 && <div className="amt-row"><span className="k">Штраф</span><span className="v">{fUsd(op.penalty, op.currency)}</span></div>}
        <div className="amt-row total"><span className="k">Сумма к оплате</span><span className="v">{fUsd(payable, op.currency)}</span></div>
      </div>

      {/* payment progress */}
      {!isRefund ? (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="pay-bar" style={{ marginBottom: 12 }}>
            <span style={{ width: pct + '%', background: '#2bb96a' }} />
            <span style={{ width: (100 - pct) + '%', background: debt > 0 ? '#f0921f' : '#2bb96a' }} />
          </div>
          <div className="amt-row"><span className="k">Оплачено</span><span className="v" style={{ color: 'var(--green)' }}>{fUsd(op.paid, op.currency)} · {pct}%</span></div>
          <div className="amt-row"><span className="k">Задолженность</span><span className="v" style={{ color: debt ? 'var(--red)' : 'var(--ink)' }}>{fUsd(debt, op.currency)}</span></div>
          <div className="amt-row"><span className="k">Комиссия агентства</span><span className="v" style={{ color: 'var(--green)' }}>+ {fUsd(op.commission, op.currency)}</span></div>
        </div>
      ) : (
        <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--teal-bg)' }}>
          <div className="amt-row"><span className="k">К возврату клиенту</span><span className="v">{fUsd(op.refund, op.currency)}</span></div>
          <div className="amt-row"><span className="k">Удержанный штраф</span><span className="v" style={{ color: 'var(--red)' }}>{fUsd(op.penalty, op.currency)}</span></div>
        </div>
      )}

      <div className="kv" style={{ marginBottom: 16 }}>
        <div className="kv-row"><span className="k">Заказ</span><span className="v" style={{ color: 'var(--blue)' }}>№ {op.order}</span></div>
        <div className="kv-row"><span className="k">Дата</span><span className="v">{op.date}</span></div>
        <div className="kv-row"><span className="k">Валюта</span><span className="v">{op.currency}</span></div>
        <div className="kv-row"><span className="k">Ответственный</span><span className="v">{op.resp}</span></div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 className="card-title" style={{ fontSize: 15, marginBottom: 10 }}>Комментарий</h3>
        {op.comment ? <p style={{ margin: '0 0 12px', color: 'var(--body)' }}>{op.comment}</p> : <p style={{ margin: '0 0 12px', color: 'var(--muted-2)' }}>Без комментариев</p>}
        <div style={{ display: 'flex', gap: 8 }}><Input placeholder="Добавить комментарий…" style={{ flex: 1 }} /><Button icon="send" onClick={() => toast('Комментарий добавлен')} /></div>
      </div>

      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 12 }}>История изменений</h3>
      <div className="timeline">
        {[...op.history].reverse().map((h, i) => (
          <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
            <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
        ))}
      </div>
    </Drawer>
  );
}

/* ---------- finance registry ---------- */
function FinanceRegistry({ scopeOrder, onOpenOp }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [fSource, setFSource] = useState('');
  const [ops, setOps] = useState(scopeOrder ? FIN_OPS.filter((o) => o.order === scopeOrder) : FIN_OPS);
  const [card, setCard] = useState(null);
  const { sort, onSort, apply } = useSort(null);

  const updateOp = (no, patch) => setOps((cur) => cur.map((o) => (o.no === no ? { ...o, ...patch } : o)));

  let rows = ops.filter((o) => {
    if (tab !== 'all' && o.status !== tab) return false;
    if (fSource && o.source !== fSource) return false;
    if (q && !(`${o.no} ${o.order} ${o.source} ${o.resp}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  rows = apply(rows, { no: (r) => r.no, payable: (r) => finPayable(r), debt: (r) => finDebt(r) });

  const sum = (fn) => ops.reduce((s, o) => s + fn(o), 0);
  const STATS = [
    { l: 'К оплате', v: fUsd(sum((o) => finPayable(o))) },
    { l: 'Оплачено', v: fUsd(sum((o) => o.paid)) },
    { l: 'Задолженность', v: fUsd(sum((o) => finDebt(o))), tone: 'red' },
    { l: 'Возвраты', v: fUsd(sum((o) => o.refund)), tone: 'teal' },
  ];
  const cnt = (st) => ops.filter((o) => !st || o.status === st).length;
  const TABS = [{ key: 'all', label: 'Все', count: cnt() }].concat(Object.keys(FIN_OP_STATUS).map((s) => ({ key: s, label: s, count: cnt(s) })));

  const open = (o) => onOpenOp ? onOpenOp(o) : setCard(o);

  return (
    <div className="fade-in">
      {!scopeOrder && (
        <div className="grid-4" style={{ marginBottom: 22 }}>
          {STATS.map((s) => (<div className="stat-card" key={s.l}><div className="s-label">{s.l}</div><div className="s-value" style={s.tone === 'red' ? { color: 'var(--red)' } : s.tone === 'teal' ? { color: 'var(--teal)' } : null}>{s.v}</div></div>))}
        </div>
      )}
      {scopeOrder && (() => {
        // per-currency totals so mixed-currency orders never sum apples and oranges into one number
        const curs = [...new Set(ops.map((o) => o.currency))];
        const sumCur = (c, fn) => ops.filter((o) => o.currency === c).reduce((s, o) => s + fn(o), 0);
        return (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {curs.map((c) => (
              <div className="stat-card" key={c} style={{ flex: '1 1 220px' }}>
                <div className="s-label">Итоги по операциям · {c}</div>
                <div style={{ display: 'flex', gap: 22, marginTop: 8, flexWrap: 'wrap' }}>
                  <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>К оплате</div><div style={{ fontWeight: 700, fontSize: 16 }}>{fUsd(sumCur(c, finPayable), c)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Оплачено</div><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>{fUsd(sumCur(c, (o) => o.paid), c)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Задолженность</div><div style={{ fontWeight: 700, fontSize: 16, color: sumCur(c, finDebt) ? 'var(--red)' : 'var(--ink)' }}>{fUsd(sumCur(c, finDebt), c)}</div></div>
                </div>
              </div>
            ))}
            {curs.length > 1 && (
              <div style={{ width: '100%', fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="alertCircle" style={{ width: 14, height: 14 }} />Операции заказа в разных валютах — суммы по валютам не складываются.
              </div>
            )}
          </div>
        );
      })()}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <div style={{ flex: 1 }} />
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: №, заказ…" style={{ width: 230 }} />
        <FilterChip label="Источник" value={fSource} onChange={setFSource} options={['Авиа', 'Гостиница', 'Трансфер', 'ЖД', 'Группа']} />
      </div>
      <div className="table-card">
        {rows.length ? (
          <table className="tbl">
            <thead><tr>
              <Th label="№" col="no" sort={sort} onSort={onSort} style={{ width: 90 }} />
              <th>Заказ</th><th>Источник</th><th>Тип операции</th>
              <Th label="К оплате" col="payable" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
              <th style={{ textAlign: 'right' }}>Оплачено</th>
              <Th label="Задолженность" col="debt" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
              <th>Ответственный</th><th>Статус</th>
            </tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.no} style={{ cursor: 'pointer' }} onClick={() => open(o)}>
                  <td className="t-strong">{o.no}</td>
                  <td><span style={{ color: 'var(--blue)', fontWeight: 600 }}>№ {o.order}</span></td>
                  <td><Pill tone={SERVICE_KIND[o.source] ? SERVICE_KIND[o.source].tone : 'blue'}>{o.source}</Pill></td>
                  <td>{o.type}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fUsd(finPayable(o), o.currency)}</td>
                  <td style={{ textAlign: 'right' }}>{fUsd(o.paid, o.currency)}</td>
                  <td style={{ textAlign: 'right', color: finDebt(o) ? 'var(--red)' : 'var(--muted-2)', fontWeight: 600 }}>{finDebt(o) ? fUsd(finDebt(o), o.currency) : '—'}</td>
                  <td>{o.resp}</td>
                  <td><Pill tone={FIN_OP_STATUS[o.status]}>{o.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="finance" title="Операций не найдено" />}
      </div>
      {card && <FinanceOpCard op={card} onClose={() => setCard(null)} onChange={updateOp} />}
    </div>
  );
}

function FinancePageNew() {
  return (<><Topbar title="Финансы" /><div className="content"><FinanceRegistry /></div></>);
}

/* ====================================================================
   DOCUMENT CARD + CENTER
   ==================================================================== */
function DocCard({ doc, onClose }) {
  const toast = useToast();
  if (!doc) return null;
  const k = DOC_KIND[doc.type] || DOC_KIND['Прочее'];
  const links = [
    { ic: 'orders', label: 'Заказ № ' + doc.order, on: doc.order },
    { ic: 'user', label: doc.participant, on: doc.participant !== '—' },
    { ic: 'plane', label: doc.service, on: doc.service !== '—' },
    { ic: 'finance', label: 'Операция ' + doc.finOp, on: doc.finOp !== '—' },
  ].filter((l) => l.on);
  return (
    <Drawer open={!!doc} onClose={onClose} title={doc.no}
      footer={<div style={{ display: 'flex', gap: 10 }}>
        <Button style={{ flex: 1 }} icon="download" onClick={() => toast('Скачивание…', 'info')}>Скачать</Button>
        <Button variant="secondary" icon="plus" onClick={() => toast('Загрузка новой версии', 'info')}>Новая версия</Button>
        {doc.status !== 'Подписан' && <Button variant="secondary" icon="check" onClick={() => toast('Документ подписан', 'ok')}>Подписать</Button>}
      </div>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{doc.name}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{doc.type} · {doc.size}</div></div>
        <Pill tone={DOC_STATUS2[doc.status]}>{doc.status}</Pill>
      </div>

      <div className="doc-preview" style={{ marginBottom: 16 }}>
        <Icon name={k.icon} style={{ width: 44, height: 44 }} strokeWidth={1.4} />
        <span style={{ fontSize: 13 }}>Предпросмотр документа · v{doc.version}</span>
        <Button variant="secondary" size="sm" icon="eye" onClick={() => toast('Открываю предпросмотр', 'info')}>Открыть</Button>
      </div>

      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 10 }}>Связи</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {links.map((l, i) => <span key={i} className="link-chip"><Icon name={l.ic} />{l.label}</span>)}
      </div>

      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 8 }}>Версии</h3>
      <div style={{ marginBottom: 18 }}>
        {doc.versions.map((v) => (
          <div className="ver-row" key={v.v}>
            <span className="ver-badge">v{v.v}</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{v.note}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{v.date} · {v.who}</div></div>
            <button className="icon-btn" onClick={() => toast('Скачивание v' + v.v, 'info')}><Icon name="download" /></button>
          </div>
        ))}
      </div>

      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 12 }}>История</h3>
      <div className="timeline">
        {[...doc.history].reverse().map((h, i) => (
          <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
            <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
        ))}
      </div>
    </Drawer>
  );
}

function DocCenter({ scopeOrder, onOpenDoc }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [fStatus, setFStatus] = useState('');
  const [card, setCard] = useState(null);
  const all = scopeOrder ? DOCS2.filter((d) => d.order === scopeOrder) : DOCS2;

  const TYPE_TABS = [
    { key: 'all', label: 'Все', test: () => true },
    { key: 'tickets', label: 'Билеты и квитанции', test: (d) => ['Билет', 'Маршрутная квитанция'].includes(d.type) },
    { key: 'vouchers', label: 'Ваучеры и полисы', test: (d) => ['Ваучер', 'Страховой полис'].includes(d.type) },
    { key: 'fin', label: 'Счета и акты', test: (d) => ['Счёт', 'Акт'].includes(d.type) },
    { key: 'legal', label: 'Договоры', test: (d) => d.type === 'Договор' },
    { key: 'passports', label: 'Паспорта', test: (d) => d.type === 'Паспорт' },
    { key: 'missing', label: 'Требуют действия', test: (d) => ['Черновик', 'На подписи'].includes(d.status) },
  ];
  const cur = TYPE_TABS.find((t) => t.key === tab);
  let rows = all.filter((d) => cur.test(d) && (!fStatus || d.status === fStatus) &&
    (!q || `${d.no} ${d.name} ${d.order} ${d.participant}`.toLowerCase().includes(q.toLowerCase())));

  const open = (d) => onOpenDoc ? onOpenDoc(d) : setCard(d);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tabs tabs={TYPE_TABS.map((t) => ({ key: t.key, label: t.label, count: all.filter(t.test).length }))} value={tab} onChange={setTab} />
        <div style={{ flex: 1 }} />
        <SearchBox value={q} onChange={setQ} placeholder="Поиск документа…" style={{ width: 230 }} />
        <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={Object.keys(DOC_STATUS2)} />
        <Button icon="plus" onClick={() => toast('Загрузка документа', 'info')}>Загрузить</Button>
      </div>
      <div className="table-card">
        {rows.length ? (
          <table className="tbl">
            <thead><tr><th style={{ width: 90 }}>№</th><th>Документ</th><th>Тип</th><th>Заказ</th><th>Привязка</th><th>Версия</th><th>Дата</th><th>Статус</th></tr></thead>
            <tbody>
              {rows.map((d) => {
                const k = DOC_KIND[d.type] || DOC_KIND['Прочее'];
                return (
                  <tr key={d.no} style={{ cursor: 'pointer' }} onClick={() => open(d)}>
                    <td className="t-strong">{d.no}</td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="airline-logo sm" style={{ background: k.color, width: 30, height: 30, borderRadius: 8 }}><Icon name={k.icon} style={{ width: 16, height: 16 }} /></span><span style={{ fontWeight: 600 }}>{d.name}</span></span></td>
                    <td>{d.type}</td>
                    <td><span style={{ color: 'var(--blue)', fontWeight: 600 }}>№ {d.order}</span></td>
                    <td className="t-muted">{d.participant !== '—' ? d.participant : d.service !== '—' ? d.service : '—'}</td>
                    <td>v{d.version}</td>
                    <td>{d.date}</td>
                    <td><Pill tone={DOC_STATUS2[d.status]}>{d.status}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <EmptyState icon="docs" title="Документы не найдены" />}
      </div>
      {card && <DocCard doc={card} onClose={() => setCard(null)} />}
    </div>
  );
}

function DocCenterPage() {
  return (<><Topbar title="Документы" /><div className="content"><DocCenter /></div></>);
}

/* ====================================================================
   FULFILLMENT CONTROL DESK (Реестр оформления)
   ==================================================================== */
function FulfillmentRegistry({ onOpenOrder }) {
  const [cat, setCat] = useState('payment');
  const CATS = [
    { key: 'payment', label: 'Требуют оплаты', icon: 'finance' },
    { key: 'docs', label: 'Нет документов', icon: 'docs' },
    { key: 'overdue', label: 'Просрочено', icon: 'clock' },
    { key: 'return', label: 'Возвраты в обработке', icon: 'refund' },
  ];
  const rows = FULFILLMENT.filter((r) => r.cat === cat);
  const goOrder = (no, client) => { const o = ORDERS.find((x) => x.no === no) || { no, client, requestType: 'Индивидуальная', status: 'В работе', operator: 'Даниель', date: '15.06.25' }; onOpenOrder(o); };

  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {CATS.map((c) => {
          const n = FULFILLMENT.filter((r) => r.cat === c.key).length;
          const overdue = c.key === 'overdue' || FULFILLMENT.some((r) => r.cat === c.key && r.overdue);
          return (
            <div key={c.key} className="stat-card" style={{ cursor: 'pointer', borderColor: cat === c.key ? 'var(--blue)' : 'var(--line)', boxShadow: cat === c.key ? '0 0 0 3px var(--blue-soft)' : 'var(--shadow-card)' }} onClick={() => setCat(c.key)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Icon name={c.icon} style={{ width: 18, height: 18, color: cat === c.key ? 'var(--blue)' : 'var(--muted-2)' }} /><span className="s-label" style={{ margin: 0 }}>{c.label}</span></div>
              <div className="s-value" style={c.key === 'overdue' && n ? { color: 'var(--red)' } : null}>{n}</div>
            </div>
          );
        })}
      </div>

      <div className="table-card">
        {rows.length ? (
          <table className="tbl">
            <thead><tr><th>Заказ</th><th>Клиент</th><th>Действие</th><th>Сумма</th><th>Срок</th><th>Ответственный</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => goOrder(r.order, r.client)}>
                  <td><span style={{ color: 'var(--blue)', fontWeight: 700 }}>№ {r.order}</span></td>
                  <td className="t-strong">{r.client}</td>
                  <td>{r.detail}</td>
                  <td className="t-strong">{r.amount}</td>
                  <td><span style={r.overdue ? { color: 'var(--red)', fontWeight: 600 } : null}>{r.due}</span></td>
                  <td>{r.resp}</td>
                  <td onClick={(e) => e.stopPropagation()}><Button variant="secondary" size="sm" iconRight="chevRight" onClick={() => goOrder(r.order, r.client)}>В заказ</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="checkCircle" title="Здесь чисто" sub="Нет задач в этой категории" />}
      </div>
    </div>
  );
}

function FulfillmentPage({ onOpenOrder }) {
  return (<><Topbar title="Оформление" /><div className="content"><FulfillmentRegistry onOpenOrder={onOpenOrder} /></div></>);
}

Object.assign(window, {
  OrderStageBar, FinanceOpCard, FinanceRegistry, FinancePageNew,
  DocCard, DocCenter, DocCenterPage, FulfillmentRegistry, FulfillmentPage,
  fUsd, finPayable, finDebt,
});
