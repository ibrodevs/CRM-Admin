import { translate as t } from '../../../shared/preferences/translations.js';
import { useAuth } from '../../../shared/auth/auth-context.jsx';
import { DocumentTemplatesDrawer, SettingsDirectory } from './SettingsCatalogs.jsx';
import React, { useState, useEffect } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { ActionMenu } from '../../../shared/ui/ActionMenu.jsx';
import { Avatar } from '../../../shared/ui/Avatar.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Checkbox } from '../../../shared/ui/Checkbox.jsx';
import { ConfirmDialog, Drawer, ModalHeader } from '../../../shared/ui/Overlays.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Tabs } from '../../../shared/ui/Tabs.jsx';
import { Toggle } from '../../../shared/ui/Toggle.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { CURRENCIES, ORG_TYPE, USER_STATUS } from '../../../legacy/data/index.jsx';
import { operatorSla } from '../../../legacy/data/access-control.jsx';
import { Topbar } from '../../../shared/ui/Topbar.jsx';
import { ExtrasCatalogModal } from '../../orders/index.js';
import { ErrorCodesDrawer } from '../../notifications/index.js';
import { MotivationDrawer } from '../../workforce/index.js';
import { ServiceCardAdminDrawer } from './ServiceCardAdmin.jsx';
import { ServiceAccessEditor } from './ServiceAccessEditor.jsx';
import { notificationsApi } from '../../notifications/api.js';
import { usersApi } from '../../users/api.js';
import { workspaceActionsApi } from '../../workspace/api.js';
import { workspaceSettingsApi } from '../api/workspaceSettingsApi.js';
import { toLegacyUser } from '../../../legacy/adapters/legacy-adapters.js';
import { getDefaultCurrency, resolveCurrency } from '../../../shared/lib/money.js';

const ROLE_LABEL = { admin: 'Админ', operator: 'Оператор', accountant: 'Бухгалтер', manager: 'Менеджер' };
// Короткое пояснение к роли: нужно, чтобы администратор выбирал осознанно,
// а не по коду. Если у роли есть своё описание в backend, показываем его.
const ROLE_HINT = {
  admin: 'Полный доступ ко всем разделам и настройкам',
  manager: 'Заказы, продажи и контроль работы операторов',
  operator: 'Подбор услуг, бронирование и оформление заказов',
  accountant: 'Финансы, платежи и сверки',
};
const ROLE_ICON = { admin: 'lock', manager: 'users', operator: 'briefcase', accountant: 'finance' };
const PERMISSION_GROUPS = [
  { group: 'Заказы', items: [['orders.view', 'Просмотр заказов'], ['orders.create', 'Создание заказов'], ['orders.change', 'Изменение заказов'], ['orders.delete', 'Архивация заказов'], ['orders.reassign', 'Переназначение ответственного'], ['orders.change_status', 'Смена статуса заказа']] },
  { group: 'Услуги и КП', items: [['services.search', 'Поиск услуг'], ['services.book', 'Бронирование'], ['services.issue', 'Выписка'], ['services.exchange', 'Обмен'], ['services.refund', 'Возврат'], ['services.cancel', 'Аннуляция'], ['services.correct_document', 'Корректировка документов'], ['services.send_document', 'Отправка документов'], ['offers.view', 'Просмотр КП'], ['offers.create', 'Создание КП'], ['offers.change', 'Изменение КП'], ['offers.send', 'Отправка КП'], ['offers.approve', 'Согласование КП'], ['offers.archive', 'Архивация КП'], ['offers.manage_templates', 'Шаблоны КП']] },
  { group: 'Финансы', items: [['finance.view', 'Просмотр финансов'], ['finance.create_payment', 'Создание платежа'], ['finance.approve_payment', 'Подтверждение платежа'], ['finance.refund', 'Проведение возврата'], ['finance.reconcile', 'Сверка'], ['finance.export', 'Экспорт финансовых данных']] },
  { group: 'Документы', items: [['documents.view', 'Просмотр документов'], ['documents.view_sensitive', 'Паспортные и банковские документы'], ['documents.upload', 'Загрузка документов'], ['documents.generate', 'Генерация документов'], ['documents.sign', 'Подписание документов'], ['documents.void', 'Аннулирование документов'], ['documents.send', 'Отправка документов']] },
  { group: 'CRM и коммуникации', items: [['crm.view', 'Просмотр клиентов и компаний'], ['crm.change', 'Изменение клиентов и компаний'], ['crm.view_person_documents', 'Полные паспортные данные'], ['crm.force_create_duplicate', 'Создание дубля лица'], ['communications.view_internal', 'Внутренние чаты'], ['communications.view_client', 'Клиентские чаты'], ['communications.send', 'Отправка сообщений'], ['communications.moderate', 'Модерация сообщений']] },
  { group: 'Администрирование', items: [['suppliers.view', 'Просмотр поставщиков'], ['suppliers.change', 'Изменение поставщиков'], ['suppliers.manage_credentials', 'API-доступы поставщиков'], ['suppliers.manage_markup', 'Правила наценок'], ['users.manage', 'Пользователи'], ['roles.manage', 'Роли'], ['settings.manage', 'Настройки'], ['integrations.manage', 'Интеграции'], ['audit.view', 'Аудит']] },
];


