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

/* ---------- Process step ---------- */
function ProcessStep({ state, title, time }) {
  const ico = state === 'done' ? 'checkCircle' : state === 'progress' ? 'loader' : 'alertCircle';
  const color = state === 'done' ? 'var(--green)' : state === 'progress' ? 'var(--blue)' : 'var(--red-strong)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Icon name={ico} style={{ width: 22, height: 22, color, animation: state === 'progress' ? 'spin 1.4s linear infinite' : 'none' }} />
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{time}</div>
      </div>
    </div>
  );
}

const PROC_STEPS = [
  { state: 'done', title: 'Обработка клиента и КП', time: '30.01.26 - 18:20' },
  { state: 'done', title: 'Одобрение КП и заполнение данных', time: '31.01.26 - 14:23' },
  { state: 'done', title: 'Подача на визу', time: '31.01.26 - 18:20' },
  { state: 'done', title: 'Одобрение со стороны поставщика', time: '30.01.26 - 18:20' },
  { state: 'done', title: 'Предоплата', time: '30.01.26 - 18:20' },
  { state: 'done', title: 'Бронирование отели', time: '30.01.26 - 18:20' },
  { state: 'progress', title: 'Формирование справок', time: 'В процессе' },
  { state: 'todo', title: 'Выставление окончательного счета', time: 'Не начато' },
];

const MAIN_INFO_ROWS = [
  { client: 'Нуралиев Данияр', flight: 'Ташкент (UZB) - Дубай (DXB)', flightSub: '30.01.26 (18:20) - 31.01.26 (07:50)', hotel: 'Jumeirah Burj Al Arab', hotelSub: '5 звезд / одноместная', visa: 'Есть', visaSub: 'До 30.06.26', pay: 'Треб.доплата', payTone: 'red', doc: 'Полная', other: 'Страховка куплена' },
  { client: 'Усманов Бактыбек', flight: 'Ташкент (UZB) - Дубай (DXB)', flightSub: '30.01.26 (18:20) - 31.01.26 (07:50)', hotel: 'Jumeirah Burj Al Arab', hotelSub: '5 звезд / одноместная', visa: 'Есть', visaSub: 'До 30.06.26', pay: 'Полная', payTone: 'blue', doc: 'Полная', other: '-' },
];
const FLIGHT_ROWS = [
  { client: 'Нуралиев Данияр', flight: 'Ташкент (UZB) - Дубай (DXB)', flightSub: '30.01.26 (18:20) - 31.01.26 (07:50)', airline: 'S7 Airlines', airlineSub: 'E Class (Эконом)', visa: 'Есть', visaSub: 'До 30.06.26', cost: '726$', costTone: 'red', comm: '1.5$', fees: '1.2$' },
  { client: 'Усманов Бактыбек', flight: 'Ташкент (UZB) - Дубай (DXB)', flightSub: '30.01.26 (18:20) - 31.01.26 (07:50)', airline: 'Avia Traffic', airlineSub: 'C Class (Бизнес класс)', visa: 'Есть', visaSub: 'До 30.06.26', cost: '920$', costTone: 'blue', comm: '2.4$', fees: '1.6$' },
];

