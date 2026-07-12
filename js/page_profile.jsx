// ===== Профиль пользователя (ТЗ): шапка + вкладки Профиль / Безопасность / Уведомления /
//        Предпочтения / Доступы / Мотивация / Статистика / Рабочее время =====

const PRESENCE_TONE = { 'Онлайн': 'green', 'Не в сети': 'gray', 'В отпуске': 'amber' };
const WORK_STATUS = ['Работает', 'Отпуск', 'Больничный', 'Уволен'];

/* ---------- Доступ по видам услуг (Блок D) — редактор области ответственности ---------- */
function ServiceAccessEditor({ operator }) {
  const toast = useToast();
  const [acc, setAcc] = useState(() => JSON.parse(JSON.stringify(operatorSvcAccess(operator))));
  const [openKind, setOpenKind] = useState(null);
  const setFull = (v) => setAcc((a) => ({ ...a, fullAccess: v }));
  const kindEnabled = (k) => acc.kinds[k] && Object.values(acc.kinds[k]).some(Boolean);
  const toggleKind = (k) => setAcc((a) => {
    const kinds = { ...a.kinds };
    if (kindEnabled(k)) delete kinds[k]; else kinds[k] = fullRights();
    return { ...a, kinds };
  });
  const toggleRight = (k, r) => setAcc((a) => {
    const kinds = { ...a.kinds };
    const cur = kinds[k] ? { ...kinds[k] } : noRights();
    cur[r] = !cur[r]; kinds[k] = cur;
    return { ...a, kinds };
  });
  const save = () => { OPERATOR_SVC_ACCESS[operator] = JSON.parse(JSON.stringify(acc)); toast('Область ответственности сохранена', 'ok'); };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--field-line)', marginBottom: 14 }}>
        <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>Полный доступ ко всем услугам заказа</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Оператор работает со всеми видами услуг без ограничений</div></div>
        <Toggle on={acc.fullAccess} onChange={setFull} />
      </div>
      {!acc.fullAccess && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Отметьте виды услуг и настройте права по каждому. Оператор не имеет доступа к невыбранным видам.</div>
          {SVC_ACCESS_KINDS.map((k) => {
            const on = kindEnabled(k);
            const isOpen = openKind === k;
            return (
              <div key={k} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <Checkbox on={on} onChange={() => toggleKind(k)} />
                  <span style={{ flex: 1, fontWeight: 600, color: 'var(--ink)' }}>{k}</span>
                  {on && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{SVC_ACCESS_RIGHTS.filter((r) => acc.kinds[k] && acc.kinds[k][r]).length} из {SVC_ACCESS_RIGHTS.length} прав</span>}
                  {on && <button className="icon-btn" onClick={() => setOpenKind(isOpen ? null : k)}><Icon name={isOpen ? 'chevUp' : 'chevDown'} /></button>}
                </div>
                {on && isOpen && (
                  <div style={{ borderTop: '1px solid var(--line)', padding: '12px 16px', background: 'var(--surface-2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                    {SVC_ACCESS_RIGHTS.map((r) => (
                      <label key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--body)' }}>
                        <Checkbox on={!!(acc.kinds[k] && acc.kinds[k][r])} onChange={() => toggleRight(k, r)} />{r}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button icon="check" onClick={save}>Сохранить доступы</Button>
      </div>
    </div>
  );
}

/* ---------- Мотивация (read + edit) ---------- */
function ProfileMotivation({ operator }) {
  const [tick, setTick] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const mot = motivationFor(operator);
  const rows = [['service', 'Процент от сервисного сбора'], ['markup', 'Процент от агентской надбавки'], ['commission', 'Процент от комиссионного вознаграждения']];
  const history = [
    { date: '01.06.2026', user: 'Акимова Айсулуу', text: 'Установлена базовая мотивация 30 / 20 / 10' },
    { date: '20.06.2026', user: 'Акимова Айсулуу', text: 'Индивидуальные ставки по видам услуг включены' },
  ];
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <h3 className="card-title" style={{ fontSize: 17, margin: 0 }}>Система мотивации</h3>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{mot.uniform ? 'Единые ставки для всех видов услуг' : 'Индивидуальные ставки по каждому виду услуг'}</div>
        </div>
        <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>Изменить</Button>
      </div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <div className="kv">
            {rows.map(([k, l]) => (
              <div className="kv-row" key={k}><span className="k">{l}</span><span className="v">{mot.base[k]} %</span></div>
            ))}
          </div>
          {!mot.uniform && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Показаны базовые ставки. Для отдельных видов услуг заданы свои значения — см. «Изменить».</div>}
        </div>
        <div className="card card-pad">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>История изменений мотивации</h4>
          <div className="timeline">
            {history.map((h, i) => (
              <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
                <div><div className="tl-time">{h.date} · {h.user}</div><div className="tl-text">{h.text}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <MotivationDrawer open={editOpen} operator={operator} onClose={() => { setEditOpen(false); setTick((t) => t + 1); }} />
    </div>
  );
}

/* ---------- Статистика ---------- */
function ProfileStats({ operator }) {
  const toast = useToast();
  const stats = [
    ['Оформлено заказов', '184'], ['Выписано услуг', '512'], ['Обменов', '37'], ['Возвратов', '21'],
    ['Среднее время обработки заявки', '8 мин'], ['Общая прибыль (для компании)', '42 800 $'],
    ['Заработок за месяц', '3 120 $'], ['Заработок за период', '9 460 $'],
  ];
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span className="chip" style={{ cursor: 'default' }}>Период: 01.06.2026 — 07.07.2026 <Icon name="chevDown" /></span>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" icon="download" onClick={() => toast('Статистика выгружена', 'ok')}>Экспорт</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map(([l, v], i) => (
          <div className="stat-card" key={i}><div className="s-label">{l}</div><div className="s-value" style={{ fontSize: 22 }}>{v}</div></div>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 12 }}>Заработок рассчитан по индивидуальной мотивации оператора и связан с оформленными услугами.</div>
    </div>
  );
}

/* ---------- Рабочее время (смены + отклик на заявку) ---------- */
function ProfileWorkTime({ operator }) {
  const toast = useToast();
  const [sla, setSla] = useState(operatorSla(operator));
  const shift = window.SHIFT_STATE;
  const saveSla = () => { OPERATOR_SLA[operator] = sla; toast('Норматив отклика сохранён: ' + sla + ' мин', 'ok'); };
  const metrics = [
    ['Начало смены', shift ? shiftFmtTime(shift.openedAt) : '09:02'],
    ['Окончание смены', shift ? '— (открыта)' : '18:14'],
    ['Отработанные часы', shift ? shiftDuration(shift.openedAt) : '8 ч 12 мин'],
    ['Активное рабочее время', '7 ч 05 мин'],
    ['Время простоя', '1 ч 07 мин'],
    ['Смен за месяц', '21'],
  ];
  const shiftsHistory = [
    { date: '07.07.2026', span: '09:02 — 18:14', worked: '8 ч 12 мин', idle: '1 ч 07 мин' },
    { date: '06.07.2026', span: '09:00 — 18:30', worked: '8 ч 40 мин', idle: '0 ч 50 мин' },
    { date: '05.07.2026', span: '09:10 — 17:50', worked: '7 ч 55 мин', idle: '0 ч 45 мин' },
  ];
  return (
    <div className="fade-in">
      {/* Блок A — норматив отклика на заявку */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Отклик на заявку</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Норматив времени первого отклика. При превышении на дашборде отображается просрочка / накал тайминга.</div>
          </div>
          <div style={{ width: 120 }}><Input type="number" min="1" value={sla} onChange={(e) => setSla(Math.max(1, parseInt(e.target.value) || 1))} /></div>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>минут</span>
          <Button size="sm" icon="check" onClick={saveSla}>Сохранить</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {metrics.map(([l, v], i) => (
          <div className="stat-card" key={i}><div className="s-label">{l}</div><div className="s-value" style={{ fontSize: 20 }}>{v}</div></div>
        ))}
      </div>

      <h4 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>История смен</h4>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Дата</th><th>Смена</th><th>Отработано</th><th>Простой</th></tr></thead>
          <tbody>
            {shiftsHistory.map((s, i) => (
              <tr key={i}><td className="t-strong">{s.date}</td><td>{s.span}</td><td>{s.worked}</td><td className="t-muted">{s.idle}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfilePage({ onNavigate, initialTab }) {
  const toast = useToast();
  const u = CURRENT_USER;
  const [tab, setTab] = useState(initialTab || 'profile');
  const [pf, setPf] = useState({ ...u });
  const [pw, setPw] = useState({ cur: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState({});
  const [notif, setNotif] = useState({ incrm: true, email: true, telegram: true, max: true, whatsapp: false, sms: false, push: true, desktop: false, newReq: true, exchRet: true, overdue: true, chat: true, orderChg: false });
  const [rolesOpen, setRolesOpen] = useState(false); // матрица прав — боковым окном, без ухода со страницы
  const [prefs, setPrefs] = useState({ theme: 'Светлая', dateFmt: 'ДД.ММ.ГГГГ', timeFmt: '24 часа', currency: 'USD', lang: u.lang, pageSize: '25', startPage: 'Главное' });

  const setField = (k) => (e) => setPf((p) => ({ ...p, [k]: e.target.value }));
  const savePassword = () => {
    const er = {};
    if (!pw.cur) er.cur = 'Введите текущий пароль';
    if (!pw.next) er.next = 'Введите новый пароль'; else if (pw.next.length < 6) er.next = 'Минимум 6 символов';
    if (pw.confirm !== pw.next) er.confirm = 'Пароли не совпадают';
    setPwErr(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    setPw({ cur: '', next: '', confirm: '' }); toast('Пароль изменён', 'ok');
  };

  const TABS = [
    { key: 'profile', label: 'Профиль' }, { key: 'security', label: 'Безопасность' },
    { key: 'notif', label: 'Уведомления' }, { key: 'prefs', label: 'Предпочтения' },
    { key: 'access', label: 'Доступы' }, { key: 'motivation', label: 'Мотивация' },
    { key: 'stats', label: 'Статистика' }, { key: 'worktime', label: 'Рабочее время' },
  ];

  const devices = [
    { name: 'MacBook Pro · Chrome', place: 'Бишкек, KG', last: 'Сейчас', current: true },
    { name: 'iPhone 15 · Safari', place: 'Бишкек, KG', last: '2 ч назад', current: false },
    { name: 'Windows · Edge', place: 'Ош, KG', last: 'Вчера, 19:20', current: false },
  ];
  const logins = [
    { time: 'Сегодня, 09:14', ip: '212.42.100.7', place: 'Бишкек, KG', ok: true },
    { time: 'Вчера, 18:02', ip: '212.42.100.7', place: 'Бишкек, KG', ok: true },
    { time: '05.07.2026, 22:41', ip: '95.140.10.3', place: 'Неизвестно', ok: false },
  ];
  // Каналы доставки уведомлений оператору. «В системе» — центр уведомлений (колокольчик);
  // MAX — наш мессенджер (наравне с Telegram); WhatsApp/SMS — резервные для критичных.
  const channelRows = [
    ['incrm', 'В системе (центр уведомлений)', 'bell'], ['email', 'E-mail', 'mail'],
    ['telegram', 'Telegram', 'send'], ['max', 'MAX', 'chat'], ['whatsapp', 'WhatsApp', 'chat'],
    ['sms', 'SMS', 'phone'], ['push', 'Push (моб. приложение)', 'bell'], ['desktop', 'Desktop (браузер)', 'grid'],
  ];
  const eventRows = [
    ['newReq', 'По новым заявкам'], ['exchRet', 'По обменам и возвратам'], ['overdue', 'По просроченным задачам'],
    ['chat', 'По сообщениям чата'], ['orderChg', 'По изменениям заказов'],
  ];

  return (
    <div className="fade-in">
      <Topbar title="Мой профиль">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="chevLeft" onClick={() => onNavigate('dashboard')}>Вернуться</Button>
      </Topbar>
      <div className="content">
        {/* Шапка профиля */}
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          <Avatar src={u.avatar} name={u.name} size={92} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 25, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.02em' }}>{u.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 3 }}>{u.position} · {u.dept}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <Pill tone="blue">{u.role}</Pill>
              <Pill tone={PRESENCE_TONE[u.presence] || 'gray'}>{u.presence}</Pill>
              <Pill tone={u.workStatus === 'Работает' ? 'green' : 'amber'}>{u.workStatus}</Pill>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Последний вход</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{u.lastLogin}</div>
            <Button variant="secondary" icon="edit" size="sm" style={{ marginTop: 10 }} onClick={() => setTab('profile')}>Редактировать</Button>
          </div>
        </div>

        <div style={{ marginBottom: 20, overflowX: 'auto' }}><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>

        {/* ---- Профиль ---- */}
        {tab === 'profile' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 900 }}>
            <div className="form-grid">
              <Field label="ФИО"><Input value={pf.name} onChange={setField('name')} /></Field>
              <Field label="Должность"><Input value={pf.position} onChange={setField('position')} /></Field>
              <Field label="Подразделение"><Input value={pf.dept} onChange={setField('dept')} /></Field>
              <Field label="Роль в системе"><Input value={pf.role} readOnly /></Field>
              <Field label="Руководитель"><Input value={pf.manager} onChange={setField('manager')} /></Field>
              <Field label="Дата приёма на работу"><Input value={pf.hired} onChange={setField('hired')} leadIcon="calendar" /></Field>
              <Field label="Рабочий e-mail"><Input value={pf.workEmail} onChange={setField('workEmail')} leadIcon="mail" /></Field>
              <Field label="Рабочий телефон"><Input value={pf.workPhone} onChange={setField('workPhone')} leadIcon="phone" /></Field>
              <Field label="Внутренний номер"><Input value={pf.internalPhone} onChange={setField('internalPhone')} /></Field>
              <Field label="Telegram"><Input value={pf.telegram} onChange={setField('telegram')} placeholder="@username" /></Field>
              <Field label="MAX"><Input value={pf.max || ''} onChange={setField('max')} placeholder="ID или номер" /></Field>
              <Field label="WhatsApp"><Input value={pf.whatsapp || ''} onChange={setField('whatsapp')} leadIcon="phone" placeholder="+996 700 000 000" /></Field>
              <Field label="Статус"><Select options={WORK_STATUS} value={pf.workStatus} onChange={setField('workStatus')} /></Field>
              <Field label="Часовой пояс"><Select options={['(GMT+6) Бишкек', '(GMT+3) Москва', '(GMT+5) Ташкент']} value={pf.tz} onChange={setField('tz')} /></Field>
              <Field label="Язык интерфейса"><Select options={['Русский', 'Кыргызча', 'English']} value={pf.lang} onChange={setField('lang')} /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
              <Button variant="primary" onClick={() => toast('Профиль сохранён', 'ok')}>Сохранить изменения</Button>
            </div>
          </div>
        )}

        {/* ---- Безопасность ---- */}
        {tab === 'security' && (
          <div className="fade-in grid-2" style={{ alignItems: 'start' }}>
            <div className="card card-pad">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Смена пароля</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Текущий пароль" error={pwErr.cur}><Input type={showPw ? 'text' : 'password'} value={pw.cur} onChange={(e) => setPw((p) => ({ ...p, cur: e.target.value }))} error={pwErr.cur} trailIcon={showPw ? 'eyeOff' : 'eye'} onTrail={() => setShowPw((s) => !s)} placeholder="••••••••" /></Field>
                <Field label="Новый пароль" error={pwErr.next}><Input type={showPw ? 'text' : 'password'} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} error={pwErr.next} placeholder="Минимум 6 символов" /></Field>
                <Field label="Подтвердите пароль" error={pwErr.confirm}><Input type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} error={pwErr.confirm} placeholder="Повторите новый пароль" /></Field>
                <Button variant="primary" onClick={savePassword} style={{ alignSelf: 'flex-start' }}>Изменить пароль</Button>
              </div>
              <div style={{ borderTop: '1px solid var(--line)', marginTop: 22, paddingTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>Двухфакторная аутентификация</div><div className="hint">Подтверждение входа через приложение</div></div>
                <Toggle on={true} onChange={() => toast('Настройки 2FA', 'info')} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card card-pad">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <h3 className="card-title" style={{ fontSize: 16, margin: 0, flex: 1 }}>Активные устройства</h3>
                  <Button variant="secondary" size="sm" icon="logout" onClick={() => toast('Завершены все сессии кроме текущей', 'ok')}>Выйти со всех</Button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {devices.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--field-line)' }}>
                      <Icon name="grid" style={{ width: 18, height: 18, color: 'var(--muted)' }} />
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{d.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.place} · {d.last}</div></div>
                      {d.current ? <Pill tone="green">Текущее</Pill> : <button className="icon-btn" onClick={() => toast('Сессия завершена', 'ok')}><Icon name="x" /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Последние входы · история авторизаций</h3>
                <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
                  <table className="tbl">
                    <thead><tr><th>Время</th><th>IP</th><th>Локация</th><th>Статус</th></tr></thead>
                    <tbody>{logins.map((l, i) => (
                      <tr key={i}><td className="t-muted">{l.time}</td><td>{l.ip}</td><td>{l.place}</td><td><Pill tone={l.ok ? 'green' : 'red'}>{l.ok ? 'Успех' : 'Отклонён'}</Pill></td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- Уведомления ---- */}
        {tab === 'notif' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 680 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>Каналы доставки</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 22px' }}>
              {channelRows.map(([k, l, icon]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14.5, color: 'var(--ink)' }}>
                    <Icon name={icon} style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />{l}
                  </span>
                  <Toggle on={notif[k]} onChange={(v) => setNotif((n) => ({ ...n, [k]: v }))} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', margin: '10px 0 0' }}>В системе — центр уведомлений (колокольчик). MAX — основной мессенджер наравне с Telegram; WhatsApp и SMS — резервные для критичных событий.</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '20px 0 6px' }}>События</div>
            {eventRows.map(([k, l], i, arr) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{l}</span>
                <Toggle on={notif[k]} onChange={(v) => setNotif((n) => ({ ...n, [k]: v }))} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <Button variant="primary" onClick={() => toast('Настройки уведомлений сохранены', 'ok')}>Сохранить</Button>
            </div>
          </div>
        )}

        {/* ---- Предпочтения ---- */}
        {tab === 'prefs' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 760 }}>
            <div className="form-grid">
              <Field label="Тема оформления"><Select options={['Светлая', 'Тёмная', 'Системная']} value={prefs.theme} onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value }))} /></Field>
              <Field label="Формат даты"><Select options={['ДД.ММ.ГГГГ', 'ММ/ДД/ГГГГ', 'ГГГГ-ММ-ДД']} value={prefs.dateFmt} onChange={(e) => setPrefs((p) => ({ ...p, dateFmt: e.target.value }))} /></Field>
              <Field label="Формат времени"><Select options={['24 часа', '12 часов (AM/PM)']} value={prefs.timeFmt} onChange={(e) => setPrefs((p) => ({ ...p, timeFmt: e.target.value }))} /></Field>
              <Field label="Валюта по умолчанию"><Select options={CURRENCIES.map((c) => c.code)} value={prefs.currency} onChange={(e) => setPrefs((p) => ({ ...p, currency: e.target.value }))} /></Field>
              <Field label="Язык интерфейса"><Select options={['Русский', 'Кыргызча', 'English']} value={prefs.lang} onChange={(e) => setPrefs((p) => ({ ...p, lang: e.target.value }))} /></Field>
              <Field label="Размер страницы списка"><Select options={['10', '25', '50', '100']} value={prefs.pageSize} onChange={(e) => setPrefs((p) => ({ ...p, pageSize: e.target.value }))} /></Field>
              <Field label="Стартовая страница после входа"><Select options={['Главное', 'Заказы', 'Оформление', 'Чаты']} value={prefs.startPage} onChange={(e) => setPrefs((p) => ({ ...p, startPage: e.target.value }))} /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Button variant="primary" onClick={() => toast('Предпочтения сохранены', 'ok')}>Сохранить</Button>
            </div>
          </div>
        )}

        {/* ---- Доступы ---- */}
        {tab === 'access' && (
          <div className="fade-in grid-2" style={{ alignItems: 'start' }}>
            <div className="card card-pad">
              <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Роль и права</h3>
              <div className="kv" style={{ marginBottom: 12 }}>
                <div className="kv-row"><span className="k">Роль</span><span className="v"><Pill tone="blue">{u.role}</Pill></span></div>
                <div className="kv-row"><span className="k">Доступные разделы</span><span className="v" style={{ maxWidth: 260 }}>Все разделы</span></div>
                <div className="kv-row"><span className="k">Доступные поставщики</span><span className="v">Все</span></div>
                <div className="kv-row"><span className="k">Доступные компании</span><span className="v">Все</span></div>
                <div className="kv-row"><span className="k">Доступные виды услуг</span><span className="v">{operatorKindsLabel(u.name)}</span></div>
              </div>
              <Button variant="secondary" size="sm" icon="settings" onClick={() => setRolesOpen(true)}>Матрица прав по ролям</Button>
            </div>
            <div className="card card-pad">
              <h3 className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Доступ по видам услуг</h3>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>Область ответственности оператора: с какими услугами он работает в заказе.</div>
              <ServiceAccessEditor operator={u.name} />
            </div>
          </div>
        )}

        {/* ---- Мотивация / Статистика / Рабочее время ---- */}
        {tab === 'motivation' && <ProfileMotivation operator={u.name} />}
        {tab === 'stats' && <ProfileStats operator={u.name} />}
        {tab === 'worktime' && <ProfileWorkTime operator={u.name} />}
      </div>

      {/* Матрица прав по ролям — боковым окном, чтобы не терять текущую страницу профиля */}
      <Drawer open={rolesOpen} onClose={() => setRolesOpen(false)} title="Матрица прав по ролям" sub="Права доступа по ролям" width="min(940px,97vw)"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setRolesOpen(false)}>Закрыть</Button>}>
        <RolesTab />
      </Drawer>
    </div>
  );
}

Object.assign(window, { ProfilePage, ServiceAccessEditor, ProfileMotivation, ProfileStats, ProfileWorkTime });