function CurrencyModal({ open, onClose }) {
  const toast = useToast();
  const [extra, setExtra] = useState(true);
  const [vals, setVals] = useState({});
  const [baseCurrency, setBaseCurrency] = useState(getDefaultCurrency);
  const [currencies, setCurrencies] = useState(CURRENCIES);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!open) return;
    setBusy(true); setLoaded(false); setDraft(null);
    workspaceSettingsApi.getTenant('finance-currencies').then((data) => {
      setCurrencies(data.value?.currencies || [...CURRENCIES]);
      setVals(data.value?.rates || {}); setExtra(data.value?.extraCalculation ?? true); setBaseCurrency(resolveCurrency(data.value?.base)); setLoaded(true);
    }).catch((error) => toast(error.message || 'Не удалось загрузить курсы', 'err')).finally(() => setBusy(false));
  }, [open]);
  const save = async () => {
    if (Object.values(vals).some((value) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) <= 0))) { toast('Курсы должны быть положительными числами', 'err'); return; }
    setBusy(true);
    try {
      const rates = { ...Object.fromEntries(Object.entries(vals).filter(([, value]) => value !== '').map(([key, value]) => [key, Number(value)])), [baseCurrency]: 1 };
      await workspaceSettingsApi.saveTenant('finance-currencies', { base: baseCurrency, rates, extraCalculation: extra, currencies });
      CURRENCIES.splice(0, CURRENCIES.length, ...currencies.map((currency) => ({...currency, rate: rates[currency.code] ?? currency.rate})));
      toast('Курсы валют сохранены в backend для организации', 'ok'); onClose();
    } catch (error) { toast(error.message || 'Не удалось сохранить курсы', 'err'); }
    finally { setBusy(false); }
  };
  const changeBase = (next) => {
    const factor = Number(vals[next]);
    if (!Number.isFinite(factor) || factor <= 0) { toast('Сначала укажите курс новой основной валюты', 'err'); return; }
    setVals(Object.fromEntries(Object.entries({ ...vals, [baseCurrency]: 1 }).map(([code, rate]) => [code, rate === '' ? '' : Number((Number(rate) / factor).toFixed(8))])));
    setBaseCurrency(next);
  };
  const add = () => {
    const code = draft.code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code) || !draft.name.trim()) { toast('Укажите трёхбуквенный код и название валюты', 'err'); return; }
    if (currencies.some((item) => item.code === code)) { toast('Такая валюта уже есть', 'err'); return; }
    setCurrencies((items) => [...items, {...draft, code, name: draft.name.trim(), sym: draft.sym || code}]); setDraft(null);
  };
  return <Drawer open={open} onClose={onClose} title={t("Курсы валют")} sub={t("Курс одной единицы валюты в основной валюте")}
    footer={<><Field label={t("Основная валюта")}><Select aria-label="Основная валюта" options={currencies.map((item) => item.code)} value={baseCurrency} onChange={(e) => changeBase(e.target.value)} /></Field><Button disabled={busy || !loaded} onClick={save}>{t("Применить")}</Button></>}>
    {currencies.map((currency) => <div className="kv-row" key={currency.code}>
      <span>{currency.sym} {currency.name} ({currency.code})</span>
      <Input aria-label={`Курс ${currency.code}`} type="number" min="0.00000001" step="any" value={currency.code === baseCurrency ? 1 : vals[currency.code] ?? ''} readOnly={currency.code === baseCurrency} onChange={(e) => setVals({...vals, [currency.code]: e.target.value})} placeholder={t("Курс")} />
      <Button variant="secondary" size="sm" disabled={currency.code === baseCurrency} onClick={() => { setCurrencies((items) => items.filter((item) => item.code !== currency.code)); setVals((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== currency.code))); }}>{t("Удалить")}</Button>
    </div>)}
    {extra && <div className="hint">{currencies.filter((currency) => currency.code !== baseCurrency && Number(vals[currency.code]) > 0).map((currency) => <div key={currency.code}>1 {baseCurrency} = {(1 / Number(vals[currency.code])).toFixed(6)} {currency.code}</div>)}</div>}
    <label style={{display: 'flex', gap: 12, padding: 16}}>{t("Показать дополнительный расчёт")}<Toggle on={extra} onChange={setExtra} /></label>
    {draft ? <div className="form-grid">
      {['code', 'name', 'sym'].map((key, index) => <Field key={key} label={['Код валюты', 'Название валюты', 'Символ'][index]}><Input aria-label={['Код валюты', 'Название валюты', 'Символ'][index]} value={draft[key]} onChange={(e) => setDraft({...draft, [key]: e.target.value})} /></Field>)}
      <Button onClick={add}>{t("Добавить в список")}</Button><Button variant="secondary" onClick={() => setDraft(null)}>{t("Отмена")}</Button>
    </div> : <Button disabled={!loaded} icon="plus" onClick={() => setDraft({code: '', name: '', sym: ''})}>{t("Добавить валюту")}</Button>}
  </Drawer>;
}

const ACCESS_TOGGLES = ['Получение аналитики', 'Получение информации о клиентах', 'Доступ к данным'];

