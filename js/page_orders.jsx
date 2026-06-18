// ===== Orders: list + detail + multi-step create modal =====

const PAGE_SIZE = 9;

const ALL_SERVICES = ['Авиаперелет', 'Отель', 'Транспорт', 'Страховка', 'Другое', 'ЖД', 'Виза', 'Трансфер'];
// услуга из формы заказа → тип для экрана подбора в карточке заказа (goAddType).
// Страховка / Виза / Другое не имеют экрана поиска — оператор добавит их вручную.
const SEARCH_KIND = { 'Авиаперелет': 'Авиа', 'Отель': 'Гостиница', 'ЖД': 'ЖД', 'Трансфер': 'Трансфер', 'Транспорт': 'Автобус' };

const MOCK_FLIGHTS_DB = [
  {
    id: 1,
    fromCity: 'Ташкент (UZB)', toCity: 'Дубай (DXB)',
    dep: '21.01.26 (18:20)', arr: '22.01.26 (07:50)',
    retDep: '01.02.26 (00:20)', retArr: '02.02.26 (09:50)',
    airline: 'S7 Airlines', cls: 'E Class (Эконом)',
    baggage: 'До 17кг + 5кг ручной', cost: '726$', comm: '1.5$', fees: '1.2$',
  },
  {
    id: 2,
    fromCity: 'Ташкент (UZB)', toCity: 'Дубай (DXB)',
    dep: '21.01.26 (18:20)', arr: '22.01.26 (09:50)',
    retDep: '01.02.26 (00:20)', retArr: '02.02.26 (09:50)',
    airline: 'AviaTraffic', cls: 'C Class (Бизнес класс)',
    baggage: 'До 23кг', cost: '220$', comm: '2.4$', fees: '1.6$',
  },
];

/* ---- Step progress indicator ---- */
function StepIndicator({ step }) {
  const labels = ['Основные параметры', 'Информация о клиенте'];
  const pct = Math.round((step / labels.length) * 100);
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 500, marginBottom: 8 }}>
        {step}. {labels[step - 1]}
      </div>
      <div style={{ height: 3, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'var(--blue)', borderRadius: 999, transition: 'width .35s ease' }} />
      </div>
    </div>
  );
}

/* ---- Client type card ---- */
function TypeCard({ iconName, label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderRadius: 14,
      border: '1.5px solid ' + (selected ? 'var(--blue)' : 'var(--field-line)'),
      background: selected ? 'var(--blue-soft)' : '#fff',
      cursor: 'pointer', width: '100%', textAlign: 'left',
      transition: '.14s', fontFamily: 'inherit',
    }}>
      <Icon name={iconName} style={{ width: 22, height: 22, color: selected ? 'var(--blue)' : 'var(--muted)' }} />
      <span style={{ flex: 1, fontWeight: 500, color: 'var(--ink)', fontSize: 15 }}>{label}</span>
      <span className={'radio' + (selected ? ' on' : '')} />
    </button>
  );
}

/* ---- Document upload button ---- */
function DocUploadBtn({ label, placeholder = 'Добавить паспорт' }) {
  return (
    <div className="field">
      {label && <label className="label">{label}</label>}
      <button type="button" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 12, border: '1px solid var(--field-line)',
        background: '#fff', cursor: 'pointer', width: '100%',
        fontSize: 15, color: 'var(--body)', fontFamily: 'inherit', transition: '.14s',
      }}>
        <span>{placeholder}</span>
        <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
      </button>
    </div>
  );
}

/* ---- Person selector tab ---- */
function PersonTab({ icon = 'user', name, sub, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 13,
      border: '1.5px solid ' + (active ? 'var(--blue)' : 'var(--field-line)'),
      background: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: '.14s',
    }}>
      <Icon name={icon} style={{ width: 20, height: 20, color: active ? 'var(--blue)' : 'var(--muted)' }} />
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{name}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>}
      </div>
      <span className={'radio' + (active ? ' on' : '')} />
    </button>
  );
}

