// ===== Оформление и сопровождение: Финансы + Документы (единый процесс) =====

function fUsd(n, c = 'USD') { return Math.round(n).toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c); }
function finPayable(op) { return op.tariff + op.taxes + op.fee + op.penalty - op.discount; }
function finDebt(op) { return Math.max(0, finPayable(op) - op.paid); }

// closing documents (Счёт/Акт/Договор) carry the counterparty's name on `participant` directly;
// travel documents are linked to a company only through their order.
function companyForDoc(doc) {
  const name = doc.participant !== '—' ? doc.participant : ORDERS.find((o) => o.no === doc.order)?.client;
  return COMPANIES_DB.find((c) => c.name === name) || null;
}

/* ---------- order stage bar ---------- */
function OrderStageBar({ index, compact }) {
  return (
    <div className={'stage-bar' + (compact ? ' compact' : '')}>
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
// document types that belong to bookkeeping — shown separately, never under a passenger
const DOC_BOOKKEEPING = ['Счёт', 'Акт', 'Договор'];
const now = () => new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·');

/* ---------- preview before sending a closing document (Счёт/Акт/Договор) to accounting ---------- */
function DocPreviewModal({ doc, company, onClose, onChange }) {
  const toast = useToast();
  const [correcting, setCorrecting] = useState(false);
  const [note, setNote] = useState('');
  if (!doc) return null;

  const addHistory = (text, who) => [...doc.history, { t: now(), text, who }];

  const sendForCorrection = () => {
    if (!note.trim()) return;
    onChange(doc.no, { status: 'Черновик', history: addHistory('Возвращён на корректировку: ' + note, 'Даниель') });
    if (company) company.docCorrections = [...company.docCorrections, { date: now(), who: 'Даниель', note }];
    toast('Замечание сохранено для контрагента, документ — в работу', 'ok');
    setNote(''); setCorrecting(false); onClose();
  };

  const sendToAccounting = () => {
    onChange(doc.no, { status: 'В бухгалтерии', history: addHistory('Отправлен в онлайн-бухгалтерию', 'Даниель') });
    toast('Отправлено в бухгалтерию', 'info');
    onClose();
    setTimeout(() => {
      const signed = !!company?.requiresESign;
      onChange(doc.no, {
        status: signed ? 'Подписан' : 'Сформирован',
        version: doc.version + 1,
        versions: [...doc.versions, { v: doc.version + 1, date: now(), who: 'Бухгалтерия', note: signed ? 'Возвращён подписанным ЭЦП' : 'Принят без ЭЦП' }],
        history: addHistory(signed ? 'Возвращён из бухгалтерии · подписан ЭЦП' : 'Возвращён из бухгалтерии · без ЭЦП', 'Бухгалтерия'),
      });
      toast(signed ? 'Документ подписан ЭЦП и обновлён' : 'Бухгалтерия приняла документ без ЭЦП', 'ok');
    }, 1600);
  };

  return (
    <Drawer open={!!doc} onClose={onClose} width="min(560px,94vw)"
      title="Предпросмотр перед отправкой" sub={doc.no + ' · ' + doc.name}
      footer={correcting ? (
        <>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCorrecting(false)}>Назад</Button>
          <Button style={{ flex: 1 }} onClick={sendForCorrection}>Сохранить и вернуть в работу</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" style={{ flex: 1 }} icon="edit" onClick={() => setCorrecting(true)}>Откорректировать</Button>
          <Button style={{ flex: 1 }} icon="send" onClick={sendToAccounting}>Отправить в бухгалтерию</Button>
        </>
      )}>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="kv-row"><span className="k">Контрагент</span><span className="v">{company ? company.name : doc.participant}</span></div>
        <div className="kv-row"><span className="k">Договор</span><span className="v">{company ? company.contract : '—'}</span></div>
        <div className="kv-row"><span className="k">Наименование в документе</span><span className="v">{doc.name}</span></div>
        <div className="kv-row"><span className="k">ЭЦП у контрагента</span><span className="v">{company ? (company.requiresESign ? 'Требуется' : 'Не требуется') : '—'}</span></div>
      </div>

      {company && company.docCorrections.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Ранее отмечено по этому контрагенту</h3>
          {company.docCorrections.map((c, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'flex', gap: 6 }}>
              <Icon name="alertCircle" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />{c.note}
            </div>
          ))}
        </div>
      )}

      {correcting && (
        <Field label="Что нужно исправить?">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: неверное наименование услуги в акте" />
        </Field>
      )}
    </Drawer>
  );
}

function DocCard({ doc, onClose, onChange }) {
  const toast = useToast();
  const [preview, setPreview] = useState(false);
  if (!doc) return null;
  const k = DOC_KIND[doc.type] || DOC_KIND['Прочее'];
  const isClosingDoc = DOC_BOOKKEEPING.includes(doc.type);
  const needsPreview = isClosingDoc && !['Подписан', 'Аннулирован'].includes(doc.status);
  const company = companyForDoc(doc);
  const links = [
    { ic: 'orders', label: 'Заказ № ' + doc.order, on: doc.order },
    { ic: 'user', label: doc.participant, on: doc.participant !== '—' },
    { ic: 'plane', label: doc.service, on: doc.service !== '—' },
    { ic: 'finance', label: 'Операция ' + doc.finOp, on: doc.finOp !== '—' },
  ].filter((l) => l.on);
  return (
    <>
    <Drawer open={!!doc} onClose={onClose} title={doc.no}
      footer={<div style={{ display: 'flex', gap: 10 }}>
        <Button style={{ flex: 1 }} icon="download" onClick={() => toast('Скачивание…', 'info')}>Скачать</Button>
        <Button variant="secondary" icon="plus" onClick={() => toast('Загрузка новой версии', 'info')}>Новая версия</Button>
        {!isClosingDoc && doc.status !== 'Подписан' && <Button variant="secondary" icon="check" onClick={() => toast('Документ подписан', 'ok')}>Подписать</Button>}
      </div>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{doc.name}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{doc.type} · {doc.size}</div></div>
        <Pill tone={DOC_STATUS2[doc.status]}>{doc.status}</Pill>
      </div>

      <div className="doc-preview" style={{ marginBottom: 16 }}>
        <Icon name={k.icon} style={{ width: 44, height: 44 }} strokeWidth={1.4} />
        <span style={{ fontSize: 13 }}>Предпросмотр документа · v{doc.version}</span>
        {needsPreview
          ? <Button variant="secondary" size="sm" icon="eye" onClick={() => setPreview(true)}>Предпросмотр перед отправкой</Button>
          : <Button variant="secondary" size="sm" icon="eye" onClick={() => toast('Открываю предпросмотр', 'info')}>Открыть</Button>}
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
    {needsPreview && <DocPreviewModal doc={preview ? doc : null} company={company} onClose={() => setPreview(false)} onChange={onChange} />}
    </>
  );
}

/* one passenger's travel documents (tickets / boarding / vouchers / insurance / visas) */
function DocPassengerGroup({ name, role, docs, onOpen, onUpload }) {
  return (
    <div className="card card-pad" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{role || 'Пассажир'} · {docs.length ? docs.length + ' ' + plural(docs.length, ['документ', 'документа', 'документов']) : 'документов нет'}</div>
        </div>
        <Button variant="secondary" size="sm" icon="plus" onClick={onUpload}>Загрузить</Button>
      </div>
      {docs.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 14 }}>
          {docs.map((d) => {
            const k = DOC_KIND[d.type] || DOC_KIND['Прочее'];
            return (
              <button key={d.no} className="doc-chip" style={{ width: 'auto' }} onClick={() => onOpen(d)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span className="airline-logo sm" style={{ background: k.color, width: 28, height: 28, borderRadius: 7, flexShrink: 0 }}><Icon name={k.icon} style={{ width: 15, height: 15 }} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.type} · v{d.version}</span>
                  </span>
                </span>
                <Pill tone={DOC_STATUS2[d.status]}>{d.status}</Pill>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '12px 14px', border: '1px dashed var(--line)', borderRadius: 12, color: 'var(--muted)', fontSize: 13.5 }}>
          <Icon name="idcard" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
          Документы пассажира ещё не загружены — добавьте билеты, ваучеры, визы и страховки.
        </div>
      )}
    </div>
  );
}

/* Строит «субъектов» (пассажиров) для редактора квитанций из ростера заказа.
   onlyName — ограничить одним пассажиром (когда грузим квитанцию для конкретного). */
