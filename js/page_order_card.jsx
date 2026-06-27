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

function OrderAside({ order, status, onStatusChange, services, participants, requestType, aviaParams, onOpenTab, onOpenTasks }) {
  const urgent = ORDER_TASKS.filter((t) => t.urgent);
  const fin = financeSnapshot(order.no, services);
  const trip = tripFromServices(services, aviaParams);

  // route stats — derived from the services actually in the scenario, not hardcoded
  const segServices = services.filter((s) => ['Авиа', 'ЖД', 'Трансфер'].includes(s.kind));
  const segCount = Math.max(1, segServices.length || (aviaParams.trip === 'rt' ? 2 : 1));
  const fromAp = AIRPORTS.find((a) => a.code === aviaParams.from);
  const toAp = AIRPORTS.find((a) => a.code === aviaParams.to);
  const cityCount = new Set([fromAp ? fromAp.city : aviaParams.from, toAp ? toAp.city : aviaParams.to].filter(Boolean)).size || 1;
  const countryCount = new Set([fromAp, toAp].map((a) => a && a.country).filter(Boolean)).size || 1;

  const okPax = participants.filter((p) => p.docStatus === 'ok').length;
  const checkPax = participants.length - okPax;

  const confirmedSvc = services.filter((s) => s.status === 'Подтверждено' || s.status === 'Выписано').length;
  const awaitingSvc = services.filter((s) => s.status === 'Забронировано' || s.status === 'Согласование' || s.status === 'Предложение').length;
  const actionSvc = services.filter((s) => s.status === 'Поиск' || s.status === 'Возврат' || s.status === 'Отменено').length;

  return (
    <div className="oc-aside">
      <div className="card oc-aside-card">
        <ActionMenu trigger={
          <button className="oc-aside-row">
            <span className="ic"><Icon name="checkCircle" /></span>
            <div className="body"><div className="lbl">Статус заказа</div><div className="val">{status}</div></div>
            <Icon name="chevRight" className="chev" />
          </button>
        } items={Object.keys(ORDER_STATUS).map((s) => ({ icon: status === s ? 'check' : null, label: s, onClick: () => onStatusChange(s) }))} />

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('route')}>
          <span className="ic"><Icon name="route" /></span>
          <div className="body">
            <div className="lbl">Маршрут</div>
            <div className="val">{aviaParams.trip === 'mc' ? 'Мульти-стоп' : trip.from + ' → ' + trip.to}</div>
            <div className="sub">{countryCount} {plural(countryCount, ['страна', 'страны', 'стран'])} · {cityCount} {plural(cityCount, ['город', 'города', 'городов'])} · {segCount} {plural(segCount, ['сегмент', 'сегмента', 'сегментов'])}</div>
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('participants')}>
          <span className="ic"><Icon name="users" /></span>
          <div className="body">
            <div className="lbl">Пассажиры</div>
            <div className="val">{participants.length} {plural(participants.length, ['человек', 'человека', 'человек'])}</div>
            <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--green)' }} />{okPax} готовы</div>
            {checkPax > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--amber)' }} />{checkPax} требуют проверки</div>}
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('services')}>
          <span className="ic"><Icon name="briefcase" /></span>
          <div className="body">
            <div className="lbl">Услуги</div>
            <div className="val">{services.length} {plural(services.length, ['услуга', 'услуги', 'услуг'])}</div>
            {confirmedSvc > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--green)' }} />{confirmedSvc} подтверждено</div>}
            {awaitingSvc > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--amber)' }} />{awaitingSvc} ожидает ответа</div>}
            {actionSvc > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--red)' }} />{actionSvc} требует действия</div>}
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('documents')}>
          <span className="ic"><Icon name="docs" /></span>
          <div className="body">
            <div className="lbl">Документы</div>
            <div className="val">{okPax} / {participants.length} готовы</div>
            {checkPax > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--red)' }} />{checkPax} отсутствуют</div>}
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('finance')}>
          <span className="ic"><Icon name="finance" /></span>
          <div className="body">
            <div className="lbl">Финансы</div>
            <div className="val">{ocMoney(fin.total)}</div>
            <div className="sub">Оплачено: {ocMoney(fin.paid)}</div>
            <div className="sub">К оплате: {ocMoney(Math.max(0, fin.total - fin.paid))}</div>
          </div>
          <Icon name="chevRight" className="chev" />
        </button>
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
        <button onClick={onOpenTasks} style={{ marginTop: 8, border: 'none', background: 'none', padding: 0, color: 'var(--blue)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Все дедлайны →</button>
      </div>

      <div className="card card-pad">
        <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Ответственный</h3>
        <div className="oc-aside-resp">
          <Avatar name={order.operator} size={40} />
          <div><div className="nm">{order.operator}</div><div className="rl">{requestType} · {aviaParams.cabin}</div></div>
        </div>
      </div>
    </div>
  );
}

/* trip route, computed from the chosen services — used by the right-hand «Маршрут» card */
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

/* one collapsible subgroup card in the participants list (group / corporate orders) */
function PaxGroupCard({ index, name, members, onPassport }) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const isChild = (p) => /реб[её]н|child|инфант|infant/i.test(p.role || '');
  const err = members.filter(({ p }) => p.docStatus === 'check').length;
  const status = members.length && members.every(({ p }) => isChild(p))
    ? { label: 'Дети', tone: 'blue' }
    : err ? { label: err + (err === 1 ? ' требует проверки' : ' требуют проверки'), tone: 'amber' }
          : { label: 'Документы готовы', tone: 'green' };
  const LIMIT = 6;
  const shown = open ? (showAll ? members : members.slice(0, LIMIT)) : [];
  return (
    <div className="pax-group">
      <div className="pax-group-head">
        <button type="button" className="pxg-toggle" onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? 'chevDown' : 'chevRight'} />
          <span className="pxg-name">{index != null ? `Группа ${index}. ${name}` : name}</span>
          <span className="pxg-cnt">{members.length}</span>
        </button>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>
      {shown.map(({ p, i }) => (
        <div key={i} className="pax-group-row" onClick={() => onPassport(p.name)}>
          <span className="pxg-num">{i + 1}</span>
          <Avatar name={p.name} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nm">{p.name} {p.lead && <span className="pill pill-blue" style={{ marginLeft: 4, height: 20, padding: '0 8px', fontSize: 11.5 }}>Лид</span>}</div>
            <div className="mt">{p.role} · {p.doc}</div>
          </div>
          <Pill tone={p.docStatus === 'check' ? 'amber' : 'green'}>{p.docStatus === 'check' ? 'Требует проверки' : 'Без ошибок'}</Pill>
        </div>
      ))}
      {open && members.length > LIMIT && (
        <button type="button" className="pxg-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Свернуть' : `+ ещё ${members.length - LIMIT} ${members.length - LIMIT === 1 ? 'пассажир' : 'пассажиров'}`}
        </button>
      )}
    </div>
  );
}