/* ---- Analysis modal (loading / error / expired) ---- */
function AnalysisModal({ phase, clientName, onContinue }) {
  if (!phase) return null;

  const content = {
    loading: {
      icon: <Icon name="loader" style={{ width: 52, height: 52, color: 'var(--blue)', animation: 'spin 1s linear infinite' }} />,
      title: 'Идет анализ документов',
      btn: null,
    },
    error: {
      icon: (
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--red-strong)' }}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      ),
      title: 'Ошибка при анализе документов',
      btn: 'Попробовать снова',
    },
    expired: {
      icon: (
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--red-strong)' }}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            <circle cx="16" cy="16" r="3"/><polyline points="16 14.5 16 16 17 17"/>
          </svg>
        </div>
      ),
      title: 'Истек срок годности паспорта',
      btn: 'Продолжить',
    },
  }[phase];

  return (
    <div className="overlay" style={{ zIndex: 200 }} onMouseDown={(e) => { if (e.target === e.currentTarget && phase !== 'loading') onContinue(); }}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '52px 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          {content.icon}
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{content.title}</div>
          <div style={{ color: 'var(--muted)', fontSize: 15 }}>{clientName}</div>
          {content.btn && (
            <Button variant="primary" onClick={onContinue} style={{ marginTop: 10 }}>{content.btn}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Flight search dropdown ---- */
function FlightSearchBox({ value, onChange, onSelect, svcName }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="search" style={{ width: 200, height: 40 }} onClick={() => setOpen(true)}>
        <Icon name="search" />
        <input
          placeholder={svcName === 'Авиаперелет' ? 'Бишкек - Алматы' : 'Найти'}
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        />
      </div>
      {open && (
        <div className="dropdown" style={{ top: 48, right: 0, minWidth: 220 }}>
          {MOCK_FLIGHTS_DB.map((f) => (
            <div key={f.id} className="dropdown-item"
              onClick={() => { onSelect(f); setOpen(false); onChange(''); }}>
              <span style={{ flex: 1 }}>{f.airline}</span>
              <span style={{ color: 'var(--red-strong)', fontWeight: 700 }}>{f.cost}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Service section in step 3 ---- */
function ServiceSection({ svcName, startDate, endDate, selectedFlight, onSelectFlight }) {
  const [search, setSearch] = useState('');
  const isAvia = svcName === 'Авиаперелет';
  const fl = selectedFlight;

  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>{svcName}</h3>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Начало</div>
          <input className="input" style={{ height: 40, width: 108, fontSize: 13.5 }} value={startDate instanceof Date ? fmtDate(startDate) : (startDate || '21.01.26')} readOnly />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Конец</div>
          <input className="input" style={{ height: 40, width: 108, fontSize: 13.5 }} value={endDate instanceof Date ? fmtDate(endDate) : (endDate || '01.02.26')} readOnly />
        </div>
        <button type="button" style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 13.5, cursor: 'pointer', paddingBottom: 2 }}>Изменить даты</button>
        <select className="select" style={{ width: 160, height: 40, fontSize: 13.5 }}>
          <option value="">Выбрать класс</option>
          <option>Эконом</option><option>Бизнес</option><option>Первый</option>
        </select>
        <select className="select" style={{ width: 130, height: 40, fontSize: 13.5 }}>
          <option value="">Выбрать</option>
          <option>Есть</option><option>Нет</option>
        </select>
        <select className="select" style={{ width: 140, height: 40, fontSize: 13.5 }}>
          <option value="">Выбрать</option>
          <option>Прямой</option><option>С пересадкой</option>
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <FlightSearchBox
            svcName={svcName}
            value={search}
            onChange={setSearch}
            onSelect={onSelectFlight}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 64 }}>Выбрать</th>
              <th>Данные Вылета</th>
              <th>Данные прилета</th>
              <th>Авиакомпания</th>
              <th>Багаж</th>
              <th>Стоимость</th>
              <th>Комиссия</th>
              <th>Сборы</th>
            </tr>
          </thead>
          <tbody>
            {!fl ? (
              <tr>
                <td><span className="radio on" /></td>
                <td colSpan={7} style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                  {isAvia ? 'Выберите перелеты' : `Выберите ${svcName.toLowerCase()}`}
                </td>
              </tr>
            ) : (
              <tr>
                <td><span className="radio on" /></td>
                <td>
                  <div className="t-strong">{fl.fromCity} — {fl.toCity}</div>
                  <div className="t-sub">{fl.dep} — {fl.arr}</div>
                </td>
                <td>
                  <div className="t-strong">{fl.toCity} — {fl.fromCity}</div>
                  <div className="t-sub">{fl.retDep} — {fl.retArr}</div>
                </td>
                <td>
                  <div style={{ color: 'var(--ink)' }}>{fl.airline}</div>
                  <div className="t-sub">{fl.cls}</div>
                </td>
                <td>
                  <div>Есть</div>
                  <div className="t-sub">{fl.baggage}</div>
                </td>
                <td><Pill tone="red">{fl.cost}</Pill></td>
                <td><Pill tone="blue">{fl.comm}</Pill></td>
                <td><Pill tone="blue">{fl.fees}</Pill></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== Main multi-step modal ===== */
function OrderCreateModal({ open, onClose, onCreated }) {
  const toast = useToast();

  // Section 1 — client type
  const [clientType, setClientType] = useState('person'); // 'person' | 'org'
  // Section 2 — client(s)
  const [clientQuery, setClientQuery] = useState('');
  const [selClients, setSelClients] = useState([CLIENTS_DB[0]]); // выбранные физлица
  const [company, setCompany] = useState(COMPANIES_DB[0]);
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyOpen, setCompanyOpen] = useState(false);
  const [employees, setEmployees] = useState(companyStaff(COMPANIES_DB[0].id).employees.slice(0, 1)); // сотрудники компании
  // Section 3 — route
  const [trip, setTrip] = useState('rt'); // rt | ow | mc
  const [pts, setPts] = useState(['SVO', 'DXB']);
  const [depDate, setDepDate] = useState(null);
  const [retDate, setRetDate] = useState(null);
  const [dragIdx, setDragIdx] = useState(null); // index of the route row being dragged
  // Section 4 — services
  const [svc, setSvc] = useState({});
  const [isGroup, setIsGroup] = useState(false); // групповая поездка
  // nested panels
  const [cityPick, setCityPick] = useState(null);   // { idx } — какой пункт маршрута меняем / добавляем
  const [docFor, setDocFor] = useState(null);       // client для «Добавление документа»
  const [bonusFor, setBonusFor] = useState(null);   // client для «Добавление бонусной карты»
  const [empPick, setEmpPick] = useState(false);    // выбор сотрудников (для организации)

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setClientType('person'); setClientQuery('');
    setSelClients([CLIENTS_DB[0]]); setCompany(COMPANIES_DB[0]); setCompanyQuery(''); setCompanyOpen(false); setEmployees(companyStaff(COMPANIES_DB[0].id).employees.slice(0, 1));
    setTrip('rt'); setPts(['SVO', 'DXB']); setDepDate(null); setRetDate(null); setSvc({}); setIsGroup(false);
    setCityPick(null); setDocFor(null); setBonusFor(null); setEmpPick(false);
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  // close the company combobox when clicking outside of it
  const companyRef = useRef(null);
  useEffect(() => {
    if (!companyOpen) return;
    const h = (e) => { if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [companyOpen]);

  if (!open) return null;

  // services offered at order creation → mapped to a picker kind (null = no search screen)
  const ORDER_SVC = [
    ['Авиабилеты', 'Авиа'], ['Ж/д билеты', 'ЖД'], ['Гостиница', 'Гостиница'],
    ['Трансфер', 'Трансфер'], ['Виза', null], ['Страховка', null], ['Доп.услуги', null],
  ];
  const activeServices = ORDER_SVC.filter(([l]) => svc[l]).map(([l]) => l);
  const cityLabel = (code) => { const a = AIRPORTS.find((x) => x.code === code); return a ? `${a.city} (${a.code})` : null; };
  const swapPts = (i) => setPts((p) => { const n = [...p]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n; });
  const removePt = (i) => setPts((p) => p.length > 2 ? p.filter((_, x) => x !== i) : p);
  const addPt = () => { setTrip('mc'); const idx = pts.length; setPts((p) => [...p, '']); setCityPick({ idx }); };
  const dupPt = (i) => setPts((p) => { const n = [...p]; n.splice(i + 1, 0, p[i]); return n; });
  const movePt = (i, dir) => setPts((p) => {
    const j = i + dir;
    if (j < 0 || j >= p.length) return p;
    const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  // "Найти услуги": создаём заказ и открываем вкладку «Услуги» с составом сценария поездки.
  const findServices = () => {
    const clientLabel = clientType === 'org' ? company.name : (selClients[0] ? selClients[0].name : 'Новый клиент');
    const searchKind = activeServices.map((s) => (ORDER_SVC.find(([l]) => l === s) || [])[1]).find(Boolean) || null;
    onCreated({
      no: 51181 + Math.floor(Math.random() * 10),
      client: clientLabel,
      requestType: isGroup ? 'Групповая' : (clientType === 'org' ? 'Корпоративная' : 'Индивидуальная'),
      isGroup,
      service: activeServices[0] || 'Авиа',
      status: 'Новое', operator: 'Даниель', operatorRole: 'Оператор',
      sum: 0, currency: 'USD',
      services: Math.max(1, activeServices.length),
      progress: 0, date: '14.06.26',
    }, searchKind);
    toast('Заказ создан — подберите услуги', 'ok');
    onClose();
  };

  const q = clientQuery.trim().toLowerCase();
  const clientMatches = q ? CLIENTS_DB.filter((c) => !selClients.find((s) => s.id === c.id) &&
    (c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.doc || '').toLowerCase().includes(q))) : [];

  const personMenu = (c, onRemove) => [
    { icon: 'docs', label: 'Добавить документ', onClick: () => setDocFor(c) },
    { icon: 'star', label: 'Бонусная карта', onClick: () => setBonusFor(c) },
    { sep: true },
    { icon: 'trash', label: 'Убрать', danger: true, onClick: onRemove },
  ];

  /* ---- Section header ---- */
  const Sec = ({ n, title, children }) => (
    <div className="oce-sec">
      <div className="oce-sec-h"><span className="n">{n}</span><span className="t">{title}</span></div>
      {children}
    </div>
  );

  const TRIPS = [['rt', 'Туда-обратно'], ['ow', 'В одну сторону'], ['mc', 'Сложный маршрут']];
  const routePts = trip === 'mc' ? pts : pts.slice(0, 2);

  return (
    <>
      <div className="drawer-overlay" style={{ display: 'flex', justifyContent: 'flex-end' }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="scroll" style={{ background: '#fff', width: 'min(560px, 50vw)', height: '100vh',
          overflow: 'auto', boxShadow: 'var(--shadow-modal)', animation: 'slidein .26s cubic-bezier(.2,.9,.3,1)',
          display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '22px 30px 18px', position: 'sticky', top: 0, background: '#fff', zIndex: 2, borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 23, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-.02em' }}>Создание заказа</h2>
              <button type="button" className="modal-close" onClick={onClose}><Icon name="x" /></button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '22px 30px', flex: 1 }}>
            {/* 1 — client type */}
            <Sec n={1} title="Тип клиента">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <TypeCard iconName="building" label="Юридическое лицо" selected={clientType === 'org'} onClick={() => setClientType('org')} />
                <TypeCard iconName="user" label="Физическое лицо" selected={clientType === 'person'} onClick={() => setClientType('person')} />
              </div>
              <div role="button" tabIndex={0} onClick={() => setIsGroup((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 12, padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 11, background: isGroup ? 'var(--blue-soft)' : '#fff' }}>
                <Icon name="users" style={{ width: 18, height: 18, color: 'var(--blue)' }} />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14.5 }}>Групповая поездка</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Бронирование на группу пассажиров с управлением группами</div></div>
                <Toggle on={isGroup} onChange={setIsGroup} style={{ pointerEvents: 'none' }} />
              </div>
            </Sec>

            {/* 2 — client */}
            {clientType === 'person' ? (
              <Sec n={2} title="Физическое лицо">
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <SearchBox value={clientQuery} onChange={setClientQuery} placeholder="Поиск по ФИО, телефону или документу" />
                  {clientMatches.length > 0 && (
                    <div className="dropdown scroll" style={{ top: 46, left: 0, right: 0, maxHeight: 240, overflowY: 'auto', padding: 6 }}>
                      {clientMatches.map((c) => (
                        <div key={c.id} className="dropdown-item" onClick={() => { setSelClients((l) => [...l, c]); setClientQuery(''); }}>
                          <Avatar name={c.name} size={30} />
                          <span style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{c.name}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.phone} · {c.doc}</div></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selClients.map((c) => (
                  <div key={c.id} className="oce-client found">
                    <Icon name="checkCircle" style={{ width: 20, height: 20, color: 'var(--green)', flex: '0 0 20px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm">{c.name} <Pill tone={CLIENT_STATUS[c.status] || 'gray'}>{c.status}</Pill></div>
                      <div className="mt">{c.id} · {c.phone} · {c.doc}</div>
                    </div>
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={personMenu(c, () => setSelClients((l) => l.filter((x) => x.id !== c.id)))} />
                  </div>
                ))}
                <button className="oce-add" onClick={() => { const next = CLIENTS_DB.find((c) => !selClients.find((s) => s.id === c.id)); if (next) setSelClients((l) => [...l, next]); }}>
                  <Icon name="plus" style={{ width: 16, height: 16 }} />Добавить физическое лицо
                </button>
              </Sec>
            ) : (
              <Sec n={2} title="Компания">
                <Field label="Организация">
                  <div style={{ position: 'relative' }} ref={companyRef}>
                    <Input leadIcon="search" value={companyOpen ? companyQuery : company.name}
                      onFocus={() => { setCompanyOpen(true); setCompanyQuery(''); }}
                      onChange={(e) => { setCompanyQuery(e.target.value); setCompanyOpen(true); }}
                      placeholder="Поиск по названию или ИНН" />
                    {companyOpen && (() => {
                      const cq = companyQuery.trim().toLowerCase();
                      const matches = COMPANIES_DB.filter((c) => !cq || c.name.toLowerCase().includes(cq) || c.inn.includes(cq));
                      return (
                        <div className="dropdown scroll" style={{ top: 50, left: 0, right: 0, maxHeight: 260, overflowY: 'auto', padding: 6 }}>
                          {matches.map((c) => (
                            <div key={c.id} className="dropdown-item" style={{ gap: 10 }}
                              onClick={() => { setCompany(c); setCompanyQuery(''); setCompanyOpen(false); setEmployees(companyStaff(c.id).employees.slice(0, 1)); }}>
                              <span className="oce-svc-ic" style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 32px' }}><Icon name="building" style={{ width: 16, height: 16 }} /></span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>ИНН {c.inn} · {c.dir}</div>
                              </span>
                              {company.id === c.id && <Icon name="check" style={{ width: 16, height: 16, color: 'var(--blue)' }} />}
                            </div>
                          ))}
                          {!matches.length && <div style={{ padding: 12, color: 'var(--muted)', fontSize: 14 }}>Ничего не найдено</div>}
                        </div>
                      );
                    })()}
                  </div>
                </Field>
                <div className="oce-client" style={{ marginTop: 10 }}>
                  <span className="oce-svc-ic" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 36px' }}><Icon name="building" style={{ width: 18, height: 18 }} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{company.name}</div><div className="mt">ИНН {company.inn} · {company.dir}</div></div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.02em', margin: '16px 2px 10px' }}>Сотрудники в поездке</div>
                {employees.map((c) => (
                  <div key={c.id} className="oce-client">
                    <Avatar name={c.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{c.name}</div><div className="mt">{c.phone} · {c.doc}</div></div>
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={personMenu(c, () => setEmployees((l) => l.filter((x) => x.id !== c.id)))} />
                  </div>
                ))}
                <button className="oce-add" onClick={() => setEmpPick(true)}><Icon name="users" style={{ width: 16, height: 16 }} />Выберите сотрудников</button>
              </Sec>
            )}

            {/* 3 — route */}
            <Sec n={3} title="Маршрут">
              <div className="trip-toggle" style={{ marginBottom: 14 }}>
                {TRIPS.map(([k, l]) => <button key={k} className={trip === k ? 'on' : ''} onClick={() => setTrip(k)}>{l}</button>)}
              </div>

              <div style={{ marginBottom: 14 }}>
                {trip === 'rt' ? (
                  <DateRangeField label="Даты поездки" startVal={depDate} endVal={retDate}
                    onChange={(s, e) => { setDepDate(s); setRetDate(e); }} placeholder="Туда — обратно" />
                ) : (
                  <DateField label={trip === 'ow' ? 'Дата вылета' : 'Дата начала поездки'} value={depDate} onChange={setDepDate} placeholder="Выбрать дату" />
                )}
              </div>

              {routePts.map((code, i) => (
                <div className={'oce-route-row' + (dragIdx === i ? ' dragging' : '')} key={i}
                  draggable={trip === 'mc'}
                  onDragStart={trip === 'mc' ? () => setDragIdx(i) : undefined}
                  onDragOver={trip === 'mc' ? (e) => e.preventDefault() : undefined}
                  onDrop={trip === 'mc' ? () => {
                    if (dragIdx === null || dragIdx === i) return;
                    setPts((p) => { const n = [...p]; const [moved] = n.splice(dragIdx, 1); n.splice(i, 0, moved); return n; });
                    setDragIdx(null);
                  } : undefined}
                  onDragEnd={trip === 'mc' ? () => setDragIdx(null) : undefined}>
                  {trip === 'mc' && <span className="oce-drag-handle" title="Перетащить для изменения порядка"><Icon name="more" style={{ width: 14, height: 14 }} /></span>}
                  <span className="idx">{i + 1}</span>
                  <div className="oce-city" onClick={() => setCityPick({ idx: i })}>
                    <Icon name="plane" />
                    {cityLabel(code) ? <span>{cityLabel(code)}</span> : <span className="ph">Выберите город</span>}
                  </div>
                  {trip !== 'mc' && i === 0 && (
                    <button className="btn btn-secondary btn-icon btn-sm" title="Поменять местами" onClick={() => swapPts(0)}><Icon name="swap" /></button>
                  )}
                  {trip === 'mc' && (
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={[
                        { icon: 'edit', label: 'Изменить город', onClick: () => setCityPick({ idx: i }) },
                        { icon: 'plus', label: 'Добавить город', onClick: () => { setPts((p) => { const n = [...p]; n.splice(i + 1, 0, ''); return n; }); setCityPick({ idx: i + 1 }); } },
                        { icon: 'copy', label: 'Дублировать город', onClick: () => dupPt(i) },
                        { sep: true },
                        { icon: 'chevUp', label: 'Переместить вверх', onClick: () => movePt(i, -1) },
                        { icon: 'chevDown', label: 'Переместить вниз', onClick: () => movePt(i, 1) },
                        { sep: true },
                        { icon: 'trash', label: 'Удалить город', danger: true, onClick: () => removePt(i) },
                      ]} />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="oce-add" style={{ flex: 1 }} onClick={addPt}><Icon name="plus" style={{ width: 16, height: 16 }} />Добавить город</button>
                <Button variant="secondary" icon="zap" onClick={() => toast('Маршрут оптимизирован', 'ok')}>Оптимизировать</Button>
              </div>
            </Sec>

            {/* 4 — services */}
            <Sec n={4} title="Услуги">
              <div className="oce-svc-grid">
                {ORDER_SVC.map(([l]) => (
                  <div key={l} role="button" tabIndex={0} onClick={() => setSvc((p) => ({ ...p, [l]: !p[l] }))}>
                    <Checkbox on={!!svc[l]} onChange={() => setSvc((p) => ({ ...p, [l]: !p[l] }))} style={{ pointerEvents: 'none' }} />{l}
                  </div>
                ))}
              </div>
            </Sec>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 30px', borderTop: '1px solid var(--line)', position: 'sticky', bottom: 0, background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <div style={{ flex: 1 }} />
            <Button variant="primary" icon="search" onClick={findServices}>Найти услуги</Button>
          </div>
        </div>
      </div>

      {/* nested panels */}
      {cityPick && <CityPickPanel value={pts[cityPick.idx]}
        onClose={() => setCityPick(null)}
        onPick={(code) => { setPts((p) => { const n = [...p]; n[cityPick.idx] = code; return n; }); setCityPick(null); }} />}
      {docFor && <DocumentPanel client={docFor} onClose={() => setDocFor(null)} onSave={() => { toast('Документ добавлен', 'ok'); setDocFor(null); }} />}
      {bonusFor && <BonusCardPanel client={bonusFor} onClose={() => setBonusFor(null)} onSave={() => { toast('Бонусная карта добавлена', 'ok'); setBonusFor(null); }} />}
      {empPick && <EmployeePanel company={company} selected={employees} onClose={() => setEmpPick(false)} onApply={(list) => { setEmployees(list); setEmpPick(false); }} />}
    </>
  );
}

/* ===== Nested panel shell (stacked over the create drawer) ===== */
function StackPanel({ title, onClose, footer, children, width }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div className="drawer-stack" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer-stack-panel scroll" style={width ? { width } : null}>
        <div style={{ padding: '20px 26px 16px', position: 'sticky', top: 0, background: '#fff', zIndex: 2, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div style={{ padding: '20px 26px', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '14px 26px', borderTop: '1px solid var(--line)', position: 'sticky', bottom: 0, background: '#fff', display: 'flex', gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
}

/* small section subhead used inside stacked panels */
function PanelSub({ children, style }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.02em', margin: '20px 2px 10px', ...style }}>
      {children}
    </div>
  );
}

/* ---- city picker ---- */
function CityPickPanel({ value, onPick, onClose }) {
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const popular = ['SVO', 'DME', 'IST', 'DXB', 'ALA', 'TAS'];
  const list = AIRPORTS.filter((a) => !s || a.city.toLowerCase().includes(s) || a.code.toLowerCase().includes(s) || a.name.toLowerCase().includes(s));
  // group airports by city (Москва → SVO / DME / VKO …)
  const groups = [];
  list.forEach((a) => {
    let g = groups.find((x) => x.city === a.city);
    if (!g) { g = { city: a.city, country: a.country, items: [] }; groups.push(g); }
    g.items.push(a);
  });
  return (
    <StackPanel title="Добавление города" onClose={onClose}>
      <SearchBox value={q} onChange={setQ} placeholder="Город или аэропорт" />
      {!s && (
        <>
          <PanelSub>Популярные города</PanelSub>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {popular.map((code) => AIRPORTS.find((x) => x.code === code)).filter(Boolean).map((a) => (
              <button key={a.code} className={'city-chip' + (value === a.code ? ' sel' : '')} onClick={() => onPick(a.code)}>{a.city} ({a.code})</button>
            ))}
          </div>
        </>
      )}
      <PanelSub style={{ margin: '20px 0 6px' }}>Все направления</PanelSub>
      {groups.map((g) => (
        <div key={g.city} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 12px 4px' }}>
            <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14.5 }}>{g.city}</span>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g.country}</span>
          </div>
          {g.items.map((a) => (
            <div key={a.code} className="city-row" onClick={() => onPick(a.code)}>
              <span className="code">{a.code}</span>
              <span style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{a.name}</div></span>
              {value === a.code && <Icon name="check" style={{ width: 18, height: 18, color: 'var(--blue)' }} />}
            </div>
          ))}
        </div>
      ))}
      {!list.length && <EmptyState icon="search" title="Ничего не найдено" />}
    </StackPanel>
  );
}

/* ---- document add ---- */
function DocumentPanel({ client, onClose, onSave }) {
  const [mode, setMode] = useState('ocr'); // 'ocr' | 'manual'
  const [scanned, setScanned] = useState(false);
  return (
    <StackPanel title="Добавление документа" onClose={onClose}
      footer={<><Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Отмена</Button><Button style={{ flex: 1 }} icon="check" onClick={onSave}>Сохранить документ</Button></>}>
      <div className="oce-client" style={{ marginBottom: 16 }}>
        <Avatar name={client.name} size={32} /><div style={{ flex: 1 }}><div className="nm">{client.name}</div><div className="mt">Владелец документа</div></div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <Button variant={mode === 'ocr' ? 'primary' : 'secondary'} icon="zap" style={{ flex: 1 }} onClick={() => setMode('ocr')}>Загрузить документ (OCR)</Button>
        <Button variant={mode === 'manual' ? 'primary' : 'secondary'} icon="edit" style={{ flex: 1 }} onClick={() => setMode('manual')}>Заполнить вручную</Button>
      </div>

      {mode === 'ocr' && (
        <>
          <div onClick={() => setScanned(true)} style={{ border: '1px dashed var(--field-line)', borderRadius: 12, padding: '26px', textAlign: 'center', color: 'var(--muted)', marginBottom: 14, cursor: 'pointer' }}>
            <Icon name="download" style={{ width: 28, height: 28, color: 'var(--muted-2)' }} />
            <div style={{ marginTop: 8, fontWeight: 600, color: 'var(--ink)' }}>Перетащите файл сюда</div>
            <div style={{ margin: '10px 0' }}><Button variant="secondary" size="sm">Выбрать файл</Button></div>
            <div style={{ fontSize: 12.5 }}>Поддерживаемые форматы: JPG, PNG, PDF</div>
            <div style={{ fontSize: 12.5 }}>Максимальный размер файла: 10 МБ</div>
          </div>
          {scanned && (
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 11, background: 'var(--green-bg)', border: '1px solid var(--green)', marginBottom: 18 }}>
              <Icon name="checkCircle" style={{ width: 18, height: 18, color: 'var(--green)', flex: '0 0 18px', marginTop: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--body)' }}>Документ распознан системой. Проверьте данные и при необходимости отредактируйте их.</span>
            </div>
          )}
        </>
      )}

      <PanelSub style={{ marginTop: 6 }}>Данные документа</PanelSub>
      <div className="form-grid">
        <Field label="Тип документа"><select className="select"><option>Загранпаспорт</option><option>Паспорт РФ</option><option>ID-карта</option></select></Field>
        <Field label="Гражданство"><select className="select"><option>Российская Федерация</option><option>Кыргызстан</option><option>Казахстан</option></select></Field>
        <Field label="Номер документа"><Input placeholder="71 1234567" /></Field>
        <DateField label="Срок действия" value={null} onChange={() => {}} placeholder="Выбрать дату" />
      </div>

      <PanelSub>Данные владельца</PanelSub>
      <div className="form-grid">
        <Field label="Фамилия (лат.)"><Input placeholder="IVANOV" /></Field>
        <Field label="Имя (лат.)"><Input placeholder="IVAN" /></Field>
        <Field label="Отчество (лат.)"><Input placeholder="IVANOVICH" /></Field>
        <DateField label="Дата рождения" value={null} onChange={() => {}} placeholder="Выбрать дату" />
      </div>

      <PanelSub>Контактная информация</PanelSub>
      <div className="form-grid">
        <Field label="Основной телефон"><Input placeholder="+7 (___) ___-__-__" /></Field>
        <Field label="Дополнительный телефон"><Input placeholder="+7 (___) ___-__-__" /></Field>
      </div>

      <PanelSub>Дополнительная информация <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--faint)' }}>(необязательно)</span></PanelSub>
      <textarea className="input" rows={3} placeholder="Комментарий к документу" style={{ resize: 'vertical' }} />
    </StackPanel>
  );
}

/* ---- bonus card add ---- */
const LOYALTY_PROGRAMS = [
  { name: 'Аэрофлот Бонус',       type: 'Авиакомпания', popular: true },
  { name: 'S7 Priority',          type: 'Авиакомпания', popular: true },
  { name: 'Miles & More',         type: 'Авиакомпания', popular: true },
  { name: 'Turkish Miles&Smiles', type: 'Авиакомпания', popular: true },
  { name: 'РЖД Бонус',            type: 'Ж/Д' },
  { name: 'Marriott Bonvoy',      type: 'Отель' },
  { name: 'Accor ALL',            type: 'Отель' },
];
function BonusCardPanel({ client, onClose, onSave }) {
  const [program, setProgram] = useState(null);
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(true);
  const [extra, setExtra] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const Logo = ({ p }) => (
    <span style={{ width: 30, height: 30, flex: '0 0 30px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--blue)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {p.name.slice(0, 2).toUpperCase()}
    </span>
  );
  return (
    <StackPanel title="Добавление бонусной карты" onClose={onClose}
      footer={<><Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Отмена</Button><Button style={{ flex: 1 }} icon="check" onClick={onSave}>Сохранить карту</Button></>}>
      <div className="oce-client" style={{ marginBottom: 16 }}>
        <Avatar name={client.name} size={32} /><div style={{ flex: 1 }}><div className="nm">{client.name}</div><div className="mt">Держатель карты</div></div>
      </div>

      <Field label="1. Программа лояльности">
        <div style={{ position: 'relative' }} ref={ref}>
          <div className="input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => setOpen((o) => !o)}>
            <span style={{ flex: 1, color: program ? 'var(--ink)' : 'var(--faint)' }}>{program ? program.name : 'Выберите программу лояльности'}</span>
            <Icon name="chevDown" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
          </div>
          {open && (
            <div className="dropdown scroll" style={{ top: 50, left: 0, right: 0, maxHeight: 280, overflowY: 'auto', padding: 6 }}>
              <PanelSub style={{ margin: '6px 8px 4px' }}>Популярные программы</PanelSub>
              {LOYALTY_PROGRAMS.filter((p) => p.popular).map((p) => (
                <div key={p.name} className="dropdown-item" style={{ gap: 10 }} onClick={() => { setProgram(p); setOpen(false); }}>
                  <Logo p={p} /><span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span><Pill tone="blue">{p.type}</Pill>
                </div>
              ))}
              <div className="dropdown-sep" />
              {LOYALTY_PROGRAMS.filter((p) => !p.popular).map((p) => (
                <div key={p.name} className="dropdown-item" style={{ gap: 10 }} onClick={() => { setProgram(p); setOpen(false); }}>
                  <Logo p={p} /><span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span><Pill tone="gray">{p.type}</Pill>
                </div>
              ))}
            </div>
          )}
        </div>
      </Field>

      <Field label="2. Тип программы">
        <Input value={program ? program.type : ''} placeholder="Определяется автоматически" readOnly />
      </Field>
      <Field label="3. Номер участника"><Input placeholder="Введите номер карты / участника" /></Field>
      <Field label={<>4. Статус <span style={{ fontWeight: 400, color: 'var(--faint)' }}>(необязательно)</span></>}>
        <select className="select"><option value="">Выберите статус</option><option>Базовый</option><option>Серебряный</option><option>Золотой</option><option>Платиновый</option></select>
      </Field>

      <div role="button" tabIndex={0} onClick={() => setAuto((v) => !v)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 12 }}>
        <Checkbox on={auto} onChange={setAuto} style={{ pointerEvents: 'none' }} />
        <span><div style={{ fontWeight: 600, color: 'var(--ink)' }}>Использовать автоматически</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Подставлять карту в бронированиях автоматически</div></span>
      </div>

      <button type="button" onClick={() => setExtra((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'var(--blue)', fontWeight: 600, padding: 0, margin: '18px 0 0' }}>
        Дополнительная информация (необязательно)
        <Icon name={extra ? 'chevUp' : 'chevDown'} style={{ width: 16, height: 16 }} />
      </button>
      {extra && <textarea className="input" rows={3} placeholder="Комментарий" style={{ resize: 'vertical', marginTop: 10 }} />}

      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 11, background: 'var(--blue-soft)', marginTop: 18 }}>
        <Icon name="alertCircle" style={{ width: 17, height: 17, color: 'var(--blue)', flex: '0 0 17px', marginTop: 1 }} />
        <span style={{ fontSize: 12.5, color: 'var(--body)' }}>Бонусные карты подставляются в подходящие услуги автоматически при бронировании. Их можно изменить в профиле клиента.</span>
      </div>
    </StackPanel>
  );
}

/* ---- employee picker (org) — department-aware: pick a whole department/group or search by name ---- */
function EmployeePanel({ company, selected, onApply, onClose }) {
  const [q, setQ] = useState('');
  const [deptFilter, setDeptFilter] = useState(''); // '' = all departments
  const [picked, setPicked] = useState(selected.map((c) => c.id));
  const [newMode, setNewMode] = useState(false);
  const staff = companyStaff(company ? company.id : null);
  const s = q.trim().toLowerCase();
  const list = staff.employees.filter((c) =>
    (!deptFilter || c.dept === deptFilter) &&
    (!s || c.name.toLowerCase().includes(s) || c.phone.includes(s)));
  const toggle = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleDept = (deptId) => {
    const ids = staff.employees.filter((c) => c.dept === deptId).map((c) => c.id);
    const allIn = ids.every((id) => picked.includes(id));
    setPicked((p) => allIn ? p.filter((id) => !ids.includes(id)) : [...new Set([...p, ...ids])]);
  };
  const apply = () => onApply(staff.employees.filter((c) => picked.includes(c.id)));
  return (
    <StackPanel title={newMode ? 'Новый сотрудник' : 'Выбор сотрудников'} onClose={onClose}
      footer={newMode
        ? <><Button variant="secondary" style={{ flex: 1 }} onClick={() => setNewMode(false)}>Назад</Button><Button style={{ flex: 1 }} icon="check" onClick={() => setNewMode(false)}>Добавить</Button></>
        : <><Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Отмена</Button><Button style={{ flex: 1 }} icon="check" onClick={apply}>Применить{picked.length ? ` (${picked.length})` : ''}</Button></>}>
      {newMode ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', border: '1px dashed var(--field-line)', borderRadius: 12, marginBottom: 4 }}>
            <span className="avatar-ph" style={{ width: 52, height: 52, fontSize: 18 }}><Icon name="user" style={{ width: 24, height: 24 }} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>Перетащите фото или</div>
              <Button variant="secondary" size="sm" style={{ marginTop: 6 }}>Выбрать файл</Button>
            </div>
          </div>

          <PanelSub>Личные данные</PanelSub>
          <div className="form-grid">
            <Field label="Фамилия" required><Input placeholder="Введите значение" /></Field>
            <Field label="Имя" required><Input placeholder="Введите значение" /></Field>
            <Field label="Отчество"><Input placeholder="Введите значение" /></Field>
            <Field label="Пол"><select className="select"><option value="">Не указан</option><option>Мужской</option><option>Женский</option></select></Field>
            <DateField label="Дата рождения" value={null} onChange={() => {}} placeholder="Выбрать дату" />
            <Field label="Гражданство"><select className="select"><option>Российская Федерация</option><option>Кыргызстан</option><option>Казахстан</option></select></Field>
          </div>

          <PanelSub>Контактная информация</PanelSub>
          <div className="form-grid">
            <Field label="Телефон"><Input placeholder="+7 (___) ___-__-__" /></Field>
            <Field label="Email"><Input placeholder="name@company.ru" /></Field>
            <Field label="Должность"><Input placeholder="Введите должность" /></Field>
            <Field label="Отдел"><Input placeholder="Введите отдел" /></Field>
          </div>

          <PanelSub>Документ <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--faint)' }}>(необязательно)</span></PanelSub>
          <div className="form-grid">
            <Field label="Тип документа"><select className="select"><option>Загранпаспорт</option><option>Паспорт РФ</option><option>ID-карта</option></select></Field>
            <Field label="Номер документа"><Input placeholder="Серия и номер" /></Field>
          </div>
        </>
      ) : (
        <>
          {staff.departments.length > 0 && (
            <>
              <PanelSub style={{ margin: '0 0 10px' }}>Отделы и тревел-группы</PanelSub>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                <div role="button" tabIndex={0} className="oce-client" style={{ cursor: 'pointer', background: !deptFilter ? 'var(--blue-soft)' : '#fff' }} onClick={() => setDeptFilter('')}>
                  <span className="oce-svc-ic" style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 32px' }}><Icon name="users" style={{ width: 16, height: 16 }} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="nm">Все сотрудники</div><div className="mt">{staff.employees.length} чел.</div></div>
                </div>
                {staff.departments.map((d) => {
                  const deptEmployees = staff.employees.filter((c) => c.dept === d.id);
                  const allIn = deptEmployees.length > 0 && deptEmployees.every((c) => picked.includes(c.id));
                  return (
                    <div key={d.id} className="oce-client" style={{ background: deptFilter === d.id ? 'var(--blue-soft)' : '#fff' }}>
                      <div role="button" tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setDeptFilter(d.id)}>
                        <span className="oce-svc-ic" style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 32px' }}><Icon name="briefcase" style={{ width: 16, height: 16 }} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{d.name}</div><div className="mt">{deptEmployees.length} чел. · политика: {d.policy}</div></div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => toggleDept(d.id)}>{allIn ? 'Убрать всех' : 'Выбрать всех'}</Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <SearchBox value={q} onChange={setQ} placeholder="Поиск сотрудника по ФИО или телефону" />
          <div style={{ marginTop: 12 }}>
            {list.map((c) => (
              <div key={c.id} role="button" tabIndex={0} className="oce-client" style={{ cursor: 'pointer' }} onClick={() => toggle(c.id)}>
                <Checkbox on={picked.includes(c.id)} onChange={() => toggle(c.id)} style={{ pointerEvents: 'none' }} />
                <Avatar name={c.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{c.name}</div><div className="mt">{c.phone} · {c.doc}</div></div>
              </div>
            ))}
            {!list.length && <EmptyState icon="users" title="Сотрудники не найдены" sub="Измените фильтр или добавьте нового сотрудника" />}
          </div>
          <button className="oce-add" style={{ marginTop: 6 }} onClick={() => setNewMode(true)}><Icon name="plus" style={{ width: 16, height: 16 }} />Новый сотрудник</button>
        </>
      )}
    </StackPanel>
  );
}

/* ===== Orders list ===== */
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

/* ===== Orders page root ===== */
function OrdersPage({ intent, onConsume, orders, addOrder, onDetailChange }) {
  const [detail, setDetailRaw] = useState(null);
  const [detailTab, setDetailTab] = useState(null);
  const [svcSearch, setSvcSearch] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [fresh, setFresh] = useState(false); // just-created order → show onboarding hint
  const setDetail = (o, tab) => { setFresh(false); setDetailRaw(o); setDetailTab(tab || null); setSvcSearch(null); onDetailChange && onDetailChange(o); };
  // after "Найти услуги": add the order and land on the full "Услуги" tab
  const handleCreated = (o, searchKind) => {
    addOrder(o); setCreateOpen(false);
    setFresh(true); setDetailRaw(o); setDetailTab('services'); setSvcSearch(searchKind || null);
    onDetailChange && onDetailChange(o);
  };
  useEffect(() => {
    if (!intent) return;
    if (intent.type === 'create') setCreateOpen(true);
    if (intent.type === 'open') setDetail(intent.order, intent.tab);
    onConsume();
  }, [intent]);

  if (detail) return <OrderCard order={detail} fresh={fresh} initTab={detailTab} initSvcSearch={svcSearch} onBack={() => setDetail(null)} />;
  return (
    <>
      <OrdersList orders={orders} onOpen={setDetail} onCreate={() => setCreateOpen(true)} />
      <OrderCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </>
  );
}

Object.assign(window, { OrdersPage, OrdersList });