function correctionSubjects(participants, onlyName) {
  const list = (participants || []).filter((p) => !onlyName || p.name === onlyName);
  const base = list.length ? list : [{ name: onlyName || 'Пассажир', role: 'Взрослый' }];
  return base.map((p) => ({ name: p.name, type: p.role || 'Взрослый', docNo: p.doc || '—', ref: '—' }));
}

/* Окно загрузки документа в заказ. Демонстрационное: файл выбирается через системный
   диалог, но не отправляется на сервер. Маршрут-квитанция уходит не в список, а в редактор. */
const DOC_UPLOAD_TYPES = Object.keys(DOC_KIND);
function DocUploadModal({ open, scopeOrder, participants = [], defaultParticipant, onClose, onUploaded, onRouteToEditor }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);      // { name, size } | null
  const [type, setType] = useState('Билет');
  const [participant, setParticipant] = useState('—');
  // при каждом открытии — сброс к контексту вызова
  useEffect(() => {
    if (open) { setFile(null); setType('Билет'); setParticipant(defaultParticipant || '—'); }
  }, [open, defaultParticipant]);

  const isReceipt = type === 'Маршрутная квитанция';
  const pickFile = () => fileRef.current && fileRef.current.click();
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) setFile({ name: f.name, size: (f.size / 1024 < 1024 ? Math.max(1, Math.round(f.size / 1024)) + ' КБ' : (f.size / 1048576).toFixed(1) + ' МБ') });
    e.target.value = '';
  };

  const submit = () => {
    const payload = { file, type, participant: participant !== '—' ? participant : '—' };
    if (isReceipt) { onRouteToEditor(payload); return; }
    const now = new Date().toLocaleDateString('ru-RU');
    const doc = {
      no: 'D-' + Math.floor(3200 + Math.random() * 800),
      name: (file && file.name) || (type + ' (загружен)'),
      type, order: scopeOrder || '—', participant: payload.participant, service: '—', finOp: '—',
      status: 'Черновик', version: 1, date: now, size: (file && file.size) || '— КБ',
      versions: [{ v: 1, date: now, who: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор', note: 'Загружен вручную' }],
      history: [{ t: now, text: 'Документ загружен', who: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор' }],
    };
    onUploaded(doc);
  };

  const k = DOC_KIND[type] || DOC_KIND['Прочее'];
  const paxOptions = ['—', ...participants.map((p) => p.name)];
  return (
    <Drawer open={open} onClose={onClose} title="Загрузка документа" sub={scopeOrder ? 'Заказ № ' + scopeOrder : 'Документ вне заказа'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon={isReceipt ? 'template' : 'plus'} disabled={!file} onClick={submit}>
          {isReceipt ? 'Далее: редактор квитанции' : 'Загрузить'}
        </Button>
      </>}>
      <div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFile} />
        {/* зона выбора файла */}
        <button type="button" className="doc-preview" onClick={pickFile}
          style={{ width: '100%', cursor: 'pointer', border: '1px dashed var(--line)', textAlign: 'center' }}>
          <Icon name={file ? k.icon : 'plus'} style={{ width: 40, height: 40 }} strokeWidth={1.4} />
          <span style={{ fontSize: 13.5, color: file ? 'var(--ink)' : 'var(--blue)', fontWeight: 600 }}>
            {file ? file.name : 'Выберите файл или перетащите сюда'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{file ? file.size : 'PDF, JPG, PNG · до 15 МБ'}</span>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: participants.length ? '1fr 1fr' : '1fr', gap: 12, marginTop: 16 }}>
          <div>
            <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Тип документа</label>
            <Select options={DOC_UPLOAD_TYPES} value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          {participants.length > 0 && (
            <div>
              <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Пассажир</label>
              <Select options={paxOptions} value={participant} onChange={(e) => setParticipant(e.target.value)} />
            </div>
          )}
        </div>

        {isReceipt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'var(--blue-weak, #eef3ff)', color: 'var(--blue)', fontSize: 13 }}>
            <Icon name="route" style={{ width: 18, height: 18, flexShrink: 0 }} />
            Маршрут-квитанция откроется в редакторе — сформируете клиентскую версию на фирменном бланке перед сохранением.
          </div>
        )}

      </div>
    </Drawer>
  );
}