function ApiKeyModal({ open, onClose }) {
  const toast = useToast();
  const [stage, setStage] = useState('form');
  const [org, setOrg] = useState('');
  const [type, setType] = useState('HoReCa');
  const [tg, setTg] = useState([true, false, true]);
  const [err, setErr] = useState('');
  const [credentials, setCredentials] = useState(null);
  useEffect(() => { if (open) { setStage('form'); setOrg(''); setErr(''); setCredentials(null); setType('HoReCa'); setTg([true, false, true]); } }, [open]);
  const gen = async () => {
    if (!org.trim()) { setErr('Введите наименование'); return; }
    setStage('loading');
    try {
      const created = await workspaceActionsApi.execute('integration.api_key.generate', { payload: { organization: org.trim(), organization_type: type, access: ACCESS_TOGGLES.filter((_, i) => tg[i]) } });
      setCredentials(created.result); setStage('result');
    } catch (error) { setErr(error.message || 'Не удалось создать ключ'); setStage('form'); }
  };
  return (
    <Drawer open={open} onClose={onClose}
      title={stage === 'result' ? 'Результаты API ключа' : 'Генерация API ключа'}
      sub={stage === 'result' ? `ОсОО "${org}" ✓` : (stage === 'loading' ? `ОсОО "${org}"` : null)}
      footer={stage === 'form'
        ? <Button variant="primary" iconRight="arrowRight" onClick={gen}>{t("Сгенерировать")}</Button>
        : stage === 'result'
          ? <Button variant="primary" onClick={onClose}>{t("Закрыть")}</Button>
          : null}>
      <div>
        {stage === 'form' && <>
          <p className="hint">{t("Ключ даёт доступ только для чтения выбранных разделов. Передавайте API в заголовке X-API-Token, а API-KEY — в X-API-Key.")}</p>
          <Field label={t("Наименование организации")} hint={t("Введите наименование на латинице")} error={err}>
            <Input placeholder={t("Введите значение")} value={org} onChange={(e) => { setOrg(e.target.value); setErr(''); }} error={err} />
          </Field>
          <div style={{ margin: '22px 0' }}>
            <div className="label" style={{ marginBottom: 12, fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>{t("Выберите тип доступа")}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.keys(ORG_TYPE).map((t) => (
                <button key={t} className={'tab' + (type === t ? ' active' : '')} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ACCESS_TOGGLES.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0' }}>
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{t(l)}</span>
                <Toggle on={tg[i]} onChange={(v) => setTg((arr) => arr.map((x, j) => j === i ? v : x))} />
              </div>
            ))}
          </div>
        </>}
        {stage === 'loading' && (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <Icon name="loader" style={{ width: 48, height: 48, color: 'var(--blue)', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 16 }}>{t("Идет генерация API ключа")}</div>
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>{t("ОсОО \"")}{org}"</div>
          </div>
        )}
        {stage === 'result' && <>
          <ModalHeader title={t("Результаты API ключа")} sub={`ОсОО "${org}" ✓`} onClose={onClose} />
          {[['API', 'Введите его в поле с API', credentials?.api || ''], ['API-KEY', 'Введите ключ для активации API', credentials?.api_key || ''], ['API-ENDPOINT', 'Введите ENDPOINT для работы с API', credentials?.endpoint || '']].map(([t, h, v], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 18 }}>
              <div><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{t}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{h}</div></div>
              <div className="input-wrap" style={{ width: 320 }}>
                <input className="input has-trail" readOnly value={v} style={{ background: 'var(--surface-2)' }} />
                <Icon name="copy" className="trail" onClick={async () => { try { await navigator.clipboard.writeText(v); toast('Скопировано', 'ok'); } catch { toast('Скопируйте значение вручную', 'err'); } }} />
              </div>
            </div>
          ))}
        </>}
      </div>
    </Drawer>
  );
}

