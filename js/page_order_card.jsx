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
        <Pill tone={ORDER_STATUS[status]}>{status}</Pill><Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
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

function OrderAside({ order, status, onStatusChange, services, participants, requestType, aviaParams, onOpenTab, onOpenTasks, operator, onReassign }) {
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
        <button onClick={onOpenTasks} style={{ marginTop: 8, border: 'none', background: 'none', padding: 0, color: 'var(--blue)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Все дедлайны →</button>
      </div>

      <div className="card card-pad">
        <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Ответственный</h3>
        <div className="oc-aside-resp" style={{ marginBottom: 12 }}>
          <Avatar name={operator || order.operator} size={40} />
          <div><div className="nm">{operator || order.operator}</div><div className="rl">{order.operatorRole || 'Оператор'}</div></div>
        </div>
        <Button variant="secondary" size="sm" icon="users" style={{ width: '100%' }} onClick={onReassign}>Переназначить</Button>
      </div>
    </div>
  );
}

/* operator reassignment — выбор/переназначение ответственного оператора заказа */
function ReassignOperatorDrawer({ open, current, onClose, onPick }) {
  return (
    <Drawer open={open} onClose={onClose} title="Ответственный оператор"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Выберите сотрудника, ответственного за работу над заказом.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {OPERATORS.map((op) => {
          const sel = op === current;
          return (
            <button key={op} type="button" className={'oce-client' + (sel ? ' sel' : '')} style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid ' + (sel ? 'var(--blue)' : 'var(--line)'), background: sel ? 'var(--blue-soft)' : '#fff', borderRadius: 12, padding: '10px 12px' }}
              onClick={() => onPick(op)}>
              <Avatar name={op} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{op}</div><div className="mt">Оператор</div></div>
              {sel ? <Pill tone="blue">Текущий</Pill> : <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />}
            </button>
          );
        })}
      </div>
    </Drawer>
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
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{order.client}</div><div style={{ color: 'var(--muted)', fontSize: 13 }}>Заказчик · Компания</div></div>
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
            <div><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{order.client}</div><div style={{ color: 'var(--muted)', fontSize: 13 }}>Заказчик · Компания</div></div>
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
        <Icon name={k.icon} style={{ width: 16, height: 16 }} />
      </span>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.docType}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>№ {p.docNo}</div>
        {p.docExpiry && <div style={{ fontSize: 12, color: 'var(--muted)' }}>до {p.docExpiry}</div>}
      </div>
    </div>
  );
}

