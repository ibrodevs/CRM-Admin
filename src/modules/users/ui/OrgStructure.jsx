import { useEffect, useState } from 'react';
import { usersApi } from '../api.js';
import { resultsOf } from '../../../shared/api/client.js';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';

const STATE = { pending: 'На согласовании', approved: 'Согласовано', rejected: 'Отклонено', cancelled: 'Отозвано' };
export function OrgStructure({ user, canManage, onSaved }) {
  const toast = useToast();
  const [data, setData] = useState({ units: [], positions: [], roles: [], requests: [] }), [people, setPeople] = useState([]);
  const [unit, setUnit] = useState(user.org_unit || ''), [position, setPosition] = useState(user.job_position || ''), [target, setTarget] = useState(user.id);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [tick, setTick] = useState(0), [reason, setReason] = useState({});
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    const abort = new AbortController();
    const load = () => usersApi.orgStructure(abort.signal).then((value) => { setData(value); setError(''); }).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    load(); const timer = setInterval(load, 30000);
    if (canManage) usersApi.all(abort.signal).then((rows) => setPeople(resultsOf(rows))).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => { abort.abort(); clearInterval(timer); };
  }, [tick, canManage, user.id]);
  const act = async (work, label) => { setBusy(true); setError(''); try { const value = await work(); setTick((n) => n + 1); await onSaved?.(); toast(label, 'ok'); return value; } catch (e) { setError(e.message); toast(e.message, 'err'); return null; } finally { setBusy(false); } };
  const selected = data.units.find((row) => String(row.id) === String(unit));
  const job = data.positions.find((row) => String(row.id) === String(position));
  const chain = []; let current = selected;
  while (current && !chain.some((row) => row.id === current.id)) { chain.push(current); current = data.units.find((row) => row.id === current.parent); }
  const manager = chain.find((row) => row.manager && row.manager !== target)?.manager_name;
  const role = job?.role_name || chain.find((row) => row.role_name)?.role_name;
  const options = (rows) => rows.filter((row) => row.status !== 'rejected').map((row) => ({ value: row.id, label: `${row.name}${row.status === 'pending' ? ' · на согласовании' : ''}` }));
  const newCatalog = (type, row) => setCatalog({ type, id: row?.id || '', name: row?.name || '', parent: row?.parent || '', unit: row?.unit || unit || '', manager: row?.manager || '', default_role: row?.default_role || '', role: row?.role || '', status: row?.status || '', decision_comment: row?.decision_comment || '' });
  return <div className="profile-sections">
    <section className="card card-pad"><h3>Подразделение, должность и подчинение</h3>
      <p className="hint">{canManage ? 'Выберите сотрудника и схему. Роль и руководитель берутся из должности и иерархии подразделения.' : 'Выберите готовые значения или предложите новые. Изменения применяются после согласования администратором.'}</p>
      <div className="form-grid">
        {canManage && <Field label="Сотрудник"><Select value={target} onChange={(e) => { setTarget(e.target.value); const person = people.find((row) => row.id === e.target.value); setUnit(person?.org_unit || ''); setPosition(person?.job_position || ''); }} options={[{ value: user.id, label: user.name }, ...people.filter((row) => row.id !== user.id && row.status === 'active').map((row) => ({ value: row.id, label: row.full_name || row.email }))]} /></Field>}
        <Field label="Подразделение"><Select placeholder="Выберите подразделение" value={unit} options={options(data.units)} onChange={(e) => { setUnit(e.target.value); setPosition(''); }} /><Button size="sm" variant="secondary" icon="plus" onClick={() => newCatalog('units')}>Предложить / добавить</Button></Field>
        <Field label="Должность"><Select placeholder="Выберите должность" value={position} disabled={!unit} options={options(data.positions.filter((row) => !row.unit || String(row.unit) === String(unit)))} onChange={(e) => setPosition(e.target.value)} /><Button size="sm" variant="secondary" icon="plus" disabled={!unit} onClick={() => newCatalog('positions')}>Предложить / добавить</Button>{canManage && job && <Button size="sm" variant="secondary" onClick={() => newCatalog('positions', job)}>Настроить схему должности</Button>}</Field>
        <Field label="Роль по схеме"><Input readOnly value={role || 'Текущие роли сохранятся'} /></Field>
        <Field label="Руководитель по схеме"><Input readOnly value={manager || 'Не задан в схеме'} /></Field>
      </div>
      <p className="hint">Должность задаёт роль в первую очередь, затем используется роль подразделения или родительского подразделения. Права не назначаются по тексту названия должности.</p>
      <Button disabled={busy || !unit || !position} onClick={() => act(() => usersApi.requestOrgChange({ user: target, unit, position }), canManage ? 'Схема сотрудника применена' : 'Заявка отправлена администратору')}>{canManage ? 'Применить схему сотруднику' : 'Отправить на согласование'}</Button>
    </section>
    {error && <p role="alert" className="work-absence-error">{error}</p>}
    {canManage && <section className="card card-pad"><h3>Справочники и схемы</h3><p className="hint">Здесь задаются руководитель, родительское подразделение и роль. Изменение схемы создаёт заявки на пересогласование сотрудников. Их профиль и права сохраняются до подтверждения каждой заявки.</p>
      <div className="org-catalog-grid">{!data.units.length && !data.positions.length && <p className="hint">Подразделений и должностей пока нет. Добавьте подразделение, затем должности и назначьте сотрудников.</p>}{data.units.map((row) => <button type="button" className="org-catalog-row" key={row.id} onClick={() => newCatalog('units', row)}><b>{row.name}</b><span>{row.status === 'pending' ? 'Требует согласования' : row.status === 'rejected' ? `Отклонено: ${row.decision_comment}` : row.manager_name || 'Руководитель не задан'}</span></button>)}{data.positions.map((row) => <button type="button" className="org-catalog-row" key={`job-${row.id}`} onClick={() => newCatalog('positions', row)}><b>{row.name}</b><span>{row.status === 'pending' ? 'Должность · требует согласования' : row.status === 'rejected' ? `Отклонено: ${row.decision_comment}` : `Должность · ${row.role_name || 'роль наследуется от подразделения'}`}</span></button>)}</div>
    </section>}
    <section className="card card-pad"><h3>Заявки и история изменений</h3>{!data.requests.length && <p className="hint">Заявок пока нет</p>}
      <div className="work-absence-history">{data.requests.map((row) => <article className="work-absence-row" key={row.id}><div><strong>{row.user_name} · {STATE[row.status]}</strong><span>{row.unit_name} → {row.position_name}</span><span>Роль: {row.role_name} · Руководитель: {row.manager_name || 'не задан'}</span>{row.decision_comment && <span>Причина: {row.decision_comment}</span>}</div>
        {row.can_review && <><Input placeholder="Причина отклонения" value={reason[row.id] || ''} maxLength={2000} onChange={(e) => setReason((old) => ({ ...old, [row.id]: e.target.value }))} /><div className="work-absence-actions"><Button size="sm" disabled={busy} onClick={() => act(() => usersApi.decideOrgChange(row.id, 'approve'), 'Изменения согласованы')}>Согласовать и применить</Button><Button size="sm" variant="secondary" disabled={busy || !reason[row.id]?.trim()} onClick={() => act(() => usersApi.decideOrgChange(row.id, 'reject', reason[row.id]), 'Заявка отклонена')}>Отклонить</Button></div></>}
        {row.user === user.id && row.status === 'pending' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => usersApi.decideOrgChange(row.id, 'cancel'), 'Заявка отозвана')}>Отозвать заявку</Button>}
      </article>)}</div>
    </section>
    <Drawer open={Boolean(catalog)} title={catalog?.type === 'units' ? 'Подразделение и схема подчинения' : 'Должность и роль'} onClose={() => setCatalog(null)} width="min(600px,100vw)" footer={<><Button disabled={busy || !catalog?.name?.trim()} onClick={async () => { const row = await act(() => usersApi.saveOrgCatalog(catalog.type, catalog), canManage ? 'Значение справочника сохранено' : 'Новое значение отправлено на согласование'); if (row) { if (catalog.type === 'units') { setUnit(row.id); setPosition(''); } else setPosition(row.id); setCatalog(null); } }}>{canManage ? 'Сохранить и согласовать' : 'Предложить значение'}</Button>{canManage && catalog?.id && catalog.status === 'pending' && <Button variant="secondary" disabled={busy || !catalog.decision_comment?.trim()} onClick={async () => { const result = await act(() => usersApi.rejectOrgCatalog(catalog.type, catalog.id, catalog.decision_comment), 'Предложение отклонено'); if (result) setCatalog(null); }}>Отклонить предложение</Button>}</>}>
      {catalog && <div className="profile-sections"><Field label="Название"><Input value={catalog.name} maxLength={150} onChange={(e) => setCatalog((old) => ({ ...old, name: e.target.value }))} locationAutocomplete={false} /></Field>
        {catalog.type === 'positions' && <Field label="Подразделение"><Select value={catalog.unit} options={options(data.units)} onChange={(e) => setCatalog((old) => ({ ...old, unit: e.target.value }))} /></Field>}
        {canManage && <>
          {catalog.type === 'units' && <><Field label="Родительское подразделение"><Select value={catalog.parent} options={[{ value: '', label: 'Нет' }, ...options(data.units.filter((row) => row.id !== catalog.id && row.status === 'approved'))]} onChange={(e) => setCatalog((old) => ({ ...old, parent: e.target.value }))} /></Field><Field label="Руководитель подразделения"><Select value={catalog.manager} options={[{ value: '', label: 'Не назначен' }, ...people.filter((p) => p.status === 'active').map((p) => ({ value: p.id, label: p.full_name || p.email }))]} onChange={(e) => setCatalog((old) => ({ ...old, manager: e.target.value }))} /></Field></>}
          <Field label={catalog.type === 'units' ? 'Роль подразделения по умолчанию' : 'Роль должности'}><Select value={catalog.type === 'units' ? catalog.default_role : catalog.role} options={[{ value: '', label: 'Наследовать / сохранить текущие роли' }, ...data.roles.map((r) => ({ value: r.id, label: r.name }))]} onChange={(e) => setCatalog((old) => ({ ...old, [catalog.type === 'units' ? 'default_role' : 'role']: e.target.value }))} /></Field>
        </>}
        {canManage && catalog.id && catalog.status === 'pending' && <Field label="Причина отклонения (для отказа)"><Input value={catalog.decision_comment} maxLength={2000} onChange={(e) => setCatalog((old) => ({ ...old, decision_comment: e.target.value }))} /></Field>}
        {!canManage && <p className="hint">Название появится в вашем выборе с отметкой «на согласовании». Оно не изменит профиль, права или руководителя до решения администратора.</p>}
      </div>}
    </Drawer>
  </div>;
}
