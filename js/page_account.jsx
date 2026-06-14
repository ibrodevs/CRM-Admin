// ===== Мой профиль + Настройки аккаунта =====

function ProfilePage({ onNavigate }) {
  const toast = useToast();
  const u = CURRENT_USER;
  const stats = [
    { label: 'Заказов обработано', value: '1 248' },
    { label: 'В работе сейчас', value: '32' },
    { label: 'Средний рейтинг', value: '4.9' },
    { label: 'В системе с', value: u.joined },
  ];
  return (
    <div className="fade-in">
      <Topbar title="Мой профиль">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="settings" onClick={() => onNavigate('account')}>Настройки аккаунта</Button>
        <Button variant="secondary" icon="chevLeft" onClick={() => onNavigate('dashboard')}>Вернуться</Button>
      </Topbar>
      <div className="content">
        {/* header card */}
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
          <Avatar src={u.avatar} name={u.name} size={96} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.02em' }}>{u.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 15.5, marginTop: 3 }}>{u.position}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <Pill tone="blue">{u.role}</Pill>
              <Pill tone="green">Активен</Pill>
            </div>
          </div>
          <Button variant="primary" icon="edit" onClick={() => onNavigate('account')}>Редактировать</Button>
        </div>

        {/* stats */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {stats.map((s, i) => (
            <div className="stat-card" key={i}><div className="s-label">{s.label}</div><div className="s-value" style={{ fontSize: 28 }}>{s.value}</div></div>
          ))}
        </div>

        {/* details */}
        <div className="grid-2">
          <div className="card card-pad">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Контактная информация</h3>
            <div className="kv">
              {[['E-mail', u.email], ['Телефон', u.phone], ['Должность', u.position], ['Отдел', u.dept]].map(([k, v], i) => (
                <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Доступ и роль</h3>
            <div className="kv">
              {[['Роль', u.role], ['Уровень доступа', 'Полный'], ['Двухфакторная аутентификация', 'Включена'], ['Последний вход', 'Сегодня, 09:14']].map(([k, v], i) => (
                <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
              ))}
            </div>
            <Button variant="secondary" icon="logout" style={{ marginTop: 18 }} onClick={() => toast('Завершение всех сессий', 'info')}>Завершить другие сессии</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountSettingsPage({ onNavigate }) {
  const toast = useToast();
  const u = CURRENT_USER;
  const [tab, setTab] = useState('profile');
  const [pf, setPf] = useState({ name: u.name, email: u.email, phone: u.phone, position: u.position });
  const [pw, setPw] = useState({ cur: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState({});
  const [notif, setNotif] = useState([true, true, false, true, true]);
  const [lang, setLang] = useState('Русский');

  const setField = (k) => (e) => setPf((p) => ({ ...p, [k]: e.target.value }));
  const savePassword = () => {
    const er = {};
    if (!pw.cur) er.cur = 'Введите текущий пароль';
    if (!pw.next) er.next = 'Введите новый пароль';
    else if (pw.next.length < 6) er.next = 'Минимум 6 символов';
    if (pw.confirm !== pw.next) er.confirm = 'Пароли не совпадают';
    setPwErr(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    setPw({ cur: '', next: '', confirm: '' });
    toast('Пароль изменён', 'ok');
  };
  const notifOpts = ['Уведомления о новых заказах', 'Уведомления о платежах', 'SMS-уведомления', 'E-mail дайджест', 'Просрочки и дедлайны SLA'];

  return (
    <div className="fade-in">
      <Topbar title="Настройки аккаунта">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="user" onClick={() => onNavigate('profile')}>Мой профиль</Button>
        <Button variant="secondary" icon="chevLeft" onClick={() => onNavigate('dashboard')}>Вернуться</Button>
      </Topbar>
      <div className="content">
        <div style={{ marginBottom: 22 }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { key: 'profile', label: 'Профиль' },
            { key: 'password', label: 'Безопасность' },
            { key: 'notif', label: 'Уведомления' },
            { key: 'prefs', label: 'Предпочтения' },
          ]} />
        </div>

        {tab === 'profile' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
              <Avatar src={u.avatar} name={u.name} size={72} />
              <div>
                <Button variant="secondary" icon="download" size="sm" onClick={() => toast('Загрузка фото', 'info')}>Изменить фото</Button>
                <div className="hint" style={{ marginTop: 6 }}>PNG или JPG, до 2 МБ</div>
              </div>
            </div>
            <div className="form-grid">
              <Field label="ФИО"><Input value={pf.name} onChange={setField('name')} /></Field>
              <Field label="Должность"><Input value={pf.position} onChange={setField('position')} /></Field>
              <Field label="E-mail"><Input value={pf.email} onChange={setField('email')} /></Field>
              <Field label="Телефон"><Input value={pf.phone} onChange={setField('phone')} /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
              <Button variant="primary" onClick={() => toast('Профиль сохранён', 'ok')}>Сохранить изменения</Button>
            </div>
          </div>
        )}

        {tab === 'password' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 520 }}>
            <h3 className="card-title" style={{ marginBottom: 18 }}>Смена пароля</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Текущий пароль" error={pwErr.cur}>
                <Input type={showPw ? 'text' : 'password'} value={pw.cur} onChange={(e) => setPw((p) => ({ ...p, cur: e.target.value }))} error={pwErr.cur}
                  trailIcon={showPw ? 'eyeOff' : 'eye'} onTrail={() => setShowPw((s) => !s)} placeholder="••••••••" />
              </Field>
              <Field label="Новый пароль" error={pwErr.next}>
                <Input type={showPw ? 'text' : 'password'} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} error={pwErr.next} placeholder="Минимум 6 символов" />
              </Field>
              <Field label="Подтвердите пароль" error={pwErr.confirm}>
                <Input type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} error={pwErr.confirm} placeholder="Повторите новый пароль" />
              </Field>
              <Button variant="primary" onClick={savePassword} style={{ alignSelf: 'flex-start', marginTop: 4 }}>Изменить пароль</Button>
            </div>
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 26, paddingTop: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>Двухфакторная аутентификация</div><div className="hint">Дополнительная защита входа через приложение</div></div>
                <Toggle on={true} onChange={() => toast('Настройки 2FA', 'info')} />
              </div>
            </div>
          </div>
        )}

        {tab === 'notif' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 620 }}>
            <h3 className="card-title" style={{ marginBottom: 8 }}>Уведомления</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notifOpts.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < notifOpts.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <span style={{ fontSize: 15, color: 'var(--ink)' }}>{l}</span>
                  <Toggle on={notif[i]} onChange={(v) => setNotif((arr) => arr.map((x, j) => j === i ? v : x))} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Button variant="primary" onClick={() => toast('Настройки уведомлений сохранены', 'ok')}>Сохранить</Button>
            </div>
          </div>
        )}

        {tab === 'prefs' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 620 }}>
            <h3 className="card-title" style={{ marginBottom: 18 }}>Предпочтения</h3>
            <div className="form-grid">
              <Field label="Язык интерфейса"><Select options={['Русский', 'Кыргызча', 'English']} value={lang} onChange={(e) => setLang(e.target.value)} /></Field>
              <Field label="Часовой пояс"><Select options={['(GMT+6) Бишкек', '(GMT+3) Москва', '(GMT+5) Ташкент']} value="(GMT+6) Бишкек" onChange={() => {}} /></Field>
              <Field label="Формат даты"><Select options={['ДД.ММ.ГГГГ', 'ММ/ДД/ГГГГ', 'ГГГГ-ММ-ДД']} value="ДД.ММ.ГГГГ" onChange={() => {}} /></Field>
              <Field label="Валюта по умолчанию"><Select options={CURRENCIES.map((c) => c.code)} value="USD" onChange={() => {}} /></Field>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
              <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>Тёмная тема</div><div className="hint">Скоро будет доступна</div></div>
              <Toggle on={false} onChange={() => toast('Тёмная тема скоро появится', 'info')} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
              <Button variant="primary" onClick={() => toast('Предпочтения сохранены', 'ok')}>Сохранить</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ProfilePage, AccountSettingsPage });
