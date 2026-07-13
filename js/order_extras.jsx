// ===== Order extras: extended detail, passport modal, fee/passenger/org drawers =====

/* ---------- Collapsible card section ---------- */
function CollapseSection({ title, note, noteWarn, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion">
      <div className="acc-head" onClick={() => setOpen((o) => !o)}>
        <div>
          <div className="acc-title">{title}</div>
          {note && <div className={'acc-note' + (noteWarn ? ' warn' : '')}>{note}</div>}
        </div>
        <Icon name="chevDown" className={'acc-chev' + (open ? ' open' : '')} />
      </div>
      {open && <div className="acc-body" style={{ paddingTop: 18 }}>{children}</div>}
    </div>
  );
}

/* ---------- Passport / document verification modal ---------- */
const PASS_DOCTYPES = [
  { key: 'id', label: 'ID Card', icon: 'idcard' },
  { key: 'pass', label: 'Паспорт', icon: 'users' },
  { key: 'visa', label: 'Visa', icon: 'users' },
  { key: 'bank', label: 'Банковская выписка', icon: 'bank' },
];
function PassportModal({ passenger, participants, onClose, onAddDoc }) {
  const toast = useToast();
  const [docType, setDocType] = useState('pass');
  const [q, setQ] = useState('');
  // build the passenger list from the real order roster (can be 20+), not a hardcoded pair
  const source = (participants && participants.length)
    ? participants
    : [{ name: passenger || 'Меркель Александр', docStatus: 'check' }, { name: 'Аттокуров Эрбол', docStatus: 'ok' }];
  const pax = source.map((p) => ({
    name: p.name,
    sub: p.docStatus === 'check' ? 'Требует проверки' : (p.doc || 'Документы в порядке'),
    expired: p.docStatus === 'check',
  }));
  const initIdx = Math.max(0, pax.findIndex((p) => p.name === passenger));
  const [activePax, setActivePax] = useState(initIdx);
  const cur = pax[activePax] || pax[0];
  const showSearch = pax.length > 6;
  const s = q.trim().toLowerCase();
  const filtered = pax.map((p, i) => ({ p, i })).filter(({ p }) => !s || p.name.toLowerCase().includes(s));
  return (
    <Drawer open onClose={onClose} width="min(720px,96vw)"
      title="Документация" sub="Заказ № 51162 ОсОО «Гранд лимитед» от 23.12.25"
      footer={<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
        <Button variant="secondary" icon="plus" onClick={() => onAddDoc && onAddDoc(cur ? { name: cur.name } : null)}>Добавить документ</Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" iconRight="chevRight" onClick={() => toast('Открываю документ', 'info')}>Посмотреть документ</Button>
        <Button variant="secondary" onClick={() => toast('Данные подтверждены', 'ok')}>Подтвердить данные</Button>
        <Button variant="primary" iconRight="chevRight" onClick={() => { toast('Документ подписан', 'ok'); onClose(); }}>Подписать</Button>
      </div>}>
      {/* тип документа */}
      <PanelSub style={{ marginTop: 0 }}>Тип документа</PanelSub>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {PASS_DOCTYPES.map((d) => (
          <button key={d.key} onClick={() => setDocType(d.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 13, border: '1px solid ' + (docType === d.key ? 'var(--blue)' : 'var(--field-line)'), background: docType === d.key ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <Icon name={d.icon} style={{ width: 20, height: 20, color: 'var(--blue)' }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{d.label}</span>
            <span className={'radio' + (docType === d.key ? ' on' : '')} />
          </button>
        ))}
      </div>

      {/* пассажир */}
      <PanelSub>Пассажир</PanelSub>
      {showSearch && <div style={{ marginBottom: 12 }}><SearchBox value={q} onChange={setQ} placeholder="Поиск пассажира по ФИО" /></div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxHeight: 260, overflowY: 'auto', paddingRight: filtered.length > 6 ? 4 : 0 }}>
        {filtered.map(({ p, i }) => (
          <button key={i} onClick={() => setActivePax(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 13, border: '1px solid ' + (activePax === i ? 'var(--blue)' : 'var(--field-line)'), background: activePax === i ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <Avatar name={p.name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div><div className="t-sub">{p.sub}</div></div>
            <span className={'radio' + (activePax === i ? ' on' : '')} />
          </button>
        ))}
        {filtered.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, gridColumn: '1 / -1' }}>Пассажиры не найдены</div>}
      </div>

      {/* скан документа */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', paddingTop: 34, marginTop: 12 }}>
        <div className="badge-tip" style={{ left: '50%', top: 6, background: cur.expired ? '#ec4444' : '#f5a623' }}>
          {cur.expired ? 'Просроченный паспорт' : 'До окончания срока: 3 месяца'}
        </div>
        <div style={{ width: 250, height: 320, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)',
          background: 'repeating-linear-gradient(45deg, #eef3ee, #eef3ee 11px, #e4ece4 11px, #e4ece4 22px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#7c8a7c', letterSpacing: '.04em' }}>скан паспорта</span>
        </div>
      </div>
    </Drawer>
  );
}

/* ---------- Fee drawer (Создание сбора) ---------- */
function FeeDrawer({ open, onClose }) {
  const toast = useToast();
  const empty = { service: '', feeType: '', value: '', tax: '', currency: 'USD', comment: '' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target ? e.target.value : e }));
  useEffect(() => { if (open) { setF(empty); setErrs({}); } }, [open]);
  const submit = () => {
    const er = {};
    if (!f.service) er.service = 'Выберите тип услуги';
    if (!f.feeType) er.feeType = 'Выберите тип сбора';
    if (!f.value) er.value = 'Введите значение';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    toast('Сбор создан', 'ok'); onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title="Создание сбора"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" onClick={submit}>Создать</Button></>}>
      <div className="form-grid">
        <Field label="Тип услуги" required error={errs.service}><Select placeholder="Выберите тип" options={['Авиа', 'Отель', 'Виза', 'Трансфер']} value={f.service} onChange={set('service')} error={errs.service} /></Field>
        <Field label="Тип сбора" required error={errs.feeType}><Select placeholder="Выберите тип" options={['Процентный (%)', 'Фиксированная сумма']} value={f.feeType} onChange={set('feeType')} error={errs.feeType} /></Field>
        <Field label="Значение" required error={errs.value}><Input placeholder="Введите значение" value={f.value} onChange={set('value')} error={errs.value} /></Field>
        <Field label="Такса"><Input placeholder="Введите таксу" value={f.tax} onChange={set('tax')} /></Field>
        <div className="full"><Field label="Валюта"><Select options={CURRENCIES.map((c) => c.code)} value={f.currency} onChange={set('currency')} /></Field></div>
        <div className="full"><Field label="Комментарий"><textarea className="input" rows={4} placeholder="Descriptions..." value={f.comment} onChange={set('comment')} /></Field></div>
      </div>
    </Drawer>
  );
}

/* ---------- Passenger drawer (Добавить пассажира) ---------- */
// Добавление пассажира — единая форма (forms_unified.jsx).
function PassengerDrawer({ open, onClose, onAdd }) {
  const toast = useToast();
  return (
    <UnifiedPersonDrawer open={open} kind="person" mode="create" showRole title="Добавить пассажира"
      onClose={onClose}
      onSave={(person, client) => { onAdd && onAdd(client); toast('Пассажир добавлен', 'ok'); onClose(); }} />
  );
}

/* ---------- New organization drawer (Новая организация) ---------- */
// Эмуляция автоподгрузки реквизитов организации по ИНН (в проде — запрос к сервису проверки контрагентов).
const ORG_REGISTRY = {
  '02208200512345': {
    full: 'ОсОО "Asia Travel"', short: 'Asia Travel', orgType: 'Турагент', currency: 'KGS',
    kpp: '020801001', ogrn: '124047000123', okpo: '2291055',
    legalAddr: 'г. Ош, ул. Курманжан Датка 12', factAddr: 'г. Ош, ул. Курманжан Датка 12',
    phone: '+996 312 555 444', email: 'office@asia.kg',
    account: '1090000111223344', bank: 'Оптима Банк · БИК 109018',
  },
  '07070707070707': {
    full: 'ОсОО "Гранд лимитед"', short: 'Гранд лимитед', orgType: 'Туроператор', currency: 'KGS',
    kpp: '070701001', ogrn: '124047000707', okpo: '8362411',
    legalAddr: 'г. Бишкек, ул. Токтогула 125/1', factAddr: 'г. Бишкек, ул. Токтогула 125/1',
    phone: '+996 777 777 777', email: 'grandlimited@mail.ru',
    account: '1240020000123456', bank: 'Демир Банк · БИК 124001',
  },
  '12345678901234': {
    full: 'ОсОО "Тянь-Шань Тур"', short: 'Тянь-Шань Тур', orgType: 'Туроператор', currency: 'KGS',
    kpp: '123401001', ogrn: '125047001234', okpo: '4417092',
    legalAddr: 'г. Бишкек, пр. Чуй 155', factAddr: 'г. Бишкек, пр. Чуй 155',
    phone: '+996 555 220 330', email: 'info@tienshan-tour.kg',
    account: '1180000445566778', bank: 'РСК Банк · БИК 118001',
  },
};

function NewOrgDrawer({ open, onClose }) {
  const toast = useToast();
  const empty = { full: '', short: '', email: '', phone: '', currency: '', orgType: '', curator: '', operator: '', accountant: '', inn: '', kpp: '', ogrn: '', okpo: '', legalAddr: '', factAddr: '', account: '', bank: '', status: '', comment: '' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const [lookup, setLookup] = useState('idle'); // idle | loading | found | notfound
  const [revealed, setRevealed] = useState(false); // показывать ли остальные поля
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target ? e.target.value : e }));
  useEffect(() => { if (open) { setF(empty); setErrs({}); setLookup('idle'); setRevealed(false); } }, [open]);

  // Поиск по ИНН — главный сценарий: реквизиты подтягиваются автоматически.
  const runLookup = () => {
    const digits = (f.inn || '').replace(/\D/g, '');
    if (digits.length < 8) { setErrs((p) => ({ ...p, inn: 'Введите корректный ИНН' })); return; }
    setErrs((p) => ({ ...p, inn: undefined }));
    setLookup('loading');
    setTimeout(() => {
      const hit = ORG_REGISTRY[digits];
      if (hit) {
        setF((p) => ({ ...p, ...hit, inn: digits }));
        setLookup('found'); setRevealed(true);
        toast('Реквизиты организации загружены из реестра', 'ok');
      } else {
        setLookup('notfound'); setRevealed(true);
        toast('Организация не найдена — заполните данные вручную', 'info');
      }
    }, 800);
  };
  // Ручной ввод, если автопоиск недоступен или не требуется.
  const enterManual = () => { setRevealed(true); if (lookup !== 'found') setLookup('notfound'); };

  const submit = () => {
    const er = {};
    if (!f.full.trim()) er.full = 'Введите название';
    if (!f.orgType) er.orgType = 'Выберите тип';
    if (!f.curator) er.curator = 'Назначьте куратора';
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = 'Некорректный e-mail';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    toast('Организация создана', 'ok'); onClose();
  };

  const loading = lookup === 'loading';
  return (
    <Drawer open={open} onClose={onClose} title="Новая организация" width="min(720px,96vw)"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" iconRight="arrowRight" onClick={submit} disabled={!revealed}>Далее</Button></>}>

      {/* Главный шаг — поиск по ИНН. Данные подтягиваются автоматически вплоть до банковских реквизитов. */}
      <div style={{ background: 'var(--blue-soft)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="airline-logo sm" style={{ background: '#2566ff', width: 36, height: 36, borderRadius: 9, flex: '0 0 36px' }}><Icon name="building" style={{ width: 18, height: 18 }} /></span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Данные по ИНН</div>
            <div style={{ fontSize: 13, color: 'var(--body)' }}>Введите ИНН — реквизиты подтянутся автоматически из реестра</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <Field error={errs.inn}>
              <Input leadIcon="search" placeholder="Введите ИНН организации" value={f.inn} onChange={set('inn')} error={errs.inn} disabled={loading}
                onKeyDown={(e) => { if (e.key === 'Enter') runLookup(); }} />
            </Field>
          </div>
          <Button variant="primary" onClick={runLookup} disabled={loading}>
            {loading
              ? <><Icon name="loader" style={{ width: 16, height: 16, animation: 'spin .7s linear infinite' }} />Поиск…</>
              : <><Icon name="search" />Найти</>}
          </Button>
        </div>

        {lookup === 'found' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
            <Icon name="checkCircle" style={{ width: 16, height: 16 }} />Данные загружены из реестра — проверьте и при необходимости отредактируйте.
          </div>
        )}
        {lookup === 'notfound' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>
            <Icon name="alertCircle" style={{ width: 16, height: 16 }} />Автопоиск недоступен — заполните данные вручную ниже.
          </div>
        )}
        {!revealed && !loading && (
          <button type="button" className="link-btn" style={{ marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={enterManual}>
            <Icon name="edit" style={{ width: 14, height: 14 }} />Ввести данные вручную
          </button>
        )}
      </div>

      {revealed && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <span className="avatar-ph" style={{ width: 54, height: 54 }}><Icon name="user" style={{ width: 24, height: 24 }} /></span>
            <Button variant="secondary" icon="download" onClick={() => toast('Загрузка логотипа организации', 'info')}>Логотип организации</Button>
          </div>
          <div className="form-grid">
            <Field label="Полное название" required error={errs.full}><Input placeholder="Введите название" value={f.full} onChange={set('full')} error={errs.full} /></Field>
            <Field label="Краткое название"><Input placeholder="Введите название" value={f.short} onChange={set('short')} /></Field>
            <Field label="Контактный e-mail" error={errs.email}><Input placeholder="johndoe@mail.com" value={f.email} onChange={set('email')} error={errs.email} /></Field>
            <Field label="Контактный телефон"><Input placeholder="+996 (___) __-__-__" value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Основная валюта"><Select placeholder="Выберите валюту" options={CURRENCIES.map((c) => c.code)} value={f.currency} onChange={set('currency')} /></Field>
            <Field label="Тип организации" required error={errs.orgType}><Select placeholder="Выберите тип" options={['Туроператор', 'Турагент', 'Авиакомпания', 'Отель']} value={f.orgType} onChange={set('orgType')} error={errs.orgType} /></Field>
            <Field label="Куратор" required error={errs.curator} hint="Главный ответственный за компанию"><Select placeholder="Выберите куратора" options={OPERATORS} value={f.curator} onChange={set('curator')} error={errs.curator} /></Field>
            <Field label="Оператор"><Select placeholder="Выберите оператора" options={OPERATORS} value={f.operator} onChange={set('operator')} /></Field>
            <Field label="Бухгалтер"><Select placeholder="Выберите бухгалтера" options={['Иванова А.', 'Петров С.']} value={f.accountant} onChange={set('accountant')} /></Field>
            <Field label="ИНН"><Input placeholder="Введите ИНН" value={f.inn} onChange={set('inn')} /></Field>
            <Field label="КПП"><Input placeholder="Введите КПП" value={f.kpp} onChange={set('kpp')} /></Field>
            <Field label="ОГРН"><Input placeholder="Введите ОГРН" value={f.ogrn} onChange={set('ogrn')} /></Field>
            <Field label="ОКПО"><Input placeholder="Введите ОКПО" value={f.okpo} onChange={set('okpo')} /></Field>
            <Field label="Юр. адрес"><Input placeholder="Введите юр. адрес" value={f.legalAddr} onChange={set('legalAddr')} /></Field>
            <Field label="Фактический адрес"><Input placeholder="Введите адрес" value={f.factAddr} onChange={set('factAddr')} /></Field>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '26px 0 16px' }}>Расчетные счета</div>
          <div className="form-grid">
            <Field label="Номер счета"><Input placeholder="Введите номер" value={f.account} onChange={set('account')} /></Field>
            <Field label="Банк"><Input placeholder="БИК банка или название банка" value={f.bank} onChange={set('bank')} /></Field>
            <div className="full"><Field label="Статус"><Select placeholder="Выберите статус" options={['Активный', 'Заблокированный', 'На паузе']} value={f.status} onChange={set('status')} /></Field></div>
            <div className="full"><Field label="Комментарий"><textarea className="input" rows={3} placeholder="Descriptions..." value={f.comment} onChange={set('comment')} /></Field></div>
          </div>
        </>
      )}
    </Drawer>
  );
}

Object.assign(window, { PassportModal, FeeDrawer, PassengerDrawer, NewOrgDrawer, CollapseSection });
