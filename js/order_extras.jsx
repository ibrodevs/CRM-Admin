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
function PassportModal({ passenger, participants, onClose }) {
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
        <Button variant="secondary" iconRight="chevRight" onClick={() => toast('Открываю документ', 'info')}>Посмотреть документ</Button>
        <Button variant="secondary" onClick={() => toast('Данные подтверждены', 'ok')}>Подтвердить данные</Button>
        <Button variant="secondary" onClick={() => toast('Запрос на исправление отправлен', 'info')}>Исправить</Button>
        <Button variant="primary" iconRight="chevRight" onClick={() => { toast('Документ подписан', 'ok'); onClose(); }}>Подписать</Button>
      </div>}>
      {/* тип документа */}
      <PanelSub style={{ marginTop: 0 }}>Тип документа</PanelSub>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {PASS_DOCTYPES.map((d) => (
          <button key={d.key} onClick={() => setDocType(d.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 13, border: '1px solid ' + (docType === d.key ? 'var(--blue)' : 'var(--field-line)'), background: docType === d.key ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <Icon name={d.icon} style={{ width: 20, height: 20, color: 'var(--blue)' }} />
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }}>{d.label}</span>
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
        {filtered.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13.5, gridColumn: '1 / -1' }}>Пассажиры не найдены</div>}
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
function PassengerDrawer({ open, onClose }) {
  const toast = useToast();
  const empty = { fio: '', dob: null, citizenship: '', docType: '', docNo: '', expiry: null, email: '', phone: '', comment: '' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }));
  useEffect(() => { if (open) { setF(empty); setErrs({}); } }, [open]);
  const submit = () => {
    const er = {};
    if (!f.fio.trim()) er.fio = 'Введите ФИО';
    if (!f.citizenship) er.citizenship = 'Выберите страну';
    if (!f.docType) er.docType = 'Выберите тип';
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = 'Некорректный e-mail';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    toast('Пассажир добавлен', 'ok'); onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title="Добавить пассажира"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" onClick={submit}>Добавить</Button></>}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 16px' }}>Личные данные</div>
      <div className="form-grid">
        <Field label="ФИО" required error={errs.fio}><Input placeholder="Введите ФИО" value={f.fio} onChange={set('fio')} error={errs.fio} /></Field>
        <DateField label="Дата рождения" value={f.dob} onChange={set('dob')} placeholder="Выбрать дату" />
        <div className="full"><Field label="Гражданство" required error={errs.citizenship}><Select placeholder="Выберите страну" options={['Кыргызстан', 'Казахстан', 'Россия', 'Узбекистан', 'Германия']} value={f.citizenship} onChange={set('citizenship')} error={errs.citizenship} /></Field></div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '26px 0 16px' }}>Документ и контакты</div>
      <div className="form-grid">
        <Field label="Тип документа" required error={errs.docType}><Select placeholder="Выберите тип" options={['Паспорт', 'ID Card', 'Загранпаспорт']} value={f.docType} onChange={set('docType')} error={errs.docType} /></Field>
        <Field label="Номер документа"><Input placeholder="Введите номер" value={f.docNo} onChange={set('docNo')} /></Field>
        <DateField label="Срок действия" value={f.expiry} onChange={set('expiry')} placeholder="Выбрать дату" />
        <Field label="Контактный e-mail" error={errs.email}><Input placeholder="johndoe@mail.com" value={f.email} onChange={set('email')} error={errs.email} /></Field>
        <Field label="Контактный телефон"><Input placeholder="+996 (___) __-__-__" value={f.phone} onChange={set('phone')} /></Field>
        <div className="full"><Field label="Комментарий"><textarea className="input" rows={3} placeholder="Descriptions..." value={f.comment} onChange={set('comment')} /></Field></div>
      </div>
    </Drawer>
  );
}

/* ---------- New organization drawer (Новая организация) ---------- */
function NewOrgDrawer({ open, onClose }) {
  const toast = useToast();
  const empty = { full: '', short: '', email: '', phone: '', currency: '', orgType: '', operator: '', accountant: '', inn: '', kpp: '', ogrn: '', okpo: '', legalAddr: '', factAddr: '', account: '', bank: '', status: '', comment: '' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target ? e.target.value : e }));
  useEffect(() => { if (open) { setF(empty); setErrs({}); } }, [open]);
  const submit = () => {
    const er = {};
    if (!f.full.trim()) er.full = 'Введите название';
    if (!f.orgType) er.orgType = 'Выберите тип';
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = 'Некорректный e-mail';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    toast('Организация создана', 'ok'); onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title="Новая организация"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" iconRight="arrowRight" onClick={submit}>Далее</Button></>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <span className="avatar-ph" style={{ width: 54, height: 54 }}><Icon name="user" style={{ width: 24, height: 24 }} /></span>
        <Button variant="secondary" icon="download">Логотип организации</Button>
      </div>
      <div className="form-grid">
        <Field label="Полное название" required error={errs.full}><Input placeholder="Введите название" value={f.full} onChange={set('full')} error={errs.full} /></Field>
        <Field label="Краткое название"><Input placeholder="Введите название" value={f.short} onChange={set('short')} /></Field>
        <Field label="Контактный e-mail" error={errs.email}><Input placeholder="johndoe@mail.com" value={f.email} onChange={set('email')} error={errs.email} /></Field>
        <Field label="Контактный телефон"><Input placeholder="+996 (___) __-__-__" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Основная валюта"><Select placeholder="Выберите валюту" options={CURRENCIES.map((c) => c.code)} value={f.currency} onChange={set('currency')} /></Field>
        <Field label="Тип организации" required error={errs.orgType}><Select placeholder="Выберите тип" options={['Туроператор', 'Турагент', 'Авиакомпания', 'Отель']} value={f.orgType} onChange={set('orgType')} error={errs.orgType} /></Field>
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
    </Drawer>
  );
}

Object.assign(window, { PassportModal, FeeDrawer, PassengerDrawer, NewOrgDrawer, CollapseSection });
