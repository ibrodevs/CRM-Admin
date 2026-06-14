// ===== Orders: list + detail + create drawer =====

const PAGE_SIZE = 9;

function OrderCreateDrawer({ open, onClose, onCreated }) {
  const toast = useToast();
  const empty = { client: '', requestType: '', service: '', operator: '', currency: 'USD', sum: '', comment: '' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target ? e.target.value : e }));
  useEffect(() => { if (open) { setF(empty); setErrs({}); } }, [open]);

  const submit = () => {
    const er = {};
    if (!f.client.trim()) er.client = 'Укажите клиента';
    if (!f.requestType) er.requestType = 'Выберите тип';
    if (!f.service) er.service = 'Выберите услугу';
    if (!f.sum || isNaN(+f.sum)) er.sum = 'Введите сумму';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    onCreated({ no: 51181, client: f.client, requestType: f.requestType, service: f.service,
      status: 'Новое', operator: f.operator || 'Даниель', operatorRole: 'Оператор',
      sum: +f.sum, currency: f.currency, services: 1, progress: 5, date: '14.06.26' });
    toast('Заказ создан', 'ok');
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title="Новый заказ"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button variant="primary" iconRight="arrowRight" onClick={submit}>Создать заказ</Button>
      </>}>
      <div className="form-grid">
        <div className="full">
          <Field label="Клиент" required error={errs.client}>
            <Input placeholder="Введите ФИО или организацию" value={f.client} onChange={set('client')} error={errs.client} />
          </Field>
        </div>
        <Field label="Тип заявки" required error={errs.requestType}>
          <Select placeholder="Выберите тип" options={REQUEST_TYPE} value={f.requestType} onChange={set('requestType')} error={errs.requestType} />
        </Field>
        <Field label="Тип услуги" required error={errs.service}>
          <Select placeholder="Выберите услугу" options={Object.keys(SERVICE_TYPE)} value={f.service} onChange={set('service')} error={errs.service} />
        </Field>
        <Field label="Ответственное лицо">
          <Select placeholder="Выберите оператора" options={OPERATORS} value={f.operator} onChange={set('operator')} />
        </Field>
        <Field label="Валюта">
          <Select options={CURRENCIES.map((c) => c.code)} value={f.currency} onChange={set('currency')} />
        </Field>
        <Field label="Сумма" required error={errs.sum}>
          <Input placeholder="0.00" value={f.sum} onChange={set('sum')} error={errs.sum} />
        </Field>
        <div className="full">
          <Field label="Комментарий">
            <textarea className="input" rows={3} placeholder="Дополнительная информация..." value={f.comment} onChange={set('comment')} />
          </Field>
        </div>
      </div>
    </Drawer>
  );
}

