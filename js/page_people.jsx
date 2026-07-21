import { useState, useEffect } from 'react';
import { Icon } from './icons';
import { ActionMenu, Avatar, Button, Drawer, EmptyState, Field, FilterChip, Input, Pill, SearchBox, Select, Tabs, Th, plural, useSort, useToast } from './ui';
import { CLIENTS_DB, CLIENT_STATUS, COMPANIES_DB, COMPANY_STATUS, ORDERS, ORDER_STATUS, SETTLEMENT_TONE, companyBalanceShort, companyFinance } from './data';
import { UnifiedDocumentDrawer, UnifiedPersonDrawer, ufBlankPerson, ufDateIso, ufFromClient } from './forms_unified';
import { Topbar } from './layout';
import { NewOrgDrawer } from './order_extras';
import { PanelSub } from './components/shared-panels';
import { PaxGroupsDrawer, PaxUnifyPanel, paxMergeAppend } from './pax_unify';
import { TravelPolicyBlock } from './travel_policy';
import { CompanyFinanceBlock } from './page_company_finance';
import { communicationsApi, crmApi } from './api/resources';
import { toUiClient, toUiCompany } from './api/adapters';
import { resultsOf } from './api/client';



function pUsd(n) { return Math.round(n).toLocaleString('ru-RU') + ' $'; }
function ordersOf(name) { return ORDERS.filter((o) => o.client === name); }

const citizenshipCode = (value) => ({ 'Кыргызстан': 'KG', 'Казахстан': 'KZ', 'Россия': 'RU', 'Узбекистан': 'UZ', 'Таджикистан': 'TJ', 'Турция': 'TR', 'Германия': 'DE', 'Китай': 'CN', 'ОАЭ': 'AE' }[value] || value || '');
const personPayloadFromUnified = (person) => ({
  surname: person.lastName || '',
  given_name: person.firstName || '',
  middle_name: person.middleName || '',
  birth_date: ufDateIso(person.dob) || null,
  gender: { 'Мужской': 'male', 'Женский': 'female' }[person.gender] || '',
  citizenship: citizenshipCode(person.citizenship),
  phone: person.phone || '',
  email: person.email || '',
  city: person.city || '',
  notes: person.comment || '',
});
const toUiDepartment = (department) => ({
  ...department,
  id: department.id,
  name: department.name,
  policy: department.travel_policy || '',
});
const toUiEmployee = (employee) => {
  const person = employee.person_detail || {};
  const name = person.full_name || [person.surname, person.given_name, person.middle_name].filter(Boolean).join(' ');
  return {
    ...employee,
    id: employee.id,
    personId: employee.person,
    name: name || 'Сотрудник',
    position: employee.position || '',
    dept: employee.department || '',
    phone: person.phone || '—',
    email: person.email || '',
    doc: '—',
    dob: person.birth_date || '—',
    inPolicy: true,
    source: employee,
    personSource: person,
  };
};




