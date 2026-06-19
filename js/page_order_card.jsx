// ===== Order Card: the operator's main workspace =====

function ocCurrency(c = 'USD') {
  if (c === 'USD' || c === '$') return '$';
  if (c === 'RUB' || c === '₽') return '₽';
  if (c === 'EUR' || c === '€') return '€';
  if (c === 'KGS') return 'сом';
  return c;
}
function ocMoney(n, c = 'USD') { return Math.round(n).toLocaleString('ru-RU') + ' ' + ocCurrency(c); }
function opPayable(op) { return op.tariff + op.taxes + op.fee + op.penalty - op.discount; }
function opDebt(op) { return Math.max(0, opPayable(op) - op.paid - op.refund); }

/* Reusable async wrapper: loading / error / empty / content */
function AsyncBlock({ state = 'ok', onRetry, skeletonRows = 4, empty, children }) {
  if (state === 'loading') {
    return (
      <div className="card card-pad fade-in">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="sk" style={{ height: 18, width: (90 - i * 12) + '%', marginBottom: 14 }} />
        ))}
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="card err-block fade-in">
        <div className="ic"><Icon name="alertCircle" style={{ width: 30, height: 30 }} /></div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Не удалось загрузить данные</div>
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>Проверьте соединение и повторите попытку.</div>
        </div>
        <Button variant="secondary" icon="loader" onClick={onRetry}>Повторить</Button>
      </div>
    );
  }
  if (state === 'empty') return empty || <EmptyState />;
  return children;
}

/* Editable status pill in the header */
function StatusControl({ status, onChange }) {
  const opts = Object.keys(ORDER_STATUS);
  return (
    <ActionMenu trigger={
      <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Pill tone={ORDER_STATUS[status]}>{status}</Pill><Icon name="chevDown" style={{ width: 15, height: 15, color: 'var(--muted-2)' }} />
      </button>
    } items={opts.map((s) => ({ icon: status === s ? 'check' : null, label: s, onClick: () => onChange(s) }))} />
  );
}

/* financial calc helper — every service should carry tariff/taxes/fee/commission/total */
function svcCalc(s) {
  if (s.calc) return s.calc;
  return { tariff: s.sum, taxes: 0, fee: 0, commission: 0, total: s.sum };
}

/* ---- right info panel ---- */
function financeSnapshot(orderNo, services) {
  const ops = FIN_OPS.filter((o) => o.order === orderNo);
  const byKind = {};
  services.forEach((s) => {
    const calc = svcCalc(s);
    byKind[s.kind] = {
      total: (byKind[s.kind]?.total || 0) + calc.total,
      tariff: (byKind[s.kind]?.tariff || 0) + calc.tariff,
      taxes: (byKind[s.kind]?.taxes || 0) + calc.taxes,
      fee: (byKind[s.kind]?.fee || 0) + calc.fee,
      commission: (byKind[s.kind]?.commission || 0) + calc.commission,
      currency: s.currency || byKind[s.kind]?.currency || 'USD',
    };
  });
  ops.forEach((o) => {
    byKind[o.source] = {
      ...(byKind[o.source] || { total: 0, tariff: 0, taxes: 0, fee: 0, commission: 0, currency: o.currency }),
      paid: (byKind[o.source]?.paid || 0) + o.paid,
      debt: (byKind[o.source]?.debt || 0) + opDebt(o),
      margin: (byKind[o.source]?.margin || 0) + o.commission,
      payable: (byKind[o.source]?.payable || 0) + opPayable(o),
      refund: (byKind[o.source]?.refund || 0) + o.refund,
    };
  });
  return {
    byKind,
    tariffs: services.reduce((s, x) => s + svcCalc(x).tariff, 0),
    taxes: services.reduce((s, x) => s + svcCalc(x).taxes, 0),
    fees: services.reduce((s, x) => s + svcCalc(x).fee, 0),
    margin: ops.length ? ops.reduce((s, x) => s + (x.commission || 0), 0) : services.reduce((s, x) => s + svcCalc(x).commission, 0),
    total: services.reduce((s, x) => s + svcCalc(x).total, 0),
    paid: ops.reduce((s, x) => s + x.paid, 0),
    debt: ops.reduce((s, x) => s + opDebt(x), 0),
    refund: ops.reduce((s, x) => s + x.refund, 0),
    hasOps: ops.length > 0,
    currencies: [...new Set(services.map((s) => s.currency).concat(ops.map((o) => o.currency)).filter(Boolean))],
  };
}

function OrderAside({ onOpenTasks }) {
  const urgent = ORDER_TASKS.filter((t) => t.urgent);
  return (
    <div className="oc-aside">
      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 className="card-title" style={{ fontSize: 17 }}>Ближайшие дедлайны</h3>
          {urgent.length > 0 && <span className="pill pill-red">{urgent.length}</span>}
        </div>
        {ORDER_TASKS.map((t, i) => (
          <div className="oc-task" key={i} onClick={onOpenTasks} style={{ cursor: 'pointer' }}>
            <span className={'dot' + (t.urgent ? ' urgent' : '')} />
            <div><div className="tt">{t.text}</div><div className={'td' + (t.urgent ? ' urgent' : '')}>{t.due}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================================================================
   TRIP SUMMARY — top panel computed from the "Создать заказ" data:
   route, dates, pax, trip type, cabin, chosen services & their status.
   ==================================================================== */
function tripFromServices(services, aviaParams) {
  const avia = services.find((s) => s.kind === 'Авиа');
  if (avia) {
    const m = avia.title.match(/^(.+?)\s*→\s*(.+?)(?:\s*→.+)?$/);
    return { from: m ? m[1] : aviaParams.from, to: m ? m[2] : aviaParams.to, dates: avia.date };
  }
  const dep = aviaParams.depDate ? fmtDate(aviaParams.depDate) : '24.06';
  const ret = aviaParams.trip === 'rt' ? ' – ' + (aviaParams.retDate ? fmtDate(aviaParams.retDate) : '01.07') : '';
  return { from: aviaParams.from, to: aviaParams.to, dates: dep + ret };
}

function TripSummaryBar({ order, services, participants, aviaParams, requestType, onEdit }) {
  const trip = tripFromServices(services, aviaParams);
  const isGroup = requestType === 'Групповая';
  const errCount = participants.filter((p) => p.docStatus === 'check').length;
  const lead = participants.find((p) => p.lead) || participants[0];
  const confirmedCount = services.filter((s) => s.status === 'Выписано' || s.status === 'Подтверждено').length;
  return (
    <div className="oc-trip" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
            <Icon name="plane" style={{ width: 17, height: 17, color: 'var(--blue)' }} />
            {trip.from} → {trip.to}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13.5, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" style={{ width: 14, height: 14 }} />{trip.dates}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="users" style={{ width: 14, height: 14 }} />{lead ? lead.name : order.client}{isGroup ? ` +${Math.max(0, participants.length - 1)}` : ''}</span>
            <span>{requestType} · {aviaParams.cabin}</span>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon="edit" onClick={onEdit}>Редактировать данные</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {services.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Услуги не выбраны</span>}
        {services.map((s) => {
          const k = SERVICE_KIND[s.kind];
          return (
            <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--ink)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 999, padding: '6px 12px' }}>
              <Icon name={k.icon} style={{ width: 13, height: 13, color: k.color }} />{s.kind}
              <Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill>
            </span>
          );
        })}
        {services.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: errCount ? 'var(--amber)' : 'var(--green)' }}>
            <Icon name={errCount ? 'alertCircle' : 'checkCircle'} style={{ width: 13, height: 13 }} />
            {confirmedCount}/{services.length} подтверждено{errCount ? ` · ${errCount} ошибки в документах` : ''}
          </span>
        )}
      </div>

      {isGroup && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: errCount ? 'var(--amber)' : 'var(--muted)', marginTop: 8 }}>
          Поимённый список: {participants.length - errCount} без ошибок{errCount ? `, ${errCount} требуют проверки` : ''}
        </div>
      )}
    </div>
  );
}