function DocCenter({ scopeOrder, participants, onOpenDoc }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [fStatus, setFStatus] = useState('');
  const [openNo, setOpenNo] = useState(null);
  // passenger grouping is only meaningful inside a single order with a known roster
  const canGroupByPax = !!scopeOrder && Array.isArray(participants) && participants.length > 0;
  const [view, setView] = useState('byType'); // 'byType' | 'byPassenger'
  const [docs, setDocs] = useState(() => (scopeOrder ? DOCS2.filter((d) => d.order === scopeOrder) : DOCS2));
  const updateDoc = (no, patch) => setDocs((cur) => cur.map((d) => (d.no === no ? { ...d, ...patch } : d)));
  const card = docs.find((d) => d.no === openNo) || null;
  const [uploadFor, setUploadFor] = useState(null);   // null | { participant? } — открыто окно загрузки
  const [editorFor, setEditorFor] = useState(null);   // null | { participant? } — открыт редактор квитанции

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
  const matchesQ = (d) => !q || `${d.no} ${d.name} ${d.order} ${d.participant} ${d.type}`.toLowerCase().includes(q.toLowerCase());
  let rows = docs.filter((d) => cur.test(d) && (!fStatus || d.status === fStatus) && matchesQ(d));
  const open = (d) => onOpenDoc ? onOpenDoc(d) : setOpenNo(d.no);

  // passenger view data: travel docs grouped per passenger + a separate bookkeeping block
  const paxDocs = (name) => docs.filter((d) => d.participant === name && !DOC_BOOKKEEPING.includes(d.type) && (!fStatus || d.status === fStatus) && matchesQ(d));
  const bookkeeping = docs.filter((d) => DOC_BOOKKEEPING.includes(d.type) && (!fStatus || d.status === fStatus) && matchesQ(d));
  const paxList = canGroupByPax
    ? participants.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || paxDocs(p.name).length)
    : [];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {canGroupByPax && (
          <div className="trip-toggle" style={{ display: 'inline-flex' }}>
            <button className={view === 'byType' ? 'on' : ''} onClick={() => setView('byType')}>По типу</button>
            <button className={view === 'byPassenger' ? 'on' : ''} onClick={() => setView('byPassenger')}>По пассажирам</button>
          </div>
        )}
        {view === 'byType' && <Tabs tabs={TYPE_TABS.map((t) => ({ key: t.key, label: t.label, count: docs.filter(t.test).length }))} value={tab} onChange={setTab} />}
        <div style={{ flex: 1 }} />
        <SearchBox value={q} onChange={setQ} placeholder={view === 'byPassenger' ? 'Поиск пассажира или документа…' : 'Поиск документа…'} style={{ width: 230 }} />
        <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={Object.keys(DOC_STATUS2)} />
        <Button icon="plus" onClick={() => setUploadFor({})}>Загрузить</Button>
      </div>

      {view === 'byPassenger' ? (
        <>
          {paxList.length ? paxList.map((p) => (
            <DocPassengerGroup key={p.name} name={p.name} role={p.role} docs={paxDocs(p.name)} onOpen={open} onUpload={() => setUploadFor({ participant: p.name })} />
          )) : <EmptyState icon="users" title="Пассажиры не найдены" />}

          <h3 className="section-title" style={{ fontSize: 17, margin: '22px 0 12px' }}>Документы по заказу · бухгалтерия</h3>
          {bookkeeping.length ? (
            <div className="card card-pad">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {bookkeeping.map((d) => {
                  const k = DOC_KIND[d.type] || DOC_KIND['Прочее'];
                  return (
                    <button key={d.no} className="doc-chip" style={{ width: 'auto' }} onClick={() => open(d)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={k.icon} />{d.name}</span>
                      <Pill tone={DOC_STATUS2[d.status]}>{d.status}</Pill>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : <div style={{ color: 'var(--muted)', fontSize: 14 }}>Бухгалтерских документов нет</div>}
        </>
      ) : (
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
      )}
      {card && <DocCard doc={card} onClose={() => setOpenNo(null)} onChange={updateDoc} />}

      <DocUploadModal open={!!uploadFor} scopeOrder={scopeOrder} participants={participants || []}
        defaultParticipant={uploadFor && uploadFor.participant}
        onClose={() => setUploadFor(null)}
        onUploaded={(doc) => { setDocs((cur) => [doc, ...cur]); setUploadFor(null); toast('Файл добавлен в документы заказа', 'ok', { title: 'Документ загружен', action: { label: 'Открыть «Документы»', route: 'documents' } }); }}
        onRouteToEditor={(info) => { setUploadFor(null); setEditorFor({ participant: info.participant !== '—' ? info.participant : null }); }} />

      {editorFor && (
        <DocCorrectionPanel
          subjects={correctionSubjects(participants, editorFor.participant)}
          meta={{ cfg: docCorrKind('Авиа'), supplier: 'Поставщик', route: 'Маршрут по заказу', dates: new Date().toLocaleDateString('ru-RU'), carrierName: '—', baseFareTotal: 1600, itinerary: [] }}
          currency="USD" orderNo={scopeOrder || null} onClose={() => setEditorFor(null)} />
      )}
    </div>
  );
}

function DocCenterPage() {
  return (<><Topbar title="Документы" /><div className="content"><DocCenter /></div></>);
}

/* ====================================================================
   ИМПОРТ МАРШРУТ-КВИТАНЦИЙ  (мастер: Загрузка → Распознавание → Проверка → Заказ)
   Менеджер загружает квитанции (авиа/ЖД/отель/…), система пошагово распознаёт
   наполнение, данные редактируются и привязываются к заказу.
   Демонстрационное распознавание: наполнение построено на реальных бланках
   из папки «Маршрутки» (Смартавиа, Red Wings, Алроса) — сеть не задействуется.
   ==================================================================== */
const REC_TYPES = [
  { key: 'Авиа',      doc: 'Маршрутная квитанция', icon: 'plane', color: '#2566ff', legLabel: 'Рейс',    docNoLabel: 'Номер билета', refLabel: 'PNR' },
  { key: 'ЖД',        doc: 'Маршрутная квитанция', icon: 'train', color: '#5a5af0', legLabel: 'Поезд',   docNoLabel: 'Билет №',      refLabel: 'Заказ №' },
  { key: 'Гостиница', doc: 'Ваучер',               icon: 'bed',   color: '#1f9d57', legLabel: 'Проживание', docNoLabel: 'Ваучер №',  refLabel: 'Код брони' },
  { key: 'Трансфер',  doc: 'Ваучер',               icon: 'car',   color: '#c47e22', legLabel: 'Трансфер', docNoLabel: 'Ваучер №',    refLabel: 'Заказ №' },
  { key: 'Прочее',    doc: 'Прочее',               icon: 'paperclip', color: '#9aa3b2', legLabel: 'Услуга', docNoLabel: 'Документ №', refLabel: 'Код' },
];
const recType = (key) => REC_TYPES.find((t) => t.key === key) || REC_TYPES[0];
const RECOG_STEPS = ['Извлечение текста', 'Пассажир и документ', 'Маршрут и рейсы', 'Тарифы и таксы', 'Проверка данных'];

// Типы маршрута — как в ТЗ клиента: «в одну сторону», «туда-обратно», «сложный маршрут».
// dir у сегмента: 'out' — туда, 'back' — обратно, 'seg' — плечо сложного маршрута.
const TRIP_TYPES = {
  oneway:    { label: 'В одну сторону',  arrow: '→' },
  roundtrip: { label: 'Туда-обратно',    arrow: '⇄' },
  complex:   { label: 'Сложный маршрут', arrow: '→' },
};
const tripLabel = (p) => (TRIP_TYPES[p.tripType] || TRIP_TYPES.oneway).label;
const legCode = (l, side) => (side === 'to' ? (l.toCode || l.to) : (l.fromCode || l.from)) || '';
function routeSummary(p) {
  if (!p.legs || !p.legs.length) return '—';
  if (p.tripType === 'roundtrip') {
    const out = p.legs.find((l) => l.dir !== 'back') || p.legs[0];
    return legCode(out, 'from') + ' ⇄ ' + legCode(out, 'to');
  }
  return p.legs.map((l) => legCode(l, 'from')).concat([legCode(p.legs[p.legs.length - 1], 'to')]).join(' → ');
}

// Пул «распознанных» данных по типу услуги — построен на реальных бланках поставщиков.
const PARSE_POOL = {
  'Авиа': [
    // в одну сторону (Смартавиа, Телегин)
    { carrier: 'Смартавиа', carrierCode: '5N', passenger: 'TELEGIN IVAN KONSTANTINOVICH', dob: '18.05.1993', docNo: 'ПС 2213067219', ticketNo: '316 2445197354', ref: 'V942WP', cls: 'ECONOMY', fareBasis: 'MLTOW', baggage: '0 PC', handBaggage: '10 кг', issueDate: '01.07.2026', tripType: 'oneway',
      legs: [{ from: 'Нижний Новгород · Стригино', fromCode: 'GOJ', to: 'Санкт-Петербург · Пулково Т1', toCode: 'LED', date: '19.07.2026', dep: '17:15', arr: '19:00', flightNo: '5N-1510', dir: 'out' }],
      currency: 'RUB', fare: 25328, taxes: 120, total: 25448 },
    // туда-обратно (S7)
    { carrier: 'S7 Airlines', carrierCode: 'S7', passenger: 'NESTEROVA IRINA IVANOVNA', dob: '04.09.1990', docNo: 'ПС 4501234567', ticketNo: '421 2135356261', ref: 'KJ7T2L', cls: 'ECONOMY', fareBasis: 'BLR', baggage: '1 PC', handBaggage: '10 кг', issueDate: '20.06.2026', tripType: 'roundtrip',
      legs: [
        { from: 'Москва · Домодедово', fromCode: 'DME', to: 'Сочи · Адлер', toCode: 'AER', date: '10.07.2026', dep: '08:40', arr: '11:25', flightNo: 'S7 1135', dir: 'out' },
        { from: 'Сочи · Адлер', fromCode: 'AER', to: 'Москва · Домодедово', toCode: 'DME', date: '17.07.2026', dep: '19:10', arr: '21:55', flightNo: 'S7 1136', dir: 'back' },
      ],
      currency: 'RUB', fare: 14200, taxes: 3160, total: 17360 },
    // в одну сторону (Red Wings, Арутюнов)
    { carrier: 'Red Wings', carrierCode: 'WZ', passenger: 'ARUTIUNOV / GEVORK B', dob: '—', docNo: 'PSP756864778', ticketNo: '309 6111220993', ref: 'V8LG5G', cls: 'Economy / N', fareBasis: 'NSTOW', baggage: '1 PC', handBaggage: '1 место', issueDate: '30.06.2026', tripType: 'oneway',
      legs: [{ from: 'Нижний Новгород · Стригино', fromCode: 'GOJ', to: 'Ереван · Звартноц', toCode: 'EVN', date: '19.07.2026', dep: '08:20', arr: '12:45', flightNo: 'WZ 1347', dir: 'out' }],
      currency: 'RUB', fare: 30305, taxes: 1855, total: 32160 },
    // сложный маршрут с пересадкой (Алроса, Чувашов): Москва → Новосибирск → Мирный
    { carrier: 'Алроса', carrierCode: '6R', passenger: 'ЧУВАШОВ / ВЛАДИМИР Г', dob: '—', docNo: 'ПС 9814572697', ticketNo: '67A 6110494206', ref: 'BCPFR1', cls: 'Эконом / N', fareBasis: 'NLTOW', baggage: 'Нет', handBaggage: '1 место', issueDate: '07.06.2026', tripType: 'complex',
      legs: [
        { from: 'Москва · Внуково A', fromCode: 'VKO', to: 'Новосибирск · Толмачёво', toCode: 'OVB', date: '09.06.2026', dep: '15:45', arr: '23:45', flightNo: '6R 544', dir: 'seg' },
        { from: 'Новосибирск · Толмачёво', fromCode: 'OVB', to: 'Мирный', toCode: 'MJZ', date: '10.06.2026', dep: '08:30', arr: '11:15', flightNo: '6R 590', dir: 'seg' },
      ],
      currency: 'RUB', fare: 18000, taxes: 2400, total: 20400 },
  ],
  'ЖД': [
    { carrier: 'РЖД', carrierCode: 'РЖД', passenger: 'ИВАНОВ ИВАН ИВАНОВИЧ', dob: '12.03.1988', docNo: '2213 №667788', ticketNo: '70 1234567890', ref: 'RZD-4471', cls: 'Купе', fareBasis: '—', baggage: '—', handBaggage: '—', issueDate: '28.06.2026', tripType: 'oneway',
      legs: [{ from: 'Москва · Казанский', fromCode: 'MOW', to: 'Казань', toCode: 'KZN', date: '12.07.2026', dep: '22:10', arr: '09:30', flightNo: 'Поезд 024Й · ваг 07, м 12', dir: 'out' }],
      currency: 'RUB', fare: 3200, taxes: 0, total: 3200 },
  ],
  'Гостиница': [
    { carrier: 'Jannat Hotel 4*', carrierCode: '', passenger: 'ПЕТРОВ СЕРГЕЙ', dob: '—', docNo: 'V-778210', ticketNo: 'V-778210', ref: 'BK-90312', cls: 'Standard DBL', fareBasis: 'BB (завтрак)', baggage: '—', handBaggage: '—', issueDate: '25.06.2026', tripType: 'stay',
      legs: [{ from: 'Заезд 12.07.2026 14:00', fromCode: '', to: 'Выезд 15.07.2026 12:00', toCode: '', date: '3 ночи', dep: '', arr: '', flightNo: 'DBL · Завтрак включён', dir: 'out' }],
      currency: 'USD', fare: 240, taxes: 18, total: 258 },
  ],
  'Трансфер': [
    { carrier: 'Karimov Transfer', carrierCode: '', passenger: 'ПЕТРОВ СЕРГЕЙ', dob: '—', docNo: 'TR-5521', ticketNo: 'TR-5521', ref: 'TRF-118', cls: 'Седан', fareBasis: '—', baggage: '2 места', handBaggage: '—', issueDate: '01.07.2026', tripType: 'oneway',
      legs: [{ from: 'Аэропорт Манас', fromCode: '', to: 'Отель Jannat', toCode: '', date: '12.07.2026', dep: '15:30', arr: '', flightNo: 'Toyota Camry · 1-4 pax', dir: 'out' }],
      currency: 'USD', fare: 30, taxes: 0, total: 30 },
  ],
  'Прочее': [
    { carrier: 'Поставщик', carrierCode: '', passenger: 'Клиент', dob: '—', docNo: '—', ticketNo: '—', ref: '—', cls: '—', fareBasis: '—', baggage: '—', handBaggage: '—', issueDate: '—', tripType: 'oneway',
      legs: [{ from: 'Услуга', fromCode: '', to: '', toCode: '', date: '—', dep: '', arr: '', flightNo: '', dir: 'out' }],
      currency: 'USD', fare: 0, taxes: 0, total: 0 },
  ],
};
let RID = 0;
// Пока серверный OCR не вернул данные, создаём пустую структуру для ручной проверки.
// Важно: никогда не подставляем сведения из другой/демонстрационной квитанции.
function emptyReceiptParse(file) {
  return {
    carrier: '', carrierCode: '', passenger: '', dob: '', docNo: '', ticketNo: '', ref: '',
    cls: '', fareBasis: '', baggage: '', handBaggage: '', issueDate: '', tripType: file.type === 'Гостиница' ? 'stay' : 'oneway',
    legs: [{ from: '', fromCode: '', to: '', toCode: '', date: '', dep: '', arr: '', flightNo: '', dir: 'out' }],
    currency: file.type === 'Гостиница' || file.type === 'Трансфер' ? 'USD' : 'RUB', fare: '', taxes: '', total: '',
    recognitionPending: true,
  };
}
function guessType(name) {
  const n = (name || '').toLowerCase();
  if (/(hotel|отел|voucher|ваучер|room|гостиниц)/.test(n)) return 'Гостиница';
  if (/(train|ржд|поезд|rail|жд)/.test(n)) return 'ЖД';
  if (/(transfer|трансфер|car)/.test(n)) return 'Трансфер';
  return 'Авиа';
}
const recMoney = (v, c) => (v < 0 ? '− ' : '') + Math.abs(v).toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c);
const recComputed = (p) => (Number(p.fare) || 0) + (Number(p.taxes) || 0);
// Строка одного плеча маршрута (город → город · дата · время · рейс).
function LegLine({ l }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0', fontSize: 12.5, color: 'var(--body)' }}>
      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{l.from}{l.to ? ' → ' + l.to : ''}</span>
      <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{[l.date, [l.dep, l.arr].filter(Boolean).join('–'), l.flightNo].filter(Boolean).join(' · ')}</span>
    </div>
  );
}
// Блок маршрута с учётом типа: в одну сторону / туда-обратно (Туда/Обратно) / сложный (плечи с пересадками).
function RouteView({ p, isStay }) {
  if (isStay) {
    return (<div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12.5, marginBottom: 4 }}>Проживание</div>
      {p.legs.map((l, i) => <LegLine key={i} l={l} />)}
    </div>);
  }
  const tt = p.tripType || 'oneway';
  const Group = ({ title, legs }) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.03em', margin: '4px 0 2px' }}>{title}</div>
      {legs.map((l, i) => <LegLine key={i} l={l} />)}
    </div>
  );
  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12.5 }}>Маршрут</span>
        <Pill tone="blue">{tripLabel(p)}</Pill>
      </div>
      {tt === 'roundtrip' ? (
        <>
          <Group title="Туда" legs={p.legs.filter((l) => l.dir !== 'back')} />
          <Group title="Обратно" legs={p.legs.filter((l) => l.dir === 'back')} />
        </>
      ) : p.legs.map((l, i) => (
        <React.Fragment key={i}>
          <LegLine l={l} />
          {tt === 'complex' && i < p.legs.length - 1 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', padding: '0 0 2px 2px' }}>↳ пересадка{legCode(l, 'to') ? ' · ' + legCode(l, 'to') : ''}</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
function RSub({ children, style }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.02em', margin: '20px 2px 10px', ...style }}>{children}</div>;
}

/* Компактный предпросмотр распознанной квитанции (шаг «Проверка»). */
function ReceiptPreview({ type, p }) {
  const t = recType(type);
  const total = Number(p.total) || recComputed(p);
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: '2px solid var(--ink)' }}>
        <span style={{ width: 34, height: 34, borderRadius: 8, background: t.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={t.icon} style={{ width: 18, height: 18, color: '#fff' }} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>{p.carrier || '—'}</div>
          <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>{t.doc}</div>
        </div>
        <div style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 11 }}>{t.refLabel}<br /><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.ref || '—'}</span></div>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12.5, marginBottom: 10 }}>
          {[[t.legLabel === 'Проживание' ? 'Гость' : 'Пассажир', p.passenger], [t.docNoLabel, p.ticketNo], ['Класс/тариф', [p.cls, p.fareBasis].filter((x) => x && x !== '—').join(' · ') || '—'], ['Багаж', p.baggage]].map(([k, v]) => (
            <div key={k}><span style={{ color: 'var(--muted)' }}>{k}: </span><span style={{ fontWeight: 600, color: 'var(--ink)' }}>{v || '—'}</span></div>
          ))}
        </div>
        <RouteView p={p} isStay={t.legLabel === 'Проживание'} />
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8, fontSize: 12.5 }}>
          {[['Тариф', p.fare], ['Таксы и сборы', p.taxes]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ color: 'var(--ink)' }}>{recMoney(Number(v) || 0, p.currency)}</span></div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '2px solid var(--ink)', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
            <span>Итого</span><span>{recMoney(total, p.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Редактируемая форма распознанной квитанции. */
function ReceiptEditForm({ type, p, onChange }) {
  const t = recType(type);
  const isStay = t.legLabel === 'Проживание';
  const canTrip = type === 'Авиа' || type === 'ЖД';
  const set = (k, v) => onChange({ ...p, [k]: v });
  const setLeg = (i, k, v) => onChange({ ...p, legs: p.legs.map((l, ix) => (ix === i ? { ...l, [k]: v } : l)) });
  const addLeg = () => {
    const tt = p.tripType === 'roundtrip' ? 'roundtrip' : 'complex';
    const dir = p.tripType === 'roundtrip' ? 'back' : 'seg';
    const legs = p.tripType === 'oneway' ? p.legs.map((l) => ({ ...l, dir: 'seg' })) : p.legs;
    onChange({ ...p, tripType: tt, legs: [...legs, { from: '', fromCode: '', to: '', toCode: '', date: '', dep: '', arr: '', flightNo: '', dir }] });
  };
  const delLeg = (i) => onChange({ ...p, legs: p.legs.filter((_, ix) => ix !== i) });
  const setTrip = (tt) => {
    let legs = p.legs.map((l) => ({ ...l }));
    if (tt === 'oneway') { legs = [{ ...(legs[0] || {}), dir: 'out' }]; }
    else if (tt === 'roundtrip') {
      const out = { ...(legs[0] || {}), dir: 'out' };
      const b = legs.find((l) => l.dir === 'back') || legs[1] || {};
      legs = [out, { ...b, dir: 'back', from: b.from || out.to, fromCode: b.fromCode || out.toCode, to: b.to || out.from, toCode: b.toCode || out.fromCode, date: b.date || '', dep: b.dep || '', arr: b.arr || '', flightNo: b.flightNo || '' }];
    } else { legs = legs.map((l) => ({ ...l, dir: 'seg' })); if (legs.length < 2) legs.push({ from: '', fromCode: '', to: '', toCode: '', date: '', dep: '', arr: '', flightNo: '', dir: 'seg' }); }
    onChange({ ...p, tripType: tt, legs });
  };
  const legTitle = (i) => {
    if (p.tripType === 'roundtrip') return p.legs[i].dir === 'back' ? 'Обратно' : 'Туда';
    if (p.tripType === 'complex') return 'Плечо ' + (i + 1);
    return t.legLabel;
  };
  return (
    <div>
      <RSub style={{ marginTop: 0 }}>{recType(type).legLabel === 'Проживание' ? 'Гость и бронь' : 'Пассажир и документ'}</RSub>
      <div className="form-grid">
        <Field label={t.legLabel === 'Проживание' ? 'Гость' : 'Пассажир'}><Input value={p.passenger} onChange={(e) => set('passenger', e.target.value)} /></Field>
        <Field label="Дата рождения"><Input value={p.dob} onChange={(e) => set('dob', e.target.value)} /></Field>
        <Field label="Документ"><Input value={p.docNo} onChange={(e) => set('docNo', e.target.value)} /></Field>
        <Field label={t.docNoLabel}><Input value={p.ticketNo} onChange={(e) => set('ticketNo', e.target.value)} /></Field>
        <Field label={t.refLabel}><Input value={p.ref} onChange={(e) => set('ref', e.target.value)} /></Field>
        <Field label="Перевозчик / поставщик"><Input value={p.carrier} onChange={(e) => set('carrier', e.target.value)} /></Field>
        <Field label="Класс"><Input value={p.cls} onChange={(e) => set('cls', e.target.value)} /></Field>
        <Field label="Тариф (fare basis)"><Input value={p.fareBasis} onChange={(e) => set('fareBasis', e.target.value)} /></Field>
        <Field label="Багаж"><Input value={p.baggage} onChange={(e) => set('baggage', e.target.value)} /></Field>
        <Field label="Ручная кладь"><Input value={p.handBaggage} onChange={(e) => set('handBaggage', e.target.value)} /></Field>
      </div>

      <RSub style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{isStay ? 'Проживание' : 'Маршрут'}</span>
        <button className="btn btn-ghost btn-sm" onClick={addLeg}><Icon name="plus" style={{ width: 14, height: 14 }} /> {p.tripType === 'roundtrip' ? 'Плечо' : 'Сегмент'}</button>
      </RSub>
      {canTrip && (
        <div className="trip-toggle" style={{ display: 'inline-flex', marginBottom: 12 }}>
          {Object.keys(TRIP_TYPES).map((k) => (
            <button key={k} className={(p.tripType || 'oneway') === k ? 'on' : ''} onClick={() => setTrip(k)}>{TRIP_TYPES[k].label}</button>
          ))}
        </div>
      )}
      {p.legs.map((l, i) => (
        <div key={i} className="card card-pad" style={{ marginBottom: 10, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--muted)' }}>{isStay ? t.legLabel : legTitle(i)}</span>
            {p.legs.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => delLeg(i)}><Icon name="trash" style={{ width: 14, height: 14 }} /></button>}
          </div>
          <div className="form-grid">
            <Field label="Откуда"><Input value={l.from} onChange={(e) => setLeg(i, 'from', e.target.value)} /></Field>
            <Field label="Куда"><Input value={l.to} onChange={(e) => setLeg(i, 'to', e.target.value)} /></Field>
            <Field label="Дата"><Input value={l.date} onChange={(e) => setLeg(i, 'date', e.target.value)} /></Field>
            <Field label={t.legLabel === 'Проживание' ? 'Условия' : 'Рейс / поезд'}><Input value={l.flightNo} onChange={(e) => setLeg(i, 'flightNo', e.target.value)} /></Field>
            <Field label="Вылет / заезд"><Input value={l.dep} onChange={(e) => setLeg(i, 'dep', e.target.value)} /></Field>
            <Field label="Прилёт / выезд"><Input value={l.arr} onChange={(e) => setLeg(i, 'arr', e.target.value)} /></Field>
          </div>
        </div>
      ))}

      <RSub>Стоимость</RSub>
      <div className="form-grid">
        <Field label="Валюта"><Select options={['RUB', 'USD', 'EUR', 'KGS', 'KZT']} value={p.currency} onChange={(e) => set('currency', e.target.value)} /></Field>
        <Field label="Тариф"><Input type="number" value={p.fare} onChange={(e) => set('fare', e.target.value)} /></Field>
        <Field label="Таксы и сборы"><Input type="number" value={p.taxes} onChange={(e) => set('taxes', e.target.value)} /></Field>
        <Field label="Итого"><Input type="number" value={p.total} onChange={(e) => set('total', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => set('total', recComputed(p))}><Icon name="calc" style={{ width: 14, height: 14 }} /> Пересчитать итог (тариф + таксы)</button>
      </div>
    </div>
  );
}

/* Верхний степпер мастера импорта. */
/* Статусы сверки квитанции (паттерн клиента: «Импорт списка пассажиров»). */
const REC_STATUS = {
  'Распознано':       { tone: 'green', action: 'Проверить' },
  'Требует проверки': { tone: 'amber', action: 'Заполнить'  },
  'Возможный дубль':  { tone: 'red',   action: 'Пропустить' },
  'Ошибка':           { tone: 'gray',  action: 'Повторить'  },
};
// Статус выводится из распознанных данных: дубль по номеру билета, нехватка ключевых полей и т.д.
function receiptStatus(parsed, seen) {
  if (!parsed) return 'Ошибка';
  const tno = (parsed.ticketNo || '').trim();
  if (tno && seen.has(tno)) return 'Возможный дубль';
  if (tno) seen.add(tno);
  if (parsed.recognitionPending || !parsed.passenger || !(Number(parsed.total) > 0)) return 'Требует проверки';
  if (parsed.dob === '—' || parsed.docNo === '—') return 'Требует проверки';
  return 'Распознано';
}

/* Боковой редактор одной квитанции — открывается по действию «Проверить». */
function ReceiptEditDrawer({ open, file, onClose, onChange, onBrand }) {
  if (!open || !file) return null;
  return (
    <Drawer open={open} onClose={onClose} title={'Проверка · ' + (file.parsed.passenger || 'квитанция')}
      footer={<>
        {file.originalUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(file.originalUrl, '_blank')}>Оригинал</Button>}
        {onBrand && <Button variant="secondary" icon="template" onClick={onBrand}>На фирменном бланке</Button>}
        <Button style={{ flex: 1 }} icon="check" onClick={onClose}>Готово</Button>
      </>}>
      <RSub style={{ marginTop: 0, marginBottom: 8 }}>Предпросмотр распознанного</RSub>
      <div style={{ marginBottom: 16 }}><ReceiptPreview type={file.type} p={file.parsed} /></div>
      <ReceiptEditForm type={file.type} p={file.parsed} onChange={(p) => onChange(file.id, p)} />
    </Drawer>
  );
}

/* Редактор финансовой математики одной квитанции (единично) — бланк поставщика не меняется. */
function ReceiptMathDrawer({ open, file, math, onSave, onClose }) {
  const [m, setM] = useState(math || { tariff: 0, fee: 0, markup: 0, commission: 0 });
  useEffect(() => { if (open && math) setM(math); }, [open, file && file.id]);
  if (!open || !file) return null;
  const cur = file.parsed.currency; const sym = cur === 'USD' ? '$' : cur;
  const num = (v) => Math.round(Number(v) || 0);
  const client = num(m.tariff) + num(m.fee) + num(m.markup);
  const fld = (k, l, hint) => (
    <div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 5 }}>{l}, {sym}{hint && <span style={{ color: 'var(--muted-2)' }}> · {hint}</span>}</div>
      <input className="input" type="number" min="0" value={m[k] ?? ''} onChange={(e) => setM((s) => ({ ...s, [k]: e.target.value }))} />
    </div>
  );
  return (
    <Drawer open={open} onClose={onClose} title={'Математика · ' + (file.parsed.passenger || 'квитанция')}
      sub={'Бланк поставщика: ' + recMoney(Number(file.parsed.total) || 0, cur) + ' — сохраняется без изменений'}
      width="min(460px,94vw)"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" onClick={() => { onSave({ tariff: num(m.tariff), fee: num(m.fee), markup: num(m.markup), commission: num(m.commission) }); onClose(); }}>Сохранить</Button>
      </>}>
      <div style={{ display: 'grid', gap: 14 }}>
        {fld('tariff', 'Тариф поставщика', 'из бланка')}
        {fld('fee', 'Сервисный сбор')}
        {fld('markup', 'Агентская надбавка')}
        {fld('commission', 'Комиссия поставщика')}
      </div>
      <div className="card card-pad" style={{ marginTop: 16, background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--ink)' }}><span>Итого клиенту</span><span>{recMoney(client, cur)}</span></div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Тариф + сбор + надбавка. Комиссия — вознаграждение от поставщика.</div>
      </div>
    </Drawer>
  );
}

