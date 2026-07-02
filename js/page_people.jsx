// ===== Клиенты и Компании (реестры + карточки) =====

function pUsd(n) { return Math.round(n).toLocaleString('ru-RU') + ' $'; }
function ordersOf(name) { return ORDERS.filter((o) => o.client === name); }

/* ====================================================================
   КЛИЕНТЫ
   ==================================================================== */
function ClientCard({ c, onBack, onOpenOrder }) {
  const toast = useToast();
  const orders = ordersOf(c.name);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>К реестру</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Клиенты / {c.id}</span>
      </div>

      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <Avatar name={c.name} size={56} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><h2 className="card-title">{c.name}</h2><Pill tone={CLIENT_STATUS[c.status]}>{c.status}</Pill></div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{c.type} · {c.company !== '—' ? c.company : 'частное лицо'} · клиент с {c.since}</div>
        </div>
        <Button variant="secondary" icon="chat" onClick={() => toast('Открываю чат с клиентом', 'info')}>Написать</Button>
        <Button icon="plus" onClick={() => toast('Создание заказа', 'info')}>Новый заказ</Button>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Контактные данные</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">Телефон</span><span className="v">{c.phone}</span></div>
            <div className="kv-row"><span className="k">E-mail</span><span className="v">{c.email}</span></div>
            <div className="kv-row"><span className="k">Город</span><span className="v">{c.city}</span></div>
            <div className="kv-row"><span className="k">Документ</span><span className="v">{c.doc}</span></div>
            <div className="kv-row"><span className="k">Дата рождения</span><span className="v">{c.dob}</span></div>
            <div className="kv-row"><span className="k">Компания</span><span className="v">{c.company}</span></div>
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Сводка</h3>
          <div className="oc-kpi"><span className="l">Заказов всего</span><span className="v">{c.orders}</span></div>
          <div className="oc-kpi"><span className="l">Сумма покупок</span><span className="v">{pUsd(c.spent)}</span></div>
          <div className="oc-kpi"><span className="l">Задолженность</span><span className={'v' + (c.debt ? ' red' : '')}>{pUsd(c.debt)}</span></div>
          <div className="oc-kpi"><span className="l">Клиент с</span><span className="v">{c.since}</span></div>
        </div>
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Заказы клиента</h3>
      <div className="table-card">
        {orders.length ? (
          <table className="tbl">
            <thead><tr><th>№</th><th>Тип</th><th>Статус</th><th>Услуга</th><th style={{ textAlign: 'right' }}>Сумма</th><th></th></tr></thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpenOrder(o)}>
                  <td className="t-strong">{o.no}</td><td><Pill tone="blue">{o.requestType}</Pill></td>
                  <td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td><td>{o.service}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{o.sum} {o.currency}</td>
                  <td><span className="go-dot"><Icon name="chevRight" /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="orders" title="Заказов пока нет" />}
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Документы</h3>
      <div className="grid-4">
        {['Паспорт / ID', 'Договор', 'Согласие на обработку ПД'].map((d) => (<button key={d} className="doc-chip"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="idcard" />{d}</span><Icon name="download" /></button>))}
        <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)' }} onClick={() => toast('Загрузка', 'info')}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span></button>
      </div>
    </div>
  );
}