function ClientCard({ c: c0, onBack, onOpenOrder, onUpdate, onCreateOrder }) {
  const toast = useToast();
  const [c, setC] = useState(c0);
  const [edit, setEdit] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [docs, setDocs] = useState(c0.documents || []);
  useEffect(() => {
    setC(c0);
    setDocs(c0.documents || []);
    const controller = new AbortController();
    crmApi.personDocuments(c0.id, controller.signal)
      .then((rows) => setDocs((rows || []).map((doc) => ({ ...doc, docType: doc.type, docNo: doc.number_masked || '—' }))))
      .catch((error) => { if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить документы', 'err'); });
    return () => controller.abort();
  }, [c0.id]);
  const startChat = async () => {
    try { await communicationsApi.createThread({ type: 'client', title: c.name, status: 'active' }); toast('Чат с клиентом создан', 'ok'); }
    catch (error) { toast(error.message, 'err'); }
  };
  const saveDocument = async (doc) => {
    if (!doc.docNo) { toast('Введите номер документа', 'err'); return; }
    try {
      const saved = await crmApi.addPersonDocument(c.id, {
        type: { 'Загранпаспорт': 'foreign_passport', 'Общегражданский паспорт': 'national_passport', 'ID-карта': 'id_card', 'Свидетельство о рождении': 'birth_certificate', 'Виза': 'visa' }[doc.docType] || 'other',
        number: doc.docNo || '',
        series: doc.series || '',
        expires_at: ufDateIso(doc.docExpiry) || null,
        issuing_country: citizenshipCode(c.citizenship),
        nationality: citizenshipCode(c.citizenship),
      });
      setDocs((cur) => [...cur, { ...saved, docType: doc.docType || saved.type, docNo: saved.number_masked || doc.docNo }]);
      setDocOpen(false);
      toast('Документ добавлен в backend', 'ok');
    } catch (error) { toast(error.message || 'Не удалось добавить документ', 'err'); }
  };
  const orders = ordersOf(c.name);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>К реестру</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Клиенты / {c.id}</span>
      </div>

      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <Avatar name={c.name} size={56} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><h2 className="card-title">{c.name}</h2><Pill tone={CLIENT_STATUS[c.status]}>{c.status}</Pill></div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{c.type} · {c.company !== '—' ? c.company : 'частное лицо'} · клиент с {c.since}</div>
        </div>
        <Button variant="secondary" icon="edit" onClick={() => setEdit(true)}>Изменить</Button>
        <Button variant="secondary" icon="chat" onClick={startChat}>Написать</Button>
        <Button icon="plus" onClick={onCreateOrder}>Новый заказ</Button>
      </div>
      <ClientCreateModal open={edit} initial={c} onClose={() => setEdit(false)} onCreated={(u) => { setC(u); onUpdate && onUpdate(u); }} />
      <UnifiedDocumentDrawer open={docOpen} person={{ name: c.name, citizenship: c.citizenship }}
        onClose={() => setDocOpen(false)} onSave={saveDocument} />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Контактные данные</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">Телефон</span><span className="v">{c.phone}</span></div>
            <div className="kv-row"><span className="k">E-mail</span><span className="v">{c.email}</span></div>
            <div className="kv-row"><span className="k">Город</span><span className="v">{c.city}</span></div>
            <div className="kv-row"><span className="k">Документ</span><span className="v">{c.doc}</span></div>
            <div className="kv-row"><span className="k">Дата рождения</span><span className="v">{c.dob}</span></div>
            <div className="kv-row"><span className="k">Компания</span><span className="v">{c.company}</span></div>
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Сводка</h3>
          <div className="oc-kpi"><span className="l">Заказов всего</span><span className="v">{c.orders}</span></div>
          <div className="oc-kpi"><span className="l">Сумма покупок</span><span className="v">{pUsd(c.spent)}</span></div>
          <div className="oc-kpi"><span className="l">Задолженность</span><span className={'v' + (c.debt ? ' red' : '')}>{pUsd(c.debt)}</span></div>
          <div className="oc-kpi"><span className="l">Клиент с</span><span className="v">{c.since}</span></div>
        </div>
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Заказы клиента</h3>
      <div className="table-card">
        {orders.length ? (
          <table className="tbl">
            <thead><tr><th>№</th><th>Тип</th><th>Статус</th><th>Услуга</th><th style={{ textAlign: 'right' }}>Сумма</th><th></th></tr></thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpenOrder(o)}>
                  <td className="t-strong">{o.no}</td><td><Pill tone="blue">{o.requestType}</Pill></td>
                  <td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td><td>{o.service}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{o.sum} {o.currency}</td>
                  <td><span className="go-dot"><Icon name="chevRight" /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="orders" title="Заказов пока нет" />}
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Документы</h3>
      <div className="grid-4">
        {docs.map((d, i) => (<button key={'ud' + i} className="doc-chip" onClick={() => setDocOpen(true)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="idcard" />{d.docType} · {d.docNo}</span><Icon name="download" /></button>))}
        <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)' }} onClick={() => setDocOpen(true)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span></button>
      </div>
    </div>
  );
}




function ClientCreateModal({ open, initial, onClose, onCreated }) {
  const toast = useToast();
  const mode = initial ? 'edit' : 'create';
  const save = async (person) => {
    const payload = {
      surname: person.lastName, given_name: person.firstName, middle_name: person.middleName,
      birth_date: ufDateIso(person.dob) || null,
      gender: { 'Мужской': 'male', 'Женский': 'female' }[person.gender] || '',
      citizenship: { 'Кыргызстан': 'KG', 'Казахстан': 'KZ', 'Россия': 'RU', 'Узбекистан': 'UZ', 'Таджикистан': 'TJ', 'Турция': 'TR', 'Германия': 'DE', 'Китай': 'CN', 'ОАЭ': 'AE' }[person.citizenship] || '',
      phone: person.phone, email: person.email, city: person.city, notes: person.comment,
      status: { 'Новый': 'new', 'Активный': 'active', VIP: 'vip', 'Неактивный': 'inactive' }[person.status] || 'active',
    };
    try {
      let profile;
      if (initial) {
        const updated = await crmApi.updatePerson(initial.id, { ...payload, version: initial.source?.version });
        profile = toUiClient({ ...initial, id: initial.profileId, person: initial.id, person_detail: updated, created_at: initial.created_at });
      } else {
        const created = await crmApi.createClient({ client_type: 'individual', status: 'active', person_data: payload });
        if (person.docNo) {
          await crmApi.addPersonDocument(created.person, {
            type: { 'Загранпаспорт': 'foreign_passport', 'Общегражданский паспорт': 'national_passport', 'ID-карта': 'id_card', 'Свидетельство о рождении': 'birth_certificate', 'Виза': 'visa' }[person.docType] || 'other',
            number: person.docNo, expires_at: ufDateIso(person.docExpiry) || null,
            issuing_country: payload.citizenship,
          });
        }
        profile = toUiClient(created);
      }
      onCreated(profile); toast('Клиент «' + profile.name + '» ' + (mode === 'edit' ? 'обновлён' : 'добавлен'), 'ok'); onClose();
    } catch (error) {
      toast(error.message || 'Не удалось сохранить клиента', 'err');
    }
  };
  return (
    <UnifiedPersonDrawer open={open} kind="person" mode={mode} initial={initial}
      onClose={onClose} onSave={save} />
  );
}

function ClientsPage({ initialClients = [], onClientsChange, onOpenOrder, onCreateOrder, intent, onConsume }) {
  const [view, setView] = useState('list');
  const [active, setActive] = useState(null);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [clients, setClients] = useState(initialClients);
  const [createOpen, setCreateOpen] = useState(false);
  const { sort, onSort, apply } = useSort(null);

  useEffect(() => { setClients(initialClients); }, [initialClients]);

  useEffect(() => { if (intent && intent.type === 'create') { setCreateOpen(true); onConsume && onConsume(); } }, [intent]);
  const commitClients = (updater) => setClients((current) => {
    const next = typeof updater === 'function' ? updater(current) : updater;
    onClientsChange && onClientsChange(next);
    return next;
  });
  const addClient = (c) => commitClients((cur) => [c, ...cur]);
  const upsertClient = (c) => commitClients((cur) => cur.some((x) => x.id === c.id) ? cur.map((x) => x.id === c.id ? c : x) : [c, ...cur]);

  if (view === 'card' && active) return (<><Topbar title="Карточка клиента" /><div className="content"><ClientCard c={active} onBack={() => setView('list')} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} onUpdate={(u) => { upsertClient(u); setActive(u); }} /></div></>);

  let rows = clients.filter((c) => (!fStatus || c.status === fStatus) && (!q || `${c.id} ${c.name} ${c.company} ${c.phone}`.toLowerCase().includes(q.toLowerCase())));
  rows = apply(rows, { name: (r) => r.name, orders: (r) => r.orders, spent: (r) => r.spent, debt: (r) => r.debt });
  const STATS = [['Всего клиентов', clients.length], ['Активные', clients.filter((c) => c.status === 'Активный' || c.status === 'VIP').length], ['VIP', clients.filter((c) => c.status === 'VIP').length], ['С задолженностью', pUsd(clients.reduce((s, c) => s + c.debt, 0))]];

  return (
    <>
      <Topbar title="Клиенты"><div className="topbar-spacer" /><Button icon="plus" onClick={() => setCreateOpen(true)}>Добавить клиента</Button></Topbar>
      <div className="content fade-in">
        <div className="grid-4" style={{ marginBottom: 22 }}>{STATS.map(([l, v]) => (<div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value">{v}</div></div>))}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск: имя, телефон, ID…" style={{ width: 280 }} />
          <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={Object.keys(CLIENT_STATUS)} />
        </div>
        <div className="table-card">
          {rows.length ? (
            <table className="tbl">
              <thead><tr><th>ID</th><Th label="Клиент" col="name" sort={sort} onSort={onSort} /><th>Тип</th><th>Компания</th><th>Город</th><Th label="Заказов" col="orders" sort={sort} onSort={onSort} /><Th label="Покупки" col="spent" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} /><Th label="Долг" col="debt" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} /><th>Статус</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => { setActive(c); setView('card'); }}>
                    <td className="t-strong">{c.id}</td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={c.name} size={32} /><span style={{ fontWeight: 600 }}>{c.name}</span></span></td>
                    <td>{c.type}</td><td className="t-muted">{c.company}</td><td>{c.city}</td><td>{c.orders}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{pUsd(c.spent)}</td>
                    <td style={{ textAlign: 'right', color: c.debt ? 'var(--red)' : 'var(--muted-2)', fontWeight: 600 }}>{c.debt ? pUsd(c.debt) : '—'}</td>
                    <td><Pill tone={CLIENT_STATUS[c.status]}>{c.status}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState icon="user" title="Клиентов не найдено" />}
        </div>
      </div>
      <ClientCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={addClient} />
    </>
  );
}






function EmployeeCreateDrawer({ open, departments, defaultDept, coName, initial, onClose, onCreate }) {
  const toast = useToast();
  const mode = initial ? 'edit' : 'create';
  const base = initial ? ufFromClient(initial, 'employee')
    : { ...ufBlankPerson('employee'), dept: defaultDept || (departments[0] && departments[0].id) || '' };
  const save = async (person, client) => {
    const dep = departments.find((d) => d.id === person.dept);
    try {
      const emp = await onCreate({ person, client, initial });
      toast('Сотрудник «' + emp.name + '» ' + (mode === 'edit' ? 'обновлён' : 'добавлен')
        + (dep && mode !== 'edit' ? ' в «' + dep.name + '»' : '')
        + (person.inPolicy && mode !== 'edit' ? ' · включён в тревел-политику' : ''), 'ok');
      onClose();
    } catch (error) {
      toast(error.message || 'Не удалось сохранить сотрудника', 'err');
    }
  };
  return (
    <UnifiedPersonDrawer open={open} kind="employee" mode={mode} initial={base}
      company={coName} departments={departments} onClose={onClose} onSave={save} />
  );
}


function EmployeeProfileDrawer({ emp, dept, coName, onClose, onOpenOrder, onRemove, onEdit }) {
  const toast = useToast();
  if (!emp) return null;
  const trips = ordersOf(emp.name);
  return (
    <Drawer open onClose={onClose} width="min(620px,96vw)" title="Профиль сотрудника" sub={coName}
      footer={<>
        <Button variant="secondary" icon="chat" onClick={async () => {
          try { await communicationsApi.createThread({ type: 'client', title: `${emp.name} · ${coName}`, external_channel: 'CRM', status: 'active' }); toast('Чат с сотрудником открыт', 'ok'); }
          catch (error) { toast(error.message, 'err'); }
        }}>Написать</Button>
        <div style={{ flex: 1 }} />
        {onRemove && <Button variant="secondary" icon="trash" onClick={() => { onRemove(emp); onClose(); }}>Убрать</Button>}
        <Button icon="edit" onClick={() => { onEdit?.(emp); onClose(); }}>Редактировать</Button>
      </>}>
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <Avatar name={emp.name} size={52} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{emp.name}</div>
          <div className="ty-sub" style={{ marginTop: 2 }}>{emp.position || 'Сотрудник'}{dept ? ' · ' + dept.name : ''}</div>
        </div>
        {emp.inPolicy !== false && dept && dept.policy && <Pill tone="blue">{dept.policy}</Pill>}
      </div>

      <PanelSub style={{ marginTop: 0 }}>Данные сотрудника</PanelSub>
      <div className="card card-pad">
        <div className="kv">
          <div className="kv-row"><span className="k">Подразделение</span><span className="v">{dept ? dept.name : '—'}</span></div>
          <div className="kv-row"><span className="k">Должность</span><span className="v">{emp.position || '—'}</span></div>
          <div className="kv-row"><span className="k">Телефон</span><span className="v">{emp.phone || '—'}</span></div>
          <div className="kv-row"><span className="k">E-mail</span><span className="v">{emp.email || '—'}</span></div>
          <div className="kv-row"><span className="k">Документ</span><span className="v">{emp.doc || '—'}</span></div>
          <div className="kv-row"><span className="k">Дата рождения</span><span className="v">{emp.dob || '—'}</span></div>
          <div className="kv-row"><span className="k">Тревел-политика</span><span className="v">{emp.inPolicy === false ? 'Не применяется' : (dept && dept.policy ? dept.policy : 'По компании')}</span></div>
        </div>
      </div>

      <PanelSub>Поездки сотрудника</PanelSub>
      {trips.length ? (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>№</th><th>Статус</th><th>Услуга</th><th style={{ textAlign: 'right' }}>Сумма</th><th></th></tr></thead>
            <tbody>{trips.map((o, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { onOpenOrder && onOpenOrder(o); onClose(); }}>
                <td className="t-strong">{o.no}</td><td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td>
                <td>{o.service}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{o.sum} {o.currency}</td>
                <td><span className="go-dot"><Icon name="chevRight" /></span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <EmptyState icon="plane" title="Поездок пока нет" sub="Заказы с этим сотрудником появятся здесь" />}
    </Drawer>
  );
}

function DepartmentCreateDrawer({ open, onClose, onCreate }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [policy, setPolicy] = useState('');
  const [err, setErr] = useState('');
  const submit = async () => {
    if (!name.trim()) { setErr('Укажите название отдела'); return; }
    try {
      await onCreate(name.trim(), policy);
      onClose();
    } catch (error) {
      toast(error.message || 'Не удалось создать отдел', 'err');
    }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Новый отдел" sub="Подразделение компании" width="min(440px,96vw)"
      footer={<div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
        <Button style={{ flex: 1 }} icon="check" onClick={submit}>Создать отдел</Button>
      </div>}>
      <Field label="Название отдела" required error={err}>
        <Input value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Напр.: Отдел продаж" error={err} />
      </Field>
      <Field label="Тревел-политика (необязательно)">
        <Select value={policy} onChange={(e) => setPolicy(e.target.value)} options={['Эконом', 'Бизнес-класс', 'Смешанная']} placeholder="Не задана" />
      </Field>
    </Drawer>
  );
}

// Отдел компании в едином стиле со списком пассажиров заказа (сворачиваемый, нумерованный список).
function StaffDeptGroup({ dept, emps, onOpen, onAdd, onRemove }) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 6;
  const outCount = emps.filter((e) => e.inPolicy === false).length;
  const status = emps.length === 0
    ? null
    : outCount ? { label: outCount + ' вне политики', tone: 'amber' } : { label: 'Все в политике', tone: 'green' };
  const shown = open ? (showAll ? emps : emps.slice(0, LIMIT)) : [];
  return (
    <div className="pax-group" style={{ marginBottom: 14 }}>
      <div className="pax-group-head">
        <button type="button" className="pxg-toggle" onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? 'chevDown' : 'chevRight'} />
          <span className="pxg-name">{dept.name}</span>
          <span className="pxg-cnt">{emps.length}</span>
        </button>
        {dept.policy && <Pill tone="blue">{dept.policy}</Pill>}
        {status && <Pill tone={status.tone}>{status.label}</Pill>}
        {dept.id !== '' && <Button variant="secondary" size="sm" icon="plus" onClick={() => onAdd(dept.id)}>В отдел</Button>}
      </div>
      {open && emps.length === 0 && <div className="ty-sub" style={{ padding: '12px 2px 4px' }}>В подразделении пока нет сотрудников.</div>}
      {shown.map((e, i) => (
        <div key={e.id} className="pax-group-row" onClick={() => onOpen(e)}>
          <span className="pxg-num">{i + 1}</span>
          <Avatar name={e.name} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nm">{e.name}</div>
            <div className="mt">{(e.position || 'Сотрудник') + ' · ' + e.phone}</div>
          </div>
          <Pill tone={e.inPolicy === false ? 'gray' : 'green'}>{e.inPolicy === false ? 'вне политики' : 'в политике'}</Pill>
          <span onClick={(ev) => ev.stopPropagation()}>
            <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
              items={[
                { icon: 'user', label: 'Профиль сотрудника', onClick: () => onOpen(e) },
                { icon: 'trash', label: 'Убрать из компании', danger: true, onClick: () => onRemove(e) },
              ]} />
          </span>
        </div>
      ))}
      {open && emps.length > LIMIT && (
        <button type="button" className="pxg-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Свернуть' : `+ ещё ${emps.length - LIMIT} ${plural(emps.length - LIMIT, ['сотрудник', 'сотрудника', 'сотрудников'])}`}
        </button>
      )}
    </div>
  );
}

function CompanyCard({ co, onBack, onOpenOrder, onCreateOrder }) {
  const toast = useToast();
  const [tab, setTab] = useState('overview');

  const [staff, setStaff] = useState({ departments: [], employees: [] });
  const [staffLoading, setStaffLoading] = useState(false);
  const [addEmp, setAddEmp] = useState(null);
  const [addDept, setAddDept] = useState(false);
  const [empQ, setEmpQ] = useState('');
  const [empView, setEmpView] = useState(null);
  const [unifyOpen, setUnifyOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const loadStaff = async (signal) => {
    setStaffLoading(true);
    try {
      const [departmentPayload, employeePayload] = await Promise.all([
        crmApi.companyDepartments(co.id, signal),
        crmApi.companyEmployees(co.id, signal),
      ]);
      setStaff({
        departments: (departmentPayload || []).map(toUiDepartment),
        employees: resultsOf(employeePayload).map(toUiEmployee),
      });
    } catch (error) {
      if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить сотрудников', 'err');
    } finally {
      if (!signal?.aborted) setStaffLoading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    loadStaff(controller.signal);
    return () => controller.abort();
  }, [co.id]);
  const addEmployee = async ({ person, initial }) => {
    const personPayload = personPayloadFromUnified(person);
    let personId = initial?.personId || initial?.person || null;
    if (personId) {
      await crmApi.updatePerson(personId, personPayload);
    } else {
      const createdPerson = await crmApi.createPerson(personPayload);
      personId = createdPerson.id;
    }
    const employeePayload = {
      person: personId,
      department: person.dept || null,
      position: person.position || '',
      status: 'active',
    };
    const saved = initial?.id
      ? await crmApi.updateCompanyEmployee(co.id, initial.id, employeePayload)
      : await crmApi.createCompanyEmployee(co.id, employeePayload);
    const ui = toUiEmployee(saved);
    setStaff((current) => ({
      ...current,
      employees: current.employees.some((item) => item.id === ui.id)
        ? current.employees.map((item) => item.id === ui.id ? ui : item)
        : [...current.employees, ui],
    }));
    return ui;
  };
  const addDepartment = async (name) => {
    const created = await crmApi.createCompanyDepartment(co.id, { name });
    const ui = toUiDepartment(created);
    setStaff((current) => ({ ...current, departments: [...current.departments, ui] }));
    toast('Отдел «' + name + '» создан', 'ok');
    return ui;
  };
  const removeEmployee = async (emp) => {
    try {
      await crmApi.removeCompanyEmployee(co.id, emp.id);
      setStaff((current) => ({ ...current, employees: current.employees.filter((e) => e.id !== emp.id) }));
      toast('Сотрудник убран из компании', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось убрать сотрудника', 'err');
    }
  };
  const deptOf = (emp) => staff.departments.find((d) => d.id === emp.dept);

  const empToPax = (e) => {
    const docNo = (e.docNo || (e.doc ? String(e.doc).replace(/^ID\s+/i, '').trim() : '')) || '';
    return { name: e.name, role: e.role || 'Взрослый', dob: (e.dob && e.dob !== '—') ? e.dob : '',
      phone: e.phone || '', docType: e.docType || (docNo ? 'Загранпаспорт' : ''), docNo,
      docExpiry: e.docExpiry || '', docStatus: e.docStatus || 'ok', _empId: e.id, _dept: e.dept || '' };
  };
  const paxList = staff.employees.map(empToPax);

  const saveRosterMember = async (member, current) => {
    const split = String(member.name || '').trim().split(/\s+/);
    const payload = {
      surname: split[0] || member.name || 'Сотрудник',
      given_name: split[1] || ' ',
      middle_name: split.slice(2).join(' '),
      birth_date: ufDateIso(member.dob) || null,
      phone: member.phone || '',
      citizenship: citizenshipCode(member.citizenship),
    };
    let personId = current?.personId || null;
    if (personId) {
      await crmApi.updatePerson(personId, payload);
      const updated = await crmApi.updateCompanyEmployee(co.id, current.id, { position: current.position || '', department: member._dept || current.dept || null, status: 'active' });
      return toUiEmployee(updated);
    }
    const person = await crmApi.createPerson(payload);
    const employee = await crmApi.createCompanyEmployee(co.id, { person: person.id, department: member._dept || null, position: member.position || '', status: 'active' });
    return toUiEmployee(employee);
  };
  const applyRosterToStaff = async (roster) => {
    const saved = [];
    for (const p of roster) {
      const cur = p._empId && staff.employees.find((e) => e.id === p._empId);
      saved.push(await saveRosterMember(p, cur));
    }
    setStaff((current) => ({ ...current, employees: saved }));
  };
  const addGroupToStaff = async (members) => {
    const r = paxMergeAppend(paxList, members);
    const added = r.list.slice(paxList.length);
    const saved = [];
    for (const member of added) saved.push(await saveRosterMember(member, null));
    setStaff((current) => ({ ...current, employees: [...current.employees, ...saved] }));
    return r;
  };
  const orders = ordersOf(co.name);
  const contacts = [{ name: co.dir, role: 'Директор', phone: co.phone, email: co.email }, { name: 'Бухгалтерия', role: 'Финансы', phone: co.phone, email: 'buh@' + co.email.split('@')[1] }].slice(0, co.contacts);
  const fin = companyFinance(co.id);
  const bal = companyBalanceShort(fin);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>К реестру</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Компании / {co.id}</span>
      </div>

      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="oc-svc-ic" style={{ background: '#2566ff', width: 56, height: 56, borderRadius: 16 }}><Icon name="building" style={{ width: 26, height: 26 }} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><h2 className="card-title">{co.name}</h2><Pill tone={COMPANY_STATUS[co.status]}>{co.status}</Pill>{fin && <Pill tone={SETTLEMENT_TONE[fin.settlement]}>{fin.settlement}</Pill>}</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{co.type} · ИНН {co.inn} · директор {co.dir}</div>
        </div>
        {bal && bal.kind !== 'предоплата' && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{bal.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--' + (bal.tone === 'red' ? 'red' : bal.tone === 'green' ? 'green' : 'ink') + ')' }}>{Math.round(bal.value).toLocaleString('ru-RU')} $</div>
            {bal.overdue > 0 && <div style={{ fontSize: 12, color: 'var(--red)' }}>просрочено {Math.round(bal.overdue).toLocaleString('ru-RU')} $</div>}
          </div>
        )}
        <Button icon="plus" onClick={onCreateOrder}>Новый заказ</Button>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Tabs tabs={[{ key: 'overview', label: 'Обзор' }, { key: 'staff', label: 'Сотрудники' }, { key: 'finance', label: 'Финансы и договоры' }, { key: 'policy', label: 'Тревел-политика' }]} value={tab} onChange={setTab} />
      </div>

      {tab === 'finance' && <CompanyFinanceBlock co={co} />}
      {tab === 'policy' && <TravelPolicyBlock co={co} />}

      {tab === 'staff' && (() => {
        const unassigned = staff.employees.filter((e) => !staff.departments.some((d) => d.id === e.dept));
        const rawGroups = [...staff.departments.map((d) => ({ dept: d, emps: staff.employees.filter((e) => e.dept === d.id) })),
          ...(unassigned.length ? [{ dept: { id: '', name: 'Без подразделения', policy: '' }, emps: unassigned }] : [])];
        const ql = empQ.trim().toLowerCase();
        const match = (e) => !ql || [e.name, e.phone, e.position, e.doc].some((v) => String(v || '').toLowerCase().includes(ql));
        const groups = ql
          ? rawGroups.map((g) => ({ ...g, emps: g.emps.filter(match) })).filter((g) => g.emps.length)
          : rawGroups;
        return (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <h3 className="section-title" style={{ margin: 0 }}>Сотрудники компании</h3>
                <div className="ty-sub" style={{ marginTop: 4 }}>{staff.employees.length} {plural(staff.employees.length, ['сотрудник', 'сотрудника', 'сотрудников'])} · {staff.departments.length} {plural(staff.departments.length, ['подразделение', 'подразделения', 'подразделений'])}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="secondary" icon="plus" onClick={() => setAddDept(true)}>Создать отдел</Button>
                <Button variant="secondary" icon="users" onClick={() => setGroupsOpen(true)}>Группы пассажиров</Button>
                <Button variant="secondary" icon="idcard" disabled={!staff.employees.length} onClick={() => setUnifyOpen(true)}>Унификация списка</Button>
                <Button icon="plus" onClick={() => setAddEmp({})}>Добавить сотрудника</Button>
              </div>
            </div>

            {!!staff.employees.length && (
              <div style={{ marginBottom: 16 }}>
                <SearchBox value={empQ} onChange={setEmpQ} placeholder="Поиск сотрудника: имя, телефон, должность, документ" style={{ maxWidth: 460 }} />
              </div>
            )}

            {staff.employees.length === 0 && !staff.departments.length
              ? <EmptyState icon="users" title="Сотрудников пока нет" sub="Добавьте первого сотрудника компании" />
              : groups.length === 0
                ? <EmptyState icon="search" title="Сотрудники не найдены" sub={'По запросу «' + empQ + '» ничего нет'} />
                : groups.map((g) => (
                  <StaffDeptGroup key={g.dept.id || 'none'} dept={g.dept} emps={g.emps}
                    onOpen={setEmpView} onAdd={(dept) => setAddEmp({ dept })} onRemove={removeEmployee} />
                ))}

            {addDept && <DepartmentCreateDrawer open onClose={() => setAddDept(false)} onCreate={addDepartment} />}
            {addEmp && <EmployeeCreateDrawer open departments={staff.departments} defaultDept={addEmp.dept} initial={addEmp.initial} coName={co.name}
              onClose={() => setAddEmp(null)} onCreate={addEmployee} />}
            {empView && <EmployeeProfileDrawer emp={empView} dept={deptOf(empView)} coName={co.name}
              onClose={() => setEmpView(null)} onOpenOrder={onOpenOrder} onRemove={removeEmployee} onEdit={(emp) => setAddEmp({ dept: emp.dept, initial: emp })} />}
            {unifyOpen && <PaxUnifyPanel list={paxList} autoBind={co.name} onApplyRoster={applyRosterToStaff} onClose={() => setUnifyOpen(false)} />}
            {groupsOpen && <PaxGroupsDrawer current={paxList} companyId={co.id} companyName={co.name} onAddGroup={addGroupToStaff} onClose={() => setGroupsOpen(false)} />}
          </div>
        );
      })()}

      {tab === 'overview' && <>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Реквизиты</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">ИНН</span><span className="v">{co.inn}</span></div>
            <div className="kv-row"><span className="k">ОКПО</span><span className="v">{co.okpo}</span></div>
            <div className="kv-row"><span className="k">Юр. адрес</span><span className="v" style={{ maxWidth: 280 }}>{co.addr}</span></div>
            <div className="kv-row"><span className="k">НДС</span><span className="v">{co.vat}</span></div>
            <div className="kv-row"><span className="k">Тип</span><span className="v">{co.type}</span></div>
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Банк и договор</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">Банк</span><span className="v">{co.bank}</span></div>
            <div className="kv-row"><span className="k">Расчётный счёт</span><span className="v">{co.account}</span></div>
            <div className="kv-row"><span className="k">Договор</span><span className="v">{co.contract}</span></div>
            <div className="kv-row"><span className="k">Оборот</span><span className="v">{pUsd(co.turnover)}</span></div>
            <div className="kv-row"><span className="k">Заказов</span><span className="v">{co.orders}</span></div>
          </div>
        </div>
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Контактные лица</h3>
      <div className="grid-2">
        {contacts.map((p, i) => (
          <div className="card card-pad" key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={p.name} size={44} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{p.role} · {p.phone}</div></div>
            <button className="icon-btn"><Icon name="mail" /></button><button className="icon-btn"><Icon name="phone" /></button>
          </div>
        ))}
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Заказы компании</h3>
      <div className="table-card">
        {orders.length ? (
          <table className="tbl">
            <thead><tr><th>№</th><th>Статус</th><th>Услуга</th><th>Ответственный</th><th style={{ textAlign: 'right' }}>Сумма</th><th></th></tr></thead>
            <tbody>{orders.map((o, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpenOrder(o)}>
                <td className="t-strong">{o.no}</td><td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td><td>{o.service}</td><td>{o.operator}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{o.sum} {o.currency}</td><td><span className="go-dot"><Icon name="chevRight" /></span></td>
              </tr>
            ))}</tbody>
          </table>
        ) : <EmptyState icon="orders" title="Заказов пока нет" />}
      </div>
      </>}
    </div>
  );
}

function CompaniesPage({ initialCompanies = [], onCompaniesChange, onOpenOrder, onCreateOrder, intent, onConsume }) {
  const [view, setView] = useState('list');
  const [active, setActive] = useState(null);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [companies, setCompanies] = useState(initialCompanies);
  const { sort, onSort, apply } = useSort(null);

  useEffect(() => { setCompanies(initialCompanies); }, [initialCompanies]);

  const createCompany = async (company) => {
    const created = await crmApi.createCompany({
      legal_name: company.fullName || company.name, short_name: company.shortName || '',
      type: company.type, status: 'active', tax_id: company.inn === '—' ? '' : company.inn,
      okpo: company.okpo === '—' ? '' : company.okpo, legal_address: company.addr === '—' ? '' : company.addr,
      bank_name: company.bank === '—' ? '' : company.bank, bank_account: company.account === '—' ? '' : company.account,
      director: company.dir === '—' ? '' : company.dir, phone: company.phone === '—' ? '' : company.phone,
      email: company.email === '—' ? '' : company.email,
    });
    const uiCompany = toUiCompany(created);
    setCompanies((current) => {
      const next = [uiCompany, ...current]; onCompaniesChange && onCompaniesChange(next); return next;
    });
    return uiCompany;
  };

  useEffect(() => { if (intent && intent.type === 'create') { setCreateOpen(true); onConsume && onConsume(); } }, [intent]);

  if (view === 'card' && active) return (<><Topbar title="Карточка компании" /><div className="content"><CompanyCard co={active} onBack={() => setView('list')} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} /></div></>);

  let rows = companies.filter((c) => (!fStatus || c.status === fStatus) && (!q || `${c.id} ${c.name} ${c.inn} ${c.dir}`.toLowerCase().includes(q.toLowerCase())));
  rows = apply(rows, { name: (r) => r.name, orders: (r) => r.orders, turnover: (r) => r.turnover });
  const STATS = [['Всего компаний', companies.length], ['Действующие', companies.filter((c) => c.status === 'Действующий').length], ['Совокупный оборот', pUsd(companies.reduce((s, c) => s + c.turnover, 0))], ['Заказов', companies.reduce((s, c) => s + c.orders, 0)]];

  return (
    <>
      <Topbar title="Компании"><div className="topbar-spacer" /><Button icon="plus" onClick={() => setCreateOpen(true)}>Добавить компанию</Button></Topbar>
      <NewOrgDrawer open={createOpen} onClose={() => setCreateOpen(false)} onCreated={createCompany} />
      <div className="content fade-in">
        <div className="grid-4" style={{ marginBottom: 22 }}>{STATS.map(([l, v]) => (<div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value">{v}</div></div>))}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск: название, ИНН, директор…" style={{ width: 300 }} />
          <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={Object.keys(COMPANY_STATUS)} />
        </div>
        <div className="table-card">
          {rows.length ? (
            <table className="tbl">
              <thead><tr><th>ID</th><Th label="Компания" col="name" sort={sort} onSort={onSort} /><th>Тип</th><th>Взаиморасчёты</th><th style={{ textAlign: 'right' }}>Баланс / долг</th><Th label="Заказов" col="orders" sort={sort} onSort={onSort} /><Th label="Оборот" col="turnover" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} /><th>Статус</th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const bal = companyBalanceShort(companyFinance(c.id));
                  return (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => { setActive(c); setView('card'); }}>
                    <td className="t-strong">{c.id}</td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="airline-logo sm" style={{ background: '#2566ff', width: 30, height: 30, borderRadius: 8 }}><Icon name="building" style={{ width: 16, height: 16 }} /></span><span style={{ fontWeight: 600 }}>{c.name}</span></span></td>
                    <td>{c.type}</td>
                    <td>{bal ? <Pill tone={SETTLEMENT_TONE[bal.kind] || 'gray'}>{bal.kind}</Pill> : <span className="t-muted">—</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      {bal && bal.kind !== 'предоплата' ? (
                        <span style={{ fontWeight: 600, color: bal.tone === 'red' ? 'var(--red)' : bal.tone === 'green' ? 'var(--green)' : 'var(--ink)' }}>
                          {Math.round(bal.value).toLocaleString('ru-RU')} $
                          {bal.overdue > 0 && <span style={{ display: 'block', fontSize: 12, color: 'var(--red)', fontWeight: 500 }}>просрочено {Math.round(bal.overdue).toLocaleString('ru-RU')} $</span>}
                        </span>
                      ) : <span className="t-muted">—</span>}
                    </td>
                    <td>{c.orders}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{pUsd(c.turnover)}</td>
                    <td><Pill tone={COMPANY_STATUS[c.status]}>{c.status}</Pill></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <EmptyState icon="building" title="Компаний не найдено" />}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ClientsPage, ClientCard, ClientCreateModal, CompaniesPage, CompanyCard });



export { pUsd, ordersOf, ClientCard, ClientCreateModal, ClientsPage, EmployeeCreateDrawer, EmployeeProfileDrawer, CompanyCard, CompaniesPage };