function ApiAccessModal({ open, onClose }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const [accesses, setAccesses] = useState([]);
  useEffect(() => {
    if (!open) return;
    workspaceActionsApi.list({ action: 'integration.api_key.generate' }).then((rows) => setAccesses(rows.map((row) => ({
      no: row.id, org: row.payload?.organization || '—', orgType: row.payload?.organization_type || '—',
      date: new Date(row.created_at).toLocaleDateString('ru-RU'),
    })))).catch((error) => toast(error.message, 'err'));
  }, [open]);
  const editAccess = async (access) => {
    const org = window.prompt('Организация', access.org);
    if (!org?.trim()) return;
    try { await workspaceActionsApi.execute('settings.api_access.update', { resourceType: 'api_access', resourceId: String(access.no), payload: { ...access, org: org.trim() } }); setAccesses((items) => items.map((item) => item.no === access.no ? { ...item, org: org.trim() } : item)); toast('Доступ обновлён', 'ok'); }
    catch (error) { toast(error.message, 'err'); }
  };
  const deleteAccess = async () => {
    const access = accesses[confirm];
    try { await workspaceActionsApi.execute('settings.api_access.revoke', { resourceType: 'api_access', resourceId: String(access.no), payload: { org: access.org } }); setAccesses((items) => items.filter((item) => item.no !== access.no)); setConfirm(null); toast('Доступ отозван', 'ok'); }
    catch (error) { toast(error.message, 'err'); }
  };
  return (
    <>
    <Drawer open={open} onClose={onClose} title={t("Доступы к API")} width="min(860px, 96vw)">
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th style={{ width: 70 }}>№</th><th>{t("Организация")}</th><th>{t("Тип организации")}</th><th>{t("Дата создания")}</th><th style={{ width: 100 }}>{t("Действия")}</th></tr></thead>
            <tbody>
              {accesses.map((a, i) => (
                <tr key={i}>
                  <td className="t-strong">{a.no}</td><td className="t-strong">{a.org}</td>
                  <td><Pill tone={ORG_TYPE[a.orgType]}>{a.orgType}</Pill></td><td>{a.date}</td>
                  <td><div className="row-actions">
                    <button className="icon-btn green" aria-label="Изменить API-доступ" onClick={() => editAccess(a)}><Icon name="edit" /></button>
                    <button className="icon-btn red" aria-label="Отозвать API-доступ" onClick={() => setConfirm(i)}><Icon name="trash" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </Drawer>
      <ConfirmDialog open={confirm !== null} message="Данное действие невозможно будет отменить!"
        onCancel={() => setConfirm(null)} onConfirm={deleteAccess} />
    </>
  );
}

function AddUserDrawer({ open, onClose, onCreated }) {
  const toast = useToast();
  const empty = { name: '', email: '', role: '', phone: '', status: 'Активный', password: '' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target ? e.target.value : e }));
  useEffect(() => {
    if (open) {
      setF(empty); setErrs({});
      usersApi.roles().then(setRoles).catch((error) => toast(error.message || 'Не удалось загрузить роли', 'err'));
    }
  }, [open]);
  const submit = async () => {
    const er = {};
    if (!f.name.trim()) er.name = 'Введите ФИО';
    if (!f.email.trim()) er.email = 'Введите e-mail';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = 'Некорректный e-mail';
    if (!f.role) er.role = 'Выберите роль';
    if (f.status === 'Активный' && f.password.length < 10) er.password = 'Минимум 10 символов';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    try {
      setSaving(true);
      const parts = f.name.trim().split(/\s+/);
      const created = await usersApi.create({
        email: f.email.trim(), phone: f.phone.trim(),
        last_name: parts.shift() || '', first_name: parts.shift() || '', middle_name: parts.join(' '),
        timezone: 'Asia/Bishkek', language: 'ru',
        roles: roles.filter((item) => (ROLE_LABEL[item.code] || item.name) === f.role).map((item) => item.code),
        status: f.status === 'Заблокированный' ? 'suspended' : 'active',
        ...(f.password ? { password: f.password } : {}),
      });
      onCreated?.(created);
      toast('Пользователь добавлен', 'ok'); onClose();
    } catch (error) {
      toast(error.message || 'Не удалось добавить пользователя', 'err');
    } finally { setSaving(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} title={t("Добавить пользователя")}
      footer={<><Button variant="secondary" onClick={onClose}>{t("Отмена")}</Button><Button variant="primary" iconRight="arrowRight" onClick={submit} disabled={saving}>{t("Добавить")}</Button></>}>
      <div className="form-grid">
        <div className="full"><Field label={t("ФИО")} required error={errs.name}><Input placeholder={t("Введите ФИО")} value={f.name} onChange={set('name')} error={errs.name} /></Field></div>
        <Field label="E-mail" required error={errs.email}><Input placeholder="mail@example.com" value={f.email} onChange={set('email')} error={errs.email} /></Field>
        <Field label={t("Телефон")}><Input placeholder="+996 (___) __-__-__" value={f.phone} onChange={set('phone')} /></Field>
        <Field label={t("Роль")} required error={errs.role}><Select placeholder={t("Выберите роль")} options={roles.map((role) => ROLE_LABEL[role.code] || role.name)} value={f.role} onChange={set('role')} error={errs.role} /></Field>
        <Field label={t("Начальный пароль")} error={errs.password}><Input type="password" value={f.password} onChange={set('password')} placeholder={t("Минимум 10 символов")} autoComplete="new-password" /></Field>
        <Field label={t("Статус")}><Select options={['Активный', 'Заблокированный']} value={f.status} onChange={set('status')} /></Field>
      </div>
    </Drawer>
  );
}

function NotificationsModal({ open, onClose }) {
  const toast = useToast();
  const [tg, setTg] = useState([true, true, false, true, false, true]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const opts = ['Уведомления о новых заказах', 'Уведомления о платежах', 'SMS-уведомления', 'E-mail уведомления', 'Push в Telegram', 'Просрочки и дедлайны SLA'];
  useEffect(() => {
    if (!open) return;
    setReady(false);
    notificationsApi.rules().then((data) => {
      setTg(opts.map((_, i) => data.find((rule) => rule.event_type === `ui.preference.${i}`)?.is_active ?? [true, true, false, true, false, true][i]));
      setReady(true);
    }).catch((error) => toast(error.message || 'Не удалось загрузить уведомления', 'err'));
  }, [open]);
  const save = async () => {
    setSaving(true);
    try { await notificationsApi.setRules({ rules: tg }); toast('Настройки сохранены в backend', 'ok'); onClose(); }
    catch (error) { toast(error.message || 'Не удалось сохранить настройки', 'err'); }
    finally { setSaving(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} title={t("Настройки уведомлений")} width="min(460px, 94vw)"
      footer={<Button variant="primary" onClick={save} disabled={!ready || saving}>{t("Сохранить")}</Button>}>
        <p className="hint">Для SMS, Email и Telegram требуется подключённая служба доставки. Настройки не подтверждают отправку сообщения.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {opts.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < opts.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <span style={{ fontSize: 14, color: 'var(--ink)' }}>{t(l)}</span>
              <Toggle on={tg[i]} onChange={(v) => setTg((arr) => arr.map((x, j) => j === i ? v : x))} />
            </div>
          ))}
        </div>
    </Drawer>
  );
}


function OperatorAccessDrawer({ open, operator, onClose }) {
  const toast = useToast();
  const operatorName = operator?.name || operator || '';
  const [sla, setSla] = useState(() => (operatorName ? operatorSla(operatorName) : 15));
  useEffect(() => { if (open && operatorName) usersApi.sla(operator.serverId).then((data) => setSla(data.sla_response_minutes || operatorSla(operatorName))).catch(() => setSla(operatorSla(operatorName))); }, [open, operatorName]);
  if (!open || !operator) return null;
  return (
    <Drawer open={open} onClose={onClose} title={t("Доступ и нормативы оператора")} sub={operatorName} width="min(720px,96vw)"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>{t("Закрыть")}</Button>}>
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{t("Отклик на заявку")}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t("Норматив первого отклика. При превышении на дашборде — просрочка / накал тайминга.")}</div>
        </div>
        <div style={{ width: 110 }}><Input type="number" min="1" value={sla} onChange={(e) => setSla(Math.max(1, parseInt(e.target.value) || 1))} /></div>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{t("минут")}</span>
        <Button size="sm" icon="check" onClick={async () => { try { await usersApi.setSla(operator.serverId, sla); toast('Норматив сохранён: ' + sla + ' мин', 'ok'); } catch (error) { toast(error.message || 'Не удалось сохранить норматив', 'err'); } }}>{t("Сохранить")}</Button>
      </div>
      <h3 className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>{t("Доступ по видам услуг")}</h3>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{t("Область ответственности оператора в заказах.")}</div>
      <ServiceAccessEditor operator={operatorName} userId={operator.serverId} />
    </Drawer>
  );
}