/* ---------- Новый клиент (форма добавления) ---------- */
function ClientCreateModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const blank = { name: '', type: 'Физлицо', status: 'Новый', company: '', phone: '', email: '', city: 'Бишкек', doc: '', dob: '' };
  const [f, setF] = useState(blank);
  const [errs, setErrs] = useState({});
  useEffect(() => { if (open) { setF(blank); setErrs({}); } }, [open]);
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const submit = () => {
    const er = {};
    if (!f.name.trim()) er.name = 'Укажите имя клиента';
    if (!f.phone.trim()) er.phone = 'Укажите телефон';
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = 'Некорректный e-mail';
    setErrs(er);
    if (Object.keys(er).length) return;
    const d = new Date();
    const since = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    const c = { id: 'CL-' + (1061 + Math.floor(Math.random() * 8999)), ...f, name: f.name.trim(), company: f.company.trim() || '—', since, orders: 0, spent: 0, debt: 0, doc: f.doc.trim() || '—', dob: f.dob.trim() || '—' };
    onCreated(c); toast('Клиент «' + c.name + '» добавлен', 'ok'); onClose();
  };
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-pad">
        <ModalHeader title="Новый клиент" sub="Контактные и учётные данные" onClose={onClose} />
        <div className="form-grid">
          <Field label="ФИО / Наименование" required error={errs.name} ><Input value={f.name} onChange={(e) => upd('name', e.target.value)} placeholder="Иванов Иван Иванович" error={errs.name} /></Field>
          <Field label="Тип клиента"><Select options={['Физлицо', 'ИП', 'Организация']} value={f.type} onChange={(e) => upd('type', e.target.value)} /></Field>
          <Field label="Телефон" required error={errs.phone}><Input value={f.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="+996 700 000 000" leadIcon="phone" error={errs.phone} /></Field>
          <Field label="E-mail" error={errs.email}><Input value={f.email} onChange={(e) => upd('email', e.target.value)} placeholder="mail@example.com" leadIcon="mail" error={errs.email} /></Field>
          <Field label="Город"><Input value={f.city} onChange={(e) => upd('city', e.target.value)} /></Field>
          <Field label="Статус"><Select options={Object.keys(CLIENT_STATUS)} value={f.status} onChange={(e) => upd('status', e.target.value)} /></Field>
          <Field label="Компания"><Input value={f.company} onChange={(e) => upd('company', e.target.value)} placeholder="— (для физлица)" /></Field>
          <Field label="Документ"><Input value={f.doc} onChange={(e) => upd('doc', e.target.value)} placeholder="ID / Паспорт / ИНН" leadIcon="idcard" /></Field>
          <Field label="Дата рождения"><Input value={f.dob} onChange={(e) => upd('dob', e.target.value)} placeholder="дд.мм.гггг" leadIcon="calendar" /></Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 26 }}>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button icon="check" onClick={submit}>Добавить клиента</Button>
        </div>
      </div>
    </Modal>
  );
}