function ExtendedOrderDetail({ order, onPassport, onAddPassenger, onAddFee }) {
  const toast = useToast();
  const Cell2 = ({ t, s }) => (<div><div style={{ color: 'var(--ink)' }}>{t}</div>{s && <div className="t-sub">{s}</div>}</div>);
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Главная информация */}
      <CollapseSection title="Главная информация" defaultOpen>
        <div className="table-card" style={{ boxShadow: 'none' }}>
          <table className="tbl">
            <thead><tr><th>Клиенты</th><th>Данные перелетов</th><th>Данные отеля</th><th>Виза</th><th>Оплата</th><th>Документация</th><th>Прочее</th></tr></thead>
            <tbody>
              {MAIN_INFO_ROWS.map((r, i) => (
                <tr key={i}>
                  <td className="t-strong">{r.client}</td>
                  <td><Cell2 t={r.flight} s={r.flightSub} /></td>
                  <td><Cell2 t={r.hotel} s={r.hotelSub} /></td>
                  <td><Cell2 t={r.visa} s={r.visaSub} /></td>
                  <td><Pill tone={r.payTone}>{r.pay}</Pill></td>
                  <td><Pill tone="blue">{r.doc}</Pill></td>
                  <td>{r.other === '-' ? <Pill tone="gray">-</Pill> : <span className="t-muted">{r.other}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapseSection>

      {/* Процесс сделки */}
      <CollapseSection title="Процесс сделки" defaultOpen>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '28px 24px' }}>
          {PROC_STEPS.map((s, i) => <ProcessStep key={i} {...s} />)}
        </div>
      </CollapseSection>

      {/* accordions */}
      <div>
        <CollapseSection title="Авиаперелет / Отель">
          <div className="grid-2">
            <div className="kv-stack">
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Авиаперелет</div>
              {[['Маршрут', 'Ташкент (UZB) → Дубай (DXB)'], ['Дата вылета', '30.01.26 18:20'], ['Дата прилета', '31.01.26 07:50'], ['Авиакомпания', 'S7 Airlines'], ['Класс', 'Эконом / Бизнес']].map(([k, v], i) => <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>)}
            </div>
            <div className="kv-stack">
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Отель</div>
              {[['Название', 'Jumeirah Burj Al Arab'], ['Категория', '5 звезд'], ['Номер', 'Одноместный'], ['Заезд / выезд', '30.01.26 — 05.02.26'], ['Питание', 'Завтрак включен']].map(([k, v], i) => <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>)}
            </div>
          </div>
        </CollapseSection>

        <CollapseSection title="Основная информация" note="Требуется действие" noteWarn>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
            <div className="kv-stack">
              {[['Организация', order.client], ['ИНН/ПИН/БИК', '07070707070707'], ['Тип организации', 'Туроператор'], ['Телефон', '+996 (777) 777-777']].map(([k, v], i) => <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>)}
            </div>
            <div className="kv-stack">
              {[['Оператор', order.operator], ['Валюта', 'USD'], ['Тип комиссии', 'Процентная (%)'], ['Ставка НДС', '12%']].map(([k, v], i) => <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>)}
            </div>
          </div>
          <Button variant="secondary" icon="edit" style={{ marginTop: 6 }} onClick={() => toast('Редактирование основной информации', 'info')}>Заполнить данные</Button>
        </CollapseSection>

        <CollapseSection title="Информация о клиентах" note="Требуется действие" noteWarn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Нуралиев Данияр', 'Усманов Бактыбек'].map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: '1px solid var(--line)', borderRadius: 12 }}>
                <Avatar name={c} size={40} />
                <div style={{ flex: 1 }}><div className="t-strong">{c}</div><div className="t-sub">Паспорт · Виза · Страховка</div></div>
                <Button variant="secondary" size="sm" onClick={() => onPassport(c)}>Документы</Button>
              </div>
            ))}
            <Button variant="primary" icon="plus" onClick={onAddPassenger} style={{ alignSelf: 'flex-start' }}>Добавить пассажира</Button>
          </div>
        </CollapseSection>

        <CollapseSection title="Калькуляция + Сборы и налоги">
          <div className="table-card" style={{ boxShadow: 'none', marginBottom: 14 }}>
            <table className="tbl">
              <thead><tr><th>Услуга</th><th>Тип сбора</th><th>Значение</th><th>Налог</th><th>Валюта</th><th>Комментарий</th></tr></thead>
              <tbody>
                <tr><td className="t-strong">Авиа</td><td>%</td><td>5%</td><td>80</td><td><Pill tone="blue">USD</Pill></td><td className="t-muted">Сервисный сбор</td></tr>
                <tr><td className="t-strong">Виза</td><td>Фиксированная</td><td>400</td><td>30</td><td><Pill tone="blue">USD</Pill></td><td className="t-muted">Визовая комиссия</td></tr>
              </tbody>
            </table>
          </div>
          <Button variant="primary" icon="plus" onClick={onAddFee}>Добавить сбор / налог</Button>
        </CollapseSection>

        <CollapseSection title="Документация" note="Не хватает документов" noteWarn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {['Паспорт: Нуралиев Данияр', 'Виза: Нуралиев Данияр', 'Страховка: Нуралиев Данияр', 'Договор', 'Счет на оплату', 'Ваучер'].map((d, i) => (
              <button key={i} className="doc-chip" onClick={() => onPassport(d.split(':')[1] ? d.split(':')[1].trim() : 'Нуралиев Данияр')}>{d}<Icon name="chevRight" /></button>
            ))}
          </div>
        </CollapseSection>

        <CollapseSection title="История формирования заказа и история изменений">
          <div className="timeline">
            {[['22.12.2025 - 15:34', 'Ожидает подтверждения'], ['22.12.2025 - 15:29', 'Загружены документы'], ['22.12.2025 - 15:24', 'Назначен оператор (Адилет Медербеков)'], ['22.12.2025 - 15:20', 'Был создан заказ']].map(([t, x], i) => (
              <div className="tl-item" key={i}><div className="tl-dot" /><div className="tl-line" /><div><div className="tl-time">{t}</div><div className="tl-text">{x}</div></div></div>
            ))}
          </div>
        </CollapseSection>
      </div>

      {/* bottom flight table */}
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Клиенты</th><th>Данные перелетов</th><th>Авиакомпания</th><th>Виза</th><th>Стоимость билета</th><th>Комиссия</th><th>Сборы</th></tr></thead>
          <tbody>
            {FLIGHT_ROWS.map((r, i) => (
              <tr key={i}>
                <td className="t-strong">{r.client}</td>
                <td><Cell2 t={r.flight} s={r.flightSub} /></td>
                <td><Cell2 t={r.airline} s={r.airlineSub} /></td>
                <td><Cell2 t={r.visa} s={r.visaSub} /></td>
                <td><Pill tone={r.costTone}>{r.cost}</Pill></td>
                <td><Pill tone="blue">{r.comm}</Pill></td>
                <td><Pill tone="blue">{r.fees}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
function PassportModal({ passenger, onClose }) {
  const toast = useToast();
  const [docType, setDocType] = useState('pass');
  const [activePax, setActivePax] = useState(0);
  const pax = [{ name: passenger || 'Меркель Александр', sub: 'Нет визы', expired: true }, { name: 'Аттокуров Эрбол', sub: 'Нет визы', expired: false }];
  const cur = pax[activePax];
  return (
    <Modal open onClose={onClose}>
      <div className="modal-pad">
        <ModalHeader title="Документация" sub="Заказ № 51162 ОсОО «Гранд лимитед» от 23.12.25" onClose={onClose} />
        <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PASS_DOCTYPES.map((d) => (
              <button key={d.key} onClick={() => setDocType(d.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', borderRadius: 13, border: '1px solid var(--field-line)', background: docType === d.key ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                <Icon name={d.icon} style={{ width: 20, height: 20, color: 'var(--blue)' }} />
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }}>{d.label}</span>
                <span className={'radio' + (docType === d.key ? ' on' : '')} />
              </button>
            ))}
          </div>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {pax.map((p, i) => (
                <button key={i} onClick={() => setActivePax(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 13, border: '1px solid var(--field-line)', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <Avatar name={p.name} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div><div className="t-sub">{p.sub}</div></div>
                  <span className={'radio' + (activePax === i ? ' on' : '')} />
                </button>
              ))}
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', paddingTop: 28 }}>
              <div className="badge-tip" style={{ left: '50%', top: 0, background: cur.expired ? '#ec4444' : '#f5a623' }}>
                {cur.expired ? 'Просроченный паспорт' : 'До окончания срока: 3 месяца'}
              </div>
              <div style={{ width: 250, height: 320, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)',
                background: 'repeating-linear-gradient(45deg, #eef3ee, #eef3ee 11px, #e4ece4 11px, #e4ece4 22px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#7c8a7c', letterSpacing: '.04em' }}>скан паспорта</span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" iconRight="chevRight" onClick={() => toast('Открываю документ', 'info')}>Посмотреть документ</Button>
          <Button variant="secondary" onClick={() => toast('Данные подтверждены', 'ok')}>Подтвердить данные</Button>
          <Button variant="secondary" onClick={() => toast('Запрос на исправление отправлен', 'info')}>Исправить</Button>
          <Button variant="primary" iconRight="chevRight" onClick={() => { toast('Документ подписан', 'ok'); onClose(); }}>Подписать</Button>
        </div>
      </div>
    </Modal>
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
      <div className="form-grid">
        <Field label="ФИО" required error={errs.fio}><Input placeholder="Введите ФИО" value={f.fio} onChange={set('fio')} error={errs.fio} /></Field>
        <DateField label="Дата рождения" value={f.dob} onChange={set('dob')} placeholder="Выбрать дату" />
        <Field label="Гражданство" required error={errs.citizenship}><Select placeholder="Выберите страну" options={['Кыргызстан', 'Казахстан', 'Россия', 'Узбекистан', 'Германия']} value={f.citizenship} onChange={set('citizenship')} error={errs.citizenship} /></Field>
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

Object.assign(window, { ExtendedOrderDetail, PassportModal, FeeDrawer, PassengerDrawer, NewOrgDrawer, CollapseSection });
