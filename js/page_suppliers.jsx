// ===== Suppliers: list + info modal (tabs) + add drawer =====

function MiniLineChart() {
  // two smooth lines: Отмены (red), Успешные (green)
  const w = 420, h = 150, pad = 6;
  const mk = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${pad + (i / (pts.length - 1)) * (w - pad * 2)},${h - pad - (p / 100) * (h - pad * 2)}`).join(' ');
  const red = [22, 30, 28, 18, 44, 78, 60, 70, 84, 58];
  const green = [40, 52, 60, 56, 50, 38, 56, 64, 50, 30];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 170 }}>
      {[0, 20, 40, 60, 80, 100].map((g, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={h - pad - (g / 100) * (h - pad * 2)} y2={h - pad - (g / 100) * (h - pad * 2)} stroke="#eef0f4" strokeWidth="1" />
      ))}
      <path d={mk(green)} fill="none" stroke="#2bb96a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={mk(red)} fill="none" stroke="#ec4444" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SUP_TABS = [
  { key: 'general', label: 'Общие данные', icon: 'user' },
  { key: 'contacts', label: 'Контакты', icon: 'contacts' },
  { key: 'markups', label: 'Надбавки / таксы', icon: 'finance', airlineOnly: true },
  { key: 'analytics', label: 'Аналитика', icon: 'pie' },
  { key: 'api', label: 'Интеграция / API', icon: 'api' },
  { key: 'sla', label: 'SLA', icon: 'sla' },
  { key: 'docs', label: 'Документы', icon: 'docs' },
];

/* Редактор авиа-надбавок поставщика: авиакомпания → (внутри РФ / международные) + точечные маршруты.
   Наценка применяется к базовой цене тарифа и отражается в поиске. */
function AviaMarkupEditor({ supplierName }) {
  const toast = useToast();
  const [cfg, setCfg] = useState(() => JSON.parse(JSON.stringify(aviaMarkupsFor(supplierName))));
  const [addAir, setAddAir] = useState('');
  const airCodes = Object.keys(cfg);
  const available = Object.keys(AIRLINES).filter((c) => !cfg[c]);

  const persist = (next) => { setCfg(next); AVIA_MARKUPS[supplierName] = JSON.parse(JSON.stringify(next)); };
  const addAirline = () => { if (!addAir) return; persist({ ...cfg, [addAir]: { domestic: { type: 'percent', value: 0 }, intl: { type: 'percent', value: 0 }, routes: [] } }); setAddAir(''); toast('Добавлена ' + AIRLINES[addAir].name, 'ok'); };
  const removeAirline = (code) => { const n = { ...cfg }; delete n[code]; persist(n); };
  const setBucket = (code, bucket, patch) => persist({ ...cfg, [code]: { ...cfg[code], [bucket]: { ...cfg[code][bucket], ...patch } } });
  const addRoute = (code) => persist({ ...cfg, [code]: { ...cfg[code], routes: [...(cfg[code].routes || []), { from: '', to: '', type: 'fixed', value: 0 }] } });
  const setRoute = (code, i, patch) => persist({ ...cfg, [code]: { ...cfg[code], routes: cfg[code].routes.map((r, j) => (j === i ? { ...r, ...patch } : r)) } });
  const removeRoute = (code, i) => persist({ ...cfg, [code]: { ...cfg[code], routes: cfg[code].routes.filter((_, j) => j !== i) } });

  // inline-рендер (не компонент) — чтобы поля не теряли фокус при перерисовке
  const bucketRow = (code, bucket, label) => {
    const b = cfg[code][bucket];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ flex: 1, minWidth: 130, fontSize: 13, color: 'var(--body)' }}>{label}</span>
        <div className="seg-toggle" style={{ width: 150 }}>
          <button className={'seg-btn' + (b.type === 'percent' ? ' active' : '')} onClick={() => setBucket(code, bucket, { type: 'percent' })}>%</button>
          <button className={'seg-btn' + (b.type === 'fixed' ? ' active' : '')} onClick={() => setBucket(code, bucket, { type: 'fixed' })}>Фикс.</button>
        </div>
        <div style={{ width: 110 }}><Input type="number" value={b.value} onChange={(e) => setBucket(code, bucket, { value: parseFloat(e.target.value) || 0 })} /></div>
        <span style={{ width: 18, color: 'var(--muted)', fontSize: 13 }}>{b.type === 'percent' ? '%' : '$'}</span>
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
        Наценка задаётся по авиакомпании и маршруту. Базовые строки — внутри РФ и международные; точечные маршруты имеют приоритет. Наценка отражается в поиске уже с надбавкой.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {airCodes.length === 0 && <div className="card card-pad" style={{ color: 'var(--muted)' }}>Надбавки не заданы. Добавьте авиакомпанию ниже.</div>}
        {airCodes.map((code) => (
          <div className="card card-pad" key={code}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AirlineLogo code={code} size="sm" />
              <div style={{ flex: 1, fontWeight: 700, color: 'var(--ink)' }}>{AIRLINES[code].name}</div>
              <Button variant="ghost" size="sm" icon="trash" onClick={() => removeAirline(code)}>Убрать</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bucketRow(code, 'domestic', 'Внутри РФ')}
              {bucketRow(code, 'intl', 'Международные')}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Точечные маршруты</span>
                <Button variant="ghost" size="sm" icon="plus" onClick={() => addRoute(code)}>Маршрут</Button>
              </div>
              {(cfg[code].routes || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>Нет точечных маршрутов.</div>}
              {(cfg[code].routes || []).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ width: 74 }}><Input value={r.from} onChange={(e) => setRoute(code, i, { from: e.target.value.toUpperCase() })} placeholder="FRU" /></div>
                  <Icon name="chevRight" style={{ width: 14, height: 14, color: 'var(--muted-2)' }} />
                  <div style={{ width: 74 }}><Input value={r.to} onChange={(e) => setRoute(code, i, { to: e.target.value.toUpperCase() })} placeholder="IST" /></div>
                  <div className="seg-toggle" style={{ width: 130 }}>
                    <button className={'seg-btn' + (r.type === 'percent' ? ' active' : '')} onClick={() => setRoute(code, i, { type: 'percent' })}>%</button>
                    <button className={'seg-btn' + (r.type === 'fixed' ? ' active' : '')} onClick={() => setRoute(code, i, { type: 'fixed' })}>Фикс.</button>
                  </div>
                  <div style={{ width: 90 }}><Input type="number" value={r.value} onChange={(e) => setRoute(code, i, { value: parseFloat(e.target.value) || 0 })} /></div>
                  <button className="icon-btn" onClick={() => removeRoute(code, i)}><Icon name="trash" /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {available.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <div style={{ width: 240 }}>
            <Select placeholder="Добавить авиакомпанию…" options={available.map((c) => ({ value: c, label: AIRLINES[c].name }))} value={addAir} onChange={(e) => setAddAir(e.target.value)} />
          </div>
          <Button variant="secondary" size="sm" icon="plus" disabled={!addAir} onClick={addAirline}>Добавить</Button>
        </div>
      )}
    </div>
  );
}

function SupplierModal({ supplier, onClose, onDelete }) {
  const toast = useToast();
  const [tab, setTab] = useState('general');
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [periodPickerPos, setPeriodPickerPos] = useState({ top: 0, left: 0 });
  const [periodStart, setPeriodStart] = useState(null);
  const [periodEnd, setPeriodEnd] = useState(null);
  const periodChipRef = useRef(null);
  if (!supplier) return null;
  const s = supplier;
  const isAirline = s.orgType === 'Авиакомпания';
  const tabs = SUP_TABS.filter((t) => !t.airlineOnly || isAirline);
  const tabMeta = tabs.find((t) => t.key === tab) || tabs[0];

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 18, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
      <Avatar name={s.name} size={64} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{s.name}</div>
        <div style={{ color: 'var(--muted)' }}>Организация - {s.org}</div>
      </div>
      <Pill tone={SUPPLIER_STATUS[s.status]}>{s.status}</Pill>
    </div>
  );

  return (
    <Modal open onClose={onClose} className="">
      <div className="modal-pad">
        <ModalHeader title="Информация поставщика" sub={tabMeta.label} onClose={onClose} />
        <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', gap: 36 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 13, border: '1px solid var(--field-line)', background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: 'var(--ink)', textAlign: 'left' }}>
                <Icon name={t.icon} style={{ width: 19, height: 19, color: 'var(--blue)' }} />
                <span style={{ flex: 1 }}>{t.label}</span>
                <span className={'radio' + (tab === t.key ? ' on' : '')} />
              </button>
            ))}
          </div>
          <div style={{ minHeight: 320 }}>
            {header}
            {tab === 'general' && (
              <div className="kv">
                {[['Поставщик', s.name], ['Тип поставщика', s.type], ['Типы услуг', s.orgType], ['Организация', s.org], ['Валюта расчета', s.currency], ['Комиссия (%)', '12%']].map(([k, v], i) => (
                  <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
                ))}
              </div>
            )}
            {tab === 'contacts' && (
              <div className="kv">
                {[['Контактное лицо', 'Меркель Александр'], ['Должность', 'Менеджер по продажам'], ['Телефон', '+996 (555) 123-456'], ['Email', 'sales@' + s.org.toLowerCase().replace(/[^a-z]/g, '') + '.com'], ['Telegram', '@' + s.org.toLowerCase().replace(/[^a-z]/g, '')], ['Адрес', 'Бишкек, ул. Киевская 124']].map(([k, v], i) => (
                  <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
                ))}
              </div>
            )}
            {tab === 'markups' && isAirline && <AviaMarkupEditor supplierName={s.name} />}
            {tab === 'analytics' && (
              <div>
                <div className="kv" style={{ marginBottom: 16 }}>
                  {[['Количество заказов', '124'], ['Средний чек', '12 000 ₽'], ['Процент отмен', '24%'], ['Средняя комиссия', '12%']].map(([k, v], i) => (
                    <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
                  ))}
                </div>
                <div className="card card-pad">
                  <span
                    ref={periodChipRef}
                    className="chip"
                    style={{ marginBottom: 10, cursor: 'pointer' }}
                    onClick={() => {
                      if (periodChipRef.current) {
                        const r = periodChipRef.current.getBoundingClientRect();
                        const calH = 460, calW = 310;
                        const top = (r.bottom + calH > window.innerHeight - 8) ? Math.max(8, r.top - calH) : r.bottom + 6;
                        const left = Math.max(8, Math.min(r.left, window.innerWidth - calW - 8));
                        setPeriodPickerPos({ top, left });
                      }
                      setShowPeriodPicker(true);
                    }}
                  >
                    {periodStart
                      ? (periodEnd ? `${fmtDate(periodStart)} — ${fmtDate(periodEnd)}` : fmtDate(periodStart))
                      : 'Выберите период'}
                    <Icon name="chevDown" />
                  </span>
                  {showPeriodPicker && ReactDOM.createPortal(
                    <div style={{ position: 'fixed', top: periodPickerPos.top, left: periodPickerPos.left, zIndex: 9999 }}>
                      <CalendarPicker
                        mode="range"
                        startVal={periodStart}
                        endVal={periodEnd}
                        onConfirm={(s, e) => { setPeriodStart(s); setPeriodEnd(e || null); setShowPeriodPicker(false); }}
                        onClose={() => setShowPeriodPicker(false)}
                      />
                    </div>,
                    document.body
                  )}
                  <MiniLineChart />
                  <div className="legend" style={{ marginTop: 8 }}>
                    <div className="legend-item" style={{ fontSize: 14 }}><span className="dot" style={{ background: '#ec4444', borderRadius: '50%' }} />Отмены</div>
                    <div className="legend-item" style={{ fontSize: 14 }}><span className="dot" style={{ background: '#2bb96a', borderRadius: '50%' }} />Успешные</div>
                  </div>
                </div>
              </div>
            )}
            {tab === 'api' && (
              <div>
                <div className="kv">
                  {[['Статус интеграции', 'Подключено'], ['API Endpoint', 'api.amadeus.com/v2'], ['Тип доступа', s.orgType], ['Последняя синхронизация', '14.06.2026 09:32'], ['Автообновление', 'Каждые 10 мин']].map(([k, v], i) => (
                    <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
                  ))}
                </div>
                <Button variant="secondary" icon="api" style={{ marginTop: 18 }} onClick={() => toast('Синхронизация запущена', 'ok')}>Синхронизировать сейчас</Button>
              </div>
            )}
            {tab === 'sla' && (
              <div className="kv">
                {[['Время ответа (мин)', '30 мин.'], ['Дедлайн подтверждения (часы)', '6 ч.'], ['Каналы уведомлений', 'Telegram, Whatsapp, Max'], ['Приоритет поставщика', 'Высокий'], ['Условия оплаты', 'Предоплата 50% остальное по факту']].map(([k, v], i) => (
                  <div className="kv-row" key={i}><span className="k">{k}</span><span className="v" style={{ maxWidth: 240 }}>{v}</span></div>
                ))}
              </div>
            )}
            {tab === 'docs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Договор оферты', 'Прайс-лист 2026', 'Сертификат IATA', 'Акт сверки Q1'].map((d, i) => (
                  <button key={i} className="doc-chip" onClick={() => toast('Открываю: ' + d, 'info')}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icon name="docs" />{d}</span><Icon name="download" /></button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" icon="edit" onClick={() => toast('Редактирование поставщика', 'info')}>Редактировать</Button>
          <Button variant="secondary" icon="trash" onClick={onDelete}>Удалить</Button>
          <Button variant="secondary" icon="share" onClick={() => toast('Ссылка скопирована', 'ok')}>Поделиться</Button>
        </div>
      </div>
    </Modal>
  );
}

function SupplierAddDrawer({ open, onClose, onCreated }) {
  const toast = useToast();
  const empty = { name: '', org: '', orgType: '', currency: 'USD', commission: '', status: 'Активный', email: '', phone: '' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target ? e.target.value : e }));
  useEffect(() => { if (open) { setF(empty); setErrs({}); } }, [open]);
  const submit = () => {
    const er = {};
    if (!f.name.trim()) er.name = 'Введите название';
    if (!f.orgType) er.orgType = 'Выберите тип';
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = 'Некорректный e-mail';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    onCreated({ no: 51182, name: f.name, org: f.org || f.name, status: f.status, service: 'Авиа', currency: f.currency, commission: f.commission || '—', type: 'Локальный', orgType: f.orgType });
    toast('Поставщик добавлен', 'ok'); onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title="Добавить поставщика"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" iconRight="arrowRight" onClick={submit}>Добавить</Button></>}>
      <div className="form-grid">
        <div className="full"><Field label="Наименование" required error={errs.name}><Input placeholder="Введите название" value={f.name} onChange={set('name')} error={errs.name} /></Field></div>
        <Field label="Организация"><Input placeholder="Организация" value={f.org} onChange={set('org')} /></Field>
        <Field label="Тип организации" required error={errs.orgType}><Select placeholder="Выберите тип" options={Object.keys(ORG_TYPE)} value={f.orgType} onChange={set('orgType')} error={errs.orgType} /></Field>
        <Field label="Валюта"><Select options={CURRENCIES.map((c) => c.code)} value={f.currency} onChange={set('currency')} /></Field>
        <Field label="Статус"><Select options={Object.keys(SUPPLIER_STATUS)} value={f.status} onChange={set('status')} /></Field>
        <Field label="Комиссия/маржа"><Input placeholder="например 10% + 20 USD" value={f.commission} onChange={set('commission')} /></Field>
        <Field label="Контактный e-mail" error={errs.email}><Input placeholder="mail@example.com" value={f.email} onChange={set('email')} error={errs.email} /></Field>
        <div className="full"><Field label="Телефон"><Input placeholder="+996 (___) __-__-__" value={f.phone} onChange={set('phone')} /></Field></div>
      </div>
    </Drawer>
  );
}

function SuppliersPage({ intent, onConsume, suppliers, addSupplier }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ orgType: '', status: '', service: '' });
  const [modal, setModal] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const { sort, onSort, apply } = useSort(null);

  useEffect(() => { if (intent && intent.type === 'create') { setAddOpen(true); onConsume(); } }, [intent]);

  let rows = suppliers.filter((s) =>
    (s.name.toLowerCase().includes(search.toLowerCase()) || String(s.no).includes(search)) &&
    (!filters.orgType || s.orgType === filters.orgType) &&
    (!filters.status || s.status === filters.status) &&
    (!filters.service || s.service === filters.service));
  rows = apply(rows, { no: (r) => r.no });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, filters]);

  return (
    <div className="fade-in">
      <Topbar title="Поставщики">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="building" onClick={() => setOrgOpen(true)}>Добавить организацию</Button>
        <Button variant="primary" icon="plus" onClick={() => setAddOpen(true)}>Добавить поставщика</Button>
      </Topbar>
      <div className="content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <FilterChip label="Типы поставщиков" options={Object.keys(ORG_TYPE)} value={filters.orgType} onChange={(v) => setFilters((f) => ({ ...f, orgType: v }))} />
          <FilterChip label="Статусы" options={Object.keys(SUPPLIER_STATUS)} value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <FilterChip label="Типы услуг" options={['Авиа', 'Отель', 'Трансфер']} value={filters.service} onChange={(v) => setFilters((f) => ({ ...f, service: v }))} />
          <FilterChip label="Комиссии" options={['%', 'Фикс', 'По договоренности']} value={filters.commission} onChange={() => {}} />
          <div className="topbar-spacer" />
          <SearchBox value={search} onChange={setSearch} style={{ width: 280 }} />
        </div>
        <div className="table-card">
          <table className="tbl">
            <thead>
              <tr>
                <Th label="№" col="no" sort={sort} onSort={onSort} style={{ width: 80 }} />
                <th>Поставщик</th><th>Статус</th><th>Типы услуг</th><th>Валюта</th><th>Комиссия/маржа</th>
              </tr>
            </thead>
            {pageRows.length === 0
              ? <tbody><tr><td colSpan={6}><EmptyState title="Поставщики не найдены" /></td></tr></tbody>
              : (
                <tbody>
                  {pageRows.map((s, i) => (
                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setModal(s)}>
                      <td className="t-strong">{s.no}</td>
                      <td className="t-strong">{s.name}</td>
                      <td><Pill tone={SUPPLIER_STATUS[s.status]}>{s.status}</Pill></td>
                      <td><Pill tone={SERVICE_TYPE[s.service]}>{s.service}</Pill></td>
                      <td>{s.currency}</td>
                      <td>{s.commission}</td>
                    </tr>
                  ))}
                </tbody>
              )}
          </table>
          <Pagination page={page} pages={pages} onPage={setPage} />
        </div>
      </div>

      {modal && <SupplierModal supplier={modal} onClose={() => setModal(null)} onDelete={() => { setConfirm(modal); }} />}
      <SupplierAddDrawer open={addOpen} onClose={() => setAddOpen(false)} onCreated={addSupplier} />
      <NewOrgDrawer open={orgOpen} onClose={() => setOrgOpen(false)} />
      <ConfirmDialog open={!!confirm} message="Данное действие невозможно будет отменить!"
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); setModal(null); toast('Поставщик удалён', 'ok'); }} />
    </div>
  );
}

Object.assign(window, { SuppliersPage, SupplierModal });