function ClientsPage({ onOpenOrder, intent, onConsume }) {
  const [view, setView] = useState('list');
  const [active, setActive] = useState(null);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [clients, setClients] = useState(CLIENTS_DB);
  const [createOpen, setCreateOpen] = useState(false);
  const { sort, onSort, apply } = useSort(null);

  useEffect(() => { if (intent && intent.type === 'create') { setCreateOpen(true); onConsume && onConsume(); } }, [intent]);
  const addClient = (c) => setClients((cur) => [c, ...cur]);

  if (view === 'card' && active) return (<><Topbar title="Карточка клиента" /><div className="content"><ClientCard c={active} onBack={() => setView('list')} onOpenOrder={onOpenOrder} /></div></>);

  let rows = clients.filter((c) => (!fStatus || c.status === fStatus) && (!q || `${c.id} ${c.name} ${c.company} ${c.phone}`.toLowerCase().includes(q.toLowerCase())));
  rows = apply(rows, { name: (r) => r.name, orders: (r) => r.orders, spent: (r) => r.spent, debt: (r) => r.debt });
  const STATS = [['Всего клиентов', clients.length], ['Активные', clients.filter((c) => c.status === 'Активный' || c.status === 'VIP').length], ['VIP', clients.filter((c) => c.status === 'VIP').length], ['С задолженностью', pUsd(clients.reduce((s, c) => s + c.debt, 0))]];

  return (
    <>
      <Topbar title="Клиенты"><div className="topbar-spacer" /><Button icon="plus" onClick={() => setCreateOpen(true)}>Добавить клиента</Button></Topbar>
      <div className="content fade-in">
        <div className="grid-4" style={{ marginBottom: 22 }}>{STATS.map(([l, v]) => (<div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value">{v}</div></div>))}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск: имя, телефон, ID…" style={{ width: 280 }} />
          <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={Object.keys(CLIENT_STATUS)} />
        </div>
        <div className="table-card">
          {rows.length ? (
            <table className="tbl">
              <thead><tr><th>ID</th><Th label="Клиент" col="name" sort={sort} onSort={onSort} /><th>Тип</th><th>Компания</th><th>Город</th><Th label="Заказов" col="orders" sort={sort} onSort={onSort} /><Th label="Покупки" col="spent" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} /><Th label="Долг" col="debt" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} /><th>Статус</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => { setActive(c); setView('card'); }}>
                    <td className="t-strong">{c.id}</td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={c.name} size={32} /><span style={{ fontWeight: 600 }}>{c.name}</span></span></td>
                    <td>{c.type}</td><td className="t-muted">{c.company}</td><td>{c.city}</td><td>{c.orders}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{pUsd(c.spent)}</td>
                    <td style={{ textAlign: 'right', color: c.debt ? 'var(--red)' : 'var(--muted-2)', fontWeight: 600 }}>{c.debt ? pUsd(c.debt) : '—'}</td>
                    <td><Pill tone={CLIENT_STATUS[c.status]}>{c.status}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState icon="user" title="Клиентов не найдено" />}
        </div>
      </div>
      <ClientCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={addClient} />
    </>
  );
}

/* ====================================================================
   КОМПАНИИ
   ==================================================================== */
function CompanyCard({ co, onBack, onOpenOrder }) {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const orders = ordersOf(co.name);
  const contacts = [{ name: co.dir, role: 'Директор', phone: co.phone, email: co.email }, { name: 'Бухгалтерия', role: 'Финансы', phone: co.phone, email: 'buh@' + co.email.split('@')[1] }].slice(0, co.contacts);
  const fin = companyFinance(co.id);
  const bal = companyBalanceShort(fin);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>К реестру</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Компании / {co.id}</span>
      </div>

      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="oc-svc-ic" style={{ background: '#2566ff', width: 56, height: 56, borderRadius: 16 }}><Icon name="building" style={{ width: 26, height: 26 }} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><h2 className="card-title">{co.name}</h2><Pill tone={COMPANY_STATUS[co.status]}>{co.status}</Pill>{fin && <Pill tone={SETTLEMENT_TONE[fin.settlement]}>{fin.settlement}</Pill>}</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{co.type} · ИНН {co.inn} · директор {co.dir}</div>
        </div>
        {bal && bal.kind !== 'предоплата' && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{bal.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--' + (bal.tone === 'red' ? 'red' : bal.tone === 'green' ? 'green' : 'ink') + ')' }}>{Math.round(bal.value).toLocaleString('ru-RU')} $</div>
            {bal.overdue > 0 && <div style={{ fontSize: 12, color: 'var(--red)' }}>просрочено {Math.round(bal.overdue).toLocaleString('ru-RU')} $</div>}
          </div>
        )}
        <Button icon="plus" onClick={() => toast('Создание заказа', 'info')}>Новый заказ</Button>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Tabs tabs={[{ key: 'overview', label: 'Обзор' }, { key: 'finance', label: 'Финансы и договоры' }]} value={tab} onChange={setTab} />
      </div>

      {tab === 'finance' && <CompanyFinanceBlock co={co} />}

      {tab === 'overview' && <>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Реквизиты</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">ИНН</span><span className="v">{co.inn}</span></div>
            <div className="kv-row"><span className="k">ОКПО</span><span className="v">{co.okpo}</span></div>
            <div className="kv-row"><span className="k">Юр. адрес</span><span className="v" style={{ maxWidth: 280 }}>{co.addr}</span></div>
            <div className="kv-row"><span className="k">НДС</span><span className="v">{co.vat}</span></div>
            <div className="kv-row"><span className="k">Тип</span><span className="v">{co.type}</span></div>
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Банк и договор</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">Банк</span><span className="v">{co.bank}</span></div>
            <div className="kv-row"><span className="k">Расчётный счёт</span><span className="v">{co.account}</span></div>
            <div className="kv-row"><span className="k">Договор</span><span className="v">{co.contract}</span></div>
            <div className="kv-row"><span className="k">Оборот</span><span className="v">{pUsd(co.turnover)}</span></div>
            <div className="kv-row"><span className="k">Заказов</span><span className="v">{co.orders}</span></div>
          </div>
        </div>
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Контактные лица</h3>
      <div className="grid-2">
        {contacts.map((p, i) => (
          <div className="card card-pad" key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={p.name} size={44} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{p.role} · {p.phone}</div></div>
            <button className="icon-btn"><Icon name="mail" /></button><button className="icon-btn"><Icon name="phone" /></button>
          </div>
        ))}
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Заказы компании</h3>
      <div className="table-card">
        {orders.length ? (
          <table className="tbl">
            <thead><tr><th>№</th><th>Статус</th><th>Услуга</th><th>Ответственный</th><th style={{ textAlign: 'right' }}>Сумма</th><th></th></tr></thead>
            <tbody>{orders.map((o, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpenOrder(o)}>
                <td className="t-strong">{o.no}</td><td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td><td>{o.service}</td><td>{o.operator}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{o.sum} {o.currency}</td><td><span className="go-dot"><Icon name="chevRight" /></span></td>
              </tr>
            ))}</tbody>
          </table>
        ) : <EmptyState icon="orders" title="Заказов пока нет" />}
      </div>
      </>}
    </div>
  );
}

