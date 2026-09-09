import { ordersApi } from '../../orders/api.js';
import { toUiOrder } from '../../orders/model.js';
import { companiesApi } from '../api/companiesApi.js';
import { clientsApi } from '../../clients/api.js';
import { useState, useEffect } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { ActionMenu } from '../../../shared/ui/ActionMenu.jsx';
import { Avatar } from '../../../shared/ui/Avatar.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { FilterChip } from '../../../shared/ui/FilterChip.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Tabs } from '../../../shared/ui/Tabs.jsx';
import { Th, useSort } from '../../../shared/ui/Table.jsx';
import { plural } from '../../../shared/ui/plural.js';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { COMPANY_STATUS, ORDERS, ORDER_STATUS, SETTLEMENT_TONE, companyBalanceShort, companyFinance } from '../../../legacy/data/index.jsx';
import { UnifiedPersonDrawer, ufBlankPerson, ufFromClient } from '../../clients/index.js';
import { ufDateIso } from '../../../shared/ui/UnifiedDateField.jsx';
import { Topbar } from '../../../shared/ui/Topbar.jsx';
import { NewOrgDrawer } from '../../orders/index.js';
import { PanelSub } from '../../locations/index.js';
import { PaxGroupsDrawer, PaxUnifyPanel, paxMergeAppend } from '../../clients/index.js';
import { TravelPolicyBlock } from './TravelPolicy.jsx';
import { CompanyFinanceBlock } from './CompanyFinance.jsx';
import { communicationsApi } from '../../chats/api.js';
import { toUiCompany } from '../model/companies.mapper.js';
import { resultsOf } from '../../../shared/api/client.js';
import { sumCurrencies, pUsd, ordersOf, orderDate } from '../../clients/model.js';
import { ordersForCompany, toUiDepartment, toUiEmployee } from '../model/people-helpers.js';
import { citizenshipCode, personPayloadFromUnified } from '../../clients/index.js';

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

