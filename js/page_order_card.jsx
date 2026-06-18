// ===== Order Card: the operator's main workspace =====

function ocMoney(n, c = 'USD') { return n.toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c); }

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
function OrderAside({ services, onOpenFinance, onOpenTasks }) {
  const byKind = {};
  services.forEach((s) => { byKind[s.kind] = (byKind[s.kind] || 0) + svcCalc(s).total; });
  const feesTotal = services.reduce((s, x) => s + svcCalc(x).fee, 0);
  const total = services.reduce((s, x) => s + svcCalc(x).total, 0);
  const paid = 1660;
  const debt = Math.max(0, total - paid);
  const urgent = ORDER_TASKS.filter((t) => t.urgent);
  return (
    <div className="oc-aside">
      <div className="card card-pad">
        <h3 className="card-title" style={{ fontSize: 17, marginBottom: 8 }}>Финансовая сводка</h3>
        {Object.entries(byKind).map(([kind, sum]) => (
          <div className="oc-kpi" key={kind}><span className="l">{kind}</span><span className="v">{ocMoney(sum)}</span></div>
        ))}
        {feesTotal > 0 && <div className="oc-kpi"><span className="l">Сервисные сборы</span><span className="v">{ocMoney(feesTotal)}</span></div>}
        <div className="oc-kpi" style={{ borderTop: '1px solid var(--line)', marginTop: 4, paddingTop: 12 }}><span className="l">Итого клиенту</span><span className="v" style={{ fontSize: 18 }}>{ocMoney(total)}</span></div>
        <div className="oc-kpi"><span className="l">Оплачено</span><span className="v green">{ocMoney(paid)}</span></div>
        <div className="oc-kpi"><span className="l">Задолженность</span><span className={'v' + (debt ? ' red' : '')}>{ocMoney(debt)}</span></div>
        <div className="oc-kpi"><span className="l">Участников</span><span className="v">{ORDER_PARTICIPANTS.length}</span></div>
        <div className="oc-kpi"><span className="l">Активных задач</span><span className="v">{ORDER_TASKS.length}</span></div>
        <Button variant="secondary" size="sm" className="btn-block" icon="finance" style={{ marginTop: 14 }} onClick={onOpenFinance}>Открыть финансы</Button>
      </div>

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
  return (
    <div className="oc-trip" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>
            <Icon name="plane" style={{ width: 18, height: 18, color: 'var(--blue)' }} />
            {trip.from} → {trip.to}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: 13.5, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" style={{ width: 14, height: 14 }} />{trip.dates}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="users" style={{ width: 14, height: 14 }} />{participants.length} пассажиров{isGroup ? ' · групповая поездка' : ''}</span>
            <span>{requestType}</span>
            <span>{aviaParams.cabin}</span>
          </div>
          {isGroup && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: errCount ? 'var(--amber)' : 'var(--green)' }}>
              <Icon name={errCount ? 'alertCircle' : 'checkCircle'} style={{ width: 14, height: 14 }} />
              Поимённый список: {participants.length - errCount} без ошибок{errCount ? `, ${errCount} требуют проверки` : ''}
            </div>
          )}
        </div>
        <Button variant="secondary" size="sm" icon="edit" onClick={onEdit}>Редактировать данные</Button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
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
      </div>
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
function TabOverview({ order }) {
  const toast = useToast();
  return (
    <div className="grid-2 fade-in" style={{ alignItems: 'start' }}>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="card-title">Основная информация</h3>
          <button className="icon-btn green" onClick={() => toast('Редактирование', 'info')}><Icon name="edit" /></button>
        </div>
        <div className="kv-stack">
          {[['Организация', order.client], ['ИНН/ПИН', '07070707070707'], ['Юридический адрес', 'Бишкек, ул. Токтогула 125/1'], ['Тип организации', 'Туроператор'], ['Телефон', '+996 (777) 777-777'], ['E-mail', 'grandlimited@mail.ru']].map(([k, v], i) => (
            <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
          ))}
        </div>
      </div>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="card-title">Параметры заказа</h3>
          <button className="icon-btn green"><Icon name="edit" /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
          <div className="kv-stack">
            {[['Тип заявки', order.requestType], ['Оператор', order.operator], ['Дата создания', order.date], ['Валюта', 'USD'], ['Тип комиссии', 'Процентная (%)']].map(([k, v], i) => (
              <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
            ))}
          </div>
          <div className="kv-stack">
            {[['Комиссия', '5%'], ['Синхронизация', '1С ✓'], ['Метод округления', 'До 1 USD'], ['Ставка НДС', '12%'], ['Тип расчёта', 'НДС включён']].map(([k, v], i) => (
              <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabClients({ order }) {
  const toast = useToast();
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
          <Button variant="secondary" size="sm" icon="chat" onClick={() => toast('Открываю чат с клиентом', 'info')}>Написать</Button>
          <Button variant="secondary" size="sm" icon="user" onClick={() => toast('Карточка клиента', 'info')}>Карточка</Button>
        </div>
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

function TabParticipants({ list, isGroup, onPassport, onAdd }) {
  if (!list.length) return <EmptyState icon="users" title="Участников пока нет" sub="Добавьте пассажиров поездки" />;
  const errCount = list.filter((p) => p.docStatus === 'check').length;
  return (
    <div className="fade-in">
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
                <td>{p.role}</td><td>{p.doc}</td><td>{p.dob || '—'}</td><td>{p.phone || '—'}</td>
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

const ADD_TYPES = ['Авиа', 'ЖД', 'Гостиница', 'Трансфер', 'Автобус', 'Группа'];
const SCENARIO_KINDS = ['Авиа', 'Гостиница', 'Трансфер'];
const CALC_ROWS = {
  'Авиа':      [['tariff', 'Тариф'], ['taxes', 'Таксы и сборы'], ['fee', 'Сервисный сбор'], ['commission', 'Комиссия / наценка']],
  'Гостиница': [['tariff', 'Стоимость поставщика'], ['fee', 'Сервисный сбор'], ['commission', 'Комиссия']],
  'Трансфер':  [['tariff', 'Стоимость поставщика'], ['fee', 'Сервисный сбор'], ['commission', 'Комиссия / наценка']],
};

/* one row of a service's financial calculation */
function CalcLines({ s }) {
  const c = svcCalc(s);
  const rows = CALC_ROWS[s.kind] || [['tariff', 'Стоимость поставщика'], ['fee', 'Сервисный сбор'], ['commission', 'Комиссия']];
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
      {rows.filter(([k]) => c[k]).map(([k, l]) => (
        <div className="off-price-line" key={k}><span>{l}</span><span>{ocMoney(c[k], s.currency)}</span></div>
      ))}
      <div className="off-price-line" style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}><span>Итого по услуге</span><span>{ocMoney(c.total, s.currency)}</span></div>
    </div>
  );
}

/* scenario card: either a filled service (with status/supplier/calc) or an empty "Подобрать" prompt */
function ScenarioCard({ kind, items, onPick, onOpen }) {
  const k = SERVICE_KIND[kind];
  if (!items.length) {
    return (
      <div className="card card-pad" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16, borderStyle: 'dashed' }}>
        <span className="oc-svc-ic" style={{ background: 'var(--surface-2)', color: 'var(--muted-2)' }}><Icon name={k.icon} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{kind}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Услуга ещё не выбрана</div>
        </div>
        <Button size="sm" icon="search" onClick={onPick}>Подобрать</Button>
      </div>
    );
  }
  return items.map((s) => (
    <div className="card card-pad" key={s.id} style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpen(s)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="oc-svc-t">{s.title}</span>
            <Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill>
          </div>
          <div className="oc-svc-s">{s.sub}</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--muted)' }}>
            <span><Icon name="api" style={{ width: 12, height: 12, verticalAlign: -1 }} /> {s.supplier || '—'}</span>
            <span><Icon name="users" style={{ width: 12, height: 12, verticalAlign: -1 }} /> {s.pax || ORDER_PARTICIPANTS.length} пасс.</span>
            <span><Icon name="calendar" style={{ width: 12, height: 12, verticalAlign: -1 }} /> {s.date}</span>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon="edit" onClick={onPick}>Изменить</Button>
      </div>
      <CalcLines s={s} />
    </div>
  ));
}

function TabServices({ services, onOpenAvia, onAddType, onOpenOther }) {
  const extraServices = services.filter((s) => !SCENARIO_KINDS.includes(s.kind));
  const extraTypes = ADD_TYPES.filter((t) => !SCENARIO_KINDS.includes(t));
  const total = services.reduce((s, x) => s + svcCalc(x).total, 0);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Сценарий поездки · {services.length} услуг{services.length ? ' · итого ' + ocMoney(total) : ''}</span>
        <div style={{ flex: 1 }} />
        <ActionMenu trigger={<Button variant="secondary" icon="plus">Доп. услуга</Button>}
          items={extraTypes.map((t) => ({ icon: SERVICE_KIND[t].icon, label: t, onClick: () => onAddType(t) }))} />
      </div>

      {SCENARIO_KINDS.map((kind) => (
        <ScenarioCard key={kind} kind={kind} items={services.filter((s) => s.kind === kind)}
          onPick={() => onAddType(kind)} onOpen={(s) => kind === 'Авиа' ? onOpenAvia(s) : onOpenOther(s)} />
      ))}

      <h3 className="section-title" style={{ fontSize: 17, margin: '22px 0 12px' }}>Дополнительные услуги</h3>
      {extraServices.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 8 }}>Дополнительных услуг нет</div>}
      {extraServices.map((s) => {
        const k = SERVICE_KIND[s.kind];
        return (
          <div className="card card-pad" key={s.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpenOther(s)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="oc-svc-t">{s.kind} · {s.title}</span>
                  <Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill>
                </div>
                <div className="oc-svc-s">{s.sub}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{ocMoney(svcCalc(s).total, s.currency)}</div>
            </div>
          </div>
        );
      })}
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

function TabChat() {
  const toast = useToast();
  const [kind, setKind] = useState('client');
  const data = {
    client: [{ from: 'them', text: 'Добрый день! Когда будет готово КП по Стамбулу?', time: '14:02' }, { from: 'me', text: 'Здравствуйте! Отправим сегодня до 16:00.', time: '14:05' }],
    supplier: [{ from: 'me', text: 'Прошу подтвердить бронь KC 131/132 на 2 пасс.', time: '12:40' }, { from: 'them', text: 'Подтверждаем, PNR KC8H2L. Тайм-лимит сегодня 18:00.', time: '12:51' }],
    internal: [{ from: 'them', text: '@Даниель клиент просит места рядом — учти при выписке.', time: '13:10' }],
  };
  const TYPES = [['client', 'Клиент'], ['supplier', 'Поставщик'], ['internal', 'Внутренний']];
  return (
    <div className="card fade-in" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', height: 520 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <div className="trip-toggle" style={{ display: 'inline-flex' }}>
          {TYPES.map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
        </div>
      </div>
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data[kind].map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
            <div style={{ background: m.from === 'me' ? 'var(--blue)' : 'var(--surface-2)', color: m.from === 'me' ? '#fff' : 'var(--ink)', padding: '10px 14px', borderRadius: 14, fontSize: 14.5 }}>{m.text}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, textAlign: m.from === 'me' ? 'right' : 'left' }}>{m.time}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 14, borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary btn-icon"><Icon name="paperclip" /></button>
        <Input placeholder="Сообщение…" style={{ flex: 1 }} />
        <Button icon="send" onClick={() => toast('Сообщение отправлено')}>Отправить</Button>
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
function OrderCard({ order, onBack, initTab, initSvcSearch }) {
  const toast = useToast();
  const [tab, setTab] = useState(initSvcSearch ? 'services' : (initTab || 'overview'));
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(order.status === 'Нет данных' ? 'Новое' : order.status);
  const [services, setServices] = useState(ORDER_SERVICES);
  const [requestType, setRequestType] = useState(order.requestType);
  const [tripEditOpen, setTripEditOpen] = useState(false);
  const participants = requestType === 'Групповая' ? GROUP_PAX : ORDER_PARTICIPANTS;
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

  const TABS = [
    { key: 'overview', label: 'Общая информация' },
    { key: 'clients', label: 'Клиенты' },
    { key: 'participants', label: 'Участники', count: participants.length },
    { key: 'route', label: 'Маршрут' },
    { key: 'services', label: 'Услуги', count: services.length },
    { key: 'offers', label: 'Ком. предложения', count: PROPOSALS.filter((p) => p.order === order.no).length },
    { key: 'documents', label: 'Документы' },
    { key: 'finance', label: 'Финансы' },
    { key: 'aftersale', label: 'Постпродажа', count: RETURNS.filter((r) => r.order === order.no).length || null },
    { key: 'chat', label: 'Чат' },
    { key: 'history', label: 'История' },
  ];

  const goAddType = (type) => {
    if (type === 'Авиа') { setSvcView('avia-picker'); return; }
    const rk = routeKeyForKind(type);
    if (rk) { setAddRoute(rk); setSvcView('svc-add'); return; }
    toast('Тип «' + type + '» недоступен', 'info');
  };
  // landed here from "Найти услуги" — open the search screen of the chosen service right away
  useEffect(() => { if (initSvcSearch) { setTab('services'); goAddType(initSvcSearch); } }, [initSvcSearch, order.no]);
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
    return <TabServices services={services}
      onAddType={goAddType}
      onOpenAvia={(s) => { const match = AIR_SERVICES.find((a) => a.no === s.avia) || { no: s.avia || s.id, airline: (s.offer ? s.offer.airline : 'KC'), status: s.status, supplier: s.supplier, pax: 2, sum: s.sum, currency: s.currency, route: s.title, pnr: '—', ticket: '—', dep: s.date }; setActiveAvia(s.offer ? { ...match, offer: s.offer } : match); setSvcView('avia-card'); }}
      onOpenOther={(s) => { if (s.svcOffer) { setActiveSvc({ ...s.svcOffer, kind: s.kind, status: s.status }); setSvcView('svc-card'); } else { setOtherSvc(s); } }} />;
  };

  const tabContent = () => {
    if (loading) return <AsyncBlock state="loading" skeletonRows={5} />;
    switch (tab) {
      case 'overview': return <TabOverview order={order} />;
      case 'clients': return <TabClients order={order} />;
      case 'participants': return <TabParticipants list={participants} isGroup={requestType === 'Групповая'} onPassport={setPassport} onAdd={() => setPaxOpen(true)} />;
      case 'route': return <TabRoute services={services} />;
      case 'services': return renderServicesArea();
      case 'offers': return <KPModule order={order} services={services} participants={participants}
        onApprove={() => { setStageIdx((i) => Math.max(i, 2)); toast('Созданы финансовые записи и задачи по выпуску документов', 'ok'); }} />;
      case 'documents': return <DocCenter scopeOrder={order.no} />;
      case 'finance': return <FinanceRegistry scopeOrder={order.no} />;
      case 'aftersale': return <ReturnsModule scopeOrder={order.no} order={order} compact />;
      case 'chat': return <div className="card" style={{ height: 560, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}><ChatThread thread={getThreadForOrder(order)} embedded /></div>;
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
        {/* header */}
        <div className="oc-head">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div className="oc-id">
              <h2>Заказ № {order.no}</h2>
              <StatusControl status={status} onChange={(s) => { setStatus(s); toast('Статус: ' + s, 'ok'); }} />
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={order.operator} size={36} />
              <div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Ответственный</div><div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{order.operator}</div></div>
            </div>
          </div>

          <div className="oc-facts">
            <div className="oc-fact"><div className="l">Клиент / Компания</div><div className="v"><Icon name="building" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />{order.client}</div></div>
            <div className="oc-fact"><div className="l">Создан</div><div className="v">{order.date}</div></div>
          </div>

          <TripSummaryBar order={order} services={services} participants={participants} aviaParams={aviaParams} requestType={requestType} onEdit={() => setTripEditOpen(true)} />

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <OrderStageBar index={stageIdx} />
          </div>

          <div className="oc-actions">
            <Button icon="plus" onClick={() => { setTab('services'); setSvcView('avia-picker'); }}>Добавить услугу</Button>
            <Button icon="zap" onClick={() => { setTab('services'); setSvcView('booking'); }}>Начать бронирование</Button>
            <Button variant="secondary" icon="template" onClick={() => setTab('offers')}>Создать КП</Button>
            <Button variant="secondary" icon="send" onClick={() => toast('Заказ отправлен клиенту', 'ok')}>Отправить клиенту</Button>
            <Button variant="secondary" icon="finance" onClick={() => setTab('finance')}>Открыть финансы</Button>
          </div>
        </div>

        {/* body: tabs + main + aside. The two-pane avia picker takes over full width. */}
        <div className="oc-grid">
          <div className="oc-main">
            {!['avia-picker', 'booking'].includes(svcView) && (
              <div className="oc-tabs">
                {TABS.map((t) => (
                  <button key={t.key} className={'tab' + (tab === t.key ? ' active' : '')} onClick={() => { setTab(t.key); if (t.key !== 'services') setSvcView(null); }}>
                    {t.label}{t.count != null && <span className="tab-count">{t.count}</span>}
                  </button>
                ))}
              </div>
            )}
            {tabContent()}
          </div>
          {!['avia-picker', 'booking'].includes(svcView) && <OrderAside services={services} onOpenFinance={() => setTab('finance')} onOpenTasks={() => toast('Список задач по заказу', 'info')} />}
        </div>
      </div>

      {/* drawers / modals reused from order_extras */}
      {paxOpen && <PassengerDrawer open={paxOpen} onClose={() => setPaxOpen(false)} />}
      {feeOpen && <FeeDrawer open={feeOpen} onClose={() => setFeeOpen(false)} />}
      {passport && <PassportModal passenger={passport} onClose={() => setPassport(null)} />}
      <TripEditModal open={tripEditOpen} onClose={() => setTripEditOpen(false)} aviaParams={aviaParams} setAviaParams={setAviaParams} requestType={requestType} setRequestType={setRequestType} />

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
