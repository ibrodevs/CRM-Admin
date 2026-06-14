// ===== Settings (Настройки) + modals =====

function CurrencyModal({ open, onClose }) {
  const toast = useToast();
  const [extra, setExtra] = useState(true);
  const [vals, setVals] = useState({});
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-pad">
        <ModalHeader title="Курсы валют" sub="Изменение курсов валют" onClose={onClose} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {CURRENCIES.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>{c.sym} {c.name}</div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Текущее значение: {c.rate}</div>
              </div>
              <input className="input" style={{ width: 230 }} placeholder="Введите значение" value={vals[c.code] || ''} onChange={(e) => setVals((v) => ({ ...v, [c.code]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>Показать дополнительный расчет</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>При добавлении новых заказов</div>
            </div>
            <Toggle on={extra} onChange={setExtra} />
          </div>
        </div>
        <Button variant="primary" icon="plus" style={{ marginTop: 8 }} onClick={() => toast('Добавление валюты', 'info')}>Добавить валюту</Button>
        <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" icon="edit" onClick={() => toast('Выбор основной валюты', 'info')}>Выбрать основную валюту</Button>
          <Button variant="primary" iconRight="arrowRight" onClick={() => { toast('Курсы валют обновлены', 'ok'); onClose(); }}>Применить</Button>
        </div>
      </div>
    </Modal>
  );
}

const ACCESS_TOGGLES = ['Получение аналитики', 'Получение информации о клиентах', 'Обновление каждые 10 мин', 'Доступ к данным', 'SLI'];

function ApiKeyModal({ open, onClose }) {
  const toast = useToast();
  const [stage, setStage] = useState('form'); // form | loading | result
  const [org, setOrg] = useState('');
  const [type, setType] = useState('HoReCa');
  const [tg, setTg] = useState([true, false, true, true, true]);
  const [err, setErr] = useState('');
  useEffect(() => { if (open) { setStage('form'); setOrg(''); setErr(''); } }, [open]);
  const gen = () => {
    if (!org.trim()) { setErr('Введите наименование'); return; }
    setStage('loading');
    setTimeout(() => setStage('result'), 1500);
  };
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-pad">
        {stage === 'form' && <>
          <ModalHeader title="Генерация API ключа" onClose={onClose} />
          <Field label="Наименование организации" hint="Введите наименование на латинице" error={err}>
            <Input placeholder="Введите значение" value={org} onChange={(e) => { setOrg(e.target.value); setErr(''); }} error={err} />
          </Field>
          <div style={{ margin: '22px 0' }}>
            <div className="label" style={{ marginBottom: 12, fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>Выберите тип доступа</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.keys(ORG_TYPE).map((t) => (
                <button key={t} className={'tab' + (type === t ? ' active' : '')} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ACCESS_TOGGLES.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0' }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{l}</span>
                <Toggle on={tg[i]} onChange={(v) => setTg((arr) => arr.map((x, j) => j === i ? v : x))} />
              </div>
            ))}
          </div>
          <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
            <Button variant="primary" iconRight="arrowRight" onClick={gen}>Сгенерировать</Button>
          </div>
        </>}
        {stage === 'loading' && (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <Icon name="loader" style={{ width: 48, height: 48, color: 'var(--blue)', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 16 }}>Идет генерация API ключа</div>
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>ОсОО "{org}"</div>
          </div>
        )}
        {stage === 'result' && <>
          <ModalHeader title="Результаты API ключа" sub={`ОсОО "${org}" ✓`} onClose={onClose} />
          {[['API', 'Введите его в поле с API', 'KJjhasgdv343uhagha9723545'], ['API-KEY', 'Введите ключ для активации API', '76124536dhg'], ['API-ENDPOINT', 'Введите ENDPOINT для работы с API', 'https://api.amadeus.com/v2/bookings']].map(([t, h, v], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 18 }}>
              <div><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{t}</div><div style={{ fontSize: 13.5, color: 'var(--muted)' }}>{h}</div></div>
              <div className="input-wrap" style={{ width: 320 }}>
                <input className="input has-trail" readOnly value={v} style={{ background: 'var(--surface-2)' }} />
                <Icon name="copy" className="trail" onClick={() => toast('Скопировано', 'ok')} />
              </div>
            </div>
          ))}
          <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={onClose}>Закрыть</Button>
          </div>
        </>}
      </div>
    </Modal>
  );
}

function ApiAccessModal({ open, onClose }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  return (
    <Modal open={open} onClose={onClose} className="">
      <div className="modal-pad">
        <ModalHeader title="Доступы к API" onClose={onClose} />
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th style={{ width: 70 }}>№</th><th>Организация</th><th>Тип организации</th><th>Дата создания</th><th style={{ width: 100 }}>Действия</th></tr></thead>
            <tbody>
              {API_ACCESS.slice(0, 6).map((a, i) => (
                <tr key={i}>
                  <td className="t-strong">{a.no}</td><td className="t-strong">{a.org}</td>
                  <td><Pill tone={ORG_TYPE[a.orgType]}>{a.orgType}</Pill></td><td>{a.date}</td>
                  <td><div className="row-actions">
                    <button className="icon-btn green" onClick={() => toast('Редактирование доступа', 'info')}><Icon name="edit" /></button>
                    <button className="icon-btn red" onClick={() => setConfirm(i)}><Icon name="trash" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog open={confirm !== null} message="Данное действие невозможно будет отменить!"
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); toast('Доступ удалён', 'ok'); }} />
    </Modal>
  );
}

function AddUserDrawer({ open, onClose }) {
  const toast = useToast();
  const empty = { name: '', email: '', role: '', phone: '', status: 'Активный' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target ? e.target.value : e }));
  useEffect(() => { if (open) { setF(empty); setErrs({}); } }, [open]);
  const submit = () => {
    const er = {};
    if (!f.name.trim()) er.name = 'Введите ФИО';
    if (!f.email.trim()) er.email = 'Введите e-mail';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = 'Некорректный e-mail';
    if (!f.role) er.role = 'Выберите роль';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    toast('Пользователь добавлен', 'ok'); onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title="Добавить пользователя"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" iconRight="arrowRight" onClick={submit}>Добавить</Button></>}>
      <div className="form-grid">
        <div className="full"><Field label="ФИО" required error={errs.name}><Input placeholder="Введите ФИО" value={f.name} onChange={set('name')} error={errs.name} /></Field></div>
        <Field label="E-mail" required error={errs.email}><Input placeholder="mail@example.com" value={f.email} onChange={set('email')} error={errs.email} /></Field>
        <Field label="Телефон"><Input placeholder="+996 (___) __-__-__" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Роль" required error={errs.role}><Select placeholder="Выберите роль" options={['Админ', 'Оператор', 'Бухгалтер', 'Менеджер']} value={f.role} onChange={set('role')} error={errs.role} /></Field>
        <Field label="Статус"><Select options={['Активный', 'Заблокированный']} value={f.status} onChange={set('status')} /></Field>
      </div>
    </Drawer>
  );
}

