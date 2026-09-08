import { translate as t } from '../../../shared/preferences/translations.js';
import { preferencesToForm, preferencesFromForm, formatProfileDate } from '../../../shared/preferences/preferences.js';
import { useEffect, useState } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { Avatar } from '../../../shared/ui/Avatar.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Checkbox } from '../../../shared/ui/Checkbox.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Tabs } from '../../../shared/ui/Tabs.jsx';
import { Toggle } from '../../../shared/ui/Toggle.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { UFDateField } from '../../../shared/ui/UnifiedDateField.jsx';
import { CURRENCIES, CURRENT_USER } from '../../../legacy/data/index.jsx';
import { SVC_ACCESS_KINDS, operatorKindsLabel, operatorSla, operatorSvcAccess } from '../../../legacy/data/access-control.jsx';
import { Topbar } from '../../../shared/ui/Topbar.jsx';
import { RolesTab } from '../../settings/index.js';
import { MotivationDrawer, motivationFromRules, shiftDuration, shiftFmtTime } from '../../workforce/index.js';
import { ServiceAccessEditor, serviceAccessToUi } from '../../settings/index.js';
import { accountApi } from '../../account/api.js';
import { aftersalesApi } from '../../returns/api.js';
import { ordersApi } from '../../orders/api.js';
import { servicesApi } from '../../services/api.js';
import { usersApi } from '../../users/api.js';
import { workforceApi } from '../../workforce/api.js';
import { toUiUser } from '../../../shared/auth/user.mapper.js';
import { useAuth } from '../../../shared/auth/auth-context.jsx';
import { resultsOf } from '../../../shared/api/client.js';




const PRESENCE_TONE = { 'Онлайн': 'green', 'Не в сети': 'gray', 'В отпуске': 'amber' };
const WORK_STATUS = ['Работает', 'Отпуск', 'Больничный', 'Выходной'];