/* one collapsible subgroup card in the participants list (group / corporate orders) */
function PaxGroupCard({ index, name, members, onPassport, onEdit, onAddDoc }) {
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
        <div key={i} className="pax-group-row" onClick={() => onEdit && onEdit(p)}>
          <span className="pxg-num">{i + 1}</span>
          <Avatar name={p.name} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nm">{p.name} {p.lead && <span className="pill pill-blue" style={{ marginLeft: 4, height: 20, padding: '0 8px', fontSize: 12 }}>Лид</span>}</div>
            <div className="mt">{p.role} · {p.doc}</div>
          </div>
          <Pill tone={p.docStatus === 'check' ? 'amber' : 'green'}>{p.docStatus === 'check' ? 'Требует проверки' : 'Без ошибок'}</Pill>
          <span onClick={(e) => e.stopPropagation()}>
            <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
              items={[
                { icon: 'idcard', label: 'Документы', onClick: () => onPassport(p.name) },
                { icon: 'docs', label: 'Добавить документ', onClick: () => onAddDoc && onAddDoc(p) },
                { icon: 'edit', label: 'Изменить данные', onClick: () => onEdit && onEdit(p) },
              ]} />
          </span>
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

function TabParticipants({ list, isGroup, groups, fresh, orderNo, orderAirline, companyId, companyName, onPassport, onAdd, onEdit, onAddDoc, onApplyRoster }) {
  const [unifyOpen, setUnifyOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const toast = useToast();
  // Добавление готовой группы пассажиров целиком в заказ (без дублей по неизменному ключу)
  const addGroup = (members) => { const r = paxMergeAppend(list, members); onApplyRoster && onApplyRoster(r.list); return r; };
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
          <div style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>
            <b style={{ color: 'var(--ink)' }}>Новый заказ.</b> Добавьте участников и их документы здесь — это нужно для выписки билетов и проверки виз.
          </div>
        </div>
      )}
      {isGroup && (
        <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="oc-svc-ic" style={{ background: 'var(--blue)' }}><Icon name="users" /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{list.length} пассажиров · Групповая поездка</div>
            <div style={{ fontSize: 13, color: errCount ? 'var(--amber)' : 'var(--green)', marginTop: 2 }}>
              Поимённый список: {list.length - errCount} без ошибок{errCount ? `, ${errCount} требуют проверки` : ''}
            </div>
          </div>
          <Button variant="secondary" size="sm" icon="checkCircle" onClick={() => toast(errCount ? (errCount + ' участник(ов) требуют проверки документов') : 'Список проверен — расхождений не найдено', errCount ? 'warn' : 'ok')}>Проверить список</Button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 14 }}>
        <Button variant="secondary" icon="users" onClick={() => setGroupsOpen(true)}>Группы пассажиров</Button>
        <Button variant="secondary" icon="idcard" onClick={() => setUnifyOpen(true)}>Унификация списка</Button>
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
        if (secs) return <div className="pax-groups">{secs.map((s) => <PaxGroupCard key={s.id} index={s.index} name={s.name} members={s.members} onPassport={onPassport} onEdit={onEdit} onAddDoc={onAddDoc} />)}</div>;
        return (
          <div className="table-card">
            <table className="tbl">
              <thead><tr><th>Участник</th><th>Тип</th><th>Документ</th><th>Дата рожд.</th><th>Телефон</th><th>Документы</th><th></th></tr></thead>{/* pax-table */}
              <tbody>
                {list.map((p, i) => (
                  <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onEdit && onEdit(p)}>
                    <td className="t-strong">{p.name} {p.lead && <span className="pill pill-blue" style={{ marginLeft: 6 }}>Лид</span>}</td>
                    <td>{p.role}</td><td><DocCell p={p} /></td><td>{p.dob || '—'}</td><td>{p.phone || '—'}</td>
                    <td><Pill tone={p.docStatus === 'check' ? 'amber' : 'green'}>{p.docStatus === 'check' ? 'Требует проверки' : 'Без ошибок'}</Pill></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                        items={[
                          { icon: 'idcard', label: 'Документы', onClick: () => onPassport(p.name) },
                          { icon: 'docs', label: 'Добавить документ', onClick: () => onAddDoc && onAddDoc(p) },
                          { icon: 'edit', label: 'Изменить данные', onClick: () => onEdit && onEdit(p) },
                          { sep: true }, { icon: 'trash', label: 'Удалить', danger: true },
                        ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
      {unifyOpen && <PaxUnifyPanel list={list} orderNo={orderNo} autoBind={orderAirline} onApplyRoster={onApplyRoster} onClose={() => setUnifyOpen(false)} />}
      {groupsOpen && <PaxGroupsDrawer current={list} companyId={companyId} companyName={companyName} onAddGroup={addGroup} onClose={() => setGroupsOpen(false)} />}
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

function ServiceListRow({ s, paxCount, isGroup, onOpen, orderNo, participants = [], selected, onSel }) {
  const toast = useToast();
  const k = SERVICE_KIND[s.kind] || { icon: 'briefcase', color: 'var(--blue)' };
  const cat = (SVC_FILTER_CHIPS.find((c) => c.kind === s.kind) || {}).label || s.kind;
  const pax = isGroup ? paxCount : (s.pax || paxCount);
  const [sendOpen, setSendOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const initCard = (s.status === 'Выписано' || s.status === 'Подтверждено') ? 'issued' : (s.cardStatus || 'created');
  const [cardSt, setCardSt] = useState(initCard);
  const cst = cardStatus(cardSt);
  // карточка услуги: объединяем подбор (svcOffer) с полями заказа, чтобы был предпросмотр и расчёты
  const cardItem = s.svcOffer ? { ...s.svcOffer, title: s.title, sub: s.sub, kind: s.kind, status: s.status, date: s.date, order: orderNo, calc: s.calc } : { ...s, order: orderNo };
  const onSent = (ch) => {
    setCardSt('sent');
    toast('Карточка услуги отправлена клиенту по каналу «' + ch + '»', 'ok');
    setTimeout(() => setCardSt('delivered'), 1000);
    setTimeout(() => setCardSt('viewed'), 2200);
  };
  return (
    <div className={'oc-svc-row' + (selected ? ' sel' : '')}>
      {onSel && <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', paddingRight: 4 }}><Checkbox on={!!selected} onChange={onSel} /></span>}
      <span className="ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
      <div className="body" onClick={() => onOpen(s)}>
        <div className="cat">{cat}</div>
        <div className="ttl">{s.title}</div>
        <div className="sub">{s.date}{s.supplier ? ' · ' + s.supplier : ''}</div>
      </div>
      <div className="mcol"><span className="l">Пассажиры</span><span className="v">{pax} {s.kind === 'Гостиница' ? 'номеров' : 'человек'}</span></div>
      <div className="mcol"><span className="l">Стоимость</span><span className="v">{ocMoney(svcCalc(s).total, s.currency)}</span></div>
      <div className="mcol"><span className="l">Статус</span><Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill></div>
      <div className="mcol"><span className="l">Карточка</span><Pill tone={cst.tone}>{cst.label}</Pill></div>
      <Button variant="secondary" size="sm" icon="send" onClick={() => setSendOpen(true)}>Клиенту</Button>
      <Button variant="secondary" size="sm" onClick={() => onOpen(s)}>Детали</Button>
      <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
        items={[{ icon: 'eye', label: 'Открыть', onClick: () => onOpen(s) }, { icon: 'send', label: 'Отправить клиенту', onClick: () => setSendOpen(true) }, { icon: 'clock', label: 'История карточки', onClick: () => setHistOpen(true) }, { sep: true }, { icon: 'trash', label: 'Удалить', danger: true }]} />
      {sendOpen && <ServiceCardSendPanel item={cardItem} kind={s.kind} participants={participants} orderNo={orderNo} currency={s.currency} serviceId={s.id} onSent={onSent} onClose={() => setSendOpen(false)} />}
      {histOpen && <ServiceCardHistoryDrawer orderNo={orderNo} serviceId={s.id} title={s.title} onClose={() => setHistOpen(false)} />}
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

/* ====================================================================
   КЕЙС ИЗМЕНЕНИЯ ПО ЗАКАЗУ (запрос клиента) — постоянная сущность в заказе.
   При отмене/сдвиге рейса вся затронутая цепочка фиксируется здесь со
   статусом обработки по каждой услуге: API-услуги проверяются авто-сверкой,
   локальные — запросом поставщику. Письмо клиенту — часть кейса, всегда под
   рукой для корректировок (авто/ручной). Всё пишется в историю кейса.
   ==================================================================== */
function OrderChangeCase({ orderNo, services, participants }) {
  const toast = useToast();
  const [cs, setCs] = useState(() => getChangeCase(orderNo));
  const [trigger, setTrigger] = useState(CASE_TRIGGERS[0]);
  const [letterOpen, setLetterOpen] = useState(false);
  const [openLog, setOpenLog] = useState(null);
  const [showHist, setShowHist] = useState(false);
  const [picker, setPicker] = useState(null); // ручная выборка альтернатив по услуге: { i, opts:[], sel:Set }

  const flight = (services || []).find((s) => normKind(s.kind) === 'Авиа');
  const triggerTitle = flight ? (flight.title || flight.main) : 'Рейс заказа';
  const commit = (next) => { ORDER_CHANGE_CASES[orderNo] = next; setCs({ ...next }); };
  const logSvc = (base, i, text, patch) => {
    const t = caseNow();
    const svcs = base.services.map((s, idx) => idx === i ? { ...s, ...patch, log: [...s.log, { t, text }] } : s);
    return { ...base, services: svcs, history: [...base.history, { t, text: svcs[i].kind + ' · ' + text }] };
  };

  const openCase = () => { const c = createChangeCase(orderNo, trigger, triggerTitle, 'Авиа'); setCs({ ...c }); toast('Кейс изменения создан и закреплён за заказом', 'ok'); };
  const checkDates = (i) => {
    commit(logSvc(cs, i, 'Запущена авто-сверка новых дат по API', { status: 'checking' }));
    toast('Сверка дат по API…', 'info');
    setTimeout(() => {
      const cur = getChangeCase(orderNo); if (!cur) return;
      const nk = normKind(cur.services[i].kind);
      const noRoom = nk === 'Гостиница' || nk === 'Гостиницы';
      commit(logSvc(cur, i, noRoom ? 'Номер на новые даты недоступен — требуется альтернатива' : 'Новые даты подтверждены поставщиком', { status: noRoom ? 'need_alt' : 'dates_ok' }));
    }, 1000);
  };
  const sendRequest = (i) => {
    commit(logSvc(cs, i, 'Автоматический запрос отправлен локальному поставщику', { status: 'requested' }));
    toast('Запрос перевозчику отправлен', 'ok');
    setTimeout(() => { const cur = getChangeCase(orderNo); if (cur) commit(logSvc(cur, i, 'Поставщик получил запрос — ожидаем подтверждение', { status: 'awaiting' })); }, 1300);
  };
  const setSvcStatus = (i, status, text) => commit(logSvc(cs, i, text, { status }));

  // ---- Единый механизм подбора: авто-поиск + ручная выборка альтернатив, та же связка цепочек ----
  // Открыть панель подбора по услуге (сохраняем уже зафиксированные варианты как выбранные).
  const openPicker = (i) => {
    const cur = getChangeCase(orderNo);
    const existing = cur.services[i].alts || [];
    setPicker({ i, opts: existing.slice(), sel: new Set(existing.map((a) => a.id)) });
    setOpenLog(null);
  };
  // Авто-поиск близких вариантов — досыпаем в список и отмечаем (не затирая ручные).
  const pickerAuto = () => setPicker((p) => {
    if (!p) return p;
    const cur = getChangeCase(orderNo);
    const auto = smartAlternatives({ title: cur.services[p.i].title }, cur.services[p.i].kind);
    const opts = p.opts.slice(); const sel = new Set(p.sel);
    auto.forEach((a) => { if (!opts.some((o) => o.id === a.id)) opts.push(a); sel.add(a.id); });
    return { ...p, opts, sel };
  });
  const pickerToggle = (id) => setPicker((p) => { const sel = new Set(p.sel); sel.has(id) ? sel.delete(id) : sel.add(id); return { ...p, sel }; });
  const pickerAddManual = (v) => setPicker((p) => {
    const alt = { id: 'man-' + Math.random().toString(36).slice(2, 7), manual: true, ...v };
    const sel = new Set(p.sel); sel.add(alt.id);
    return { ...p, opts: [...p.opts, alt], sel };
  });
  const pickerRemoveManual = (id) => setPicker((p) => { const sel = new Set(p.sel); sel.delete(id); return { ...p, opts: p.opts.filter((o) => o.id !== id), sel }; });
  const confirmPicker = () => {
    const p = picker; if (!p) return;
    const chosen = p.opts.filter((o) => p.sel.has(o.id));
    if (!chosen.length) { toast('Выберите вариант из авто-подбора или добавьте свой вручную', 'warn'); return; }
    const cur = getChangeCase(orderNo);
    const manual = chosen.some((c) => c.manual);
    const head = chosen.length > 1 ? 'Подобрано альтернатив: ' + chosen.length : 'Подобрана альтернатива: ' + chosen[0].title;
    commit(logSvc(cur, p.i, head + (manual ? ' · ручная выборка оператором' : ''), { status: 'resolved', alts: chosen }));
    setPicker(null);
    toast('Альтернатива зафиксирована в кейсе' + (manual ? ' (включая ручной выбор)' : ''), 'ok');
  };
  const onLetterSent = (channels) => {
    const cur = getChangeCase(orderNo); if (!cur) return;
    const v = cur.letters.length + 1; const t = caseNow();
    commit({ ...cur, letters: [...cur.letters, { v, sentAt: t, channels }], history: [...cur.history, { t, text: 'Письмо клиенту отправлено (v' + v + ') · ' + channels }] });
  };

  // ---- нет кейса: предложить зарегистрировать изменение ----
  if (!cs) {
    return (
      <div className="card card-pad" style={{ border: '1px dashed var(--amber)', background: 'var(--surface-2)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--amber)' }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Изменение по рейсу?</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Зарегистрируйте кейс — система зафиксирует затронутую цепочку и проведёт по каждой услуге сверку/запрос.</div>
          </div>
          <Select options={CASE_TRIGGERS} value={trigger} onChange={(e) => setTrigger(e.target.value)} style={{ width: 'auto', minWidth: 190 }} />
          <Button icon="refund" onClick={openCase}>Зарегистрировать изменение</Button>
        </div>
      </div>
    );
  }

  const prog = caseProgress(cs);
  const triggerItem = flight || { title: cs.triggerTitle, main: cs.triggerTitle, kind: 'Авиа', currency: 'USD', id: 'trig' };
  return (
    <div className="card card-pad" style={{ border: '1px solid var(--amber)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <Icon name="refund" style={{ width: 18, height: 18, color: 'var(--amber)' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>Кейс изменения {cs.id}</span>
        <Pill tone="amber">{cs.trigger}</Pill>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: prog.pending ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>
          {prog.pending ? 'В работе: ' + prog.done + '/' + prog.total + ' услуг обработано' : 'Все услуги обработаны (' + prog.total + ')'}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>{cs.triggerTitle} · создан {cs.created} · закреплён за заказом № {orderNo}</div>

      {/* Затронутая цепочка — статус и действия по каждой услуге */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cs.services.map((s, i) => {
          const st = CASE_SVC_STATUS[s.status] || CASE_SVC_STATUS.idle;
          const logOpen = openLog === i;
          return (
            <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '11px 13px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="oc-svc-ic" style={{ background: (SERVICE_KIND[s.kind] || {}).color || 'var(--blue)', width: 34, height: 34 }}><Icon name={(SERVICE_KIND[s.kind] || {}).icon || 'briefcase'} /></span>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{s.kind}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.title}</div>
                </div>
                <Pill tone={s.channel === 'api' ? 'blue' : 'gray'}><Icon name={s.channel === 'api' ? 'api' : 'contacts'} style={{ width: 12, height: 12, verticalAlign: -2 }} /> {s.channel === 'api' ? 'API' : 'Локальный'}</Pill>
                <Pill tone={st.tone}>{st.label}</Pill>
              </div>
              {/* действия по услуге в зависимости от канала и статуса */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
                {s.channel === 'api' && (s.status === 'idle' || s.status === 'checking') && <Button size="sm" variant="secondary" icon="zap" disabled={s.status === 'checking'} onClick={() => checkDates(i)}>{s.status === 'checking' ? 'Сверка…' : 'Сверить новые даты'}</Button>}
                {s.channel === 'api' && s.status === 'need_alt' && <Button size="sm" icon="refund" onClick={() => openPicker(i)}>Подобрать альтернативу</Button>}
                {s.channel === 'local' && s.status === 'idle' && <Button size="sm" variant="secondary" icon="send" onClick={() => sendRequest(i)}>Отправить запрос перевозчику</Button>}
                {s.channel === 'local' && s.status === 'requested' && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Запрос отправлен, ожидаем ответ поставщика…</span>}
                {s.channel === 'local' && s.status === 'awaiting' && <><Button size="sm" variant="secondary" icon="check" onClick={() => setSvcStatus(i, 'confirmed', 'Поставщик подтвердил новые условия')}>Подтверждено</Button><Button size="sm" variant="secondary" icon="x" onClick={() => setSvcStatus(i, 'declined', 'Поставщик отклонил — нужна альтернатива')}>Отклонено</Button></>}
                {s.channel === 'local' && s.status === 'declined' && <Button size="sm" icon="refund" onClick={() => openPicker(i)}>Подобрать альтернативу</Button>}
                {s.status === 'resolved' && picker?.i !== i && <Button size="sm" variant="secondary" icon="edit" onClick={() => openPicker(i)}>Скорректировать подбор</Button>}
                {st.done && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="checkCircle" style={{ width: 14, height: 14 }} />Готово</span>}
                <div style={{ flex: 1 }} />
                <button type="button" onClick={() => setOpenLog(logOpen ? null : i)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Лог услуги<Icon name={logOpen ? 'chevUp' : 'chevDown'} style={{ width: 13, height: 13 }} /></button>
              </div>
              {s.alts && s.alts.length > 0 && picker?.i !== i && (
                <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
                  {s.alts.map((a) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '6px 9px', borderRadius: 8, background: 'var(--blue-soft)' }}>
                      <Icon name="checkCircle" style={{ width: 13, height: 13, color: 'var(--blue)' }} />
                      <span style={{ color: 'var(--ink)' }}>{a.title}</span>
                      {a.manual && <Pill tone="gray">вручную</Pill>}
                      <span style={{ flex: 1 }} />
                      <span style={{ color: 'var(--muted)' }}>{a.meta}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Панель подбора: авто-поиск + ручная выборка вариантов — единый механизм */}
              {picker?.i === i && (
                <div style={{ marginTop: 10, border: '1px solid var(--line)', borderRadius: 10, padding: 12, background: 'var(--surface-2)', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>Подбор альтернативы · {s.kind}</span>
                    <div style={{ flex: 1 }} />
                    <Button size="sm" variant="secondary" icon="zap" onClick={pickerAuto}>{picker.opts.some((o) => !o.manual) ? 'Обновить авто-подбор' : 'Подобрать автоматически'}</Button>
                  </div>
                  {picker.opts.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Нажмите «Подобрать автоматически» — система предложит близкие варианты; либо добавьте конкретный вариант вручную ниже.</div>}
                  {picker.opts.map((o) => {
                    const on = picker.sel.has(o.id);
                    return (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 8, border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'), background: on ? 'var(--blue-soft)' : '#fff' }}>
                        <Checkbox on={on} onChange={() => pickerToggle(o.id)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{o.title}{o.manual && <span style={{ marginLeft: 6 }}><Pill tone="gray">вручную</Pill></span>}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{o.meta}</div>
                        </div>
                        {o.delta && o.delta !== '=' && <span style={{ fontSize: 12, fontWeight: 600, color: /^[−-]/.test(o.delta) ? 'var(--green)' : 'var(--amber)' }}>{o.delta}</span>}
                        {o.manual && <button type="button" onClick={() => pickerRemoveManual(o.id)} title="Удалить" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-2)', padding: 4 }}><Icon name="x" style={{ width: 14, height: 14 }} /></button>}
                      </div>
                    );
                  })}
                  <ManualAltForm compact onAdd={pickerAddManual} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Выбрано: {picker.sel.size}</span>
                    <div style={{ flex: 1 }} />
                    <Button size="sm" variant="secondary" onClick={() => setPicker(null)}>Отмена</Button>
                    <Button size="sm" icon="check" disabled={picker.sel.size === 0} onClick={confirmPicker}>Зафиксировать выбор</Button>
                  </div>
                </div>
              )}
              {logOpen && (
                <div style={{ marginTop: 8, borderTop: '1px dashed var(--line)', paddingTop: 8, display: 'grid', gap: 4 }}>
                  {s.log.map((l, li) => <div key={li} style={{ fontSize: 12, color: 'var(--muted)' }}><span style={{ color: 'var(--muted-2)' }}>{l.t}</span> — {l.text}</div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Письмо клиенту — часть кейса: всегда можно вернуться и скорректировать */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <Button variant="secondary" icon="send" onClick={() => setLetterOpen(true)}>{cs.letters.length ? 'Открыть письмо · корректировать' : 'Письмо клиенту'}</Button>
        {cs.letters.length > 0 && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Отправлено версий: {cs.letters.length} · последняя {cs.letters[cs.letters.length - 1].sentAt} ({cs.letters[cs.letters.length - 1].channels})</span>}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => setShowHist((v) => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>История кейса<Icon name={showHist ? 'chevUp' : 'chevDown'} style={{ width: 14, height: 14 }} /></button>
      </div>
      {showHist && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10, display: 'grid', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
          {cs.history.slice().reverse().map((h, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--body)' }}><span style={{ color: 'var(--muted-2)', marginRight: 6 }}>{h.t}</span>{h.text}</div>)}
        </div>
      )}

      {letterOpen && <ServiceCardSendPanel item={triggerItem} kind="Авиа" participants={participants} orderNo={orderNo} currency={triggerItem.currency || 'USD'} serviceId={triggerItem.id} onSent={onLetterSent} onClose={() => setLetterOpen(false)} />}
    </div>
  );
}

function TabServices({ orderNo, services, participants, requestType, onOpenAvia, onOpenOther, onOpenPicker, onAssembleKP, onExportToChat }) {
  const [filter, setFilter] = useState(null);
  const [selMode, setSelMode] = useState(false);
  const [sel, setSel] = useState(() => new Set());
  const isGroup = requestType === 'Групповая';
  const counts = {};
  services.forEach((s) => { counts[s.kind] = (counts[s.kind] || 0) + 1; });
  const shown = filter ? services.filter((s) => s.kind === filter) : services;
  const openItem = (s) => (s.kind === 'Авиа' ? onOpenAvia(s) : onOpenOther(s));
  const toggleSel = (id) => setSel((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const assemble = () => { const chosen = services.filter((s) => sel.has(s.id)); onAssembleKP && onAssembleKP(chosen); setSelMode(false); setSel(new Set()); };
  // Свободная выгрузка подобранных услуг в чат — без формирования КП (ТЗ-2 п.10)
  const exportChat = () => { const chosen = services.filter((s) => sel.has(s.id)); onExportToChat && onExportToChat(chosen); setSelMode(false); setSel(new Set()); };

  return (
    <div className="fade-in">
      {/* Кейс изменения по заказу — фиксирует затронутую цепочку при отмене/сдвиге рейса */}
      <OrderChangeCase orderNo={orderNo} services={services} participants={participants} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h3 className="card-title" style={{ fontSize: 18 }}>Добавленные услуги</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!selMode && <Button variant="secondary" icon="check" onClick={() => setSelMode(true)}>Выбрать услуги</Button>}
          {selMode && <Button variant="secondary" onClick={() => { setSelMode(false); setSel(new Set()); }}>Отмена</Button>}
          {selMode && <Button variant="secondary" icon="chat" disabled={sel.size === 0} onClick={exportChat}>Выгрузить в чат ({sel.size})</Button>}
          {selMode && <Button icon="template" disabled={sel.size === 0} onClick={assemble}>Собрать КП ({sel.size})</Button>}
          <Button icon="plus" onClick={onOpenPicker}>Добавить услугу</Button>
        </div>
      </div>
      {selMode && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" style={{ width: 16, height: 16 }} />Отметьте услуги — их можно свободно выгрузить в чат клиенту или объединить в коммерческое предложение.</div>}

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
          {shown.map((s) => <ServiceListRow key={s.id} s={s} paxCount={participants.length} isGroup={isGroup} onOpen={openItem} orderNo={orderNo} participants={participants} selected={sel.has(s.id)} onSel={selMode ? () => toggleSel(s.id) : null} />)}
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
  { kind: 'Аэроэкспресс', label: 'Аэроэкспресс', icon: 'zap', img: 'assets/Aeroexpress_logo.svg.png', routeKey: 'aero' },
  { kind: 'Бизнес-зал', label: 'Бизнес-залы', icon: 'lounge', routeKey: 'lounge' },
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
  const selCount = flt.stops.length + flt.air.length + flt.sup.length + (flt.bagOnly ? 1 : 0) + (flt.refundOnly ? 1 : 0) + (flt.flightNo && flt.flightNo.trim() ? 1 : 0) + ((flt.priceMax != null && flt.priceMax < bounds.max) ? 1 : 0);
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры{selCount > 0 && <span className="flt-count">{selCount}</span>}</span>
        <button className="hp-reset" onClick={() => setFlt({ stops: [], air: [], sup: [], bagOnly: false, refundOnly: false, priceMax: bounds.max, flightNo: '' })}>Очистить</button>
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

/* horizontal flight «scale bar»: each segment carries its flight number + duration over the line,
   the connection point shows «Пересадка Xч» above and the via-airport below (как у Aviasales/Tutu). */
function FlightScaleBar({ leg }) {
  const segs = legSegments(leg);
  const lays = leg.layovers || [];
  return (
    <div className="fsb">
      <div className="fsb-track">
        {segs.map((s, i) => (
          <React.Fragment key={i}>
            <div className="fsb-seg"><span className="fsb-flno">{s.flightNo} · {s.dur}</span></div>
            {i < segs.length - 1 && (
              <div className="fsb-stop">
                <span className="fsb-lay">Пересадка {(lays[i] && lays[i].dur) || ''}</span>
                <span className="fsb-dot" />
                <span className="fsb-via">{(lays[i] && lays[i].at) || s.to}</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className={'fsb-bot ' + (leg.stops ? 'via' : 'direct')}>{leg.dur} · {leg.stops ? (leg.stops === 1 ? '1 пересадка' : leg.stops + ' пересадки') : 'прямой'}</div>
    </div>
  );
}

/* unified supplier caption — same look across all services (авиа / отели / ЖД): «поставщики
   разные, подпись одна» (ТЗ #8) */
function SupplierTag({ name }) {
  return <div className="svc-supplier"><Icon name="api" style={{ width: 12, height: 12 }} />{name}</div>;
}

function AviaResultRow({ opt, onView, embedded }) {
  const leg = opt.leg;
  return (
    <div className={'ap-flight avia-result' + (embedded ? ' embedded' : '')} onClick={!embedded && onView ? onView : undefined}>
      <AirlineLogo code={opt.airline} size="sm" />
      <div className="ap-fl-time">{leg.dep}<div className="ap">{leg.from}</div></div>
      <FlightScaleBar leg={leg} />
      <div className="ap-fl-time">{leg.arr}<div className="ap">{leg.to}</div></div>
      <div className="ap-fl-pr">
        <div className="v">{money(opt.price, 'USD')}</div>
        <div className="c">{AIRLINES[opt.airline].name}</div>
        {opt.supplier && <SupplierTag name={opt.supplier} />}
      </div>
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
  const total = paxTotal(pax);
  const plural = (n) => n === 1 ? 'пассажир' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'пассажира' : 'пассажиров');

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
    <StackPanel title="Пассажиры и класс" width="min(620px,95vw)" onClose={onClose}
      footer={<Button style={{ width: '100%' }} icon="check" onClick={onClose}>Готово · {total} {plural(total)}</Button>}>
      {/* единый компонент выбора пассажиров и класса (как на макете), общий для всех авиапоисков */}
      <PaxClassPicker pax={pax} setPax={(v) => set({ pax: v })} cabin={p.cabin} setCabin={(v) => set({ cabin: v })}
        options={p} setOptions={(patch) => set(patch)} />

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
function FlightFarePanel({ route, paxCount, cabin, pax = [], onClose, onAdd, onPerPax }) {
  // booking class first, then the fare grid for that class — exactly like the full order-creation
  // flow (клиент: «в выборке тарифов отсутствует выборка классов»).
  const [clsCode, setClsCode] = useState('Y');
  const [infoFare, setInfoFare] = useState(null);   // тариф, открытый в боковом окне «О тарифе» (ТЗ #1)
  // доп. услуги авиакомпании (багаж / места / питание / страховка) — добавляются вместе с перелётом
  const [extras, setExtras] = useState({ seats: {}, baggage: {}, meal: {}, insurance: {}, special: {}, comfort: {} });
  const [extrasOpen, setExtrasOpen] = useState(false);
  const extrasCount = Object.values(extras.seats).filter(Boolean).length
    + Object.values(extras.baggage).filter((v) => v && v !== 'none').length
    + Object.values(extras.meal).filter((v) => v && v !== 'standard' && v !== 'none').length
    + Object.values(extras.insurance).filter((v) => v && v !== 'none').length
    + Object.keys(extras.comfort).filter((kk) => extras.comfort[kk]).length
    + Object.keys(extras.special).filter((kk) => extras.special[kk]).length;
  const extrasPax = pax && pax.length ? pax : [{ name: 'Пассажир 1', role: 'Взрослый' }];
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
    <>
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
              <div className="fc-name">{f.name}
                <button type="button" className="fc-info" title="О тарифе" onClick={(e) => { e.stopPropagation(); setInfoFare(f); }}><Icon name="alertCircle" style={{ width: 16, height: 16 }} /></button>
              </div>
              <div className="fc-price">{u ? '+ ' + money(u, 'USD') : 'без доплаты'}<small>{u ? ' / пассажир' : ''}</small></div>
              {f.features.map((ft, k) => (
                <div key={k} className={'fare-feat ' + (ft.ok ? 'ok' : 'no')}><Icon name={ft.ok ? 'check' : 'x'} />{ft.text}</div>
              ))}
              {f.rules && (
                <div className="fare-rules">
                  <div className="fare-rules-h">Правила тарифа</div>
                  {f.rules.map((r, k) => (<div key={k} className="fare-rule"><span className="rk">{r.k}</span><span className={'rv ' + (r.tone || '')}>{r.v}</span></div>))}
                </div>
              )}
              {f.desc && (
                <button type="button" className="fare-info-btn" onClick={(e) => { e.stopPropagation(); setInfoFare(f); }}>
                  <Icon name="alertCircle" style={{ width: 14, height: 14 }} />О тарифе
                </button>
              )}
              <Button variant="secondary" size="sm" className="fare-pick-btn" icon={sel ? 'check' : undefined}
                onClick={(e) => { e.stopPropagation(); setFareId(f.id); }}>{sel ? 'Выбран' : 'Выбрать тариф'}</Button>
            </div>
          );
        })}
      </div>

      {/* доп. услуги авиакомпании — багаж, места, питание, страховка (запрос клиента: где добавить доп.услуги по авиакомпаниям) */}
      <div className="ap-sc-title" style={{ marginTop: 18 }}>3. Доп. услуги и места</div>
      <div className="ap-list-row ap-sum-row" style={{ cursor: 'pointer' }} onClick={() => setExtrasOpen(true)}>
        <span className="ic"><Icon name="briefcase" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t">Багаж, выбор места, питание, страховка</div>
          <div className="s">{extrasCount ? 'Выбрано доп. услуг: ' + extrasCount : 'Доп. услуги авиакомпании — по желанию'}</div>
        </div>
        <span className="pr">{extrasCount ? extrasCount + ' шт.' : 'Добавить'}</span>
        <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)', flex: '0 0 18px' }} />
      </div>
    </StackPanel>
    {infoFare && <FareInfoPanel fare={infoFare} onClose={() => setInfoFare(null)} onSelect={() => { setFareId(infoFare.id); setInfoFare(null); }} />}
    {extrasOpen && (
      <StackPanel title="Дополнительные услуги" width="min(1040px,96vw)" onClose={() => setExtrasOpen(false)}
        footer={<>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setExtrasOpen(false)}>Отмена</Button>
          <Button icon="check" style={{ flex: 2 }} onClick={() => setExtrasOpen(false)}>Применить{extrasCount ? ' · выбрано ' + extrasCount : ''}</Button>
        </>}>
        <ExtrasTabs pax={extrasPax} state={extras} set={setExtras} embedded />
      </StackPanel>
    )}
    </>
  );
}

/* «О тарифе» — детальная информация в боковом окне внахлёст над панелью тарифов (ТЗ #1) */
function FareInfoPanel({ fare, onClose, onSelect }) {
  const u = Math.round((fare.delta || 0) / RUB_PER_USD);
  return (
    <StackPanel title={'Тариф · ' + fare.name} width="min(540px,92vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Закрыть</Button>
        <Button style={{ flex: 1 }} icon="check" onClick={onSelect}>Выбрать этот тариф</Button>
      </>}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>{u ? '+ ' + money(u, 'USD') : 'без доплаты'}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>{u ? ' / пассажир' : ''}</span></div>
      {fare.desc && <p style={{ color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 8px' }}>{fare.desc}</p>}
      <div className="ap-sc-title" style={{ marginTop: 14 }}>Что включено</div>
      {fare.features.map((ft, k) => (<div key={k} className={'fare-feat ' + (ft.ok ? 'ok' : 'no')}><Icon name={ft.ok ? 'check' : 'x'} />{ft.text}</div>))}
      {fare.rules && <>
        <div className="ap-sc-title" style={{ marginTop: 16 }}>Правила тарифа</div>
        <div className="kv">{fare.rules.map((r, k) => (<div className="kv-row" key={k}><span className="k">{r.k}</span><span className={'v fare-rule-v ' + (r.tone || '')}>{r.v}</span></div>))}</div>
      </>}
    </StackPanel>
  );
}

/* Компактный табличный вид выдачи рейсов (запрос клиента: «отображение рейсов списком для более
   удобного поиска») — плотная сортируемая таблица, как в B2B-системах: вылет / прилёт / перевозчик /
   рейс / в пути / пересадки / поставщик / стоимость. Клик по строке открывает тарифы. */
function aviaDepMin(t) { const m = (t || '').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
function AviaListTable({ rows }) {
  const { sort, onSort, apply } = useSort({ col: 'price', dir: 'asc' });
  const sorted = apply(rows, { dep: (r) => aviaDepMin(r.leg.dep), arr: (r) => aviaDepMin(r.leg.arr), dur: (r) => durMin(r.leg.dur), stops: (r) => r.leg.stops || 0, price: (r) => r.price });
  return (
    <div className="table-card avia-list" style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead><tr>
          <Th label="Вылет" col="dep" sort={sort} onSort={onSort} />
          <Th label="Прилёт" col="arr" sort={sort} onSort={onSort} />
          <th>Перевозчик</th>
          <th>Рейс</th>
          <Th label="В пути" col="dur" sort={sort} onSort={onSort} />
          <Th label="Пересадки" col="stops" sort={sort} onSort={onSort} />
          <th>Поставщик</th>
          <Th label="Стоимость" col="price" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
          <th></th>
        </tr></thead>
        <tbody>
          {sorted.map((r) => {
            const leg = r.leg; const air = AIRLINES[r.airline] || { name: r.airline };
            return (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={r.view}>
                <td><span style={{ fontWeight: 700 }}>{leg.dep}</span> <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>{leg.from}</span></td>
                <td><span style={{ fontWeight: 700 }}>{leg.arr}</span> <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>{leg.to}</span>{r.roundtrip && <span style={{ color: 'var(--blue)', fontSize: 12 }}> · +обр</span>}</td>
                <td><span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}><AirlineLogo code={r.airline} size="sm" />{air.name}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.flightNo || '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{leg.dur}</td>
                <td>{leg.stops ? (leg.stops === 1 ? '1 пересадка' : leg.stops + ' пересадки') : <span style={{ color: 'var(--green)' }}>Прямой</span>}</td>
                <td style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{r.supplier}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(r.price, 'USD')}</td>
                <td onClick={(e) => e.stopPropagation()}><Button size="sm" variant="secondary" iconRight="chevRight" onClick={r.view}>Тарифы</Button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AviaSearchPanel({ params, setParams, paxCount, participants = [], isGroup, onAdd, onAddPerPax }) {
  const toast = useToast();
  const p = params;
  const set = (patch) => setParams({ ...p, ...patch });
  const swap = () => set({ from: p.to, to: p.from });
  const runSearch = () => toast('Поиск обновлён по подключённым поставщикам', 'info');
  const aviaBounds = aviaPriceBounds();
  const [flt, setFlt] = useState({ stops: [], air: [], sup: [], bagOnly: false, refundOnly: false, priceMax: aviaBounds.max, flightNo: '' });
  const [visible, setVisible] = useState(6);
  const [view, setView] = useState('cards'); // cards | list — отображение выдачи рейсов
  const [paxPanel, setPaxPanel] = useState(false);
  const [fareRoute, setFareRoute] = useState(null);   // route awaiting fare selection → opens FlightFarePanel
  const groups = isGroup ? AVIA_GROUPS_SEED : null;
  const seats = participants.length || paxTotal(p.pax);
  const plural = (n) => n === 1 ? 'пассажир' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'пассажира' : 'пассажиров');

  // порядок по ТЗ #5: сначала «в одну сторону», затем «туда-обратно», затем «сложный маршрут»
  const TRIPS = [['ow', 'В одну сторону'], ['rt', 'Туда-обратно'], ['mc', 'Сложный маршрут']];

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

  // Плоский список строк для табличного вида — по текущему типу маршрута
  const listRows = p.trip === 'rt'
    ? rtCombos.map((c) => ({ id: c.id, airline: c.out.airline, leg: c.out.leg, flightNo: c.out.leg.flightNo, supplier: c.out.supplier, price: c.out.price + c.back.price, roundtrip: true, view: () => openFare({ legs: [c.out, c.back], total: c.out.price + c.back.price }) }))
    : p.trip === 'mc'
      ? (mcLegs.length ? [{ id: 'mc', airline: mcLegs[0].airline, leg: mcLegs[0].leg, flightNo: mcLegs[0].leg.flightNo, supplier: mcLegs[0].supplier, price: mcTotal, view: () => openFare({ legs: mcLegs, total: mcTotal }) }] : [])
      : outOpts.map((o) => ({ id: o.key, airline: o.airline, leg: o.leg, flightNo: o.leg.flightNo, supplier: o.supplier, price: o.price, view: () => openFare({ legs: [o], total: o.price }) }));

  const paxLabel = `${seats} ${plural(seats)} · ${p.cabin}`;
  const paxFieldNode = (
    <div className="av-field avia-pax-field" onClick={() => setPaxPanel(true)}>
      <span className="label">Пассажиры и класс</span>
      <div className="input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon name="users" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
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
            <Button icon="search" className="avia-find-btn" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
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
          <Button icon="search" className="avia-find-btn" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>Найдено {foundCount}</span>
        {/* переключатель вида выдачи: карточки / список */}
        <div className="avia-view-toggle">
          <button className={view === 'cards' ? 'on' : ''} title="Карточки" onClick={() => setView('cards')}><Icon name="grid" style={{ width: 16, height: 16 }} />Карточки</button>
          <button className={view === 'list' ? 'on' : ''} title="Список" onClick={() => setView('list')}><Icon name="orders" style={{ width: 16, height: 16 }} />Список</button>
        </div>
        {view === 'cards' && <div style={{ minWidth: 190 }}><Select options={[{ value: 'price', label: 'Сортировка: Цена' }]} value="price" onChange={() => {}} /></div>}
      </div>

      <div className="hp-layout">
        <AviaFilters flt={flt} setFlt={setFlt} bounds={aviaBounds} />
        <div style={{ minWidth: 0 }}>
          {view === 'list' ? (
            <div className="ap-route-section">
              <div className="ap-route-title">Рейсы списком — нажмите строку, чтобы открыть тарифы</div>
              <AviaListTable rows={listRows.slice(0, p.trip === 'mc' ? listRows.length : visible)} />
              {p.trip !== 'mc' && visible < listRows.length && (
                <button className="svcf-more" onClick={() => setVisible((v) => v + 10)}>
                  Показать ещё рейсы <Icon name="chevDown" style={{ width: 16, height: 16 }} />
                </button>
              )}
            </div>
          ) : (<>
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
              Показать ещё рейсы <Icon name="chevDown" style={{ width: 16, height: 16 }} />
            </button>
          )}
          </>)}
        </div>
      </div>

      {paxPanel && <AviaPaxPanel params={p} setParams={setParams} participants={participants} groups={groups} onClose={() => setPaxPanel(false)} />}
      {fareRoute && (
        <FlightFarePanel route={fareRoute} paxCount={seats} cabin={p.cabin} pax={participants}
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
            {c.img ? <img className="svcp-cattab-img" src={c.img} alt={c.label} /> : <Icon name={c.icon} />}{c.label}
          </button>
        ))}
      </div>
      {kind === 'Авиа' && <AviaSearchPanel params={aviaParams} setParams={setAviaParams} paxCount={paxCount}
        participants={participants || []} isGroup={isGroup} onAdd={onAddAvia} onAddPerPax={onAddAviaPerPax} />}
      {/* Гостиницы — полноценный модуль подбора с фильтром слева, выбором номера,
          составом гостей, групповым размещением и подтверждением бронирования */}
      {kind === 'Гостиница' && <HotelPicker participants={participants} group={isGroup} onApply={(offer) => onAddOther(offer, 'Гостиница')} onCancel={() => {}} />}
      {kind === 'ЖД' && <RailAddFlow participants={participants} groups={isGroup ? AVIA_GROUPS_SEED : null} onAdd={onAddOther} />}
      {kind === 'Аэроэкспресс' && <AeroAddFlow onAdd={onAddOther} />}
      {kind !== 'Авиа' && kind !== 'Гостиница' && kind !== 'ЖД' && kind !== 'Аэроэкспресс' && cat.routeKey && <ServiceAddFlow routeKey={cat.routeKey} onAdd={onAddOther} />}
      {kind !== 'Авиа' && kind !== 'Гостиница' && kind !== 'ЖД' && kind !== 'Аэроэкспресс' && !cat.routeKey && <QuickAddForm kind={kind} onAdd={onAddOther} />}
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

/* Финансовый блок заказа (ТЗ: «В каждом заказе отдельный блок Финансы»).
   Тянет данные из финмодуля (FIN_* глобальные) и связывает заказ ↔ контрагент ↔
   счета/платежи/документы/финоперации ↔ прибыль. */
function OrderFinanceBlock({ orderNo, order, services }) {
  const total = services.reduce((s, x) => { const t = svcCalc(x).total; return s + ((x.currency === 'RUB' || x.currency === '₽') ? t / 90 : t); }, 0);
  const cps = (typeof FIN_COUNTERPARTIES !== 'undefined') ? FIN_COUNTERPARTIES : [];
  const cp = cps.find((c) => c.type === 'client' && (c.name === order.client || order.client.includes(c.name) || c.name.includes(order.client)));
  const pays = ((typeof FIN_PAYMENTS !== 'undefined') ? FIN_PAYMENTS : []).filter((p) => p.order === orderNo);
  const ops = ((typeof FIN_OPS !== 'undefined') ? FIN_OPS : []).filter((o) => o.order === orderNo);
  const docs = ((typeof DOCS2 !== 'undefined') ? DOCS2 : []).filter((d) => d.order === orderNo && ['Счёт', 'Акт', 'Договор'].includes(d.type));
  const paid = ops.reduce((s, o) => s + (o.paid || 0), 0) || (cp ? cp.paid : 0);
  const debt = Math.max(0, Math.round(total) - paid);
  const profit = Math.round(total * 0.12);
  const free = cp && cp.limit ? Math.max(0, cp.limit - cp.used) : 0;
  const hasLimitBar = typeof CreditLimitBar !== 'undefined' && cp && cp.limit;
  const money = (typeof f$ === 'function') ? f$ : ((n) => ocMoney(n));
  return (
    <div className="card card-pad fade-in" style={{ marginBottom: 18, border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon name="finance" style={{ width: 18, height: 18, color: 'var(--green)' }} />
        <h3 className="card-title" style={{ fontSize: 16 }}>Финансы заказа</h3>
        <div style={{ flex: 1 }} />
        <Pill tone={debt > 0 ? 'amber' : 'green'}>{debt > 0 ? 'Есть задолженность' : 'Полностью оплачен'}</Pill>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {[['Стоимость заказа', money(total), null], ['Оплачено', money(paid), 'var(--green)'], ['Остаток', money(debt), debt > 0 ? 'var(--amber)' : 'var(--green)'], ['Прибыль по заказу', money(profit), 'var(--green)']].map(([l, v, c]) => (
          <div key={l} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c || 'var(--ink)' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '4px 0 6px' }}>Финансовые условия</div>
          <div className="kv-row" style={{ padding: '8px 0' }}><span className="k" style={{ fontSize: 13.5 }}>Схема работы</span><span className="v" style={{ fontSize: 13.5 }}>{cp ? cp.scheme : 'Предоплата'}</span></div>
          <div className="kv-row" style={{ padding: '8px 0' }}><span className="k" style={{ fontSize: 13.5 }}>Отсрочка</span><span className="v" style={{ fontSize: 13.5 }}>{cp && cp.deferralDays ? cp.deferralDays + ' дн. · ' + cp.deferralStart : '—'}</span></div>
          <div className="kv-row" style={{ padding: '8px 0' }}><span className="k" style={{ fontSize: 13.5 }}>Срок оплаты</span><span className="v" style={{ fontSize: 13.5 }}>{cp && cp.obligations[0] ? cp.obligations[0].due : '28.07.2026'}</span></div>
          <div className="kv-row" style={{ padding: '8px 0' }}><span className="k" style={{ fontSize: 13.5 }}>Кредитный лимит</span><span className="v" style={{ fontSize: 13.5 }}>{cp && cp.limit ? money(cp.limit) + ' · свободно ' + money(free) : 'не установлен'}</span></div>
          {hasLimitBar && <div style={{ marginTop: 8 }}><CreditLimitBar used={cp.used} limit={cp.limit} /></div>}
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '4px 0 6px' }}>Связанные документы и платежи</div>
          <div style={{ display: 'grid', gap: 5 }}>
            {docs.map((d) => <div key={d.no} style={{ fontSize: 12.5, color: 'var(--body)' }}><Icon name="finance" style={{ width: 12, height: 12, verticalAlign: -1, color: 'var(--muted-2)' }} /> {d.name} · <span style={{ color: 'var(--muted)' }}>{d.status}</span></div>)}
            {pays.map((p) => <div key={p.no} style={{ fontSize: 12.5, color: 'var(--body)' }}><Icon name="swap" style={{ width: 12, height: 12, verticalAlign: -1, color: 'var(--muted-2)' }} /> {p.no} · {p.dir === 'in' ? 'входящий' : 'исходящий'} {money(p.sum)} · <span style={{ color: 'var(--muted)' }}>{p.status}</span></div>)}
            {docs.length === 0 && pays.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Пока нет связанных документов/платежей.</div>}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '12px 0 6px' }}>История финансовых операций</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {ops.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Операций по заказу пока нет.</div>}
            {ops.map((o) => <div key={o.no} style={{ fontSize: 12, color: 'var(--body)' }}><span style={{ color: 'var(--muted-2)' }}>{o.date}</span> · {o.type} · {o.source} · <b>{money(o.paid || opPayable(o))}</b> · <span style={{ color: (FIN_OP_STATUS[o.status] === 'green') ? 'var(--green)' : 'var(--muted)' }}>{o.status}</span></div>)}
          </div>
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
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Последняя успешная: 14.06 · 12:30</div>
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
function OrderCard({ order, onBack, initTab, initSvc, initSvcSearch, fresh, onOpenChat }) {
  const toast = useToast();
  const [tab, setTab] = useState(initTab || (initSvcSearch ? 'services' : 'overview'));
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(order.status === 'Нет данных' ? 'Новое' : order.status);
  const [services, setServices] = useState(ORDER_SERVICES);
  const requestType = order.requestType;
  const [editOpen, setEditOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [participants, setParticipants] = useState(requestType === 'Групповая' ? GROUP_PAX : ORDER_PARTICIPANTS);
  useEffect(() => { setParticipants(requestType === 'Групповая' ? GROUP_PAX : ORDER_PARTICIPANTS); }, [order.no, requestType]);
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
  const [operator, setOperator] = useState(order.operator); // ответственный оператор (переназначаемый)
  const [reassignOpen, setReassignOpen] = useState(false);
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

  // Открыть карточку конкретной услуги (общее для клика по строке и для deep-link из чата/уведомления).
  const openAviaCard = (s) => { const match = AIR_SERVICES.find((a) => a.no === s.avia) || { no: s.avia || s.id, airline: (s.offer ? s.offer.airline : 'KC'), status: s.status, supplier: s.supplier, pax: 2, sum: s.sum, currency: s.currency, route: s.title, pnr: '—', ticket: '—', dep: s.date }; setActiveAvia(s.offer ? { ...match, offer: s.offer } : match); setSvcView('avia-card'); };
  const openOtherCard = (s) => { setActiveSvc(s.svcOffer ? { ...s.svcOffer, kind: s.kind, status: s.status, date: s.svcOffer.date || s.date, calc: s.calc, order: order.no } : { ...s, order: order.no }); setSvcView('svc-card'); };
  const openServiceCard = (s) => (s.kind === 'Авиа' ? openAviaCard(s) : openOtherCard(s));

  // modals
  const [passport, setPassport] = useState(null);
  const [paxOpen, setPaxOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [editPax, setEditPax] = useState(null);   // участник для корректировки (единая форма)
  const [docPax, setDocPax] = useState(null);      // участник для добавления документа (единая форма)

  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, [order.no]);
  // deep-link: switch to requested tab even if the card is already mounted (e.g. opened from a notification)
  useEffect(() => { if (initTab) setTab(initTab); }, [initTab, order.no]);
  // deep-link to a specific service: open its card (not the whole «Услуги» list) when a notification/chat
  // link points to one concrete service. Waits for the async load so the service list is ready.
  useEffect(() => {
    if (!initSvc || loading) return;
    const s = services.find((x) => x.id === initSvc);
    if (!s) return;
    setTab('services');
    openServiceCard(s);
  }, [initSvc, loading, order.no]);
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
    { key: 'responsibles', label: 'Ответственные', icon: 'users', count: orderResponsibles(order.no).length || null },
    { key: 'extras', label: 'Доп. услуги', icon: 'sparkles' },
    { key: 'offers', label: 'КП', icon: 'template', count: PROPOSALS.filter((p) => p.order === order.no).length, locked: stageIdx < 2 && !PROPOSALS.some((p) => p.order === order.no) },
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

  // Собрать КП из выбранных карточек услуг: создаём КП-контейнер и открываем раздел КП.
  const assembleKPFromCards = (chosen) => {
    if (!chosen || !chosen.length) { toast('Выберите хотя бы одну карточку', 'err'); return; }
    const uid = (p) => p + Math.random().toString(36).slice(2, 7);
    const items = chosen.map((s) => { const t = svcCalc(s).total || 0; return { id: uid('i'), kind: s.kind, title: s.title, sub: s.sub, cost: Math.round(t * 0.95), fee: Math.round(t * 0.05) }; });
    const np = { id: 'КП-' + (1060 + PROPOSALS.length), order: order.no, client: order.client, status: 'Черновик', currency: 'USD', validUntil: '25.06.2026', created: '15.06.2026', approvedVariant: null,
      variants: [{ id: uid('v'), name: 'Вариант A · из карточек', items }],
      history: [{ t: new Date().toLocaleString('ru-RU'), text: 'КП собрано из ' + items.length + ' карточек услуг заказа № ' + order.no, who: (CURRENT_USER && CURRENT_USER.name) || 'Оператор' }] };
    PROPOSALS.unshift(np);
    setSvcView(null); setTab('offers');
    toast('КП собрано из ' + items.length + ' карточек — открыт раздел «КП»', 'ok');
  };

  // Свободная выгрузка подобранных услуг прямо в чат клиенту — без формирования КП (ТЗ-2 п.10)
  const exportServicesToChat = (chosen) => {
    if (!chosen || !chosen.length) { toast('Выберите хотя бы одну услугу', 'err'); return; }
    const lines = chosen.map((s) => {
      const total = svcCalc(s).total || s.sum || 0;
      return '• ' + s.title + (s.sub ? ' (' + s.sub + ')' : '') + ' — ' + Math.round(total).toLocaleString('ru-RU') + ' ' + (s.currency || 'USD');
    });
    const text = 'Подобранные услуги по заказу № ' + order.no + ':\n' + lines.join('\n');
    const thread = getThreadForOrder(order);
    const now = new Date();
    const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    thread.messages = [...(thread.messages || []), { from: 'me', author: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор', text, time, read: false, kind: 'services' }];
    toast(chosen.length + ' услуг выгружено в чат клиенту', 'ok');
    onOpenChat && onOpenChat();
  };

  // --- inside the Services tab, a sub-flow (viewing an existing service, adding a new one, the
  // booking wizard) takes over the main column only — the tab strip and the right-hand aside
  // stay exactly where they are, matching the reference card. ---
  const renderServicesArea = () => {
    if (svcView === 'booking') return <BookingWizard order={order} services={services} draft={bookingDraft}
      onSaveDraft={setBookingDraft} onClose={() => setSvcView(null)}
      onComplete={() => { setStatus('Оплачено'); setStageIdx(4); setBookingDraft(null); }} />;
    if (svcView === 'avia-card') return <FlightCard svc={activeAvia} offer={activeAvia ? activeAvia.offer : null} onBack={() => setSvcView(null)} />;
    if (svcView === 'svc-card') return <SvcCard item={activeSvc} kind={activeSvc.kind} participants={participants} onBack={() => setSvcView(null)} />;
    if (svcView === 'add-service') return (
      <div className="fade-in">
        <BackRow label="К списку услуг" onBack={() => setSvcView(null)} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <h3 className="card-title" style={{ fontSize: 18 }}>Добавить услугу / Поиск</h3>
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
      onAssembleKP={assembleKPFromCards}
      onExportToChat={exportServicesToChat}
      onOpenAvia={openAviaCard}
      onOpenOther={openOtherCard} />;
  };

  const tabContent = () => {
    if (loading) return <AsyncBlock state="loading" skeletonRows={5} />;
    switch (tab) {
      case 'overview': return <TabOverview order={order} />;
      case 'clients': return <TabClients order={order} onOpenChat={onOpenChat} />;
      case 'participants': { const oco = (typeof COMPANIES_DB !== 'undefined') ? COMPANIES_DB.find((c) => c.name === order.client) : null; return <TabParticipants list={participants} isGroup={requestType === 'Групповая'} groups={requestType === 'Групповая' ? AVIA_GROUPS_SEED : null} fresh={fresh} orderNo={order.no} orderAirline={(services.find((s) => s.kind === 'Авиа') || {}).supplier} companyId={oco ? oco.id : null} companyName={oco ? oco.name : order.client} onPassport={setPassport} onAdd={() => setPaxOpen(true)} onEdit={(p) => setEditPax(p)} onAddDoc={(p) => setDocPax(p)} onApplyRoster={setParticipants} />; }
      case 'route': return <TabRoute services={services} />;
      case 'services': return renderServicesArea();
      case 'offers': return <KPModule order={order} services={services} participants={participants}
        onApprove={() => { setStageIdx((i) => Math.max(i, 2)); toast('Созданы финансовые записи и задачи по выпуску документов', 'ok'); }} />;
      case 'responsibles': return <OrderResponsiblesTab order={order} />;
      case 'extras': return <DynamicExtrasPanel order={order} />;
      case 'documents': return <DocCenter scopeOrder={order.no} participants={participants} />;
      case 'finance': return (<><OrderFinanceBlock orderNo={order.no} order={order} services={services} /><FinanceRegistry scopeOrder={order.no} /></>);
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
    { icon: 'users', label: 'Переназначить оператора', onClick: () => setReassignOpen(true) },
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
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
              onOpenTasks={() => toast('Список задач по заказу', 'info')}
              operator={operator} onReassign={() => setReassignOpen(true)} />
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
      <ReassignOperatorDrawer open={reassignOpen} current={operator} onClose={() => setReassignOpen(false)}
        onPick={(op) => { setOperator(op); setReassignOpen(false); toast('Ответственный оператор: ' + op, 'ok'); }} />
      {paxOpen && <PassengerDrawer open={paxOpen} onClose={() => setPaxOpen(false)}
        onAdd={(client) => setParticipants((l) => [...l, { name: client.name, role: client.role || 'Взрослый', doc: client.doc, dob: client.dob, phone: client.phone, docStatus: 'ok', documents: client.documents || [] }])} />}
      {feeOpen && <FeeDrawer open={feeOpen} onClose={() => setFeeOpen(false)} />}
      {passport && <PassportModal passenger={passport} participants={participants} onClose={() => setPassport(null)}
        onAddDoc={(p) => { setPassport(null); setDocPax(p || { name: passport }); }} />}
      {/* Единая форма корректировки участника (ТЗ п.5) */}
      <UnifiedPersonDrawer open={!!editPax} kind="person" mode="edit" showRole initial={editPax || undefined}
        title="Карточка пассажира" onClose={() => setEditPax(null)}
        onSave={(person, client) => { setParticipants((l) => l.map((x) => x.name === (editPax && editPax.name) ? { ...x, name: client.name, role: person.role, doc: client.doc, dob: client.dob, phone: client.phone } : x)); setEditPax(null); toast('Данные участника обновлены', 'ok'); }} />
      {/* Единая форма добавления документа участнику (ТЗ п.4, ТЗ-2 п.1) */}
      <UnifiedDocumentDrawer open={!!docPax} person={{ name: docPax && docPax.name, citizenship: docPax && docPax.citizenship }}
        onClose={() => setDocPax(null)}
        onSave={(doc) => { setParticipants((l) => l.map((x) => x.name === (docPax && docPax.name) ? { ...x, documents: [...(x.documents || []), doc], docStatus: 'ok' } : x)); setDocPax(null); toast('Документ добавлен участнику', 'ok'); }} />
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
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-.02em' }}>Редактирование заказа №{order.no}</h2>
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
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>{ocMoney(fin.total)}</div>
              </div>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 14 }}>Состав заказа</h3>
                {services.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Услуги не выбраны</div>}
                {services.map((s) => {
                  const k = SERVICE_KIND[s.kind] || { icon: 'briefcase', color: 'var(--blue)' };
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span className="oc-svc-ic" style={{ background: k.color, width: 34, height: 34, borderRadius: 10, flex: '0 0 34px' }}><Icon name={k.icon} style={{ width: 16, height: 16 }} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
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