/* ====================================================================
   ИМПОРТ МАРШРУТ-КВИТАНЦИЙ — модальная панель по паттерну клиента
   («Импорт списка пассажиров», Авиа (подбор)/Импорт группы.png):
   загрузка → блок «Квитанции обработаны» со счётчиками → таблица сверки
   со статусом и действием по каждой квитанции → настройка → «Добавить в заказ».
   ==================================================================== */
const ORDER_OPTIONS = ORDERS.map((o) => '№ ' + o.no + ' · ' + o.client);
function ReceiptImportModal({ open, onClose, onDone }) {
  const toast = useToast();
  const [files, setFiles] = useState([]);      // { id, name, size, type, poolIx, status:'queued'|'scanning'|'done', parsed }
  const [excluded, setExcluded] = useState({}); // id -> true (пропущенные вручную/дубли)
  const [editId, setEditId] = useState(null);
  const [orderPick, setOrderPick] = useState('Новый заказ');
  const [optAddIncomplete, setOptAddIncomplete] = useState(false);
  const [optCreateServices, setOptCreateServices] = useState(true);
  // Финансовая математика поверх оригинального бланка поставщика (бланк не меняется)
  const [math, setMath] = useState({});         // id -> { tariff, fee, markup, commission }
  const [sel, setSel] = useState({});           // id -> true (для группового применения)
  const [mathId, setMathId] = useState(null);   // id квитанции в редакторе суммы (единично)
  const [brandId, setBrandId] = useState(null); // id квитанции, открытой на фирменном бланке (предпросмотр + сохранение)
  const [bulk, setBulk] = useState({ fee: '', markup: '', commission: '' });
  const fileRef = useRef(null);
  const poolCounter = useRef({});

  useEffect(() => { if (open) { setFiles([]); setExcluded({}); setEditId(null); setOrderPick('Новый заказ'); setOptAddIncomplete(false); setOptCreateServices(true); setMath({}); setSel({}); setMathId(null); setBrandId(null); setBulk({ fee: '', markup: '', commission: '' }); poolCounter.current = {}; } }, [open]);

  // математика по квитанции: сохранённая правка или дефолт из бланка поставщика
  const getMath = (id, p) => math[id] || { tariff: Math.round(Number(p && p.total) || 0), fee: 0, markup: 0, commission: 0 };
  const setMathFor = (id, p, patch) => setMath((m) => ({ ...m, [id]: { ...getMath(id, p), ...patch } }));
  const clientTotal = (m) => Math.round((Number(m.tariff) || 0) + (Number(m.fee) || 0) + (Number(m.markup) || 0));

  const fmtSize = (b) => (b / 1024 < 1024 ? Math.max(1, Math.round(b / 1024)) + ' КБ' : (b / 1048576).toFixed(1) + ' МБ');
  const addFiles = (list) => {
    setFiles((cur) => {
      const pending = cur.filter((f) => f.status !== 'done').length;
      const add = Array.from(list).map((f, i) => {
        const type = guessType(f.name);
        poolCounter.current[type] = poolCounter.current[type] || 0;
        const poolIx = poolCounter.current[type]++;
        const id = 'rf' + (RID++);
        const order = pending + i;
        // последовательное «распознавание»: сначала статус «сканируется», затем данные
        setTimeout(() => setFiles((c) => c.map((x) => (x.id === id ? { ...x, status: 'scanning' } : x))), 250 + order * 650);
        setTimeout(() => setFiles((c) => c.map((x) => (x.id === id ? { ...x, status: 'done', parsed: emptyReceiptParse(x) } : x))), 250 + order * 650 + 600);
        return { id, name: f.name, size: fmtSize(f.size || 40000), byteSize: f.size || 0, mime: f.type || '', lastModified: f.lastModified || null,
          originalUrl: typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(f) : null,
          type, poolIx, status: 'queued', parsed: null };
      });
      return [...cur, ...add];
    });
  };
  const onPick = (e) => { if (e.target.files && e.target.files.length) addFiles(e.target.files); e.target.value = ''; };
  const onDrop = (e) => { e.preventDefault(); if (e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); };
  const setType = (id, type) => setFiles((cur) => cur.map((f) => (f.id === id ? { ...f, type, parsed: f.parsed ? { ...f.parsed, ...emptyReceiptParse({ ...f, type }), recognitionPending: true } : null } : f)));
  const updateParsed = (id, parsed) => setFiles((cur) => cur.map((f) => (f.id === id ? { ...f, parsed: { ...parsed, recognitionPending: false } } : f)));
  const remove = (id) => { setFiles((cur) => cur.filter((f) => f.id !== id)); setExcluded((e) => { const n = { ...e }; delete n[id]; return n; }); };

  const processing = files.some((f) => f.status !== 'done');
  const done = files.filter((f) => f.status === 'done');

  // Все квитанции показываем строками сразу (в очереди/сканируется/готово) и обновляем на месте —
  // строки не «допрыгивают» по мере распознавания. Статус готовых — из распознанных данных.
  const rows = React.useMemo(() => {
    const seen = new Set();
    return files.map((f) => ({
      f,
      pending: f.status !== 'done',
      status: f.status === 'done' ? receiptStatus(f.parsed, seen) : (f.status === 'scanning' ? 'Сканируется' : 'В очереди'),
    }));
  }, [files.map((f) => f.id + f.status + (f.parsed ? f.parsed.ticketNo : '')).join(',')]);
  const doneRows = rows.filter((r) => !r.pending);

  // дубли по умолчанию исключаются из добавления
  useEffect(() => {
    setExcluded((cur) => {
      const next = { ...cur };
      doneRows.forEach((r) => { if (r.status === 'Возможный дубль' && next[r.f.id] === undefined) next[r.f.id] = true; });
      return next;
    });
  }, [doneRows.map((r) => r.f.id + r.status).join(',')]);

  const counts = doneRows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const isEligible = (r) => !r.pending && !excluded[r.f.id] && r.status !== 'Ошибка' && (r.status !== 'Требует проверки' || optAddIncomplete);
  const toAdd = doneRows.filter(isEligible);
  const editFile = files.find((f) => f.id === editId) || null;
  const mathFile = files.find((f) => f.id === mathId) || null;
  const brandFile = files.find((f) => f.id === brandId) || null;

  // групповое применение математики к выбранным (или ко всем готовым, если ничего не выбрано)
  const selIds = doneRows.filter((r) => sel[r.f.id]).map((r) => r.f.id);
  const applyBulk = () => {
    const targets = (selIds.length ? doneRows.filter((r) => sel[r.f.id]) : doneRows);
    const patch = {};
    if (bulk.fee !== '') patch.fee = Number(bulk.fee) || 0;
    if (bulk.markup !== '') patch.markup = Number(bulk.markup) || 0;
    if (bulk.commission !== '') patch.commission = Number(bulk.commission) || 0;
    if (!Object.keys(patch).length) { toast('Укажите сбор, надбавку или комиссию', 'err'); return; }
    setMath((m) => { const n = { ...m }; targets.forEach((r) => { n[r.f.id] = { ...getMath(r.f.id, r.f.parsed), ...patch }; }); return n; });
    toast('Математика применена к ' + targets.length + ' квитанц. · оригиналы поставщика сохранены', 'ok');
  };

  const finish = () => {
    if (!toAdd.length) { toast('Нет квитанций для добавления', 'err'); return; }
    const now = new Date().toLocaleDateString('ru-RU');
    const isNew = orderPick === 'Новый заказ';
    const orderNo = isNew ? 'новый' : Number(orderPick.replace(/[^0-9]/g, '').slice(0, 5));
    const docs = toAdd.map((r) => {
      const t = recType(r.f.type); const p = r.f.parsed; const m = getMath(r.f.id, p);
      return {
        no: 'D-' + Math.floor(3200 + Math.random() * 800),
        name: t.doc + ' ' + (p.carrier || '') + ' · ' + (p.passenger || '').split(/[\/ ]/)[0],
        type: t.doc, order: orderNo, participant: p.passenger || '—', service: r.f.type + ' · распознано',
        finOp: '—', status: 'Черновик', version: 1, date: now, size: r.f.size, parsed: p, recType: r.f.type,
        // бланк поставщика (оригинал) сохраняется отдельно; math — наша редактируемая математика
        supplierBlank: { name: r.f.name, size: r.f.size, byteSize: r.f.byteSize, mime: r.f.mime,
          lastModified: r.f.lastModified, originalUrl: r.f.originalUrl, total: Number(p.total) || 0, currency: p.currency },
        math: { ...m, clientTotal: clientTotal(m), currency: p.currency },
        versions: [{ v: 1, date: now, who: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор', note: 'Импорт из квитанции' }],
        history: [{ t: now, text: 'Распознано и привязано к заказу ' + orderNo, who: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор' }],
      };
    });
    onDone(docs);
    toast(isNew ? toAdd.length + ' квитанц. добавлено в новый заказ' : toAdd.length + ' квитанц. добавлено в заказ № ' + orderNo, 'ok');
  };

  const Stat = ({ label, value, tone }) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: value ? 'var(--' + tone + ')' : 'var(--muted-2)' }}>{value || 0}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title="Импорт маршрут-квитанций"
      sub="Квитанции сверяются и привязываются к заказу. Оригиналы поставщиков не меняются."
      width="min(1180px,98vw)">
      <div>

        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={onPick} accept=".pdf,.jpg,.jpeg,.png" />

        {/* Загрузка квитанций */}
        <RSub style={{ marginTop: 14 }}>Загрузка квитанций</RSub>
        <div onClick={() => fileRef.current && fileRef.current.click()} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
          style={{ border: '2px dashed var(--field-line)', borderRadius: 14, padding: '26px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)' }}>
          <span style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--blue-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="download" style={{ width: 22, height: 22, color: 'var(--blue)' }} /></span>
          <div style={{ marginTop: 10, fontWeight: 700, color: 'var(--ink)' }}>Перетащите файлы сюда</div>
          <div style={{ margin: '8px 0' }}><Button variant="secondary" size="sm">Выбрать файлы</Button></div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Авиа, ЖД, отели, трансферы · PDF, JPG, PNG · до 15 МБ</div>
        </div>

        {files.length > 0 && (
          <>
            {/* Квитанции обработаны — счётчики */}
            <RSub>Квитанции обработаны</RSub>
            <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Stat label="Распознано" value={counts['Распознано']} tone="green" />
              <Stat label="Требует проверки" value={counts['Требует проверки']} tone="amber" />
              <Stat label="Дубли" value={counts['Возможный дубль']} tone="red" />
              <Stat label="Ошибка" value={counts['Ошибка']} tone="muted-2" />
              {processing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12.5, whiteSpace: 'nowrap', paddingLeft: 12, borderLeft: '1px solid var(--line)' }}>
                  <Icon name="loader" style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> {done.length}/{files.length}
                </div>
              )}
            </div>

            {/* Сверка квитанций */}
            {rows.length > 0 && (() => {
              const allSel = doneRows.length > 0 && doneRows.every((r) => sel[r.f.id]);
              return (
              <>
                <RSub>Сверка квитанций</RSub>

                {/* Математика поставщика — групповое применение сбора/надбавки/комиссии */}
                {doneRows.length > 0 && (
                  <div className="card card-pad" style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: '0 0 100%', fontSize: 12.5, color: 'var(--muted)', marginBottom: -4 }}>
                      Математика: применить к {selIds.length ? 'выбранным (' + selIds.length + ')' : 'всем квитанциям'}. Оригинальный бланк поставщика сохраняется.
                    </div>
                    {[['fee', 'Сервисный сбор'], ['markup', 'Надбавка'], ['commission', 'Комиссия']].map(([k, l]) => (
                      <div key={k} style={{ width: 130 }}>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4 }}>{l}, $</div>
                        <input className="input" type="number" min="0" placeholder="0" value={bulk[k]} onChange={(e) => setBulk((b) => ({ ...b, [k]: e.target.value }))} />
                      </div>
                    ))}
                    <Button size="sm" icon="calc" onClick={applyBulk}>Применить{selIds.length ? ' (' + selIds.length + ')' : ' ко всем'}</Button>
                    <div style={{ flex: 1 }} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)' }}>
                      <Icon name="check" style={{ width: 15, height: 15 }} /> Оригинал поставщика будет сохранён
                    </span>
                  </div>
                )}

                <div className="table-card" style={{ overflowX: 'auto' }}>
                  <table className="tbl" style={{ minWidth: 980 }}>
                    <thead><tr>
                      <th style={{ width: 34 }}>{doneRows.length > 0 && <Checkbox on={allSel} onChange={() => setSel(allSel ? {} : Object.fromEntries(doneRows.map((r) => [r.f.id, true])))} />}</th>
                      <th>Квитанция</th><th>Маршрут / сумма</th><th style={{ width: 150 }}>Финансы (клиенту)</th><th style={{ width: 130 }}>Статус</th><th style={{ width: 250, position: 'sticky', right: 40, background: 'var(--surface-2)', zIndex: 2 }}>Действие</th><th style={{ width: 40, position: 'sticky', right: 0, background: 'var(--surface-2)', zIndex: 2 }}></th>
                    </tr></thead>
                    <tbody>
                      {rows.map((r) => {
                        const t = recType(r.f.type); const p = r.f.parsed; const st = REC_STATUS[r.status] || { tone: 'gray' };
                        const skipped = !!excluded[r.f.id];
                        if (r.pending) {
                          return (
                            // строго та же высота 80px, что и у «готовой» строки (действия не переносятся на 2-ю строку),
                            // статусы обновляются на месте — строки не прыгают и не подрастают при распознавании (ТЗ #2)
                            <tr key={r.f.id} style={{ height: 80 }}>
                              <td></td>
                              <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', flex: '0 0 30px' }} /><span style={{ flex: 1 }}><div className="sk" style={{ height: 12, width: 120, marginBottom: 6 }} /><div className="sk" style={{ height: 10, width: 80 }} /></span></span></td>
                              <td><div className="sk" style={{ height: 12, width: 140, marginBottom: 6 }} /><div className="sk" style={{ height: 10, width: 90 }} /></td>
                              <td><div className="sk" style={{ height: 12, width: 90, marginBottom: 6 }} /><div className="sk" style={{ height: 10, width: 70 }} /></td>
                              <td><Pill tone={r.status === 'Сканируется' ? 'blue' : 'gray'}>{r.status}</Pill></td>
                              <td colSpan={2} style={{ position: 'sticky', right: 0, background: '#fff' }}></td>
                            </tr>
                          );
                        }
                        const m = getMath(r.f.id, p);
                        const routeStr = routeSummary(p);
                        const isStayRow = t.legLabel === 'Проживание';
                        return (
                          <tr key={r.f.id} style={{ height: 80, opacity: skipped ? 0.5 : 1 }}>
                            <td><Checkbox on={!!sel[r.f.id]} onChange={() => setSel((s) => ({ ...s, [r.f.id]: !s[r.f.id] }))} /></td>
                            <td style={{ position: 'sticky', right: 40, background: '#fff', zIndex: 1 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ width: 30, height: 30, borderRadius: 8, background: t.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 30px' }}><Icon name={t.icon} style={{ width: 16, height: 16, color: '#fff' }} /></span>
                                <span><span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)' }}>{p.passenger}</span><span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.carrier} · {r.f.type}</span></span>
                              </span>
                            </td>
                            <td>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: 'var(--body)' }}>{routeStr}</span>{!isStayRow && <Pill tone="blue">{tripLabel(p)}</Pill>}</span>
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Бланк: {recMoney(Number(p.total) || 0, p.currency)}</span>
                            </td>
                            <td>
                              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, height: 'auto', display: 'block', textAlign: 'left' }} title="Изменить математику" onClick={() => setMathId(r.f.id)}>
                                <span style={{ display: 'block', fontWeight: 700, color: 'var(--ink)' }}>{recMoney(clientTotal(m), p.currency)}</span>
                                <span style={{ fontSize: 11.5, color: 'var(--blue)' }}>сбор {m.fee || 0} · надб. {m.markup || 0} · изменить</span>
                              </button>
                            </td>
                            <td><Pill tone={st.tone}>{r.status}</Pill></td>
                            <td>
                              {r.status === 'Возможный дубль'
                                ? <button className="btn btn-ghost btn-sm" onClick={() => setExcluded((e) => ({ ...e, [r.f.id]: !e[r.f.id] }))}>{skipped ? 'Вернуть' : 'Пропустить'}</button>
                                : (
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blue)', whiteSpace: 'nowrap' }} onClick={() => setEditId(r.f.id)}>{st.action}</button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blue)', whiteSpace: 'nowrap' }} title="Предпросмотр и сохранение на фирменном бланке" onClick={() => setBrandId(r.f.id)}><Icon name="template" style={{ width: 14, height: 14 }} /> На бланке</button>
                                  </div>
                                )}
                            </td>
                            <td style={{ position: 'sticky', right: 0, background: '#fff', zIndex: 1 }}><button className="btn btn-ghost btn-sm" onClick={() => remove(r.f.id)}><Icon name="trash" style={{ width: 15, height: 15 }} /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
              );
            })()}

            {/* Настройка добавления */}
            <RSub>Настройка добавления</RSub>
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--body)' }}>
                <span style={{ fontWeight: 600, color: 'var(--muted)', minWidth: 150 }}>Заказ для привязки</span>
                <Select options={['Новый заказ', ...ORDER_OPTIONS]} value={orderPick} onChange={(e) => setOrderPick(e.target.value)} style={{ flex: 1 }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--body)', cursor: 'pointer' }}>
                <Checkbox on={optCreateServices} onChange={() => setOptCreateServices((v) => !v)} /> Создавать услуги в заказе по квитанциям
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--body)', cursor: 'pointer' }}>
                <Checkbox on={optAddIncomplete} onChange={() => setOptAddIncomplete((v) => !v)} /> Добавлять квитанции с неполными данными
              </label>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button icon="check" disabled={processing || !toAdd.length} onClick={finish}>Добавить в заказ{toAdd.length ? ' (' + toAdd.length + ')' : ''}</Button>
        </div>
      </div>

      <ReceiptEditDrawer open={!!editFile} file={editFile} onClose={() => setEditId(null)} onChange={updateParsed}
        onBrand={() => { setBrandId(editId); setEditId(null); }} />
      <ReceiptMathDrawer open={!!mathFile} file={mathFile} math={mathFile ? getMath(mathFile.id, mathFile.parsed) : null}
        onSave={(patch) => { setMathFor(mathFile.id, mathFile.parsed, patch); }} onClose={() => setMathId(null)} />
      {/* Предпросмотр и сохранение распознанной квитанции на фирменном бланке — прямо из импорта (в т.ч. РЖД) */}
      {brandFile && (() => {
        const p = brandFile.parsed; const m = getMath(brandFile.id, p);
        return (
          <DocCorrectionPanel
            subjects={[{ name: p.passenger || 'Пассажир', type: 'Взрослый', docNo: p.ticketNo || brandFile.id, ref: p.ref || '—' }]}
            meta={{ cfg: docCorrKind(brandFile.type), supplier: p.carrier || 'Поставщик',
              route: routeSummary(p) + (p.tripType && p.tripType !== 'oneway' && p.tripType !== 'stay' ? ' · ' + tripLabel(p) : ''),
              dates: (p.legs && p.legs[0] && p.legs[0].date) || '—', carrierName: p.carrier || '—',
              baseFareTotal: Number(m.tariff) || Number(p.fare) || 0,
              supplierOriginal: { name: brandFile.name, originalUrl: brandFile.originalUrl },
              itinerary: (p.legs || []).map((l) => ({ route: (p.tripType === 'roundtrip' ? (l.dir === 'back' ? 'Обратно · ' : 'Туда · ') : '') + l.from + (l.to ? ' → ' + l.to : ''), date: l.date, flightNo: l.flightNo })) }}
            currency={p.currency || 'RUB'} orderNo={orderPick !== 'Новый заказ' ? orderPick : null} onClose={() => setBrandId(null)} />
        );
      })()}
    </Drawer>
  );
}