function CompaniesPage({ onOpenOrder }) {
  const [view, setView] = useState('list');
  const [active, setActive] = useState(null);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const { sort, onSort, apply } = useSort(null);

  if (view === 'card' && active) return (<><Topbar title="Карточка компании" /><div className="content"><CompanyCard co={active} onBack={() => setView('list')} onOpenOrder={onOpenOrder} /></div></>);

  let rows = COMPANIES_DB.filter((c) => (!fStatus || c.status === fStatus) && (!q || `${c.id} ${c.name} ${c.inn} ${c.dir}`.toLowerCase().includes(q.toLowerCase())));
  rows = apply(rows, { name: (r) => r.name, orders: (r) => r.orders, turnover: (r) => r.turnover });
  const STATS = [['Всего компаний', COMPANIES_DB.length], ['Действующие', COMPANIES_DB.filter((c) => c.status === 'Действующий').length], ['Совокупный оборот', pUsd(COMPANIES_DB.reduce((s, c) => s + c.turnover, 0))], ['Заказов', COMPANIES_DB.reduce((s, c) => s + c.orders, 0)]];

  return (
    <>
      <Topbar title="Компании"><div className="topbar-spacer" /><Button icon="plus">Добавить компанию</Button></Topbar>
      <div className="content fade-in">
        <div className="grid-4" style={{ marginBottom: 22 }}>{STATS.map(([l, v]) => (<div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value">{v}</div></div>))}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск: название, ИНН, директор…" style={{ width: 300 }} />
          <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={Object.keys(COMPANY_STATUS)} />
        </div>
        <div className="table-card">
          {rows.length ? (
            <table className="tbl">
              <thead><tr><th>ID</th><Th label="Компания" col="name" sort={sort} onSort={onSort} /><th>Тип</th><th>Взаиморасчёты</th><th style={{ textAlign: 'right' }}>Баланс / долг</th><Th label="Заказов" col="orders" sort={sort} onSort={onSort} /><Th label="Оборот" col="turnover" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} /><th>Статус</th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const bal = companyBalanceShort(companyFinance(c.id));
                  return (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => { setActive(c); setView('card'); }}>
                    <td className="t-strong">{c.id}</td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="airline-logo sm" style={{ background: '#2566ff', width: 30, height: 30, borderRadius: 8 }}><Icon name="building" style={{ width: 16, height: 16 }} /></span><span style={{ fontWeight: 600 }}>{c.name}</span></span></td>
                    <td>{c.type}</td>
                    <td>{bal ? <Pill tone={SETTLEMENT_TONE[bal.kind] || 'gray'}>{bal.kind}</Pill> : <span className="t-muted">—</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      {bal && bal.kind !== 'предоплата' ? (
                        <span style={{ fontWeight: 600, color: bal.tone === 'red' ? 'var(--red)' : bal.tone === 'green' ? 'var(--green)' : 'var(--ink)' }}>
                          {Math.round(bal.value).toLocaleString('ru-RU')} $
                          {bal.overdue > 0 && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--red)', fontWeight: 500 }}>просрочено {Math.round(bal.overdue).toLocaleString('ru-RU')} $</span>}
                        </span>
                      ) : <span className="t-muted">—</span>}
                    </td>
                    <td>{c.orders}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{pUsd(c.turnover)}</td>
                    <td><Pill tone={COMPANY_STATUS[c.status]}>{c.status}</Pill></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <EmptyState icon="building" title="Компаний не найдено" />}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ClientsPage, ClientCard, ClientCreateModal, CompaniesPage, CompanyCard });