function NotificationsModal({ open, onClose }) {
  const toast = useToast();
  const [tg, setTg] = useState([true, true, false, true, false, true]);
  const opts = ['Уведомления о новых заказах', 'Уведомления о платежах', 'SMS-уведомления', 'E-mail дайджест', 'Push в Telegram', 'Просрочки и дедлайны SLA'];
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="modal-pad">
        <ModalHeader title="Настройки уведомлений" onClose={onClose} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {opts.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < opts.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <span style={{ fontSize: 14.5, color: 'var(--ink)' }}>{l}</span>
              <Toggle on={tg[i]} onChange={(v) => setTg((arr) => arr.map((x, j) => j === i ? v : x))} />
            </div>
          ))}
        </div>
        <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={() => { toast('Настройки сохранены', 'ok'); onClose(); }}>Сохранить</Button>
        </div>
      </div>
    </Modal>
  );
}

function SettingsPage() {
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const groups = [
    { title: 'Курсы валют', items: [['Изменить курс валют', () => setModal('currency')], ['Добавить / удалить валюту', () => setModal('currency')]] },
    { title: 'Пользователи и роли', items: [['Добавить пользователя', () => setModal('adduser')], ['Изменить роль пользователя', () => toast('Изменение роли', 'info')]] },
    { title: 'Общие настройки', items: [['Настройки уведомления', () => setModal('notif')]] },
    { title: 'API/интеграции', items: [['Доступы к API', () => setModal('apiaccess')], ['Сгенерировать API ключ', () => setModal('apikey')], ['Убрать доступ к API', () => setModal('apiaccess')], ['Настройки API', () => toast('Настройки API', 'info')], ['Настройки SLA', () => toast('Настройки SLA', 'info')]] },
    { title: 'Шаблоны документов', items: [['Добавить шаблон', () => toast('Добавление шаблона', 'info')], ['Изменить шаблон', () => toast('Изменение шаблона', 'info')]] },
  ];
  return (
    <div className="fade-in">
      <Topbar title="Настройки">
        <div className="topbar-spacer" />
        <SearchBox value="" onChange={() => {}} style={{ width: 300 }} />
      </Topbar>
      <div className="content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px 50px', maxWidth: 1100 }}>
          {groups.map((g, i) => (
            <div key={i}>
              <h3 style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink)', margin: '0 0 16px' }}>{g.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {g.items.map(([label, fn], j) => (
                  <button key={j} className="doc-chip" style={{ height: 50, padding: '0 18px' }} onClick={fn}>{label}<Icon name="chevRight" /></button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <CurrencyModal open={modal === 'currency'} onClose={() => setModal(null)} />
      <ApiKeyModal open={modal === 'apikey'} onClose={() => setModal(null)} />
      <ApiAccessModal open={modal === 'apiaccess'} onClose={() => setModal(null)} />
      <AddUserDrawer open={modal === 'adduser'} onClose={() => setModal(null)} />
      <NotificationsModal open={modal === 'notif'} onClose={() => setModal(null)} />
    </div>
  );
}

Object.assign(window, { SettingsPage });
