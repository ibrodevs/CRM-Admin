// ===== Orders: list + detail + multi-step create modal =====

const PAGE_SIZE = 9;

const ALL_SERVICES = ['Авиаперелет', 'Отель', 'Транспорт', 'Страховка', 'Другое', 'ЖД', 'Виза', 'Трансфер'];

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
  const labels = ['Основные параметры', 'Информация о клиенте', 'Добавление услуг'];
  const pct = Math.round((step / 3) * 100);
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
          <input className="input" style={{ height: 40, width: 108, fontSize: 13.5 }} value={startDate || '21.01.26'} readOnly />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Конец</div>
          <input className="input" style={{ height: 40, width: 108, fontSize: 13.5 }} value={endDate || '01.02.26'} readOnly />
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

  // phase: 'step1' | 'step2' | 'analyzing' | 'error' | 'expired' | 'step3'
  const [phase, setPhase] = useState('step1');

  // Step 1
  const [clientType, setClientType] = useState('person');
  const [numPersons, setNumPersons] = useState('1');
  const [svc, setSvc] = useState({});
  const [currency, setCurrency] = useState('');
  const [numDays, setNumDays] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [specialCase, setSpecialCase] = useState('');
  const [operator, setOperator] = useState('');
  const [travelStatement, setTravelStatement] = useState(false);

  // Step 2
  const [currentPersonIdx, setCurrentPersonIdx] = useState(0);
  const [persons, setPersons] = useState([{}]);

  // Step 3 — selectedFlight per service name
  const [selectedFlights, setSelectedFlights] = useState({});

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setPhase('step1');
    setClientType('person'); setNumPersons('1');
    setSvc({}); setCurrency(''); setNumDays('');
    setStartDate(''); setEndDate(''); setSpecialCase('');
    setOperator(''); setTravelStatement(false);
    setCurrentPersonIdx(0); setPersons([{}]);
    setSelectedFlights({});
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  if (!open) return null;

  const numP = Math.max(1, parseInt(numPersons) || 1);
  const activeServices = ALL_SERVICES.filter((s) => svc[s]);

  const personName = (idx) => {
    const p = persons[idx];
    if (!p) return clientType === 'org' ? `Организация ${idx + 1}` : `Физическое лицо ${idx + 1}`;
    const name = [p.lastName, p.firstName].filter(Boolean).join(' ');
    return name || (clientType === 'org' ? `Организация ${idx + 1}` : `Физическое лицо ${idx + 1}`);
  };
  const isPersonFilled = (idx) => {
    const p = persons[idx];
    return !!(p && (p.lastName || p.firstName));
  };

  const setPerson = (idx, field, value) => {
    setPersons((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const ensurePersons = (n) => {
    setPersons((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({});
      return next.slice(0, n);
    });
  };

  const goStep2 = () => {
    ensurePersons(numP);
    setCurrentPersonIdx(0);
    setPhase('step2');
  };

  const goAnalyze = () => {
    setPhase('loading');
    setTimeout(() => setPhase('expired'), 1600);
  };

  const handleAnalysisAction = () => {
    if (phase === 'error') { setPhase('loading'); setTimeout(() => setPhase('expired'), 1600); }
    else setPhase('step3');
  };

  const submitOrder = () => {
    const clientLabel = isPersonFilled(0)
      ? personName(0)
      : (clientType === 'org' ? 'Новая организация' : 'Новый клиент');
    onCreated({
      no: 51181 + Math.floor(Math.random() * 10),
      client: clientLabel,
      requestType: 'Индивидуальная',
      service: activeServices[0] || 'Авиа',
      status: 'Новое', operator: operator || 'Даниель', operatorRole: 'Оператор',
      sum: 0, currency: currency || 'USD',
      services: Math.max(1, activeServices.length),
      progress: 0, date: '14.06.26',
    });
    toast('Заказ создан', 'ok');
    onClose();
  };

  /* ---- Render step 1 ---- */
  const renderStep1 = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px' }}>
      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TypeCard iconName="user" label="Физическое лицо" selected={clientType === 'person'} onClick={() => setClientType('person')} />
          <TypeCard iconName="users" label="Организация" selected={clientType === 'org'} onClick={() => setClientType('org')} />
        </div>
        <Field label="Количество лиц">
          <Input placeholder="Введите значение" value={numPersons} onChange={(e) => setNumPersons(e.target.value)} type="number" min="1" />
        </Field>
        <div>
          {ALL_SERVICES.map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 15, color: 'var(--body)' }}>{s}</span>
              <Toggle on={!!svc[s]} onChange={(v) => setSvc((p) => ({ ...p, [s]: v }))} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 22, marginTop: 12 }}>
            <button type="button" style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}
              onClick={() => { const anyOn = Object.values(svc).some(Boolean); const ns = {}; ALL_SERVICES.forEach((s) => { ns[s] = !anyOn; }); setSvc(ns); }}>
              Выбрать все
            </button>
            <button type="button" style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
              Добавить индивидуальный пакет
            </button>
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Валюта расчета">
          <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="">Выбрать</option>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Количество дней">
          <Input placeholder="Введите значение" value={numDays} onChange={(e) => setNumDays(e.target.value)} type="number" min="1" />
        </Field>
        <Field label="Выбор периода отдыха">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>Начало</div>
              <Input placeholder="Введите дату" value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>Конец</div>
              <Input placeholder="Введите дату" value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" />
            </div>
          </div>
          <button type="button" style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: '4px 0 0', textAlign: 'left' }}>
            Указать индивидуальные даты
          </button>
        </Field>
        <Field label="Особые случаи">
          <select className="select" value={specialCase} onChange={(e) => setSpecialCase(e.target.value)}>
            <option value="">Выбрать</option>
            <option>День рождения</option><option>Медовый месяц</option><option>Юбилей</option>
          </select>
        </Field>
        <Field label="Оператор">
          <select className="select" value={operator} onChange={(e) => setOperator(e.target.value)}>
            <option value="">Выбрать</option>
            {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <span style={{ fontSize: 15, color: 'var(--body)', fontWeight: 500 }}>Выписка о путешествии</span>
          <Toggle on={travelStatement} onChange={setTravelStatement} />
        </div>
      </div>
    </div>
  );

  /* ---- Render step 2 ---- */
  const renderStep2 = () => {
    const p = persons[currentPersonIdx] || {};
    const set = (field) => (e) => setPerson(currentPersonIdx, field, e.target ? e.target.value : e);
    return (
      <div>
        {/* Person tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {Array.from({ length: numP }).map((_, i) => (
            <PersonTab
              key={i}
              name={personName(i)}
              sub={isPersonFilled(i) ? 'Данные заполнены' : 'Заполните данные'}
              active={currentPersonIdx === i}
              onClick={() => setCurrentPersonIdx(i)}
            />
          ))}
        </div>

        {/* Form */}
        <div className="form-grid" style={{ marginBottom: 24 }}>
          <Field label="Фамилия">
            <Input placeholder="Введите значение" value={p.lastName || ''} onChange={set('lastName')} />
          </Field>
          <Field label="Дата рождения">
            <Input placeholder="Введите значение" value={p.dob || ''} onChange={set('dob')} type="date" />
          </Field>
          <Field label="Имя">
            <Input placeholder="Введите значение" value={p.firstName || ''} onChange={set('firstName')} />
          </Field>
          <Field label="ИНН">
            <Input placeholder="Введите значение" value={p.inn || ''} onChange={set('inn')} />
          </Field>
          <Field label="Отчество">
            <Input placeholder="Введите значение" value={p.middleName || ''} onChange={set('middleName')} />
          </Field>
          <Field label="Наличие визы">
            <select className="select" value={p.visa || ''} onChange={set('visa')}>
              <option value="">Выбрать</option>
              <option>Есть</option><option>Нет</option><option>В процессе</option>
            </select>
          </Field>
          <Field label="Гражданство">
            <Input placeholder="Введите значение" value={p.citizenship || ''} onChange={set('citizenship')} />
          </Field>
          <Field label="Пол">
            <select className="select" value={p.gender || ''} onChange={set('gender')}>
              <option value="">Выбрать</option>
              <option>Мужской</option><option>Женский</option>
            </select>
          </Field>
        </div>

        {/* Document uploads */}
        <div className="form-grid">
          <DocUploadBtn label="Фото паспорта" placeholder="Добавить паспорт" />
          <DocUploadBtn label="Фото визы (при наличии)" placeholder="Добавить паспорт" />
          <div className="full">
            <DocUploadBtn label="Иные документы (при наличии)" placeholder="Добавить документ" />
          </div>
        </div>
      </div>
    );
  };

  /* ---- Render step 3 ---- */
  const renderStep3 = () => {
    const shownServices = activeServices.length > 0 ? activeServices : ['Авиаперелет', 'Отель'];
    return (
      <div>
        {/* Person tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <PersonTab name="Для всех физических лиц" active={true} onClick={() => {}} />
          {Array.from({ length: numP }).map((_, i) => (
            <PersonTab
              key={i}
              name={personName(i)}
              sub={isPersonFilled(i) ? 'Данные заполнены' : 'Заполните данные'}
              active={false}
              onClick={() => {}}
            />
          ))}
        </div>

        {shownServices.map((sName) => (
          <ServiceSection
            key={sName}
            svcName={sName}
            startDate={startDate}
            endDate={endDate}
            selectedFlight={selectedFlights[sName]}
            onSelectFlight={(f) => setSelectedFlights((prev) => ({ ...prev, [sName]: f }))}
          />
        ))}
      </div>
    );
  };

  /* ---- Layout ---- */
  const isStep3 = phase === 'step3';
  const isAnalysis = phase === 'loading' || phase === 'error' || phase === 'expired';
  const stepNum = phase === 'step1' ? 1 : phase === 'step2' ? 2 : 3;

  // Analysis modal — renders independently, no panel
  if (isAnalysis) {
    return <AnalysisModal phase={phase} clientName={personName(0)} onContinue={handleAnalysisAction} />;
  }

  return (
    <>
      {/* Overlay + panel */}
      <div
        className="drawer-overlay"
        style={isStep3
          ? { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }
          : { display: 'flex', justifyContent: 'flex-end' }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="scroll"
          style={isStep3
            ? {
                background: '#fff', borderRadius: 22,
                boxShadow: 'var(--shadow-modal)',
                width: 'min(1160px, 94vw)', maxHeight: '92vh', overflow: 'auto',
                animation: 'pop .2s cubic-bezier(.2,.9,.3,1)',
                display: 'flex', flexDirection: 'column',
              }
            : {
                background: '#fff', width: 'min(680px, 58vw)', height: '100vh',
                overflow: 'auto', boxShadow: 'var(--shadow-modal)',
                animation: 'slidein .26s cubic-bezier(.2,.9,.3,1)',
                display: 'flex', flexDirection: 'column',
              }}
        >
          {/* Header — sticky */}
          <div style={{
            padding: '26px 36px 20px', position: 'sticky', top: 0,
            background: '#fff', zIndex: 2,
            borderBottom: isStep3 ? '1px solid var(--line)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-.02em' }}>
                Добавление заказа
              </h2>
              <button type="button" className="modal-close" onClick={onClose}><Icon name="x" /></button>
            </div>
            <StepIndicator step={stepNum} />
          </div>

          {/* Body */}
          <div style={{ padding: '24px 36px', flex: 1 }}>
            {phase === 'step1' && renderStep1()}
            {phase === 'step2' && renderStep2()}
            {phase === 'step3' && renderStep3()}
          </div>

          {/* Footer — sticky */}
          <div style={{
            padding: '18px 36px', borderTop: '1px solid var(--line)',
            position: 'sticky', bottom: 0, background: '#fff',
          }}>
            {phase === 'step1' && (
              <Button variant="primary" iconRight="arrowRight" onClick={goStep2}>
                Продолжить заполнение
              </Button>
            )}
            {phase === 'step2' && (
              <Button variant="primary" iconRight="arrowRight" onClick={goAnalyze}>
                Продолжить заполнение
              </Button>
            )}
            {phase === 'step3' && (
              <Button variant="primary" iconRight="arrowRight" onClick={submitOrder}>
                Продолжить заполнение
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
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

/* ===== Order detail ===== */
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

/* ===== Orders page root ===== */
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
      <OrderCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={addOrder} />
    </>
  );
}

Object.assign(window, { OrdersPage, OrderDetail, OrdersList });