/* ====================================================================
   РЕДАКТОР КВИТАНЦИЙ (пункт бокового меню)
   Список маршрут-квитанций из всех заказов → открытие клиентского редактора
   (DocCorrectionPanel) с данными выбранной квитанции.
   ==================================================================== */
function ReceiptEditorPage() {
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);   // выбранная квитанция для редактора
  const [importing, setImporting] = useState(false);   // открыт мастер импорта
  const [imported, setImported] = useState([]);         // квитанции, добавленные через импорт
  const all = [...imported, ...DOCS2.filter((d) => d.type === 'Маршрутная квитанция')];
  const receipts = all.filter((d) => (!q || `${d.no} ${d.name} ${d.order} ${d.participant}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <Topbar title="Редактор квитанций" />
      <div className="content">
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                Загрузите маршрут-квитанции — система пошагово распознает наполнение, вы отредактируете данные и привяжете их к заказу.
              </div>
            </div>
            <SearchBox value={q} onChange={setQ} placeholder="Поиск квитанции…" style={{ width: 250 }} />
            <Button icon="download" onClick={() => setImporting(true)}>Импорт квитанций</Button>
          </div>

          {receipts.length ? (
            <div className="table-card" style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead><tr><th style={{ width: 90 }}>№</th><th>Квитанция</th><th>Заказ</th><th>Пассажир</th><th>Версия</th><th>Дата</th><th>Статус</th><th></th></tr></thead>
                <tbody>
                  {receipts.map((d) => {
                    const k = DOC_KIND[d.type];
                    return (
                      <tr key={d.no} style={{ cursor: 'pointer' }} onClick={() => setEdit(d)}>
                        <td className="t-strong" style={{ whiteSpace: 'nowrap' }}>{d.no}</td>
                        <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="airline-logo sm" style={{ background: k.color, width: 30, height: 30, borderRadius: 8, flex: '0 0 30px' }}><Icon name={k.icon} style={{ width: 16, height: 16 }} /></span><span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{d.name}</span></span></td>
                        <td style={{ whiteSpace: 'nowrap' }}><span style={{ color: 'var(--blue)', fontWeight: 600 }}>№ {d.order}</span></td>
                        <td className="t-muted" style={{ whiteSpace: 'nowrap' }}>{d.participant}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>v{d.version}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{d.date}</td>
                        <td><Pill tone={DOC_STATUS2[d.status]}>{d.status}</Pill></td>
                        <td><Button size="sm" variant="secondary" icon="template" onClick={(e) => { e.stopPropagation(); setEdit(d); }}>Редактор</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon="route" title="Маршрут-квитанции не найдены" sub="Загрузите квитанцию в заказе — она откроется здесь для редактирования." />}
        </div>
      </div>

      {edit && (() => {
        const p = edit.parsed;   // распознанные квитанции несут разобранные данные
        if (p) {
          return (
            <DocCorrectionPanel
              subjects={[{ name: p.passenger || edit.participant, type: 'Взрослый', docNo: p.ticketNo || edit.no, ref: p.ref || '—' }]}
              meta={{ cfg: docCorrKind(edit.recType || 'Авиа'), supplier: p.carrier || 'Поставщик',
                route: routeSummary(p) + (p.tripType && p.tripType !== 'oneway' && p.tripType !== 'stay' ? ' · ' + tripLabel(p) : ''),
                dates: (p.legs[0] && p.legs[0].date) || edit.date, carrierName: p.carrier || '—',
                baseFareTotal: Number(p.fare) || 0,
                supplierOriginal: edit.supplierBlank,
                itinerary: p.legs.map((l) => ({ route: (p.tripType === 'roundtrip' ? (l.dir === 'back' ? 'Обратно · ' : 'Туда · ') : '') + l.from + (l.to ? ' → ' + l.to : ''), date: l.date, flightNo: l.flightNo })) }}
              currency={p.currency || 'USD'} orderNo={edit.order} onClose={() => setEdit(null)} />
          );
        }
        return (
          <DocCorrectionPanel
            subjects={[{ name: edit.participant !== '—' ? edit.participant : 'Пассажир', type: 'Взрослый', docNo: edit.no, ref: '—' }]}
            meta={{ cfg: docCorrKind('Авиа'), supplier: 'Поставщик', route: edit.name, dates: edit.date, carrierName: '—', baseFareTotal: 1600, itinerary: [] }}
            currency="USD" orderNo={edit.order} onClose={() => setEdit(null)} />
        );
      })()}

      <ReceiptImportModal open={importing} onClose={() => setImporting(false)}
        onDone={(docs) => { setImported((cur) => [...docs, ...cur]); setImporting(false); }} />
    </>
  );
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
  DocCard, DocCenter, DocCenterPage, DocUploadModal, ReceiptEditorPage, FulfillmentRegistry, FulfillmentPage,
  fUsd, finPayable, finDebt,
});