function OrdersList({ orders, onOpen, onCreate }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', requestType: '', service: '' });
  const { sort, onSort, apply } = useSort(null);

  let rows = orders.filter((o) =>
    (o.client.toLowerCase().includes(search.toLowerCase()) || String(o.no).includes(search)) &&
    (!filters.status || o.status === filters.status) &&
    (!filters.requestType || o.requestType === filters.requestType) &&
    (!filters.service || o.service === filters.service));
  rows = apply(rows, { no: (r) => r.no, sum: (r) => r.sum });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, filters]);

  return (
    <div className="fade-in">
      <Topbar title="Заказы">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="edit" onClick={() => toast('Выберите заказ для редактирования', 'info')}>Редактировать</Button>
        <Button variant="secondary" icon="docs" onClick={() => toast('КП сформировано и отправлено', 'ok')}>Сформировать КП</Button>
        <Button variant="primary" icon="plus" onClick={onCreate}>Добавить заказ</Button>
      </Topbar>
      <div className="content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <FilterChip label="Статус" icon="chev" options={Object.keys(ORDER_STATUS)} value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <FilterChip label="Заказчик" icon="chev" options={CLIENTS} value={filters.client} onChange={(v) => setSearch(v === '' ? '' : v)} />
          <FilterChip label="Тип заявки" icon="chev" options={REQUEST_TYPE} value={filters.requestType} onChange={(v) => setFilters((f) => ({ ...f, requestType: v }))} />
          <FilterChip label="Тип услуги" icon="chev" options={Object.keys(SERVICE_TYPE)} value={filters.service} onChange={(v) => setFilters((f) => ({ ...f, service: v }))} />
          <div className="topbar-spacer" />
          <SearchBox value={search} onChange={setSearch} style={{ width: 280 }} />
        </div>

        <div className="table-card">
          <table className="tbl">
            <thead>
              <tr>
                <Th label="№" col="no" sort={sort} onSort={onSort} style={{ width: 80 }} />
                <th>Клиент</th><th>Тип заявки</th><th>Статус заказа</th><th>Тип услуги</th>
                <th>Ответственное лицо</th>
                <Th label="Сумма" col="sum" sort={sort} onSort={onSort} />
                <th>Кол-во услуг</th>
              </tr>
            </thead>
            {pageRows.length === 0
              ? <tbody><tr><td colSpan={8}><EmptyState title="Заказы не найдены" sub="Измените параметры поиска или фильтры" /></td></tr></tbody>
              : (
                <tbody>
                  {pageRows.map((o, i) => (
                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpen(o)}>
                      <td className="t-strong">{o.no}</td>
                      <td className="t-strong">{o.client}</td>
                      <td><Pill tone="blue">{o.requestType}</Pill></td>
                      <td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td>
                      <td><Pill tone={SERVICE_TYPE[o.service]}>{o.service}</Pill></td>
                      <td><div className="t-strong">{o.operator}</div><div className="t-sub">{o.operatorRole}</div></td>
                      <td className="t-strong">{o.sum} {o.currency}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {o.services} <span className="info-dot">i</span>
                          <button className="icon-btn" style={{ color: 'var(--amber)' }} onClick={(e) => { e.stopPropagation(); toast('Открываю чат по заказу', 'info'); }}><Icon name="chat" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
          </table>
          <Pagination page={page} pages={pages} onPage={setPage} />
        </div>
      </div>
    </div>
  );
}

function OrderDetail({ order, onBack }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const [view, setView] = useState('overview');
  const [feeOpen, setFeeOpen] = useState(false);
  const [paxOpen, setPaxOpen] = useState(false);
  const [passport, setPassport] = useState(null);
  const fees = [
    { service: 'Авиа', type: '%', value: '5%', tax: '80', cur: 'USD', comment: 'Сервисный сбор' },
    { service: 'Виза', type: 'Фиксированная сумма', value: '400', tax: '30', cur: 'USD', comment: 'Визовая комиссия' },
  ];
  const calc = [
    { client: 'Нуралиев Данияр', services: 'Авиа+Виза', cost: '500$+250$', fees: '80$', cur: 'USD', total: '830$ (Под ключ)' },
    { client: 'Усманов Бактыбек', services: 'Фиксированная сумма', cost: '500$+250$', fees: '80$', cur: 'USD', total: '830$ (Под ключ)' },
  ];
  const history = [
    { time: '22.12.2025 - 15:34', text: 'Ожидает подтверждения' },
    { time: '22.12.2025 - 15:29', text: 'Загружены документы' },
    { time: '22.12.2025 - 15:24', text: 'Назначен оператор (Адилет Медербеков)' },
    { time: '22.12.2025 - 15:20', text: 'Был создан заказ' },
  ];
  const docsC1 = ['Паспорт', 'Банковское подтверждение', 'Выписка с места жительства', 'Справка 077', 'Справка от стоматолога', 'Справка о несудимости'];
  const docsGeneral = ['Договор', 'Счет на оплату', 'Ваучер', 'Акт'];

  return (
    <div className="fade-in">
      <Topbar title={`№ ${order.no} ${order.client} от ${order.date}`}>
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>Вернуться</Button>
      </Topbar>

      <div className="content" style={{ paddingTop: 6, paddingBottom: 0 }}>
        <div className="tabs">
          <button className={'tab' + (view === 'overview' ? ' active' : '')} onClick={() => setView('overview')}>Обзор сделки</button>
          <button className={'tab' + (view === 'classic' ? ' active' : '')} onClick={() => setView('classic')}>Карточка заказа</button>
        </div>
      </div>

      {view === 'overview' && (
        <div className="content" style={{ paddingTop: 18 }}>
          <ExtendedOrderDetail order={order} onPassport={(p) => setPassport(p)} onAddPassenger={() => setPaxOpen(true)} onAddFee={() => setFeeOpen(true)} />
        </div>
      )}

      {view === 'classic' && (
      <div className="content" style={{ paddingTop: 18 }}>
        <div className="grid-2" style={{ marginBottom: 26 }}>
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 className="card-title">Основная информация</h3>
              <button className="icon-btn green" onClick={() => toast('Редактирование основной информации', 'info')}><Icon name="edit" /></button>
            </div>
            <div className="kv-stack">
              {[['Организация', order.client], ['ИНН/ПИН/БИК', '07070707070707'], ['Юридический адрес', 'Бишкек, ул.Токтогула, 125/1'], ['ОКПО', '8362411'], ['Тип организации', 'Туроператор'], ['Телефон', '+996 (777) 777-777'], ['email', 'grandlimited@mail.ru']].map(([k, v], i) => (
                <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 className="card-title">Информация о заказе</h3>
              <button className="icon-btn green"><Icon name="edit" /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
              <div className="kv-stack">
                {[['Оператор', order.operator], ['Дата создания', order.date], ['Валюта', 'Американский доллар (USD)'], ['Тип комиссии', 'Процентная (%)'], ['Тип расчета', 'НДС включен']].map(([k, v], i) => (
                  <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
                ))}
              </div>
              <div className="kv-stack">
                {[['Комиссия', '5%'], ['Синхронизация с бухгалтерией', 'Подключен к 1С ✓'], ['Метод округления', 'До 1 USD'], ['Ставка НДС', '12%']].map(([k, v], i) => (
                  <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* fees */}
        <SectionWithTable title="Сборы и налоги" action="Добавить сбор / налог" onAction={() => setFeeOpen(true)}
          head={['Услуга', 'Тип сбора', 'Значение', 'Налог', 'Тип Валюта', 'Комментарий', 'Действие']}>
          {fees.map((r, i) => (
            <tr key={i}>
              <td className="t-strong">{r.service}</td><td>{r.type}</td><td>{r.value}</td><td>{r.tax}</td>
              <td><Pill tone="blue">{r.cur}</Pill></td><td className="t-muted">{r.comment}</td>
              <td><div className="row-actions"><button className="icon-btn green"><Icon name="edit" /></button><button className="icon-btn" onClick={() => setConfirm({ kind: 'fee', i })}><Icon name="trash" /></button></div></td>
            </tr>
          ))}
        </SectionWithTable>

        {/* calc */}
        <SectionWithTable title="Калькуляция" action="Добавить калькуляцию" onAction={() => toast('Добавление калькуляции', 'info')}
          head={['Услуга', 'Услуги', 'Стоимость', 'Сборы и налоги', 'Тип Валюта', 'Итог', 'Действие']}>
          {calc.map((r, i) => (
            <tr key={i}>
              <td className="t-strong">{r.client}</td><td>{r.services}</td><td>{r.cost}</td><td>{r.fees}</td>
              <td><Pill tone="blue">{r.cur}</Pill></td><td className="t-strong">{r.total}</td>
              <td><div className="row-actions"><button className="icon-btn green"><Icon name="edit" /></button><button className="icon-btn"><Icon name="trash" /></button></div></td>
            </tr>
          ))}
          <tr>
            <td><Pill tone="blue">Итого</Pill></td><td className="t-strong" colSpan={5}>1660$</td>
            <td><div className="row-actions"><button className="icon-btn green"><Icon name="edit" /></button><button className="icon-btn"><Icon name="trash" /></button></div></td>
          </tr>
        </SectionWithTable>

        {/* documents */}
        <h2 className="section-title" style={{ margin: '34px 0 16px' }}>Документы</h2>
        <div className="card card-pad" style={{ marginBottom: 30 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Клиент 1: Нуралиев Данияр</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
            {docsC1.map((d, i) => (
              <button key={i} className="doc-chip" onClick={() => setPassport('Нуралиев Данияр')}>{d}<Icon name="chevRight" /></button>
            ))}
          </div>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Документация:</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {docsGeneral.map((d, i) => (
              <button key={i} className="doc-chip" style={{ width: 'auto' }} onClick={() => toast('Открываю: ' + d, 'info')}>{d}<Icon name="chevRight" /></button>
            ))}
          </div>
        </div>

        {/* history */}
        <h2 className="section-title" style={{ marginBottom: 16 }}>История заказа</h2>
        <div className="card card-pad" style={{ maxWidth: 440 }}>
          <div className="timeline">
            {history.map((h, i) => (
              <div className="tl-item" key={i}>
                <div className="tl-dot" /><div className="tl-line" />
                <div><div className="tl-time">{h.time}</div><div className="tl-text">{h.text}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {feeOpen && <FeeDrawer open={feeOpen} onClose={() => setFeeOpen(false)} />}
      {paxOpen && <PassengerDrawer open={paxOpen} onClose={() => setPaxOpen(false)} />}
      {passport && <PassportModal passenger={passport} onClose={() => setPassport(null)} />}
      <ConfirmDialog open={!!confirm} message="Данное действие невозможно будет отменить!"
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); toast('Запись удалена', 'ok'); }} />
    </div>
  );
}

function SectionWithTable({ title, action, onAction, head, children }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '34px 0 16px' }}>
        <h2 className="section-title">{title}</h2>
        {action && <Button variant="primary" icon="plus" onClick={onAction}>{action}</Button>}
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </>
  );
}

function OrdersPage({ intent, onConsume, orders, addOrder }) {
  const [detail, setDetail] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  useEffect(() => {
    if (!intent) return;
    if (intent.type === 'create') setCreateOpen(true);
    if (intent.type === 'open') setDetail(intent.order);
    onConsume();
  }, [intent]);

  if (detail) return <OrderDetail order={detail} onBack={() => setDetail(null)} />;
  return (
    <>
      <OrdersList orders={orders} onOpen={setDetail} onCreate={() => setCreateOpen(true)} />
      <OrderCreateDrawer open={createOpen} onClose={() => setCreateOpen(false)} onCreated={addOrder} />
    </>
  );
}

Object.assign(window, { OrdersPage, OrderDetail, OrdersList });
