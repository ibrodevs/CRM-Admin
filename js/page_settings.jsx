import React, { useState, useEffect } from 'react';
import { Icon } from './icons';
import { ActionMenu, Avatar, Button, Checkbox, ConfirmDialog, Drawer, Field, Input, ModalHeader, Pill, Select, Tabs, Toggle, useToast } from './ui';
import { CURRENCIES, ORG_TYPE, PERMISSIONS, ROLES, USERS, USER_STATUS } from './data';
import { OPERATOR_SLA, operatorSla } from './data/access-control';
import { Topbar } from './layout';
import { ExtrasCatalogModal } from './order_ops';
import { ErrorCodesDrawer } from './page_notifications';
import { MotivationDrawer } from './page_shifts';
import { ServiceCardAdminDrawer } from './page_card_admin';
import { ServiceAccessEditor } from './features/settings/service-access-editor';
import { notificationsApi, usersApi, workspaceActionsApi, workspaceSettingsApi } from './api/resources';
import { toLegacyUser } from './api/legacy-adapters';



function CurrencyModal({ open, onClose }) {
  const toast = useToast();
  const [extra, setExtra] = useState(true);
  const [vals, setVals] = useState({});
  const [baseCurrency, setBaseCurrency] = useState('USD');
  useEffect(() => {
    if (!open) return;
    workspaceSettingsApi.get('finance-currencies').then((data) => {
      setVals(data.value?.rates || {}); setExtra(data.value?.extraCalculation ?? true); setBaseCurrency(data.value?.base || 'USD');
    }).catch(() => {});
  }, [open]);
  const save = async () => {
    try { await workspaceSettingsApi.save('finance-currencies', { base: baseCurrency, rates: vals, extraCalculation: extra }); toast('Курсы валют сохранены в backend', 'ok'); onClose(); }
    catch (error) { toast(error.message || 'Не удалось сохранить курсы', 'err'); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Курсы валют" sub="Изменение курсов валют"
      footer={<>
        <Button variant="secondary" icon="edit" onClick={() => setBaseCurrency(CURRENCIES[(CURRENCIES.findIndex((c) => c.code === baseCurrency) + 1) % CURRENCIES.length].code)}>Основная: {baseCurrency}</Button>
        <Button variant="primary" iconRight="arrowRight" onClick={save}>Применить</Button>
      </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {CURRENCIES.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>{c.sym} {c.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Текущее значение: {c.rate}</div>
              </div>
              <input className="input" style={{ width: 230 }} placeholder="Введите значение" value={vals[c.code] || ''} onChange={(e) => setVals((v) => ({ ...v, [c.code]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>Показать дополнительный расчет</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>При добавлении новых заказов</div>
            </div>
            <Toggle on={extra} onChange={setExtra} />
          </div>
        </div>
        <Button variant="primary" icon="plus" style={{ marginTop: 8 }} onClick={() => workspaceActionsApi.execute('finance.currency.request', { payload: { base: baseCurrency } }).then(() => toast('Запрос на добавление валюты сохранён', 'ok')).catch((error) => toast(error.message, 'err'))}>Добавить валюту</Button>
    </Drawer>
  );
}

const ACCESS_TOGGLES = ['Получение аналитики', 'Получение информации о клиентах', 'Обновление каждые 10 мин', 'Доступ к данным', 'SLI'];

function ApiKeyModal({ open, onClose }) {
  const toast = useToast();
  const [stage, setStage] = useState('form');
  const [org, setOrg] = useState('');
  const [type, setType] = useState('HoReCa');
  const [tg, setTg] = useState([true, false, true, true, true]);
  const [err, setErr] = useState('');
  const [credentials, setCredentials] = useState(null);
  useEffect(() => { if (open) { setStage('form'); setOrg(''); setErr(''); } }, [open]);
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
        ? <Button variant="primary" iconRight="arrowRight" onClick={gen}>Сгенерировать</Button>
        : stage === 'result'
          ? <Button variant="primary" onClick={onClose}>Закрыть</Button>
          : null}>
      <div>
        {stage === 'form' && <>
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
          {[['API', 'Введите его в поле с API', credentials?.api || ''], ['API-KEY', 'Введите ключ для активации API', credentials?.api_key || ''], ['API-ENDPOINT', 'Введите ENDPOINT для работы с API', credentials?.endpoint || '']].map(([t, h, v], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 18 }}>
              <div><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{t}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{h}</div></div>
              <div className="input-wrap" style={{ width: 320 }}>
                <input className="input has-trail" readOnly value={v} style={{ background: 'var(--surface-2)' }} />
                <Icon name="copy" className="trail" onClick={async () => { await navigator.clipboard.writeText(v); toast('Скопировано', 'ok'); }} />
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
    <Drawer open={open} onClose={onClose} title="Доступы к API" width="min(860px, 96vw)">
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th style={{ width: 70 }}>№</th><th>Организация</th><th>Тип организации</th><th>Дата создания</th><th style={{ width: 100 }}>Действия</th></tr></thead>
            <tbody>
              {accesses.map((a, i) => (
                <tr key={i}>
                  <td className="t-strong">{a.no}</td><td className="t-strong">{a.org}</td>
                  <td><Pill tone={ORG_TYPE[a.orgType]}>{a.orgType}</Pill></td><td>{a.date}</td>
                  <td><div className="row-actions">
                    <button className="icon-btn green" onClick={() => editAccess(a)}><Icon name="edit" /></button>
                    <button className="icon-btn red" onClick={() => setConfirm(i)}><Icon name="trash" /></button>
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
  const empty = { name: '', email: '', role: '', phone: '', status: 'Активный' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target ? e.target.value : e }));
  useEffect(() => { if (open) { setF(empty); setErrs({}); } }, [open]);
  const submit = async () => {
    const er = {};
    if (!f.name.trim()) er.name = 'Введите ФИО';
    if (!f.email.trim()) er.email = 'Введите e-mail';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = 'Некорректный e-mail';
    if (!f.role) er.role = 'Выберите роль';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    try {
      const parts = f.name.trim().split(/\s+/);
      const created = await usersApi.create({
        email: f.email.trim(), phone: f.phone.trim(),
        last_name: parts.shift() || '', first_name: parts.shift() || '', middle_name: parts.join(' '),
        timezone: 'Asia/Bishkek', language: 'ru',
      });
      const role = { 'Админ': 'admin', 'Оператор': 'operator', 'Бухгалтер': 'accountant', 'Менеджер': 'manager' }[f.role];
      if (role) await usersApi.setRoles(created.id, [role]);
      await usersApi.invite(created.id);
      onCreated?.({ ...created, roles: role ? [role] : created.roles });
      toast('Пользователь добавлен, приглашение создано', 'ok'); onClose();
    } catch (error) {
      toast(error.message || 'Не удалось добавить пользователя', 'err');
    }
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
  useEffect(() => { if (open) notificationsApi.rules().then((data) => setTg(opts.map((_, i) => data.find((rule) => rule.event_type === `ui.preference.${i}`)?.is_active ?? tg[i]))).catch(() => {}); }, [open]);
  const save = async () => {
    try { await notificationsApi.setRules({ rules: tg }); toast('Настройки сохранены в backend', 'ok'); onClose(); }
    catch (error) { toast(error.message || 'Не удалось сохранить настройки', 'err'); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Настройки уведомлений" width="min(460px, 94vw)"
      footer={<Button variant="primary" onClick={save}>Сохранить</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {opts.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < opts.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <span style={{ fontSize: 14, color: 'var(--ink)' }}>{l}</span>
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
    <Drawer open={open} onClose={onClose} title="Доступ и нормативы оператора" sub={operatorName} width="min(720px,96vw)"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Отклик на заявку</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Норматив первого отклика. При превышении на дашборде — просрочка / накал тайминга.</div>
        </div>
        <div style={{ width: 110 }}><Input type="number" min="1" value={sla} onChange={(e) => setSla(Math.max(1, parseInt(e.target.value) || 1))} /></div>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>минут</span>
        <Button size="sm" icon="check" onClick={async () => { try { await usersApi.setSla(operator.serverId, sla); toast('Норматив сохранён: ' + sla + ' мин', 'ok'); } catch (error) { toast(error.message || 'Не удалось сохранить норматив', 'err'); } }}>Сохранить</Button>
      </div>
      <h3 className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Доступ по видам услуг</h3>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Область ответственности оператора в заказах.</div>
      <ServiceAccessEditor operator={operatorName} userId={operator.serverId} />
    </Drawer>
  );
}

function UsersTab({ onAdd, users = [], onUsersChange }) {
  const toast = useToast();
  const [motUser, setMotUser] = useState(null);
  const [accUser, setAccUser] = useState(null);
  const liveUsers = users.map(toLegacyUser);
  const changeAccess = async (user) => {
    try {
      if (user.status === 'Заблокированный') {
        await usersApi.invite(user.serverId);
        onUsersChange?.(users.map((item) => item.id === user.serverId ? { ...item, status: 'active' } : item));
        toast('Пользователь разблокирован', 'ok');
      } else {
        const updated = await usersApi.suspend(user.serverId, 'Заблокирован администратором');
        onUsersChange?.(users.map((item) => item.id === user.serverId ? updated : item));
        toast('Пользователь заблокирован', 'ok');
      }
    } catch (error) { toast(error.message || 'Не удалось изменить доступ', 'err'); }
  };
  const changeRole = async (user) => {
    try {
      const roles = await usersApi.roles();
      const code = window.prompt(`Код роли (${roles.map((role) => role.code).join(', ')})`, roles.find((role) => role.name === user.role)?.code || 'operator');
      if (!code) return;
      if (!roles.some((role) => role.code === code)) throw new Error('Неизвестный код роли');
      await usersApi.setRoles(user.serverId, [code]);
      onUsersChange?.(users.map((item) => item.id === user.serverId ? { ...item, roles: [code] } : item));
      toast('Роль пользователя изменена', 'ok');
    } catch (error) { toast(error.message || 'Не удалось изменить роль', 'err'); }
  };
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{liveUsers.length} пользователей</span>
        <div style={{ flex: 1 }} /><Button icon="plus" onClick={onAdd}>Добавить пользователя</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Сотрудник</th><th>E-mail</th><th>Роль</th><th>Был активен</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {liveUsers.map((u, i) => (
              <tr key={i}>
                <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar src={u.avatar} name={u.name} size={32} /><span style={{ fontWeight: 600 }}>{u.name}</span></span></td>
                <td className="t-muted">{u.email}</td>
                <td><Pill tone={u.role === 'Админ' ? 'blue' : 'gray'}>{u.role}</Pill></td>
                <td>{u.last}</td>
                <td><Pill tone={USER_STATUS[u.status]}>{u.status}</Pill></td>
                <td><ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                  items={[
                    { icon: 'edit', label: 'Изменить роль', onClick: () => changeRole(u) },
                    ...(u.role === 'Оператор' ? [
                      { icon: 'finance', label: 'Мотивация оператора', onClick: () => setMotUser(u.name) },
                      { icon: 'sla', label: 'Доступ и нормативы', onClick: () => setAccUser(u) },
                    ] : []),
                    { icon: 'mail', label: 'Отправить приглашение', onClick: async () => { try { await usersApi.invite(u.serverId); toast('Приглашение создано', 'ok'); } catch (error) { toast(error.message || 'Не удалось создать приглашение', 'err'); } } },
                    { sep: true },
                    { icon: 'lock', label: u.status === 'Заблокированный' ? 'Разблокировать' : 'Заблокировать', danger: u.status !== 'Заблокированный', onClick: () => changeAccess(u) },
                  ]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MotivationDrawer open={!!motUser} operator={motUser} onClose={() => setMotUser(null)} />
      <OperatorAccessDrawer open={!!accUser} operator={accUser} onClose={() => setAccUser(null)} />
    </div>
  );
}

function RolesTab() {
  const toast = useToast();
  const [matrix, setMatrix] = useState(PERMISSIONS);
  const toggle = (gi, ii, ri) => {
    if (ri === 0) return;
    setMatrix((m) => m.map((g, x) => x !== gi ? g : { ...g, items: g.items.map((it, y) => y !== ii ? it : { ...it, r: it.r.map((v, z) => z === ri ? (v ? 0 : 1) : v) }) }));
  };
  useEffect(() => { workspaceSettingsApi.get('role-permissions').then((data) => { if (Array.isArray(data.value?.matrix)) setMatrix(data.value.matrix); }).catch(() => {}); }, []);
  const save = async () => { try { await workspaceSettingsApi.save('role-permissions', { matrix }); toast('Права сохранены в backend', 'ok'); } catch (error) { toast(error.message || 'Не удалось сохранить права', 'err'); } };
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Матрица прав доступа по ролям · «Админ» всегда имеет полный доступ</span>
        <div style={{ flex: 1 }} /><Button variant="secondary" icon="check" onClick={save}>Сохранить</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th style={{ minWidth: 260 }}>Право доступа</th>{ROLES.map((r) => <th key={r} style={{ textAlign: 'center' }}>{r}</th>)}</tr></thead>
          <tbody>
            {matrix.map((g, gi) => (
              <React.Fragment key={g.group}>
                <tr><td colSpan={5} style={{ background: 'var(--surface-2)', fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>{g.group}</td></tr>
                {g.items.map((it, ii) => (
                  <tr key={it.k}>
                    <td>{it.k}</td>
                    {it.r.map((v, ri) => (
                      <td key={ri} style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', justifyContent: 'center' }}>
                          {ri === 0
                            ? <span className="checkbox on" style={{ opacity: .55, cursor: 'default' }}><Icon name="check" strokeWidth={3} /></span>
                            : <Checkbox on={!!v} onChange={() => toggle(gi, ii, ri)} />}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPage({ users = [], onUsersChange }) {
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState('users');
  const groups = [
    { title: 'Курсы валют', items: [['Изменить курс валют', () => setModal('currency')], ['Добавить / удалить валюту', () => setModal('currency')]] },
    { title: 'Общие настройки', items: [['Настройки уведомления', () => setModal('notif')]] },
    { title: 'API / интеграции', items: [['Доступы к API', () => setModal('apiaccess')], ['Сгенерировать API ключ', () => setModal('apikey')], ['Коды ошибок интеграций', () => setModal('errcodes')], ['Убрать доступ к API', () => setModal('apiaccess')], ['Настройки SLA', () => toast('Настройки SLA', 'info')]] },
    { title: 'Шаблоны документов', items: [['Добавить шаблон', () => toast('Добавление шаблона', 'info')], ['Изменить шаблон', () => toast('Изменение шаблона', 'info')]] },
    { title: 'Справочники', items: [['Аэропорты и города', () => toast('Справочник', 'info')], ['Типы услуг', () => toast('Справочник', 'info')], ['Справочник доп. услуг', () => setModal('extras')]] },
    { title: 'Карточки услуг', items: [['Настройки карточек услуг', () => setModal('cardadmin')], ['Видимость полей для клиента', () => setModal('cardvis')]] },
  ];
  const TABS = [{ key: 'users', label: 'Пользователи', count: users.length }, { key: 'roles', label: 'Роли и права' }, { key: 'params', label: 'Параметры системы' }];
  return (
    <div className="fade-in">
      <Topbar title="Настройки" />
      <div className="content">
        <div style={{ marginBottom: 20 }}><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>
        {tab === 'users' && <UsersTab users={users} onUsersChange={onUsersChange} onAdd={() => setModal('adduser')} />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'params' && (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '36px 46px', maxWidth: 1100 }}>
            {groups.map((g, i) => (
              <div key={i}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>{g.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {g.items.map(([label, fn], j) => (<button key={j} className="doc-chip" style={{ height: 50, padding: '0 18px' }} onClick={fn}>{label}<Icon name="chevRight" /></button>))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
  useEffect(() => { if (open) workspaceSettingsApi.get('card-client-visibility').then((data) => setVis(data.value || {})).catch(() => setVis({ ...(window.CARD_CLIENT_VISIBILITY || {}) })); }, [open]);
  if (!open) return null;
  const tg = (k) => setVis((v) => ({ ...v, [k]: !v[k] }));
  const save = async () => { try { await workspaceSettingsApi.save('card-client-visibility', vis); Object.assign(window.CARD_CLIENT_VISIBILITY || {}, vis); toast('Настройки видимости сохранены в backend', 'ok'); onClose(); } catch (error) { toast(error.message || 'Не удалось сохранить настройки', 'err'); } };
  return (
    <Drawer open={open} onClose={onClose} title="Видимость полей карточки для клиента" sub="Отметьте, какие поля клиент видит в карточке услуги и КП. Неотмеченные остаются внутренними и клиенту не отправляются." width="min(520px, 94vw)"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" onClick={save}>Сохранить</Button>
      </>}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {CARD_VIS_FIELDS.map(([k, label]) => (
            <label key={k} className="hp-check-row" style={{ padding: '11px 4px', borderBottom: '1px solid var(--line)' }}>
              <Checkbox on={!!vis[k]} onChange={() => tg(k)} />
              <span className="hp-check-label" style={{ flex: 1 }}>{label}</span>
              {vis[k] ? <Pill tone="green">видно клиенту</Pill> : <Pill tone="gray">внутреннее</Pill>}
            </label>
          ))}
        </div>
    </Drawer>
  );
}

Object.assign(window, { SettingsPage, UsersTab, RolesTab, CardVisibilityModal });



export { CurrencyModal, ACCESS_TOGGLES, ApiKeyModal, ApiAccessModal, AddUserDrawer, NotificationsModal, OperatorAccessDrawer, UsersTab, RolesTab, SettingsPage, CARD_VIS_FIELDS, CardVisibilityModal };
