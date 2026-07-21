import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { Avatar, Button, Checkbox, Drawer, Field, Input, Pill, Select, Tabs, Toggle, useToast } from './ui';
import { UFDateField } from './forms_unified';
import { CURRENCIES, CURRENT_USER } from './data';
import { SVC_ACCESS_KINDS, operatorKindsLabel, operatorSla, operatorSvcAccess } from './data/access-control';
import { Topbar } from './layout';
import { RolesTab } from './page_settings';
import { MotivationDrawer, motivationFor, shiftDuration, shiftFmtTime } from './page_shifts';
import { ServiceAccessEditor } from './features/settings/service-access-editor';
import { accountApi, aftersalesApi, ordersApi, servicesApi, usersApi, workforceApi } from './api/resources';
import { toUiUser } from './api/adapters';
import { useAuth } from './core/auth-context';
import { resultsOf } from './api/client';




const PRESENCE_TONE = { 'Онлайн': 'green', 'Не в сети': 'gray', 'В отпуске': 'amber' };
const WORK_STATUS = ['Работает', 'Отпуск', 'Больничный', 'Выходной'];


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
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{mot.uniform ? 'Единые ставки для всех видов услуг' : 'Индивидуальные ставки по каждому виду услуг'}</div>
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


function ProfileStats({ operator, userId }) {
  const toast = useToast();
  const [stats, setStats] = useState([['Оформлено заказов', '—'], ['Выписано услуг', '—'], ['Обменов', '—'], ['Возвратов', '—'], ['Среднее время обработки заявки', '—'], ['Общая прибыль (для компании)', '—'], ['Заработок за месяц', '—'], ['Заработок за период', '—']]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      ordersApi.list(userId ? { operator: userId } : {}, controller.signal),
      servicesApi.list(userId ? { operator: userId } : {}, controller.signal),
      aftersalesApi.list(userId ? { responsible: userId } : {}, controller.signal),
      workforceApi.motivationAccruals(userId ? { user: userId } : {}, controller.signal),
    ]).then(([orderPayload, servicePayload, aftersalesPayload, accrualPayload]) => {
      const orders = resultsOf(orderPayload), services = resultsOf(servicePayload), cases = resultsOf(aftersalesPayload), accruals = resultsOf(accrualPayload);
      const issued = services.filter((service) => service.status === 'issued');
      const profit = services.reduce((sum, service) => sum + Number(service.client_total || 0) - Number(service.supplier_cost || 0), 0);
      const earnings = accruals.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      setStats([
        ['Оформлено заказов', String(orders.length)], ['Выписано услуг', String(issued.length)],
        ['Обменов', String(cases.filter((item) => item.type === 'exchange').length)], ['Возвратов', String(cases.filter((item) => item.type === 'refund').length)],
        ['Среднее время обработки заявки', orders.length ? `${Math.round(orders.reduce((sum, item) => sum + Number(item.response_minutes || 0), 0) / orders.length)} мин` : '—'],
        ['Общая прибыль (для компании)', `${Math.round(profit).toLocaleString('ru-RU')} $`],
        ['Заработок за месяц', `${Math.round(earnings).toLocaleString('ru-RU')} $`], ['Заработок за период', `${Math.round(earnings).toLocaleString('ru-RU')} $`],
      ]);
    }).catch((error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); });
    return () => controller.abort();
  }, [userId]);
  const exportStats = () => {
    const csv = [['Показатель', 'Значение'], ...stats].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `statistics-${operator}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Статистика выгружена', 'ok');
  };
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span className="chip" style={{ cursor: 'default' }}>Период: 01.06.2026 — 07.07.2026 <Icon name="chevDown" /></span>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" icon="download" onClick={exportStats}>Экспорт</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map(([l, v], i) => (
          <div className="stat-card" key={i}><div className="s-label">{l}</div><div className="s-value" style={{ fontSize: 22 }}>{v}</div></div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>Заработок рассчитан по индивидуальной мотивации оператора и связан с оформленными услугами.</div>
    </div>
  );
}


function ProfileWorkTime({ user }) {
  const toast = useToast();
  const operator = user.name;
  const [sla, setSla] = useState(user.slaResponseMin || operatorSla(operator));
  const [shift, setShift] = useState(null);
  useEffect(() => {
    Promise.all([usersApi.sla(user.id), workforceApi.currentShift()])
      .then(([slaData, shiftData]) => { setSla(slaData.sla_response_minutes || 15); setShift(shiftData.shift); })
      .catch((error) => toast(error.message, 'err'));
  }, [user.id]);
  const saveSla = async () => {
    try { await usersApi.setSla(user.id, sla); toast('Норматив отклика сохранён: ' + sla + ' мин', 'ok'); }
    catch (error) { toast(error.message, 'err'); }
  };
  const metrics = [
    ['Начало смены', shift ? new Date(shift.started_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—'],
    ['Окончание смены', shift ? '— (открыта)' : '18:14'],
    ['Отработанные часы', shift ? shiftDuration(new Date(shift.started_at).getTime()) : '—'],
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

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Отклик на заявку</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Норматив времени первого отклика. При превышении на дашборде отображается просрочка / накал тайминга.</div>
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

function ProfilePage({ user, onNavigate, initialTab }) {
  const toast = useToast();
  const auth = useAuth();
  const u = user || auth.user || CURRENT_USER;
  const canManageUsers = (auth.user?.permissions || u.permissions || []).includes('users.manage');
  const [tab, setTab] = useState(initialTab || 'profile');
  const [pf, setPf] = useState({ ...u });
  const [pw, setPw] = useState({ cur: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState({});
  const [notif, setNotif] = useState({ incrm: true, email: true, telegram: true, max: true, whatsapp: false, sms: false, push: true, desktop: false, newReq: true, exchRet: true, overdue: true, chat: true, orderChg: false });
  const [rolesOpen, setRolesOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({ theme: 'Светлая', dateFmt: 'ДД.ММ.ГГГГ', timeFmt: '24 часа', currency: 'USD', lang: u.lang, pageSize: '25', startPage: 'Главное' });
  const [twoFactor, setTwoFactor] = useState({ enabled: false, confirmedAt: null, setupOpen: false, disableOpen: false, secret: '', uri: '', code: '', password: '' });

  useEffect(() => { setPf({ ...u }); }, [u.id]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([accountApi.preferences(controller.signal), accountApi.sessions(controller.signal), accountApi.twoFactorStatus(controller.signal)])
      .then(([preference, sessions, twoFactorStatus]) => {
        setPrefs({
          theme: { light: 'Светлая', dark: 'Тёмная', system: 'Системная' }[preference.theme] || 'Светлая',
          dateFmt: preference.date_format || 'ДД.ММ.ГГГГ', timeFmt: preference.time_format || '24 часа',
          currency: preference.base_currency || 'USD',
          lang: { ru: 'Русский', ky: 'Кыргызча', en: 'English' }[preference.language] || 'Русский',
          pageSize: String(preference.page_size || 25), startPage: preference.start_page || 'Главное',
        });
        setNotif((current) => ({ ...current, ...(preference.notification_channels || {}), ...(preference.notification_categories || {}) }));
        setDevices(sessions.results || []);
        setTwoFactor((current) => ({ ...current, enabled: Boolean(twoFactorStatus.enabled), confirmedAt: twoFactorStatus.confirmed_at || null }));
      })
      .catch((error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); });
    return () => controller.abort();
  }, []);

  const setField = (k) => (e) => setPf((p) => ({ ...p, [k]: e.target.value }));
  const savePassword = async () => {
    const er = {};
    if (!pw.cur) er.cur = 'Введите текущий пароль';
    if (!pw.next) er.next = 'Введите новый пароль'; else if (pw.next.length < 10) er.next = 'Минимум 10 символов';
    if (pw.confirm !== pw.next) er.confirm = 'Пароли не совпадают';
    setPwErr(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    setSaving(true);
    try {
      await accountApi.changePassword(pw.cur, pw.next);
      setPw({ cur: '', next: '', confirm: '' }); toast('Пароль изменён. Другие сессии завершены.', 'ok');
    } catch (error) { toast(error.message, 'err'); }
    finally { setSaving(false); }
  };

  const saveProfile = async () => {
    const [lastName = '', firstName = '', ...middle] = pf.name.trim().split(/\s+/);
    setSaving(true);
    try {
      const updated = await accountApi.updateMe({
        last_name: lastName, first_name: firstName, middle_name: middle.join(' '),
        work_phone: pf.workPhone, internal_phone: pf.internalPhone, telegram: pf.telegram,
        position: pf.position, department: pf.dept, hired_at: pf.hired || null,
        timezone: pf.tz.includes('Москва') ? 'Europe/Moscow' : pf.tz.includes('Ташкент') ? 'Asia/Tashkent' : 'Asia/Bishkek',
        language: { 'Русский': 'ru', 'Кыргызча': 'ky', English: 'en' }[pf.lang] || 'ru',
        work_status: { 'Работает': 'working', 'Отпуск': 'vacation', 'Больничный': 'sick_leave', 'Выходной': 'day_off' }[pf.workStatus] || 'working',
      });
      setPf(toUiUser(updated));
      await auth.refreshSession();
      toast('Профиль сохранён', 'ok');
    } catch (error) { toast(error.message, 'err'); }
    finally { setSaving(false); }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await accountApi.updatePreferences({
        theme: { 'Светлая': 'light', 'Тёмная': 'dark', 'Системная': 'system' }[prefs.theme],
        date_format: prefs.dateFmt, time_format: prefs.timeFmt, base_currency: prefs.currency,
        language: { 'Русский': 'ru', 'Кыргызча': 'ky', English: 'en' }[prefs.lang],
        page_size: Number(prefs.pageSize), start_page: prefs.startPage,
        notification_channels: notif, notification_categories: notif,
      });
      toast('Предпочтения сохранены', 'ok');
    } catch (error) { toast(error.message, 'err'); }
    finally { setSaving(false); }
  };

  const revokeSession = async (id) => {
    try {
      await accountApi.revokeSession(id);
      setDevices((current) => current.filter((item) => item.id !== id));
      toast('Сессия завершена', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };

  const logoutOtherSessions = async () => {
    try {
      await accountApi.logoutAll();
      setDevices((current) => current.filter((item) => item.is_current));
      toast('Завершены все сессии кроме текущей', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };

  const startTwoFactorSetup = async () => {
    setSaving(true);
    try {
      const setup = await accountApi.twoFactorSetup();
      setTwoFactor((current) => ({ ...current, setupOpen: true, secret: setup.secret, uri: setup.provisioning_uri, code: '' }));
    } catch (error) { toast(error.message || 'Не удалось начать настройку 2FA', 'err'); }
    finally { setSaving(false); }
  };

  const confirmTwoFactor = async () => {
    if (!twoFactor.code.trim()) { toast('Введите код из приложения', 'err'); return; }
    setSaving(true);
    try {
      const status = await accountApi.twoFactorConfirm(twoFactor.code.trim());
      setTwoFactor((current) => ({ ...current, enabled: Boolean(status.enabled), confirmedAt: status.confirmed_at || null, setupOpen: false, secret: '', uri: '', code: '' }));
      toast('Двухфакторная аутентификация включена', 'ok');
    } catch (error) { toast(error.message || 'Не удалось подтвердить 2FA', 'err'); }
    finally { setSaving(false); }
  };

  const disableTwoFactor = async () => {
    if (!twoFactor.password || !twoFactor.code.trim()) { toast('Введите пароль и код подтверждения', 'err'); return; }
    setSaving(true);
    try {
      const status = await accountApi.twoFactorDisable(twoFactor.password, twoFactor.code.trim());
      setTwoFactor((current) => ({ ...current, enabled: Boolean(status.enabled), confirmedAt: status.confirmed_at || null, disableOpen: false, password: '', code: '' }));
      toast('Двухфакторная аутентификация отключена', 'ok');
    } catch (error) { toast(error.message || 'Не удалось отключить 2FA', 'err'); }
    finally { setSaving(false); }
  };

  const TABS = [
    { key: 'profile', label: 'Профиль' }, { key: 'security', label: 'Безопасность' },
    { key: 'notif', label: 'Уведомления' }, { key: 'prefs', label: 'Предпочтения' },
    { key: 'access', label: 'Доступы' }, { key: 'motivation', label: 'Мотивация' },
    { key: 'stats', label: 'Статистика' }, { key: 'worktime', label: 'Рабочее время' },
  ];

  const sessionRows = devices.map((session) => ({
    id: session.id,
    time: session.created_at ? new Date(session.created_at).toLocaleString('ru-RU') : '—',
    ip: session.ip_address || '—',
    device: session.user_agent || 'Неизвестное устройство',
    current: Boolean(session.is_current),
  }));


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

        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          <Avatar src={u.avatar} name={u.name} size={92} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.02em' }}>{u.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 3 }}>{u.position} · {u.dept}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <Pill tone="blue">{u.role}</Pill>
              <Pill tone={PRESENCE_TONE[u.presence] || 'gray'}>{u.presence}</Pill>
              <Pill tone={u.workStatus === 'Работает' ? 'green' : 'amber'}>{u.workStatus}</Pill>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Последний вход</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{u.lastLogin}</div>
            <Button variant="secondary" icon="edit" size="sm" style={{ marginTop: 10 }} onClick={() => setTab('profile')}>Редактировать</Button>
          </div>
        </div>

        <div style={{ marginBottom: 20, overflowX: 'auto' }}><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>


        {tab === 'profile' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 900 }}>
            <div className="form-grid">
              <Field label="ФИО"><Input value={pf.name} onChange={setField('name')} /></Field>
              <Field label="Должность"><Input value={pf.position} onChange={setField('position')} /></Field>
              <Field label="Подразделение"><Input value={pf.dept} onChange={setField('dept')} /></Field>
              <Field label="Роль в системе"><Input value={pf.role} readOnly /></Field>
              <Field label="Руководитель"><Input value={pf.manager || '—'} readOnly /></Field>
              <UFDateField label="Дата приёма на работу" value={pf.hired || null} onChange={(v) => setField('hired')({ target: { value: v } })} placeholder="дд.мм.гггг" />
              <Field label="Рабочий e-mail"><Input value={pf.workEmail} readOnly leadIcon="mail" /></Field>
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
              <Button variant="primary" onClick={saveProfile} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить изменения'}</Button>
            </div>
          </div>
        )}


        {tab === 'security' && (
          <div className="fade-in grid-2" style={{ alignItems: 'start' }}>
            <div className="card card-pad">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Смена пароля</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Текущий пароль" error={pwErr.cur}><Input type={showPw ? 'text' : 'password'} value={pw.cur} onChange={(e) => setPw((p) => ({ ...p, cur: e.target.value }))} error={pwErr.cur} trailIcon={showPw ? 'eyeOff' : 'eye'} onTrail={() => setShowPw((s) => !s)} placeholder="••••••••" /></Field>
                <Field label="Новый пароль" error={pwErr.next}><Input type={showPw ? 'text' : 'password'} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} error={pwErr.next} placeholder="Минимум 10 символов" /></Field>
                <Field label="Подтвердите пароль" error={pwErr.confirm}><Input type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} error={pwErr.confirm} placeholder="Повторите новый пароль" /></Field>
                <Button variant="primary" onClick={savePassword} disabled={saving} style={{ alignSelf: 'flex-start' }}>Изменить пароль</Button>
              </div>
              <div style={{ borderTop: '1px solid var(--line)', marginTop: 22, paddingTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Двухфакторная аутентификация</div>
                  <div className="hint">{twoFactor.enabled ? 'Включена для входа в систему' : 'Подтверждение входа через приложение'}</div>
                </div>
                <Toggle on={twoFactor.enabled} onChange={(next) => next ? startTwoFactorSetup() : setTwoFactor((current) => ({ ...current, disableOpen: true, password: '', code: '' }))} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card card-pad">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <h3 className="card-title" style={{ fontSize: 16, margin: 0, flex: 1 }}>Активные устройства</h3>
                  <Button variant="secondary" size="sm" icon="logout" onClick={logoutOtherSessions}>Выйти со всех</Button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {devices.map((d) => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--field-line)' }}>
                      <Icon name="grid" style={{ width: 18, height: 18, color: 'var(--muted)' }} />
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{d.user_agent || 'Неизвестное устройство'}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.ip_address || 'IP не определён'} · {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString('ru-RU') : '—'}</div></div>
                      {d.is_current ? <Pill tone="green">Текущее</Pill> : <button className="icon-btn" onClick={() => revokeSession(d.id)}><Icon name="x" /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Активные авторизации</h3>
                <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
                  <table className="tbl">
                    <thead><tr><th>Создана</th><th>IP</th><th>Устройство</th><th>Статус</th></tr></thead>
                    <tbody>{sessionRows.map((l) => (
                      <tr key={l.id}><td className="t-muted">{l.time}</td><td>{l.ip}</td><td>{l.device}</td><td><Pill tone={l.current ? 'green' : 'gray'}>{l.current ? 'Текущая' : 'Активная'}</Pill></td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}


        {tab === 'notif' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 680 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Каналы доставки</div>
            {channelRows.map(([k, l], i, arr) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{l}</span>
                <Toggle on={notif[k]} onChange={(v) => setNotif((n) => ({ ...n, [k]: v }))} />
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '20px 0 6px' }}>Общие события</div>
            {eventRows.map(([k, l], i, arr) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{l}</span>
                <Toggle on={notif[k]} onChange={(v) => setNotif((n) => ({ ...n, [k]: v }))} />
              </div>
            ))}


            {(() => {
              const acc = operatorSvcAccess(u.name);
              const ACTION_EVENTS = ['Бронирование', 'Выписка', 'Обмен', 'Возврат', 'Отмена', 'Корректировка документов', 'Отправка документов клиенту'];
              const kinds = acc.fullAccess
                ? SVC_ACCESS_KINDS.map((k) => [k, ACTION_EVENTS])
                : Object.keys(acc.kinds || {})
                    .map((k) => [k, ACTION_EVENTS.filter((r) => acc.kinds[k] && acc.kinds[k][r])])
                    .filter(([, rights]) => rights.length);
              return (
                <div style={{ marginTop: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>По услугам и действиям</span>
                    <Pill tone="blue">по вашим доступам</Pill>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <Icon name="lock" style={{ width: 14, height: 14, color: 'var(--muted-2)', flexShrink: 0, marginTop: 1 }} />
                    Набор услуг и действий определяется вашими доступами — их назначает администратор в разделе «Доступы». Здесь вы включаете уведомления только по тем действиям, которые вам доступны.
                  </div>
                  {kinds.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', padding: '10px 0' }}>Вам не назначены услуги — обратитесь к администратору.</div>}
                  {kinds.map(([kind, rights]) => (
                    <div key={kind} className="card" style={{ overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                        <Icon name="check" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
                        <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{kind}</span>
                      </div>
                      <div style={{ padding: '4px 14px' }}>
                        {rights.map((r, i) => {
                          const key = 'svc:' + kind + ':' + r;
                          return (
                            <div key={r} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < rights.length - 1 ? '1px solid var(--line)' : 'none' }}>
                              <span style={{ fontSize: 14, color: 'var(--body)' }}>{r}</span>
                              <Toggle on={notif[key] !== false} onChange={(v) => setNotif((n) => ({ ...n, [key]: v }))} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <Button variant="primary" onClick={savePreferences} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
            </div>
          </div>
        )}


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
              <Button variant="primary" onClick={savePreferences} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
            </div>
          </div>
        )}


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
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Область ответственности оператора: с какими услугами он работает в заказе.</div>
              {canManageUsers
                ? <ServiceAccessEditor operator={u.name} userId={u.serverId || u.id} />
                : <div style={{ fontSize: 13, color: 'var(--muted)' }}>Доступы назначает администратор в настройках пользователей.</div>}
            </div>
          </div>
        )}


        {tab === 'motivation' && <ProfileMotivation operator={u.name} />}
        {tab === 'stats' && <ProfileStats operator={u.name} userId={u.serverId || u.id} />}
        {tab === 'worktime' && <ProfileWorkTime user={u} />}
      </div>


      <Drawer open={twoFactor.setupOpen} onClose={() => setTwoFactor((current) => ({ ...current, setupOpen: false, code: '' }))} title="Настройка 2FA" sub="Добавьте ключ в приложение аутентификации" width="min(560px,94vw)"
        footer={<><Button variant="secondary" onClick={() => setTwoFactor((current) => ({ ...current, setupOpen: false, code: '' }))}>Отмена</Button><Button variant="primary" icon="check" onClick={confirmTwoFactor} disabled={saving}>{saving ? 'Проверка…' : 'Подтвердить'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Секретный ключ"><Input readOnly value={twoFactor.secret} trailIcon="copy" onTrail={async () => { await navigator.clipboard.writeText(twoFactor.secret); toast('Ключ скопирован', 'ok'); }} /></Field>
          <Field label="otpauth URI"><Input readOnly value={twoFactor.uri} trailIcon="copy" onTrail={async () => { await navigator.clipboard.writeText(twoFactor.uri); toast('URI скопирован', 'ok'); }} /></Field>
          <Field label="Код из приложения"><Input value={twoFactor.code} onChange={(e) => setTwoFactor((current) => ({ ...current, code: e.target.value }))} placeholder="123456" /></Field>
        </div>
      </Drawer>

      <Drawer open={twoFactor.disableOpen} onClose={() => setTwoFactor((current) => ({ ...current, disableOpen: false, password: '', code: '' }))} title="Отключение 2FA" sub="Подтвердите действие паролем и кодом" width="min(460px,94vw)"
        footer={<><Button variant="secondary" onClick={() => setTwoFactor((current) => ({ ...current, disableOpen: false, password: '', code: '' }))}>Отмена</Button><Button variant="primary" icon="check" onClick={disableTwoFactor} disabled={saving}>{saving ? 'Проверка…' : 'Отключить'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Текущий пароль"><Input type="password" value={twoFactor.password} onChange={(e) => setTwoFactor((current) => ({ ...current, password: e.target.value }))} /></Field>
          <Field label="Код из приложения"><Input value={twoFactor.code} onChange={(e) => setTwoFactor((current) => ({ ...current, code: e.target.value }))} placeholder="123456" /></Field>
        </div>
      </Drawer>

      <Drawer open={rolesOpen} onClose={() => setRolesOpen(false)} title="Матрица прав по ролям" sub="Права доступа по ролям" width="min(940px,97vw)"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setRolesOpen(false)}>Закрыть</Button>}>
        <RolesTab />
      </Drawer>
    </div>
  );
}

Object.assign(window, { ProfilePage, ProfileMotivation, ProfileStats, ProfileWorkTime });



export { PRESENCE_TONE, WORK_STATUS, ProfileMotivation, ProfileStats, ProfileWorkTime, ProfilePage };