function ProfileMotivation({ operator, userId, canEdit }) {
  const [tick, setTick] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const [mot, setMot] = useState(() => motivationFromRules([]));
  const toast = useToast();
  useEffect(() => {
    const controller = new AbortController();
    workforceApi.motivationRules(controller.signal, userId, true)
      .then((payload) => { const loaded = resultsOf(payload); setRules(loaded); setMot(motivationFromRules(loaded.filter((rule) => !rule.archived_at))); })
      .catch((error) => { if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить мотивацию', 'err'); });
    return () => controller.abort();
  }, [tick, userId]);
  const rows = [['service', 'Процент от сервисного сбора'], ['markup', 'Процент от агентской надбавки'], ['commission', 'Процент от комиссионного вознаграждения']];
  const history = [...rules].filter((rule) => rule.updated_at).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <h3 className="card-title" style={{ fontSize: 17, margin: 0 }}>{t("Система мотивации")}</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{mot.uniform ? 'Единые ставки для всех видов услуг' : 'Индивидуальные ставки по каждому виду услуг'}</div>
        </div>
        {canEdit && <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>{t("Изменить")}</Button>}
      </div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <div className="kv">
            {rows.map(([k, l]) => (
              <div className="kv-row" key={k}><span className="k">{t(l)}</span><span className="v">{mot.base[k]} %</span></div>
            ))}
          </div>
          {!mot.uniform && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{t("Показаны базовые ставки. Для отдельных видов услуг заданы свои значения — см. «Изменить».")}</div>}
        </div>
        <div className="card card-pad">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{t("История изменений мотивации")}</h4>
          <div className="timeline">
            {!history.length && <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t("Правила ещё не настроены.")}</div>}
            {history.map((rule) => (
              <div className="tl-item" key={rule.id}><span className="tl-dot" /><span className="tl-line" />
                <div><div className="tl-time">{new Date(rule.updated_at).toLocaleString('ru-RU')}</div><div className="tl-text">{t("Обновлено правило «")}{rule.service_kind}»</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {canEdit && <MotivationDrawer open={editOpen} operator={operator} userId={userId} onClose={() => { setEditOpen(false); setTick((t) => t + 1); }} />}
    </div>
  );
}


function ProfileStats({ operator, userId }) {
  const toast = useToast();
  const { user } = useAuth();
  const today = new Date();
  const localDate = (value) => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  const [from, setFrom] = useState(localDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(localDate(today));
  const [stats, setStats] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError('');
    accountApi.statistics({from, to}, controller.signal).then((data) => {
      const money = (values) => Object.entries(values).map(([currency, amount]) => `${Number(amount).toLocaleString('ru-RU')} ${currency}`).join(' · ') || '0';
      setStats([['Оформлено заказов', data.orders], ['Выписано услуг', data.issued], ['Обменов', data.exchanges], ['Возвратов', data.refunds], ['Среднее время обработки заявки', data.response_minutes == null ? '—' : `${data.response_minutes} мин`], ['Общая прибыль (для компании)', money(data.profit)], ['Заработок за период', money(data.earnings)]]);
    }).catch((error) => { if (error.name !== 'AbortError') { setError(error.message); toast(error.message, 'err'); } }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [userId, from, to]);
  const exportStats = () => {
    const csv = [['Период', `${from} — ${to}`], ['Показатель', 'Значение'], ...stats].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = `statistics-${operator}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="fade-in"><div style={{display:'flex', gap:12, alignItems:'end', marginBottom:16}}>
    <Field label={t("Начало периода")}><Input aria-label="Начало периода" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
    <Field label={t("Конец периода")}><Input aria-label="Конец периода" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
    <Button variant="secondary" icon="download" disabled={busy || !!error} onClick={exportStats}>{t("Экспорт")}</Button>
  </div>{error && <p role="alert">{error}</p>}{busy ? <p>{t("Загрузка статистики…")}</p> : <div className="grid-2">{stats.map(([label, value]) => <div className="stat-card" key={t(label)}><div className="s-label">{t(label)}</div><div className="s-value" style={{fontSize:22}}>{value}</div></div>)}</div>}
    <p className="hint">{formatProfileDate(from, user?.preferences)} — {formatProfileDate(to, user?.preferences)}{t(". Суммы показаны отдельно по валютам; прибыль рассчитана по выписанным услугам.")}</p>
  </div>;
}


function ProfileWorkTime({ user, canEdit = false }) {
  const toast = useToast();
  const operator = user.name;
  const [sla, setSla] = useState(user.slaResponseMin || operatorSla(operator));
  const [shift, setShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([usersApi.sla(user.id, controller.signal), workforceApi.currentShift(controller.signal), workforceApi.shifts({ user: user.id }, controller.signal)])
      .then(([slaData, shiftData, shiftHistory]) => { setSla(slaData.sla_response_minutes || 15); setShift(shiftData.shift); setShifts(resultsOf(shiftHistory)); })
      .catch((error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); });
    return () => controller.abort();
  }, [user.id]);
  const saveSla = async () => {
    try { await usersApi.setSla(user.id, sla); toast('Норматив отклика сохранён: ' + sla + ' мин', 'ok'); }
    catch (error) { toast(error.message, 'err'); }
  };
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthShifts = shifts.filter((item) => new Date(item.ended_at || now) >= monthStart);
  const workedMs = monthShifts.reduce((sum, item) => sum + Math.max(0, new Date(item.ended_at || now) - Math.max(new Date(item.started_at).getTime(), monthStart.getTime())), 0);
  const hours = Math.floor(workedMs / 3600000), minutes = Math.floor((workedMs % 3600000) / 60000);
  const lastClosed = shifts.find((item) => item.ended_at);
  const metrics = [
    ['Начало смены', shift ? new Date(shift.started_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—'],
    ['Окончание смены', shift ? '— (открыта)' : lastClosed ? new Date(lastClosed.ended_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—'],
    ['Текущая длительность', shift ? shiftDuration(new Date(shift.started_at)) : '—'],
    ['Отработано за месяц', monthShifts.length ? `${hours} ч ${String(minutes).padStart(2, '0')} мин` : '—'],
    ['Операций за месяц', String(monthShifts.reduce((sum, item) => sum + (item.operations || []).length, 0))],
    ['Смен за месяц', String(monthShifts.length)],
  ];
  const shiftsHistory = shifts.map((item) => ({
    id: item.id, date: formatProfileDate(item.started_at, { ...user.preferences, timezone: user.timezone }),
    span: `${shiftFmtTime(new Date(item.started_at))} — ${item.ended_at ? shiftFmtTime(new Date(item.ended_at)) : 'открыта'}`,
    worked: shiftDuration(new Date(item.started_at), item.ended_at ? new Date(item.ended_at) : new Date()), operations: (item.operations || []).length,
  }));
  return (
    <div className="fade-in">

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{t("Отклик на заявку")}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t("Норматив времени первого отклика. При превышении на дашборде отображается просрочка / накал тайминга.")}</div>
          </div>
          <div style={{ width: 120 }}><Input type="number" min="1" readOnly={!canEdit} value={sla} onChange={(e) => setSla(Math.max(1, parseInt(e.target.value) || 1))} /></div>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{t("минут")}</span>
          {canEdit && <Button size="sm" icon="check" onClick={saveSla}>{t("Сохранить")}</Button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {metrics.map(([l, v], i) => (
          <div className="stat-card" key={i}><div className="s-label">{t(l)}</div><div className="s-value" style={{ fontSize: 20 }}>{v}</div></div>
        ))}
      </div>

      <h4 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{t("История смен")}</h4>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>{t("Дата")}</th><th>{t("Смена")}</th><th>{t("Отработано")}</th><th>{t("Операций")}</th></tr></thead>
          <tbody>
            {!shiftsHistory.length && <tr><td colSpan={4} className="t-muted">{t("Смен пока нет")}</td></tr>}
            {shiftsHistory.map((s) => (
              <tr key={s.id}><td className="t-strong">{s.date}</td><td>{s.span}</td><td>{s.worked}</td><td>{s.operations}</td></tr>
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
  const canManageSettings = (auth.user?.permissions || u.permissions || []).includes('settings.manage');
  const [tab, setTab] = useState(initialTab || 'profile');
  const [pf, setPf] = useState({ ...u });
  const [pw, setPw] = useState({ cur: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState({});
  const [notif, setNotif] = useState({ incrm: true, email: true, telegram: true, max: true, whatsapp: false, sms: false, push: true, desktop: false, newReq: true, exchRet: true, overdue: true, chat: true, orderChg: false });
  const [rolesOpen, setRolesOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [loaded, setLoaded] = useState({ preferences: false, security: false });
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({ theme: 'Светлая', dateFmt: 'ДД.ММ.ГГГГ', timeFmt: '24 часа', currency: 'USD', lang: u.lang, pageSize: '25', startPage: 'Главное' });
  const [twoFactor, setTwoFactor] = useState({ enabled: false, confirmedAt: null, setupOpen: false, disableOpen: false, secret: '', uri: '', code: '', password: '' });

  useEffect(() => { setPf({ ...u }); }, [u.id]);
  useEffect(() => { setTab(initialTab || 'profile'); }, [initialTab]);
  useEffect(() => {
    const controller = new AbortController();
    const handleError = (error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); };
    accountApi.preferences(controller.signal).then((preference) => {
      setPrefs(preferencesToForm(preference));
      setNotif((current) => ({ ...current, ...(preference.notification_channels || {}), ...(preference.notification_categories || {}) }));
      setLoaded((current) => ({ ...current, preferences: true }));
    }).catch(handleError);
    accountApi.sessions(controller.signal).then((sessions) => setDevices(sessions.results || [])).catch(handleError);
    accountApi.twoFactorStatus(controller.signal).then((status) => {
      setTwoFactor((current) => ({ ...current, enabled: Boolean(status.enabled), confirmedAt: status.confirmed_at || null }));
      setLoaded((current) => ({ ...current, security: true }));
    }).catch(handleError);
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
      setPw({ cur: '', next: '', confirm: '' }); setDevices((current) => current.filter((item) => item.is_current)); toast('Пароль изменён. Другие сессии завершены.', 'ok');
    } catch (error) { toast(error.message, 'err'); }
    finally { setSaving(false); }
  };

  const saveProfile = async () => {
    if (!pf.name?.trim()) { toast('Введите ФИО', 'err'); return; }
    const [lastName = '', firstName = '', ...middle] = pf.name.trim().split(/\s+/);
    setSaving(true);
    try {
      const updated = await accountApi.updateMe({
        last_name: lastName, first_name: firstName, middle_name: middle.join(' '),
        work_phone: pf.workPhone, internal_phone: pf.internalPhone, telegram: pf.telegram, max: pf.max || '', whatsapp: pf.whatsapp || '',
        position: pf.position, department: pf.dept, hired_at: pf.hired || null,
        timezone: (pf.tz || '').includes('Москва') ? 'Europe/Moscow' : (pf.tz || '').includes('Ташкент') ? 'Asia/Tashkent' : 'Asia/Bishkek',
        language: { 'Русский': 'ru', 'Кыргызча': 'ky', English: 'en' }[pf.lang] || 'ru',
        work_status: { 'Работает': 'working', 'Отпуск': 'vacation', 'Больничный': 'sick_leave', 'Выходной': 'day_off' }[pf.workStatus] || 'working',
      });
      setPf(toUiUser(updated));
      setPrefs((current) => ({ ...current, lang: toUiUser(updated).lang }));
      await auth.refreshSession();
      toast('Профиль сохранён', 'ok');
    } catch (error) { toast(error.message, 'err'); }
    finally { setSaving(false); }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const channelKeys = channelRows.map(([key]) => key);
      const updated = await accountApi.updatePreferences(tab === 'notif' ? {
        notification_channels: Object.fromEntries(Object.entries(notif).filter(([key]) => channelKeys.includes(key))),
        notification_categories: Object.fromEntries(Object.entries(notif).filter(([key]) => !channelKeys.includes(key))),
      } : preferencesFromForm(prefs));
      setPrefs(preferencesToForm(updated));
      setPf((current) => ({ ...current, lang: preferencesToForm(updated).lang }));
      await auth.refreshSession();
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
    time: session.created_at ? formatProfileDate(session.created_at, { ...u.preferences, timezone: u.timezone }, true) : '—',
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
      <Topbar title={t("Мой профиль")}>
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="chevLeft" onClick={() => onNavigate('dashboard')}>{t("Вернуться")}</Button>
      </Topbar>
      <div className="content">

        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{display:'grid', gap:8}}>
            <Avatar src={u.avatar} name={u.name} size={92} />
            <label className="btn btn-secondary btn-sm">{t("Изменить фото")}<input aria-label="Изменить фото" type="file" accept="image/png,image/jpeg,image/webp" disabled={saving} style={{position:'absolute',width:1,height:1,opacity:0}} onChange={async (event) => {
              const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
              if (file.size > 5 * 1024 * 1024) { toast('Максимальный размер фото — 5 МБ', 'err'); return; }
              setSaving(true);
              try { await accountApi.uploadAvatar(file); await auth.refreshSession(); toast('Фото сохранено', 'ok'); }
              catch (error) { toast(error.message, 'err'); } finally { setSaving(false); }
            }} /></label>
            {u.avatar && <Button size="sm" variant="secondary" disabled={saving} onClick={async () => { setSaving(true); try { await accountApi.removeAvatar(); await auth.refreshSession(); } catch (error) { toast(error.message, 'err'); } finally { setSaving(false); } }}>{t("Удалить фото")}</Button>}
          </div>
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
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t("Последний вход")}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{formatProfileDate(u.last_login, { ...u.preferences, timezone: u.timezone }, true)}</div>
            <Button variant="secondary" icon="edit" size="sm" style={{ marginTop: 10 }} onClick={() => setTab('profile')}>{t("Редактировать")}</Button>
          </div>
        </div>

        <div style={{ marginBottom: 20, overflowX: 'auto' }}><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>


        {tab === 'profile' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 900 }}>
            <div className="form-grid">
              <Field label={t("ФИО")}><Input value={pf.name} onChange={setField('name')} /></Field>
              <Field label={t("Должность")}><Input value={pf.position} onChange={setField('position')} /></Field>
              <Field label={t("Подразделение")}><Input value={pf.dept} onChange={setField('dept')} /></Field>
              <Field label={t("Роль в системе")}><Input value={pf.role} readOnly /></Field>
              <Field label={t("Руководитель")}><Input value={pf.manager_name || '—'} readOnly /></Field>
              <UFDateField label={t("Дата приёма на работу")} value={pf.hired || null} onChange={(v) => setField('hired')({ target: { value: v } })} placeholder={t("дд.мм.гггг")} />
              <Field label={t("Рабочий e-mail")}><Input value={pf.workEmail} readOnly leadIcon="mail" /></Field>
              <Field label={t("Рабочий телефон")}><Input value={pf.workPhone} onChange={setField('workPhone')} leadIcon="phone" /></Field>
              <Field label={t("Внутренний номер")}><Input value={pf.internalPhone} onChange={setField('internalPhone')} /></Field>
              <Field label="Telegram"><Input value={pf.telegram} onChange={setField('telegram')} placeholder="@username" /></Field>
              <Field label="MAX"><Input value={pf.max || ''} onChange={setField('max')} placeholder={t("ID или номер")} /></Field>
              <Field label="WhatsApp"><Input value={pf.whatsapp || ''} onChange={setField('whatsapp')} leadIcon="phone" placeholder="+996 700 000 000" /></Field>
              <Field label={t("Статус")}><Select options={WORK_STATUS} value={pf.workStatus} onChange={setField('workStatus')} /></Field>
              <Field label={t("Часовой пояс")}><Select options={['(GMT+6) Бишкек', '(GMT+3) Москва', '(GMT+5) Ташкент']} value={pf.tz} onChange={setField('tz')} /></Field>
              <Field label={t("Язык интерфейса")}><Select options={['Русский', 'Кыргызча', 'English']} value={pf.lang} onChange={setField('lang')} /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
              <Button variant="primary" onClick={saveProfile} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить изменения'}</Button>
            </div>
          </div>
        )}


        {tab === 'security' && (
          <div className="fade-in grid-2" style={{ alignItems: 'start' }}>
            <div className="card card-pad">
              <h3 className="card-title" style={{ marginBottom: 16 }}>{t("Смена пароля")}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={t("Текущий пароль")} error={pwErr.cur}><Input type={showPw ? 'text' : 'password'} value={pw.cur} onChange={(e) => setPw((p) => ({ ...p, cur: e.target.value }))} error={pwErr.cur} trailIcon={showPw ? 'eyeOff' : 'eye'} onTrail={() => setShowPw((s) => !s)} placeholder="••••••••" /></Field>
                <Field label={t("Новый пароль")} error={pwErr.next}><Input type={showPw ? 'text' : 'password'} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} error={pwErr.next} placeholder={t("Минимум 10 символов")} /></Field>
                <Field label={t("Подтвердите пароль")} error={pwErr.confirm}><Input type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} error={pwErr.confirm} placeholder={t("Повторите новый пароль")} /></Field>
                <Button variant="primary" onClick={savePassword} disabled={saving} style={{ alignSelf: 'flex-start' }}>{t("Изменить пароль")}</Button>
              </div>
              <div style={{ borderTop: '1px solid var(--line)', marginTop: 22, paddingTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{t("Двухфакторная аутентификация")}</div>
                  <div className="hint">{twoFactor.enabled ? 'Включена для входа в систему' : 'Подтверждение входа через приложение'}</div>
                </div>
                <Toggle on={twoFactor.enabled} disabled={saving || !loaded.security} aria-label="Двухфакторная аутентификация" onChange={(next) => next ? startTwoFactorSetup() : setTwoFactor((current) => ({ ...current, disableOpen: true, password: '', code: '' }))} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card card-pad">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <h3 className="card-title" style={{ fontSize: 16, margin: 0, flex: 1 }}>{t("Активные устройства")}</h3>
                  <Button variant="secondary" size="sm" icon="logout" onClick={logoutOtherSessions}>{t("Выйти со всех")}</Button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {devices.map((d) => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--field-line)' }}>
                      <Icon name="grid" style={{ width: 18, height: 18, color: 'var(--muted)' }} />
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{d.user_agent || 'Неизвестное устройство'}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.ip_address || 'IP не определён'} · {d.last_seen_at ? formatProfileDate(d.last_seen_at, { ...u.preferences, timezone: u.timezone }, true) : '—'}</div></div>
                      {d.is_current ? <Pill tone="green">{t("Текущее")}</Pill> : <button className="icon-btn" aria-label="Завершить сессию" onClick={() => revokeSession(d.id)}><Icon name="x" /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>{t("Активные авторизации")}</h3>
                <div className="table-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
                  <table className="tbl">
                    <thead><tr><th>{t("Создана")}</th><th>IP</th><th>{t("Устройство")}</th><th>{t("Статус")}</th></tr></thead>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>{t("Каналы доставки")}</div>
            <p className="hint">Внешние каналы требуют подключения сервиса доставки на сервере. Здесь сохраняются ваши предпочтения; включение переключателя не подтверждает отправку.</p>
            {channelRows.map(([k, l], i, arr) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{t(l)}</span>
                <Toggle on={notif[k]} onChange={async (v) => {
                  if (k === 'desktop' && v) {
                    if (!('Notification' in window)) { toast('Браузер не поддерживает уведомления', 'err'); return; }
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') { toast('Разрешите уведомления в настройках браузера', 'err'); return; }
                  }
                  setNotif((n) => ({ ...n, [k]: v }));
                }} />
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '20px 0 6px' }}>{t("Общие события")}</div>
            {eventRows.map(([k, l], i, arr) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{t(l)}</span>
                <Toggle on={notif[k]} onChange={(v) => setNotif((n) => ({ ...n, [k]: v }))} />
              </div>
            ))}


            {(() => {
              const acc = serviceAccessToUi(u.service_access || []);
              const ACTION_EVENTS = ['Бронирование', 'Выписка', 'Обмен', 'Возврат', 'Отмена', 'Корректировка документов', 'Отправка документов клиенту'];
              const kinds = acc.fullAccess
                ? SVC_ACCESS_KINDS.map((k) => [k, ACTION_EVENTS])
                : Object.keys(acc.kinds || {})
                    .map((k) => [k, ACTION_EVENTS.filter((r) => acc.kinds[k] && acc.kinds[k][r])])
                    .filter(([, rights]) => rights.length);
              return (
                <div style={{ marginTop: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{t("По услугам и действиям")}</span>
                    <Pill tone="blue">{t("по вашим доступам")}</Pill>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <Icon name="lock" style={{ width: 14, height: 14, color: 'var(--muted-2)', flexShrink: 0, marginTop: 1 }} />{t("Набор услуг и действий определяется вашими доступами — их назначает администратор в разделе «Доступы». Здесь вы включаете уведомления только по тем действиям, которые вам доступны.")}</div>
                  {kinds.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', padding: '10px 0' }}>{t("Вам не назначены услуги — обратитесь к администратору.")}</div>}
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
              <Button variant="primary" onClick={savePreferences} disabled={saving || !loaded.preferences}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
            </div>
          </div>
        )}


        {tab === 'prefs' && (
          <div className="card card-pad fade-in" style={{ maxWidth: 760 }}>
            <div className="form-grid">
              <Field label={t("Тема оформления")}><Select options={['Светлая', 'Тёмная', 'Системная']} value={prefs.theme} onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value }))} /></Field>
              <Field label={t("Формат даты")}><Select options={['ДД.ММ.ГГГГ', 'ММ/ДД/ГГГГ', 'ГГГГ-ММ-ДД']} value={prefs.dateFmt} onChange={(e) => setPrefs((p) => ({ ...p, dateFmt: e.target.value }))} /></Field>
              <Field label={t("Формат времени")}><Select options={['24 часа', '12 часов (AM/PM)']} value={prefs.timeFmt} onChange={(e) => setPrefs((p) => ({ ...p, timeFmt: e.target.value }))} /></Field>
              <Field label={t("Валюта по умолчанию")}><Select options={CURRENCIES.map((c) => c.code)} value={prefs.currency} onChange={(e) => setPrefs((p) => ({ ...p, currency: e.target.value }))} /></Field>
              <Field label={t("Язык интерфейса")}><Select options={['Русский', 'Кыргызча', 'English']} value={prefs.lang} onChange={(e) => setPrefs((p) => ({ ...p, lang: e.target.value }))} /></Field>
              <Field label={t("Размер страницы списка")}><Select options={['10', '25', '50', '100']} value={prefs.pageSize} onChange={(e) => setPrefs((p) => ({ ...p, pageSize: e.target.value }))} /></Field>
              <Field label={t("Стартовая страница после входа")}><Select options={['Главное', 'Заказы', 'Оформление', 'Чаты']} value={prefs.startPage} onChange={(e) => setPrefs((p) => ({ ...p, startPage: e.target.value }))} /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Button variant="primary" onClick={savePreferences} disabled={saving || !loaded.preferences}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
            </div>
          </div>
        )}


        {tab === 'access' && (
          <div className="fade-in grid-2" style={{ alignItems: 'start' }}>
            <div className="card card-pad">
              <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>{t("Роль и права")}</h3>
              <div className="kv" style={{ marginBottom: 12 }}>
                <div className="kv-row"><span className="k">{t("Роль")}</span><span className="v"><Pill tone="blue">{u.role}</Pill></span></div>
                <div className="kv-row"><span className="k">{t("Доступные разделы")}</span><span className="v" style={{ maxWidth: 260 }}>{(u.permissions || []).filter((code) => code.endsWith('.view')).map((code) => code.split('.')[0]).join(', ') || 'По назначенным правам'}</span></div>
                <div className="kv-row"><span className="k">{t("Доступные поставщики")}</span><span className="v">{t("В пределах прав вашей организации")}</span></div>
                <div className="kv-row"><span className="k">{t("Доступные компании")}</span><span className="v">{t("В пределах прав вашей организации")}</span></div>
                <div className="kv-row"><span className="k">{t("Доступные виды услуг")}</span><span className="v">{!u.service_access?.length ? 'Все виды услуг' : Object.entries(serviceAccessToUi(u.service_access).kinds).filter(([, rights]) => Object.values(rights).some(Boolean)).map(([name]) => name).join(', ') || 'Не назначены'}</span></div>
              </div>
              <Button variant="secondary" size="sm" icon="settings" onClick={() => setRolesOpen(true)}>{t("Матрица прав по ролям")}</Button>
            </div>
            <div className="card card-pad">
              <h3 className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>{t("Доступ по видам услуг")}</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{t("Область ответственности оператора: с какими услугами он работает в заказе.")}</div>
              {canManageUsers
                ? <ServiceAccessEditor operator={u.name} userId={u.serverId || u.id} />
                : <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t("Доступы назначает администратор в настройках пользователей.")}</div>}
            </div>
          </div>
        )}


        {tab === 'motivation' && <ProfileMotivation operator={u.name} userId={u.id} canEdit={canManageSettings} />}
        {tab === 'stats' && <ProfileStats operator={u.name} userId={u.serverId || u.id} />}
        {tab === 'worktime' && <ProfileWorkTime user={u} canEdit={canManageUsers} />}
      </div>


      <Drawer open={twoFactor.setupOpen} onClose={() => setTwoFactor((current) => ({ ...current, setupOpen: false, code: '' }))} title={t("Настройка 2FA")} sub={t("Добавьте ключ в приложение аутентификации")} width="min(560px,94vw)"
        footer={<><Button variant="secondary" onClick={() => setTwoFactor((current) => ({ ...current, setupOpen: false, code: '' }))}>{t("Отмена")}</Button><Button variant="primary" icon="check" onClick={confirmTwoFactor} disabled={saving}>{saving ? 'Проверка…' : 'Подтвердить'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t("Секретный ключ")}><Input readOnly value={twoFactor.secret} trailIcon="copy" onTrail={async () => { try { await navigator.clipboard.writeText(twoFactor.secret); toast('Ключ скопирован', 'ok'); } catch { toast('Не удалось скопировать. Выделите ключ вручную.', 'err'); } }} /></Field>
          <Field label="otpauth URI"><Input readOnly value={twoFactor.uri} trailIcon="copy" onTrail={async () => { try { await navigator.clipboard.writeText(twoFactor.uri); toast('URI скопирован', 'ok'); } catch { toast('Не удалось скопировать. Выделите URI вручную.', 'err'); } }} /></Field>
          <Field label={t("Код из приложения")}><Input value={twoFactor.code} onChange={(e) => setTwoFactor((current) => ({ ...current, code: e.target.value }))} placeholder="123456" /></Field>
        </div>
      </Drawer>

      <Drawer open={twoFactor.disableOpen} onClose={() => setTwoFactor((current) => ({ ...current, disableOpen: false, password: '', code: '' }))} title={t("Отключение 2FA")} sub={t("Подтвердите действие паролем и кодом")} width="min(460px,94vw)"
        footer={<><Button variant="secondary" onClick={() => setTwoFactor((current) => ({ ...current, disableOpen: false, password: '', code: '' }))}>{t("Отмена")}</Button><Button variant="primary" icon="check" onClick={disableTwoFactor} disabled={saving}>{saving ? 'Проверка…' : 'Отключить'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t("Текущий пароль")}><Input type="password" value={twoFactor.password} onChange={(e) => setTwoFactor((current) => ({ ...current, password: e.target.value }))} /></Field>
          <Field label={t("Код из приложения")}><Input value={twoFactor.code} onChange={(e) => setTwoFactor((current) => ({ ...current, code: e.target.value }))} placeholder="123456" /></Field>
        </div>
      </Drawer>

      <Drawer open={rolesOpen} onClose={() => setRolesOpen(false)} title={t("Матрица прав по ролям")} sub={t("Права доступа по ролям")} width="min(940px,97vw)"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setRolesOpen(false)}>{t("Закрыть")}</Button>}>
        <RolesTab readOnly={!(u.permissions || []).includes('roles.manage')} />
      </Drawer>
    </div>
  );
}

Object.assign(window, { ProfilePage, ProfileMotivation, ProfileStats, ProfileWorkTime });



export { PRESENCE_TONE, WORK_STATUS, ProfileMotivation, ProfileStats, ProfileWorkTime, ProfilePage };