/* ---- trip data edit modal: route / dates / pax / trip type / cabin ---- */
function TripEditModal({ open, onClose, aviaParams, setAviaParams, requestType, setRequestType }) {
  const toast = useToast();
  const [f, setF] = useState(aviaParams);
  const [rt, setRt] = useState(requestType);
  useEffect(() => { if (open) { setF(aviaParams); setRt(requestType); } }, [open]);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const submit = () => { setAviaParams(f); setRequestType(rt); toast('Данные поездки обновлены', 'ok'); onClose(); };
  return (
    <Drawer open={open} onClose={onClose} title="Данные поездки"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" onClick={submit}>Сохранить</Button></>}>
      <div className="form-grid">
        <Field label="Откуда"><Input value={f.from} onChange={(e) => set('from')(e.target.value)} /></Field>
        <Field label="Куда"><Input value={f.to} onChange={(e) => set('to')(e.target.value)} /></Field>
        <div className="full"><Field label="Тип рейса"><Select options={[{ value: 'rt', label: 'Туда и обратно' }, { value: 'ow', label: 'В одну сторону' }, { value: 'mc', label: 'Сложный маршрут' }]} value={f.trip} onChange={(e) => set('trip')(e.target.value)} /></Field></div>
        <div className="full"><DateRangeField label="Даты поездки" startVal={f.depDate} endVal={f.retDate} onChange={(s, e) => setF((p) => ({ ...p, depDate: s, retDate: e }))} /></div>
        <Field label="Взрослые">
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <button className="btn btn-secondary btn-icon btn-sm" disabled={f.pax.adt <= 1} onClick={() => set('pax')({ ...f.pax, adt: f.pax.adt - 1 })}>−</button>
            <span style={{ fontWeight: 700 }}>{f.pax.adt}</span>
            <button className="btn btn-secondary btn-icon btn-sm" onClick={() => set('pax')({ ...f.pax, adt: f.pax.adt + 1 })}>+</button>
          </div>
        </Field>
        <Field label="Класс обслуживания"><Select options={['Эконом', 'Комфорт', 'Бизнес']} value={f.cabin} onChange={(e) => set('cabin')(e.target.value)} /></Field>
        <div className="full"><Field label="Тип заявки"><Select options={REQUEST_TYPE} value={rt} onChange={(e) => setRt(e.target.value)} /></Field></div>
      </div>
    </Drawer>
  );
}

/* ====================================================================
   TAB CONTENTS
   ==================================================================== */
/* generic edit drawer for a list of [label, value] rows — really updates the values shown in a kv-stack */
function KvEditDrawer({ open, onClose, title, rows, onSave }) {
  const toast = useToast();
  const [vals, setVals] = useState(() => rows.map((r) => r[1]));
  useEffect(() => { if (open) setVals(rows.map((r) => r[1])); }, [open]);
  const submit = () => { onSave(rows.map((r, i) => [r[0], vals[i]])); toast('Изменения сохранены', 'ok'); onClose(); };
  return (
    <Drawer open={open} onClose={onClose} title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" onClick={submit}>Сохранить</Button></>}>
      <div className="form-grid">
        {rows.map((r, i) => (
          <Field key={r[0]} label={r[0]}>
            <Input value={vals[i]} onChange={(e) => setVals((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />
          </Field>
        ))}
      </div>
    </Drawer>
  );
}

function TabOverview({ order }) {
  const [main, setMain] = useState([
    ['Организация', order.client], ['ИНН/ПИН', '07070707070707'], ['Юридический адрес', 'Бишкек, ул. Токтогула 125/1'],
    ['Тип организации', 'Туроператор'], ['Телефон', '+996 (777) 777-777'], ['E-mail', 'grandlimited@mail.ru'],
  ]);
  const [params, setParams] = useState([
    ['Тип заявки', order.requestType], ['Оператор', order.operator], ['Дата создания', order.date], ['Валюта', 'USD'], ['Тип комиссии', 'Процентная (%)'],
    ['Комиссия', '5%'], ['Синхронизация', '1С ✓'], ['Метод округления', 'До 1 USD'], ['Ставка НДС', '12%'], ['Тип расчёта', 'НДС включён'],
  ]);
  const [edit, setEdit] = useState(null); // 'main' | 'params' | null
  return (
    <div className="grid-2 fade-in" style={{ alignItems: 'start' }}>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="card-title">Основная информация</h3>
          <button className="icon-btn green" title="Редактировать" onClick={() => setEdit('main')}><Icon name="edit" /></button>
        </div>
        <div className="kv-stack">
          {main.map(([k, v], i) => (
            <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
          ))}
        </div>
      </div>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="card-title">Параметры заказа</h3>
          <button className="icon-btn green" title="Редактировать" onClick={() => setEdit('params')}><Icon name="edit" /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
          <div className="kv-stack">
            {params.slice(0, 5).map(([k, v], i) => (
              <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
            ))}
          </div>
          <div className="kv-stack">
            {params.slice(5).map(([k, v], i) => (
              <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
            ))}
          </div>
        </div>
      </div>
      <KvEditDrawer open={edit === 'main'} onClose={() => setEdit(null)} title="Основная информация" rows={main} onSave={setMain} />
      <KvEditDrawer open={edit === 'params'} onClose={() => setEdit(null)} title="Параметры заказа" rows={params} onSave={setParams} />
    </div>
  );
}

function TabClients({ order, onOpenChat }) {
  const [cardOpen, setCardOpen] = useState(false);
  const clientRows = [
    ['Контактное лицо', 'Нуралиев Данияр'], ['Телефон', '+996 700 123 456'], ['E-mail', 'd.nuraliev@mail.ru'],
    ['Заказов всего', '12'], ['Юр. лицо', order.client], ['ИНН', '07070707070707'],
  ];
  return (
    <div className="grid-2 fade-in" style={{ alignItems: 'start' }}>
      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Avatar name={order.client} size={48} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{order.client}</div><div style={{ color: 'var(--muted)', fontSize: 13.5 }}>Заказчик · Компания</div></div>
          <Pill tone="green">Активный</Pill>
        </div>
        <div className="kv">
          <div className="kv-row"><span className="k">Контактное лицо</span><span className="v">Нуралиев Данияр</span></div>
          <div className="kv-row"><span className="k">Телефон</span><span className="v">+996 700 123 456</span></div>
          <div className="kv-row"><span className="k">E-mail</span><span className="v">d.nuraliev@mail.ru</span></div>
          <div className="kv-row"><span className="k">Заказов всего</span><span className="v">12</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button variant="secondary" size="sm" icon="chat" onClick={onOpenChat}>Написать</Button>
          <Button variant="secondary" size="sm" icon="user" onClick={() => setCardOpen(true)}>Карточка</Button>
        </div>
        <Drawer open={cardOpen} onClose={() => setCardOpen(false)} title="Карточка клиента"
          footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setCardOpen(false)}>Закрыть</Button>}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <Avatar name={order.client} size={48} />
            <div><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{order.client}</div><div style={{ color: 'var(--muted)', fontSize: 13.5 }}>Заказчик · Компания</div></div>
          </div>
          <div className="kv">
            {clientRows.map(([k, v], i) => (<div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>))}
          </div>
        </Drawer>
      </div>
      <div className="card card-pad">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Реквизиты компании</h3>
        <div className="kv">
          <div className="kv-row"><span className="k">Юр. лицо</span><span className="v">{order.client}</span></div>
          <div className="kv-row"><span className="k">ИНН</span><span className="v">07070707070707</span></div>
          <div className="kv-row"><span className="k">Банк</span><span className="v">Демир Банк</span></div>
          <div className="kv-row"><span className="k">Счёт</span><span className="v">1240020000123456</span></div>
          <div className="kv-row"><span className="k">Договор</span><span className="v">№ 2024-118 от 09.09.24</span></div>
        </div>
      </div>
    </div>
  );
}

function DocCell({ p }) {
  const k = PAX_DOC_KIND[p.docType];
  if (!k || !p.docNo) return <span>{p.doc || '—'}</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span className="oc-svc-ic" style={{ background: k.color, width: 30, height: 30, borderRadius: 9, flex: '0 0 30px' }}>
        <Icon name={k.icon} style={{ width: 15, height: 15 }} />
      </span>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.docType}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>№ {p.docNo}</div>
        {p.docExpiry && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>до {p.docExpiry}</div>}
      </div>
    </div>
  );
}