function EmployeeProfileDrawer({ emp, dept, coName, onClose, onOpenOrder, onRemove, onEdit, onOpenChat }) {
  const toast = useToast();
  if (!emp) return null;
  const trips = ordersOf(emp.name);
  return (
    <Drawer open onClose={onClose} width="min(620px,96vw)" title="Профиль сотрудника" sub={coName}
      footer={<>
        <Button variant="secondary" icon="chat" onClick={async () => {
          try { const thread = await communicationsApi.createThread({ type: 'client', client_person: emp.personId || emp.source?.person || emp.id, title: `${emp.name} · ${coName}`, status: 'active' }); onOpenChat?.(thread); }
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
            <thead><tr><th>№</th><th>Дата</th><th>Статус</th><th>Услуга</th><th style={{ textAlign: 'right' }}>Сумма</th><th></th></tr></thead>
            <tbody>{trips.map((o, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { onOpenOrder && onOpenOrder(o); onClose(); }}>
                <td className="t-strong">{o.no}</td><td>{orderDate(o)}</td><td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td>
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
          <Pill tone={e.inPolicy == null || e.inPolicy === false ? 'gray' : 'green'}>{e.inPolicy == null ? 'не проверено' : e.inPolicy === false ? 'вне политики' : 'в политике'}</Pill>
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

function CompanyCard({ co, orders: allOrders = ORDERS, onBack, onOpenOrder, onCreateOrder, onEdit, onOpenChat }) {
  const toast = useToast();
  const [entityOrders, setEntityOrders] = useState(allOrders);
  useEffect(() => { const controller = new AbortController(); ordersApi.all({ client: co.id }, controller.signal).then((result) => setEntityOrders(result.results.map(toUiOrder))).catch((error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); }); return () => controller.abort(); }, [co.id]);

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
        companiesApi.companyDepartments(co.id, signal),
        companiesApi.companyEmployees(co.id, signal),
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
      await clientsApi.updatePerson(personId, personPayload);
    } else {
      const createdPerson = await clientsApi.createPerson(personPayload);
      personId = createdPerson.id;
    }
    const employeePayload = {
      person: personId,
      department: person.dept || null,
      position: person.position || '',
      status: 'active',
    };
    const saved = initial?.id
      ? await companiesApi.updateCompanyEmployee(co.id, initial.id, employeePayload)
      : await companiesApi.createCompanyEmployee(co.id, employeePayload);
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
    const created = await companiesApi.createCompanyDepartment(co.id, { name });
    const ui = toUiDepartment(created);
    setStaff((current) => ({ ...current, departments: [...current.departments, ui] }));
    toast('Отдел «' + name + '» создан', 'ok');
    return ui;
  };
  const removeEmployee = async (emp) => {
    try {
      await companiesApi.removeCompanyEmployee(co.id, emp.id);
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
      await clientsApi.updatePerson(personId, payload);
      const updated = await companiesApi.updateCompanyEmployee(co.id, current.id, { position: current.position || '', department: member._dept || current.dept || null, status: 'active' });
      return toUiEmployee(updated);
    }
    const person = await clientsApi.createPerson(payload);
    const employee = await companiesApi.createCompanyEmployee(co.id, { person: person.id, department: member._dept || null, position: member.position || '', status: 'active' });
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
  const orders = ordersForCompany(co, entityOrders);
  const contacts = [
    ...(co.dir && co.dir !== '—' && ((co.phone && co.phone !== '—') || (co.email && co.email !== '—')) ? [{ id: 'company-director', name: co.dir, role: 'Директор', phone: co.phone === '—' ? '' : co.phone || '', email: co.email === '—' ? '' : co.email || '' }] : []),
    ...staff.employees.map((employee) => ({
      id: employee.id, name: employee.name, role: employee.position || 'Сотрудник',
      phone: employee.phone === '—' ? '' : employee.phone || '', email: employee.email === '—' ? '' : employee.email || '',
    })).filter((contact) => contact.phone || contact.email),
  ].filter((contact, index, list) => list.findIndex((item) => item.name === contact.name && item.email === contact.email && item.phone === contact.phone) === index);
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
        <Button variant="secondary" icon="edit" onClick={onEdit}>Изменить</Button>
        <Button icon="plus" onClick={() => onCreateOrder({ kind: 'company', id: co.id })}>Новый заказ</Button>
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
            {empView && <EmployeeProfileDrawer onOpenChat={onOpenChat} emp={empView} dept={deptOf(empView)} coName={co.name}
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
        {!contacts.length && <EmptyState icon="users" title="Контактные лица не указаны" sub="Добавьте телефон или e-mail сотруднику компании" />}
        {contacts.map((p) => (
          <div className="card card-pad" key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={p.name} size={44} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{[p.role, p.phone, p.email].filter(Boolean).join(' · ')}</div></div>
            {p.email && <a className="icon-btn" href={`mailto:${p.email}`} title={`Написать ${p.email}`}><Icon name="mail" /></a>}
            {p.phone && <a className="icon-btn" href={`tel:${p.phone.replace(/[^+\d]/g, '')}`} title={`Позвонить ${p.phone}`}><Icon name="phone" /></a>}
          </div>
        ))}
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Заказы компании</h3>
      <div className="table-card">
        {orders.length ? (
          <table className="tbl">
            <thead><tr><th>№</th><th>Дата</th><th>Статус</th><th>Услуга</th><th>Ответственный</th><th style={{ textAlign: 'right' }}>Сумма</th><th></th></tr></thead>
            <tbody>{orders.map((o, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpenOrder(o)}>
                <td className="t-strong">{o.no}</td><td>{orderDate(o)}</td><td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td><td>{o.service}</td><td>{o.operator}</td>
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

function CompaniesPage({ initialCompanies = [], orders = [], onCompaniesChange, onOpenOrder, onCreateOrder, intent, onConsume, onOpenChat }) {
  const [view, setView] = useState('list');
  const [active, setActive] = useState(null);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [companies, setCompanies] = useState(initialCompanies);
  const { sort, onSort, apply } = useSort(null);

  useEffect(() => { setCompanies(initialCompanies); }, [initialCompanies]);

  const [editing, setEditing] = useState(null);
  const createCompany = async (company) => {
    const save = editing ? (data) => companiesApi.updateCompany(editing.id, data) : companiesApi.createCompany;
    const created = await save({
      legal_name: company.fullName || company.name, short_name: company.shortName || '',
      type: company.type, status: { 'Действующий': 'active', 'На паузе': 'paused', 'Архив': 'archived' }[company.status] || 'active', tax_id: company.inn === '—' ? '' : company.inn,
      okpo: company.okpo === '—' ? '' : company.okpo, legal_address: company.addr === '—' ? '' : company.addr,
      bank_name: company.bank === '—' ? '' : company.bank, ...(!editing || company.account ? { bank_account: company.account === '—' ? '' : company.account } : {}),
      director: company.dir === '—' ? '' : company.dir, phone: company.phone === '—' ? '' : company.phone,
      email: company.email === '—' ? '' : company.email, vat_mode: company.vat || '', requires_e_sign: Boolean(company.requiresESign),
    });
    const uiCompany = toUiCompany(created);
    const next = editing ? companies.map((row) => row.id === editing.id ? uiCompany : row) : [uiCompany, ...companies];
    setCompanies(next); onCompaniesChange?.(next);
    if (editing) setActive(uiCompany);
    return uiCompany;
  };

  useEffect(() => { if (intent && intent.type === 'create') { setCreateOpen(true); onConsume && onConsume(); } }, [intent]);

  if (view === 'card' && active) return (<><Topbar title="Карточка компании" /><div className="content"><CompanyCard co={active} orders={orders} onOpenChat={onOpenChat} onBack={() => setView('list')} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} onEdit={() => setEditing(active)} /><NewOrgDrawer open={!!editing} initial={editing} onClose={() => setEditing(null)} onCreated={createCompany} /></div></>);

  let rows = companies.filter((c) => (!fStatus || c.status === fStatus) && (!q || `${c.id} ${c.name} ${c.inn} ${c.dir}`.toLowerCase().includes(q.toLowerCase())));
  rows = apply(rows, { name: (r) => r.name, orders: (r) => r.orders, turnover: (r) => pUsd(r.turnover) });
  const STATS = [['Всего компаний', companies.length], ['Действующие', companies.filter((c) => c.status === 'Действующий').length], ['Совокупный оборот', pUsd(sumCurrencies(companies, 'turnover'))], ['Заказов', companies.reduce((s, c) => s + c.orders, 0)]];

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

export { EmployeeCreateDrawer, EmployeeProfileDrawer, DepartmentCreateDrawer, StaffDeptGroup, CompanyCard, CompaniesPage };