// Выбор роли боковой панелью вместо системного prompt с кодами ролей.
function RolePickerDrawer({ open, user, onClose, onSaved }) {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setSelected(user.roleCode || '');
    usersApi.roles(controller.signal)
      .then((rows) => { setRoles(Array.isArray(rows) ? rows : []); setLoading(false); })
      .catch((error) => { if (!controller.signal.aborted) { setLoading(false); toast(error.message || 'Не удалось загрузить роли', 'err'); } });
    return () => controller.abort();
  }, [open, user?.serverId]);

  const save = async () => {
    if (!selected || selected === user.roleCode) { onClose(); return; }
    setSaving(true);
    try {
      await usersApi.setRoles(user.serverId, [selected]);
      onSaved(selected);
      toast(`Роль «${ROLE_LABEL[selected] || selected}» назначена`, 'ok');
      onClose();
    } catch (error) {
      toast(error.message || 'Не удалось изменить роль', 'err');
    } finally { setSaving(false); }
  };

  if (!open || !user) return null;
  return (
    <Drawer open onClose={onClose} width="min(560px,96vw)"
      title={t('Изменить роль')} sub={user.name}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Отмена')}</Button>
        <Button icon="check" style={{ flex: 1 }} disabled={saving || loading || !selected} onClick={save}>
          {saving ? t('Сохранение…') : t('Сохранить роль')}
        </Button>
      </>}>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => <div key={i} className="sk" style={{ height: 68 }} />)}
        </div>
      ) : !roles.length ? (
        <EmptyState icon="lock" title={t('Роли не настроены')} sub={t('Создайте роли в разделе «Роли и права»')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roles.map((role) => {
            const active = selected === role.code;
            const label = ROLE_LABEL[role.code] || role.name || role.code;
            const hint = role.description || ROLE_HINT[role.code] || '';
            return (
              <button key={role.code} type="button" onClick={() => setSelected(role.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '12px 14px', borderRadius: 14, background: active ? 'var(--blue-soft)' : '#fff',
                  border: '1px solid ' + (active ? 'var(--blue)' : 'var(--line)'), transition: '.14s',
                }}>
                <span className="oc-svc-ic" style={{ width: 38, height: 38, borderRadius: 11, background: active ? 'var(--blue)' : 'var(--surface-2)', color: active ? '#fff' : 'var(--muted)' }}>
                  <Icon name={ROLE_ICON[role.code] || 'user'} style={{ width: 18, height: 18 }} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
                    {role.code === user.roleCode && <Pill tone="gray">{t('текущая')}</Pill>}
                  </span>
                  {hint && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{hint}</span>}
                  {Array.isArray(role.permissions) && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted-2)', marginTop: 2 }}>{role.permissions.length} {t('прав')}</span>}
                </span>
                <Icon name={active ? 'checkCircle' : 'chevRight'} style={{ width: 20, height: 20, color: active ? 'var(--blue)' : 'var(--faint)', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

function UsersTab({ onAdd, users = [], onUsersChange }) {
  const toast = useToast();
  const [invite, setInvite] = useState('');
  const [motUser, setMotUser] = useState(null);
  const [accUser, setAccUser] = useState(null);
  const [roleUser, setRoleUser] = useState(null);
  const { user: currentUser } = useAuth();
  const pageSize = currentUser?.preferences?.page_size || 25;
  const [page, setPage] = useState(1);
  const liveUsers = users.map(toLegacyUser);
  const pages = Math.max(1, Math.ceil(liveUsers.length / pageSize));
  const activePage = Math.min(page, pages);
  const pageUsers = liveUsers.slice((activePage - 1) * pageSize, activePage * pageSize);
  const changeAccess = async (user) => {
    try {
      if (user.status === 'Заблокированный') {
        const updated = await usersApi.activate(user.serverId);
        onUsersChange?.(users.map((item) => item.id === user.serverId ? updated : item));
        toast('Пользователь разблокирован', 'ok');
      } else {
        const updated = await usersApi.suspend(user.serverId, 'Заблокирован администратором');
        onUsersChange?.(users.map((item) => item.id === user.serverId ? updated : item));
        toast('Пользователь заблокирован', 'ok');
      }
    } catch (error) { toast(error.message || 'Не удалось изменить доступ', 'err'); }
  };
  const applyRole = (code) => {
    onUsersChange?.(users.map((item) => item.id === roleUser?.serverId ? { ...item, roles: [code] } : item));
  };
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{liveUsers.length} {t("пользователей")}</span>
        <div style={{ flex: 1 }} /><Button icon="plus" onClick={onAdd}>{t("Добавить пользователя")}</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>{t("Сотрудник")}</th><th>E-mail</th><th>{t("Роль")}</th><th>{t("Был активен")}</th><th>{t("Статус")}</th><th></th></tr></thead>
          <tbody>
            {pageUsers.map((u, i) => (
              <tr key={i}>
                <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar src={u.avatar} name={u.name} size={32} /><span style={{ fontWeight: 600 }}>{u.name}</span></span></td>
                <td className="t-muted">{u.email}</td>
                <td><Pill tone={u.role === 'Админ' ? 'blue' : 'gray'}>{u.role}</Pill></td>
                <td>{u.last}</td>
                <td><Pill tone={USER_STATUS[u.status]}>{u.status}</Pill></td>
                <td><ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                  items={[
                    { icon: 'edit', label: 'Изменить роль', onClick: () => setRoleUser(u) },
                    ...(u.role === 'Оператор' ? [
                      { icon: 'finance', label: 'Мотивация оператора', onClick: () => setMotUser(u) },
                      { icon: 'sla', label: 'Доступ и нормативы', onClick: () => setAccUser(u) },
                    ] : []),
                    ...(u.status === 'Приглашён' || u.status === 'Приглашен' ? [{ icon: 'mail', label: 'Создать приглашение', onClick: async () => { try { const data = await usersApi.invite(u.serverId); setInvite(`${window.location.origin}/?invite=${encodeURIComponent(data.invite_token)}`); } catch (error) { toast(error.message || 'Не удалось создать приглашение', 'err'); } } }] : []),
                    { sep: true },
                    { icon: 'lock', label: u.status === 'Заблокированный' ? 'Разблокировать' : 'Заблокировать', danger: u.status !== 'Заблокированный', onClick: () => changeAccess(u) },
                  ]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{display:'flex',gap:12,alignItems:'center',marginTop:16}}><Button variant="secondary" disabled={activePage === 1} onClick={() => setPage(activePage-1)}>{t("Назад")}</Button><span>{t("Страница")} {activePage} {t("из")} {pages}</span><Button variant="secondary" disabled={activePage === pages} onClick={() => setPage(activePage+1)}>{t("Далее")}</Button></div>
      <Drawer open={!!invite} onClose={() => setInvite('')} title={t("Приглашение пользователя")} footer={<Button onClick={() => setInvite('')}>{t("Закрыть")}</Button>}>
        <Field label={t("Одноразовая ссылка для установки пароля")} hint={t("Передайте ссылку пользователю. Срок действия — 7 дней.")}><Input readOnly value={invite} /></Field>
        <Button onClick={async () => { try { await navigator.clipboard.writeText(invite); toast('Ссылка скопирована', 'ok'); } catch { toast('Скопируйте ссылку вручную', 'err'); } }}>{t("Копировать ссылку")}</Button>
      </Drawer>
      <MotivationDrawer open={!!motUser} operator={motUser?.name} userId={motUser?.serverId} onClose={() => setMotUser(null)} />
      <OperatorAccessDrawer open={!!accUser} operator={accUser} onClose={() => setAccUser(null)} />
      <RolePickerDrawer open={!!roleUser} user={roleUser} onClose={() => setRoleUser(null)} onSaved={applyRole} />
    </div>
  );
}

function RolesTab({ readOnly = false }) {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadRoles = () => {
    setLoading(true);
    usersApi.roles()
      .then((rows) => setRoles(rows))
      .catch((error) => toast(error.message || 'Не удалось загрузить роли', 'err'))
      .finally(() => setLoading(false));
  };
  const toggle = (roleId, code) => {
    setRoles((current) => current.map((role) => {
      if (readOnly || role.id !== roleId || role.code === 'admin') return role;
      const enabled = role.permissions.includes(code);
      return { ...role, permissions: enabled ? role.permissions.filter((item) => item !== code) : [...role.permissions, code].sort() };
    }));
  };
  useEffect(loadRoles, []);
  const save = async () => {
    if (readOnly) return;
    setLoading(true);
    try {
      const saved = await Promise.all(roles.filter((role) => role.code !== 'admin').map((role) => usersApi.updateRole(role.id, role.permissions)));
      setRoles((current) => current.map((role) => saved.find((item) => item.id === role.id) || role));
      toast('Права ролей сохранены в RBAC', 'ok');
    } catch (error) { toast(error.message || 'Не удалось сохранить права', 'err'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{t("Матрица прав доступа по ролям · «Админ» всегда имеет полный доступ")}</span>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" icon="settings" onClick={loadRoles} disabled={loading}>{t("Обновить")}</Button>
        <Button icon="check" onClick={save} disabled={loading || readOnly}>{t("Сохранить")}</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th style={{ minWidth: 280 }}>{t("Право доступа")}</th>{roles.map((role) => <th key={role.id} style={{ textAlign: 'center' }}>{ROLE_LABEL[role.code] || role.name}</th>)}</tr></thead>
          <tbody>
            {PERMISSION_GROUPS.map((g) => (
              <React.Fragment key={g.group}>
                <tr><td colSpan={roles.length + 1} style={{ background: 'var(--surface-2)', fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>{g.group}</td></tr>
                {g.items.map(([code, label]) => (
                  <tr key={code}>
                    <td>{t(label)}</td>
                    {roles.map((role) => {
                      const enabled = role.code === 'admin' || role.permissions.includes(code);
                      return (
                      <td key={role.id} style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', justifyContent: 'center' }}>
                          {(role.code === 'admin' || readOnly)
                            ? <span className={'checkbox' + (enabled ? ' on' : '')} style={{ opacity: .55, cursor: 'default' }}><Icon name="check" strokeWidth={3} /></span>
                            : <Checkbox on={enabled} onChange={() => toggle(role.id, code)} />}
                        </span>
                      </td>
                    ); })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {!roles.length && <tr><td colSpan={2} className="t-muted">{loading ? 'Загрузка ролей…' : 'Роли не найдены'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPage({ users = [], onUsersChange }) {
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const auth = useAuth();
  const permissions = auth.user?.permissions || [];
  const canUsers = permissions.includes('users.manage');
  const canSettings = permissions.includes('settings.manage');
  const canIntegrations = canSettings || permissions.includes('integrations.manage');
  const [slaUser, setSlaUser] = useState(null);
  const [usersLoading, setUsersLoading] = useState(canUsers);
  useEffect(() => {
    if (!canUsers) return;
    const controller = new AbortController();
    usersApi.all(controller.signal).then((payload) => onUsersChange?.(payload.results)).catch((error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); }).finally(() => setUsersLoading(false));
    return () => controller.abort();
  }, [canUsers]);
  const [tab, setTab] = useState(canUsers ? 'users' : canIntegrations ? 'params' : 'roles');
  const groups = [
    { title: 'Курсы валют', items: [['Изменить курс валют', () => setModal('currency')], ['Добавить / удалить валюту', () => setModal('currency')]] },
    { title: 'Общие настройки', items: [['Настройки уведомления', () => setModal('notif')]] },
    { title: 'API / интеграции', items: [['Доступы к API', () => setModal('apiaccess')], ['Сгенерировать API ключ', () => setModal('apikey')], ['Коды ошибок интеграций', () => setModal('errcodes')], ['Убрать доступ к API', () => setModal('apiaccess')], ['Настройки SLA', () => setModal('sla')]] },
    { title: 'Шаблоны документов', items: [['Добавить шаблон', () => setModal('template-add')], ['Изменить шаблон', () => setModal('templates')]] },
    { title: 'Справочники', items: [['Аэропорты и города', () => setModal('locations')], ['Типы услуг', () => setModal('service-kinds')], ['Справочник доп. услуг', () => setModal('extras')]] },
    { title: 'Карточки услуг', items: [['Настройки карточек услуг', () => setModal('cardadmin')], ['Видимость полей для клиента', () => setModal('cardvis')]] },
  ];
  const TABS = [...(canUsers ? [{ key: 'users', label: 'Пользователи', count: users.length }] : []), { key: 'roles', label: 'Роли и права' }, { key: 'params', label: 'Параметры системы' }];
  return (
    <div className="fade-in">
      <Topbar title={t("Настройки")} />
      <div className="content">
        <div style={{ marginBottom: 20 }}><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>
        {tab === 'users' && usersLoading && <p>{t("Загрузка пользователей…")}</p>}
        {tab === 'users' && !usersLoading && <UsersTab users={users} onUsersChange={onUsersChange} onAdd={() => setModal('adduser')} />}
        {tab === 'roles' && <RolesTab readOnly={!permissions.includes('roles.manage')} />}
        {tab === 'params' && (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '36px 46px', maxWidth: 1100 }}>
            {groups.filter((group) => group.title === 'API / интеграции' ? canIntegrations : canSettings).map((g, i) => (
              <div key={i}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>{t(g.title)}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {g.items.map(([label, fn, hint], j) => (
                    <button key={j} className="doc-chip" disabled={!fn} title={hint || ''} style={{ height: 50, padding: '0 18px', opacity: fn ? 1 : 0.55, cursor: fn ? 'pointer' : 'not-allowed' }} onClick={fn || undefined}>
                      <span>{t(label)}{hint && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{hint}</span>}</span>
                      {fn && <Icon name="chevRight" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Drawer open={modal === 'sla'} onClose={() => setModal(null)} title={t("Настройки SLA")} footer={<Button onClick={() => setModal(null)}>{t("Закрыть")}</Button>}>
        <p>{t("Выберите сотрудника для настройки норматива отклика.")}</p>
        {users.map((person) => <div className="kv-row" key={person.id}><span>{person.full_name || person.email}</span><Button onClick={() => { setModal(null); setSlaUser(toLegacyUser(person)); }}>{t("Настроить")}</Button></div>)}
        {!users.length && <p>{t("Нет доступных сотрудников. Требуется право управления пользователями.")}</p>}
      </Drawer>
      <OperatorAccessDrawer open={!!slaUser} operator={slaUser} onClose={() => setSlaUser(null)} />
      <DocumentTemplatesDrawer open={modal === 'templates' || modal === 'template-add'} create={modal === 'template-add'} onClose={() => setModal(null)} />
      <SettingsDirectory kind={modal === 'locations' || modal === 'service-kinds' ? modal : null} onClose={() => setModal(null)} />
      <ExtrasCatalogModal open={modal === 'extras'} onClose={() => setModal(null)} />
      <CardVisibilityModal open={modal === 'cardvis'} onClose={() => setModal(null)} />
      {modal === 'cardadmin' && <ServiceCardAdminDrawer onClose={() => setModal(null)} />}
      <CurrencyModal open={modal === 'currency'} onClose={() => setModal(null)} />
      <ApiKeyModal open={modal === 'apikey'} onClose={() => setModal(null)} />
      <ApiAccessModal open={modal === 'apiaccess'} onClose={() => setModal(null)} />
      <AddUserDrawer open={modal === 'adduser'} onClose={() => setModal(null)} onCreated={(user) => onUsersChange?.([user, ...users])} />
      <NotificationsModal open={modal === 'notif'} onClose={() => setModal(null)} />
      <ErrorCodesDrawer open={modal === 'errcodes'} onClose={() => setModal(null)} />
    </div>
  );
}




const CARD_VIS_FIELDS = [
  ['clientTotal', 'Итоговая стоимость для клиента'],
  ['serviceFee', 'Сервисный сбор'],
  ['supplierPrice', 'Цена поставщика'],
  ['commission', 'Комиссия поставщика'],
  ['markup', 'Наценка'],
  ['profit', 'Прибыль'],
  ['cost', 'Себестоимость'],
];
function CardVisibilityModal({ open, onClose }) {
  const toast = useToast();
  const [vis, setVis] = useState(() => ({ ...(window.CARD_CLIENT_VISIBILITY || {}) }));
  const [config, setConfig] = useState({});
  useEffect(() => { if (open) workspaceSettingsApi.getTenant('service-cards').then((data) => { setConfig(data.value || {}); setVis(data.value?.visibility || { ...(window.CARD_CLIENT_VISIBILITY || {}) }); }).catch((error) => toast(error.message || 'Не удалось загрузить настройки видимости', 'err')); }, [open]);
  if (!open) return null;
  const tg = (k) => setVis((v) => ({ ...v, [k]: !v[k] }));
  const save = async () => { try { await workspaceSettingsApi.saveTenant('service-cards', { ...config, visibility: vis }); Object.assign(window.CARD_CLIENT_VISIBILITY || {}, vis); toast('Настройки видимости сохранены в backend для организации', 'ok'); onClose(); } catch (error) { toast(error.message || 'Не удалось сохранить настройки', 'err'); } };
  return (
    <Drawer open={open} onClose={onClose} title={t("Видимость полей карточки для клиента")} sub={t("Отметьте, какие поля клиент видит в карточке услуги и КП. Неотмеченные остаются внутренними и клиенту не отправляются.")} width="min(520px, 94vw)"
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t("Отмена")}</Button>
        <Button icon="check" onClick={save}>{t("Сохранить")}</Button>
      </>}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {CARD_VIS_FIELDS.map(([k, label]) => (
            <label key={k} className="hp-check-row" style={{ padding: '11px 4px', borderBottom: '1px solid var(--line)' }}>
              <Checkbox on={!!vis[k]} onChange={() => tg(k)} />
              <span className="hp-check-label" style={{ flex: 1 }}>{t(label)}</span>
              {vis[k] ? <Pill tone="green">{t("видно клиенту")}</Pill> : <Pill tone="gray">{t("внутреннее")}</Pill>}
            </label>
          ))}
        </div>
    </Drawer>
  );
}

Object.assign(window, { SettingsPage, UsersTab, RolesTab, CardVisibilityModal });



export { CurrencyModal, RolePickerDrawer, ACCESS_TOGGLES, ApiKeyModal, ApiAccessModal, AddUserDrawer, NotificationsModal, OperatorAccessDrawer, UsersTab, RolesTab, SettingsPage, CARD_VIS_FIELDS, CardVisibilityModal };