function TabParticipants({ list, isGroup, fresh, onPassport, onAdd }) {
  if (!list.length) return (
    <div className="fade-in">
      <EmptyState icon="users" title="Участников пока нет" sub="Добавьте пассажиров поездки и их документы здесь" />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -12 }}><Button icon="plus" onClick={onAdd}>Добавить участника</Button></div>
    </div>
  );
  const errCount = list.filter((p) => p.docStatus === 'check').length;
  return (
    <div className="fade-in">
      {fresh && (
        <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid var(--blue)' }}>
          <Icon name="users" style={{ width: 20, height: 20, color: 'var(--blue)' }} />
          <div style={{ flex: 1, fontSize: 13.5, color: 'var(--body)' }}>
            <b style={{ color: 'var(--ink)' }}>Новый заказ.</b> Добавьте участников и их документы здесь — это нужно для выписки билетов и проверки виз.
          </div>
          <Button size="sm" icon="plus" onClick={onAdd}>Добавить участника</Button>
        </div>
      )}
      {isGroup && (
        <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="oc-svc-ic" style={{ background: 'var(--blue)' }}><Icon name="users" /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{list.length} пассажиров · Групповая поездка</div>
            <div style={{ fontSize: 13.5, color: errCount ? 'var(--amber)' : 'var(--green)', marginTop: 2 }}>
              Поимённый список: {list.length - errCount} без ошибок{errCount ? `, ${errCount} требуют проверки` : ''}
            </div>
          </div>
          <Button variant="secondary" size="sm" icon="checkCircle">Проверить список</Button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <Button icon="plus" onClick={onAdd}>Добавить участника</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Участник</th><th>Тип</th><th>Документ</th><th>Дата рожд.</th><th>Телефон</th><th>Документы</th><th></th></tr></thead>
          <tbody>
            {list.map((p, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onPassport(p.name)}>
                <td className="t-strong">{p.name} {p.lead && <span className="pill pill-blue" style={{ marginLeft: 6 }}>Лид</span>}</td>
                <td>{p.role}</td><td><DocCell p={p} /></td><td>{p.dob || '—'}</td><td>{p.phone || '—'}</td>
                <td><Pill tone={p.docStatus === 'check' ? 'amber' : 'green'}>{p.docStatus === 'check' ? 'Требует проверки' : 'Без ошибок'}</Pill></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                    items={[{ icon: 'idcard', label: 'Документы', onClick: () => onPassport(p.name) }, { icon: 'edit', label: 'Изменить' }, { sep: true }, { icon: 'trash', label: 'Удалить', danger: true }]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabRoute({ services }) {
  const steps = [
    { t: '24.06 · 04:15', text: 'Вылет FRU → IST · KC 131', ic: 'plane' },
    { t: '24.06 · 08:40', text: 'Прилёт в Стамбул (IST)', ic: 'plane' },
    { t: '24.06 · 09:30', text: 'Трансфер IST → Hilton Istanbul', ic: 'car' },
    { t: '24.06 – 01.07', text: 'Проживание · Hilton Istanbul 4★', ic: 'building' },
    { t: '01.07 · 14:05', text: 'Вылет IST → FRU · KC 132', ic: 'plane' },
    { t: '01.07 · 23:30', text: 'Прилёт в Бишкек (FRU)', ic: 'plane' },
  ];
  return (
    <div className="card card-pad fade-in" style={{ maxWidth: 640 }}>
      <h3 className="card-title" style={{ marginBottom: 18 }}>Маршрут поездки</h3>
      <div className="timeline">
        {steps.map((s, i) => (
          <div className="tl-item" key={i}>
            <span className="tl-dot" /><span className="tl-line" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name={s.ic} style={{ width: 18, height: 18, color: 'var(--blue)' }} />
              <div><div className="tl-time">{s.t}</div><div className="tl-text">{s.text}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PassengerScenarioCard({ participants, isGroup, onOpenParticipants }) {
  const errCount = participants.filter((p) => p.docStatus === 'check').length;
  const groups = isGroup ? ORDER_GROUPS : [];
  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 52, height: 52, borderRadius: 16 }}><Icon name="users" style={{ width: 24, height: 24 }} /></span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 17 }}>{participants.length} пассажиров{isGroup ? ' · Групповая поездка' : ''}</div>
          <div style={{ fontSize: 13.5, color: errCount ? 'var(--amber)' : 'var(--green)', marginTop: 4 }}>
            Поимённый список: {participants.length - errCount} без ошибок{errCount ? `, ${errCount} требуют проверки` : ''}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {groups.length ? groups.map((g) => (
              <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--body)' }}>
                <b style={{ color: 'var(--ink)' }}>{g.name}</b>{g.pax} чел. · {g.policy}
              </span>
            )) : (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Индивидуальная поездка без деления на группы</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" icon="clipboard" onClick={onOpenParticipants}>Проверить список</Button>
          <Button variant="secondary" size="sm" icon="users" onClick={onOpenParticipants}>Открыть участников</Button>
        </div>
      </div>
    </div>
  );
}

function ExtrasByPassengerCard({ isGroup }) {
  const rows = ORDER_SERVICE_EXTRAS.passengers || [];
  return (
    <div className="card card-pad" style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 17 }}>Дополнительные услуги по пассажирам</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>Места, багаж, питание, страхование и тарифы учитываются по каждому пассажиру отдельно.</div>
        </div>
        <Button variant="secondary" size="sm" icon="edit">Изменить назначения</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
        {ORDER_SERVICE_EXTRAS.summary.map((item) => (
          <div key={item.key} style={{ border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)', fontWeight: 700 }}>
              <Icon name={item.icon} style={{ width: 16, height: 16, color: 'var(--blue)' }} />{item.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Пассажир</th>{isGroup && <th>Группа</th>}<th>Тариф</th><th>Место</th><th>Багаж</th><th>Питание</th><th>Страхование</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.name}>
                <td className="t-strong">{p.name}{p.issue && <span className="pill pill-amber" style={{ marginLeft: 8 }}>Проверить</span>}</td>
                {isGroup && <td>{p.group}</td>}
                <td>{p.fare}</td>
                <td>{p.seat}</td>
                <td>{p.baggage}</td>
                <td>{p.meal}</td>
                <td>{p.insurance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookingFlowCard({ onStart }) {
  const tone = { done: 'green', current: 'amber', pending: 'gray' };
  return (
    <div className="card card-pad" style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 17 }}>Рабочий процесс бронирования</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>Отдельный процесс после подбора услуг: запуск, ответы поставщиков, подтверждение, выписка и оплата.</div>
        </div>
        <Button variant="secondary" size="sm" icon="zap" onClick={onStart}>Начать бронирование</Button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {ORDER_BOOKING_FLOW.map((step, i) => (
          <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 14, background: step.status === 'current' ? 'var(--amber-bg)' : '#fff' }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: step.status === 'done' ? 'var(--green-bg)' : step.status === 'current' ? '#fff' : 'var(--surface-2)', color: step.status === 'done' ? 'var(--green)' : step.status === 'current' ? 'var(--amber)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flex: '0 0 28px' }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{step.label}</div>
                <Pill tone={tone[step.status]}>{step.status === 'done' ? 'Готово' : step.status === 'current' ? 'В работе' : 'Ожидает'}</Pill>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{step.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ADD_TYPES = ['Авиа', 'ЖД', 'Гостиница', 'Трансфер', 'Автобус', 'Группа'];
const SCENARIO_KINDS = ['Авиа', 'Гостиница', 'Трансфер'];

// tile grid shown when picking a service type to add to the order
const ADD_SERVICE_TILES = [
  { kind: 'Авиа', label: 'Авиабилеты', icon: 'plane', color: '#2566ff', desc: 'Поиск и подбор авиаперелётов' },
  { kind: 'ЖД', label: 'ЖД билеты', icon: 'train', color: '#2f88aa', desc: 'Поиск и подбор ж/д билетов' },
  { kind: 'Гостиница', label: 'Гостиницы', icon: 'building', color: '#1f9d57', desc: 'Подбор отелей и размещения' },
  { kind: 'Трансфер', label: 'Трансфер', icon: 'car', color: '#c47e22', desc: 'Индивидуальные и групповые трансферы' },
  { kind: 'Страховка', label: 'Страховка', icon: 'shield', color: '#1f9d57', desc: 'Медицинское страхование' },
  { kind: 'VIP-зал', label: 'VIP-зал', icon: 'star', color: '#5a5af0', desc: 'Доступ в бизнес-залы аэропортов' },
  { kind: 'Аэроэкспресс', label: 'Аэроэкспресс', icon: 'ticket', color: '#5a5af0', desc: 'Билеты на аэроэкспресс' },
  { kind: 'Автобус', label: 'Автобус', icon: 'bus', color: '#6c7686', desc: 'Междугородные автобусные билеты' },
  { kind: 'Виза', label: 'Виза', icon: 'visa', color: '#2f88aa', desc: 'Визовая поддержка и оформление' },
  { kind: 'Экскурсии', label: 'Экскурсии', icon: 'camera', color: '#2f88aa', desc: 'Экскурсии и активности' },
  { kind: 'Доп. услуга', label: 'Доп. услуга', icon: 'star', color: '#c47e22', desc: 'Дополнительные услуги без категории' },
  { kind: 'Другое', label: 'Другое', icon: 'plus', color: '#9aa3b2', desc: 'Создать услугу без категории' },
];

function TypePickerCard({ onPick, onCancel }) {
  return (
    <div className="card card-pad fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12 }}>
        <div>
          <h3 className="card-title" style={{ marginBottom: 4 }}>Добавить услугу</h3>
          <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>Выберите тип услуги для добавления в заказ</div>
        </div>
        <Button variant="secondary" size="sm" icon="x" onClick={onCancel}>Закрыть</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {ADD_SERVICE_TILES.map((t) => (
          <button key={t.kind} onClick={() => onPick(t.kind)}
            style={{ textAlign: 'left', border: '1px solid var(--line)', borderRadius: 14, padding: 14, background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="oc-svc-ic" style={{ background: t.color, width: 40, height: 40, borderRadius: 12 }}>
              <Icon name={t.icon} style={{ width: 18, height: 18 }} />
            </span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14.5 }}>{t.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{t.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
const CALC_ROWS = {
  'Авиа':      [['tariff', 'Тариф'], ['taxes', 'Таксы и сборы'], ['fee', 'Сервисный сбор'], ['commission', 'Комиссия / наценка']],
  'Гостиница': [['tariff', 'Стоимость поставщика'], ['fee', 'Сервисный сбор'], ['commission', 'Комиссия']],
  'Трансфер':  [['tariff', 'Стоимость поставщика'], ['fee', 'Сервисный сбор'], ['commission', 'Комиссия / наценка']],
};

/* one row of a service's financial calculation */
function CalcLines({ s, fin }) {
  const c = svcCalc(s);
  const rows = CALC_ROWS[s.kind] || [['tariff', 'Стоимость поставщика'], ['fee', 'Сервисный сбор'], ['commission', 'Комиссия']];
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
      {rows.filter(([k]) => c[k]).map(([k, l]) => (
        <div className="off-price-line" key={k}><span>{l}</span><span>{ocMoney(c[k], s.currency)}</span></div>
      ))}
      <div className="off-price-line" style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}><span>Итого по услуге</span><span>{ocMoney(c.total, s.currency)}</span></div>
      {fin && (
        <>
          <div className="off-price-line" style={{ marginTop: 8 }}><span>Оплачено по операции</span><span style={{ color: 'var(--green)' }}>{ocMoney(fin.paid || 0, fin.currency || s.currency)}</span></div>
          <div className="off-price-line"><span>Задолженность</span><span style={{ color: fin.debt ? 'var(--red)' : 'var(--muted)' }}>{ocMoney(fin.debt || 0, fin.currency || s.currency)}</span></div>
          <div className="off-price-line"><span>Маржа агентства</span><span style={{ color: 'var(--green)' }}>{ocMoney(fin.margin || fin.commission || 0, fin.currency || s.currency)}</span></div>
        </>
      )}
    </div>
  );
}

/* scenario card: either a filled service (with status/supplier/calc) or an empty "Подобрать" prompt */
const SERVICE_LABELS = {
  'Авиа': 'Авиаперелёт',
  'Гостиница': 'Гостиница',
  'Трансфер': 'Трансфер',
};

function serviceLabel(kind) {
  return SERVICE_LABELS[kind] || kind;
}

function ScenarioCard({ kind, items, onPick, onOpen, financeMeta, paxCount, isGroup }) {
  const k = SERVICE_KIND[kind];
  if (!items.length) {
    return (
      <div className="card card-pad" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16, borderStyle: 'dashed' }}>
        <span className="oc-svc-ic" style={{ background: 'var(--surface-2)', color: 'var(--muted-2)' }}><Icon name={k.icon} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{serviceLabel(kind)}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Услуга ещё не выбрана</div>
        </div>
        <Button size="sm" icon="search" onClick={onPick}>Подобрать</Button>
      </div>
    );
  }
  return items.map((s) => {
    const displaySub = isGroup ? s.sub.replace(/\d+\s*пасс\./i, `${paxCount} пасс.`) : s.sub;
    return (
      <div className="card card-pad" key={s.id} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpen(s)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="oc-svc-t">{serviceLabel(kind)} · {s.title}</span>
              <Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill>
            </div>
            <div className="oc-svc-s">{displaySub}</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--muted)' }}>
              <span><Icon name="api" style={{ width: 12, height: 12, verticalAlign: -1 }} /> {s.supplier || '—'}</span>
              <span><Icon name="users" style={{ width: 12, height: 12, verticalAlign: -1 }} /> {isGroup ? paxCount : (s.pax || paxCount)} пасс.</span>
              <span><Icon name="calendar" style={{ width: 12, height: 12, verticalAlign: -1 }} /> {s.date}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{ocMoney(svcCalc(s).total, s.currency)}</div>
            <Button variant="secondary" size="sm" icon="edit" onClick={onPick}>Изменить</Button>
          </div>
        </div>
        <CalcLines s={s} fin={financeMeta} />
      </div>
    );
  });
}

function ExtraServicesCard({ items, extraTypes, onOpen, onAddType, onOpenPicker, paxCount, isGroup }) {
  if (!items.length) {
    return (
      <div className="card card-pad" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16, borderStyle: 'dashed' }}>
        <span className="oc-svc-ic" style={{ background: 'var(--surface-2)', color: 'var(--muted-2)' }}><Icon name="briefcase" /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Дополнительные услуги</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Страховка, ЖД, автобус, визы и другие сервисы ещё не добавлены</div>
        </div>
        <Button size="sm" icon="search" onClick={onOpenPicker}>Подобрать</Button>
      </div>
    );
  }
  return items.map((s) => {
    const k = SERVICE_KIND[s.kind] || { icon: 'briefcase', color: 'var(--blue)' };
    return (
      <div className="card card-pad" key={s.id} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpen(s)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="oc-svc-t">Дополнительные услуги · {s.kind}</span>
              <Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill>
            </div>
            <div className="oc-svc-s">{s.title}</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--muted)' }}>
              <span><Icon name="api" style={{ width: 12, height: 12, verticalAlign: -1 }} /> {s.supplier || '—'}</span>
              <span><Icon name="users" style={{ width: 12, height: 12, verticalAlign: -1 }} /> {isGroup ? paxCount : (s.pax || paxCount)} пасс.</span>
              <span><Icon name="calendar" style={{ width: 12, height: 12, verticalAlign: -1 }} /> {s.date || '—'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{ocMoney(svcCalc(s).total, s.currency)}</div>
            <ActionMenu
              trigger={<Button variant="secondary" size="sm" icon="edit">Изменить</Button>}
              items={extraTypes.map((t) => ({ icon: SERVICE_KIND[t].icon, label: t, onClick: () => onAddType(t) }))}
            />
          </div>
        </div>
      </div>
    );
  });
}

function TabServices({ orderNo, services, participants, requestType, onOpenAvia, onAddType, onOpenOther, onStartBooking, onOpenParticipants, onOpenPicker }) {
  const extraServices = services.filter((s) => !SCENARIO_KINDS.includes(s.kind));
  const extraTypes = ADD_TYPES.filter((t) => !SCENARIO_KINDS.includes(t));
  const total = services.reduce((s, x) => s + svcCalc(x).total, 0);
  const fin = financeSnapshot(orderNo, services);
  const isGroup = requestType === 'Групповая';
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Сценарий поездки · {services.length} услуг{services.length ? ' · итого ' + ocMoney(total) : ''}</span>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" icon="plus" onClick={onOpenPicker}>Доп. услуга</Button>
      </div>

      <PassengerScenarioCard participants={participants} isGroup={isGroup} onOpenParticipants={onOpenParticipants} />

      {SCENARIO_KINDS.map((kind) => (
        <ScenarioCard key={kind} kind={kind} items={services.filter((s) => s.kind === kind)}
          financeMeta={fin.byKind[kind]} paxCount={participants.length} isGroup={isGroup}
          onPick={() => onAddType(kind)} onOpen={(s) => kind === 'Авиа' ? onOpenAvia(s) : onOpenOther(s)} />
      ))}

      <h3 className="section-title" style={{ fontSize: 17, margin: '22px 0 12px' }}>Дополнительные услуги</h3>
      <ExtraServicesCard
        items={extraServices}
        extraTypes={extraTypes}
        onOpen={onOpenOther}
        onAddType={onAddType}
        onOpenPicker={onOpenPicker}
        paxCount={participants.length}
        isGroup={isGroup}
      />

      <ExtrasByPassengerCard isGroup={isGroup} />
      <BookingFlowCard onStart={onStartBooking} />
    </div>
  );
}

function TabOffers({ onCreate }) {
  const toast = useToast();
  const list = ORDER_KP;
  if (!list.length) {
    return <EmptyState icon="template" title="Коммерческих предложений нет"
      sub="Соберите варианты из услуг заказа и отправьте клиенту" />;
  }
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{list.length} варианта</span>
        <Button icon="plus" onClick={onCreate}>Создать КП</Button>
      </div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {list.map((kp) => (
          <div className="card card-pad" key={kp.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{kp.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{kp.id} · {kp.services} услуги</div>
              </div>
              <Pill tone={KP_STATUS[kp.status]}>{kp.status}</Pill>
            </div>
            <div className="kv-row" style={{ borderBottom: 'none' }}><span className="k">Сумма</span><span className="v" style={{ fontSize: 18 }}>{ocMoney(kp.total)}</span></div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Отправлено: {kp.sent}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="sm" icon="eye" onClick={() => toast('Предпросмотр ' + kp.id, 'info')}>Просмотр</Button>
              <Button variant="secondary" size="sm" icon="send" onClick={() => toast('КП отправлено клиенту', 'ok')}>Отправить</Button>
              <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                items={[{ icon: 'copy', label: 'Дублировать' }, { icon: 'download', label: 'Скачать PDF' }, { sep: true }, { icon: 'trash', label: 'Удалить', danger: true }]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabDocuments({ onPassport }) {
  const toast = useToast();
  const perClient = ['Паспорт', 'Виза', 'Банковское подтверждение', 'Справка с работы', 'Мед. страховка', 'Согласие на выезд'];
  const general = ['Договор', 'Счёт на оплату', 'Ваучер', 'Акт', 'Маршрут-квитанция'];
  return (
    <div className="fade-in">
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Документы участника: Нуралиев Данияр</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {perClient.map((d) => (
            <button key={d} className="doc-chip" onClick={() => onPassport('Нуралиев Данияр')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="idcard" />{d}</span><Icon name="chevRight" /></button>
          ))}
        </div>
      </div>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Документы по заказу</div>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => toast('Загрузка документа', 'info')}>Загрузить</Button>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {general.map((d) => (
            <button key={d} className="doc-chip" style={{ width: 'auto' }} onClick={() => toast('Открываю: ' + d, 'info')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="docs" />{d}</span><Icon name="download" /></button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabFinance({ services, onAddFee }) {
  const toast = useToast();
  const total = services.reduce((s, x) => s + x.sum, 0);
  const fees = [
    { service: 'Авиа', type: 'Процент', value: '5%', tax: '80 $', comment: 'Сервисный сбор' },
    { service: 'Отель', type: 'Фиксированная', value: '25 $', tax: '0 $', comment: 'Сбор бронирования' },
  ];
  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {[['Стоимость услуг', ocMoney(total), ''], ['Сборы агентства', '105 $', ''], ['Оплачено', ocMoney(1660), 'green'], ['Задолженность', ocMoney(Math.max(0, total - 1660)), 'red']].map(([l, v, tone]) => (
          <div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value" style={tone === 'red' ? { color: 'var(--red)' } : tone === 'green' ? { color: 'var(--green)' } : null}>{v}</div></div>
        ))}
      </div>

      {/* 1C sync — demonstrates the error state pattern */}
      <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Icon name="alertCircle" style={{ width: 22, height: 22, color: 'var(--amber)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Синхронизация с 1С приостановлена</div>
          <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>Последняя успешная: 14.06 · 12:30</div>
        </div>
        <Button variant="secondary" size="sm" icon="loader" onClick={() => toast('Повторная синхронизация…', 'info')}>Повторить</Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 14px' }}>
        <h3 className="section-title" style={{ fontSize: 20 }}>Сборы и налоги</h3>
        <Button icon="plus" onClick={onAddFee}>Добавить сбор</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Услуга</th><th>Тип сбора</th><th>Значение</th><th>Налог</th><th>Комментарий</th><th></th></tr></thead>
          <tbody>{fees.map((r, i) => (
            <tr key={i}><td className="t-strong">{r.service}</td><td>{r.type}</td><td>{r.value}</td><td>{r.tax}</td><td className="t-muted">{r.comment}</td>
              <td><div className="row-actions"><button className="icon-btn green"><Icon name="edit" /></button><button className="icon-btn"><Icon name="trash" /></button></div></td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function TabHistory() {
  const items = [
    { t: '14.06.2026 · 15:34', text: 'КП-1042 отправлено клиенту', who: 'Даниель' },
    { t: '14.06.2026 · 15:12', text: 'Авиабилет выписан · PNR KC8H2L', who: 'Даниель' },
    { t: '14.06.2026 · 14:40', text: 'Добавлена услуга: Hilton Istanbul', who: 'Даниель' },
    { t: '14.06.2026 · 14:05', text: 'Назначен оператор (Даниель)', who: 'Система' },
    { t: '14.06.2026 · 14:00', text: 'Заказ создан', who: 'Система' },
  ];
  return (
    <div className="card card-pad fade-in" style={{ maxWidth: 560 }}>
      <div className="timeline">
        {items.map((h, i) => (
          <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
            <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
        ))}
      </div>
    </div>
  );
}

/* ====================================================================
   ORDER CARD ROOT
   ==================================================================== */
function OrderCard({ order, onBack, initTab, initSvcSearch, fresh, onOpenChat }) {
  const toast = useToast();
  const [tab, setTab] = useState(initTab || (initSvcSearch ? 'services' : 'overview'));
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(order.status === 'Нет данных' ? 'Новое' : order.status);
  const [services, setServices] = useState(ORDER_SERVICES);
  const [requestType, setRequestType] = useState(order.requestType);
  const [tripEditOpen, setTripEditOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const participants = requestType === 'Групповая' ? GROUP_PAX : ORDER_PARTICIPANTS;
  const chatUnread = Object.values(getThreadForOrder(order).unread || {}).reduce((s, n) => s + n, 0);
  const initStage = () => {
    if (order.status === 'Оплачено') return 4;
    if (order.status === 'Отменено') return 0;
    const ops = FIN_OPS.filter((o) => o.order === order.no);
    if (ops.length && ops.every((o) => o.status === 'Оплачено' || o.status === 'Закрыто')) return 4;
    if (ops.length) return 2;
    return 1;
  };
  const [stageIdx, setStageIdx] = useState(initStage());

  // service sub-flow (avia + other service modules)
  const [svcView, setSvcView] = useState(null); // null | 'avia-picker' | 'avia-card' | 'svc-add' | 'svc-card'
  const [activeAvia, setActiveAvia] = useState(null);
  const [addRoute, setAddRoute] = useState(null);   // routeKey for the non-avia add-flow
  const [activeSvc, setActiveSvc] = useState(null); // non-avia service being viewed
  const [otherSvc, setOtherSvc] = useState(null);
  const [aviaParams, setAviaParams] = useState({ trip: 'rt', from: 'FRU', to: 'IST', depDate: null, retDate: null, pax: { adt: 2, chd: 0, infNoSeat: 0, infSeat: 0, special: {}, subsidized: {} }, cabin: 'Эконом', baggage: false, flex: false, direct: false, airline: '', ...PAX_DEFAULT_OPTIONS });

  // modals
  const [passport, setPassport] = useState(null);
  const [paxOpen, setPaxOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);

  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, [order.no]);
  // deep-link: switch to requested tab even if the card is already mounted (e.g. opened from a notification)
  useEffect(() => { if (initTab) setTab(initTab); }, [initTab, order.no]);
  // onboarding: new order lands on «Услуги» — point the operator to where passengers & documents go
  useEffect(() => { if (fresh) toast('Заказ создан. Добавьте участников и их документы во вкладке «Участники».', 'info'); }, []);

  const TABS = [
    { key: 'overview', label: 'Общая информация', icon: 'clipboard', group: 0 },
    { key: 'clients', label: 'Клиенты', icon: 'contacts', group: 0 },
    { key: 'participants', label: 'Пассажиры', icon: 'users', group: 0, count: participants.length },
    { key: 'route', label: 'Маршрут', icon: 'route', group: 0 },
    { key: 'services', label: 'Услуги', icon: 'briefcase', group: 0, count: services.length },
    { key: 'offers', label: 'КП', icon: 'template', group: 1, count: PROPOSALS.filter((p) => p.order === order.no).length },
    { key: 'documents', label: 'Документы', icon: 'docs', group: 1 },
    { key: 'finance', label: 'Финансы', icon: 'finance', group: 1 },
    { key: 'history', label: 'История', icon: 'clock', group: 2 },
    { key: 'aftersale', label: 'Постпродажа', icon: 'refund', group: 2, count: RETURNS.filter((r) => r.order === order.no).length || null },
  ];
  const TAB_GROUPS = ['Состав поездки', 'Работа с заказом', 'Сопровождение'];
  // КП/Документы/Финансы/Постпродажа open up once the order moves past «Подбор услуг»
  const isTabLocked = (t) => (t.group === 1 || t.key === 'aftersale') && stageIdx < 2;

  const goAddType = (type) => {
    if (type === 'Авиа') { setSvcView('avia-picker'); return; }
    const rk = routeKeyForKind(type);
    if (rk) { setAddRoute(rk); setSvcView('svc-add'); return; }
    setSvcView(null);
    toast('Тип «' + type + '» недоступен', 'info');
  };
  // applied from the two-pane AviaPicker (ruble-denominated)
  const addAviaFromPicker = (p) => {
    const id = 'S' + (services.length + 1);
    const offer = { out: p.out, back: p.back, airline: p.airline, fare: p.totalRub, fee: 0, fareName: p.fareName,
      baggage: '—', cabin: aviaParams.cabin, refundable: false, supplier: p.supplier, currency: '₽' };
    const sv = { id, kind: 'Авиа', title: `${p.out.from} → ${p.out.to}${p.back ? ' → ' + p.back.to : ''}`,
      sub: `${AIRLINES[p.airline].name} · ${p.out.flightNo} · ${p.paxCount} пасс. · ${p.fareName}`,
      status: 'Предложение', sum: p.totalRub, currency: '₽', date: p.out.date, supplier: p.supplier, offer };
    setServices((cur) => [...cur, sv]);
    setSvcView(null);
    toast('Перелёт добавлен в сценарий заказа', 'ok');
  };
  const addSvcOffer = (offer, kind) => {
    const id = 'S' + (services.length + 1);
    const sv = { id, kind, title: offer.title, sub: offer.sub, status: 'Предложение', sum: offer.cost + offer.fee, currency: 'USD',
      date: (offer.info && offer.info[0] && offer.info[0].v) || '—', supplier: offer.supplier, svcOffer: offer };
    setServices((cur) => [...cur, sv]);
    setSvcView(null);
    toast(kind + ': услуга добавлена в заказ', 'ok');
  };

  // --- inside the Services tab, a service sub-flow can take over the main column ---
  const renderServicesArea = () => {
    if (svcView === 'avia-picker') return <AviaPicker params={aviaParams} setParams={setAviaParams} services={services}
      group={requestType === 'Групповая'}
      onApply={addAviaFromPicker} onCancel={() => setSvcView(null)} onAddType={() => goAddType('Авиа')}
      onRemoveService={(s) => setServices((cur) => cur.filter((x) => x.id !== s.id))} />;
    if (svcView === 'booking') return <BookingWizard order={order} services={services} onClose={() => setSvcView(null)}
      onComplete={() => { setStatus('Оплачено'); setStageIdx(4); }} />;
    if (svcView === 'avia-card') return <FlightCard svc={activeAvia} offer={activeAvia ? activeAvia.offer : null} onBack={() => setSvcView(null)} />;
    if (svcView === 'svc-add') return <ServiceAddFlow routeKey={addRoute} onAdd={addSvcOffer} onCancel={() => setSvcView(null)} />;
    if (svcView === 'svc-card') return <SvcCard item={activeSvc} kind={activeSvc.kind} onBack={() => setSvcView(null)} />;
    if (svcView === 'type-picker') return <TypePickerCard onPick={goAddType} onCancel={() => setSvcView(null)} />;
    return <TabServices orderNo={order.no} services={services} participants={participants} requestType={requestType}
      onOpenParticipants={() => setTab('participants')}
      onStartBooking={() => setSvcView('booking')}
      onAddType={goAddType}
      onOpenPicker={() => setSvcView('type-picker')}
      onOpenAvia={(s) => { const match = AIR_SERVICES.find((a) => a.no === s.avia) || { no: s.avia || s.id, airline: (s.offer ? s.offer.airline : 'KC'), status: s.status, supplier: s.supplier, pax: 2, sum: s.sum, currency: s.currency, route: s.title, pnr: '—', ticket: '—', dep: s.date }; setActiveAvia(s.offer ? { ...match, offer: s.offer } : match); setSvcView('avia-card'); }}
      onOpenOther={(s) => { if (s.svcOffer) { setActiveSvc({ ...s.svcOffer, kind: s.kind, status: s.status }); setSvcView('svc-card'); } else { setOtherSvc(s); } }} />;
  };

  const tabContent = () => {
    if (loading) return <AsyncBlock state="loading" skeletonRows={5} />;
    switch (tab) {
      case 'overview': return <TabOverview order={order} />;
      case 'clients': return <TabClients order={order} onOpenChat={onOpenChat} />;
      case 'participants': return <TabParticipants list={participants} isGroup={requestType === 'Групповая'} fresh={fresh} onPassport={setPassport} onAdd={() => setPaxOpen(true)} />;
      case 'route': return <TabRoute services={services} />;
      case 'services': return renderServicesArea();
      case 'offers': return <KPModule order={order} services={services} participants={participants}
        onApprove={() => { setStageIdx((i) => Math.max(i, 2)); toast('Созданы финансовые записи и задачи по выпуску документов', 'ok'); }} />;
      case 'documents': return <DocCenter scopeOrder={order.no} />;
      case 'finance': return <FinanceRegistry scopeOrder={order.no} />;
      case 'aftersale': return <ReturnsModule scopeOrder={order.no} order={order} compact />;
      case 'history': return <TabHistory />;
      default: return null;
    }
  };

  return (
    <div className="fade-in">
      <Topbar title="Карточка заказа">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>К реестру</Button>
      </Topbar>

      <div className="content" style={{ paddingTop: 8 }}>
        {/* header — collapses to a single breadcrumb line while the booking wizard is open
            (the wizard has its own stepper/route; the full head + stage-bar + actions would push it off-screen) */}
        {svcView === 'booking' ? (
          <div className="oc-head" style={{ paddingBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div className="oc-id" style={{ marginBottom: 0 }}>
                <h2 style={{ fontSize: 20 }}>Заказ № {order.no}</h2>
                <StatusControl status={status} onChange={(s) => { setStatus(s); toast('Статус: ' + s, 'ok'); }} />
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 14 }}>
                <Icon name="plane" style={{ width: 15, height: 15, color: 'var(--blue)' }} />
                {(() => { const t = tripFromServices(services, aviaParams); return `${t.from} → ${t.to}`; })()}
              </span>
            </div>
          </div>
        ) : (
          <div className="oc-head">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div className="oc-id">
                <h2>Заказ № {order.no}</h2>
                <StatusControl status={status} onChange={(s) => { setStatus(s); toast('Статус: ' + s, 'ok'); }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13.5, color: 'var(--muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="building" style={{ width: 14, height: 14, color: 'var(--muted-2)' }} /><b style={{ color: 'var(--ink)', fontWeight: 600 }}>{order.client}</b></span>
                <span>Создан {order.date}</span>
              </div>
              <div style={{ flex: 1 }} />
              <Button variant="secondary" size="sm" icon="chat" onClick={onOpenChat}>
                Чат{chatUnread > 0 && <span className="pill pill-red" style={{ marginLeft: 6 }}>{chatUnread}</span>}
              </Button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={order.operator} size={36} />
                <div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Ответственный</div><div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{order.operator}</div></div>
              </div>
            </div>

            <TripSummaryBar order={order} services={services} participants={participants} aviaParams={aviaParams} requestType={requestType} onEdit={() => setTripEditOpen(true)} />

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <OrderStageBar index={stageIdx} />
            </div>

            <div className="oc-actions">
              <Button icon="plus" onClick={() => { setTab('services'); setSvcView('type-picker'); }}>Добавить услугу</Button>
              <Button variant="secondary" icon="template" onClick={() => setTab('offers')}>Создать КП</Button>
              <Button variant="secondary" icon="send" onClick={() => setSendOpen(true)}>Отправить клиенту</Button>
              <Button variant="secondary" icon="finance" onClick={() => setTab('finance')}>Открыть финансы</Button>
            </div>
          </div>
        )}

        {/* body: tabs + main + aside. The two-pane avia picker takes over full width. */}
        <div className="oc-grid">
          <div className="oc-main">
            {!['avia-picker', 'booking'].includes(svcView) && (
              <div className="oc-navpanel">
                <div className="oc-navrow">
                  {TAB_GROUPS.map((g, gi) => (
                    <div className="oc-navgroup" key={g}>
                      <div className="oc-navgroup-h">{g}</div>
                      <div className="oc-navtiles">
                        {TABS.filter((t) => t.group === gi).map((t) => {
                          const locked = isTabLocked(t);
                          return (
                            <button key={t.key} className={'oc-navtile' + (tab === t.key ? ' active' : '') + (locked ? ' locked' : '')}
                              title={locked ? 'Раздел станет доступен на следующих этапах заказа' : undefined}
                              onClick={() => {
                                if (locked) { toast('Раздел станет доступен на следующих этапах заказа', 'info'); return; }
                                setTab(t.key); if (t.key !== 'services') setSvcView(null);
                              }}>
                              <span className="ic"><Icon name={t.icon} /></span>
                              <span className="nm">{t.label}</span>
                              {t.count != null && <span className="cnt">{t.count}</span>}
                              {locked && <span className="lockic"><Icon name="lock" /></span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tabContent()}
          </div>
          {!['avia-picker', 'booking'].includes(svcView) && <OrderAside onOpenTasks={() => toast('Список задач по заказу', 'info')} />}
        </div>
      </div>

      {!['avia-picker', 'booking'].includes(svcView) && (
        <Button className="oc-fab" icon="zap" onClick={() => { setTab('services'); setSvcView('booking'); }}>Начать бронирование</Button>
      )}

      {/* drawers / modals reused from order_extras */}
      {paxOpen && <PassengerDrawer open={paxOpen} onClose={() => setPaxOpen(false)} />}
      {feeOpen && <FeeDrawer open={feeOpen} onClose={() => setFeeOpen(false)} />}
      {passport && <PassportModal passenger={passport} participants={participants} onClose={() => setPassport(null)} />}
      <TripEditModal open={tripEditOpen} onClose={() => setTripEditOpen(false)} aviaParams={aviaParams} setAviaParams={setAviaParams} requestType={requestType} setRequestType={setRequestType} />

      {/* confirm before anything actually leaves for the client */}
      <ConfirmDialog open={sendOpen} title="Отправить заказ клиенту?" confirmLabel="Отправить" confirmVariant="primary"
        onCancel={() => setSendOpen(false)}
        onConfirm={() => { setSendOpen(false); toast('Заказ отправлен клиенту', 'ok'); }}
        message={
          <>
            Клиенту <b>{order.client}</b> по заказу № {order.no} будет отправлено:
            <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
              <li>актуальное коммерческое предложение</li>
              <li>документы по заказу</li>
            </ul>
          </>
        } />

      {/* other-service quick drawer */}
      <Drawer open={!!otherSvc} onClose={() => setOtherSvc(null)} title={otherSvc ? otherSvc.title : ''}
        footer={otherSvc && <div style={{ display: 'flex', gap: 10 }}><Button variant="secondary" style={{ flex: 1 }} onClick={() => setOtherSvc(null)}>Закрыть</Button><Button style={{ flex: 1 }} icon="edit">Редактировать</Button></div>}>
        {otherSvc && (
          <div className="kv">
            <div className="kv-row"><span className="k">Тип услуги</span><span className="v">{otherSvc.kind}</span></div>
            <div className="kv-row"><span className="k">Описание</span><span className="v">{otherSvc.sub}</span></div>
            <div className="kv-row"><span className="k">Поставщик</span><span className="v">{otherSvc.supplier}</span></div>
            <div className="kv-row"><span className="k">Даты</span><span className="v">{otherSvc.date}</span></div>
            <div className="kv-row"><span className="k">Статус</span><span className="v"><Pill tone={SERVICE_STATUS[otherSvc.status]}>{otherSvc.status}</Pill></span></div>
            <div className="kv-row"><span className="k">Стоимость</span><span className="v">{ocMoney(otherSvc.sum, otherSvc.currency)}</span></div>
            {!!otherSvc.calc && <div className="kv-row"><span className="k">Расчёт</span><span className="v">{ocMoney(otherSvc.calc.tariff || 0, otherSvc.currency)} + {ocMoney(otherSvc.calc.fee || 0, otherSvc.currency)} сервис</span></div>}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function BackRow({ label, onBack }) {
  return <div style={{ marginBottom: 14 }}><Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>{label}</Button></div>;
}

Object.assign(window, { OrderCard, AsyncBlock });