function TabParticipants({ list, isGroup, groups, fresh, onPassport, onAdd }) {
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
      {(() => {
        // grouped view (subgroups / company internal list) when the order has groups
        const secs = (isGroup && groups && groups.length) ? (() => {
          const used = new Set();
          const out = groups.map((g, gi) => {
            const members = (g.members || []).filter((i) => i < list.length && !used.has(i)).map((i) => { used.add(i); return { p: list[i], i }; });
            return { id: g.id, index: gi + 1, name: g.name, members };
          }).filter((s) => s.members.length);
          const rest = list.map((p, i) => ({ p, i })).filter(({ i }) => !used.has(i));
          if (rest.length) out.push({ id: '__rest', index: null, name: 'Без подгруппы', members: rest });
          return out;
        })() : null;
        if (secs) return <div className="pax-groups">{secs.map((s) => <PaxGroupCard key={s.id} index={s.index} name={s.name} members={s.members} onPassport={onPassport} />)}</div>;
        return (
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
        );
      })()}
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

/* ====================================================================
   ДОБАВЛЕННЫЕ УСЛУГИ — flat list with filter chips + a sticky totals bar,
   matching the reference card: icon, title/details, pax, price, status,
   «Детали» / «…». Adding/editing always happens in the side panel (see
   AddServicePanel below), never inline.
   ==================================================================== */
const SVC_FILTER_CHIPS = [
  { kind: null, label: 'Все услуги' },
  { kind: 'Авиа', label: 'Авиабилеты' },
  { kind: 'Гостиница', label: 'Отели' },
  { kind: 'Трансфер', label: 'Трансферы' },
  { kind: 'Страховка', label: 'Страховка' },
  { kind: 'Виза', label: 'Виза' },
  { kind: 'ЖД', label: 'ЖД билеты' },
  { kind: 'Автобус', label: 'Автобус' },
];

function ServiceListRow({ s, paxCount, isGroup, onOpen }) {
  const k = SERVICE_KIND[s.kind] || { icon: 'briefcase', color: 'var(--blue)' };
  const cat = (SVC_FILTER_CHIPS.find((c) => c.kind === s.kind) || {}).label || s.kind;
  const pax = isGroup ? paxCount : (s.pax || paxCount);
  return (
    <div className="oc-svc-row">
      <span className="ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
      <div className="body" onClick={() => onOpen(s)}>
        <div className="cat">{cat}</div>
        <div className="ttl">{s.title}</div>
        <div className="sub">{s.date}{s.supplier ? ' · ' + s.supplier : ''}</div>
      </div>
      <div className="mcol"><span className="l">Пассажиры</span><span className="v">{pax} {s.kind === 'Гостиница' ? 'номеров' : 'человек'}</span></div>
      <div className="mcol"><span className="l">Стоимость</span><span className="v">{ocMoney(svcCalc(s).total, s.currency)}</span></div>
      <div className="mcol"><span className="l">Статус</span><Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill></div>
      <Button variant="secondary" size="sm" onClick={() => onOpen(s)}>Детали</Button>
      <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
        items={[{ icon: 'eye', label: 'Открыть', onClick: () => onOpen(s) }, { sep: true }, { icon: 'trash', label: 'Удалить', danger: true }]} />
    </div>
  );
}

/* shared totals used by both the list and the always-pinned footer bar below it */
function serviceTotals(services) {
  // order total is shown in $, so normalize ₽-priced services (e.g. ЖД) at ≈90 ₽/$
  const toUsd = (x) => { const t = svcCalc(x).total; return (x.currency === 'RUB' || x.currency === '₽') ? t / 90 : t; };
  return {
    total: services.reduce((s, x) => s + toUsd(x), 0),
    confirmedSvc: services.filter((s) => s.status === 'Подтверждено' || s.status === 'Выписано').length,
    awaitingSvc: services.filter((s) => s.status === 'Забронировано' || s.status === 'Согласование' || s.status === 'Предложение').length,
    actionSvc: services.filter((s) => s.status === 'Поиск' || s.status === 'Возврат' || s.status === 'Отменено').length,
  };
}

/* totals bar — rendered as a sibling *after* .oc-grid (not nested inside .oc-main) so it can
   actually stick to the bottom of the page while scrolling, even when the aside is the taller
   of the two columns. Nesting it inside .oc-main would cap its sticky range to that column's
   own height, so it would scroll away before the aside finished scrolling into view. */
function ServicesFooterBar({ services, participants, bookingDraft, onStartBooking }) {
  const toast = useToast();
  const { total, confirmedSvc, awaitingSvc, actionSvc } = serviceTotals(services);
  return (
    <div className="oc-svc-footer">
      <div className="grp"><span className="l">Итого по заказу</span><span className="v">{ocMoney(total)} <Icon name="alertCircle" style={{ width: 14, height: 14, color: 'var(--muted-2)', verticalAlign: -2 }} /></span></div>
      <div className="grp"><span className="l">Пассажиры</span><span className="v">{participants.length} чел.</span></div>
      <div className="grp"><span className="l">Услуг</span><span className="v blue">{services.length}</span></div>
      <div className="grp"><span className="l">Подтверждено</span><span className="v green">{confirmedSvc}</span></div>
      <div className="grp"><span className="l">Ожидают подтверждения</span><span className="v amber">{awaitingSvc}</span></div>
      <div className="grp"><span className="l">Требуют действий</span><span className="v amber">{actionSvc}</span></div>
      <div style={{ flex: 1 }} />
      <Button variant="secondary" onClick={() => toast('Изменения сохранены', 'ok')}>Сохранить</Button>
      <Button iconRight="arrowRight" onClick={onStartBooking}>{bookingDraft ? 'Продолжить бронирование' : 'Перейти к бронированию'}</Button>
    </div>
  );
}

function TabServices({ orderNo, services, participants, requestType, onOpenAvia, onOpenOther, onOpenPicker }) {
  const [filter, setFilter] = useState(null);
  const isGroup = requestType === 'Групповая';
  const counts = {};
  services.forEach((s) => { counts[s.kind] = (counts[s.kind] || 0) + 1; });
  const shown = filter ? services.filter((s) => s.kind === filter) : services;
  const openItem = (s) => (s.kind === 'Авиа' ? onOpenAvia(s) : onOpenOther(s));

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h3 className="card-title" style={{ fontSize: 19 }}>Добавленные услуги</h3>
        <Button icon="plus" onClick={onOpenPicker}>Добавить услугу</Button>
      </div>

      <div className="oc-svc-filters" style={{ marginBottom: 16 }}>
        {SVC_FILTER_CHIPS.filter((c) => !c.kind || counts[c.kind]).map((c) => (
          <button key={c.label} className={'oc-svc-chip' + (filter === c.kind ? ' active' : '')} onClick={() => setFilter(c.kind)}>
            {c.kind && <Icon name={(SERVICE_KIND[c.kind] || {}).icon || 'briefcase'} style={{ width: 14, height: 14 }} />}
            {c.label}
            <span className="cnt">{c.kind ? (counts[c.kind] || 0) : services.length}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon="briefcase" title="Услуги не добавлены" sub="Добавьте авиабилеты, отели, трансферы и другие услуги в заказ" />
      ) : (
        <div className="card" style={{ padding: '4px 18px' }}>
          {shown.map((s) => <ServiceListRow key={s.id} s={s} paxCount={participants.length} isGroup={isGroup} onOpen={openItem} />)}
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   ADD SERVICE — side panel: category tabs on top, then either the avia
   search/results (matching the reference) or the existing av-bar search
   flow / a quick manual form for categories without a search backend.
   ==================================================================== */
// Порядок и состав категорий по запросу клиента — всё умещается в одну линию.
// Виза и VIP-зал на этом этапе уезжают блоками внутрь «Доп. услуги».
const ADD_SVC_CATS = [
  { kind: 'Авиа', label: 'Авиабилеты', icon: 'plane' },
  { kind: 'ЖД', label: 'ЖД билеты', icon: 'train', routeKey: 'rail' },
  { kind: 'Гостиница', label: 'Отели', icon: 'building', routeKey: 'hotels' },
  { kind: 'Трансфер', label: 'Трансферы', icon: 'car', routeKey: 'transfers' },
  { kind: 'Автобус', label: 'Автобус', icon: 'bus', routeKey: 'buses' },
  { kind: 'Страховка', label: 'Страховка', icon: 'shield' },
  { kind: 'Доп. услуга', label: 'Доп. услуга', icon: 'briefcase' },
];

function fmtDur(mins) { return Math.floor(mins / 60) + 'ч ' + (mins % 60) + 'м'; }

/* one selectable leg — logo, times, duration/stops, price + airline, radio (no «Выбрать» button:
   legs are combined into one route below, committed via a single «Добавить в заказ» action) */
function RadioFlightRow({ opt, selected, onSelect }) {
  const leg = opt.leg;
  return (
    <div className={'svcf-row sel-row' + (selected ? ' sel' : '')} onClick={onSelect}>
      <AirlineLogo code={opt.airline} size="sm" />
      <div className="tm">{leg.dep}<div className="ap">{leg.from}</div></div>
      <div className="mid">
        <span className="d">{leg.dur}</span>
        <span className="ln" />
        <span className={'st ' + (leg.stops ? 'via' : 'direct')}>{leg.stops ? leg.stopText : 'Прямой'}</span>
      </div>
      <div className="tm">{leg.arr}<div className="ap">{leg.to}</div></div>
      <div className="pr"><div className="v">{money(opt.price, 'USD')}</div><div className="c">{AIRLINES[opt.airline].name}</div></div>
      <Radio on={selected} onChange={onSelect} />
    </div>
  );
}

/* ====================================================================
   Three route layouts (see reference sheet): «1. Маршрут туда» (one-way,
   a flat radio list), «2. Туда и обратно» (outbound + return paired in one
   group with a swap icon, then a savings summary) and «3. Сложный маршрут»
   (numbered timeline of legs with layover tags, then a route summary).
   ==================================================================== */
/* левый фильтр выдачи рейсов (как у гостиниц): цена / пересадки / авиакомпании / багаж / поставщики */
function aviaPriceBounds() { const t = FLIGHT_OFFERS.map((o) => o.fare + o.fee); return { min: Math.floor(Math.min(...t)), max: Math.ceil(Math.max(...t)) }; }
function AviaFilters({ flt, setFlt, bounds }) {
  const airlines = [...new Set(FLIGHT_OFFERS.map((o) => o.airline))];
  const suppliers = [...new Set(FLIGHT_OFFERS.map((o) => o.supplier))];
  const tg = (key, val) => setFlt((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры</span>
        <button className="hp-reset" onClick={() => setFlt({ stops: [], air: [], sup: [], bagOnly: false, refundOnly: false, priceMax: bounds.max, flightNo: '' })}>Сбросить всё</button>
      </div>
      <SearchBox value={flt.flightNo || ''} onChange={(v) => setFlt((f) => ({ ...f, flightNo: v }))}
        placeholder="Номер рейса" style={{ minWidth: 0, width: '100%', height: 42, margin: '4px 0 6px' }} />
      <div className="hp-filter-block">
        <div className="hp-filter-title">Цена</div>
        <div className="hp-price-range">
          <span className="hp-pr-from">от {money(bounds.min, 'USD')}</span>
          <span className="hp-pr-to">{money(flt.priceMax == null ? bounds.max : flt.priceMax, 'USD')}</span>
        </div>
        <input type="range" className="hp-slider" min={bounds.min} max={bounds.max} step="1"
          value={flt.priceMax == null ? bounds.max : flt.priceMax}
          onChange={(e) => setFlt((f) => ({ ...f, priceMax: +e.target.value }))} />
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Пересадки</div>
        {[['0', 'Без пересадок'], ['1', '1 пересадка'], ['2plus', '2+ пересадки']].map(([v, l]) => (
          <label key={v} className="hp-check-row"><Checkbox on={flt.stops.includes(v)} onChange={() => tg('stops', v)} /><span className="hp-check-label">{l}</span></label>
        ))}
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Авиакомпании</div>
        {airlines.map((a) => (
          <label key={a} className="hp-check-row"><Checkbox on={flt.air.includes(a)} onChange={() => tg('air', a)} /><span className="hp-check-label">{AIRLINES[a].name}</span><span className="hp-check-cnt">{FLIGHT_OFFERS.filter((o) => o.airline === a).length}</span></label>
        ))}
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Багаж и тариф</div>
        <label className="hp-check-row"><Checkbox on={flt.bagOnly} onChange={() => setFlt((f) => ({ ...f, bagOnly: !f.bagOnly }))} /><span className="hp-check-label">Только с багажом</span></label>
        <label className="hp-check-row"><Checkbox on={flt.refundOnly} onChange={() => setFlt((f) => ({ ...f, refundOnly: !f.refundOnly }))} /><span className="hp-check-label">Только возвратные</span></label>
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Поставщики</div>
        {suppliers.map((s) => (
          <label key={s} className="hp-check-row"><Checkbox on={flt.sup.includes(s)} onChange={() => tg('sup', s)} /><span className="hp-check-label">{s}</span></label>
        ))}
      </div>
    </aside>
  );
}

/* flight card row in the «Подбор авиаперелёта» card style (reference sheet) — same markup as
   AviaPicker's ApFlightRow, but prices in the order's currency (USD) instead of ₽ */
function AviaCardRow({ opt, sel, onSelect }) {
  const leg = opt.leg;
  return (
    <div className={'ap-flight' + (sel ? ' sel' : '')} onClick={() => onSelect(opt)}>
      <AirlineLogo code={opt.airline} size="sm" />
      <div className="ap-fl-time">{leg.dep}<div className="ap">{leg.from}</div></div>
      <div className="ap-fl-mid">
        <div className="d">{leg.dur}</div>
        <div className="line" />
        <div className={'st ' + (leg.stops ? 'via' : 'direct')}>{leg.stops ? leg.stopText.split('·')[0].trim() : 'Прямой'}</div>
      </div>
      <div className="ap-fl-time">{leg.arr}<div className="ap">{leg.to}</div></div>
      <div className="ap-fl-pr"><div className="v">{money(opt.price, 'USD')}</div><div className="c">{AIRLINES[opt.airline].name}</div></div>
      <Radio on={sel} onChange={() => onSelect(opt)} />
    </div>
  );
}

/* one flight in the results list — clicking the row (or «Тарифы») opens its fare families,
   the same way picking a hotel opens its rooms (ТЗ #3). `embedded` rows live inside a larger
   round-trip / multi-city card whose parent handles the click. */
/* per-leg segments — connecting legs carry an explicit `segs`/`layovers`; direct legs fall back
   to a single segment built from the leg itself. Lets us show flight numbers per segment and the
   leg1 / пересадка / leg2 breakdown like Aviasales/Tutu (запрос клиента). */
function legSegments(leg) {
  if (leg.segs && leg.segs.length) return leg.segs;
  return [{ from: leg.from, to: leg.to, dep: leg.dep, arr: leg.arr, dur: leg.dur, flightNo: leg.flightNo }];
}
function legFlightNos(leg) { return legSegments(leg).map((s) => s.flightNo).filter(Boolean).join(' · '); }

/* Aviasales-style detailed timeline for one leg: each flight segment with its number + duration,
   and a «Пересадка Xч в AAA» band between segments. */
function LegTimeline({ opt, title }) {
  const leg = opt.leg;
  const segs = legSegments(leg);
  const lays = leg.layovers || [];
  const air = AIRLINES[opt.airline] || { name: opt.airline };
  return (
    <div className="leg-tl">
      {title && <div className="leg-tl-head"><AirlineLogo code={opt.airline} size="sm" /><span>{title}</span><span className="leg-tl-total">{leg.dur} · {segs.length > 1 ? (segs.length - 1) + ' пересадка' : 'прямой'}</span></div>}
      {segs.map((s, i) => (
        <React.Fragment key={i}>
          <div className="leg-seg">
            <div className="leg-seg-time"><div className="t">{s.dep}</div><div className="ap">{s.from}</div></div>
            <div className="leg-seg-mid">
              <div className="d">{s.dur}</div>
              <div className="line" />
              <div className="fn">{air.name} · рейс {s.flightNo}</div>
            </div>
            <div className="leg-seg-time"><div className="t">{s.arr}</div><div className="ap">{s.to}</div></div>
          </div>
          {i < segs.length - 1 && (
            <div className="leg-layover"><Icon name="clock" style={{ width: 14, height: 14 }} />Пересадка {(lays[i] && lays[i].dur) || ''} в {(lays[i] && lays[i].at) || s.to}</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function AviaResultRow({ opt, onView, embedded }) {
  const leg = opt.leg;
  return (
    <div className={'ap-flight avia-result' + (embedded ? ' embedded' : '')} onClick={!embedded && onView ? onView : undefined}>
      <AirlineLogo code={opt.airline} size="sm" />
      <div className="ap-fl-time">{leg.dep}<div className="ap">{leg.from}</div></div>
      <div className="ap-fl-mid">
        <div className="d">{leg.dur}</div>
        <div className="line" />
        <div className={'st ' + (leg.stops ? 'via' : 'direct')}>{leg.stops ? leg.stopText.replace('1 пересадка · ', 'через ') : 'Прямой'}</div>
        <div className="fn">рейс {legFlightNos(leg)}</div>
      </div>
      <div className="ap-fl-time">{leg.arr}<div className="ap">{leg.to}</div></div>
      <div className="ap-fl-pr"><div className="v">{money(opt.price, 'USD')}</div><div className="c">{AIRLINES[opt.airline].name}</div></div>
      {!embedded && <Button size="sm" variant="secondary" iconRight="chevRight" onClick={(e) => { e.stopPropagation(); onView(); }}>Тарифы</Button>}
    </div>
  );
}

/* passengers + class as a side panel (ТЗ #7) — replaces the cramped pop-over that pushed the
   page and scrolled. When the order has real participants we also show them by subgroup (ТЗ #9). */
function AviaPaxPanel({ params, setParams, participants = [], groups, onClose }) {
  const p = params;
  const pax = p.pax;
  const set = (patch) => setParams({ ...p, ...patch });
  const [specialOpen, setSpecialOpen] = useState(false);
  const setBase = (k, min = 0) => (v) => set({ pax: { ...pax, [k]: Math.max(min, v) } });
  const setGroup = (grp, k) => (v) => set({ pax: { ...pax, [grp]: { ...(pax[grp] || {}), [k]: Math.max(0, v) } } });
  const total = paxTotal(pax);
  const plural = (n) => n === 1 ? 'пассажир' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'пассажира' : 'пассажиров');
  const specialCount = Object.values(pax.special || {}).reduce((a, n) => a + (n || 0), 0)
    + Object.values(pax.subsidized || {}).reduce((a, n) => a + (n || 0), 0);

  const Step = ({ label, sub, val, set: setV, min = 0 }) => (
    <div className="avia-pax-step">
      <div style={{ flex: 1 }}><div className="t">{label}</div>{sub && <div className="s">{sub}</div>}</div>
      <button className="btn btn-secondary btn-icon btn-sm" disabled={val <= min} onClick={() => setV(val - 1)}>−</button>
      <span className="n">{val}</span>
      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setV(val + 1)}>+</button>
    </div>
  );

  const sections = (() => {
    if (groups && groups.length && participants.length) {
      const used = new Set();
      const secs = groups.map((g) => {
        const m = (g.members || []).filter((i) => i < participants.length && !used.has(i));
        m.forEach((i) => used.add(i));
        return { id: g.id, name: g.name, desc: g.desc, members: m };
      }).filter((s) => s.members.length);
      const rest = participants.map((_, i) => i).filter((i) => !used.has(i));
      if (rest.length) secs.push({ id: '__rest', name: 'Без подгруппы', members: rest });
      return secs;
    }
    return null;
  })();

  return (
    <StackPanel title="Пассажиры и класс" width="min(560px,94vw)" onClose={onClose}
      footer={<Button style={{ width: '100%' }} icon="check" onClick={onClose}>Готово · {total} {plural(total)}</Button>}>
      <div className="avia-pax-grid">
        <Step label="Взрослые" sub="от 12 лет" val={pax.adt} set={setBase('adt', 1)} min={1} />
        <Step label="Дети" sub="2–11 лет" val={pax.chd} set={setBase('chd')} />
        <Step label="Младенцы без места" sub="до 2 лет" val={pax.infNoSeat} set={setBase('infNoSeat')} />
        <Step label="Младенцы с местом" sub="до 2 лет" val={pax.infSeat} set={setBase('infSeat')} />
      </div>

      <button type="button" className="avia-pax-more" onClick={() => setSpecialOpen((o) => !o)}>
        <Icon name="plus" style={{ width: 14, height: 14 }} />Специальные категории
        {specialCount > 0 && <span className="tab-count">{specialCount}</span>}
        <span style={{ flex: 1 }} />
        <Icon name={specialOpen ? 'chevUp' : 'chevDown'} style={{ width: 16, height: 16 }} />
      </button>
      {specialOpen && (
        <div className="avia-pax-grid">
          <div className="avia-pax-subh">Льготные категории</div>
          {SPECIAL_PAX_CATEGORIES.map((c) => (
            <Step key={c.key} label={c.label} val={(pax.special || {})[c.key] || 0} set={setGroup('special', c.key)} />
          ))}
          <div className="avia-pax-subh">Субсидированные программы</div>
          {SUBSIDIZED_PAX_PROGRAMS.map((c) => (
            <Step key={c.key} label={c.label} val={(pax.subsidized || {})[c.key] || 0} set={setGroup('subsidized', c.key)} />
          ))}
        </div>
      )}

      <div className="avia-pax-subh" style={{ marginTop: 18 }}>Класс обслуживания</div>
      <div className="avia-cabin-grid">
        {CABIN_CLASSES.map((c) => (
          <button key={c} className={'tab' + (p.cabin === c ? ' active' : '')} style={{ justifyContent: 'center' }} onClick={() => set({ cabin: c })}>{c}</button>
        ))}
      </div>

      {sections && (
        <>
          <div className="avia-pax-subh" style={{ marginTop: 18 }}>Состав по подгруппам</div>
          {sections.map((sec) => (
            <div className="avia-subgroup" key={sec.id}>
              <div className="avia-subgroup-h">
                <span className="nm">{sec.name}</span><span className="cnt">{sec.members.length}</span>
                {sec.desc && <span className="ds">{sec.desc}</span>}
              </div>
              <div className="avia-subgroup-people">
                {sec.members.map((i) => (
                  <span key={i} className="avia-chip">{participants[i].name}{participants[i].role ? ' · ' + participants[i].role : ''}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </StackPanel>
  );
}

/* fare families for the clicked flight — opens like «номера в отеле» so the fare grid can be
   reviewed before booking (ТЗ #3, #8). The StackPanel footer keeps the subtotal + book button
   pinned in view (ТЗ #1) instead of being buried beneath the flight list. */
function FlightFarePanel({ route, paxCount, cabin, onClose, onAdd, onPerPax }) {
  // booking class first, then the fare grid for that class — exactly like the full order-creation
  // flow (клиент: «в выборке тарифов отсутствует выборка классов»).
  const [clsCode, setClsCode] = useState('Y');
  const tiers = fareTiersForClass(clsCode);
  const [fareId, setFareId] = useState((tiers.find((f) => f.recommended) || tiers[0]).id);
  const tier = tiers.find((f) => f.id === fareId) || (tiers.find((f) => f.recommended) || tiers[0]);
  const changeClass = (code) => {
    setClsCode(code);
    const t = fareTiersForClass(code);
    setFareId((t.find((f) => f.recommended) || t[0]).id);
  };
  const fareUsd = Math.round(tier.delta / RUB_PER_USD); // тарифные дельты в данных в ₽ → приводим к $
  const seats = Math.max(1, paxCount);
  const grand = (route.total + fareUsd) * seats;
  const legs = route.legs;
  const routeTitle = legs[0].leg.from + legs.map((l) => ' → ' + l.leg.to).join('');
  const plural = (n) => n === 1 ? 'пассажир' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'пассажира' : 'пассажиров');
  const add = () => onAdd({ ...route, cls: clsCode, cabin: fareCabinLabel(clsCode), fareName: tier.name, fareDeltaUsd: fareUsd });
  return (
    <StackPanel title="Класс и тариф по рейсу" width="min(940px,95vw)" onClose={onClose}
      footer={<>
        <div className="ft-total" style={{ marginRight: 'auto' }}>Итого · {seats} {plural(seats)}<b style={{ fontSize: 18 }}>{money(grand, 'USD')}</b></div>
        {onPerPax && <Button variant="secondary" icon="users" onClick={() => onPerPax(route)}>Тарифы по пассажирам</Button>}
        <Button icon="check" onClick={add}>Добавить в заказ</Button>
      </>}>
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AirlineLogo code={legs[0].airline} size="sm" />
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{routeTitle}</div>
          <span className="pill pill-gray" style={{ marginLeft: 'auto' }}>{fareCabinLabel(clsCode)} · класс {clsCode}</span>
        </div>
        {legs.map((l, i) => <LegTimeline key={i} opt={l} title={legs.length > 1 ? (i === 0 ? 'Маршрут туда' : i === 1 ? 'Обратно' : 'Сегмент ' + (i + 1)) : null} />)}
      </div>

      {/* 1. класс бронирования */}
      <div className="ap-sc-title">1. Выберите класс бронирования</div>
      <div className="fare-class-grid">
        {AVIA_BOOKING_CLASSES.map((c) => (
          <div key={c.code} className={'fare-class-tile' + (clsCode === c.code ? ' sel' : '')} onClick={() => changeClass(c.code)}>
            {clsCode === c.code && <Icon name="check" className="ic-sel" />}
            <div className="code">{c.code}</div>
            <div className="cab">{c.cabin}</div>
            <div className="left">Осталось мест: {c.seatsLeft}</div>
          </div>
        ))}
      </div>

      {/* 2. тариф в выбранном классе */}
      <div className="ap-sc-title">2. Выберите тариф в классе {clsCode} ({fareCabinLabel(clsCode)}) — ознакомьтесь перед бронированием</div>
      <div className="fare-grid">
        {tiers.map((f) => {
          const u = Math.round(f.delta / RUB_PER_USD);
          const sel = tier.id === f.id;
          return (
            <div key={f.id} className={'fare-card' + (sel ? ' sel' : '')} onClick={() => setFareId(f.id)}>
              {f.recommended && <span className="fc-badge">Рекомендуем</span>}
              <div className="fc-name">{f.name}</div>
              <div className="fc-price">{u ? '+ ' + money(u, 'USD') : 'без доплаты'}<small>{u ? ' / пассажир' : ''}</small></div>
              {f.features.map((ft, k) => (
                <div key={k} className={'fare-feat ' + (ft.ok ? 'ok' : 'no')}><Icon name={ft.ok ? 'check' : 'x'} />{ft.text}</div>
              ))}
              <Button variant="secondary" size="sm" className="fare-pick-btn" icon={sel ? 'check' : undefined}
                onClick={(e) => { e.stopPropagation(); setFareId(f.id); }}>{sel ? 'Выбран' : 'Выбрать тариф'}</Button>
            </div>
          );
        })}
      </div>
    </StackPanel>
  );
}

function AviaSearchPanel({ params, setParams, paxCount, participants = [], isGroup, onAdd, onAddPerPax }) {
  const p = params;
  const set = (patch) => setParams({ ...p, ...patch });
  const swap = () => set({ from: p.to, to: p.from });
  const aviaBounds = aviaPriceBounds();
  const [flt, setFlt] = useState({ stops: [], air: [], sup: [], bagOnly: false, refundOnly: false, priceMax: aviaBounds.max, flightNo: '' });
  const [visible, setVisible] = useState(6);
  const [paxPanel, setPaxPanel] = useState(false);
  const [fareRoute, setFareRoute] = useState(null);   // route awaiting fare selection → opens FlightFarePanel
  const groups = isGroup ? AVIA_GROUPS_SEED : null;
  const seats = participants.length || paxTotal(p.pax);
  const plural = (n) => n === 1 ? 'пассажир' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'пассажира' : 'пассажиров');

  const TRIPS = [['rt', 'Туда-обратно'], ['ow', 'В одну сторону'], ['mc', 'Сложный маршрут']];

  const flightNoMatch = (o, q) => { const n = q.replace(/\s+/g, '').toLowerCase(); return [o.out, o.back].some((l) => l && l.flightNo && l.flightNo.replace(/\s+/g, '').toLowerCase().includes(n)); };
  let pool = FLIGHT_OFFERS.filter((o) => {
    const st = o.out.stops >= 2 ? '2plus' : String(o.out.stops || 0);
    if (flt.flightNo && flt.flightNo.trim() && !flightNoMatch(o, flt.flightNo)) return false;
    if (flt.stops.length && !flt.stops.includes(st)) return false;
    if (flt.air.length && !flt.air.includes(o.airline)) return false;
    if (flt.sup.length && !flt.sup.includes(o.supplier)) return false;
    if (flt.bagOnly && o.baggage === 'Без багажа') return false;
    if (flt.refundOnly && !o.refundable) return false;
    if (flt.priceMax != null && (o.fare + o.fee) > flt.priceMax) return false;
    return true;
  });
  pool = [...pool].sort((a, b) => (a.fare + a.fee) - (b.fare + b.fee));

  const outOpts = pool.map((o) => ({ key: o.id + '-o', airline: o.airline, leg: o.out, supplier: o.supplier, price: Math.round((o.fare + o.fee) * 0.6) }));
  const rtCombos = pool.filter((o) => o.back).map((o) => ({
    id: o.id,
    out: { key: o.id + '-o', airline: o.airline, leg: o.out, supplier: o.supplier, price: Math.round((o.fare + o.fee) * 0.6) },
    back: { key: o.id + '-b', airline: o.airline, leg: o.back, supplier: o.supplier, price: Math.round((o.fare + o.fee) * 0.4) },
  })).sort((a, b) => (a.out.price + a.back.price) - (b.out.price + b.back.price));
  // «Сложный маршрут» (ТЗ): маска превращается в список сегментов Откуда/Куда/Дата вылета.
  // Сегменты можно добавлять до максимума и удалять лишние (крестик у строки).
  const MC_MAX = 6;
  const segs = (p.segments && p.segments.length >= 2) ? p.segments : [
    { from: p.from, to: p.to, date: p.depDate },
    { from: p.to, to: '', date: null },
  ];
  const setSegs = (next) => set({ segments: next });
  const updateSeg = (i, patch) => setSegs(segs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSeg = () => { if (segs.length < MC_MAX) setSegs([...segs, { from: segs[segs.length - 1].to || '', to: '', date: null }]); };
  const removeSeg = (i) => { if (segs.length > 2) setSegs(segs.filter((_, idx) => idx !== i)); };
  // demo legs for the results chain — one per entered segment
  const mcLegs = outOpts.length ? segs.map((_, i) => outOpts[i % outOpts.length]) : [];
  const mcTotal = mcLegs.reduce((s, o) => s + o.price, 0);

  const openFare = (route) => setFareRoute(route);
  const paxLabel = `${seats} ${plural(seats)} · ${p.cabin}`;
  const paxFieldNode = (
    <div className="av-field avia-pax-field" onClick={() => setPaxPanel(true)}>
      <span className="label">Пассажиры и класс</span>
      <div className="input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon name="users" style={{ width: 17, height: 17, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{paxLabel}</span>
        <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
      </div>
    </div>
  );
  const foundCount = p.trip === 'rt' ? rtCombos.length : p.trip === 'mc' ? 1 : outOpts.length;

  return (
    <div>
      {/* ТЗ #2 — trip type toggle that reshapes the search mask */}
      <div className="trip-toggle" style={{ marginBottom: 14 }}>
        {TRIPS.map(([k, l]) => (
          <button key={k} className={p.trip === k ? 'on' : ''} onClick={() => set({ trip: k })}>{l}</button>
        ))}
      </div>

      {p.trip === 'mc' ? (
        /* ТЗ — сложный маршрут: многострочная маска сегментов с добавлением/удалением точек */
        <div className="avia-mc-mask">
          <div className="avia-mc-head">
            <span className="l" style={{ flex: '1 1 0' }}>Откуда</span>
            <span style={{ flex: '0 0 40px' }} />
            <span className="l" style={{ flex: '1 1 0' }}>Куда</span>
            <span className="l" style={{ flex: '0 0 168px' }}>Дата вылета</span>
            <span style={{ flex: '0 0 34px' }} />
          </div>
          {segs.map((s, i) => (
            <div className="avia-mc-row" key={i}>
              <AirportField value={s.from} onChange={(v) => updateSeg(i, { from: v })} />
              <button className="av-swap" onClick={() => updateSeg(i, { from: s.to, to: s.from })} title="Поменять местами"><Icon name="swap" style={{ width: 18, height: 18 }} /></button>
              <AirportField value={s.to} onChange={(v) => updateSeg(i, { to: v })} />
              <div className="av-field avia-mc-date"><DateField value={s.date} onChange={(d) => updateSeg(i, { date: d })} placeholder="Дата" /></div>
              <button className="avia-mc-del" disabled={segs.length <= 2} title={segs.length <= 2 ? 'Минимум 2 сегмента' : 'Удалить сегмент'} onClick={() => removeSeg(i)}><Icon name="x" style={{ width: 16, height: 16 }} /></button>
            </div>
          ))}
          <div className="avia-mc-foot">
            <Button variant="secondary" icon="plus" disabled={segs.length >= MC_MAX} onClick={addSeg}>
              {segs.length >= MC_MAX ? 'Добавлено максимальное кол-во маршрутов' : 'Добавить маршрут'}
            </Button>
            <div style={{ flex: 1 }} />
            {paxFieldNode}
            <Button icon="search" className="avia-find-btn" style={{ height: 46, marginBottom: 0 }}>Найти</Button>
          </div>
        </div>
      ) : (
        /* ТЗ #6 — flexible fields keep the whole mask on one line, like the other services */
        <div className="svcp-search-bar avia-search-bar">
          <AirportField label="Откуда" value={p.from} onChange={(v) => set({ from: v })} />
          <button className="av-swap" onClick={swap} title="Поменять местами"><Icon name="swap" style={{ width: 18, height: 18 }} /></button>
          <AirportField label="Куда" value={p.to} onChange={(v) => set({ to: v })} />
          {p.trip === 'rt' ? (
            <div className="av-field">
              {/* ТЗ #10 — single range field with the «от — до» line; «Только туда» turns it into one-way */}
              <DateRangeField label="Даты поездки" startVal={p.depDate} endVal={p.retDate} rangeStartLabel="Только туда"
                placeholder="Туда — обратно"
                onChange={(s, e) => { if (e === null || e === undefined) set({ trip: 'ow', depDate: s, retDate: null }); else set({ depDate: s, retDate: e }); }} />
            </div>
          ) : (
            <div className="av-field">
              <DateField label="Дата вылета" value={p.depDate} onChange={(d) => set({ depDate: d })} placeholder="Выбрать" />
            </div>
          )}
          {/* ТЗ #7 — passengers open in a side panel instead of a pop-over */}
          {paxFieldNode}
          <Button icon="search" className="avia-find-btn" style={{ height: 46, marginBottom: 0 }}>Найти</Button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>Найдено {foundCount}</span>
        <div style={{ minWidth: 190 }}><Select options={[{ value: 'price', label: 'Сортировка: Цена' }]} value="price" onChange={() => {}} /></div>
      </div>

      <div className="hp-layout">
        <AviaFilters flt={flt} setFlt={setFlt} bounds={aviaBounds} />
        <div style={{ minWidth: 0 }}>
          {p.trip === 'ow' && (
            <div className="ap-route-section">
              <div className="ap-route-title">Рейсы туда — нажмите рейс, чтобы открыть тарифы</div>
              {outOpts.slice(0, visible).map((o) => (
                <div key={o.key} className="ap-route-card">
                  <AviaResultRow opt={o} onView={() => openFare({ legs: [o], total: o.price })} />
                </div>
              ))}
            </div>
          )}

          {p.trip === 'rt' && (
            <div className="ap-route-section">
              <div className="ap-route-title">Туда и обратно — нажмите вариант, чтобы открыть тарифы</div>
              {rtCombos.slice(0, visible).map((c) => {
                const total = c.out.price + c.back.price;
                const dur = fmtDur(durMin(c.out.leg.dur) + durMin(c.back.leg.dur));
                const savings = Math.round(total * 0.045);
                const view = () => openFare({ legs: [c.out, c.back], total });
                return (
                  <div key={c.id} className="ap-route-card avia-rt-card" onClick={view}>
                    <AviaResultRow opt={c.out} embedded />
                    <span className="ap-route-swap"><Icon name="swap" /></span>
                    <AviaResultRow opt={c.back} embedded />
                    <div className="ap-route-totals">
                      <div className="rt-block"><Icon name="route" /><div><div className="l">Общая продолжительность</div><div className="v">{dur}</div></div></div>
                      <div className="rt-price"><div className="l">Итого за маршрут</div><div className="v">{money(total, 'USD')}</div></div>
                      <span className="pill pill-green rt-badge"><Icon name="zap" />Выгоднее на {money(savings, 'USD')}</span>
                      <Button size="sm" iconRight="chevRight" onClick={(e) => { e.stopPropagation(); view(); }}>Тарифы</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {p.trip === 'mc' && (
            <div className="ap-route-section">
              <div className="ap-route-title">Сложный маршрут — нажмите, чтобы открыть тарифы</div>
              <div className="ap-route-card chain">
                <div className="ap-route-chain">
                  {mcLegs.map((o, i) => (
                    <React.Fragment key={o.key}>
                      <div className="ap-route-chain-row">
                        <div className="ap-route-chain-num"><span>{i + 1}</span>{i < mcLegs.length - 1 && <i />}</div>
                        <div className="ap-route-chain-leg"><AviaResultRow opt={o} embedded /></div>
                      </div>
                      {i < mcLegs.length - 1 && <div style={{ marginLeft: 36 }}><span className="ap-route-chain-layover">Пересадка {fmtDur(60 + i * 40)}</span></div>}
                    </React.Fragment>
                  ))}
                </div>
                <div className="ap-route-totals">
                  <div className="rt-block"><Icon name="route" /><div><div className="l">Итого за маршрут</div><div className="v">{money(mcTotal, 'USD')}</div></div></div>
                  <div style={{ flex: 1 }} />
                  <Button size="sm" iconRight="chevRight" onClick={() => openFare({ legs: mcLegs, total: mcTotal })}>Тарифы</Button>
                </div>
              </div>
            </div>
          )}

          {p.trip !== 'mc' && visible < (p.trip === 'rt' ? rtCombos.length : outOpts.length) && (
            <button className="svcf-more" onClick={() => setVisible((v) => v + 10)}>
              Показать ещё рейсы <Icon name="chevDown" style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>
      </div>

      {paxPanel && <AviaPaxPanel params={p} setParams={setParams} participants={participants} groups={groups} onClose={() => setPaxPanel(false)} />}
      {fareRoute && (
        <FlightFarePanel route={fareRoute} paxCount={seats} cabin={p.cabin}
          onClose={() => setFareRoute(null)}
          onAdd={(r) => { setFareRoute(null); onAdd(r); }}
          onPerPax={onAddPerPax ? (r) => { setFareRoute(null); onAddPerPax(r); } : null} />
      )}
    </div>
  );
}

function QuickAddForm({ kind, onAdd }) {
  const toast = useToast();
  const k = SERVICE_KIND[kind] || { icon: 'briefcase', color: 'var(--blue)' };
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(null);
  const [supplier, setSupplier] = useState('');
  const [cost, setCost] = useState('');
  const submit = () => {
    if (!title.trim() || !cost) { toast('Заполните название и стоимость', 'err'); return; }
    onAdd({ title: title.trim(), sub: kind, cost: +cost, fee: 0, supplier: supplier.trim() || '—', info: [{ l: 'Дата', v: date ? fmtDate(date) : '—' }] }, kind);
  };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{kind}</div>
      </div>
      <div className="form-grid">
        <div className="full"><Field label="Название услуги"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Страховка ВЗР" /></Field></div>
        <Field label="Дата"><DateField value={date} onChange={setDate} placeholder="Выбрать дату" /></Field>
        <Field label="Поставщик"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Название поставщика" /></Field>
        <Field label="Стоимость, $"><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" /></Field>
      </div>
      <Button icon="plus" onClick={submit} style={{ marginTop: 8 }}>Добавить в заказ</Button>
    </div>
  );
}

function AddServicePanel({ kind, setKind, aviaParams, setAviaParams, paxCount, participants, isGroup, onAddAvia, onAddAviaPerPax, onAddOther }) {
  const cat = ADD_SVC_CATS.find((c) => c.kind === kind) || ADD_SVC_CATS[0];
  return (
    <div className="fade-in">
      <div className="svcp-cattabs">
        {ADD_SVC_CATS.map((c) => (
          <button key={c.kind} className={'svcp-cattab' + (kind === c.kind ? ' active' : '')} onClick={() => setKind(c.kind)}>
            <Icon name={c.icon} />{c.label}
          </button>
        ))}
      </div>
      {kind === 'Авиа' && <AviaSearchPanel params={aviaParams} setParams={setAviaParams} paxCount={paxCount}
        participants={participants || []} isGroup={isGroup} onAdd={onAddAvia} onAddPerPax={onAddAviaPerPax} />}
      {/* Гостиницы — полноценный модуль подбора с фильтром слева, выбором номера,
          составом гостей, групповым размещением и подтверждением бронирования */}
      {kind === 'Гостиница' && <HotelPicker participants={participants} group={isGroup} onApply={(offer) => onAddOther(offer, 'Гостиница')} onCancel={() => {}} />}
      {kind === 'ЖД' && <RailAddFlow participants={participants} groups={isGroup ? AVIA_GROUPS_SEED : null} onAdd={onAddOther} />}
      {kind !== 'Авиа' && kind !== 'Гостиница' && kind !== 'ЖД' && cat.routeKey && <ServiceAddFlow routeKey={cat.routeKey} onAdd={onAddOther} />}
      {kind !== 'Авиа' && kind !== 'Гостиница' && kind !== 'ЖД' && !cat.routeKey && <QuickAddForm kind={kind} onAdd={onAddOther} />}
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
  const requestType = order.requestType;
  const [editOpen, setEditOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const participants = requestType === 'Групповая' ? GROUP_PAX : ORDER_PARTICIPANTS;
  const chatUnread = threadUnread(getThreadForOrder(order));
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
  const [svcView, setSvcView] = useState(null); // null | 'add-service' | 'avia-card' | 'svc-card' | 'booking'
  // booking wizard progress lives here (not inside BookingWizard) so it survives the operator
  // switching to other order tabs mid-flow, and can be resumed later as a draft
  const [bookingDraft, setBookingDraft] = useState(null); // null | { step, method, pay }
  const [activeAvia, setActiveAvia] = useState(null);
  const [addKind, setAddKind] = useState('Авиа');   // active category tab inside the add-service panel
  const [activeSvc, setActiveSvc] = useState(null); // non-avia service being viewed
  const [otherSvc, setOtherSvc] = useState(null);
  // per-passenger fare/class picked for the route awaiting confirmation in the tariff screen
  const [pendingAviaRoute, setPendingAviaRoute] = useState(null); // { legs, total } | null
  const [aviaClassByPax, setAviaClassByPax] = useState({});
  const [aviaFareByPax, setAviaFareByPax] = useState({});
  const [aviaIndividualMode, setAviaIndividualMode] = useState(true);
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

  const docsReady = participants.filter((p) => p.docStatus === 'ok').length;
  // visible top-level tabs, in the order shown on the reference card
  const TABS = [
    { key: 'route', label: 'Маршрут', icon: 'route' },
    { key: 'services', label: 'Услуги', icon: 'briefcase', count: services.length },
    { key: 'participants', label: 'Пассажиры', icon: 'users', count: participants.length },
    { key: 'documents', label: 'Документы', icon: 'docs', countText: docsReady + '/' + participants.length },
    { key: 'finance', label: 'Финансы', icon: 'finance' },
    { key: 'history', label: 'История', icon: 'clock' },
  ];
  // secondary sections tucked behind the «…» menu so the tab strip stays exactly six items
  const MORE_TABS = [
    { key: 'overview', label: 'Общая информация', icon: 'clipboard' },
    { key: 'clients', label: 'Клиенты', icon: 'contacts' },
    { key: 'offers', label: 'КП', icon: 'template', count: PROPOSALS.filter((p) => p.order === order.no).length, locked: stageIdx < 2 },
    { key: 'aftersale', label: 'Постпродажа', icon: 'refund', count: RETURNS.filter((r) => r.order === order.no).length || null, locked: stageIdx < 2 },
  ];
  const isTabLocked = (t) => !!t.locked;

  const goAddType = (type) => { setAddKind(type || 'Авиа'); setSvcView('add-service'); };
  // applied from AviaSearchPanel — a route made of 1+ selected legs (one-way / round-trip / multi-city).
  // Routing through the tariff screen first lets the operator set a booking class + fare per passenger.
  const addAviaSimple = (route, fareDeltaSum = 0) => {
    const id = 'S' + (services.length + 1);
    const legs = route.legs;
    const title = legs[0].leg.from + legs.map((l) => ' → ' + l.leg.to).join('');
    const airlineNames = [...new Set(legs.map((l) => AIRLINES[l.airline].name))].join(' / ');
    const sv = { id, kind: 'Авиа', title,
      sub: `${airlineNames} · ${participants.length} пасс. · ${route.fareName || aviaParams.cabin}${route.cls ? ' · класс ' + route.cls : ''}`,
      status: 'Предложение', sum: route.total * participants.length + fareDeltaSum, currency: 'USD', date: legs[0].leg.date, supplier: legs[0].supplier };
    setServices((cur) => [...cur, sv]);
    setSvcView(null);
    toast('Перелёт добавлен в сценарий заказа', 'ok');
  };
  // route picked in AviaSearchPanel → open the per-passenger tariff screen before adding it
  const startAviaFareStep = (route) => { setAviaClassByPax({}); setAviaFareByPax({}); setAviaIndividualMode(true); setPendingAviaRoute(route); };
  const finalizeAviaFare = () => {
    if (!pendingAviaRoute) return;
    const fareDeltaSum = participants.reduce((s, _, i) => {
      const cls = aviaClassByPax[i] || 'Y';
      const tiers = fareTiersForClass(cls);
      const fid = aviaFareByPax[i] || (tiers.find((f) => f.recommended) || tiers[0]).id;
      const t = tiers.find((f) => f.id === fid) || tiers[0];
      return s + Math.round((t.delta || 0) / RUB_PER_USD); // ₽-дельта тарифа → $ (заказ в USD)
    }, 0);
    addAviaSimple(pendingAviaRoute, fareDeltaSum);
    setPendingAviaRoute(null);
  };
  const addSvcOffer = (offer, kind) => {
    const id = 'S' + (services.length + 1);
    const sv = { id, kind, title: offer.title, sub: offer.sub, status: 'Предложение', sum: offer.cost + offer.fee, currency: offer.currency || 'USD',
      date: (offer.info && offer.info[0] && offer.info[0].v) || '—', supplier: offer.supplier, svcOffer: offer };
    setServices((cur) => [...cur, sv]);
    setSvcView(null);
    toast(kind + ': услуга добавлена в заказ', 'ok');
  };

  // --- inside the Services tab, a sub-flow (viewing an existing service, adding a new one, the
  // booking wizard) takes over the main column only — the tab strip and the right-hand aside
  // stay exactly where they are, matching the reference card. ---
  const renderServicesArea = () => {
    if (svcView === 'booking') return <BookingWizard order={order} services={services} draft={bookingDraft}
      onSaveDraft={setBookingDraft} onClose={() => setSvcView(null)}
      onComplete={() => { setStatus('Оплачено'); setStageIdx(4); setBookingDraft(null); }} />;
    if (svcView === 'avia-card') return <FlightCard svc={activeAvia} offer={activeAvia ? activeAvia.offer : null} onBack={() => setSvcView(null)} />;
    if (svcView === 'svc-card') return <SvcCard item={activeSvc} kind={activeSvc.kind} onBack={() => setSvcView(null)} />;
    if (svcView === 'add-service') return (
      <div className="fade-in">
        <BackRow label="К списку услуг" onBack={() => setSvcView(null)} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <h3 className="card-title" style={{ fontSize: 19 }}>Добавить услугу / Поиск</h3>
          <ActionMenu trigger={<Button variant="secondary" size="sm" iconRight="chevDown">Недавние запросы</Button>}
            items={[{ label: 'Нет недавних запросов' }]} />
        </div>
        <AddServicePanel kind={addKind} setKind={setAddKind} aviaParams={aviaParams} setAviaParams={setAviaParams}
          paxCount={participants.length} participants={participants} isGroup={requestType === 'Групповая'}
          onAddAvia={(route) => addAviaSimple(route, Math.round(route.fareDeltaUsd || 0) * participants.length)}
          onAddAviaPerPax={startAviaFareStep} onAddOther={addSvcOffer} />
      </div>
    );
    return <TabServices orderNo={order.no} services={services} participants={participants} requestType={requestType}
      onOpenPicker={() => goAddType(addKind)}
      onOpenAvia={(s) => { const match = AIR_SERVICES.find((a) => a.no === s.avia) || { no: s.avia || s.id, airline: (s.offer ? s.offer.airline : 'KC'), status: s.status, supplier: s.supplier, pax: 2, sum: s.sum, currency: s.currency, route: s.title, pnr: '—', ticket: '—', dep: s.date }; setActiveAvia(s.offer ? { ...match, offer: s.offer } : match); setSvcView('avia-card'); }}
      onOpenOther={(s) => { if (s.svcOffer) { setActiveSvc({ ...s.svcOffer, kind: s.kind, status: s.status }); setSvcView('svc-card'); } else { setOtherSvc(s); } }} />;
  };

  const tabContent = () => {
    if (loading) return <AsyncBlock state="loading" skeletonRows={5} />;
    switch (tab) {
      case 'overview': return <TabOverview order={order} />;
      case 'clients': return <TabClients order={order} onOpenChat={onOpenChat} />;
      case 'participants': return <TabParticipants list={participants} isGroup={requestType === 'Групповая'} groups={requestType === 'Групповая' ? AVIA_GROUPS_SEED : null} fresh={fresh} onPassport={setPassport} onAdd={() => setPaxOpen(true)} />;
      case 'route': return <TabRoute services={services} />;
      case 'services': return renderServicesArea();
      case 'offers': return <KPModule order={order} services={services} participants={participants}
        onApprove={() => { setStageIdx((i) => Math.max(i, 2)); toast('Созданы финансовые записи и задачи по выпуску документов', 'ok'); }} />;
      case 'documents': return <DocCenter scopeOrder={order.no} participants={participants} />;
      case 'finance': return <FinanceRegistry scopeOrder={order.no} />;
      case 'aftersale': return <ReturnsModule scopeOrder={order.no} order={order} compact />;
      case 'history': return <TabHistory />;
      default: return null;
    }
  };

  // true only while the Услуги tab is actually showing a full-width sub-flow (the booking
  // wizard) — on every other tab the aside/FAB stay visible as usual, even if a booking
  // draft is parked in the background. Adding a service is a side panel now, not full-width.
  const fullWidthFlow = tab === 'services' && svcView === 'booking';
  // shared with the aside's own condensed header (Заказ №… + status + ⋮), so both echo the
  // same actions instead of drifting apart
  const headerMenuItems = [
    { icon: 'edit', label: 'Редактировать заказ', onClick: () => setEditOpen(true) },
    { icon: 'plus', label: 'Добавить услугу', onClick: () => { setTab('services'); goAddType('Авиа'); } },
    { icon: 'zap', label: bookingDraft ? 'Продолжить бронирование' : 'Начать бронирование', onClick: () => { setTab('services'); setSvcView('booking'); } },
    { icon: 'template', label: 'КП', onClick: () => setTab('offers') },
    { icon: 'send', label: 'Отправить клиенту', onClick: () => setSendOpen(true) },
  ];
  return (
    <div className="fade-in">
      <Topbar title="Карточка заказа">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>К реестру</Button>
      </Topbar>

      <div className="content" style={{ paddingTop: 8 }}>
        {/* header + tabs now live inside the (narrower) main column, so the aside can start
            at the very top right alongside them instead of being pushed below a full-width bar */}
        <div className="oc-grid">
          <div className="oc-main">
            <div className="oc-head">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div className="oc-id">
                    <h2>Заказ № {order.no}</h2>
                    <StatusControl status={status} onChange={(s) => { setStatus(s); toast('Статус: ' + s, 'ok'); }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13.5, color: 'var(--muted)' }}>
                    <span>Создан {order.date} · <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{(participants.find((p) => p.lead) || participants[0] || {}).name || order.client}</b> · {requestType === 'Групповая' ? 'Групповая поездка' : requestType} · {aviaParams.cabin}</span>
                  </div>
                  <div style={{ flex: 1 }} />
                  <ActionMenu trigger={<button className="btn btn-ghost btn-icon"><Icon name="more" /></button>} items={headerMenuItems} />
                  <Button variant="secondary" size="sm" icon="chat" onClick={onOpenChat}>
                    Чат{chatUnread > 0 && <span className="pill pill-red" style={{ marginLeft: 6 }}>{chatUnread}</span>}
                  </Button>
                </div>

                <div className="oc-tabbar">
                  <div className="oc-tabbar-scroll">
                    {TABS.map((t) => (
                      <button key={t.key} className={'oc-tab' + (tab === t.key ? ' active' : '')}
                        onClick={() => { setTab(t.key); if (t.key !== 'services' && svcView !== 'booking') setSvcView(null); }}>
                        <Icon name={t.icon} />{t.label}
                        {(t.count != null || t.countText) && <span className="cnt">{t.countText || t.count}</span>}
                      </button>
                    ))}
                  </div>
                  <span className="oc-tab-more">
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={MORE_TABS.map((t) => ({
                        icon: t.icon, label: t.label + (t.count ? ` (${t.count})` : ''),
                        onClick: () => {
                          if (t.locked) { toast('Раздел станет доступен на следующих этапах заказа', 'info'); return; }
                          setTab(t.key); if (svcView !== 'booking') setSvcView(null);
                        },
                      }))} />
                  </span>
                </div>
            </div>

            {tabContent()}
          </div>
          {!fullWidthFlow && (
            <OrderAside order={order} status={status} onStatusChange={(s) => { setStatus(s); toast('Статус: ' + s, 'ok'); }}
              services={services} participants={participants} requestType={requestType} aviaParams={aviaParams}
              onOpenTab={(k) => { setTab(k); if (k !== 'services' && svcView !== 'booking') setSvcView(null); }}
              onOpenTasks={() => toast('Список задач по заказу', 'info')} />
          )}
        </div>

        {/* always-pinned totals bar — visible across the whole order card, on every tab, not
            just «Услуги». A sibling of .oc-grid (not nested in .oc-main) so it sticks to the
            bottom of the page even though the aside is taller. Hidden only for the full-width
            booking wizard, which has no aside/grid to sit alongside. */}
        {!fullWidthFlow && (
          <ServicesFooterBar services={services} participants={participants} bookingDraft={bookingDraft}
            onStartBooking={() => { setTab('services'); setSvcView('booking'); }} />
        )}
      </div>

      {/* drawers / modals reused from order_extras */}
      {paxOpen && <PassengerDrawer open={paxOpen} onClose={() => setPaxOpen(false)} />}
      {feeOpen && <FeeDrawer open={feeOpen} onClose={() => setFeeOpen(false)} />}
      {passport && <PassportModal passenger={passport} participants={participants} onClose={() => setPassport(null)} />}
      <OrderEditDrawer open={editOpen} order={order} status={status} onStatusChange={(s) => { setStatus(s); toast('Статус: ' + s, 'ok'); }}
        services={services} participants={participants}
        onClose={() => setEditOpen(false)}
        onAddPassenger={() => { setEditOpen(false); setPaxOpen(true); }} />

      {/* per-passenger tariff screen, opened after a route is picked in AviaSearchPanel and before it's added to the order */}
      {pendingAviaRoute && (
        <FareSelectPanel pax={participants} groups={requestType === 'Групповая' ? AVIA_GROUPS_SEED : undefined}
          classByPax={aviaClassByPax} setClassByPax={setAviaClassByPax}
          fareByPax={aviaFareByPax} setFareByPax={setAviaFareByPax}
          individualMode={aviaIndividualMode} setIndividualMode={setAviaIndividualMode}
          onClose={() => setPendingAviaRoute(null)} onApply={finalizeAviaFare} />
      )}

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

/* ====================================================================
   ORDER EDIT DRAWER — consolidated side panel: passengers / route /
   services / extra, with an order-summary aside (status, total, composition).
   ==================================================================== */
const EDIT_TABS = [
  { key: 'pax', n: 1, label: 'Пассажиры' },
  { key: 'route', n: 2, label: 'Маршрут' },
  { key: 'extra', n: 3, label: 'Дополнительно' },
];

function OrderEditDrawer({ open, order, status, onStatusChange, services, participants, onClose, onAddPassenger }) {
  const toast = useToast();
  const [tab, setTab] = useState('pax');
  const secRefs = useRef({});
  const [trip, setTrip] = useState('rt');
  const [pts, setPts] = useState(['FRU', 'IST']);
  const [depDate, setDepDate] = useState(null);
  const [retDate, setRetDate] = useState(null);
  const [cityPick, setCityPick] = useState(null);
  const [eventType, setEventType] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  if (!open) return null;

  const cityLabel = (code) => { const a = AIRPORTS.find((x) => x.code === code); return a ? `${a.city} (${a.code})` : null; };
  const goTab = (key) => { setTab(key); const el = secRefs.current[key]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const fin = financeSnapshot(order.no, services);
  const submit = () => { toast('Изменения сохранены', 'ok'); onClose(); };

  return (
    <>
      <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="scroll" style={{ background: '#fff', width: 'min(980px, 94vw)', height: '100vh',
          overflow: 'auto', boxShadow: 'var(--shadow-modal)', animation: 'slidein .26s cubic-bezier(.2,.9,.3,1)',
          display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '22px 30px 0', position: 'sticky', top: 0, background: '#fff', zIndex: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 23, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-.02em' }}>Редактирование заказа №{order.no}</h2>
              <button type="button" className="modal-close" onClick={onClose}><Icon name="x" /></button>
            </div>
            <div className="tabs" style={{ margin: '18px 0 0' }}>
              {EDIT_TABS.map((t) => (
                <button key={t.key} className={'tab' + (tab === t.key ? ' active' : '')} onClick={() => goTab(t.key)}>{t.n}. {t.label}</button>
              ))}
            </div>
            <div style={{ borderBottom: '1px solid var(--line)', marginTop: 18 }} />
          </div>

          {/* Body: form + summary aside */}
          <div style={{ display: 'flex', gap: 24, padding: '24px 30px', flex: 1, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* 1 — passengers */}
              <div ref={(el) => (secRefs.current.pax = el)} className="oce-sec">
                <div className="oce-sec-h"><span className="n">1</span><span className="t">Пассажиры</span></div>
                {participants.map((p, i) => (
                  <div key={i} className="oce-client found">
                    <Icon name="checkCircle" style={{ width: 20, height: 20, color: 'var(--green)', flex: '0 0 20px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm">{p.name}{p.lead && <span className="pill pill-blue" style={{ marginLeft: 8 }}>Лид</span>}</div>
                      <div className="mt">{p.phone || p.doc || '—'}</div>
                    </div>
                  </div>
                ))}
                <button className="oce-add" onClick={onAddPassenger}><Icon name="plus" style={{ width: 16, height: 16 }} />Добавить пассажира</button>
              </div>

              {/* 2 — route */}
              <div ref={(el) => (secRefs.current.route = el)} className="oce-sec">
                <div className="oce-sec-h"><span className="n">2</span><span className="t">Маршрут</span></div>
                <div className="trip-toggle" style={{ marginBottom: 14 }}>
                  {[['rt', 'Туда-обратно'], ['ow', 'В одну сторону'], ['mc', 'Сложный маршрут']].map(([k, l]) => (
                    <button key={k} className={trip === k ? 'on' : ''} onClick={() => setTrip(k)}>{l}</button>
                  ))}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <DateRangeField label="Даты поездки" startVal={depDate} endVal={retDate}
                    onChange={(s, e) => { setDepDate(s); setRetDate(e); }} placeholder="Туда — обратно" />
                </div>
                {pts.map((code, i) => (
                  <div className="oce-route-row" key={i}>
                    <span className="idx">{i + 1}</span>
                    <div className="oce-city" onClick={() => setCityPick({ idx: i })}>
                      <Icon name="plane" />
                      {cityLabel(code) ? <span>{cityLabel(code)}</span> : <span className="ph">Выберите город</span>}
                    </div>
                    <button className="icon-btn green" title="Изменить город" onClick={() => setCityPick({ idx: i })}><Icon name="edit" /></button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button className="oce-add" style={{ flex: 1 }} onClick={() => { const idx = pts.length; setPts((p) => [...p, '']); setCityPick({ idx }); }}>
                    <Icon name="plus" style={{ width: 16, height: 16 }} />Добавить город
                  </button>
                  <Button variant="secondary" icon="zap" onClick={() => toast('Маршрут оптимизирован', 'ok')}>Оптимизировать</Button>
                </div>
              </div>

              {/* 3 — extra */}
              <div ref={(el) => (secRefs.current.extra = el)} className="oce-sec" style={{ marginBottom: 0 }}>
                <div className="oce-sec-h"><span className="n">3</span><span className="t">Дополнительно</span></div>
                <div className="form-grid">
                  <Field label="Тип события">
                    <Select placeholder="Выберите тип" options={['Деловая поездка', 'Отпуск', 'Лечение', 'Учёба']} value={eventType} onChange={(e) => setEventType(e.target.value)} />
                  </Field>
                  <div className="full">
                    <Field label="Примечание оператора">
                      <textarea className="input" rows={3} placeholder="Комментарий к заказу" value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: 'vertical' }} />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* right summary aside */}
            <div style={{ width: 280, flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 14 }}>Информация о заказе</h3>
                <div className="kv-stack">
                  <div><div className="label2">№ заказа</div><div className="val2">№{order.no}</div></div>
                  <div><div className="label2">Статус</div><div className="val2"><StatusControl status={status} onChange={onStatusChange} /></div></div>
                  <div><div className="label2">Дата создания</div><div className="val2">{order.date}</div></div>
                  <div><div className="label2">Ответственный</div><div className="val2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={order.operator} size={24} />{order.operator}</div></div>
                </div>
              </div>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 8 }}>Итого по заказу</h3>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>{ocMoney(fin.total)}</div>
              </div>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 14 }}>Состав заказа</h3>
                {services.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Услуги не выбраны</div>}
                {services.map((s) => {
                  const k = SERVICE_KIND[s.kind] || { icon: 'briefcase', color: 'var(--blue)' };
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span className="oc-svc-ic" style={{ background: k.color, width: 34, height: 34, borderRadius: 10, flex: '0 0 34px' }}><Icon name={k.icon} style={{ width: 15, height: 15 }} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13, whiteSpace: 'nowrap' }}>{ocMoney(svcCalc(s).total, s.currency)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 30px', borderTop: '1px solid var(--line)', position: 'sticky', bottom: 0, background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <div style={{ flex: 1 }} />
            <Button variant="primary" icon="check" onClick={submit}>Сохранить изменения</Button>
          </div>
        </div>
      </div>

      {cityPick && <CityPickPanel value={pts[cityPick.idx]}
        onClose={() => setCityPick(null)}
        onPick={(code) => { setPts((p) => { const n = [...p]; n[cityPick.idx] = code; return n; }); setCityPick(null); }} />}
    </>
  );
}

function BackRow({ label, onBack }) {
  return <div style={{ marginBottom: 14 }}><Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>{label}</Button></div>;
}

Object.assign(window, { OrderCard, AsyncBlock, OrderEditDrawer });
